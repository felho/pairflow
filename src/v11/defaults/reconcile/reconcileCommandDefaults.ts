import { persistPassValidationRecoveryMarker } from "../../infrastructure/artifact/validation/passValidationRecoveryMarker.js";
import {
  readRuntimeSessionsRegistry,
  removeRuntimeSessions
} from "../../infrastructure/executor/sessionRuntime/runtimeSessionsRegistry.js";
import { resolveRepoPath } from "../../infrastructure/executor/workspace/repoResolution.js";
import type { ReconcileRuntimeSessionsDefaultDependencies } from "../../application/reconcile/reconcileCommandDependencyResolution.js";

export const reconcileRuntimeSessionsDefaultDependencies = {
  persistPassValidationRecoveryMarker,
  readRuntimeSessionsRegistry,
  removeRuntimeSessions,
  resolveRepoPath
} as const satisfies Omit<
  ReconcileRuntimeSessionsDefaultDependencies,
  "readStateSnapshot"
>;
