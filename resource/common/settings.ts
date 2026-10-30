import { bool, int, num, record, str } from "@aicore-fivem/lib/shared";

/** The panel settings (`data/settings.json`, mirrored by every client) and their reader. No natives. */

export interface Anim {
  dict: string;
  clip: string;
  flags: number;
}

export interface Settings {
  /** "auto": the body wakes when ai-core spawns the character; "export": when a spawn script calls `PlayerLoaded`. */
  wakeOn: "auto" | "export";
  /** Bodies of characters who logged out longer ago than this many days are removed. */
  days: number;
  /** Metres around the player in which sleeping peds are created. */
  spawnDistance: number;
  /** Players in a private routing bucket (house, motel room) leave no body and see none. */
  hideInInstances: boolean;
  /** Metres from which a player can carry a body (and reach a vehicle side). */
  interactDistance: number;
  /** Server check: metres between the player and the body / vehicle an action may span. */
  maxActionDistance: number;
  /** Seconds between two position checks of carried and seated bodies. */
  trackSeconds: number;
  /** Lying animations; every body picks one at random. */
  sleepAnims: Anim[];
  carrier: Anim;
  carried: Anim;
  /** Where the carried body sits on the carrier: bone index, offset and rotation. */
  attach: {
    bone: number;
    x: number;
    y: number;
    z: number;
    rx: number;
    ry: number;
    rz: number;
  };
  debug: boolean;
}

export const DEFAULT_SLEEP_ANIM: Anim = {
  dict: "amb@world_human_bum_slumped@male@laying_on_left_side@idle_a",
  clip: "idle_b",
  flags: 1,
};

function readAnim(raw: unknown, fallback: Anim): Anim {
  const v = record(raw);
  return {
    dict: str(v.dict, fallback.dict, 128),
    clip: str(v.clip, fallback.clip, 128),
    flags: int(v.flags, fallback.flags, 0, 0xffff),
  };
}

export function readSettings(raw: unknown): Settings {
  const v = record(raw);
  const anims = Array.isArray(v.sleepAnims)
    ? v.sleepAnims.map((a) => readAnim(a, DEFAULT_SLEEP_ANIM))
    : [];
  const a = record(v.attach);
  return {
    wakeOn: v.wakeOn === "export" ? "export" : "auto",
    days: int(v.days, 3, 1, 365),
    spawnDistance: num(v.spawnDistance, 25, 5, 60),
    hideInInstances: bool(v.hideInInstances, true),
    interactDistance: num(v.interactDistance, 2.5, 1, 10),
    maxActionDistance: num(v.maxActionDistance, 6, 2, 30),
    trackSeconds: int(v.trackSeconds, 5, 1, 60),
    sleepAnims: anims.length > 0 ? anims : [DEFAULT_SLEEP_ANIM],
    carrier: readAnim(v.carrier, {
      dict: "missfinale_c2mcs_1",
      clip: "fin_c2_mcs_1_camman",
      flags: 49,
    }),
    carried: readAnim(v.carried, {
      dict: "nm",
      clip: "firemans_carry",
      flags: 33,
    }),
    attach: {
      bone: int(a.bone, 0, 0, 65535),
      x: num(a.x, 0.2, -5, 5),
      y: num(a.y, 0.15, -5, 5),
      z: num(a.z, 0.63, -5, 5),
      rx: num(a.rx, 0.5, -360, 360),
      ry: num(a.ry, 0.5, -360, 360),
      rz: num(a.rz, 5, -360, 360),
    },
    debug: bool(v.debug, false),
  };
}
