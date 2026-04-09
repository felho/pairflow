import { askHumanDependencyDefaults } from "../../../core/agent/askHumanDefaults.js";

export const askHumanExecutionDependencyDefaults = {
  ...askHumanDependencyDefaults.execution
} as const;
