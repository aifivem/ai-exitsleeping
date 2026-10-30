import { AdminPanel, resourceExport } from "@aicore-fivem/lib/server";
import { createLogger, type ZoneShape } from "@aicore-fivem/lib/shared";
import { ResourceName } from "common";
import { readArea } from "common/areas";
import { readSettings, type Settings } from "common/settings";
import { exitSleepingSchema } from "./schema";

export const core = resourceExport("ai-core");
export const log = createLogger(ResourceName);
export const panel = new AdminPanel(exitSleepingSchema);

const settings = panel.view("settings", readSettings);

/** Panel content: settings parsed again on each change, hidden areas per changed record. */
export const content: {
  readonly settings: Settings;
  readonly areas: ReadonlyMap<string, ZoneShape>;
} = {
  get settings() {
    return settings.value;
  },
  areas: panel.records("areas", readArea),
};

/** A debug line while the panel's debug switch is on. */
export const debug = (message: string, ...args: unknown[]) => {
  if (content.settings.debug) log.info(message, ...args);
};

export function pedCoords(ped: number) {
  const [x = 0, y = 0, z = 0] = GetEntityCoords(ped);
  return { x, y, z, heading: GetEntityHeading(ped) };
}

/** The player's ped while it exists, else 0. */
export function livePed(source: number): number {
  const ped = GetPlayerPed(String(source));
  return ped && DoesEntityExist(ped) ? ped : 0;
}

/**
 * The player's ped while it stands in the shared world (routing bucket 0), else 0: bodies live only there, so a
 * carrier inside an instanced interior (a house, a robbery) never moves or drops one at interior coordinates.
 */
export function worldPed(source: number): number {
  const ped = livePed(source);
  return ped && GetPlayerRoutingBucket(String(source)) === 0 ? ped : 0;
}
