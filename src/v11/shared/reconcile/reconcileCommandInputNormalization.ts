import type {
  ReconcileRuntimeSessionsInput,
  TmuxSessionLivenessProbe
} from "../../application/reconcile/reconcileCommandContract.js";
import { runTmux } from "../../infrastructure/channel/tmux/tmuxManager.js";

export interface NormalizedReconcileRuntimeSessionsInput {
  repoPath?: string;
  cwd?: string;
  dryRun: boolean;
  isTmuxSessionAlive: TmuxSessionLivenessProbe;
}

export const isTmuxSessionAliveDefault: TmuxSessionLivenessProbe = async (
  sessionName: string
): Promise<boolean> => {
  try {
    const result = await runTmux(["has-session", "-t", sessionName], {
      allowFailure: true
    });
    return result.exitCode === 0;
  } catch {
    return false;
  }
};

export function normalizeReconcileRuntimeSessionsInput(
  input: ReconcileRuntimeSessionsInput
): NormalizedReconcileRuntimeSessionsInput {
  return {
    ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
    ...(input.cwd !== undefined ? { cwd: input.cwd } : {}),
    dryRun: input.dryRun ?? false,
    isTmuxSessionAlive: input.isTmuxSessionAlive ?? isTmuxSessionAliveDefault
  };
}
