import { readStateSnapshot } from "../start/startCommandDependencyDefaults.js";
import type {
  ReconcileRuntimeSessionsDefaultDependencies
} from "./reconcileCommandDependencyResolution.js";

type ReconcileDefaultsModule = {
  reconcileRuntimeSessionsDefaultDependencies: Omit<
    ReconcileRuntimeSessionsDefaultDependencies,
    "readStateSnapshot"
  >;
};

let reconcileRuntimeSessionsDefaultDependenciesPromise:
  | Promise<ReconcileRuntimeSessionsDefaultDependencies>
  | undefined;

function getReconcileCommandDefaultsModulePath(): string {
  return ["..", "..", "defaults", "reconcile", "reconcileCommandDefaults.js"].join(
    "/"
  );
}

export async function loadReconcileRuntimeSessionsDefaultDependencies(): Promise<ReconcileRuntimeSessionsDefaultDependencies> {
  reconcileRuntimeSessionsDefaultDependenciesPromise ??= import(
    getReconcileCommandDefaultsModulePath()
  ).then((module: ReconcileDefaultsModule) => ({
    ...module.reconcileRuntimeSessionsDefaultDependencies,
    readStateSnapshot
  }));
  return reconcileRuntimeSessionsDefaultDependenciesPromise;
}
