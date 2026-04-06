import { RepoResolutionError } from "../../infrastructure/executor/workspace/repoResolution.js";
import { runReconcileFlow } from "../../application/reconcile/runReconcileFlow.js";
import type {
  ReconcileRuntimeSessionsDependencies,
  ReconcileRuntimeSessionsInput,
  ReconcileRuntimeSessionsReport
} from "../../application/reconcile/reconcileCommandContract.js";
import { createStartupReconcilerError } from "./reconcileCommandRuntime.js";
import {
  normalizeReconcileRuntimeSessionsInput
} from "./reconcileCommandInputNormalization.js";
import {
  resolveReconcileRuntimeSessionsDependencies
} from "./reconcileCommandDependencyResolution.js";

const RECONCILE_REPO_RESOLUTION_FAILED = "RECONCILE_REPO_RESOLUTION_FAILED";

export async function reconcileRuntimeSessionsCommandOrchestration(
  input: ReconcileRuntimeSessionsInput = {},
  dependencies: ReconcileRuntimeSessionsDependencies = {}
): Promise<ReconcileRuntimeSessionsReport> {
  const normalizedInput = normalizeReconcileRuntimeSessionsInput(input);
  const resolvedDependencies =
    resolveReconcileRuntimeSessionsDependencies(dependencies);

  let repoPath: string;
  try {
    repoPath = await resolvedDependencies.resolveRepoPath({
      ...(normalizedInput.repoPath !== undefined
        ? { repoPath: normalizedInput.repoPath }
        : {}),
      ...(normalizedInput.cwd !== undefined ? { cwd: normalizedInput.cwd } : {})
    });
  } catch (error) {
    if (error instanceof RepoResolutionError) {
      throw createStartupReconcilerError(
        `${RECONCILE_REPO_RESOLUTION_FAILED}: ${error.message}`
      );
    }
    throw error;
  }

  return runReconcileFlow(repoPath, normalizedInput, resolvedDependencies);
}
