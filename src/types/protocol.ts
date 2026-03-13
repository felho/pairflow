import type { MetaReviewRecommendation } from "./bubble.js";
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

export const approvalDecisions = ["approve", "reject", "revise"] as const;

export type ApprovalDecision = (typeof approvalDecisions)[number];

export const deliveryTargetRoles = [
  "implementer",
  "reviewer",
  "meta_reviewer",
  "status"
] as const;

export type DeliveryTargetRole = (typeof deliveryTargetRoles)[number];

export const deliveryTargetRoleMetadataKey = "delivery_target_role" as const;

export type DeliveryTargetRoleMetadataParseResult =
  | {
      status: "absent";
    }
  | {
      status: "invalid";
      value: unknown;
    }
  | {
      status: "valid";
      role: DeliveryTargetRole;
    };

export interface ProtocolEnvelopePayload {
  summary?: string;
  question?: string;
  message?: string;
  decision?: ApprovalDecision;
  pass_intent?: PassIntent;
  findings_claim_state?: FindingsClaimState;
  findings_claim_source?: FindingsClaimSource;
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

export interface MetaReviewSubmissionPayload {
  bubble_id: string;
  round: number;
  recommendation: MetaReviewRecommendation;
  summary: string;
  report_markdown: string;
  rework_target_message?: string | null;
  report_json?: Record<string, unknown>;
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

export function isFindingsClaimState(value: unknown): value is FindingsClaimState {
  return (
    typeof value === "string"
    && (findingsClaimStates as readonly string[]).includes(value)
  );
}

export function isFindingsClaimSource(
  value: unknown
): value is FindingsClaimSource {
  return (
    typeof value === "string"
    && (findingsClaimSources as readonly string[]).includes(value)
  );
}

export function isApprovalDecision(value: unknown): value is ApprovalDecision {
  return (
    typeof value === "string" &&
    (approvalDecisions as readonly string[]).includes(value)
  );
}

export function isDeliveryTargetRole(value: unknown): value is DeliveryTargetRole {
  return (
    typeof value === "string" &&
    (deliveryTargetRoles as readonly string[]).includes(value)
  );
}

export function parseDeliveryTargetRoleMetadata(
  metadata: unknown
): DeliveryTargetRoleMetadataParseResult {
  if (typeof metadata !== "object" || metadata === null) {
    return { status: "absent" };
  }
  const value =
    (metadata as Record<string, unknown>)[deliveryTargetRoleMetadataKey];
  if (value === undefined) {
    return { status: "absent" };
  }
  if (isDeliveryTargetRole(value)) {
    return {
      status: "valid",
      role: value
    };
  }
  return {
    status: "invalid",
    value
  };
}
