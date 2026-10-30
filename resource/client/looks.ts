import {
  callExport,
  isResourceStarted,
  triggerServerCallback,
} from "@aicore-fivem/lib/client";
import { createLogger, isRecord } from "@aicore-fivem/lib/shared";
import { ResourceName } from "common";
import { EVENTS } from "common/events";

const log = createLogger(ResourceName);
const APPEARANCE = "ai-appearance";

/**
 * Looks of the bodies this client draws: asked from the server once per body when its ped is first created, kept
 * until the body leaves this client's view. ai-appearance puts the look on the ped.
 */
class Looks {
  private readonly cache = new Map<number, unknown>();
  private readonly pending = new Map<number, Promise<unknown>>();
  private warned = false;

  get(id: number): Promise<unknown> {
    if (this.cache.has(id)) return Promise.resolve(this.cache.get(id));
    const running = this.pending.get(id);
    if (running) return running;
    const load = triggerServerCallback(EVENTS.look, [id])
      .then((answer) => {
        const look =
          isRecord(answer) && answer.ok === true ? (answer.look ?? null) : null;
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
    if (
      look === null ||
      !DoesEntityExist(ped) ||
      !isResourceStarted(APPEARANCE)
    )
      return;
    try {
      callExport(APPEARANCE, "ApplyAppearance", ped, look);
    } catch (error) {
      if (!this.warned)
        log.warn(
          "ai-appearance has no ApplyAppearance(ped, look) export: bodies wear the default clothes",
          error,
        );
      this.warned = true;
    }
  }
}

export const looks = new Looks();
