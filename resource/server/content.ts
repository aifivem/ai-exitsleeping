import { AdminPanel, resourceExport } from "@aicore-fivem/lib/server";
import { createLogger } from "@aicore-fivem/lib/shared";
import { ResourceName } from "common";
import { readAreas, type HiddenArea } from "common/areas";
import { readSettings, type Settings } from "common/settings";
import { exitSleepingSchema } from "./schema";

export const core = resourceExport("ai-core");
export const log = createLogger(ResourceName);
export const panel = new AdminPanel(exitSleepingSchema);

/** Panel content, parsed again after every change. */
export const content: { settings: Settings; areas: HiddenArea[] } = {
  settings: readSettings(panel.get("settings")),
  areas: readAreas(panel.get("areas")),
};
panel.onChange(
  "settings",
  () => (content.settings = readSettings(panel.get("settings"))),
);
// A polygon with fewer than three corners is skipped by readAreas (the admin adds corners after picking the shape).
panel.onChange("areas", () => (content.areas = readAreas(panel.get("areas"))));

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
