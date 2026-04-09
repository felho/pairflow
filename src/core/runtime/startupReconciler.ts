import { resolveRepoPath } from "../bubble/repoResolution.js";
import { persistPassValidationRecoveryMarker } from "./passValidationEvidence.js";
import {
  readRuntimeSessionsRegistry,
  removeRuntimeSessions
} from "./sessionsRegistry.js";
import { readStateSnapshot } from "../state/stateStore.js";
import {
  reconcileRuntimeSessionsCommandOrchestration,
} from "../../v11/application/reconcile/reconcileCommandOrchestration.js";
import {
  resolveReconcileRuntimeSessionsDependencies,
  type ReconcileRuntimeSessionsDefaultDependencies,
  type ResolvedReconcileRuntimeSessionsDependencies
} from "../../v11/application/reconcile/reconcileCommandDependencyResolution.js";
import type {
  ReconcileRuntimeSessionsDependencies,
  ReconcileRuntimeSessionsAction,
  ReconcileRuntimeSessionsInput,
  ReconcileRuntimeSessionsReport,
  RuntimeSessionStaleReason,
  TmuxSessionLivenessProbe
} from "../../v11/application/reconcile/reconcileCommandContract.js";
import {
  StartupReconcilerError,
  throwAsStartupReconcilerError
} from "../../v11/shared/reconcile/reconcileCommandRuntime.js";

const defaultReconcileDependencies: ReconcileRuntimeSessionsDefaultDependencies = {
  resolveRepoPath,
  readRuntimeSessionsRegistry,
  removeRuntimeSessions,
  persistPassValidationRecoveryMarker,
  readStateSnapshot
};

export async function reconcileRuntimeSessions(
  input: ReconcileRuntimeSessionsInput = {},
  dependencies: ReconcileRuntimeSessionsDependencies = {}
): Promise<ReconcileRuntimeSessionsReport> {
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
  throwAsStartupReconcilerError as asStartupReconcilerError
};
export type {
  ReconcileRuntimeSessionsAction,
  ReconcileRuntimeSessionsInput,
  ReconcileRuntimeSessionsReport,
  RuntimeSessionStaleReason,
  TmuxSessionLivenessProbe
};
