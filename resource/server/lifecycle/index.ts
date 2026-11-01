import {
  addCommand,
  createDatabaseTables,
  every,
  onCharacter,
  onStop,
} from "@aicore-fivem/lib/server";
import { Locale, ResourceName } from "common";
import { content, core, log, panel } from "../content";
import { createSleeping } from "../create";
import { sleepers } from "../store";
import { onLeft } from "./leave";
import { trackMoving } from "./tracking";

// ai-core unloads before a drop; watching needs a character, so the unload also ends the player's cell watch.
onCharacter({ unloaded: onLeft });

const track = () =>
  every(content.settings.trackSeconds * 1000, trackMoving, { name: "track" });
let trackJob = track();
panel.onChange("settings", () => {
  trackJob.stop();
  trackJob = track();
});
panel.onChange("areas", () => sleepers.refreshHidden());

const flush = (why: string) =>
  sleepers
    .flush()
    .catch((error: unknown) => log.error(`flush failed (${why})`, error));
every(10_000, () => flush("interval"), { name: "flush" });
every(600_000, () => sleepers.expire(), { name: "expire" });
on("txAdmin:events:serverShuttingDown", () => void flush("shutdown"));
onStop(() => void flush("resource stop"));

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
