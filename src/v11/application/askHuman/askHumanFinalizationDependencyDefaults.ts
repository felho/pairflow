import { askHumanDependencyDefaults } from "../../../core/agent/askHumanDefaults.js";

export const askHumanFinalizationDependencyDefaults = {
  ...askHumanDependencyDefaults.finalization
} as const;
