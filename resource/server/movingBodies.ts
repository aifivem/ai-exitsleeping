import type { Sleeper } from "./sleeper";

/** Bodies that are carried or seated: the tracking loop walks only these. */
export class MovingBodies {
  private readonly moving = new Set<Sleeper>();
  private readonly carriers = new Map<number, Sleeper>();

  carriedBy(source: number): Sleeper | undefined {
    return this.carriers.get(source);
  }

  all(): ReadonlySet<Sleeper> {
    return this.moving;
  }

  track(s: Sleeper, on: boolean): void {
    if (on) this.moving.add(s);
    else this.moving.delete(s);
    if (s.state !== "carried") return;
    if (on) this.carriers.set(s.carrier, s);
    else if (this.carriers.get(s.carrier) === s)
      this.carriers.delete(s.carrier);
  }
}
