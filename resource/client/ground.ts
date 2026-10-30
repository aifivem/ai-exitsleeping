import {
  cache,
  callAction,
  LocalPed,
  Points,
  requestAnimDict,
} from "@aicore-fivem/lib/client";
import { Locale } from "common";
import { EVENTS, HOOKS, type SleeperView } from "common/events";
import { carry } from "./carry";
import { looks } from "./looks";
import { canCarry } from "./rules";
import { content, debug } from "./settings";

/** Bodies lying on the ground: a lib `LocalPed` each (created near the player only) and a "carry" point on it. */
class GroundPeds {
  private readonly peds = new Map<number, LocalPed>();
  private readonly points = new Points();

  add(v: SleeperView): void {
    this.remove(v.id);
    const s = content.settings;
    this.peds.set(
      v.id,
      new LocalPed({
        model: v.model,
        coords: { x: v.x, y: v.y, z: v.z, heading: v.heading },
        distance: s.spawnDistance,
        onSpawn: (ped) => void this.dress(ped, v),
      }),
    );
    this.points.add(String(v.id), {
      // The body lies on the floor, a metre under the stored root height.
      coords: { x: v.x, y: v.y, z: v.z - 0.7 },
      label: Locale("CARRY"),
      icon: "up-down-left-right",
      radius: s.interactDistance,
      canShow: () => !carry.active && canCarry(),
      onPressed: () =>
        callAction(EVENTS.startCarry, [v.id], { fallback: "SLEEP_ERR_FAR" }),
    });
  }

  remove(id: number): void {
    this.peds.get(id)?.remove();
    this.peds.delete(id);
    this.points.remove(String(id));
  }

  clear(): void {
    for (const id of this.peds.keys()) this.remove(id);
  }

  /** Prompts check `canShow` again (carry started or ended, vehicle, downed). */
  refreshPoints(): void {
    this.points.refresh();
  }

  /** Vehicles pass through the bodies while the player drives (no launched cars). */
  refreshCollision(): void {
    for (const ped of this.peds.values())
      if (ped.entity)
        SetEntityCollision(ped.entity, cache.vehicle === false, true);
  }

  private async dress(ped: number, v: SleeperView): Promise<void> {
    SetEntityAsMissionEntity(ped, true, true);
    SetEntityCollision(ped, cache.vehicle === false, true);
    const anims = content.settings.sleepAnims;
    const anim = anims[v.anim] ?? anims[0];
    if (anim) {
      await requestAnimDict(anim.dict).catch(() => undefined);
      if (DoesEntityExist(ped))
        TaskPlayAnim(
          ped,
          anim.dict,
          anim.clip,
          8,
          -8,
          -1,
          anim.flags,
          0,
          false,
          false,
          false,
        );
    }
    await looks.apply(ped, v.id);
    if (!DoesEntityExist(ped)) return;
    emit(HOOKS.pedSpawned, ped, v);
    debug("spawned ground ped", v.id);
  }
}

export const ground = new GroundPeds();
