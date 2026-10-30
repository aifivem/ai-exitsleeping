import {
  num,
  polyFromCorners,
  record,
  str,
  zoneContains,
  type Vec3,
  type ZoneShape,
} from "@aicore-fivem/lib/shared";

/** Areas where no sleeping body is shown (`data/areas.json`, server only). No natives. */

const vec3 = (raw: unknown): Vec3 => {
  const v = record(raw);
  return { x: num(v.x, 0), y: num(v.y, 0), z: num(v.z, 0) };
};

/** One area record as a zone shape; null for a polygon with fewer than three corners (the admin is still adding them). */
export function readArea(
  _key: string,
  v: Record<string, unknown>,
): ZoneShape | null {
  const shape = str(v.shape, "sphere", 16);
  const radius = num(v.radius, 10, 1, 2000);
  const height = num(v.height, 10, 0.5, 1000);
  if (shape === "poly")
    return polyFromCorners(
      Array.isArray(v.corners) ? v.corners.map(vec3) : [],
      height,
    );
  if (shape === "cylinder")
    return { type: "cylinder", center: vec3(v.center), radius, height };
  return { type: "sphere", center: vec3(v.center), radius };
}

export function inAnyArea(
  areas: Iterable<ZoneShape>,
  x: number,
  y: number,
  z: number,
): boolean {
  for (const area of areas) if (zoneContains(area, x, y, z)) return true;
  return false;
}
