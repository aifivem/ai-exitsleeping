import {
  hasCharacter,
  isOnline,
  onClientCallback,
} from "@aicore-fivem/lib/server";
import { waitFor } from "@aicore-fivem/lib/shared";
import { EVENTS } from "common/events";
import { core, debug, livePed, pedCoords } from "./content";
import { sleepers } from "./store";

/**
 * Waking up: the owner's body goes away and the owner stands where it ended up. In a vehicle the server seats the
 * player in the same seat; carried, it moves the player to the carrier; both are retried because the client may
 * still be streaming the vehicle in or the spawn may move the player once more. On the ground (or when the
 * vehicle / carrier is gone) the client gets the body's position and teleports there.
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
    const veh = NetworkGetEntityFromNetworkId(net);
    if (!ped || !veh || !DoesEntityExist(veh)) return true;
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
    if (Math.hypot(to.x - at.x, to.y - at.y, to.z - at.z) < 10) return true;
    SetEntityCoords(ped, to.x, to.y, to.z, false, false, false, false);
    return undefined;
  });
}

/** Wakes the caller's own body; `coords` is where the client should stand (absent: nothing to do). */
async function wake(source: number) {
  await sleepers.ready();
  const charId = core.GetCharacter(source)?.id;
  const s = charId !== undefined ? sleepers.get(charId) : undefined;
  if (!s || !isOnline(source)) return { ok: true };
  const { state, net, seat, carrier } = s;
  const coords = s.coords;
  sleepers.remove(s.charId);
  debug("woke", s.charId, state);
  if (state === "vehicle") {
    const veh = NetworkGetEntityFromNetworkId(net);
    if (veh && DoesEntityExist(veh)) {
      warpIntoVehicle(source, net, seat);
      return { ok: true };
    }
  } else if (state === "carried" && livePed(carrier)) {
    warpToCarrier(source, carrier);
    return { ok: true };
  }
  return { ok: true, coords };
}

onClientCallback(EVENTS.wake, (source) => wake(source), {
  guards: [hasCharacter()],
  lock: true,
});
