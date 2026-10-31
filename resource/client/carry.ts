import {
  cache,
  Keybind,
  keyHints,
  onCache,
  player,
} from "@aicore-fivem/lib/client";
import { Locale } from "common";
import { EVENTS, type SleeperView } from "common/events";
import { content } from "./settings";

const KEYBIND = "exitsleeping_drop";

/**
 * This player's carry session. The server's record decides whether it runs: a put saying "carried by me" starts it,
 * any other state or a remove ends it. The drop key or getting into a vehicle asks the server to put the body down.
 */
class CarrySession {
  /** Character id of the body carried, 0 when none. */
  active = 0;
  private waiting = false;
  private hold: { stop(): void } | null = null;
  private readonly listeners: Array<() => void> = [];

  onChange(fn: () => void): void {
    this.listeners.push(fn);
  }

  evaluate(id: number, view: SleeperView | null): void {
    const mine =
      view !== null &&
      view.state === "carried" &&
      view.carrier === cache.serverId;
    if (this.active === id && !mine) this.end();
    if (mine && !this.active) this.start(id);
  }

  drop(): void {
    if (!this.active || this.waiting) return;
    this.waiting = true;
    emitNet(EVENTS.stopCarry);
    // The answer is the server's put; allow another try if it never came.
    setTimeout(() => (this.waiting = false), 2000);
  }

  end(): void {
    if (!this.active) return;
    this.active = 0;
    this.waiting = false;
    this.hold?.stop();
    this.hold = null;
    keyHints.hide("drop");
    for (const fn of this.listeners) fn();
  }

  private start(id: number): void {
    this.active = id;
    this.waiting = false;
    keyHints.show("drop", { label: Locale("STOP_CARRYING"), keybind: KEYBIND });
    const a = content.settings.carrier;
    this.hold = player.holdAnim(a.dict, a.clip, { flag: a.flags });
    for (const fn of this.listeners) fn();
  }
}

export const carry = new CarrySession();

new Keybind({
  name: KEYBIND,
  description: Locale("KEYBIND_DROP"),
  defaultKey: "X",
  onPressed: () => carry.drop(),
});
onCache("vehicle", (vehicle) => {
  if (vehicle !== false) carry.drop();
});
