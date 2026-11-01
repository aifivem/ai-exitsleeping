import type { WidgetSpec } from "@aicore-fivem/shared";

/** A distance field in metres (0.5 m steps). */
export const metres = (
  path: string,
  label: string,
  hint: string,
  min: number,
  max: number,
): WidgetSpec => ({
  widget: "number",
  path,
  label,
  hint,
  min,
  max,
  step: 0.5,
  unit: "m",
});
