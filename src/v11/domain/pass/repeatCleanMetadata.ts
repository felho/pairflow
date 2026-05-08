import type {
  RepeatCleanAutoconvergeReasonCode,
  RepeatCleanAutoconvergeReasonDetail
} from "../convergence/repeatCleanAutoconverge.js";

const repeatCleanMostRecentPreviousReviewerPassIsCleanMetadataKey =
  "most_recent_previous_reviewer_pass_is_clean";
const repeatCleanMostRecentPreviousReviewerCleanPassEnvelopeLegacyMetadataKey =
  "most_recent_previous_reviewer_clean_pass_envelope";

function readBooleanMetadataValue(
  metadata: Record<string, unknown>,
  key: string
): boolean | undefined {
  const value = metadata[key];
  return typeof value === "boolean" ? value : undefined;
}

export function resolveMostRecentPreviousReviewerPassIsCleanFromMetadata(
  metadata: Record<string, unknown> | undefined
): boolean | undefined {
  if (metadata === undefined) {
    return undefined;
  }
  const canonical = readBooleanMetadataValue(
    metadata,
    repeatCleanMostRecentPreviousReviewerPassIsCleanMetadataKey
  );
  if (canonical !== undefined) {
    return canonical;
  }
  return readBooleanMetadataValue(
    metadata,
    repeatCleanMostRecentPreviousReviewerCleanPassEnvelopeLegacyMetadataKey
  );
}

export function buildRepeatCleanPassPayloadMetadata(input: {
  transitionDecision: "normal_pass" | "auto_converge";
  reasonCode: RepeatCleanAutoconvergeReasonCode;
  reasonDetail: RepeatCleanAutoconvergeReasonDetail;
  trigger: boolean;
  mostRecentPreviousReviewerCleanPassEnvelope: boolean;
}): Record<string, unknown> {
  return {
    transition_decision: input.transitionDecision,
    reason_code: input.reasonCode,
    reason_detail: input.reasonDetail,
    trigger: input.trigger,
    [repeatCleanMostRecentPreviousReviewerPassIsCleanMetadataKey]:
      input.mostRecentPreviousReviewerCleanPassEnvelope,
    // Deprecated alias, retained for append-only transcript backward compatibility.
    [repeatCleanMostRecentPreviousReviewerCleanPassEnvelopeLegacyMetadataKey]:
      input.mostRecentPreviousReviewerCleanPassEnvelope
  };
}

export function buildRepeatCleanLifecycleMetadata(input: {
  transitionDecision: "normal_pass" | "auto_converge";
  reasonCode: RepeatCleanAutoconvergeReasonCode;
  reasonDetail: RepeatCleanAutoconvergeReasonDetail;
  trigger: boolean;
  mostRecentPreviousReviewerCleanPassEnvelope: boolean;
}): Record<string, unknown> {
  return {
    transition_decision: input.transitionDecision,
    repeat_clean_trigger: input.trigger,
    repeat_clean_reason_code: input.reasonCode,
    repeat_clean_reason_detail: input.reasonDetail,
    [repeatCleanMostRecentPreviousReviewerPassIsCleanMetadataKey]:
      input.mostRecentPreviousReviewerCleanPassEnvelope,
    // Deprecated alias, retained for metrics reader backward compatibility.
    [repeatCleanMostRecentPreviousReviewerCleanPassEnvelopeLegacyMetadataKey]:
      input.mostRecentPreviousReviewerCleanPassEnvelope
  };
}
