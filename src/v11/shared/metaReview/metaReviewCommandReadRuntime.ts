import { readFile } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";

import {
  resolveBubbleById
} from "../../infrastructure/executor/workspace/bubbleLookup.js";
import {
  readStateSnapshot
} from "../../infrastructure/state/stateStore.js";
import {
  isInteger,
  isNonEmptyString,
  isRecord
} from "../validation/primitives.js";
import {
  clearLiveMetaReviewSnapshot,
  normalizeMetaReviewSnapshot
} from "./metaReviewSnapshot.js";
import { MetaReviewError } from "./metaReviewError.js";
import {
  emptyMetaReviewFindingsParitySnapshot,
  readMetaReviewFindingsParitySnapshot,
  type MetaReviewFindingsParitySnapshot
} from "./metaReviewRuntimeParity.js";
import {
  isMissingFileError
} from "./metaReviewCommandErrorMapping.js";
import type {
  BubbleMetaReviewSnapshotState
} from "../../../types/bubble.js";
import type {
  MetaReviewCommandDependencies,
  MetaReviewLastReportView,
  MetaReviewReadInput,
  MetaReviewStatusView
} from "./metaReviewCommandContract.js";

const metaReviewParityArtifactReadFailedReasonCode =
  "META_REVIEW_PARITY_ARTIFACT_READ_FAILED";
const metaReviewParityArtifactParseFailedReasonCode =
  "META_REVIEW_PARITY_ARTIFACT_PARSE_FAILED";
const metaReviewParityArtifactShapeInvalidReasonCode =
  "META_REVIEW_PARITY_ARTIFACT_SHAPE_INVALID";
const metaReviewParityArtifactReportJsonInvalidReasonCode =
  "META_REVIEW_PARITY_REPORT_JSON_INVALID";
const metaReviewSnapshotRoundStaleReasonCode = "META_REVIEW_SNAPSHOT_ROUND_STALE";
const metaReviewSnapshotRoundAheadReasonCode = "META_REVIEW_SNAPSHOT_ROUND_AHEAD";
const metaReviewSnapshotRoundMissingReasonCode =
  "META_REVIEW_SNAPSHOT_ROUND_MISSING";

type MetaReviewSnapshotRoundIdentity = "present" | "missing" | "unavailable";

interface MetaReviewParityArtifactReadResult {
  parity: MetaReviewFindingsParitySnapshot;
  diagnostics: string[];
  snapshotRound: number | null;
  snapshotRoundIdentity: MetaReviewSnapshotRoundIdentity;
}

function resolveReportArtifactPath(input: {
  bubbleDir: string;
  artifactsDir: string;
  reportRef: string;
}): string {
  if (
    !input.reportRef.startsWith("artifacts/") ||
    input.reportRef.includes("..") ||
    input.reportRef.includes("\\") ||
    input.reportRef.includes("\0")
  ) {
    throw new MetaReviewError(
      "META_REVIEW_SCHEMA_INVALID",
      "Invalid meta-review report_ref; expected a safe artifacts/* reference."
    );
  }

  const resolvedReportPath = resolve(input.bubbleDir, input.reportRef);
  const relativeToArtifacts = relative(input.artifactsDir, resolvedReportPath);

  if (
    relativeToArtifacts.startsWith("..") ||
    isAbsolute(relativeToArtifacts)
  ) {
    throw new MetaReviewError(
      "META_REVIEW_SCHEMA_INVALID",
      "Invalid meta-review report_ref; resolved path escapes artifacts directory."
    );
  }

  return resolvedReportPath;
}

function createMetaReviewStatusView(
  bubbleId: string,
  snapshot: BubbleMetaReviewSnapshotState,
  projectionFreshness: MetaReviewStatusView["projection_freshness"],
  parity: MetaReviewFindingsParitySnapshot = emptyMetaReviewFindingsParitySnapshot,
  parityDiagnostics: string[] = []
): MetaReviewStatusView {
  const hasRun =
    snapshot.last_autonomous_status !== null &&
    snapshot.last_autonomous_recommendation !== null;

  return {
    bubbleId,
    has_run: hasRun,
    operator_surface: "projection_only",
    projection_freshness: projectionFreshness,
    auto_rework_count: snapshot.auto_rework_count,
    auto_rework_limit: snapshot.auto_rework_limit,
    sticky_human_gate: snapshot.sticky_human_gate,
    last_autonomous_run_id: snapshot.last_autonomous_run_id,
    last_autonomous_status: snapshot.last_autonomous_status,
    last_autonomous_recommendation: snapshot.last_autonomous_recommendation,
    last_autonomous_summary: snapshot.last_autonomous_summary,
    last_autonomous_report_ref: snapshot.last_autonomous_report_ref,
    last_autonomous_rework_target_message:
      snapshot.last_autonomous_rework_target_message,
    last_autonomous_updated_at: snapshot.last_autonomous_updated_at,
    findings_claimed_open_total: parity.findings_claimed_open_total,
    findings_artifact_open_total: parity.findings_artifact_open_total,
    findings_blocking_open_total: parity.findings_blocking_open_total,
    findings_advisory_open_total: parity.findings_advisory_open_total,
    findings_artifact_status: parity.findings_artifact_status,
    findings_digest_sha256: parity.findings_digest_sha256,
    meta_review_run_id: parity.meta_review_run_id,
    findings_parity_status: parity.findings_parity_status,
    parity_diagnostics: [...parityDiagnostics]
  };
}

function isRoundLocalMetaReviewSnapshotOutsideCurrentRound(input: {
  currentRound: number;
  snapshotRound: number | null;
  snapshotRoundIdentity: "present" | "missing" | "unavailable";
}): boolean {
  return (
    isInteger(input.currentRound) &&
    input.currentRound > 0 &&
    ((input.snapshotRoundIdentity === "missing" && input.snapshotRound === null) ||
      (input.snapshotRound !== null &&
        input.snapshotRound !== input.currentRound))
  );
}

function resolveMetaReviewProjectionFreshness(input: {
  hasSnapshot: boolean;
  currentRound: number;
  snapshotRound: number | null;
  snapshotRoundIdentity: MetaReviewSnapshotRoundIdentity;
  diagnostics?: string[];
}): MetaReviewStatusView["projection_freshness"] {
  if (!input.hasSnapshot) {
    return "no_snapshot";
  }
  if (input.snapshotRoundIdentity === "unavailable") {
    return "unknown";
  }
  if (
    input.snapshotRoundIdentity === "missing" &&
    input.snapshotRound === null &&
    isInteger(input.currentRound) &&
    input.currentRound > 0
  ) {
    return "round_missing";
  }
  if (
    input.snapshotRoundIdentity === "missing" ||
    !isInteger(input.currentRound) ||
    input.currentRound < 1 ||
    (input.snapshotRoundIdentity === "present" && input.snapshotRound === null)
  ) {
    return "unknown";
  }
  if (
    input.snapshotRound !== null &&
    isInteger(input.currentRound) &&
    input.currentRound > 0 &&
    input.snapshotRound < input.currentRound
  ) {
    return "stale";
  }
  if (
    input.snapshotRound !== null &&
    isInteger(input.currentRound) &&
    input.currentRound > 0 &&
    input.snapshotRound > input.currentRound
  ) {
    return "ahead";
  }
  if ((input.diagnostics ?? []).length > 0) {
    return "unknown";
  }
  return "current_round";
}

function resolveParityArtifactReadErrorCode(error: unknown): string {
  if (error instanceof Error && "code" in error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (typeof code === "string" && code.trim().length > 0) {
      return code.trim().toUpperCase();
    }
  }
  return "UNKNOWN";
}

function readMetaReviewParitySnapshotFromArtifactRaw(
  artifactRaw: string
): MetaReviewParityArtifactReadResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(artifactRaw);
  } catch {
    return {
      parity: { ...emptyMetaReviewFindingsParitySnapshot },
      diagnostics: [metaReviewParityArtifactParseFailedReasonCode],
      snapshotRound: null,
      snapshotRoundIdentity: "unavailable"
    };
  }

  if (!isRecord(parsed)) {
    return {
      parity: { ...emptyMetaReviewFindingsParitySnapshot },
      diagnostics: [metaReviewParityArtifactShapeInvalidReasonCode],
      snapshotRound: null,
      snapshotRoundIdentity: "unavailable"
    };
  }

  if (
    "report_json" in parsed &&
    parsed.report_json !== undefined &&
    !isRecord(parsed.report_json)
  ) {
    return {
      parity: { ...emptyMetaReviewFindingsParitySnapshot },
      diagnostics: [metaReviewParityArtifactReportJsonInvalidReasonCode],
      snapshotRound: null,
      snapshotRoundIdentity: "unavailable"
    };
  }

  const reportJson = isRecord(parsed.report_json)
    ? parsed.report_json
    : parsed;
  const snapshotRound =
    typeof parsed.round === "number" && isInteger(parsed.round) && parsed.round > 0
      ? parsed.round
      : null;

  return {
    parity: readMetaReviewFindingsParitySnapshot(reportJson),
    diagnostics: [],
    snapshotRound,
    snapshotRoundIdentity: snapshotRound === null ? "missing" : "present"
  };
}

function resolveSnapshotFreshnessDiagnostics(input: {
  currentRound: number;
  snapshotRound: number | null;
  snapshotRoundIdentity: MetaReviewSnapshotRoundIdentity;
}): string[] {
  if (!isInteger(input.currentRound) || input.currentRound < 1) {
    return [];
  }
  if (input.snapshotRoundIdentity === "missing" && input.snapshotRound === null) {
    return [
      `${metaReviewSnapshotRoundMissingReasonCode}:current_round=${input.currentRound}`
    ];
  }
  if (input.snapshotRound === null) {
    return [];
  }
  if (input.snapshotRound < input.currentRound) {
    return [
      `${metaReviewSnapshotRoundStaleReasonCode}:snapshot_round=${input.snapshotRound};current_round=${input.currentRound}`
    ];
  }
  if (input.snapshotRound > input.currentRound) {
    return [
      `${metaReviewSnapshotRoundAheadReasonCode}:snapshot_round=${input.snapshotRound};current_round=${input.currentRound}`
    ];
  }
  return [];
}

async function readMetaReviewParitySnapshotFromArtifact(input: {
  artifactPath: string;
  readFileFn: typeof readFile;
}): Promise<MetaReviewParityArtifactReadResult> {
  let artifactRaw: string;
  try {
    artifactRaw = await input.readFileFn(input.artifactPath, "utf8");
  } catch (error) {
    return {
      parity: { ...emptyMetaReviewFindingsParitySnapshot },
      diagnostics: [
        `${metaReviewParityArtifactReadFailedReasonCode}:${resolveParityArtifactReadErrorCode(error)}`
      ],
      snapshotRound: null,
      snapshotRoundIdentity: "unavailable"
    };
  }

  return readMetaReviewParitySnapshotFromArtifactRaw(artifactRaw);
}

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
  if (!isNonEmptyString(snapshot.last_autonomous_report_ref)) {
    return createMetaReviewStatusView(
      resolved.bubbleId,
      snapshot,
      "no_snapshot"
    );
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
    return createMetaReviewStatusView(
      resolved.bubbleId,
      clearLiveMetaReviewSnapshot(snapshot),
      resolveMetaReviewProjectionFreshness({
        hasSnapshot: true,
        currentRound: loadedState.state.round,
        snapshotRound: parityRead.snapshotRound,
        snapshotRoundIdentity: parityRead.snapshotRoundIdentity,
        diagnostics: [...parityRead.diagnostics, ...freshnessDiagnostics]
      }),
      emptyMetaReviewFindingsParitySnapshot,
      [...parityRead.diagnostics, ...freshnessDiagnostics]
    );
  }

  return createMetaReviewStatusView(
    resolved.bubbleId,
    snapshot,
    resolveMetaReviewProjectionFreshness({
      hasSnapshot: true,
      currentRound: loadedState.state.round,
      snapshotRound: parityRead.snapshotRound,
      snapshotRoundIdentity: parityRead.snapshotRoundIdentity,
      diagnostics: [...parityRead.diagnostics, ...freshnessDiagnostics]
    }),
    parityRead.parity,
    [...parityRead.diagnostics, ...freshnessDiagnostics]
  );
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

  if (!isNonEmptyString(snapshot.last_autonomous_report_ref)) {
    return {
      bubbleId: resolved.bubbleId,
      has_report: false,
      operator_surface: "projection_only",
      projection_freshness: "no_snapshot",
      report_ref: null,
      summary: snapshot.last_autonomous_summary,
      updated_at: snapshot.last_autonomous_updated_at,
      report_json: null,
      findings_claimed_open_total: parity.findings_claimed_open_total,
      findings_artifact_open_total: parity.findings_artifact_open_total,
      findings_blocking_open_total: parity.findings_blocking_open_total,
      findings_advisory_open_total: parity.findings_advisory_open_total,
      findings_artifact_status: parity.findings_artifact_status,
      findings_digest_sha256: parity.findings_digest_sha256,
      meta_review_run_id: parity.meta_review_run_id,
      findings_parity_status: parity.findings_parity_status,
      parity_diagnostics: parityDiagnostics
    };
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
    return {
      bubbleId: resolved.bubbleId,
      has_report: false,
      operator_surface: "projection_only",
      projection_freshness: resolveMetaReviewProjectionFreshness({
        hasSnapshot: true,
        currentRound: loadedState.state.round,
        snapshotRound: parityRead.snapshotRound,
        snapshotRoundIdentity: parityRead.snapshotRoundIdentity,
        diagnostics: parityDiagnostics
      }),
      report_ref: null,
      summary: null,
      updated_at: null,
      report_json: null,
      findings_claimed_open_total: null,
      findings_artifact_open_total: null,
      findings_blocking_open_total: null,
      findings_advisory_open_total: null,
      findings_artifact_status: null,
      findings_digest_sha256: null,
      meta_review_run_id: null,
      findings_parity_status: null,
      parity_diagnostics: parityDiagnostics
    };
  }

  let reportJson: Record<string, unknown> | null = null;
  try {
    const reportRaw = await readFileFn(reportPath, "utf8");
    const parsed: unknown = JSON.parse(reportRaw);
    if (isRecord(parsed) && isRecord(parsed.report_json)) {
      reportJson = parsed.report_json;
    } else if (isRecord(parsed)) {
      reportJson = parsed;
    }
  } catch (error) {
    if (isMissingFileError(error)) {
      return {
        bubbleId: resolved.bubbleId,
        has_report: false,
        operator_surface: "projection_only",
        projection_freshness: resolveMetaReviewProjectionFreshness({
          hasSnapshot: true,
          currentRound: loadedState.state.round,
          snapshotRound: parityRead.snapshotRound,
          snapshotRoundIdentity: parityRead.snapshotRoundIdentity,
          diagnostics: parityDiagnostics
        }),
        report_ref: reportRef,
        summary: snapshot.last_autonomous_summary,
        updated_at: snapshot.last_autonomous_updated_at,
        report_json: null,
        findings_claimed_open_total: parity.findings_claimed_open_total,
        findings_artifact_open_total: parity.findings_artifact_open_total,
        findings_blocking_open_total: parity.findings_blocking_open_total,
        findings_advisory_open_total: parity.findings_advisory_open_total,
        findings_artifact_status: parity.findings_artifact_status,
        findings_digest_sha256: parity.findings_digest_sha256,
        meta_review_run_id: parity.meta_review_run_id,
        findings_parity_status: parity.findings_parity_status,
        parity_diagnostics: parityDiagnostics
      };
    }
    return {
      bubbleId: resolved.bubbleId,
      has_report: true,
      operator_surface: "projection_only",
      projection_freshness: resolveMetaReviewProjectionFreshness({
        hasSnapshot: true,
        currentRound: loadedState.state.round,
        snapshotRound: parityRead.snapshotRound,
        snapshotRoundIdentity: parityRead.snapshotRoundIdentity,
        diagnostics: parityDiagnostics
      }),
      report_ref: reportRef,
      summary: snapshot.last_autonomous_summary,
      updated_at: snapshot.last_autonomous_updated_at,
      report_json: null,
      findings_claimed_open_total: parity.findings_claimed_open_total,
      findings_artifact_open_total: parity.findings_artifact_open_total,
      findings_blocking_open_total: parity.findings_blocking_open_total,
      findings_advisory_open_total: parity.findings_advisory_open_total,
      findings_artifact_status: parity.findings_artifact_status,
      findings_digest_sha256: parity.findings_digest_sha256,
      meta_review_run_id: parity.meta_review_run_id,
      findings_parity_status: parity.findings_parity_status,
      parity_diagnostics: parityDiagnostics
    };
  }

  return {
    bubbleId: resolved.bubbleId,
    has_report: true,
    operator_surface: "projection_only",
    projection_freshness: resolveMetaReviewProjectionFreshness({
      hasSnapshot: true,
      currentRound: loadedState.state.round,
      snapshotRound: parityRead.snapshotRound,
      snapshotRoundIdentity: parityRead.snapshotRoundIdentity,
      diagnostics: parityDiagnostics
    }),
    report_ref: reportRef,
    summary: snapshot.last_autonomous_summary,
    updated_at: snapshot.last_autonomous_updated_at,
    report_json: reportJson,
    findings_claimed_open_total: parity.findings_claimed_open_total,
    findings_artifact_open_total: parity.findings_artifact_open_total,
    findings_blocking_open_total: parity.findings_blocking_open_total,
    findings_advisory_open_total: parity.findings_advisory_open_total,
    findings_artifact_status: parity.findings_artifact_status,
    findings_digest_sha256: parity.findings_digest_sha256,
    meta_review_run_id: parity.meta_review_run_id,
    findings_parity_status: parity.findings_parity_status,
    parity_diagnostics: parityDiagnostics
  };
}
