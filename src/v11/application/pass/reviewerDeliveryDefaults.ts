import { basename, dirname, join } from "node:path";

import type {
  DeliveryAck,
  EmitDeliveryNotificationAckPort,
  ResolveDeliveryMessageRefInput,
  ResolveDeliveryMessageRefPort
} from "../../ports/tmuxDelivery.js";
import type { RefreshReviewerContextPort } from "../../ports/reviewerContext.js";
import type {
  ReadReviewerBriefArtifactPort,
  ReadReviewerFocusArtifactPort
} from "../../ports/reviewerArtifacts.js";
import type {
  ResolveReviewerTestExecutionDirectiveFromArtifactPort,
  VerifyImplementerTestEvidencePort,
  WriteReviewerTestEvidenceArtifactPort
} from "../../ports/reviewerTestEvidenceArtifacts.js";

function buildTranscriptFallbackRef(
  bubbleId: string,
  sessionsPath: string,
  messageId: string
): string {
  const pairflowDir = resolvePairflowDirFromSessionsPath(sessionsPath);
  const transcriptPath = join(pairflowDir, "bubbles", bubbleId, "transcript.ndjson");
  return `${transcriptPath}#${messageId}`;
}

function resolvePairflowDirFromSessionsPath(sessionsPath: string): string {
  const match = /^(.*[\\/]\.pairflow)(?:[\\/]|$)/u.exec(sessionsPath);
  if (match?.[1] !== undefined) {
    return match[1];
  }
  const runtimeDir = dirname(sessionsPath);
  if (basename(runtimeDir) === "runtime") {
    return join(dirname(runtimeDir), ".pairflow");
  }
  return join(runtimeDir, ".pairflow");
}

export function resolveDeliveryMessageRef(
  input: ResolveDeliveryMessageRefInput
): string {
  return (
    input.messageRef ??
    input.envelope.refs[0] ??
    buildTranscriptFallbackRef(input.bubbleId, input.sessionsPath, input.envelope.id)
  );
}

export function emitDeliveryNotificationAck(
  input: Parameters<EmitDeliveryNotificationAckPort>[0]
): Promise<DeliveryAck> {
  return Promise.resolve({
    status: "rejected",
    reason: "no_runtime_session",
    reason_code: "DELIVERY_ACK_RUNTIME_SESSION_UNAVAILABLE",
    message:
      `No reviewer delivery runtime dependency was provided for ${input.bubbleId}.`
  });
}

export function refreshReviewerContext(): Promise<
  Awaited<ReturnType<RefreshReviewerContextPort>>
> {
  return Promise.resolve({
    refreshed: false,
    reason: "no_runtime_session"
  });
}

export function readReviewerBriefArtifact(): Promise<
  Awaited<ReturnType<ReadReviewerBriefArtifactPort>>
> {
  return Promise.resolve(undefined);
}

export function readReviewerFocusArtifact(): Promise<
  Awaited<ReturnType<ReadReviewerFocusArtifactPort>>
> {
  return Promise.resolve(undefined);
}

export function resolveReviewerTestExecutionDirectiveFromArtifact(): Promise<
  Awaited<ReturnType<ResolveReviewerTestExecutionDirectiveFromArtifactPort>>
> {
  return Promise.reject(
    new Error(
      "REVIEWER_TEST_DIRECTIVE_DEPENDENCY_MISSING: reviewer test directive resolver dependency was not provided."
    )
  );
}

export function verifyImplementerTestEvidence(): Promise<
  Awaited<ReturnType<VerifyImplementerTestEvidencePort>>
> {
  return Promise.reject(
    new Error(
      "REVIEWER_TEST_EVIDENCE_DEPENDENCY_MISSING: reviewer test evidence verifier dependency was not provided."
    )
  );
}

export function writeReviewerTestEvidenceArtifact(): Promise<
  Awaited<ReturnType<WriteReviewerTestEvidenceArtifactPort>>
> {
  return Promise.resolve(undefined);
}

export const reviewerDeliveryDefaults = {
  emitDeliveryNotificationAck,
  readReviewerBriefArtifact,
  readReviewerFocusArtifact,
  resolveReviewerTestExecutionDirectiveFromArtifact,
  refreshReviewerContext,
  resolveDeliveryMessageRef,
  verifyImplementerTestEvidence,
  writeReviewerTestEvidenceArtifact
} as const satisfies {
  emitDeliveryNotificationAck: EmitDeliveryNotificationAckPort;
  readReviewerBriefArtifact: ReadReviewerBriefArtifactPort;
  readReviewerFocusArtifact: ReadReviewerFocusArtifactPort;
  resolveReviewerTestExecutionDirectiveFromArtifact:
    ResolveReviewerTestExecutionDirectiveFromArtifactPort;
  refreshReviewerContext: RefreshReviewerContextPort;
  resolveDeliveryMessageRef: ResolveDeliveryMessageRefPort;
  verifyImplementerTestEvidence: VerifyImplementerTestEvidencePort;
  writeReviewerTestEvidenceArtifact: WriteReviewerTestEvidenceArtifactPort;
};
