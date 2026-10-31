import {
  onCache,
  onStop,
  registerExport,
  resourceExport,
  triggerServerCallback,
} from "@aicore-fivem/lib/client";
import { createLogger } from "@aicore-fivem/lib/shared";
import { CORE } from "@aicore-fivem/shared";
import { ResourceName } from "common";
import { EVENTS, type SleeperView } from "common/events";
import { attached } from "./attached";
import { carry } from "./carry";
import { ground } from "./ground";
import { hidden, onCarryRules } from "./rules";
import { content, onSettings } from "./settings";
import { vehiclePrompts } from "./vehiclePrompts";
import { view } from "./view";

const log = createLogger(ResourceName);
const core = resourceExport("ai-core");

/** Puts one body on screen in its current state (one path for every state: the old ped always goes first). */
function render(v: SleeperView): void {
  ground.remove(v.id);
  attached.remove(v.id);
  if (hidden.any) return;
  if (v.state === "ground") ground.add(v);
  else attached.add(v);
}

function rebuild(): void {
  ground.clear();
  attached.clear();
  for (const v of view.records.values()) render(v);
}

onSettings(() => {
  rebuild();
  vehiclePrompts.reset();
});

view.listen({
  put: (v) => {
    render(v);
    carry.evaluate(v.id, v);
    vehiclePrompts.update();
  },
  remove: (v) => {
    ground.remove(v.id);
    attached.remove(v.id);
    carry.evaluate(v.id, null);
    vehiclePrompts.update();
  },
});
carry.onChange(() => {
  ground.refreshPoints();
  vehiclePrompts.update();
});
hidden.onChange(rebuild);
onCarryRules(() => ground.refreshPoints());
onCache("vehicle", () => {
  ground.refreshCollision();
  ground.refreshPoints();
});

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

onStop(() => {
  ground.clear();
  attached.clear();
  carry.end();
});
