import { appearance, triggerServerCallback } from "@aicore-fivem/lib/client";
import { createLogger } from "@aicore-fivem/lib/shared";
import {
  toCharacterAppearance,
  type CharacterAppearance,
} from "@aicore-fivem/shared";
import { ResourceName } from "common";
import { EVENTS } from "common/events";

const log = createLogger(ResourceName);

/**
 * Looks of the bodies this client draws: asked from the server once per body when its ped is first created, kept
 * until the body leaves this client's view. ai-core's appearance layer puts the look on the ped.
 */
class Looks {
  private readonly cache = new Map<number, CharacterAppearance | null>();
  private readonly pending = new Map<
    number,
    Promise<CharacterAppearance | null>
  >();

  get(id: number): Promise<CharacterAppearance | null> {
    const hit = this.cache.get(id);
    if (hit !== undefined) return Promise.resolve(hit);
    const running = this.pending.get(id);
    if (running) return running;
    const load = triggerServerCallback(EVENTS.look, [id])
      .then((answer) => {
        const look = toCharacterAppearance(answer);
        this.cache.set(id, look);
        return look;
      })
      .catch((error: unknown) => {
        log.error(`look of body ${id} could not be loaded`, error);
        return null;
      })
      .finally(() => this.pending.delete(id));
    this.pending.set(id, load);
    return load;
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
