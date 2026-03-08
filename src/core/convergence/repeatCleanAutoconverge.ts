import type { AgentName, AgentRole } from "../../types/bubble.js";
import { isPassIntent, type PassIntent, type ProtocolEnvelope } from "../../types/protocol.js";

export const repeatCleanAutoconvergeTriggeredReasonCode =
  "REPEAT_CLEAN_AUTOCONVERGE_TRIGGERED";
export const repeatCleanAutoconvergePolicyRejectedReasonCode =
  "REPEAT_CLEAN_AUTOCONVERGE_POLICY_REJECTED";
export const repeatCleanRound1DisabledReasonCode = "AUTOCONVERGE_ROUND1_DISABLED";
export const repeatCleanInputIncompleteReasonCode =
  "REPEAT_CLEAN_TRIGGER_INPUT_INCOMPLETE";
export const repeatCleanPreviousMissingReasonCode =
  "PREVIOUS_REVIEWER_CLEAN_PASS_MISSING";
export const repeatCleanPreviousNotCleanReasonCode =
  "PREVIOUS_REVIEWER_PASS_NOT_CLEAN";
export const repeatCleanTriggerNotMetReasonCode =
  "REPEAT_CLEAN_TRIGGER_NOT_MET";

export type RepeatCleanAutoconvergeReasonCode =
  | typeof repeatCleanAutoconvergeTriggeredReasonCode
  | typeof repeatCleanAutoconvergePolicyRejectedReasonCode
  | typeof repeatCleanRound1DisabledReasonCode
  | typeof repeatCleanInputIncompleteReasonCode
  | typeof repeatCleanPreviousMissingReasonCode
  | typeof repeatCleanPreviousNotCleanReasonCode
  | typeof repeatCleanTriggerNotMetReasonCode;

export type RepeatCleanAutoconvergeReasonDetail =
  | "base_precondition_not_met"
  | "round_gate_disabled"
  | "previous_reviewer_pass_absent"
  | "previous_reviewer_pass_incomplete"
  | "previous_reviewer_pass_not_clean"
  | "previous_reviewer_pass_clean";

export interface RepeatCleanAutoconvergeTriggerInput {
  activeRole: AgentRole;
  passIntent: PassIntent;
  hasFindings: boolean;
  round: number;
  reviewer: AgentName;
  implementer: AgentName;
  transcript: ProtocolEnvelope[];
}

export interface RepeatCleanAutoconvergeTriggerResult {
  trigger: boolean;
  reasonCode: RepeatCleanAutoconvergeReasonCode;
  reasonDetail: RepeatCleanAutoconvergeReasonDetail;
  mostRecentPreviousReviewerCleanPassEnvelope: boolean;
}

function resolveMostRecentPreviousReviewerPass(input: {
  transcript: ProtocolEnvelope[];
  reviewer: AgentName;
  implementer: AgentName;
  currentRound: number;
}): ProtocolEnvelope | undefined {
  for (let index = input.transcript.length - 1; index >= 0; index -= 1) {
    const envelope = input.transcript[index];
    if (
      envelope?.type === "PASS"
      && envelope.sender === input.reviewer
      && envelope.recipient === input.implementer
      && envelope.round < input.currentRound
    ) {
      return envelope;
    }
  }
  return undefined;
}

function isBaseTriggerGateSatisfied(input: {
  activeRole: AgentRole;
  passIntent: PassIntent;
  hasFindings: boolean;
}): boolean {
  return input.activeRole === "reviewer"
    && input.passIntent === "review"
    && !input.hasFindings;
}

export function evaluateRepeatCleanAutoconvergeTrigger(
  input: RepeatCleanAutoconvergeTriggerInput
): RepeatCleanAutoconvergeTriggerResult {
  if (!isBaseTriggerGateSatisfied(input)) {
    return {
      trigger: false,
      reasonCode: repeatCleanTriggerNotMetReasonCode,
      reasonDetail: "base_precondition_not_met",
      mostRecentPreviousReviewerCleanPassEnvelope: false
    };
  }

  if (input.round <= 1) {
    return {
      trigger: false,
      reasonCode: repeatCleanRound1DisabledReasonCode,
      reasonDetail: "round_gate_disabled",
      mostRecentPreviousReviewerCleanPassEnvelope: false
    };
  }

  const candidate = resolveMostRecentPreviousReviewerPass({
    transcript: input.transcript,
    reviewer: input.reviewer,
    implementer: input.implementer,
    currentRound: input.round
  });

  if (candidate === undefined) {
    return {
      trigger: false,
      reasonCode: repeatCleanPreviousMissingReasonCode,
      reasonDetail: "previous_reviewer_pass_absent",
      mostRecentPreviousReviewerCleanPassEnvelope: false
    };
  }

  const candidateIntent = candidate.payload.pass_intent;
  const candidateFindings = candidate.payload.findings;
  if (!isPassIntent(candidateIntent) || !Array.isArray(candidateFindings)) {
    return {
      trigger: false,
      reasonCode: repeatCleanInputIncompleteReasonCode,
      reasonDetail: "previous_reviewer_pass_incomplete",
      mostRecentPreviousReviewerCleanPassEnvelope: false
    };
  }

  if (candidateIntent === "review" && candidateFindings.length === 0) {
    return {
      trigger: true,
      reasonCode: repeatCleanAutoconvergeTriggeredReasonCode,
      reasonDetail: "previous_reviewer_pass_clean",
      mostRecentPreviousReviewerCleanPassEnvelope: true
    };
  }

  return {
    trigger: false,
    reasonCode: repeatCleanPreviousNotCleanReasonCode,
    reasonDetail: "previous_reviewer_pass_not_clean",
    mostRecentPreviousReviewerCleanPassEnvelope: false
  };
}
