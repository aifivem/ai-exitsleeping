import { cache, requestAnimDict, requestModel } from "@aicore-fivem/lib/client";
import { HOOKS, type SleeperView } from "common/events";
import { looks } from "./looks";
import { hidden } from "./rules";
import { content, debug } from "./settings";

interface Entry {
  view: SleeperView;
  ped: number;
  busy: boolean;
  /** The model could not be loaded: never tried again for this body. */
  broken: boolean;
}

/**
 * Bodies that are carried or seated: a local ped attached to the carrier or put into the vehicle seat on this
 * client. lib `LocalPed` only stands still at a point, so these are created here; a 500 ms check (running only
 * while such bodies exist) creates the ped once its carrier / vehicle streams in near the player, and recreates it
 * when the attachment or seat was lost (model swap of the carrier, vehicle repair scripts).
 */
class AttachedPeds {
  private readonly entries = new Map<number, Entry>();
  private timer: ReturnType<typeof setInterval> | null = null;

  add(view: SleeperView): void {
    this.remove(view.id);
    this.entries.set(view.id, { view, ped: 0, busy: false, broken: false });
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
      if (entry.busy || entry.broken) continue;
      const parent = this.parentOf(entry.view);
      let near = false;
      if (parent && !hidden.any) {
        const [px = 0, py = 0, pz = 0] = GetEntityCoords(parent, false);
        near =
          Math.hypot(px - x, py - y, pz - z) < content.settings.spawnDistance;
      }
      const alive = entry.ped !== 0 && DoesEntityExist(entry.ped);
      if (near && parent && (!alive || !this.bound(entry, parent))) {
        this.despawn(entry);
        void this.spawn(entry, parent);
      } else if (!near && entry.ped) this.despawn(entry);
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

  private bound(entry: Entry, parent: number): boolean {
    return entry.view.state === "carried"
      ? IsEntityAttachedToEntity(entry.ped, parent)
      : GetPedInVehicleSeat(parent, entry.view.seat) === entry.ped;
  }

  private async spawn(entry: Entry, parent: number): Promise<void> {
    entry.busy = true;
    const v = entry.view;
    try {
      const hash = await requestModel(v.model).catch(() => 0);
      if (!hash) {
        entry.broken = true;
        return debug("invalid ped model", v.model, v.id);
      }
      const carried = content.settings.carried;
      if (v.state === "carried")
        await requestAnimDict(carried.dict).catch(() => undefined);
      // The body may have changed state or left while the model loaded.
      if (this.entries.get(v.id) !== entry || !DoesEntityExist(parent)) return;
      const ped = CreatePed(
        4,
        hash,
        v.x,
        v.y,
        v.z - 1,
        v.heading,
        false,
        false,
      );
      SetModelAsNoLongerNeeded(hash);
      if (!ped) return;
      entry.ped = ped;
      SetEntityAsMissionEntity(ped, true, true);
      SetEntityInvincible(ped, true);
      SetBlockingOfNonTemporaryEvents(ped, true);
      if (v.state === "carried") {
        const a = content.settings.attach;
        AttachEntityToEntity(
          ped,
          parent,
          a.bone,
          a.x,
          a.y,
          a.z,
          a.rx,
          a.ry,
          a.rz,
          false,
          false,
          false,
          false,
          2,
          false,
        );
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
      } else SetPedIntoVehicle(ped, parent, v.seat);
      await looks.apply(ped, v.id);
      if (DoesEntityExist(ped)) emit(HOOKS.pedSpawned, ped, v);
      debug("spawned ped", v.id, v.state);
    } finally {
      entry.busy = false;
    }
  }

  private despawn(entry: Entry): void {
    if (entry.ped && DoesEntityExist(entry.ped)) DeleteEntity(entry.ped);
    entry.ped = 0;
  }
}

export const attached = new AttachedPeds();
