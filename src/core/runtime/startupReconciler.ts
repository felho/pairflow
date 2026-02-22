import { readdir } from "node:fs/promises";
import { join } from "node:path";

import {
  RepoResolutionError,
  resolveRepoPath
} from "../bubble/repoResolution.js";
import { readStateSnapshot } from "../state/stateStore.js";
import { isFinalState } from "../state/transitions.js";
import {
  readRuntimeSessionsRegistry,
  removeRuntimeSessions,
  type RuntimeSessionsRegistry
} from "./sessionsRegistry.js";

export type RuntimeSessionStaleReason =
  | "missing_bubble"
  | "final_state"
  | "invalid_state";

export interface ReconcileRuntimeSessionsInput {
  repoPath?: string | undefined;
  cwd?: string | undefined;
  dryRun?: boolean | undefined;
}

export interface ReconcileRuntimeSessionsAction {
  bubbleId: string;
  reason: RuntimeSessionStaleReason;
  removed: boolean;
}

export interface ReconcileRuntimeSessionsReport {
  repoPath: string;
  dryRun: boolean;
  sessionsBefore: number;
  sessionsAfter: number;
  staleCandidates: number;
  actions: ReconcileRuntimeSessionsAction[];
}

export class StartupReconcilerError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "StartupReconcilerError";
  }
}

async function listBubbleIdSet(repoPath: string): Promise<Set<string>> {
  const bubblesRoot = join(repoPath, ".pairflow", "bubbles");
  const entries = await readdir(bubblesRoot, { withFileTypes: true }).catch(
    (error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") {
        return [];
      }
      throw error;
    }
  );

  return new Set(
    entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name)
  );
}

async function resolveStaleReason(
  repoPath: string,
  bubbleId: string,
  bubbleIdSet: Set<string>
): Promise<RuntimeSessionStaleReason | null> {
  if (!bubbleIdSet.has(bubbleId)) {
    return "missing_bubble";
  }

  const statePath = join(repoPath, ".pairflow", "bubbles", bubbleId, "state.json");
  try {
    const loaded = await readStateSnapshot(statePath);
    if (isFinalState(loaded.state.state)) {
      return "final_state";
    }
    return null;
  } catch {
    return "invalid_state";
  }
}

function countRegistryEntries(registry: RuntimeSessionsRegistry): number {
  return Object.keys(registry).length;
}

export async function reconcileRuntimeSessions(
  input: ReconcileRuntimeSessionsInput = {}
): Promise<ReconcileRuntimeSessionsReport> {
  let repoPath: string;
  try {
    repoPath = await resolveRepoPath({
      repoPath: input.repoPath,
      cwd: input.cwd
    });
  } catch (error) {
    if (error instanceof RepoResolutionError) {
      throw new StartupReconcilerError(error.message);
    }
    throw error;
  }
  const bubbleIdSet = await listBubbleIdSet(repoPath);
  const sessionsPath = join(repoPath, ".pairflow", "runtime", "sessions.json");
  const registry = await readRuntimeSessionsRegistry(sessionsPath, {
    allowMissing: true
  });
  const sessionsBefore = countRegistryEntries(registry);
  const dryRun = input.dryRun ?? false;

  const actions: ReconcileRuntimeSessionsAction[] = [];
  const staleBubbleIds: string[] = [];

  for (const bubbleId of Object.keys(registry).sort((a, b) => a.localeCompare(b))) {
    const reason = await resolveStaleReason(repoPath, bubbleId, bubbleIdSet);
    if (reason === null) {
      continue;
    }

    actions.push({
      bubbleId,
      reason,
      removed: false
    });
    staleBubbleIds.push(bubbleId);
  }

  let removedCount = 0;
  if (!dryRun && staleBubbleIds.length > 0) {
    const result = await removeRuntimeSessions({
      sessionsPath,
      bubbleIds: staleBubbleIds
    });
    const removedSet = new Set(result.removedBubbleIds);
    removedCount = result.removedBubbleIds.length;

    for (const action of actions) {
      action.removed = removedSet.has(action.bubbleId);
    }
  }

  return {
    repoPath,
    dryRun,
    sessionsBefore,
    sessionsAfter: dryRun ? sessionsBefore : sessionsBefore - removedCount,
    staleCandidates: actions.length,
    actions
  };
}

export function asStartupReconcilerError(error: unknown): never {
  if (error instanceof StartupReconcilerError) {
    throw error;
  }
  if (error instanceof Error) {
    throw new StartupReconcilerError(error.message);
  }
  throw error;
}
