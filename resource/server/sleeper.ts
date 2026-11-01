import type { SleeperState, SleeperView } from "common/events";
import type { StoredSleeper } from "./db";

export interface Coords {
  x: number;
  y: number;
  z: number;
  heading: number;
}

/** One sleeping body in server memory (the truth; the table keeps what survives a restart). */
export class Sleeper {
  state: SleeperState = "ground";
  /** Server id of the carrier while carried. */
  carrier = 0;
  /** Vehicle network id and seat while seated. */
  net = 0;
  seat = 0;

  constructor(
    readonly charId: number,
    /** Ped model hash. */
    readonly model: number,
    readonly anim: number,
    public x: number,
    public y: number,
    public z: number,
    public heading: number,
    /** Epoch ms of the logout (server clock). */
    readonly loggedOutAt: number,
  ) {}

  /** Its key in the area stream. */
  get id(): number {
    return this.charId;
  }

  get coords(): Coords {
    return { x: this.x, y: this.y, z: this.z, heading: this.heading };
  }

  get moving(): boolean {
    return this.state !== "ground";
  }

  view(): SleeperView {
    return {
      id: this.charId,
      model: this.model,
      anim: this.anim,
      x: this.x,
      y: this.y,
      z: this.z,
      heading: this.heading,
      state: this.state,
      carrier: this.carrier,
      net: this.net,
      seat: this.seat,
    };
  }
}

/** A stored model: a hash written as text, or a model name. */
export function modelHash(stored: string): number {
  const n = Number(stored);
  return Number.isInteger(n) && stored.trim() !== "" ? n : GetHashKey(stored);
}

/** A body from its table row; `now` is the load time its age counts back from. */
export function sleeperFromRow(row: StoredSleeper, now: number): Sleeper {
  return new Sleeper(
    row.char_id,
    modelHash(row.model),
    row.anim,
    row.x,
    row.y,
    row.z,
    row.heading,
    now - Number(row.age) * 1000,
  );
}
