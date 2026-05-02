import {
  reconcileRuntimeSessionsCommandOrchestration
} from "./reconcileCommandOrchestration.js";
import {
  resolveReconcileRuntimeSessionsDependencies,
  type ReconcileRuntimeSessionsDefaultDependencies,
  type ResolvedReconcileRuntimeSessionsDependencies
} from "./reconcileCommandDependencyResolution.js";
import type {
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
} from "./reconcileCommandRuntime.js";
import {
  loadReconcileRuntimeSessionsDefaultDependencies
} from "./reconcileCommandDefaults.js";

export async function reconcileRuntimeSessions(
  input: ReconcileRuntimeSessionsInput = {},
  dependencies: ReconcileRuntimeSessionsDependencies = {}
): Promise<ReconcileRuntimeSessionsReport> {
  const defaultReconcileDependencies:
    ReconcileRuntimeSessionsDefaultDependencies =
      await loadReconcileRuntimeSessionsDefaultDependencies();
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
