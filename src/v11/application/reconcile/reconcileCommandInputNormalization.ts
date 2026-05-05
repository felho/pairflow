import type {
  ReconcileRuntimeSessionsInput,
  TmuxSessionLivenessProbe
} from "./reconcileCommandContract.js";

export interface NormalizedReconcileRuntimeSessionsInput {
  repoPath?: string;
  cwd?: string;
  dryRun: boolean;
  isTmuxSessionAlive: TmuxSessionLivenessProbe;
}

export function normalizeReconcileRuntimeSessionsInput(
  input: ReconcileRuntimeSessionsInput,
  defaults: {
    isTmuxSessionAlive: TmuxSessionLivenessProbe;
  }
): NormalizedReconcileRuntimeSessionsInput {
  return {
    ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
    ...(input.cwd !== undefined ? { cwd: input.cwd } : {}),
    dryRun: input.dryRun ?? false,
    isTmuxSessionAlive: input.isTmuxSessionAlive ?? defaults.isTmuxSessionAlive
  };
}
