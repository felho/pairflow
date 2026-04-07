import { isRecord } from "../validation/primitives.js";
import { readTranscriptEnvelopes } from "../../../core/protocol/transcriptStore.js";
import {
  type ProtocolEnvelope
} from "../../../types/protocol.js";
import {
  deriveFindingsOpenSplit,
  resolveAdvisoryFindingsFromFindings,
  type MetaReviewGateAdvisoryFinding
} from "./metaReviewGateFindingsSplit.js";

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

export interface LatestSameRoundReviewerSnapshot {
  envelopeId: string;
  round: number;
  findings_blocking_open_total: number | null;
  findings_advisory_open_total: number | null;
  findings_open_total: number | null;
  advisoryFindings: MetaReviewGateAdvisoryFinding[] | undefined;
}

export function resolveReviewerSnapshotMetadataAdvisoryOpenTotal(
  envelope: ProtocolEnvelope
): number | null {
  if (!isRecord(envelope.payload.metadata)) {
    return null;
  }
  const advisoryOpenTotal = envelope.payload.metadata.advisory_findings_open_total;
  return isNonNegativeInteger(advisoryOpenTotal) ? advisoryOpenTotal : null;
}

export function isReviewerSnapshotEnvelope(envelope: ProtocolEnvelope): boolean {
  return (
    envelope.type === "CONVERGENCE" &&
    envelope.recipient === "orchestrator"
  );
}

export function resolveSameRoundReviewerSnapshotFromEnvelope(
  envelope: ProtocolEnvelope
): LatestSameRoundReviewerSnapshot | null {
  if (!isReviewerSnapshotEnvelope(envelope)) {
    return null;
  }

  const advisoryFindings = resolveAdvisoryFindingsFromFindings(
    envelope.payload.findings
  );
  const derivedSplit = deriveFindingsOpenSplit(envelope.payload.findings);
  const metadataAdvisoryOpenTotal =
    resolveReviewerSnapshotMetadataAdvisoryOpenTotal(envelope);
  const advisoryOpenTotal =
    metadataAdvisoryOpenTotal ?? derivedSplit?.advisoryOpenTotal ?? null;
  const blockingOpenTotal =
    derivedSplit?.blockingOpenTotal ??
    (metadataAdvisoryOpenTotal !== null ? 0 : null);
  const openFindingsTotal =
    advisoryOpenTotal !== null || blockingOpenTotal !== null
      ? (advisoryOpenTotal ?? 0) + (blockingOpenTotal ?? 0)
      : null;

  return {
    envelopeId: envelope.id,
    round: envelope.round,
    findings_blocking_open_total: blockingOpenTotal,
    findings_advisory_open_total: advisoryOpenTotal,
    findings_open_total: openFindingsTotal,
    advisoryFindings
  };
}

export function resolveLatestSameRoundReviewerSnapshot(
  transcript: readonly ProtocolEnvelope[],
  round: number
): LatestSameRoundReviewerSnapshot | undefined {
  for (let index = transcript.length - 1; index >= 0; index -= 1) {
    const envelope = transcript[index];
    if (envelope === undefined || envelope.round !== round) {
      continue;
    }
    const snapshot = resolveSameRoundReviewerSnapshotFromEnvelope(envelope);
    if (snapshot !== null) {
      return snapshot;
    }
  }
  return undefined;
}

export async function readLatestSameRoundReviewerSnapshotFromTranscript(
  transcriptPath: string,
  round: number,
  dependencies: {
    readTranscriptEnvelopes?: typeof readTranscriptEnvelopes;
  } = {}
): Promise<LatestSameRoundReviewerSnapshot | undefined> {
  const readTranscript =
    dependencies.readTranscriptEnvelopes ?? readTranscriptEnvelopes;
  const transcript = await readTranscript(transcriptPath, {
    allowMissing: true
  });
  return resolveLatestSameRoundReviewerSnapshot(transcript, round);
}
