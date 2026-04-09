import type {
  ReconcileRuntimeSessionsInput,
  TmuxSessionLivenessProbe
} from "./reconcileCommandContract.js";
import type { TmuxRunner } from "../../shared/ports/tmuxSessions.js";

let tmuxManagerModulePromise: Promise<{ runTmux: TmuxRunner }> | undefined;

async function loadTmuxManagerModule(): Promise<{ runTmux: TmuxRunner }> {
  tmuxManagerModulePromise ??= import(
    "../../../core/runtime/tmuxManager.js"
  ).then(({ runTmux }) => ({ runTmux }));
  return tmuxManagerModulePromise;
}

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
    const { runTmux } = await loadTmuxManagerModule();
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
