import { spec } from "@aicore-fivem/lib/shared";
import type { FileSpec, TabSpec } from "@aicore-fivem/shared";
import { metres } from "./metres";

export const areasFile: FileSpec = {
  kind: "records",
  sync: "admin",
  labelPath: "label",
  newRecord: {
    label: "",
    shape: "sphere",
    center: { x: 0, y: 0, z: 0 },
    radius: 25,
    height: 10,
    corners: [],
  },
  sections: {
    label: { type: "text", min: 1, max: 48 },
    shape: { type: "enum", values: ["sphere", "cylinder", "poly"] },
    center: { type: "vec3" },
    radius: spec.num(1, 2000),
    height: spec.num(0.5, 1000),
    // No `min: 3`: ball and cylinder areas keep an empty list (readArea skips a polygon under three corners).
    corners: { type: "list", max: 64, of: { type: "vec3" } },
  },
};

export const areasTab: TabSpec = {
  id: "areas",
  file: "areas",
  icon: "map-location-dot",
  label: "ADMIN_TAB_AREAS",
  desc: "ADMIN_TAB_AREAS_DESC",
  createLabel: "ADMIN_NEW_AREA",
  deleteLabel: "ADMIN_DELETE_AREA",
  deleteDesc: "ADMIN_DELETE_AREA_DESC",
  listSub: "shape",
  cards: [
    {
      icon: "map-location-dot",
      title: "ADMIN_C_AREA",
      desc: "ADMIN_C_AREA_DESC",
      fields: [
        {
          widget: "text",
          path: "label",
          label: "ADMIN_F_LABEL",
          placeholder: "ADMIN_P_LABEL",
          suggest: { from: "center" },
        },
        {
          widget: "select",
          path: "shape",
          label: "ADMIN_F_SHAPE",
          hint: "ADMIN_H_SHAPE",
          options: [
            { value: "sphere", label: "ADMIN_O_SPHERE" },
            { value: "cylinder", label: "ADMIN_O_CYLINDER" },
            { value: "poly", label: "ADMIN_O_POLY" },
          ],
        },
        {
          widget: "point",
          path: "center",
          label: "ADMIN_F_CENTER",
          hint: "ADMIN_H_CENTER",
          showIf: { path: "shape", values: ["sphere", "cylinder"] },
        },
        {
          ...metres("radius", "ADMIN_F_RADIUS", "ADMIN_H_RADIUS", 1, 2000),
          showIf: { path: "shape", values: ["sphere", "cylinder"] },
        },
        {
          ...metres("height", "ADMIN_F_HEIGHT", "ADMIN_H_HEIGHT", 0.5, 1000),
          showIf: { path: "shape", values: ["cylinder", "poly"] },
        },
      ],
    },
    {
      icon: "location-dot",
      title: "ADMIN_C_CORNERS",
      desc: "ADMIN_C_CORNERS_DESC",
      fields: [
        {
          widget: "zone",
          path: "corners",
          label: "ADMIN_F_CORNERS",
          hint: "ADMIN_H_CORNERS",
          heightPath: "height",
          max: 64,
          showIf: { path: "shape", values: ["poly"] },
        },
      ],
    },
  ],
};
