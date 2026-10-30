import type { Sleeper } from "./sleeper";

/** Body ids by cell key; a body's own `cell` field says where it is filed ("" = nowhere). */
export class CellIndex {
  private readonly cells = new Map<string, Set<number>>();

  file(s: Sleeper, key: string): void {
    this.unfile(s);
    if (!key) return;
    s.cell = key;
    const set = this.cells.get(key) ?? new Set<number>();
    set.add(s.charId);
    this.cells.set(key, set);
  }

  unfile(s: Sleeper): void {
    const set = this.cells.get(s.cell);
    set?.delete(s.charId);
    if (set?.size === 0) this.cells.delete(s.cell);
    s.cell = "";
  }

  ids(key: string): Iterable<number> {
    return this.cells.get(key) ?? EMPTY;
  }
}

const EMPTY: ReadonlySet<number> = new Set();
