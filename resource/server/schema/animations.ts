import type { TabSpec, WidgetSpec } from "@aicore-fivem/shared";
import { SETTINGS_DEFAULTS } from "./defaults";

const offset = (path: string, label: string, unit: string): WidgetSpec => ({
  widget: "number",
  path: `attach.${path}`,
  label,
  min: unit === "m" ? -5 : -360,
  max: unit === "m" ? 5 : 360,
  step: unit === "m" ? 0.01 : 0.5,
  unit,
});

/** Dictionary, clip and flags of one animation, at `prefix` ("carrier." or "" in a list row). */
const animFields = (prefix: string): WidgetSpec[] => [
  {
    widget: "text",
    path: `${prefix}dict`,
    label: "ADMIN_F_ANIM_DICT",
    placeholder: "ADMIN_P_ANIM_DICT",
  },
  {
    widget: "text",
    path: `${prefix}clip`,
    label: "ADMIN_F_ANIM_CLIP",
    placeholder: "ADMIN_P_ANIM_CLIP",
  },
  {
    widget: "number",
    path: `${prefix}flags`,
    label: "ADMIN_F_ANIM_FLAGS",
    hint: "ADMIN_H_ANIM_FLAGS",
    min: 0,
    max: 65535,
  },
];

export const animationsTab: TabSpec = {
  id: "animations",
  file: "settings",
  icon: "people-group",
  label: "ADMIN_TAB_ANIMS",
  desc: "ADMIN_TAB_ANIMS_DESC",
  cards: [
    {
      icon: "user",
      title: "ADMIN_C_SLEEP_ANIMS",
      desc: "ADMIN_C_SLEEP_ANIMS_DESC",
      fields: [
        {
          widget: "list",
          path: "sleepAnims",
          label: "ADMIN_F_SLEEP_ANIMS",
          addLabel: "ADMIN_ADD_ANIM",
          max: 20,
          newRow: { ...SETTINGS_DEFAULTS.sleepAnims[0] },
          rows: animFields(""),
        },
      ],
    },
    {
      icon: "people-group",
      title: "ADMIN_C_CARRIER",
      desc: "ADMIN_C_CARRIER_DESC",
      fields: animFields("carrier."),
    },
    {
      icon: "people-group",
      title: "ADMIN_C_CARRIED",
      desc: "ADMIN_C_CARRIED_DESC",
      fields: animFields("carried."),
    },
    {
      icon: "hand-pointer",
      title: "ADMIN_C_ATTACH",
      desc: "ADMIN_C_ATTACH_DESC",
      fields: [
        {
          widget: "number",
          path: "attach.bone",
          label: "ADMIN_F_BONE",
          hint: "ADMIN_H_BONE",
          min: 0,
          max: 65535,
        },
        offset("x", "ADMIN_F_OFFSET_X", "m"),
        offset("y", "ADMIN_F_OFFSET_Y", "m"),
        offset("z", "ADMIN_F_OFFSET_Z", "m"),
        offset("rx", "ADMIN_F_ROT_X", "°"),
        offset("ry", "ADMIN_F_ROT_Y", "°"),
        offset("rz", "ADMIN_F_ROT_Z", "°"),
      ],
    },
  ],
};
