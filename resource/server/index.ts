import { addCommand, createDatabaseTables } from "@aicore-fivem/lib/server";
import { CORE, type UnloadReason } from "@aicore-fivem/shared";
import { Locale, ResourceName } from "common";
import "./actions";
import { content, core, livePed, log, panel, pedCoords } from "./content";
import { createSleeping } from "./create";
import { sleepers } from "./store";
import "./wake";

/** Someone leaves (drop or character switch): a body they carried goes down where they stood, then their own. */
function onLeft(source: number, charId: number): void {
  const carried = sleepers.carriedBy(source);
  if (carried) {
    const ped = livePed(source);
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

on(
  CORE.playerUnloadedEvent,
  (source: number, charId: number, _reason: UnloadReason) =>
    onLeft(source, charId),
);
on("playerDropped", () => sleepers.unwatch(Number(globalThis.source), false));

/** Carried and seated bodies follow their carrier / vehicle; a vanished one drops to the ground. */
function trackMoving(): void {
  for (const s of sleepers.movingBodies()) {
    const entity =
      s.state === "vehicle"
        ? NetworkGetEntityFromNetworkId(s.net)
        : livePed(s.carrier);
    const valid =
      entity &&
      DoesEntityExist(entity) &&
      (s.state !== "vehicle" || GetEntityType(entity) === 2);
    if (!valid) {
      sleepers.setState(s, { state: "ground", carrier: 0, net: 0, seat: 0 });
      continue;
    }
    const c = pedCoords(entity);
    if (Math.hypot(c.x - s.x, c.y - s.y, c.z - s.z) > 1) sleepers.move(s, c);
  }
}

let trackTimer = setInterval(trackMoving, content.settings.trackSeconds * 1000);
panel.onChange("settings", () => {
  clearInterval(trackTimer);
  trackTimer = setInterval(trackMoving, content.settings.trackSeconds * 1000);
});
panel.onChange("areas", () => sleepers.refreshHidden());

const flush = (why: string) =>
  sleepers
    .flush()
    .catch((error: unknown) => log.error(`flush failed (${why})`, error));
setInterval(() => void flush("interval"), 10_000);
setInterval(() => sleepers.expire(), 600_000);
on("txAdmin:events:serverShuttingDown", () => void flush("shutdown"));
on("onResourceStop", (resource: string) => {
  if (resource === ResourceName) void flush("resource stop");
});

createDatabaseTables(ResourceName, "sql/main.sql")
  .then(() => sleepers.load())
  .catch((error: unknown) => log.error("database setup failed", error));

addCommand(
  "exitsleeptest",
  { help: Locale("COMMAND_TEST_HELP"), restricted: true },
  async (source) => {
    const charId = core.GetCharacter(source)?.id;
    if (charId === undefined) return;
    if (sleepers.get(charId)) return sleepers.remove(charId);
    await createSleeping(source, charId, false);
  },
);
