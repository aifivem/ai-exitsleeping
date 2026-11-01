import { vehicleFromNet } from "@aicore-fivem/lib/server";
import { distance } from "@aicore-fivem/lib/shared";
import { livePed, pedCoords } from "../content";
import { sleepers } from "../store";

/** Carried and seated bodies follow their carrier / vehicle; a vanished one drops to the ground. */
export function trackMoving(): void {
  for (const s of sleepers.movingBodies()) {
    const entity =
      s.state === "vehicle" ? vehicleFromNet(s.net) : livePed(s.carrier);
    if (!entity) {
      sleepers.setState(s, { state: "ground", carrier: 0, net: 0, seat: 0 });
      continue;
    }
    // Inside an instance the body keeps its last shared-world position (where it is put down if it ends there).
    if (GetEntityRoutingBucket(entity) !== 0) continue;
    const c = pedCoords(entity);
    if (distance(c, s) > 1) sleepers.move(s, c);
  }
}
