import { isNamedError } from "../../../../shared/errors/namedError.js";
import { runReconcileFlow } from "./runReconcileFlow.js";
import type {
  ReconcileRuntimeSessionsInput,
  ReconcileRuntimeSessionsReport
} from "../../reconcileCommandContract.js";
import type {
  ResolvedReconcileRuntimeSessionsDependencies
} from "../../reconcileCommandDependencyResolution.js";
import { createStartupReconcilerError } from "../error/reconcileCommandRuntime.js";
import {
  normalizeReconcileRuntimeSessionsInput
} from "../../reconcileCommandInputNormalization.js";

const RECONCILE_REPO_RESOLUTION_FAILED = "RECONCILE_REPO_RESOLUTION_FAILED";

export async function reconcileRuntimeSessionsCommandOrchestration(
  input: ReconcileRuntimeSessionsInput = {},
  dependencies: ResolvedReconcileRuntimeSessionsDependencies
): Promise<ReconcileRuntimeSessionsReport> {
  const normalizedInput = normalizeReconcileRuntimeSessionsInput(input, {
    isTmuxSessionAlive: dependencies.isTmuxSessionAlive
  });

  let repoPath: string;
  try {
    repoPath = await dependencies.resolveRepoPath({
      ...(normalizedInput.repoPath !== undefined
        ? { repoPath: normalizedInput.repoPath }
        : {}),
      ...(normalizedInput.cwd !== undefined ? { cwd: normalizedInput.cwd } : {})
    });
  } catch (error) {
    if (isNamedError(error, "RepoResolutionError")) {
      throw createStartupReconcilerError(
        `${RECONCILE_REPO_RESOLUTION_FAILED}: ${error.message}`
      );
    }
    throw error;
  }

  return runReconcileFlow(repoPath, normalizedInput, dependencies);
}
