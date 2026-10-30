import { spec } from "@aicore-fivem/lib/shared";
import type { DataSpec, PanelSchema, WidgetSpec } from "@aicore-fivem/shared";

const ANIM_SPEC: DataSpec = {
  type: "object",
  fields: {
    dict: { type: "text", min: 1, max: 128 },
    clip: { type: "text", min: 1, max: 128 },
    flags: spec.int(0, 65535),
  },
};

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

const metres = (
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

const offset = (path: string, label: string, unit: string): WidgetSpec => ({
  widget: "number",
  path: `attach.${path}`,
  label,
  min: unit === "m" ? -5 : -360,
  max: unit === "m" ? 5 : 360,
  step: unit === "m" ? 0.01 : 0.5,
  unit,
});

const SETTINGS_DEFAULTS = {
  wakeOn: "auto",
  days: 3,
  spawnDistance: 25,
  hideInInstances: true,
  interactDistance: 2.5,
  maxActionDistance: 6,
  trackSeconds: 5,
  sleepAnims: [
    {
      dict: "amb@world_human_bum_slumped@male@laying_on_left_side@idle_a",
      clip: "idle_b",
      flags: 1,
    },
  ],
  carrier: {
    dict: "missfinale_c2mcs_1",
    clip: "fin_c2_mcs_1_camman",
    flags: 49,
  },
  carried: { dict: "nm", clip: "firemans_carry", flags: 33 },
  attach: { bone: 0, x: 0.2, y: 0.15, z: 0.63, rx: 0.5, ry: 0.5, rz: 5 },
  debug: false,
};

/** ai-exitsleeping's panel: how sleeping bodies behave, their animations, and areas where none is shown. */
export const exitSleepingSchema: PanelSchema = {
  title: "ADMIN_TITLE",
  icon: "user",
  files: {
    settings: {
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
    },
    areas: {
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
    },
  },
  tabs: [
    {
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
    },
    {
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
    },
    {
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
              ...metres(
                "height",
                "ADMIN_F_HEIGHT",
                "ADMIN_H_HEIGHT",
                0.5,
                1000,
              ),
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
    },
  ],
};
