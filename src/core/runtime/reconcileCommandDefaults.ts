import { persistPassValidationRecoveryMarker } from "../../v11/infrastructure/artifact/validation/passValidationRecoveryMarker.js";
import { readRuntimeSessionsRegistry, removeRuntimeSessions } from "./sessionsRegistry.js";
import { resolveRepoPath } from "../../v11/infrastructure/executor/workspace/repoResolution.js";

export const reconcileRuntimeSessionsDefaultDependencies = {
  persistPassValidationRecoveryMarker,
  readRuntimeSessionsRegistry,
  removeRuntimeSessions,
  resolveRepoPath
} as const;
