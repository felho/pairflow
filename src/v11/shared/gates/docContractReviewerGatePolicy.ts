import type { BubbleFailingGate } from "../../../types/bubble.js";
import type {
  Finding,
  FindingLayer,
  FindingPriority,
  FindingTiming
} from "../../../types/findings.js";
import { createGateWarning } from "./docContractReviewerGateWarnings.js";

export interface ReviewerFindingPolicyOutcome {
  warnings: BubbleFailingGate[];
  effectivePriority: FindingPriority;
  effectiveTiming: FindingTiming;
  roundGateViolated: boolean;
}

export function collectMissingRequiredFields(input: {
  hasPriority: boolean;
  hasTiming: boolean;
  hasLayer: boolean;
  hasEvidence: boolean;
  shouldEmitBlockerEvidenceWarning: boolean;
}): string[] {
  const missingRequiredFields: string[] = [];
  if (!input.hasPriority) {
    missingRequiredFields.push("priority");
  }
  if (!input.hasTiming) {
    missingRequiredFields.push("timing");
  }
  if (!input.hasLayer) {
    missingRequiredFields.push("layer");
  }
  if (!input.hasEvidence && !input.shouldEmitBlockerEvidenceWarning) {
    missingRequiredFields.push("evidence");
  }
  return missingRequiredFields;
}

export function evaluateReviewerFindingPolicy(input: {
  round: number;
  roundGateAppliesAfter: number;
  findingKey: string;
  finding: Finding;
  priority: FindingPriority;
  timing: FindingTiming;
  layer: FindingLayer | undefined;
  evidenceRefs: string[];
  hasPriority: boolean;
  hasTiming: boolean;
  hasLayer: boolean;
}): ReviewerFindingPolicyOutcome {
  const warnings: BubbleFailingGate[] = [];
  const hasEvidence = input.evidenceRefs.length > 0;
  const declaredBlockerPriority =
    input.priority === "P0" || input.priority === "P1";
  const shouldEmitBlockerEvidenceWarning =
    declaredBlockerPriority && !hasEvidence;
  const shouldDowngradeBlockerLayer =
    declaredBlockerPriority &&
    input.timing === "required-now" &&
    input.layer !== "L1";
  let effectivePriority = input.priority;
  const effectivePriorityReasons: Array<"blocker-evidence" | "blocker-layer"> =
    [];

  const missingRequiredFields = collectMissingRequiredFields({
    hasPriority: input.hasPriority,
    hasTiming: input.hasTiming,
    hasLayer: input.hasLayer,
    hasEvidence,
    shouldEmitBlockerEvidenceWarning
  });
  if (missingRequiredFields.length > 0) {
    warnings.push(
      createGateWarning({
        gateId: "review_schema.minimum_fields",
        reasonCode: "REVIEW_SCHEMA_WARNING",
        message: shouldDowngradeBlockerLayer
          ? `Finding ${input.findingKey} missing required fields: ${missingRequiredFields.join(", ")}; required-now ${input.priority} is treated as non-blocking when layer is not L1.`
          : `Finding ${input.findingKey} missing required fields: ${missingRequiredFields.join(", ")}.`,
        priority: input.priority,
        timing: input.timing,
        layer: input.layer,
        evidenceRefs: input.evidenceRefs,
        ...(shouldDowngradeBlockerLayer
          ? { effectivePriority: "P2" as const }
          : {})
      })
    );
  }

  if (shouldEmitBlockerEvidenceWarning) {
    effectivePriority = "P2";
    effectivePriorityReasons.push("blocker-evidence");
    warnings.push(
      createGateWarning({
        gateId: "review_schema.blocker_evidence",
        reasonCode: "BLOCKER_EVIDENCE_WARNING",
        message: `Finding ${input.findingKey} declares ${input.priority} without blocker-grade evidence; downgraded to effective P2.`,
        priority: input.priority,
        timing: input.timing,
        layer: input.layer,
        effectivePriority: "P2"
      })
    );
  }

  if (shouldDowngradeBlockerLayer) {
    effectivePriority = "P2";
    effectivePriorityReasons.push("blocker-layer");
    if (missingRequiredFields.length === 0) {
      warnings.push(
        createGateWarning({
          gateId: "review_schema.blocker_layer",
          reasonCode: "REVIEW_SCHEMA_WARNING",
          message:
            input.layer === undefined
              ? `Finding ${input.findingKey} required-now ${input.priority} is missing layer L1 and is treated as non-blocking (effective P2).`
              : `Finding ${input.findingKey} required-now ${input.priority} uses layer=${input.layer}; only L1 is blocker-eligible, treated as non-blocking (effective P2).`,
          priority: input.priority,
          timing: input.timing,
          layer: input.layer,
          evidenceRefs: input.evidenceRefs,
          effectivePriority: "P2"
        })
      );
    }
  }

  let effectiveTiming = input.timing;
  let roundGateViolated = false;
  const roundGateApplies = input.round > input.roundGateAppliesAfter;
  if (
    roundGateApplies &&
    input.timing === "required-now" &&
    (effectivePriority === "P2" || effectivePriority === "P3")
  ) {
    effectiveTiming = "later-hardening";
    roundGateViolated = true;
    warnings.push(
      createGateWarning({
        gateId: "review_round.autodemote",
        reasonCode: "ROUND_GATE_AUTODEMOTE",
        message:
          effectivePriorityReasons.length === 0
            ? `Finding ${input.findingKey} auto-demoted from required-now to later-hardening after round ${input.roundGateAppliesAfter}.`
            : `Finding ${input.findingKey} auto-demoted from required-now to later-hardening after round ${input.roundGateAppliesAfter}; effective non-blocker was already established by ${effectivePriorityReasons.join(" + ")}.`,
        priority: input.priority,
        timing: input.timing,
        layer: input.layer,
        evidenceRefs: input.evidenceRefs,
        effectivePriority
      })
    );
  }

  return {
    warnings,
    effectivePriority,
    effectiveTiming,
    roundGateViolated
  };
}
