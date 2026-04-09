import { readStateSnapshot } from "../../shared/state/stateStoreDefaults.js";
import type {
  ReconcileRuntimeSessionsDefaultDependencies
} from "./reconcileCommandDependencyResolution.js";

let reconcileRuntimeSessionsDefaultDependenciesPromise:
  | Promise<ReconcileRuntimeSessionsDefaultDependencies>
  | undefined;

export async function loadReconcileRuntimeSessionsDefaultDependencies(): Promise<ReconcileRuntimeSessionsDefaultDependencies> {
  reconcileRuntimeSessionsDefaultDependenciesPromise ??= Promise.all([
    import("../../infrastructure/executor/workspace/repoResolution.js"),
    import("../../infrastructure/executor/sessionRuntime/runtimeSessionsRegistry.js"),
    import("../../infrastructure/artifact/validation/passValidationRecoveryMarker.js")
  ]).then(
    ([
      { resolveRepoPath },
      { readRuntimeSessionsRegistry, removeRuntimeSessions },
      { persistPassValidationRecoveryMarker }
    ]) => ({
      resolveRepoPath,
      readRuntimeSessionsRegistry,
      removeRuntimeSessions,
      persistPassValidationRecoveryMarker,
      readStateSnapshot
    })
  );
  return reconcileRuntimeSessionsDefaultDependenciesPromise;
}
