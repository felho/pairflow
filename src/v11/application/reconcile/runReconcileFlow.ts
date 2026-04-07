import { join } from "node:path";

import type {
  ReconcileRuntimeSessionsReport,
  ReconcileRuntimeSessionsAction,
  RuntimeSessionStaleReason,
  TmuxSessionLivenessProbe
} from "./reconcileCommandContract.js";
import type {
  NormalizedReconcileRuntimeSessionsInput
} from "./reconcileCommandInputNormalization.js";
import type {
  ResolvedReconcileRuntimeSessionsDependencies
} from "./reconcileCommandDependencyResolution.js";

async function resolveStaleReason(
  repoPath: string,
  bubbleId: string,
  bubbleIdSet: Set<string>,
  tmuxSessionName: string,
  isTmuxSessionAlive: TmuxSessionLivenessProbe,
  dependencies: Pick<
    ResolvedReconcileRuntimeSessionsDependencies,
    "readStateSnapshot" | "isFinalState"
  >
): Promise<RuntimeSessionStaleReason | null> {
  if (!bubbleIdSet.has(bubbleId)) {
    return "missing_bubble";
  }

  const statePath = join(repoPath, ".pairflow", "bubbles", bubbleId, "state.json");
  try {
    const loaded = await dependencies.readStateSnapshot(statePath);
    if (dependencies.isFinalState(loaded.state.state)) {
      return "final_state";
    }

    const runtimeSessionExpectedStates = new Set([
      "RUNNING",
      "WAITING_HUMAN",
      "READY_FOR_HUMAN_APPROVAL",
      "APPROVED_FOR_COMMIT",
      "COMMITTED"
    ]);
    if (!runtimeSessionExpectedStates.has(loaded.state.state)) {
      return "non_runtime_state";
    }

    const tmuxSessionAlive = await isTmuxSessionAlive(tmuxSessionName);
    if (!tmuxSessionAlive) {
      return "missing_tmux_session";
    }
    return null;
  } catch {
    return "invalid_state";
  }
}

export async function runReconcileFlow(
  repoPath: string,
  input: NormalizedReconcileRuntimeSessionsInput,
  dependencies: ResolvedReconcileRuntimeSessionsDependencies
): Promise<ReconcileRuntimeSessionsReport> {
  const bubbleIdSet = await dependencies.listBubbleIdSet(repoPath);
  const sessionsPath = join(repoPath, ".pairflow", "runtime", "sessions.json");
  const registry = await dependencies.readRuntimeSessionsRegistry(sessionsPath, {
    allowMissing: true
  });

  const sessionsBefore = dependencies.countRegistryEntries(registry);
  const actions: ReconcileRuntimeSessionsAction[] = [];
  const staleBubbleIds: string[] = [];
  const staleSessionWorktreePaths = new Map<string, string>();
  const reasonCounts: Partial<Record<RuntimeSessionStaleReason, number>> = {};

  for (const bubbleId of Object.keys(registry).sort((a, b) => a.localeCompare(b))) {
    const session = registry[bubbleId];
    if (session === undefined) {
      continue;
    }

    const reason = await resolveStaleReason(
      repoPath,
      bubbleId,
      bubbleIdSet,
      session.tmuxSessionName,
      input.isTmuxSessionAlive,
      dependencies
    );
    if (reason === null) {
      continue;
    }

    actions.push({
      bubbleId,
      reason,
      removed: false
    });
    reasonCounts[reason] = (reasonCounts[reason] ?? 0) + 1;
    staleBubbleIds.push(bubbleId);
    staleSessionWorktreePaths.set(bubbleId, session.worktreePath);
  }

  let removedCount = 0;
  const warnings: NonNullable<ReconcileRuntimeSessionsReport["warnings"]> = [];
  if (!input.dryRun && staleBubbleIds.length > 0) {
    const eligibleForRemoval: string[] = [];
    const markerBlockedBubbleIds = new Set<string>();
    for (const staleBubbleId of staleBubbleIds) {
      const worktreePath = staleSessionWorktreePaths.get(staleBubbleId);
      const markerPersistence =
        await dependencies.persistPassValidationRecoveryMarker({
          repoPath,
          bubbleId: staleBubbleId,
          flow: "reconcile",
          ...(worktreePath !== undefined ? { worktreePath } : {})
        });
      warnings.push(...markerPersistence.warnings);
      if (markerPersistence.persisted_targets.includes("repo:repo_runtime_marker")) {
        eligibleForRemoval.push(staleBubbleId);
      } else {
        markerBlockedBubbleIds.add(staleBubbleId);
      }
    }

    for (const action of actions) {
      if (markerBlockedBubbleIds.has(action.bubbleId)) {
        action.removalBlockedByRecoveryMarker = true;
      }
    }

    if (eligibleForRemoval.length === 0) {
      return {
        repoPath,
        dryRun: input.dryRun,
        sessionsBefore,
        sessionsAfter: sessionsBefore,
        staleCandidates: actions.length,
        reasonCounts,
        actions,
        ...(warnings.length > 0 ? { warnings } : {})
      };
    }

    const result = await dependencies.removeRuntimeSessions({
      sessionsPath,
      bubbleIds: eligibleForRemoval
    });
    const removedSet = new Set(result.removedBubbleIds);
    removedCount = result.removedBubbleIds.length;

    for (const action of actions) {
      action.removed = removedSet.has(action.bubbleId);
    }
  }

  return {
    repoPath,
    dryRun: input.dryRun,
    sessionsBefore,
    sessionsAfter: input.dryRun ? sessionsBefore : sessionsBefore - removedCount,
    staleCandidates: actions.length,
    reasonCounts,
    actions,
    ...(warnings.length > 0 ? { warnings } : {})
  };
}
