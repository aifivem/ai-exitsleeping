import { cache, callAction, Points } from "@aicore-fivem/lib/client";
import { Locale } from "common";
import { EVENTS } from "common/events";
import { carry } from "./carry";
import { content } from "./settings";
import { view } from "./view";

/** A vehicle point measures to the vehicle's centre; a player at its side stands this much further away. */
const SIDE = 1.5;

/** A passenger seat nobody sits in (the driver seat stays usable), or null. */
function freeSeat(vehicle: number): number | null {
  const seats = GetVehicleModelNumberOfSeats(GetEntityModel(vehicle));
  for (let i = 0; i <= seats - 2; i++)
    if (IsVehicleSeatFree(vehicle, i)) return i;
  return null;
}

/**
 * "Put in vehicle" while carrying and "Take out" at a vehicle with a body inside: lib vehicle points (a prompt at the
 * nearest vehicle or a target option on every vehicle). They exist only while carrying or while a body sits in a
 * vehicle this client knows of, so the vehicle scan runs only then.
 */
class VehiclePrompts {
  private readonly points = new Points();
  private active = false;

  /** Adds or removes the points (carry session or seated bodies changed); the scan checks `canShow` twice a second. */
  update(): void {
    const wanted = carry.active !== 0 || view.inVehicles.size > 0;
    if (wanted === this.active) return;
    this.active = wanted;
    if (wanted) this.add();
    else this.points.clear();
  }

  /** The settings changed (interaction distance): the points are made again. */
  reset(): void {
    this.active = false;
    this.points.clear();
    this.update();
  }

  private add(): void {
    const radius = content.settings.interactDistance + SIDE;
    this.points.addVehicle("put", {
      label: Locale("PUT_IN_VEHICLE"),
      icon: "car-side",
      radius,
      canShow: (vehicle) =>
        carry.active !== 0 &&
        cache.vehicle === false &&
        vehicle !== 0 &&
        freeSeat(vehicle) !== null,
      onPressed: async (vehicle) => {
        const seat = freeSeat(vehicle);
        if (seat !== null)
          await callAction(
            EVENTS.putInVehicle,
            [NetworkGetNetworkIdFromEntity(vehicle), seat],
            { fallback: "SLEEP_ERR_FAR" },
          );
      },
    });
    this.points.addVehicle("take", {
      label: Locale("TAKE_OUT_VEHICLE"),
      icon: "person-walking-arrow-right",
      radius,
      canShow: (vehicle) =>
        carry.active === 0 &&
        cache.vehicle === false &&
        vehicle !== 0 &&
        view.inVehicles.has(NetworkGetNetworkIdFromEntity(vehicle)),
      onPressed: (vehicle) =>
        callAction(EVENTS.takeOut, [NetworkGetNetworkIdFromEntity(vehicle)], {
          fallback: "SLEEP_ERR_FAR",
        }),
    });
  }
}

export const vehiclePrompts = new VehiclePrompts();
