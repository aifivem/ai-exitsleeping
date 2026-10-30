import { appearance } from "@aicore-fivem/lib/server";
import type { CharacterAppearance } from "@aicore-fivem/shared";

/**
 * Saved looks of sleeping characters through ai-core's appearance layer (the clothing script owns them; nothing is
 * copied into our table). Kept in a small LRU so a body many players walk past is read once; concurrent asks share
 * one read. Without a clothing script every look is null and bodies wear the model's defaults.
 */
const MAX_CACHED = 2000;

class Looks {
  private readonly cache = new Map<number, CharacterAppearance | null>();
  private readonly pending = new Map<
    number,
    Promise<CharacterAppearance | null>
  >();

  async get(charId: number): Promise<CharacterAppearance | null> {
    const hit = this.cache.get(charId);
    if (hit !== undefined) {
      // Map order is insertion order: re-inserting marks it recently used.
      this.cache.delete(charId);
      this.cache.set(charId, hit);
      return hit;
    }
    const running = this.pending.get(charId);
    if (running) return running;
    const load = appearance
      .get(charId)
      .finally(() => this.pending.delete(charId));
    this.pending.set(charId, load);
    const look = await load;
    this.cache.set(charId, look);
    if (this.cache.size > MAX_CACHED) {
      const oldest = this.cache.keys().next();
      if (!oldest.done) this.cache.delete(oldest.value);
    }
    return look;
  }

  forget(charId: number): void {
    this.cache.delete(charId);
  }
}

export const looks = new Looks();
