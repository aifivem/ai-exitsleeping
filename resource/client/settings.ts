import { AdminWorld } from "@aicore-fivem/lib/client";
import { createLogger } from "@aicore-fivem/lib/shared";
import { ResourceName } from "common";
import { readSettings, type Settings } from "common/settings";

const world = new AdminWorld(["settings"]);
const log = createLogger(ResourceName);
const listeners: Array<() => void> = [];

const settings = world.view("settings", readSettings);

/** The panel settings on this client (the cached file, then live changes). */
export const content: { readonly settings: Settings } = {
  get settings() {
    return settings.value;
  },
};
world.onChange("settings", () => {
  for (const fn of listeners) fn();
});

export const onSettings = (fn: () => void) => listeners.push(fn);

export const debug = (message: string, ...args: unknown[]) => {
  if (content.settings.debug) log.info(message, ...args);
};
