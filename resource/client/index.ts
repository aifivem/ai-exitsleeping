import {
  onCache,
  player,
  registerExport,
  resourceExport,
  triggerServerCallback,
} from "@aicore-fivem/lib/client";
import { createLogger, isRecord } from "@aicore-fivem/lib/shared";
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
onSettings(rebuild);
onCache("vehicle", () => {
  ground.refreshCollision();
  ground.refreshPoints();
});

let started = false;

/** Wakes this player's own body (stand where it ended up), then starts receiving the bodies around. */
async function start(): Promise<void> {
  if (started) return;
  started = true;
  const answer = await triggerServerCallback(EVENTS.wake, [], 30_000).catch(
    (error: unknown) => {
      log.error("waking failed", error);
      return null;
    },
  );
  const coords =
    isRecord(answer) && isRecord(answer.coords) ? answer.coords : null;
  if (
    coords &&
    typeof coords.x === "number" &&
    typeof coords.y === "number" &&
    typeof coords.z === "number" &&
    typeof coords.heading === "number" &&
    player.distanceTo({ x: coords.x, y: coords.y, z: coords.z }) > 2
  )
    await player.teleport(
      { x: coords.x, y: coords.y, z: coords.z },
      { heading: coords.heading, ground: false },
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

on("onResourceStop", (resource: string) => {
  if (resource !== ResourceName) return;
  ground.clear();
  attached.clear();
  carry.end();
});
