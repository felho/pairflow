import { persistPassValidationRecoveryMarker } from "../../infrastructure/artifact/validation/passValidationRecoveryMarker.js";
import {
  readRuntimeSessionsRegistry,
  removeRuntimeSessions
} from "../../infrastructure/executor/sessionRuntime/runtimeSessionsRegistry.js";
import { resolveRepoPath } from "../../infrastructure/executor/workspace/repoResolution.js";
import { runTmux } from "../tmux/tmuxRunnerDefaults.js";
import type { ReconcileRuntimeSessionsDefaultDependencies } from "../../application/reconcile/reconcileCommandDependencyResolution.js";
import type { TmuxSessionLivenessProbe } from "../../application/reconcile/reconcileCommandContract.js";

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

export const reconcileRuntimeSessionsDefaultDependencies = {
  isTmuxSessionAlive: isTmuxSessionAliveDefault,
  persistPassValidationRecoveryMarker,
  readRuntimeSessionsRegistry,
  removeRuntimeSessions,
  resolveRepoPath
} as const satisfies Omit<
  ReconcileRuntimeSessionsDefaultDependencies,
  "readStateSnapshot"
>;
