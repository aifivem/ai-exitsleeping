import {
  hasCharacter,
  isOnline,
  onClientCallback,
  vehicleFromNet,
} from "@aicore-fivem/lib/server";
import { distance, waitFor } from "@aicore-fivem/lib/shared";
import { EVENTS } from "common/events";
import { core, debug, livePed, pedCoords } from "./content";
import { sleepers } from "./store";

/**
 * Waking up: the owner's body goes away. ai-core already spawned the character where the body ended up (the store
 * moves the offline spawn point with the body); in a vehicle the server seats the player in the same seat, carried
 * it moves the player to the carrier, both retried because the client may still be streaming the vehicle in or the
 * spawn may move the player once more.
 */

const WARP_MS = 15_000;

function retry(label: string, step: () => true | undefined): void {
  let next = 0;
  waitFor(() => {
    if (Date.now() < next) return undefined;
    next = Date.now() + 500;
    return step();
  }, WARP_MS).catch(() => debug(`${label} timed out`));
}

function warpIntoVehicle(source: number, net: number, seat: number): void {
  retry("wake vehicle warp", () => {
    const ped = livePed(source);
    const veh = vehicleFromNet(net);
    if (!ped || !veh) return true;
    const sitting = GetPedInVehicleSeat(veh, seat);
    // Seated (confirmed), or someone else took the seat.
    if (sitting !== 0) return true;
    SetPedIntoVehicle(ped, veh, seat);
    return undefined;
  });
}

function warpToCarrier(source: number, carrier: number): void {
  retry("wake carrier warp", () => {
    const ped = livePed(source);
    const carrierPed = livePed(carrier);
    if (!ped || !carrierPed) return true;
    const to = pedCoords(carrierPed);
    const at = pedCoords(ped);
    if (distance(to, at) < 10) return true;
    SetEntityCoords(ped, to.x, to.y, to.z, false, false, false, false);
    return undefined;
  });
}

/** Wakes the caller's own body (true when there is nothing more to do on the client). */
async function wake(source: number): Promise<true> {
  await sleepers.ready();
  const charId = core.GetCharacter(source)?.id;
  const s = charId !== undefined ? sleepers.get(charId) : undefined;
  if (!s || !isOnline(source)) return true;
  const { state, net, seat, carrier } = s;
  sleepers.remove(s.charId);
  debug("woke", s.charId, state);
  if (state === "vehicle" && vehicleFromNet(net))
    warpIntoVehicle(source, net, seat);
  else if (state === "carried" && livePed(carrier))
    warpToCarrier(source, carrier);
  return true;
}

onClientCallback(EVENTS.wake, (source) => wake(source), {
  guards: [hasCharacter()],
  lock: true,
});
