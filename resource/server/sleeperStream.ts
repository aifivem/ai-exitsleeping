import { AreaStream } from "@aicore-fivem/lib/server";
import { CELL, EVENTS, type SleeperView } from "common/events";
import type { Sleeper } from "./sleeper";

/**
 * The bodies' area stream. Bodies per area message (a view is ~150 bytes): chunks keep each event small without a
 * latent event, which could overtake the puts and removes sent after it.
 */
export const sleeperStream = (): AreaStream<Sleeper, SleeperView> =>
  new AreaStream<Sleeper, SleeperView>({
    event: EVENTS.areaDelta,
    view: (s) => s.view(),
    cellSize: CELL,
    chunk: 20,
    alsoTo: (s) => (s.state === "carried" ? s.carrier : undefined),
  });
