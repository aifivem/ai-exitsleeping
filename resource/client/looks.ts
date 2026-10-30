import { appearance, triggerServerCallback } from "@aicore-fivem/lib/client";
import { createLogger } from "@aicore-fivem/lib/shared";
import {
  toCharacterAppearance,
  type CharacterAppearance,
} from "@aicore-fivem/shared";
import { ResourceName } from "common";
import { EVENTS, MAX_LOOKS } from "common/events";

const log = createLogger(ResourceName);

type Resolve = (look: CharacterAppearance | null) => void;

/**
 * Looks of the bodies this client draws: asked from the server once per body when its ped is first created, kept
 * until the body leaves this client's view. Requests made close together go as one call of up to `MAX_LOOKS` ids
 * (a crowd of bodies spawning together never runs into the callback's rate). ai-core's appearance layer puts the
 * look on the ped.
 */
class Looks {
  private readonly cache = new Map<number, CharacterAppearance | null>();
  private readonly pending = new Map<
    number,
    Promise<CharacterAppearance | null>
  >();
  private readonly queue = new Map<number, Resolve>();
  private flushing = false;

  get(id: number): Promise<CharacterAppearance | null> {
    const hit = this.cache.get(id);
    if (hit !== undefined) return Promise.resolve(hit);
    const running = this.pending.get(id);
    if (running) return running;
    const load = new Promise<CharacterAppearance | null>((resolve) => {
      this.queue.set(id, resolve);
      this.schedule();
    }).finally(() => this.pending.delete(id));
    this.pending.set(id, load);
    return load;
  }

  private schedule(): void {
    if (this.flushing) return;
    this.flushing = true;
    setTimeout(() => void this.flush(), 100);
  }

  private async flush(): Promise<void> {
    const batch = [...this.queue.entries()].slice(0, MAX_LOOKS);
    for (const [id] of batch) this.queue.delete(id);
    const answers = await triggerServerCallback(EVENTS.look, [
      batch.map(([id]) => id),
    ]).catch((error: unknown) => {
      log.error(`looks of ${batch.length} bodies could not be loaded`, error);
      return null;
    });
    batch.forEach(([id, resolve], i) => {
      const look = Array.isArray(answers)
        ? toCharacterAppearance(answers[i])
        : null;
      if (Array.isArray(answers)) this.cache.set(id, look);
      resolve(look);
    });
    this.flushing = false;
    if (this.queue.size) this.schedule();
  }

  forget(id: number): void {
    this.cache.delete(id);
  }

  /** Dresses the ped once its look is known (the ped may be gone by then). */
  async apply(ped: number, id: number): Promise<void> {
    const look = await this.get(id);
    if (look && DoesEntityExist(ped)) appearance.apply(ped, look);
  }
}

export const looks = new Looks();
