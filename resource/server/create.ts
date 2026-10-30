import { registerExport } from "@aicore-fivem/lib/server";
import { inAnyArea } from "common/areas";
import { content, core, debug, livePed, log, pedCoords } from "./content";
import { looks } from "./looks";
import { Sleeper } from "./sleeper";
import { sleepers } from "./store";

type CreateCheck = (
  source: number,
  charId: number,
  coords: { x: number; y: number; z: number; heading: number },
) => unknown;

/** Other resources' vetoes on creating a body (the original script's `canCreateSleeping` hook), by id. */
const checks = new Map<string, { resource: string; run: CreateCheck }>();

/**
 * Creates the body of a player at their ped. `leaving`: the character is being unloaded, so a character that is
 * back online by the time the look arrived (a very fast rejoin) gets no body.
 */
export async function createSleeping(
  source: number,
  charId: number,
  leaving: boolean,
): Promise<void> {
  // Read everything before the first await: the player's ped goes away right after the drop.
  const ped = livePed(source);
  const character = core.GetCharacter(source);
  if (!ped || !character) return;
  const coords = pedCoords(ped);
  if (
    content.settings.hideInInstances &&
    GetPlayerRoutingBucket(String(source)) !== 0
  )
    return debug("no body: private routing bucket", charId);
  if (inAnyArea(content.areas.values(), coords.x, coords.y, coords.z))
    return debug("no body: hidden area", charId);
  for (const [id, check] of checks) {
    try {
      if (check.run(source, charId, coords) === false)
        return debug(`no body: refused by ${id}`, charId);
    } catch (error) {
      log.error(`create check ${id} (${check.resource}) failed`, error);
    }
  }
  const fallback = GetHashKey(
    character.sex === "female" ? "mp_f_freemode_01" : "mp_m_freemode_01",
  );
  const look = await looks.get(charId);
  if (leaving && core.GetSourceByCharId(charId) !== null) return;
  const anim = Math.floor(Math.random() * content.settings.sleepAnims.length);
  sleepers.add(
    new Sleeper(
      charId,
      look?.model ?? fallback,
      anim,
      coords.x,
      coords.y,
      coords.z,
      coords.heading,
      Date.now(),
    ),
  );
}

/**
 * `AddCreateCheck(id, fn(source, charId, coords) => boolean)`: return false to leave no body (an apartment, an
 * event zone). Dropped when the adding resource stops.
 */
registerExport("AddCreateCheck", (id: unknown, check: unknown) => {
  // A function from another resource arrives as a callable reference.
  if (typeof id === "string" && id && typeof check === "function")
    checks.set(id, {
      resource: GetInvokingResource() ?? "?",
      run: check as CreateCheck,
    });
});
on("onResourceStop", (resource: string) => {
  for (const [id, check] of checks)
    if (check.resource === resource) checks.delete(id);
});
