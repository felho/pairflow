import type { ProtocolEnvelope } from "../../../types/protocol.js";
import { isHumanApprovalRequest } from "./approvalTranscriptContext.js";

export interface PendingApprovalSignal {
  envelopeId: string;
  ts: string;
  round: number;
  sender: string;
  summary: string;
  refs: string[];
}

export interface ResolveCanonicalPendingApprovalSignalInput {
  round: number;
  envelopes: ProtocolEnvelope[];
}

function deriveApprovalSummary(payload: Record<string, unknown>): string {
  const value = payload.summary;
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : "(missing approval summary)";
}

export function resolveLatestPendingApprovalRequest(
  envelopes: ProtocolEnvelope[],
  round: number
): PendingApprovalSignal | undefined {
  for (let index = envelopes.length - 1; index >= 0; index -= 1) {
    const envelope = envelopes[index]!;
    if (envelope.round !== round) {
      continue;
    }

    if (envelope.type === "APPROVAL_DECISION") {
      return undefined;
    }

    if (isHumanApprovalRequest(envelope)) {
      return {
        envelopeId: envelope.id,
        ts: envelope.ts,
        round: envelope.round,
        sender: envelope.sender,
        summary: deriveApprovalSummary(
          envelope.payload as unknown as Record<string, unknown>
        ),
        refs: envelope.refs
      };
    }
  }

  return undefined;
}

export function resolveCanonicalPendingApprovalSignal(
  input: ResolveCanonicalPendingApprovalSignalInput
): PendingApprovalSignal | undefined {
  return resolveLatestPendingApprovalRequest(input.envelopes, input.round);
}
