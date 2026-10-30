import {
  cache,
  hidePrompt,
  nearestVehicle,
  onPromptPressed,
  showPrompt,
} from "@aicore-fivem/lib/client";
import { Locale } from "common";
import { EVENTS } from "common/events";
import { carry } from "./carry";
import { content } from "./settings";
import { view } from "./view";

/** nearestVehicle measures to the vehicle's centre; a player at its side stands this much further away. */
const SIDE = 1.5;

/** A passenger seat nobody sits in (the driver seat stays usable), or null. */
function freeSeat(vehicle: number): number | null {
  const seats = GetVehicleModelNumberOfSeats(GetEntityModel(vehicle));
  for (let i = 0; i <= seats - 2; i++)
    if (IsVehicleSeatFree(vehicle, i)) return i;
  return null;
}

/**
 * "Put in vehicle" while carrying and "Take out" next to a vehicle with a body inside. The vehicle moves, so this
 * is a prompt that is not at a place (lib `showPrompt`), checked twice a second only while carrying or while a
 * body sits in a vehicle this client knows of.
 */
class VehiclePrompts {
  private timer: ReturnType<typeof setInterval> | null = null;
  private vehicle = 0;
  private shown: "put" | "take" | null = null;

  /** Starts or stops the check (carry session or seated bodies changed). */
  update(): void {
    const wanted = carry.active !== 0 || view.inVehicles.size > 0;
    if (wanted && !this.timer)
      this.timer = setInterval(() => this.check(), 500);
    else if (!wanted && this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      this.show(null);
    }
  }

  press(id: string): void {
    const veh = this.vehicle;
    if (!veh || !DoesEntityExist(veh) || id !== this.shown) return;
    const net = NetworkGetNetworkIdFromEntity(veh);
    if (id === "put") {
      const seat = freeSeat(veh);
      if (seat !== null) emitNet(EVENTS.putInVehicle, net, seat);
    } else emitNet(EVENTS.takeOut, net);
    this.show(null);
  }

  private check(): void {
    if (cache.vehicle !== false) return this.show(null);
    const veh = nearestVehicle(content.settings.interactDistance + SIDE, {
      notOwn: true,
    });
    this.vehicle = veh;
    if (!veh) return this.show(null);
    if (carry.active) return this.show(freeSeat(veh) !== null ? "put" : null);
    const net = NetworkGetNetworkIdFromEntity(veh);
    this.show(view.inVehicles.has(net) ? "take" : null);
  }

  private show(kind: "put" | "take" | null): void {
    if (kind === this.shown) return;
    if (this.shown) hidePrompt(this.shown);
    this.shown = kind;
    if (kind === "put") showPrompt("put", Locale("PUT_IN_VEHICLE"));
    else if (kind === "take") showPrompt("take", Locale("TAKE_OUT_VEHICLE"));
  }
}

export const vehiclePrompts = new VehiclePrompts();
onPromptPressed((id) => vehiclePrompts.press(id));
