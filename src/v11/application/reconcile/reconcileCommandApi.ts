import {
  reconcileRuntimeSessionsCommandOrchestration
} from "./internal/orchestration/reconcileCommandOrchestration.js";
import {
  resolveReconcileRuntimeSessionsDependencies,
  type ResolvedReconcileRuntimeSessionsDependencies
} from "./reconcileCommandDependencyResolution.js";
import type {
  ReconcileRuntimeSessionsDefaultDependencies,
  ReconcileRuntimeSessionsDependencies,
  ReconcileRuntimeSessionsAction,
  ReconcileRuntimeSessionsInput,
  ReconcileRuntimeSessionsReport,
  RuntimeSessionStaleReason,
  TmuxSessionLivenessProbe
} from "./reconcileCommandContract.js";
import {
  StartupReconcilerError,
  throwAsStartupReconcilerError
} from "./internal/error/reconcileCommandRuntime.js";

const RECONCILE_DEFAULT_DEPENDENCIES_MISSING =
  "RECONCILE_DEFAULT_DEPENDENCIES_MISSING";

function requireReconcileDefaultDependencies(
  dependencies: ReconcileRuntimeSessionsDependencies
): ReconcileRuntimeSessionsDefaultDependencies {
  const {
    resolveRepoPath,
    readRuntimeSessionsRegistry,
    removeRuntimeSessions,
    persistPassValidationRecoveryMarker,
    readStateSnapshot,
    isTmuxSessionAlive
  } = dependencies;
  if (
    resolveRepoPath === undefined ||
    readRuntimeSessionsRegistry === undefined ||
    removeRuntimeSessions === undefined ||
    persistPassValidationRecoveryMarker === undefined ||
    readStateSnapshot === undefined ||
    isTmuxSessionAlive === undefined
  ) {
    const missing = [
      resolveRepoPath === undefined ? "resolveRepoPath" : undefined,
      readRuntimeSessionsRegistry === undefined
        ? "readRuntimeSessionsRegistry"
        : undefined,
      removeRuntimeSessions === undefined ? "removeRuntimeSessions" : undefined,
      persistPassValidationRecoveryMarker === undefined
        ? "persistPassValidationRecoveryMarker"
        : undefined,
      readStateSnapshot === undefined ? "readStateSnapshot" : undefined,
      isTmuxSessionAlive === undefined ? "isTmuxSessionAlive" : undefined
    ].filter((item) => item !== undefined);
    throw new StartupReconcilerError(
      `${RECONCILE_DEFAULT_DEPENDENCIES_MISSING}: missing dependency context for ${missing.join(", ")}.`
    );
  }

  return {
    resolveRepoPath,
    readRuntimeSessionsRegistry,
    removeRuntimeSessions,
    persistPassValidationRecoveryMarker,
    readStateSnapshot,
    isTmuxSessionAlive
  };
}

export async function reconcileRuntimeSessions(
  input: ReconcileRuntimeSessionsInput = {},
  dependencies: ReconcileRuntimeSessionsDependencies = {}
): Promise<ReconcileRuntimeSessionsReport> {
  const defaultReconcileDependencies:
    ReconcileRuntimeSessionsDefaultDependencies =
      requireReconcileDefaultDependencies(dependencies);
  const resolvedDependencies: ResolvedReconcileRuntimeSessionsDependencies =
    resolveReconcileRuntimeSessionsDependencies(
      dependencies,
      defaultReconcileDependencies
    );
  return reconcileRuntimeSessionsCommandOrchestration(
    input,
    resolvedDependencies
  );
}

export {
  StartupReconcilerError,
  throwAsStartupReconcilerError,
  throwAsStartupReconcilerError as asStartupReconcilerError
};
export type {
  ReconcileRuntimeSessionsAction,
  ReconcileRuntimeSessionsDependencies,
  ReconcileRuntimeSessionsInput,
  ReconcileRuntimeSessionsReport,
  RuntimeSessionStaleReason,
  TmuxSessionLivenessProbe
};
