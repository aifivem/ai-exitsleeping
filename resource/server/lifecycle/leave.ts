import { createSleeping } from "../create";
import { log, pedCoords, worldPed } from "../content";
import { sleepers } from "../store";

/** Someone leaves (drop or character switch): a body they carried goes down where they stood, then their own. */
export function onLeft(source: number, charId: number): void {
  const carried = sleepers.carriedBy(source);
  if (carried) {
    const ped = worldPed(source);
    sleepers.setState(
      carried,
      { state: "ground", carrier: 0, net: 0, seat: 0 },
      ped ? pedCoords(ped) : undefined,
    );
  }
  sleepers.unwatch(source, false);
  createSleeping(source, charId, true).catch((error: unknown) =>
    log.error(`body of character ${charId} could not be created`, error),
  );
}
