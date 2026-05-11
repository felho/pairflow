import { persistPassValidationRecoveryMarker } from "../../infrastructure/artifact/validation/passValidationRecoveryMarker.js";
import {
  readRuntimeSessionsRegistry,
  removeRuntimeSessions
} from "../../infrastructure/executor/sessionRuntime/runtimeSessionsRegistry.js";
import { readStateSnapshot } from "../../infrastructure/state/stateStore.js";
import { resolveRepoPath } from "../../infrastructure/executor/workspace/repoResolution.js";
import { runTmux } from "../../infrastructure/channel/tmux/tmuxRunner.js";
import type {
  ReconcileRuntimeSessionsDefaultDependencies,
  TmuxSessionLivenessProbe
} from "../../application/reconcile/reconcileCommandContract.js";

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
  readStateSnapshot,
  removeRuntimeSessions,
  resolveRepoPath
} as const satisfies ReconcileRuntimeSessionsDefaultDependencies;
