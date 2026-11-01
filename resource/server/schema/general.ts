import { spec } from "@aicore-fivem/lib/shared";
import type { DataSpec, FileSpec, TabSpec } from "@aicore-fivem/shared";
import { metres } from "./metres";
import { SETTINGS_DEFAULTS } from "./defaults";

const ANIM_SPEC: DataSpec = {
  type: "object",
  fields: {
    dict: { type: "text", min: 1, max: 128 },
    clip: { type: "text", min: 1, max: 128 },
    flags: spec.int(0, 65535),
  },
};

export const settingsFile: FileSpec = {
  kind: "settings",
  sync: "all",
  defaults: SETTINGS_DEFAULTS,
  sections: {
    wakeOn: { type: "enum", values: ["auto", "export"] },
    days: spec.int(1, 365),
    spawnDistance: spec.num(5, 60),
    hideInInstances: { type: "bool" },
    interactDistance: spec.num(1, 10),
    maxActionDistance: spec.num(2, 30),
    trackSeconds: spec.int(1, 60),
    sleepAnims: { type: "list", min: 1, max: 20, of: ANIM_SPEC },
    carrier: ANIM_SPEC,
    carried: ANIM_SPEC,
    attach: {
      type: "object",
      fields: {
        bone: spec.int(0, 65535),
        x: spec.num(-5, 5),
        y: spec.num(-5, 5),
        z: spec.num(-5, 5),
        rx: spec.num(-360, 360),
        ry: spec.num(-360, 360),
        rz: spec.num(-360, 360),
      },
    },
    debug: { type: "bool" },
  },
};

export const generalTab: TabSpec = {
  id: "general",
  file: "settings",
  icon: "sliders",
  label: "ADMIN_TAB_GENERAL",
  desc: "ADMIN_TAB_GENERAL_DESC",
  cards: [
    {
      icon: "user",
      title: "ADMIN_C_BODIES",
      desc: "ADMIN_C_BODIES_DESC",
      fields: [
        {
          widget: "number",
          path: "days",
          label: "ADMIN_F_DAYS",
          hint: "ADMIN_H_DAYS",
          min: 1,
          max: 365,
          unit: "d",
        },
        metres(
          "spawnDistance",
          "ADMIN_F_SPAWN_DISTANCE",
          "ADMIN_H_SPAWN_DISTANCE",
          5,
          60,
        ),
        {
          widget: "switch",
          path: "hideInInstances",
          label: "ADMIN_F_HIDE_INSTANCES",
          hint: "ADMIN_H_HIDE_INSTANCES",
        },
        {
          widget: "select",
          path: "wakeOn",
          label: "ADMIN_F_WAKE_ON",
          hint: "ADMIN_H_WAKE_ON",
          options: [
            { value: "auto", label: "ADMIN_O_WAKE_AUTO" },
            { value: "export", label: "ADMIN_O_WAKE_EXPORT" },
          ],
        },
      ],
    },
    {
      icon: "hand-pointer",
      title: "ADMIN_C_ACTIONS",
      desc: "ADMIN_C_ACTIONS_DESC",
      fields: [
        metres(
          "interactDistance",
          "ADMIN_F_INTERACT_DISTANCE",
          "ADMIN_H_INTERACT_DISTANCE",
          1,
          10,
        ),
        metres(
          "maxActionDistance",
          "ADMIN_F_MAX_ACTION_DISTANCE",
          "ADMIN_H_MAX_ACTION_DISTANCE",
          2,
          30,
        ),
        {
          widget: "number",
          path: "trackSeconds",
          label: "ADMIN_F_TRACK",
          hint: "ADMIN_H_TRACK",
          min: 1,
          max: 60,
          unit: "s",
        },
        {
          widget: "switch",
          path: "debug",
          label: "ADMIN_F_DEBUG",
          hint: "ADMIN_H_DEBUG",
        },
      ],
    },
  ],
};
