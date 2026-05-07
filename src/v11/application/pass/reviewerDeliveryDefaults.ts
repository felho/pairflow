import { basename, dirname, join } from "node:path";

import type {
  EmitDeliveryNotificationAckPort,
  ResolveDeliveryMessageRefInput,
  ResolveDeliveryMessageRefPort
} from "../../shared/ports/tmuxDelivery.js";
import type { RefreshReviewerContextPort } from "../../shared/ports/reviewerContext.js";
import type {
  ReadReviewerBriefArtifactPort,
  ReadReviewerFocusArtifactPort
} from "../../shared/ports/reviewerArtifacts.js";
import type {
  ResolveReviewerTestExecutionDirectiveFromArtifactPort,
  VerifyImplementerTestEvidencePort,
  WriteReviewerTestEvidenceArtifactPort
} from "../../shared/ports/reviewerTestEvidenceArtifacts.js";

interface ReviewerDeliveryDefaultsModule {
  reviewerDeliveryDefaults: {
    emitDeliveryNotificationAck: EmitDeliveryNotificationAckPort;
    readReviewerBriefArtifact: ReadReviewerBriefArtifactPort;
    readReviewerFocusArtifact: ReadReviewerFocusArtifactPort;
    resolveReviewerTestExecutionDirectiveFromArtifact:
      ResolveReviewerTestExecutionDirectiveFromArtifactPort;
    refreshReviewerContext: RefreshReviewerContextPort;
    verifyImplementerTestEvidence: VerifyImplementerTestEvidencePort;
    writeReviewerTestEvidenceArtifact: WriteReviewerTestEvidenceArtifactPort;
  };
}

let reviewerDeliveryDefaultsPromise:
  | Promise<{
      emitDeliveryNotificationAck: EmitDeliveryNotificationAckPort;
      readReviewerBriefArtifact: ReadReviewerBriefArtifactPort;
      readReviewerFocusArtifact: ReadReviewerFocusArtifactPort;
      resolveReviewerTestExecutionDirectiveFromArtifact:
        ResolveReviewerTestExecutionDirectiveFromArtifactPort;
      refreshReviewerContext: RefreshReviewerContextPort;
      verifyImplementerTestEvidence: VerifyImplementerTestEvidencePort;
      writeReviewerTestEvidenceArtifact: WriteReviewerTestEvidenceArtifactPort;
    }>
  | undefined;

function getReviewerDeliveryDefaultsModulePath(): string {
  return "../../defaults/reviewer/reviewerDeliveryDefaults.js";
}

async function loadReviewerDeliveryDefaults(): Promise<{
  emitDeliveryNotificationAck: EmitDeliveryNotificationAckPort;
  readReviewerBriefArtifact: ReadReviewerBriefArtifactPort;
  readReviewerFocusArtifact: ReadReviewerFocusArtifactPort;
  resolveReviewerTestExecutionDirectiveFromArtifact:
    ResolveReviewerTestExecutionDirectiveFromArtifactPort;
  refreshReviewerContext: RefreshReviewerContextPort;
  verifyImplementerTestEvidence: VerifyImplementerTestEvidencePort;
  writeReviewerTestEvidenceArtifact: WriteReviewerTestEvidenceArtifactPort;
}> {
  reviewerDeliveryDefaultsPromise ??= import(
    getReviewerDeliveryDefaultsModulePath()
  ).then(
    (module) =>
      (module as ReviewerDeliveryDefaultsModule).reviewerDeliveryDefaults
  );
  return reviewerDeliveryDefaultsPromise;
}

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

export async function emitDeliveryNotificationAck(
  ...args: Parameters<EmitDeliveryNotificationAckPort>
): Promise<Awaited<ReturnType<EmitDeliveryNotificationAckPort>>> {
  const defaults = await loadReviewerDeliveryDefaults();
  return defaults.emitDeliveryNotificationAck(...args);
}

export async function refreshReviewerContext(
  ...args: Parameters<RefreshReviewerContextPort>
): Promise<Awaited<ReturnType<RefreshReviewerContextPort>>> {
  const defaults = await loadReviewerDeliveryDefaults();
  return defaults.refreshReviewerContext(...args);
}

export async function readReviewerBriefArtifact(
  ...args: Parameters<ReadReviewerBriefArtifactPort>
): Promise<Awaited<ReturnType<ReadReviewerBriefArtifactPort>>> {
  const defaults = await loadReviewerDeliveryDefaults();
  return defaults.readReviewerBriefArtifact(...args);
}

export async function readReviewerFocusArtifact(
  ...args: Parameters<ReadReviewerFocusArtifactPort>
): Promise<Awaited<ReturnType<ReadReviewerFocusArtifactPort>>> {
  const defaults = await loadReviewerDeliveryDefaults();
  return defaults.readReviewerFocusArtifact(...args);
}

export async function resolveReviewerTestExecutionDirectiveFromArtifact(
  ...args: Parameters<ResolveReviewerTestExecutionDirectiveFromArtifactPort>
): Promise<
  Awaited<ReturnType<ResolveReviewerTestExecutionDirectiveFromArtifactPort>>
> {
  const defaults = await loadReviewerDeliveryDefaults();
  return defaults.resolveReviewerTestExecutionDirectiveFromArtifact(...args);
}

export async function verifyImplementerTestEvidence(
  ...args: Parameters<VerifyImplementerTestEvidencePort>
): Promise<Awaited<ReturnType<VerifyImplementerTestEvidencePort>>> {
  const defaults = await loadReviewerDeliveryDefaults();
  return defaults.verifyImplementerTestEvidence(...args);
}

export async function writeReviewerTestEvidenceArtifact(
  ...args: Parameters<WriteReviewerTestEvidenceArtifactPort>
): Promise<Awaited<ReturnType<WriteReviewerTestEvidenceArtifactPort>>> {
  const defaults = await loadReviewerDeliveryDefaults();
  return defaults.writeReviewerTestEvidenceArtifact(...args);
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
