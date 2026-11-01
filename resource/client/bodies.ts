import { onCache, onStop } from "@aicore-fivem/lib/client";
import type { SleeperView } from "common/events";
import { attached } from "./attached";
import { carry } from "./carry";
import { ground } from "./ground";
import { hidden, onCarryRules } from "./rules";
import { onSettings } from "./settings";
import { vehiclePrompts } from "./vehiclePrompts";
import { view } from "./view";

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

onStop(() => {
  ground.clear();
  attached.clear();
  carry.end();
});
