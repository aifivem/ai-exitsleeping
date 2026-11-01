import {
  registerExport,
  resourceExport,
  triggerServerCallback,
} from "@aicore-fivem/lib/client";
import { createLogger } from "@aicore-fivem/lib/shared";
import { CORE } from "@aicore-fivem/shared";
import { ResourceName } from "common";
import { EVENTS } from "common/events";
import { carry } from "./carry";
import { content } from "./settings";
import { view } from "./view";

const log = createLogger(ResourceName);
const core = resourceExport("ai-core");

let started = false;

/**
 * Wakes this player's own body (ai-core spawned the character where it ended up; the server seats / moves the player
 * when it was in a vehicle or carried), then starts receiving the bodies around.
 */
async function start(): Promise<void> {
  if (started) return;
  started = true;
  await triggerServerCallback(EVENTS.wake, [], 30_000).catch((error: unknown) =>
    log.error("waking failed", error),
  );
  view.start();
}

on(CORE.clientPlayerLoadedEvent, () => {
  if (content.settings.wakeOn === "auto") void start();
});
// A character switch: the next character wakes again.
on(CORE.clientPlayerUnloadedEvent, () => {
  started = false;
  carry.end();
  view.stop();
});
/** `PlayerLoaded()`: wake mode "export", called by a spawn script after its final spawn. */
registerExport("PlayerLoaded", () => void start());

// A restart of this resource while the player is in the world.
setTimeout(() => {
  if (
    content.settings.wakeOn === "auto" &&
    GetResourceState(CORE.resource) === "started" &&
    core.IsPlayerLoaded()
  )
    void start();
}, 1000);
