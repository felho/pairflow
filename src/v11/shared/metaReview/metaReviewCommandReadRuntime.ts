import { readFile } from "node:fs/promises";

import {
  resolveBubbleById
} from "../../infrastructure/executor/workspace/bubbleLookup.js";
import {
  readStateSnapshot
} from "../../infrastructure/state/stateStore.js";
import {
  clearLiveMetaReviewSnapshot,
  normalizeMetaReviewSnapshot
} from "./metaReviewSnapshot.js";
import {
  emptyMetaReviewFindingsParitySnapshot
} from "./metaReviewRuntimeParity.js";
import {
  createMetaReviewLastReportView,
  createMetaReviewStatusView
} from "./metaReviewCommandReadProjection.js";
import {
  isRoundLocalMetaReviewSnapshotOutsideCurrentRound,
  resolveMetaReviewProjectionFreshness,
  resolveSnapshotFreshnessDiagnostics
} from "./metaReviewCommandReadFreshness.js";
import {
  readMetaReviewParitySnapshotFromArtifact,
  readMetaReviewReportJsonArtifact,
  resolveReportArtifactPath
} from "./metaReviewCommandReadArtifacts.js";
import type {
  MetaReviewCommandDependencies,
  MetaReviewLastReportView,
  MetaReviewReadInput,
  MetaReviewStatusView
} from "./metaReviewCommandContract.js";

export async function getMetaReviewStatus(
  input: MetaReviewReadInput,
  dependencies: MetaReviewCommandDependencies = {}
): Promise<MetaReviewStatusView> {
  const resolveBubble = dependencies.resolveBubbleById ?? resolveBubbleById;
  const readState = dependencies.readStateSnapshot ?? readStateSnapshot;
  const readFileFn = dependencies.readFile ?? readFile;

  const resolved = await resolveBubble({
    bubbleId: input.bubbleId,
    ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
    ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
  });
  const loadedState = await readState(resolved.bubblePaths.statePath);
  const snapshot = normalizeMetaReviewSnapshot(loadedState.state.meta_review);
  if (!snapshot.last_autonomous_report_ref) {
    return createMetaReviewStatusView({
      bubbleId: resolved.bubbleId,
      snapshot,
      projectionFreshness: "no_snapshot"
    });
  }
  const parityRead = await readMetaReviewParitySnapshotFromArtifact({
    artifactPath: resolved.bubblePaths.metaReviewLastJsonArtifactPath,
    readFileFn
  });
  const freshnessDiagnostics = resolveSnapshotFreshnessDiagnostics({
    currentRound: loadedState.state.round,
    snapshotRound: parityRead.snapshotRound,
    snapshotRoundIdentity: parityRead.snapshotRoundIdentity
  });
  if (
    isRoundLocalMetaReviewSnapshotOutsideCurrentRound({
      currentRound: loadedState.state.round,
      snapshotRound: parityRead.snapshotRound,
      snapshotRoundIdentity: parityRead.snapshotRoundIdentity
    })
  ) {
    return createMetaReviewStatusView({
      bubbleId: resolved.bubbleId,
      snapshot: clearLiveMetaReviewSnapshot(snapshot),
      projectionFreshness: resolveMetaReviewProjectionFreshness({
        hasSnapshot: true,
        currentRound: loadedState.state.round,
        snapshotRound: parityRead.snapshotRound,
        snapshotRoundIdentity: parityRead.snapshotRoundIdentity,
        diagnostics: [...parityRead.diagnostics, ...freshnessDiagnostics]
      }),
      parity: emptyMetaReviewFindingsParitySnapshot,
      parityDiagnostics: [...parityRead.diagnostics, ...freshnessDiagnostics]
    });
  }

  return createMetaReviewStatusView({
    bubbleId: resolved.bubbleId,
    snapshot,
    projectionFreshness: resolveMetaReviewProjectionFreshness({
      hasSnapshot: true,
      currentRound: loadedState.state.round,
      snapshotRound: parityRead.snapshotRound,
      snapshotRoundIdentity: parityRead.snapshotRoundIdentity,
      diagnostics: [...parityRead.diagnostics, ...freshnessDiagnostics]
    }),
    parity: parityRead.parity,
    parityDiagnostics: [...parityRead.diagnostics, ...freshnessDiagnostics]
  });
}

export async function getMetaReviewLastReport(
  input: MetaReviewReadInput,
  dependencies: MetaReviewCommandDependencies = {}
): Promise<MetaReviewLastReportView> {
  const resolveBubble = dependencies.resolveBubbleById ?? resolveBubbleById;
  const readState = dependencies.readStateSnapshot ?? readStateSnapshot;
  const readFileFn = dependencies.readFile ?? readFile;

  const resolved = await resolveBubble({
    bubbleId: input.bubbleId,
    ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
    ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
  });
  const loadedState = await readState(resolved.bubblePaths.statePath);
  const snapshot = normalizeMetaReviewSnapshot(loadedState.state.meta_review);
  let parity = { ...emptyMetaReviewFindingsParitySnapshot };
  let parityDiagnostics: string[] = [];

  if (!snapshot.last_autonomous_report_ref) {
    return createMetaReviewLastReportView({
      bubbleId: resolved.bubbleId,
      hasReport: false,
      projectionFreshness: "no_snapshot",
      reportRef: null,
      summary: snapshot.last_autonomous_summary,
      updatedAt: snapshot.last_autonomous_updated_at,
      reportJson: null,
      parity,
      parityDiagnostics
    });
  }

  const reportRef = snapshot.last_autonomous_report_ref;
  const reportPath = resolveReportArtifactPath({
    bubbleDir: resolved.bubblePaths.bubbleDir,
    artifactsDir: resolved.bubblePaths.artifactsDir,
    reportRef
  });
  const parityRead = await readMetaReviewParitySnapshotFromArtifact({
    artifactPath: resolved.bubblePaths.metaReviewLastJsonArtifactPath,
    readFileFn
  });
  parity = parityRead.parity;
  parityDiagnostics = [
    ...parityRead.diagnostics,
    ...resolveSnapshotFreshnessDiagnostics({
      currentRound: loadedState.state.round,
      snapshotRound: parityRead.snapshotRound,
      snapshotRoundIdentity: parityRead.snapshotRoundIdentity
    })
  ];
  if (
    isRoundLocalMetaReviewSnapshotOutsideCurrentRound({
      currentRound: loadedState.state.round,
      snapshotRound: parityRead.snapshotRound,
      snapshotRoundIdentity: parityRead.snapshotRoundIdentity
    })
  ) {
    return createMetaReviewLastReportView({
      bubbleId: resolved.bubbleId,
      hasReport: false,
      projectionFreshness: resolveMetaReviewProjectionFreshness({
        hasSnapshot: true,
        currentRound: loadedState.state.round,
        snapshotRound: parityRead.snapshotRound,
        snapshotRoundIdentity: parityRead.snapshotRoundIdentity,
        diagnostics: parityDiagnostics
      }),
      reportRef: null,
      summary: null,
      updatedAt: null,
      reportJson: null,
      parity,
      parityDiagnostics
    });
  }

  const reportRead = await readMetaReviewReportJsonArtifact({
    artifactPath: reportPath,
    readFileFn
  });
  if (!reportRead.hasReport) {
    return createMetaReviewLastReportView({
      bubbleId: resolved.bubbleId,
      hasReport: false,
      projectionFreshness: resolveMetaReviewProjectionFreshness({
        hasSnapshot: true,
        currentRound: loadedState.state.round,
        snapshotRound: parityRead.snapshotRound,
        snapshotRoundIdentity: parityRead.snapshotRoundIdentity,
        diagnostics: parityDiagnostics
      }),
      reportRef,
      summary: snapshot.last_autonomous_summary,
      updatedAt: snapshot.last_autonomous_updated_at,
      reportJson: null,
      parity,
      parityDiagnostics
    });
  }

  return createMetaReviewLastReportView({
    bubbleId: resolved.bubbleId,
    hasReport: true,
    projectionFreshness: resolveMetaReviewProjectionFreshness({
      hasSnapshot: true,
      currentRound: loadedState.state.round,
      snapshotRound: parityRead.snapshotRound,
      snapshotRoundIdentity: parityRead.snapshotRoundIdentity,
      diagnostics: parityDiagnostics
    }),
    reportRef,
    summary: snapshot.last_autonomous_summary,
    updatedAt: snapshot.last_autonomous_updated_at,
    reportJson: reportRead.reportJson,
    parity,
    parityDiagnostics
  });
}
