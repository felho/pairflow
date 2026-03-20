import type { readFile } from "node:fs/promises";

import type { appendProtocolEnvelope, AppendProtocolEnvelopeResult } from "../../../core/protocol/transcriptStore.js";
import {
  type LoadedStateSnapshot,
  type writeStateSnapshot
} from "../../../core/state/stateStore.js";
import type { resolveBubbleById } from "../../../core/bubble/bubbleLookup.js";
import { deliveryTargetRoleMetadataKey } from "../../../types/protocol.js";
import { readMetaReviewReportJsonArtifact, resolveFindingsParityMetadataFromReportJson } from "./metaReviewGateFindingsMetadata.js";
import { toMetaReviewGateError } from "./metaReviewGateErrorConversion.js";
export { resolveMetaReviewerPaneWarning } from "./metaReviewGatePaneBinding.js";
import { restoreRunningAfterStagedReadyFailure } from "./metaReviewGateStateStaging.js";
export {
  restoreRunningAfterStagedReadyFailure,
  stageMetaReviewRunningState,
  stageReadyForApprovalState
} from "./metaReviewGateStateStaging.js";
import {
  buildHumanGateSummary,
  metaReviewGateRollbackAppliedReasonCode,
  metaReviewerAgent,
  persistHumanGateRoute
} from "./metaReviewGateShared.js";
import type {
  MetaReviewGateResult
} from "./metaReviewGateTypes.js";

export async function appendMetaReviewKickoffEnvelope(input: {
  appendEnvelope: typeof appendProtocolEnvelope;
  transcriptPath: string;
  inboxPath: string;
  lockPath: string;
  now: Date;
  bubbleId: string;
  round: number;
  refs: string[];
}): Promise<AppendProtocolEnvelopeResult> {
  const kickoffSummary = [
    `Meta-review gate opened for bubble ${input.bubbleId} round ${input.round}.`,
    "Submit result through structured CLI:",
    `pairflow bubble meta-review submit --id ${input.bubbleId} --round ${input.round} --recommendation <approve|rework|inconclusive> --summary "<summary>" --report-markdown "<markdown>" [--rework-target-message "<message>"] [--report-json '{"findings_claim_state":"clean|open_findings|unknown","findings_claim_source":"meta_review_artifact","findings_count":<int>,"findings_artifact_ref":"artifacts/...","meta_review_run_id":"<run-id>","findings_digest_sha256":"<sha256>","findings_artifact_status":"available"}'].`
  ].join(" ");

  return input.appendEnvelope({
    transcriptPath: input.transcriptPath,
    mirrorPaths: [input.inboxPath],
    lockPath: input.lockPath,
    now: input.now,
    envelope: {
      bubble_id: input.bubbleId,
      sender: "orchestrator",
      recipient: metaReviewerAgent,
      type: "TASK",
      round: input.round,
      payload: {
        summary: kickoffSummary,
        metadata: {
          [deliveryTargetRoleMetadataKey]: "meta_reviewer",
          actor: "meta-review-gate",
          actor_agent: "orchestrator",
          lifecycle_state: "META_REVIEW_RUNNING"
        }
      },
      refs: input.refs
    }
  });
}

export async function persistMetaReviewRunFailedRoute(input: {
  appendEnvelope: typeof appendProtocolEnvelope;
  writeState: typeof writeStateSnapshot;
  statePath: string;
  transcriptPath: string;
  inboxPath: string;
  lockPath: string;
  now: Date;
  nowIso: string;
  bubbleId: string;
  convergenceSummary: string;
  fallbackReason: string;
  refs: string[];
  loaded: LoadedStateSnapshot;
}): Promise<MetaReviewGateResult> {
  return persistHumanGateRoute({
    appendEnvelope: input.appendEnvelope,
    writeState: input.writeState,
    statePath: input.statePath,
    transcriptPath: input.transcriptPath,
    inboxPath: input.inboxPath,
    lockPath: input.lockPath,
    now: input.now,
    nowIso: input.nowIso,
    bubbleId: input.bubbleId,
    summary: buildHumanGateSummary({
      convergenceSummary: input.convergenceSummary,
      fallbackReason: input.fallbackReason
    }),
    refs: input.refs,
    loaded: input.loaded,
    expectedState: "META_REVIEW_RUNNING",
    route: "human_gate_run_failed",
    fallbackRecommendation: "inconclusive",
    targetState: "META_REVIEW_FAILED",
    stickyHumanGate: false
  });
}

export async function routeStickyHumanGateBypass(input: {
  appendEnvelope: typeof appendProtocolEnvelope;
  writeState: typeof writeStateSnapshot;
  readFileFn: typeof readFile;
  bubblePaths: Awaited<ReturnType<typeof resolveBubbleById>>["bubblePaths"];
  lockPath: string;
  now: Date;
  nowIso: string;
  bubbleId: string;
  summary: string;
  refs: string[];
  loadedRunning: LoadedStateSnapshot;
  readyForApproval: LoadedStateSnapshot;
}): Promise<MetaReviewGateResult> {
  const parityArtifactRead = await readMetaReviewReportJsonArtifact({
    artifactPath: input.bubblePaths.metaReviewLastJsonArtifactPath,
    readFileFn: input.readFileFn
  });
  try {
    return await persistHumanGateRoute({
      appendEnvelope: input.appendEnvelope,
      writeState: input.writeState,
      statePath: input.bubblePaths.statePath,
      transcriptPath: input.bubblePaths.transcriptPath,
      inboxPath: input.bubblePaths.inboxPath,
      lockPath: input.lockPath,
      now: input.now,
      nowIso: input.nowIso,
      bubbleId: input.bubbleId,
      summary: input.summary,
      refs: input.refs,
      loaded: input.readyForApproval,
      expectedState: "READY_FOR_APPROVAL",
      route: "human_gate_sticky_bypass",
      parityMetadata: resolveFindingsParityMetadataFromReportJson(
        parityArtifactRead.reportJson
      ),
      rollbackStateOnAppendFailure: input.loadedRunning.state
    });
  } catch (error) {
    const gateError = toMetaReviewGateError(error);
    if (
      gateError.diagnostics?.rollbackOutcome === "applied" &&
      gateError.diagnostics.rollbackReasonCode === metaReviewGateRollbackAppliedReasonCode
    ) {
      throw gateError;
    }
    return restoreRunningAfterStagedReadyFailure({
      rootError: gateError,
      stageReasonCode: "META_REVIEW_GATE_STICKY_BYPASS_ROUTE_FAILED",
      writeState: input.writeState,
      statePath: input.bubblePaths.statePath,
      loadedRunning: input.loadedRunning,
      readyForApproval: input.readyForApproval
    });
  }
}
