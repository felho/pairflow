import type {
  ApprovalDecision,
  FindingsClaimSource,
  FindingsClaimState,
  PassIntent,
  ProtocolMessageType,
  ProtocolParticipant
} from "../contracts/kernel/protocol.js";
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
// Transitional compatibility surface. Delivery targeting ownership lives in
// v11/shared/delivery; keep these exports until protocol imports are migrated.
export {
  deliveryTargetRoleMetadataKey,
  deliveryTargetRoles,
  isDeliveryTargetRole,
  parseDeliveryTargetRoleMetadata
} from "../v11/shared/delivery/deliveryTargetMetadataContract.js";
export type {
  DeliveryTargetRole,
  DeliveryTargetRoleMetadataParseResult
} from "../v11/shared/delivery/deliveryTargetMetadataContract.js";
// Transitional compatibility surface. Actor emit ownership lives in
// v11/application/actorProtocol; keep these exports until legacy protocol
// imports are migrated.
export {
  actorOutputKinds,
  isActorOutputKind
} from "../v11/application/actorProtocol/actorEmitContract.js";
export type {
  ActorEmitBaseInput,
  ActorEmitInput,
  ActorOutputKind,
  ConvergenceActorEmitInput,
  HumanQuestionActorEmitInput,
  MetaReviewResultActorEmitInput,
  PassActorEmitInput
} from "../v11/application/actorProtocol/actorEmitContract.js";
// Transitional compatibility surface. Meta-review submit ownership lives in
// v11/shared/metaReview; keep this export until legacy protocol imports are
// migrated.
export type {
  MetaReviewSubmissionPayload
} from "../v11/shared/metaReview/metaReviewSubmissionContract.js";

export const legacyMetaReviewerProtocolRecipient = "meta-reviewer" as const;
export type LegacyMetaReviewerProtocolRecipient =
  typeof legacyMetaReviewerProtocolRecipient;

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

export function isLegacyMetaReviewerProtocolRecipient(
  value: unknown
): value is LegacyMetaReviewerProtocolRecipient {
  return value === legacyMetaReviewerProtocolRecipient;
}
