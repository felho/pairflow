import { RepoResolutionError } from "../../../core/bubble/repoResolution.js";
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
      throw createStartupReconcilerError(error.message);
    }
    throw error;
  }

  return runReconcileFlow(repoPath, normalizedInput, resolvedDependencies);
}
