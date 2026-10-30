import { num, record, str } from "@aicore-fivem/lib/shared";

/** Areas where no sleeping body is shown (`data/areas.json`, server only). No natives. */

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export type HiddenArea =
  | { kind: "sphere"; center: Vec3; radius: number }
  | { kind: "cylinder"; center: Vec3; radius: number; height: number }
  /** Ground polygon; the z range is the corners' lowest and highest z widened by `height`. */
  | {
      kind: "poly";
      points: Array<{ x: number; y: number }>;
      minZ: number;
      maxZ: number;
    };

const vec3 = (raw: unknown): Vec3 => {
  const v = record(raw);
  return { x: num(v.x, 0), y: num(v.y, 0), z: num(v.z, 0) };
};

/** Every usable area of the records file (a polygon needs three corners). */
export function readAreas(raw: unknown): HiddenArea[] {
  const out: HiddenArea[] = [];
  for (const value of Object.values(record(raw))) {
    const v = record(value);
    const shape = str(v.shape, "sphere", 16);
    const radius = num(v.radius, 10, 1, 2000);
    const height = num(v.height, 10, 0.5, 1000);
    if (shape === "poly") {
      const corners = (Array.isArray(v.points) ? v.points : []).map((p) =>
        vec3(record(p).coords),
      );
      if (corners.length < 3) continue;
      const zs = corners.map((c) => c.z);
      out.push({
        kind: "poly",
        points: corners.map(({ x, y }) => ({ x, y })),
        minZ: Math.min(...zs) - height,
        maxZ: Math.max(...zs) + height,
      });
    } else if (shape === "cylinder")
      out.push({ kind: "cylinder", center: vec3(v.center), radius, height });
    else out.push({ kind: "sphere", center: vec3(v.center), radius });
  }
  return out;
}

/** Whether a point lies inside the area (same geometry as lib `Zones`). */
export function inArea(area: HiddenArea, x: number, y: number, z: number) {
  switch (area.kind) {
    case "sphere": {
      const { center: c, radius: r } = area;
      return (x - c.x) ** 2 + (y - c.y) ** 2 + (z - c.z) ** 2 <= r * r;
    }
    case "cylinder": {
      const { center: c, radius: r } = area;
      return (
        (x - c.x) ** 2 + (y - c.y) ** 2 <= r * r &&
        Math.abs(z - c.z) <= area.height
      );
    }
    case "poly": {
      if (z < area.minZ || z > area.maxZ) return false;
      let inside = false;
      const p = area.points;
      for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
        const a = p[i]!;
        const b = p[j]!;
        if (
          a.y > y !== b.y > y &&
          x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x
        )
          inside = !inside;
      }
      return inside;
    }
    default: {
      const _exhaustive: never = area;
      return _exhaustive;
    }
  }
}

export const inAnyArea = (
  areas: readonly HiddenArea[],
  x: number,
  y: number,
  z: number,
) => areas.some((area) => inArea(area, x, y, z));
