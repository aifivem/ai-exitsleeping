import { AreaFollower, onServerEvent } from "@aicore-fivem/lib/client";
import { readId } from "@aicore-fivem/lib/shared";
import { CELL, EVENTS, toView, type SleeperView } from "common/events";
import { looks } from "./looks";

type Listener = {
  put(view: SleeperView): void;
  remove(view: SleeperView): void;
};

/**
 * The bodies around this player as the server sent them: the cells around the player when its cell changes, then
 * puts and removes. Renderers and the carry session listen; nothing here touches the game world.
 */
class View {
  readonly records = new Map<number, SleeperView>();
  /** Vehicle network id -> bodies seated in it (take-out prompts). */
  readonly inVehicles = new Map<number, Set<number>>();
  private readonly listeners: Listener[] = [];
  private readonly follower = new AreaFollower(EVENTS.area, CELL);

  listen(listener: Listener): void {
    this.listeners.push(listener);
  }

  /** Starts sending the player's cell (after waking). */
  start(): void {
    this.follower.start();
  }

  /** Stops (character switch): every body goes. */
  stop(): void {
    this.follower.stop();
    this.area(true, [], []);
  }

  area(reset: boolean, puts: SleeperView[], removes: number[]): void {
    if (reset) for (const id of this.records.keys()) this.remove(id);
    for (const id of removes) this.remove(id);
    for (const view of puts) this.put(view);
  }

  put(view: SleeperView): void {
    const old = this.records.get(view.id);
    if (old?.state === "vehicle") this.unseat(old);
    this.records.set(view.id, view);
    if (view.state === "vehicle") {
      const set = this.inVehicles.get(view.net) ?? new Set<number>();
      set.add(view.id);
      this.inVehicles.set(view.net, set);
    }
    for (const l of this.listeners) l.put(view);
  }

  remove(id: number): void {
    const old = this.records.get(id);
    if (!old) return;
    if (old.state === "vehicle") this.unseat(old);
    this.records.delete(id);
    looks.forget(id);
    for (const l of this.listeners) l.remove(old);
  }

  private unseat(old: SleeperView): void {
    const set = this.inVehicles.get(old.net);
    set?.delete(old.id);
    if (set?.size === 0) this.inVehicles.delete(old.net);
  }
}

export const view = new View();

onServerEvent(
  EVENTS.areaDelta,
  {
    args: ([reset, puts, removes]):
      [boolean, SleeperView[], number[]] | null =>
      typeof reset === "boolean" &&
      Array.isArray(puts) &&
      Array.isArray(removes)
        ? [
            reset,
            puts.flatMap((p) => toView(p) ?? []),
            removes.flatMap((id) => readId(id) ?? []),
          ]
        : null,
  },
  (reset, puts, removes) => view.area(reset, puts, removes),
);
