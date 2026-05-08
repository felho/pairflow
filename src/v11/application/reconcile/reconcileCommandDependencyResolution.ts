import { readdir } from "node:fs/promises";
import { join } from "node:path";
import {
  type RuntimeSessionsRegistry,
  type ReadRuntimeSessionsRegistryPort,
  type RemoveRuntimeSessionsPort
} from "../../ports/runtimeSessions.js";
import type { PersistPassValidationRecoveryMarkerPort } from "../../ports/passValidationRecovery.js";
import type { ResolveRepoPathPort } from "../../ports/repoResolution.js";
import type { ReadStateSnapshotPort } from "../../ports/stateSnapshots.js";
import { isFinalState } from "../../domain/state/transitions.js";
import type {
  ListBubbleIdSet,
  ReconcileRuntimeSessionsDependencies,
  TmuxSessionLivenessProbe
} from "./reconcileCommandContract.js";

export interface ResolvedReconcileRuntimeSessionsDependencies {
  resolveRepoPath: ResolveRepoPathPort;
  listBubbleIdSet: ListBubbleIdSet;
  readRuntimeSessionsRegistry: ReadRuntimeSessionsRegistryPort;
  removeRuntimeSessions: RemoveRuntimeSessionsPort;
  persistPassValidationRecoveryMarker: PersistPassValidationRecoveryMarkerPort;
  readStateSnapshot: ReadStateSnapshotPort;
  isTmuxSessionAlive: TmuxSessionLivenessProbe;
  isFinalState: typeof isFinalState;
  countRegistryEntries: (registry: RuntimeSessionsRegistry) => number;
}

export interface ReconcileRuntimeSessionsDefaultDependencies {
  resolveRepoPath: ResolveRepoPathPort;
  readRuntimeSessionsRegistry: ReadRuntimeSessionsRegistryPort;
  removeRuntimeSessions: RemoveRuntimeSessionsPort;
  persistPassValidationRecoveryMarker: PersistPassValidationRecoveryMarkerPort;
  readStateSnapshot: ReadStateSnapshotPort;
  isTmuxSessionAlive: TmuxSessionLivenessProbe;
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
  dependencies: ReconcileRuntimeSessionsDependencies = {},
  defaults: ReconcileRuntimeSessionsDefaultDependencies
): ResolvedReconcileRuntimeSessionsDependencies {
  return {
    resolveRepoPath: dependencies.resolveRepoPath ?? defaults.resolveRepoPath,
    listBubbleIdSet: dependencies.listBubbleIdSet ?? listBubbleIdSetDefault,
    readRuntimeSessionsRegistry:
      dependencies.readRuntimeSessionsRegistry ??
      defaults.readRuntimeSessionsRegistry,
    removeRuntimeSessions:
      dependencies.removeRuntimeSessions ?? defaults.removeRuntimeSessions,
    persistPassValidationRecoveryMarker:
      dependencies.persistPassValidationRecoveryMarker ??
      defaults.persistPassValidationRecoveryMarker,
    readStateSnapshot: dependencies.readStateSnapshot ?? defaults.readStateSnapshot,
    isTmuxSessionAlive:
      dependencies.isTmuxSessionAlive ?? defaults.isTmuxSessionAlive,
    isFinalState: dependencies.isFinalState ?? isFinalState,
    countRegistryEntries:
      dependencies.countRegistryEntries ?? countRegistryEntriesDefault
  };
}
