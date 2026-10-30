import { cache, LocalPed, requestAnimDict } from "@aicore-fivem/lib/client";
import { HOOKS, type SleeperView } from "common/events";
import { looks } from "./looks";
import { hidden } from "./rules";
import { content, debug } from "./settings";

/**
 * A `LocalPed` spawns when the player enters a sphere around a fixed point. A carried / seated body moves with its
 * parent, so the sphere is made larger than the map and the 500 ms check below decides when the ped exists.
 */
const ANYWHERE = 100_000;

interface Entry {
  view: SleeperView;
  ped: LocalPed | null;
}

/**
 * Bodies that are carried or seated: a lib `LocalPed` attached to the carrier or put into the vehicle seat on this
 * client. A 500 ms check (running only while such bodies exist) creates the ped once its carrier / vehicle is within
 * the spawn distance, removes it past that, and makes it again when the attachment or seat was lost (model swap of
 * the carrier, vehicle repair scripts).
 */
class AttachedPeds {
  private readonly entries = new Map<number, Entry>();
  private timer: ReturnType<typeof setInterval> | null = null;

  add(view: SleeperView): void {
    this.remove(view.id);
    this.entries.set(view.id, { view, ped: null });
    this.timer ??= setInterval(() => this.check(), 500);
    this.check();
  }

  remove(id: number): void {
    const entry = this.entries.get(id);
    if (!entry) return;
    this.despawn(entry);
    this.entries.delete(id);
    if (this.entries.size === 0 && this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  clear(): void {
    for (const id of this.entries.keys()) this.remove(id);
  }

  private check(): void {
    const [x = 0, y = 0, z = 0] = GetEntityCoords(cache.ped, false);
    for (const entry of this.entries.values()) {
      const parent = this.parentOf(entry.view);
      let near = false;
      if (parent && !hidden.any) {
        const [px = 0, py = 0, pz = 0] = GetEntityCoords(parent, false);
        near =
          Math.hypot(px - x, py - y, pz - z) < content.settings.spawnDistance;
      }
      if (!near) {
        this.despawn(entry);
        continue;
      }
      // A ped still loading (entity 0) is left alone; one that lost its parent is made again.
      const ped = entry.ped?.entity ?? 0;
      if (!entry.ped || (ped && !this.bound(entry.view, ped, parent))) {
        this.despawn(entry);
        this.spawn(entry);
      }
    }
  }

  /** The carrier's ped or the vehicle while it exists on this client. */
  private parentOf(v: SleeperView): number {
    if (v.state === "carried") {
      if (v.carrier === cache.serverId) return cache.ped;
      const player = GetPlayerFromServerId(v.carrier);
      return player === -1 ? 0 : GetPlayerPed(player);
    }
    if (!NetworkDoesEntityExistWithNetworkId(v.net)) return 0;
    const veh = NetToVeh(v.net);
    return veh && DoesEntityExist(veh) ? veh : 0;
  }

  private bound(v: SleeperView, ped: number, parent: number): boolean {
    if (!DoesEntityExist(ped)) return false;
    return v.state === "carried"
      ? IsEntityAttachedToEntity(ped, parent)
      : GetPedInVehicleSeat(parent, v.seat) === ped;
  }

  private spawn(entry: Entry): void {
    const v = entry.view;
    const a = content.settings.attach;
    const parent = () => this.parentOf(v);
    entry.ped = new LocalPed({
      model: v.model,
      coords: { x: v.x, y: v.y, z: v.z, heading: v.heading },
      distance: ANYWHERE,
      ...(v.state === "carried"
        ? {
            attach: {
              entity: parent,
              bone: a.bone,
              offset: { x: a.x, y: a.y, z: a.z },
              rotation: { x: a.rx, y: a.ry, z: a.rz },
            },
          }
        : { seat: { vehicle: parent, seat: v.seat } }),
      onSpawn: (ped) => void this.dress(ped, v),
    });
  }

  private async dress(ped: number, v: SleeperView): Promise<void> {
    SetEntityAsMissionEntity(ped, true, true);
    if (v.state === "carried") {
      const carried = content.settings.carried;
      await requestAnimDict(carried.dict).catch(() => undefined);
      if (DoesEntityExist(ped))
        TaskPlayAnim(
          ped,
          carried.dict,
          carried.clip,
          8,
          -8,
          -1,
          carried.flags,
          0,
          false,
          false,
          false,
        );
    }
    await looks.apply(ped, v.id);
    if (!DoesEntityExist(ped)) return;
    emit(HOOKS.pedSpawned, ped, v);
    debug("spawned ped", v.id, v.state);
  }

  private despawn(entry: Entry): void {
    entry.ped?.remove();
    entry.ped = null;
  }
}

export const attached = new AttachedPeds();
