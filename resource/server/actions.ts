import {
  hasCharacter,
  onClientCallback,
  onClientEvent,
  vehicleNearPlayer,
} from "@aicore-fivem/lib/server";
import {
  distance,
  fail,
  oneArg,
  readId,
  readInt,
} from "@aicore-fivem/lib/shared";
import { EVENTS, MAX_LOOKS } from "common/events";
import { content, livePed, pedCoords, worldPed } from "./content";
import { looks } from "./looks";
import { sleepers } from "./store";
import { type ActionResult } from "@aicore-fivem/shared";

/** Client actions on sleeping bodies; every one is checked here (state, distance, seat) before memory changes. */

const guards = [hasCharacter()];

/** A networked vehicle the player stands next to (a body reaches the vehicle side), else 0. */
const vehicleNear = (source: number, net: number): number =>
  vehicleNearPlayer(source, net, {
    metres: content.settings.maxActionDistance + 2,
  });

onClientEvent(
  EVENTS.area,
  {
    args: ([rawX, rawY]): [number, number] | null => {
      const cx = readInt(rawX, -1000, 1000);
      const cy = readInt(rawY, -1000, 1000);
      return cx !== null && cy !== null ? [cx, cy] : null;
    },
    rate: { count: 2, windowMs: 1000 },
    guards,
  },
  (source, cx, cy) => {
    if (
      content.settings.hideInInstances &&
      GetPlayerRoutingBucket(String(source)) !== 0
    )
      return sleepers.unwatch(source, true);
    if (livePed(source)) sleepers.watch(source, cx, cy);
  },
);

/** 1 to MAX_LOOKS body ids. */
function readIds(value: unknown): number[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > MAX_LOOKS)
    return null;
  const ids = value.map(readId);
  return ids.every((id): id is number => id !== null) ? ids : null;
}

onClientCallback(
  EVENTS.look,
  { args: oneArg(readIds), guards, rate: { count: 5, windowMs: 1000 } },
  async (source, ids) =>
    Promise.all(
      ids.map((id) => {
        const s = sleepers.get(id);
        return s && sleepers.visibleTo(s, source) ? looks.get(id) : null;
      }),
    ),
);

const FAR = fail("SLEEP_ERR_FAR");

onClientCallback(
  EVENTS.startCarry,
  { args: oneArg(readId), guards, lock: true },
  (source, id): ActionResult => {
    const s = sleepers.get(id);
    if (!s || s.state !== "ground" || !sleepers.visibleTo(s, source))
      return fail("SLEEP_ERR_TAKEN");
    if (sleepers.carriedBy(source)) return fail("SLEEP_ERR_BUSY");
    const ped = worldPed(source);
    if (!ped || GetVehiclePedIsIn(ped, false)) return FAR;
    if (distance(pedCoords(ped), s) > content.settings.maxActionDistance)
      return FAR;
    sleepers.setState(s, {
      state: "carried",
      carrier: source,
      net: 0,
      seat: 0,
    });
    return { ok: true };
  },
);

onClientEvent(
  EVENTS.stopCarry,
  (source) => {
    const s = sleepers.carriedBy(source);
    if (!s) return;
    const ped = worldPed(source);
    sleepers.setState(
      s,
      { state: "ground", carrier: 0, net: 0, seat: 0 },
      ped ? pedCoords(ped) : undefined,
    );
  },
  { guards },
);

onClientCallback(
  EVENTS.putInVehicle,
  {
    args: ([rawNet, rawSeat]): [number, number] | null => {
      const net = readId(rawNet);
      const seat = readInt(rawSeat, 0, 15);
      return net !== null && seat !== null ? [net, seat] : null;
    },
    guards,
    lock: true,
  },
  (source, net, seat): ActionResult => {
    const s = sleepers.carriedBy(source);
    if (!s) return fail("SLEEP_ERR_GONE");
    const veh = vehicleNear(source, net);
    if (!veh || GetEntityRoutingBucket(veh) !== 0) return FAR;
    if (GetPedInVehicleSeat(veh, seat) !== 0) return fail("SLEEP_ERR_SEAT");
    // Sleeping peds are local on every client: the server sees them only in its own records.
    for (const other of sleepers.movingBodies())
      if (other.state === "vehicle" && other.net === net && other.seat === seat)
        return fail("SLEEP_ERR_SEAT");
    sleepers.setState(
      s,
      { state: "vehicle", carrier: 0, net, seat },
      pedCoords(veh),
    );
    return { ok: true };
  },
);

onClientCallback(
  EVENTS.takeOut,
  { args: oneArg(readId), guards, lock: true },
  (source, net): ActionResult => {
    if (sleepers.carriedBy(source)) return fail("SLEEP_ERR_BUSY");
    let s;
    for (const other of sleepers.movingBodies())
      if (other.state === "vehicle" && other.net === net) {
        s = other;
        break;
      }
    if (!s) return fail("SLEEP_ERR_GONE");
    const veh = vehicleNear(source, net);
    if (!veh || GetEntityRoutingBucket(veh) !== 0) return FAR;
    // Taking out starts carrying at once.
    sleepers.setState(
      s,
      { state: "carried", carrier: source, net: 0, seat: 0 },
      pedCoords(veh),
    );
    return { ok: true };
  },
);
