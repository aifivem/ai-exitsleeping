import { AdminWorld } from "@aicore-fivem/lib/client";
import { createLogger } from "@aicore-fivem/lib/shared";
import { ResourceName } from "common";
import { readSettings, type Settings } from "common/settings";

const world = new AdminWorld(["settings"]);
const log = createLogger(ResourceName);
const listeners: Array<() => void> = [];

/** The panel settings on this client (the cached file, then live changes). */
export const content: { settings: Settings } = {
  settings: readSettings(world.get("settings")),
};
world.onChange("settings", () => {
  content.settings = readSettings(world.get("settings"));
  for (const fn of listeners) fn();
});

export const onSettings = (fn: () => void) => listeners.push(fn);

export const debug = (message: string, ...args: unknown[]) => {
  if (content.settings.debug) log.info(message, ...args);
};
