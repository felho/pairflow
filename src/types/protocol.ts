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
// Transitional compatibility surface. Protocol envelope ownership lives in
// v11/shared/protocol; keep these exports until legacy protocol imports are
// migrated.
export type {
  ProtocolEnvelope,
  ProtocolEnvelopeDraft,
  ProtocolEnvelopePayload
} from "../v11/shared/protocol/protocolEnvelopeContract.js";

export {
  isLegacyMetaReviewerProtocolRecipient,
  legacyMetaReviewerProtocolRecipient
} from "../v11/shared/protocol/legacyMetaReviewerRecipientContract.js";
export type {
  LegacyMetaReviewerProtocolRecipient
} from "../v11/shared/protocol/legacyMetaReviewerRecipientContract.js";
