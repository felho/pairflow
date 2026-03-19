import {
  resolveRepoPath
} from "../../../core/bubble/repoResolution.js";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import {
  readRuntimeSessionsRegistry,
  removeRuntimeSessions,
  type RuntimeSessionsRegistry
} from "../../../core/runtime/sessionsRegistry.js";
import { readStateSnapshot } from "../../../core/state/stateStore.js";
import { isFinalState } from "../../../core/state/transitions.js";
import type {
  ListBubbleIdSet,
  ReconcileRuntimeSessionsDependencies
} from "../../application/reconcile/reconcileCommandContract.js";

export interface ResolvedReconcileRuntimeSessionsDependencies {
  resolveRepoPath: typeof resolveRepoPath;
  listBubbleIdSet: ListBubbleIdSet;
  readRuntimeSessionsRegistry: typeof readRuntimeSessionsRegistry;
  removeRuntimeSessions: typeof removeRuntimeSessions;
  readStateSnapshot: typeof readStateSnapshot;
  isFinalState: typeof isFinalState;
  countRegistryEntries: (registry: RuntimeSessionsRegistry) => number;
}

export const listBubbleIdSetDefault: ListBubbleIdSet = async (
  repoPath: string
): Promise<Set<string>> => {
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
};

export function countRegistryEntriesDefault(
  registry: RuntimeSessionsRegistry
): number {
  return Object.keys(registry).length;
}

export function resolveReconcileRuntimeSessionsDependencies(
  dependencies: ReconcileRuntimeSessionsDependencies = {}
): ResolvedReconcileRuntimeSessionsDependencies {
  return {
    resolveRepoPath: dependencies.resolveRepoPath ?? resolveRepoPath,
    listBubbleIdSet: dependencies.listBubbleIdSet ?? listBubbleIdSetDefault,
    readRuntimeSessionsRegistry:
      dependencies.readRuntimeSessionsRegistry ?? readRuntimeSessionsRegistry,
    removeRuntimeSessions:
      dependencies.removeRuntimeSessions ?? removeRuntimeSessions,
    readStateSnapshot: dependencies.readStateSnapshot ?? readStateSnapshot,
    isFinalState: dependencies.isFinalState ?? isFinalState,
    countRegistryEntries:
      dependencies.countRegistryEntries ?? countRegistryEntriesDefault
  };
}
