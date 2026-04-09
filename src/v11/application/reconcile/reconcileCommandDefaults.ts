import { readStateSnapshot } from "../../shared/state/stateStoreDefaults.js";
import { reconcileRuntimeSessionsDefaultDependencies } from "../../defaults/reconcile/reconcileCommandDefaults.js";
import type {
  ReconcileRuntimeSessionsDefaultDependencies
} from "./reconcileCommandDependencyResolution.js";

let reconcileRuntimeSessionsDefaultDependenciesPromise:
  | Promise<ReconcileRuntimeSessionsDefaultDependencies>
  | undefined;

export async function loadReconcileRuntimeSessionsDefaultDependencies(): Promise<ReconcileRuntimeSessionsDefaultDependencies> {
  reconcileRuntimeSessionsDefaultDependenciesPromise ??= Promise.resolve({
    ...reconcileRuntimeSessionsDefaultDependencies,
    readStateSnapshot
  });
  return reconcileRuntimeSessionsDefaultDependenciesPromise;
}
