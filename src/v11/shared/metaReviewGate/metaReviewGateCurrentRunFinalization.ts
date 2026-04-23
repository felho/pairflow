import type { MetaReviewArtifactReadPort } from "../metaReview/metaReviewArtifactIo.js";
import type { MetaReviewResult } from "../metaReview/metaReviewTypes.js";
import type {
  AppendProtocolEnvelopePort
} from "../ports/transcript.js";
import type {
  LoadedStateSnapshot,
  WriteStateSnapshotPort
} from "../ports/stateSnapshots.js";
import type { BubbleConfig } from "../../../types/bubble.js";
import type { BubbleReviewAutoReworkSeverity } from "../../../types/bubble.js";
import type { FindingPriority } from "../../../types/findings.js";
import {
  type FindingsParityMetadata
} from "../../../types/protocol.js";
import {
  normalizeMetaReviewSnapshot,
} from "./metaReviewGateShared.js";
import {
  type MetaReviewGateResult,
  type MetaReviewGateThresholdMetadata
} from "./metaReviewGateTypes.js";
import { dispatchAutoRework } from "./metaReviewGateAutoRework.js";
import { validateStructuredMetaReviewPositiveClaim } from "./metaReviewGateFindingsValidation.js";
import type { MetaReviewGateArtifactReadFn } from "./metaReviewGateFindingsMetadata.js";
import {
  REVIEW_POLICY_THRESHOLD_CONTEXT_INCOMPLETE,
  REVIEW_POLICY_THRESHOLD_SOURCE_UNRESOLVED,
  resolveMetaReviewGateThresholdAuthority
} from "./metaReviewGateThresholdAuthority.js";
import { normalizeBubbleReviewPolicy } from "../reviewPolicy/reviewPolicyRuntime.js";
import {
  persistDispatchFailedHumanRoute,
  persistResolvedHumanRoute,
  persistRunFailedHumanRoute
} from "./metaReviewGateCurrentRunRoutePersistence.js";

const REVIEW_POLICY_AUTO_REWORK_THRESHOLD_NOT_MET =
  "REVIEW_POLICY_AUTO_REWORK_THRESHOLD_NOT_MET" as const;

const findingPriorityOrder: FindingPriority[] = ["P0", "P1", "P2", "P3"];

type AutoReworkThresholdDecision =
  | {
      route: "auto_rework";
      parityMetadata: FindingsParityMetadata | null;
    }
  | {
      route: "human_gate_threshold_not_met" | "human_gate_threshold_unresolved";
      parityMetadata: FindingsParityMetadata | null;
      thresholdMetadata: MetaReviewGateThresholdMetadata;
      fallbackReason: string;
    };

function resolveThresholdAuthorityParityMismatchDiagnostic(input: {
  routingParityMetadata: FindingsParityMetadata | null;
  authorityParityMetadata: FindingsParityMetadata | null;
}): string | null {
  const routingParityMetadata = input.routingParityMetadata;
  const authorityParityMetadata = input.authorityParityMetadata;
  if (
    routingParityMetadata === null
    || authorityParityMetadata === null
  ) {
    return null;
  }

  const comparableFields: Array<keyof FindingsParityMetadata> = [
    "findings_claimed_open_total",
    "findings_artifact_open_total",
    "findings_artifact_status",
    "findings_digest_sha256",
    "meta_review_run_id",
    "findings_parity_status"
  ];
  const mismatches = comparableFields.flatMap((field) => {
    const routingValue = routingParityMetadata[field];
    const authorityValue = authorityParityMetadata[field];
    return routingValue === authorityValue
      ? []
      : [
          `${field}: routing=${String(routingValue ?? "null")} authority=${String(authorityValue ?? "null")}`
        ];
  });

  if (mismatches.length === 0) {
    return null;
  }

  return [
    REVIEW_POLICY_THRESHOLD_SOURCE_UNRESOLVED,
    "routing parity metadata drifted before threshold authority resolution",
    mismatches.join("; ")
  ].join(": ");
}

interface FinalizeCurrentRunMetaReviewGateInput {
  resolved: {
    bubbleId: string;
    bubbleConfig: Pick<
      BubbleConfig,
      "watchdog_timeout_minutes" | "agents" | "review_policy"
    >;
    bubblePaths: {
      artifactsDir: string;
      bubbleDir: string;
      inboxPath: string;
      locksDir: string;
      statePath: string;
      transcriptPath: string;
    };
  };
  loaded: LoadedStateSnapshot;
  now: Date;
  refs: string[];
  summary: string;
  runResult: MetaReviewResult;
  readFileFn: MetaReviewArtifactReadPort;
  appendEnvelope: AppendProtocolEnvelopePort;
  writeState: WriteStateSnapshotPort;
}

function mergeRunResultWithParityResolution(input: {
  runResult: MetaReviewResult;
  metadata: FindingsParityMetadata | null;
  diagnostics: string[];
}): MetaReviewResult {
  if (input.metadata === null && input.diagnostics.length === 0) {
    return input.runResult;
  }
  const reportJson = { ...(input.runResult.report_json ?? {}) };
  if (input.metadata !== null) {
    reportJson.findings_claimed_open_total = input.metadata.findings_claimed_open_total;
    reportJson.findings_artifact_open_total = input.metadata.findings_artifact_open_total;
    reportJson.findings_blocking_open_total = input.metadata.findings_blocking_open_total;
    reportJson.findings_advisory_open_total = input.metadata.findings_advisory_open_total;
    reportJson.findings_artifact_status = input.metadata.findings_artifact_status;
    reportJson.findings_digest_sha256 = input.metadata.findings_digest_sha256;
    reportJson.meta_review_run_id = input.metadata.meta_review_run_id;
    reportJson.findings_parity_status = input.metadata.findings_parity_status;
  }
  const existingDiagnostics = Array.isArray(reportJson.claim_diagnostics)
    ? reportJson.claim_diagnostics.filter(
        (entry): entry is string => typeof entry === "string"
      )
    : [];
  if (existingDiagnostics.length > 0 || input.diagnostics.length > 0) {
    reportJson.claim_diagnostics = [...existingDiagnostics, ...input.diagnostics];
  }
  return {
    ...input.runResult,
    report_json: reportJson
  };
}

function callMetaReviewGateArtifactReadFn(
  readFileFn: MetaReviewGateArtifactReadFn,
  artifactPath: string,
  encoding: "utf8"
): Promise<string> {
  return readFileFn(artifactPath, encoding);
}

async function resolveCurrentRunParity(input: {
  resolved: FinalizeCurrentRunMetaReviewGateInput["resolved"];
  snapshot: ReturnType<typeof normalizeMetaReviewSnapshot>;
  runResult: MetaReviewResult;
  readFileFn: MetaReviewArtifactReadPort;
}): Promise<
  | {
      ok: true;
      budgetAvailable: boolean;
      parityMetadata: FindingsParityMetadata | null;
      runResultForRouting: MetaReviewResult;
    }
  | {
      ok: false;
      reason: string;
      parityMetadata: FindingsParityMetadata | null;
      runResultForRouting: MetaReviewResult;
    }
> {
  const readFileFn = (artifactPath: string, encoding: "utf8") =>
    callMetaReviewGateArtifactReadFn(input.readFileFn, artifactPath, encoding);
  const parity = await validateStructuredMetaReviewPositiveClaim({
    runResult: input.runResult,
    ...(input.runResult.report_json !== undefined
      ? { reportJson: input.runResult.report_json }
      : {}),
    bubbleDir: input.resolved.bubblePaths.bubbleDir,
    artifactsDir: input.resolved.bubblePaths.artifactsDir,
    readFileFn
  });
  if (!parity.ok) {
    return {
      ok: false,
      reason: parity.reason,
      parityMetadata: parity.metadata,
      runResultForRouting: mergeRunResultWithParityResolution({
        runResult: input.runResult,
        metadata: parity.metadata,
        diagnostics: []
      })
    };
  }
  return {
    ok: true,
    budgetAvailable: input.snapshot.auto_rework_count < input.snapshot.auto_rework_limit,
    parityMetadata: parity.metadata,
    runResultForRouting: mergeRunResultWithParityResolution({
      runResult: input.runResult,
      metadata: parity.metadata,
      diagnostics: parity.diagnostics
    })
  };
}

function thresholdMet(input: {
  highestOpenSeverity: FindingPriority;
  minSeverity: BubbleReviewAutoReworkSeverity;
}): boolean {
  return (
    findingPriorityOrder.indexOf(input.highestOpenSeverity)
    <= findingPriorityOrder.indexOf(input.minSeverity)
  );
}

function buildThresholdNotMetSummary(input: {
  minSeverity: BubbleReviewAutoReworkSeverity;
  highestOpenSeverity: FindingPriority;
}): string {
  return [
    "Meta-review recommended rework, but auto rework was not dispatched.",
    `Highest open severity ${input.highestOpenSeverity} did not meet the configured minimum ${input.minSeverity}.`
  ].join(" ");
}

function buildThresholdUnresolvedSummary(input: {
  thresholdStatus: "unresolved" | "incomplete";
  diagnostics: string[];
}): string {
  const diagnostic = input.diagnostics[0];
  const detail =
    typeof diagnostic === "string" && diagnostic.trim().length > 0
      ? ` Detail: ${diagnostic}`
      : "";
  return [
    "Meta-review recommended rework, but auto rework was blocked because threshold authority was not fully resolved.",
    `Threshold status: ${input.thresholdStatus}.${detail}`
  ].join(" ");
}

async function resolveAutoReworkThresholdDecision(input: {
  finalizeInput: FinalizeCurrentRunMetaReviewGateInput;
  runResultForRouting: MetaReviewResult;
  parityMetadata: FindingsParityMetadata | null;
}): Promise<AutoReworkThresholdDecision> {
  const normalizedReviewPolicy = normalizeBubbleReviewPolicy(
    input.finalizeInput.resolved.bubbleConfig
  );
  const thresholdAuthority = await resolveMetaReviewGateThresholdAuthority({
    runResult: input.runResultForRouting,
    bubbleDir: input.finalizeInput.resolved.bubblePaths.bubbleDir,
    artifactsDir: input.finalizeInput.resolved.bubblePaths.artifactsDir,
    readFileFn: input.finalizeInput.readFileFn
  });
  const parityMismatchDiagnostic = resolveThresholdAuthorityParityMismatchDiagnostic({
    routingParityMetadata: input.parityMetadata,
    authorityParityMetadata: thresholdAuthority.parityMetadata
  });
  const parityMetadata =
    thresholdAuthority.parityMetadata ?? input.parityMetadata;
  if (parityMismatchDiagnostic !== null) {
    return {
      route: "human_gate_threshold_unresolved",
      parityMetadata,
      thresholdMetadata: {
        status: "unresolved",
        reasonCode: REVIEW_POLICY_THRESHOLD_SOURCE_UNRESOLVED
      },
      fallbackReason: buildThresholdUnresolvedSummary({
        thresholdStatus: "unresolved",
        diagnostics: [parityMismatchDiagnostic]
      })
    };
  }

  if (thresholdAuthority.status === "resolved") {
    if (
      thresholdMet({
        highestOpenSeverity: thresholdAuthority.highestOpenSeverity,
        minSeverity: normalizedReviewPolicy.meta_review_auto_rework_min_severity
      })
    ) {
      return {
        route: "auto_rework",
        parityMetadata
      };
    }

    return {
      route: "human_gate_threshold_not_met",
      parityMetadata,
      thresholdMetadata: {
        status: "not_met",
        reasonCode: REVIEW_POLICY_AUTO_REWORK_THRESHOLD_NOT_MET,
        minSeverity: normalizedReviewPolicy.meta_review_auto_rework_min_severity,
        highestOpenSeverity: thresholdAuthority.highestOpenSeverity
      },
      fallbackReason: buildThresholdNotMetSummary({
        minSeverity: normalizedReviewPolicy.meta_review_auto_rework_min_severity,
        highestOpenSeverity: thresholdAuthority.highestOpenSeverity
      })
    };
  }

  const thresholdStatus = thresholdAuthority.status;
  const thresholdMetadata: MetaReviewGateThresholdMetadata =
    thresholdStatus === "incomplete"
      ? {
          status: "incomplete",
          reasonCode: REVIEW_POLICY_THRESHOLD_CONTEXT_INCOMPLETE
        }
      : {
          status: "unresolved",
          reasonCode: REVIEW_POLICY_THRESHOLD_SOURCE_UNRESOLVED
        };
  return {
    route: "human_gate_threshold_unresolved",
    parityMetadata,
    thresholdMetadata,
    fallbackReason: buildThresholdUnresolvedSummary({
      thresholdStatus,
      diagnostics: thresholdAuthority.diagnostics
    })
  };
}

export async function finalizeCurrentRunMetaReviewGate(
  input: FinalizeCurrentRunMetaReviewGateInput
): Promise<MetaReviewGateResult> {
  const snapshot = normalizeMetaReviewSnapshot(input.loaded.state.meta_review);

  if (input.runResult.status === "error") {
    return persistRunFailedHumanRoute(input);
  }

  const parity = await resolveCurrentRunParity({
    resolved: input.resolved,
    snapshot,
    runResult: input.runResult,
    readFileFn: input.readFileFn
  });

  if (!parity.ok) {
    return persistDispatchFailedHumanRoute({
      finalizeInput: input,
      loaded: input.loaded,
      expectedState: "RUNNING",
      runResultForRouting: parity.runResultForRouting,
      parityMetadata: parity.parityMetadata,
      fallbackReason:
        `META_REVIEW_GATE_REWORK_DISPATCH_FAILED: ${parity.reason}`,
      rollbackStateOnAppendFailure: input.loaded.state
    });
  }

  if (snapshot.sticky_human_gate) {
    return persistResolvedHumanRoute({
      finalizeInput: input,
      runResultForRouting: parity.runResultForRouting,
      budgetAvailable: parity.budgetAvailable,
      parityMetadata: parity.parityMetadata,
      forceStickyHumanGateBypass: true
    });
  }

  if (
    parity.runResultForRouting.recommendation === "rework" &&
    parity.budgetAvailable
  ) {
    const thresholdDecision = await resolveAutoReworkThresholdDecision({
      finalizeInput: input,
      runResultForRouting: parity.runResultForRouting,
      parityMetadata: parity.parityMetadata
    });
    if (thresholdDecision.route !== "auto_rework") {
      return persistResolvedHumanRoute({
        finalizeInput: input,
        runResultForRouting: parity.runResultForRouting,
        budgetAvailable: parity.budgetAvailable,
        parityMetadata: thresholdDecision.parityMetadata,
        forceStickyHumanGateBypass: false,
        thresholdMetadata: thresholdDecision.thresholdMetadata,
        fallbackReason: thresholdDecision.fallbackReason
      });
    }
    return dispatchAutoRework({
      finalizeInput: input,
      runResultForRouting: parity.runResultForRouting,
      parityMetadata: thresholdDecision.parityMetadata,
      persistDispatchFailedHumanRoute: (dispatchInput) =>
        persistDispatchFailedHumanRoute({
          finalizeInput: input,
          ...dispatchInput
        })
    });
  }

  // Rework + available budget is fully handled by the threshold-aware branch above,
  // so this fallback can only persist approve / inconclusive / budget-exhausted outcomes.
  return persistResolvedHumanRoute({
    finalizeInput: input,
    runResultForRouting: parity.runResultForRouting,
    budgetAvailable: parity.budgetAvailable,
    parityMetadata: parity.parityMetadata,
    forceStickyHumanGateBypass: false
  });
}
