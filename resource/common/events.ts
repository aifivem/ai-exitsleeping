import { isRecord, readFinite, readId } from "@aicore-fivem/lib/shared";

/** ai-exitsleeping's net contracts and the sleeper view clients get. No natives. */

export const EVENTS = {
  /** Callback: () -> true once the caller's own sleeping body is gone (the server seats / moves the player when needed). */
  wake: "ai-exitsleeping:wake",
  /** Client -> server: (cellX, cellY) the player's cell changed (lib `AreaFollower`; the cells around it follow as a delta). */
  area: "ai-exitsleeping:area",
  /** Server -> player: (reset, puts: SleeperView[], removes: charId[]) the sleepers around the player (lib `AreaStream`): appeared, changed, woke, left. */
  areaDelta: "ai-exitsleeping:client:area",
  /** Callback: (charIds, up to MAX_LOOKS) -> (CharacterAppearance | null)[], the saved looks of sleepers the caller sees (fetched once per ped, batched). */
  look: "ai-exitsleeping:look",
  /** Action (ActionResult): (charId) pick up a sleeper lying on the ground. */
  startCarry: "ai-exitsleeping:startCarry",
  /** Client -> server: () put the carried sleeper down where the carrier stands. */
  stopCarry: "ai-exitsleeping:stopCarry",
  /** Action (ActionResult): (vehicleNetId, seat) seat the carried sleeper in a passenger seat. */
  putInVehicle: "ai-exitsleeping:putInVehicle",
  /** Action (ActionResult): (vehicleNetId) take a sleeper out of the vehicle (the taker carries it). */
  takeOut: "ai-exitsleeping:takeOut",
} as const;

/** Local events other resources may listen to (the original script's editable hooks). */
export const HOOKS = {
  /** Client: (ped, view: SleeperView) a sleeping ped was created on this client. */
  pedSpawned: "ai-exitsleeping:client:pedSpawned",
  /** Server: (charId, coords: { x, y, z, heading }) a sleeper's position changed (carried, driven, put down). */
  positionChanged: "ai-exitsleeping:positionChanged",
  /** Server: (charId, view: SleeperView) a sleeping body was created for a character that logged out. */
  created: "ai-exitsleeping:created",
  /** Server: (charId) a sleeping body is gone (woke, expired, toggled off). */
  removed: "ai-exitsleeping:removed",
} as const;

/** Bodies are grouped in square cells of this many metres; a player watches the 3x3 cells around their own, so at least one cell (the panel's largest draw distance) around the player is known. */
export const CELL = 64;

export type SleeperState = "ground" | "carried" | "vehicle";

/** What a client knows of a sleeper; the look is asked separately (EVENTS.look) when its ped is created. */
export interface SleeperView {
  id: number;
  /** Ped model hash. */
  model: number;
  /** Index into the panel's sleep animations (the same pose on every client). */
  anim: number;
  x: number;
  y: number;
  z: number;
  heading: number;
  state: SleeperState;
  /** Server id of the carrier (state "carried"), else 0. */
  carrier: number;
  /** Vehicle network id and seat (state "vehicle"), else 0. */
  net: number;
  seat: number;
}

const STATES: readonly unknown[] = ["ground", "carried", "vehicle"];
const isInt = (n: unknown): n is number => Number.isInteger(n);

export function toView(v: unknown): SleeperView | null {
  if (!isRecord(v)) return null;
  const id = readId(v.id);
  const x = readFinite(v.x);
  const y = readFinite(v.y);
  const z = readFinite(v.z);
  const heading = readFinite(v.heading);
  const { model, anim, state, carrier, net, seat } = v;
  if (
    id === null ||
    x === null ||
    y === null ||
    z === null ||
    heading === null ||
    !isInt(model) ||
    !isInt(anim) ||
    !STATES.includes(state) ||
    !isInt(carrier) ||
    !isInt(net) ||
    !isInt(seat)
  )
    return null;
  return {
    id,
    model,
    anim,
    x,
    y,
    z,
    heading,
    state: state as SleeperState,
    carrier,
    net,
    seat,
  };
}

/** Ids per look call. */
export const MAX_LOOKS = 20;
