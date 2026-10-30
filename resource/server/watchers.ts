import { cellKey } from "common/events";

/**
 * Which players watch which cells (each player the 3x3 cells around their own), both ways, so a delta for one
 * cell reaches its watchers without walking every player.
 */
export class Watchers {
  private readonly bySource = new Map<number, Set<string>>();
  private readonly byCell = new Map<string, Set<number>>();

  /** Sets a player's cells; returns the cells added and dropped (all added for a new watcher). */
  set(
    source: number,
    cx: number,
    cy: number,
  ): { added: string[]; dropped: string[]; fresh: boolean } {
    const next = new Set<string>();
    for (let dx = -1; dx <= 1; dx++)
      for (let dy = -1; dy <= 1; dy++) next.add(cellKey(cx + dx, cy + dy));
    const old = this.bySource.get(source);
    const added = [...next].filter((key) => !old?.has(key));
    const dropped = old ? [...old].filter((key) => !next.has(key)) : [];
    for (const key of dropped) this.leave(key, source);
    for (const key of added) {
      const set = this.byCell.get(key) ?? new Set<number>();
      set.add(source);
      this.byCell.set(key, set);
    }
    this.bySource.set(source, next);
    return { added, dropped, fresh: !old };
  }

  /** Forgets a player (left, or now sees no bodies); returns whether they watched anything. */
  drop(source: number): boolean {
    const old = this.bySource.get(source);
    if (!old) return false;
    for (const key of old) this.leave(key, source);
    this.bySource.delete(source);
    return true;
  }

  of(cell: string): ReadonlySet<number> {
    return this.byCell.get(cell) ?? EMPTY;
  }

  sources(): IterableIterator<[number, Set<string>]> {
    return this.bySource.entries();
  }

  watches(source: number, cell: string): boolean {
    return this.bySource.get(source)?.has(cell) ?? false;
  }

  private leave(key: string, source: number): void {
    const set = this.byCell.get(key);
    if (!set) return;
    set.delete(source);
    if (set.size === 0) this.byCell.delete(key);
  }
}

const EMPTY: ReadonlySet<number> = new Set();
