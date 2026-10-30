import {
  hasCharacter,
  onClientCallback,
  onClientEvent,
  vehicleNearPlayer,
} from "@aicore-fivem/lib/server";
import { distance, oneArg, readId, readInt } from "@aicore-fivem/lib/shared";
import { cellOf, EVENTS, MAX_LOOKS } from "common/events";
import { content, livePed, pedCoords, worldPed } from "./content";
import { looks } from "./looks";
import { sleepers } from "./store";

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
    const ped = livePed(source);
    if (!ped) return;
    const p = pedCoords(ped);
    const real = cellOf(p.x, p.y);
    // The client's cell may lag one cell behind the server's view of the ped.
    if (Math.abs(real.cx - cx) > 1 || Math.abs(real.cy - cy) > 1) return;
    sleepers.watch(source, cx, cy);
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

onClientEvent(
  EVENTS.startCarry,
  { args: oneArg(readId), guards },
  (source, id) => {
    const s = sleepers.get(id);
    if (!s || s.state !== "ground" || !s.cell) return;
    if (sleepers.carriedBy(source)) return;
    const ped = worldPed(source);
    if (!ped || GetVehiclePedIsIn(ped, false)) return;
    if (distance(pedCoords(ped), s) > content.settings.maxActionDistance)
      return;
    sleepers.setState(s, {
      state: "carried",
      carrier: source,
      net: 0,
      seat: 0,
    });
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

onClientEvent(
  EVENTS.putInVehicle,
  {
    args: ([rawNet, rawSeat]): [number, number] | null => {
      const net = readId(rawNet);
      const seat = readInt(rawSeat, 0, 15);
      return net !== null && seat !== null ? [net, seat] : null;
    },
    guards,
  },
  (source, net, seat) => {
    const s = sleepers.carriedBy(source);
    if (!s) return;
    const veh = vehicleNear(source, net);
    if (!veh || GetEntityRoutingBucket(veh) !== 0) return;
    if (GetPedInVehicleSeat(veh, seat) !== 0) return;
    // Sleeping peds are local on every client: the server sees them only in its own records.
    for (const other of sleepers.movingBodies())
      if (other.state === "vehicle" && other.net === net && other.seat === seat)
        return;
    sleepers.setState(
      s,
      { state: "vehicle", carrier: 0, net, seat },
      pedCoords(veh),
    );
  },
);

onClientEvent(
  EVENTS.takeOut,
  { args: oneArg(readId), guards },
  (source, net) => {
    if (sleepers.carriedBy(source)) return;
    let s;
    for (const other of sleepers.movingBodies())
      if (other.state === "vehicle" && other.net === net) {
        s = other;
        break;
      }
    if (!s) return;
    const veh = vehicleNear(source, net);
    if (!veh || GetEntityRoutingBucket(veh) !== 0) return;
    // Taking out starts carrying at once.
    sleepers.setState(
      s,
      { state: "carried", carrier: source, net: 0, seat: 0 },
      pedCoords(veh),
    );
  },
);
