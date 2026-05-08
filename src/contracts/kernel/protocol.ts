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
  "COMMIT_RESULT"
] as const;

export type ProtocolMessageType = (typeof protocolMessageTypes)[number];

export const passIntents = ["task", "review", "fix_request"] as const;

export type PassIntent = (typeof passIntents)[number];

export const findingsClaimStates = [
  "clean",
  "open_findings",
  "unknown"
] as const;

export type FindingsClaimState = (typeof findingsClaimStates)[number];

export const findingsClaimSources = [
  "payload_flags",
  "payload_findings_count",
  "legacy_summary_parser",
  "meta_review_artifact"
] as const;

export type FindingsClaimSource = (typeof findingsClaimSources)[number];

export const approvalDecisions = ["approve", "rework"] as const;

export type ApprovalDecision = (typeof approvalDecisions)[number];

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

export function isFindingsClaimState(value: unknown): value is FindingsClaimState {
  return (
    typeof value === "string" &&
    (findingsClaimStates as readonly string[]).includes(value)
  );
}

export function isFindingsClaimSource(
  value: unknown
): value is FindingsClaimSource {
  return (
    typeof value === "string" &&
    (findingsClaimSources as readonly string[]).includes(value)
  );
}

export function isApprovalDecision(value: unknown): value is ApprovalDecision {
  return (
    typeof value === "string" &&
    (approvalDecisions as readonly string[]).includes(value)
  );
}
