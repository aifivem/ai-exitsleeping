import { EVENTS, type SleeperView } from "common/events";
import type { CellIndex } from "./cells";
import type { Sleeper } from "./sleeper";
import type { Watchers } from "./watchers";

/**
 * Bodies per area event (a view is ~150 bytes). Chunks keep each event small without a latent event, which could
 * overtake the puts and removes sent after it.
 */
const CHUNK = 20;

/** The per-player area deltas: what enters and leaves a player's 3x3 cells when their cell changes. */
export class AreaStream {
  constructor(
    private readonly byId: ReadonlyMap<number, Sleeper>,
    private readonly cells: CellIndex,
    private readonly watchers: Watchers,
  ) {}

  /** A player's cell changed (sent nothing before the store is loaded; `resendAll` follows then). */
  watch(source: number, cx: number, cy: number, loaded: boolean): void {
    const { added, dropped, fresh } = this.watchers.set(source, cx, cy);
    if (!loaded) return;
    const removes: number[] = [];
    for (const key of dropped)
      for (const id of this.cells.ids(key))
        // A body this player carries stays with them whatever the cells say.
        if (this.byId.get(id)?.carrier !== source) removes.push(id);
    this.send(source, fresh, this.viewsIn(added), removes);
  }

  unwatch(source: number, tell: boolean): void {
    if (this.watchers.drop(source) && tell)
      emitNet(EVENTS.areaDelta, source, true, [], []);
  }

  /** Players who sent their cell before the load: everything around them, from scratch. */
  resendAll(): void {
    for (const [source, cells] of this.watchers.sources())
      this.send(source, true, this.viewsIn(cells), []);
  }

  private viewsIn(cells: Iterable<string>): SleeperView[] {
    const out: SleeperView[] = [];
    for (const key of cells)
      for (const id of this.cells.ids(key)) {
        const s = this.byId.get(id);
        if (s) out.push(s.view());
      }
    return out;
  }

  private send(
    source: number,
    fresh: boolean,
    puts: SleeperView[],
    removes: number[],
  ): void {
    if (!fresh && puts.length === 0 && removes.length === 0) return;
    emitNet(EVENTS.areaDelta, source, fresh, puts.slice(0, CHUNK), removes);
    for (let i = CHUNK; i < puts.length; i += CHUNK)
      emitNet(EVENTS.areaDelta, source, false, puts.slice(i, i + CHUNK), []);
  }
}
