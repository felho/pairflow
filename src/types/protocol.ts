import type {
  AgentRole
} from "../contracts/kernel/agentIdentity.js";
import type {
  ApprovalDecision,
  FindingsClaimSource,
  FindingsClaimState,
  PassIntent,
  ProtocolMessageType,
  ProtocolParticipant
} from "../contracts/kernel/protocol.js";
import type {
  MetaReviewRecommendation
} from "../v11/shared/metaReview/metaReviewTypes.js";
import type {
  FindingsParityMetadata
} from "../v11/shared/metaReviewGate/findingsParityMetadataContract.js";
import type { Finding } from "./findings.js";

// Transitional compatibility surface. Findings parity ownership lives in
// v11/shared/metaReviewGate; keep these exports until legacy protocol imports
// have been migrated.
export {
  findingsParityStatuses,
  hasApproveFindingsSplitMetadata,
  resolveFindingsParityMetadataForEnvelope
} from "../v11/shared/metaReviewGate/findingsParityMetadataContract.js";
export type {
  ApproveFindingsSplitMetadata,
  FindingsParityMetadata,
  FindingsParityStatus
} from "../v11/shared/metaReviewGate/findingsParityMetadataContract.js";

export const legacyMetaReviewerProtocolRecipient = "meta-reviewer" as const;
export type LegacyMetaReviewerProtocolRecipient =
  typeof legacyMetaReviewerProtocolRecipient;

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
  metadata?: Record<string, unknown> & FindingsParityMetadata;
}

export interface ProtocolEnvelopeDraft {
  bubble_id: string;
  sender: ProtocolParticipant;
  recipient: ProtocolParticipant;
  type: ProtocolMessageType;
  round: number;
  payload: ProtocolEnvelopePayload;
  refs: string[];
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
  rework_target_message?: string | null;
  report_json: Record<string, unknown>;
}

// New ActorOutputKind values are successor-owned, not local widenings.
// If a future change needs a new output kind, activate the deferred `O3-T5`
// slice from:
// - plans/actor-runtime-interface-post-phaseE-successor-plan-v1.md
// - docs/actor-runtime-interface/onboarding-extension-surface-contract-note-v1.md
export const actorOutputKinds = [
  "pass",
  "human_question",
  "convergence",
  "meta_review_result"
] as const;

export type ActorOutputKind = (typeof actorOutputKinds)[number];

export interface ActorEmitBaseInput {
  kind: ActorOutputKind;
  repo: string;
  bubble_id: string;
  handoff_id: string;
  execution_id: string;
  refs?: string[];
  expected_role?: AgentRole;
  expected_round?: number;
  expected_state_fingerprint?: string;
}

export interface PassActorEmitInput extends ActorEmitBaseInput {
  kind: "pass";
  summary: string;
  intent?: PassIntent;
  findings?: Finding[];
  no_findings?: boolean;
}

export interface HumanQuestionActorEmitInput extends ActorEmitBaseInput {
  kind: "human_question";
  question: string;
}

export interface ConvergenceActorEmitInput extends ActorEmitBaseInput {
  kind: "convergence";
  summary: string;
  findings?: Array<{
    severity: "P2" | "P3";
    title: string;
    refs?: string[];
  }>;
}

export interface MetaReviewResultActorEmitInput extends ActorEmitBaseInput {
  kind: "meta_review_result";
  round: number;
  recommendation: MetaReviewRecommendation;
  summary: string;
  rework_target_message?: string | null;
  report_json: Record<string, unknown>;
}

export type ActorEmitInput =
  | PassActorEmitInput
  | HumanQuestionActorEmitInput
  | ConvergenceActorEmitInput
  | MetaReviewResultActorEmitInput;

export function isLegacyMetaReviewerProtocolRecipient(
  value: unknown
): value is LegacyMetaReviewerProtocolRecipient {
  return value === legacyMetaReviewerProtocolRecipient;
}

export function isDeliveryTargetRole(value: unknown): value is DeliveryTargetRole {
  return (
    typeof value === "string" &&
    (deliveryTargetRoles as readonly string[]).includes(value)
  );
}

export function isActorOutputKind(value: unknown): value is ActorOutputKind {
  return (
    typeof value === "string"
    && (actorOutputKinds as readonly string[]).includes(value)
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
