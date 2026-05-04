import type { BubbleConfig } from "../../types/bubble.js";
import type { ValidationError } from "../../v11/shared/validation/primitives.js";
import { isIsoTimestamp } from "../../v11/shared/validation/primitives.js";
import { IDEATION_METADATA_PARSE_WARNING } from "../../v11/shared/ideation/ideationReasonCodes.js";
import { describeUnknownValue, readString } from "./readers.js";

export function validateBubbleIdeation(
  ideation: Record<string, unknown> | undefined,
  errors: ValidationError[]
): BubbleConfig["ideation"] | undefined {
  const warnings: string[] = [];
  const existingParseWarning = ideation
    ? readString(
        ideation,
        "parse_warning",
        "ideation.parse_warning",
        errors,
        false
      )
    : undefined;
  const ideationModeCandidate = ideation?.mode;
  let ideationMode = false;
  if (ideationModeCandidate !== undefined) {
    if (typeof ideationModeCandidate === "boolean") {
      ideationMode = ideationModeCandidate;
    } else {
      warnings.push(
        `${IDEATION_METADATA_PARSE_WARNING}: ideation.mode must be boolean. Received ${describeUnknownValue(ideationModeCandidate)}.`
      );
    }
  }
  const ideationTaskPendingCandidate = ideation?.task_pending;
  let ideationTaskPending = false;
  if (ideationTaskPendingCandidate !== undefined) {
    if (typeof ideationTaskPendingCandidate === "boolean") {
      ideationTaskPending = ideationTaskPendingCandidate;
    } else {
      warnings.push(
        `${IDEATION_METADATA_PARSE_WARNING}: ideation.task_pending must be boolean. Received ${describeUnknownValue(ideationTaskPendingCandidate)}.`
      );
    }
  }
  const ideationStartedAtCandidate = ideation?.started_at;
  let ideationStartedAt: string | undefined;
  if (ideationStartedAtCandidate !== undefined) {
    if (isIsoTimestamp(ideationStartedAtCandidate)) {
      ideationStartedAt = ideationStartedAtCandidate;
    } else {
      warnings.push(
        `${IDEATION_METADATA_PARSE_WARNING}: ideation.started_at must be an ISO timestamp. Received ${describeUnknownValue(ideationStartedAtCandidate)}.`
      );
    }
  }
  const ideationKickedOffAtCandidate = ideation?.kicked_off_at;
  let ideationKickedOffAt: string | undefined;
  if (ideationKickedOffAtCandidate !== undefined) {
    if (isIsoTimestamp(ideationKickedOffAtCandidate)) {
      ideationKickedOffAt = ideationKickedOffAtCandidate;
    } else {
      warnings.push(
        `${IDEATION_METADATA_PARSE_WARNING}: ideation.kicked_off_at must be an ISO timestamp. Received ${describeUnknownValue(ideationKickedOffAtCandidate)}.`
      );
    }
  }
  if (!ideationMode && ideationTaskPending) {
    warnings.push(
      `${IDEATION_METADATA_PARSE_WARNING}: ideation.task_pending=true is invalid when ideation.mode=false; normalized to false.`
    );
    ideationTaskPending = false;
  }

  return ideationMode ||
    ideationTaskPending ||
    ideationStartedAt !== undefined ||
    ideationKickedOffAt !== undefined ||
    existingParseWarning !== undefined ||
    warnings.length > 0
    ? {
        mode: ideationMode,
        task_pending: ideationTaskPending,
        ...(ideationStartedAt !== undefined
          ? { started_at: ideationStartedAt }
          : {}),
        ...(ideationKickedOffAt !== undefined
          ? { kicked_off_at: ideationKickedOffAt }
          : {}),
        ...((existingParseWarning !== undefined || warnings.length > 0)
          ? {
              parse_warning: [
                existingParseWarning,
                ...(warnings.length > 0
                  ? [warnings.join(" ")]
                  : [])
              ]
                .filter((entry): entry is string => entry !== undefined)
                .join(" ")
            }
          : {})
      }
    : undefined;
}
