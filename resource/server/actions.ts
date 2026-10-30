import {
  hasCharacter,
  onClientCallback,
  onClientEvent,
} from "@aicore-fivem/lib/server";
import { asArgs } from "@aicore-fivem/lib/shared";
import { cellOf, EVENTS } from "common/events";
import { content, livePed, pedCoords } from "./content";
import { looks } from "./looks";
import { sleepers } from "./store";

/** Client actions on sleeping bodies; every one is checked here (state, distance, seat) before memory changes. */

const guards = [hasCharacter()];
const isId = (v: unknown): v is number => Number.isInteger(v) && Number(v) > 0;
const dist = (
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number },
) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

/** A networked vehicle the player stands next to, else 0. */
function vehicleNear(source: number, net: number): number {
  const veh = NetworkGetEntityFromNetworkId(net);
  if (!veh || !DoesEntityExist(veh) || GetEntityType(veh) !== 2) return 0;
  const ped = livePed(source);
  if (!ped) return 0;
  return dist(pedCoords(ped), pedCoords(veh)) <=
    content.settings.maxActionDistance + 2
    ? veh
    : 0;
}

onClientEvent(
  EVENTS.area,
  {
    args: ([cx, cy]): [number, number] | null =>
      Number.isInteger(cx) && Number.isInteger(cy)
        ? [Number(cx), Number(cy)]
        : null,
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

onClientCallback(
  EVENTS.look,
  { args: ([id]) => asArgs(isId(id) ? id : null), guards },
  async (source, id) => {
    const s = sleepers.get(id);
    if (!s || !sleepers.visibleTo(s, source)) return { ok: false };
    const look = await looks.get(id);
    return { ok: true, look: look?.data ?? null };
  },
);

onClientEvent(
  EVENTS.startCarry,
  { args: ([id]) => asArgs(isId(id) ? id : null), guards },
  (source, id) => {
    const s = sleepers.get(id);
    if (!s || s.state !== "ground" || !s.cell) return;
    if (sleepers.carriedBy(source)) return;
    const ped = livePed(source);
    if (!ped || GetVehiclePedIsIn(ped, false)) return;
    if (dist(pedCoords(ped), s) > content.settings.maxActionDistance) return;
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
    const ped = livePed(source);
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
    args: ([net, seat]): [number, number] | null =>
      isId(net) &&
      Number.isInteger(seat) &&
      Number(seat) >= 0 &&
      Number(seat) < 16
        ? [Number(net), Number(seat)]
        : null,
    guards,
  },
  (source, net, seat) => {
    const s = sleepers.carriedBy(source);
    if (!s) return;
    const veh = vehicleNear(source, net);
    if (!veh || GetPedInVehicleSeat(veh, seat) !== 0) return;
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
  { args: ([net]) => asArgs(isId(net) ? Number(net) : null), guards },
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
    if (!veh) return;
    // Taking out starts carrying at once.
    sleepers.setState(
      s,
      { state: "carried", carrier: source, net: 0, seat: 0 },
      pedCoords(veh),
    );
  },
);
