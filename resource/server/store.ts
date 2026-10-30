import { characters, WriteQueue } from "@aicore-fivem/lib/server";
import { waitFor } from "@aicore-fivem/lib/shared";
import { inAnyArea } from "common/areas";
import { cellKey, cellOf, EVENTS, HOOKS } from "common/events";
import { content, debug, log } from "./content";
import * as repo from "./db";
import { CellIndex } from "./cells";
import { looks } from "./looks";
import { modelHash, Sleeper, type Coords } from "./sleeper";
import { AreaStream } from "./stream";
import { Watchers } from "./watchers";

/**
 * Every sleeping body in memory, filed by 64 m cell. Players get the bodies of the 3x3 cells around them (puts and
 * removes when their cell changes), then only puts and removes for those cells. A carried body always reaches its
 * carrier. Hidden bodies (inside a hidden area) are filed nowhere and reach nobody.
 */
class Sleepers {
  private readonly byId = new Map<number, Sleeper>();
  private readonly cells = new CellIndex();
  /** Bodies whose position changed since the last flush. */
  private readonly dirty = new Set<Sleeper>();
  /** Bodies that are carried or seated: the tracking loop walks only these. */
  private readonly moving = new Set<Sleeper>();
  private readonly carriers = new Map<number, Sleeper>();
  private readonly watchers = new Watchers();
  private readonly stream = new AreaStream(
    this.byId,
    this.cells,
    this.watchers,
  );
  private readonly writes = new WriteQueue((label, error) =>
    log.error(`database write failed (${label})`, error),
  );
  loaded = false;

  async load(): Promise<void> {
    const purged = await repo.purgeOlderThan(content.settings.days);
    const now = Date.now();
    await repo.loadAll((row) => {
      const s = new Sleeper(
        row.char_id,
        modelHash(row.model),
        row.anim,
        row.x,
        row.y,
        row.z,
        row.heading,
        now - Number(row.age) * 1000,
      );
      this.byId.set(s.charId, s);
      this.cells.file(s, this.wantedCell(s));
    });
    this.loaded = true;
    log.info(`${this.byId.size} sleeping bodies loaded (${purged} expired)`);
    this.stream.resendAll();
  }

  ready(): Promise<true> {
    return waitFor(() => this.loaded || undefined, false);
  }

  get(charId: number): Sleeper | undefined {
    return this.byId.get(charId);
  }

  carriedBy(source: number): Sleeper | undefined {
    return this.carriers.get(source);
  }

  movingBodies(): ReadonlySet<Sleeper> {
    return this.moving;
  }

  /** Whether the body is in a cell this player watches (or the player carries it). */
  visibleTo(s: Sleeper, source: number): boolean {
    return s.carrier === source || this.watchers.watches(source, s.cell);
  }

  add(s: Sleeper): void {
    this.remove(s.charId, false);
    this.byId.set(s.charId, s);
    this.place(s);
    this.writes.push(`insert ${s.charId}`, () =>
      repo.insertSleeper({
        char_id: s.charId,
        model: String(s.model),
        anim: s.anim,
        x: s.x,
        y: s.y,
        z: s.z,
        heading: s.heading,
      }),
    );
    emit(HOOKS.created, s.charId, s.view());
    debug("created", s.charId);
  }

  /** Drops a body (woke, expired, toggled off); `fromDb` false when the row is already gone. */
  remove(charId: number, fromDb = true): void {
    const s = this.byId.get(charId);
    if (!s) return;
    for (const source of this.recipients(s))
      emitNet(EVENTS.remove, source, charId);
    this.cells.unfile(s);
    this.track(s, false);
    this.dirty.delete(s);
    this.byId.delete(charId);
    looks.forget(charId);
    if (fromDb)
      this.writes.push(`delete ${charId}`, () => repo.deleteSleeper(charId));
    emit(HOOKS.removed, charId);
    debug("removed", charId);
  }

  /** Changes a body's state (and position) and tells whoever sees it before or after. */
  setState(
    s: Sleeper,
    next: Pick<Sleeper, "state" | "carrier" | "net" | "seat">,
    coords?: Coords,
  ): void {
    const before = this.recipients(s);
    this.track(s, false);
    Object.assign(s, next);
    this.track(s, s.moving);
    if (coords) this.setCoords(s, coords);
    this.place(s, before);
    // Put down (or dropped by a vanished carrier / vehicle): the owner spawns here next time.
    if (!s.moving) this.saveSpawn(s);
    debug("state", s.charId, s.state);
  }

  /** A moving body's new position (tracking): refiled when it crossed a cell, saved with the next flush. */
  move(s: Sleeper, coords: Coords): void {
    const before = this.recipients(s);
    this.setCoords(s, coords);
    const key = this.wantedCell(s);
    if (key !== s.cell) this.place(s, before, false);
  }

  /** Hidden areas changed: bodies on the ground are filed or hidden again. */
  refreshHidden(): void {
    for (const s of this.byId.values())
      if (!s.moving && this.wantedCell(s) !== s.cell) this.place(s);
  }

  /** Bodies older than the panel's days (memory; the table is purged by SQL). */
  expire(): void {
    const limit = Date.now() - content.settings.days * 86_400_000;
    for (const s of this.byId.values())
      if (s.loggedOutAt < limit) this.remove(s.charId, false);
    this.writes.push("purge", () => repo.purgeOlderThan(content.settings.days));
  }

  /** Writes the positions changed since the last flush in one statement per 500. */
  flush(): Promise<void> {
    if (this.dirty.size === 0) return this.writes.idle();
    // Carried / seated bodies move the spawn point once per flush; ground ones were saved when put down.
    for (const s of this.dirty) if (s.moving) this.saveSpawn(s);
    const rows = [...this.dirty].map((s) => ({
      char_id: s.charId,
      x: s.x,
      y: s.y,
      z: s.z,
      heading: s.heading,
    }));
    this.dirty.clear();
    this.writes.push("positions", () => repo.savePositions(rows));
    return this.writes.idle();
  }

  /** A player's cell changed: bodies of the new cells come, those of the dropped cells go. */
  watch(source: number, cx: number, cy: number): void {
    this.stream.watch(source, cx, cy, this.loaded);
  }

  /** The player sees no bodies any more (left, or entered a private world). */
  unwatch(source: number, tell: boolean): void {
    this.stream.unwatch(source, tell);
  }

  /** The owner's spawn point follows the body (ai-core writes it once no save holds the character). */
  private saveSpawn(s: Sleeper): void {
    characters.setOfflinePosition(s.charId, s.coords);
  }

  private setCoords(s: Sleeper, c: Coords): void {
    s.x = c.x;
    s.y = c.y;
    s.z = c.z;
    s.heading = c.heading;
    this.dirty.add(s);
    emit(HOOKS.positionChanged, s.charId, c);
  }

  private wantedCell(s: Sleeper): string {
    if (!s.moving && inAnyArea(content.areas.values(), s.x, s.y, s.z))
      return "";
    const { cx, cy } = cellOf(s.x, s.y);
    return cellKey(cx, cy);
  }

  /** Files the body where it belongs; players who saw it and no longer do get a remove, the others a put. */
  private place(s: Sleeper, before = this.recipients(s), put = true): void {
    const key = this.wantedCell(s);
    if (key !== s.cell) this.cells.file(s, key);
    const after = this.recipients(s);
    for (const source of before)
      if (!after.has(source)) emitNet(EVENTS.remove, source, s.charId);
    if (after.size === 0) return;
    const view = s.view();
    for (const source of after)
      if (put || !before.has(source)) emitNet(EVENTS.put, source, view);
  }

  private recipients(s: Sleeper): Set<number> {
    const out = new Set(s.cell ? this.watchers.of(s.cell) : []);
    if (s.state === "carried") out.add(s.carrier);
    return out;
  }

  private track(s: Sleeper, on: boolean): void {
    if (on) this.moving.add(s);
    else this.moving.delete(s);
    if (s.state !== "carried") return;
    if (on) this.carriers.set(s.carrier, s);
    else if (this.carriers.get(s.carrier) === s)
      this.carriers.delete(s.carrier);
  }
}

export const sleepers = new Sleepers();
