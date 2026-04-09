export type {
  ReconcileRuntimeSessionsAction as ReconcileRuntimeSessionsActionV11,
  ReconcileRuntimeSessionsDependencies as ReconcileRuntimeSessionsDependenciesV11,
  ReconcileRuntimeSessionsInput as ReconcileRuntimeSessionsInputV11,
  ReconcileRuntimeSessionsReport as ReconcileRuntimeSessionsReportV11,
  RuntimeSessionStaleReason as RuntimeSessionStaleReasonV11,
  TmuxSessionLivenessProbe as TmuxSessionLivenessProbeV11
} from "./reconcileCommandContract.js";
export {
  StartupReconcilerError as StartupReconcilerErrorV11,
  throwAsStartupReconcilerError as asStartupReconcilerErrorV11
} from "../../shared/reconcile/reconcileCommandRuntime.js";

let startupReconcilerModulePromise:
  | Promise<typeof import("../../../core/runtime/startupReconciler.js")>
  | undefined;

async function loadStartupReconcilerModule() {
  startupReconcilerModulePromise ??= import(
    "../../../core/runtime/startupReconciler.js"
  );
  return startupReconcilerModulePromise;
}

export async function reconcileRuntimeSessionsV11(
  input: Parameters<
    typeof import("../../../core/runtime/startupReconciler.js")["reconcileRuntimeSessions"]
  >[0] = {},
  dependencies: Parameters<
    typeof import("../../../core/runtime/startupReconciler.js")["reconcileRuntimeSessions"]
  >[1] = {}
): Promise<
  Awaited<
    ReturnType<
      typeof import("../../../core/runtime/startupReconciler.js")["reconcileRuntimeSessions"]
    >
  >
> {
  const { reconcileRuntimeSessions } = await loadStartupReconcilerModule();
  return reconcileRuntimeSessions(input, dependencies);
}
