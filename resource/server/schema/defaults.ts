/** The settings file's defaults (also the first row of a new sleeping animation). */
export const SETTINGS_DEFAULTS = {
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
