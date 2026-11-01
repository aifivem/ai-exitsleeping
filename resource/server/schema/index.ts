import type { PanelSchema } from "@aicore-fivem/shared";
import { settingsFile, generalTab } from "./general";
import { animationsTab } from "./animations";
import { areasFile, areasTab } from "./areas";

/** ai-exitsleeping's panel: how sleeping bodies behave, their animations, and areas where none is shown. */
export const exitSleepingSchema: PanelSchema = {
  title: "ADMIN_TITLE",
  icon: "user",
  files: {
    settings: settingsFile,
    areas: areasFile,
  },
  tabs: [generalTab, animationsTab, areasTab],
};
