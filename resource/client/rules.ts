import {
  cache,
  PlayerState,
  Reasons,
  registerExport,
  stateBoolean,
} from "@aicore-fivem/lib/client";
import { PLAYER_BAGS } from "@aicore-fivem/shared";

/**
 * Reasons other resources set through exports (the original script's `canRenderPeds` / `canCarry` hooks), kept per
 * calling resource and dropped when it stops.
 */
export const hidden = new Reasons();
export const carryBlocked = new Reasons();

const dead = new PlayerState(PLAYER_BAGS.dead, stateBoolean);
const cuffed = new PlayerState(PLAYER_BAGS.cuffed, stateBoolean);

/** Whether this player may pick a body up now: on foot, not downed or cuffed, not blocked by another resource. */
export const canCarry = (): boolean =>
  cache.vehicle === false &&
  dead.get(cache.serverId) !== true &&
  cuffed.get(cache.serverId) !== true &&
  !carryBlocked.any;

/** Runs `fn` when anything `canCarry` reads may have changed (prompts check `canShow` again). */
export function onCarryRules(fn: () => void): void {
  carryBlocked.onChange(fn);
  dead.onChange((id) => id === cache.serverId && fn());
  cuffed.onChange((id) => id === cache.serverId && fn());
}

const reasonOf = (reason: unknown) =>
  typeof reason === "string" ? reason : "";

/** `SetHidden(reason, hidden)`: hides every sleeping ped on this client while any reason holds (interiors, shells). */
registerExport("SetHidden", (reason: unknown, on: unknown) =>
  hidden.set(reasonOf(reason), on === true),
);
/** `SetCarryBlocked(reason, blocked)`: hides the carry option while any reason holds (own checks of a script). */
registerExport("SetCarryBlocked", (reason: unknown, on: unknown) =>
  carryBlocked.set(reasonOf(reason), on === true),
);
