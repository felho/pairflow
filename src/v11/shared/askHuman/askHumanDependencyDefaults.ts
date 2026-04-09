import { askHumanDependencyDefaults } from "../../../core/agent/askHumanDefaults.js";

export const askHumanExecutionDependencyDefaults = {
  ...askHumanDependencyDefaults.execution
} as const;

export const askHumanRoutingPreparationDependencyDefaults = {
  ...askHumanDependencyDefaults.routingPreparation
} as const;

export const askHumanFinalizationDependencyDefaults = {
  ...askHumanDependencyDefaults.finalization
} as const;
