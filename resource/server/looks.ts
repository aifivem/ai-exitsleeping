import { mysql } from "@aicore-fivem/mysql";
import { log } from "./content";

/**
 * Saved looks of sleeping characters, read from ai-appearance's table (it owns the looks; nothing is copied into
 * ours). Kept in a small LRU so a body many players walk past is read once; concurrent asks share one query.
 * Without ai-appearance (no table) every look is null and bodies wear the model's defaults.
 */
interface Look {
  model: string | null;
  data: unknown;
}

const MAX_CACHED = 2000;

class Looks {
  private readonly cache = new Map<number, Look | null>();
  private readonly pending = new Map<number, Promise<Look | null>>();
  private warned = false;

  async get(charId: number): Promise<Look | null> {
    const hit = this.cache.get(charId);
    if (hit !== undefined) {
      // Map order is insertion order: re-inserting marks it recently used.
      this.cache.delete(charId);
      this.cache.set(charId, hit);
      return hit;
    }
    const running = this.pending.get(charId);
    if (running) return running;
    const load = this.read(charId).finally(() => this.pending.delete(charId));
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

  private async read(charId: number): Promise<Look | null> {
    try {
      const row = await mysql.single<{ model: string; data: string }>(
        "SELECT model, data FROM ai_appearance_characters WHERE char_id = ?",
        [charId],
      );
      if (!row) return null;
      return {
        model: typeof row.model === "string" ? row.model : null,
        data: JSON.parse(row.data) as unknown,
      };
    } catch (error) {
      if (!this.warned)
        log.warn(
          "looks could not be read from ai_appearance_characters (is ai-appearance installed?)",
          error,
        );
      this.warned = true;
      return null;
    }
  }
}

export const looks = new Looks();
