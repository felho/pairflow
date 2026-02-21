import type { Finding } from "./findings.js";

export const protocolParticipants = [
  "codex",
  "claude",
  "orchestrator",
  "human"
] as const;

export type ProtocolParticipant = (typeof protocolParticipants)[number];

export const protocolMessageTypes = [
  "TASK",
  "PASS",
  "HUMAN_QUESTION",
  "HUMAN_REPLY",
  "CONVERGENCE",
  "APPROVAL_REQUEST",
  "APPROVAL_DECISION",
  "DONE_PACKAGE"
] as const;

export type ProtocolMessageType = (typeof protocolMessageTypes)[number];

export const passIntents = ["task", "review", "fix_request"] as const;

export type PassIntent = (typeof passIntents)[number];

export const approvalDecisions = ["approve", "reject", "revise"] as const;

export type ApprovalDecision = (typeof approvalDecisions)[number];

export interface ProtocolEnvelopePayload {
  summary?: string;
  question?: string;
  message?: string;
  decision?: ApprovalDecision;
  pass_intent?: PassIntent;
  findings?: Finding[];
  metadata?: Record<string, unknown>;
}

export interface ProtocolEnvelope {
  id: string;
  ts: string;
  bubble_id: string;
  sender: ProtocolParticipant;
  recipient: ProtocolParticipant;
  type: ProtocolMessageType;
  round: number;
  payload: ProtocolEnvelopePayload;
  refs: string[];
}

export function isProtocolParticipant(
  value: unknown
): value is ProtocolParticipant {
  return (
    typeof value === "string" &&
    (protocolParticipants as readonly string[]).includes(value)
  );
}

export function isProtocolMessageType(
  value: unknown
): value is ProtocolMessageType {
  return (
    typeof value === "string" &&
    (protocolMessageTypes as readonly string[]).includes(value)
  );
}

export function isPassIntent(value: unknown): value is PassIntent {
  return (
    typeof value === "string" &&
    (passIntents as readonly string[]).includes(value)
  );
}

export function isApprovalDecision(value: unknown): value is ApprovalDecision {
  return (
    typeof value === "string" &&
    (approvalDecisions as readonly string[]).includes(value)
  );
}
