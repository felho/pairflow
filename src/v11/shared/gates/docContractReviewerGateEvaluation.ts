import type { BubbleFailingGate } from "../../../types/bubble.js";
import {
  isFindingLayer,
  isFindingTiming,
  resolveFindingPriority,
  type Finding,
  type FindingLayer,
  type FindingPriority,
  type FindingTiming
} from "../../../types/findings.js";
import { isNonEmptyString } from "../validation/primitives.js";

export interface GateFindingEvaluation {
  finding_key: string;
  priority: FindingPriority;
  effective_priority: FindingPriority;
  timing: FindingTiming;
  effective_timing: FindingTiming;
  layer?: FindingLayer;
}

export interface EvaluateReviewerFindingInput {
  round: number;
  finding: Finding;
  index: number;
  roundGateAppliesAfter: number;
}

export interface EvaluateReviewerFindingResult {
  warnings: BubbleFailingGate[];
  findingEvaluation: GateFindingEvaluation;
  normalizedFinding: Finding;
  roundGateViolated: boolean;
}

function createGateWarning(input: {
  gateId: string;
  reasonCode: BubbleFailingGate["reason_code"];
  message: string;
  priority?: FindingPriority | undefined;
  timing?: FindingTiming | undefined;
  layer?: FindingLayer | undefined;
  evidenceRefs?: string[] | undefined;
  effectivePriority?: FindingPriority | undefined;
}): BubbleFailingGate {
  const warning: BubbleFailingGate = {
    gate_id: input.gateId,
    reason_code: input.reasonCode,
    message: input.message,
    priority: input.priority ?? "P2",
    timing: input.timing ?? "later-hardening",
    signal_level: "warning"
  };
  if (input.layer !== undefined) {
    warning.layer = input.layer;
  }
  if (input.evidenceRefs !== undefined && input.evidenceRefs.length > 0) {
    warning.evidence_refs = input.evidenceRefs;
  }
  if (input.effectivePriority !== undefined) {
    warning.effective_priority = input.effectivePriority;
  }
  return warning;
}

function normalizeEvidenceRefs(finding: Finding): string[] {
  const refs: string[] = [];
  if (Array.isArray(finding.refs)) {
    for (const ref of finding.refs) {
      if (isNonEmptyString(ref)) {
        refs.push(ref.trim());
      }
    }
  }

  const evidence = finding.evidence;
  if (isNonEmptyString(evidence)) {
    refs.push(evidence.trim());
  } else if (Array.isArray(evidence)) {
    for (const value of evidence) {
      if (isNonEmptyString(value)) {
        refs.push(value.trim());
      }
    }
  }
  return refs;
}

export function evaluateReviewerFinding(
  input: EvaluateReviewerFindingInput
): EvaluateReviewerFindingResult {
  const warnings: BubbleFailingGate[] = [];
  const findingKey = `r${input.round}:f${input.index + 1}`;
  const priority = resolveFindingPriority(input.finding) ?? "P2";
  const timing = isFindingTiming(input.finding.timing)
    ? input.finding.timing
    : "later-hardening";
  const layer = isFindingLayer(input.finding.layer) ? input.finding.layer : undefined;
  const evidenceRefs = normalizeEvidenceRefs(input.finding);
  const hasPriority = resolveFindingPriority(input.finding) !== undefined;
  const hasTiming = isFindingTiming(input.finding.timing);
  const hasLayer = isFindingLayer(input.finding.layer);
  const hasEvidence = evidenceRefs.length > 0;
  const declaredBlockerPriority = priority === "P0" || priority === "P1";
  const shouldEmitBlockerEvidenceWarning = declaredBlockerPriority && !hasEvidence;
  const shouldDowngradeBlockerLayer =
    declaredBlockerPriority && timing === "required-now" && layer !== "L1";
  let effectivePriority = priority;
  const effectivePriorityReasons: Array<"blocker-evidence" | "blocker-layer"> = [];

  const missingRequiredFields: string[] = [];
  if (!hasPriority) {
    missingRequiredFields.push("priority");
  }
  if (!hasTiming) {
    missingRequiredFields.push("timing");
  }
  if (!hasLayer) {
    missingRequiredFields.push("layer");
  }
  if (!hasEvidence && !shouldEmitBlockerEvidenceWarning) {
    missingRequiredFields.push("evidence");
  }
  if (missingRequiredFields.length > 0) {
    warnings.push(
      createGateWarning({
        gateId: "review_schema.minimum_fields",
        reasonCode: "REVIEW_SCHEMA_WARNING",
        message:
          shouldDowngradeBlockerLayer
            ? `Finding ${findingKey} missing required fields: ${missingRequiredFields.join(", ")}; required-now ${priority} is treated as non-blocking when layer is not L1.`
            : `Finding ${findingKey} missing required fields: ${missingRequiredFields.join(", ")}.`,
        priority,
        timing,
        layer,
        evidenceRefs,
        ...(shouldDowngradeBlockerLayer ? { effectivePriority: "P2" as const } : {})
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
        message: `Finding ${findingKey} declares ${priority} without blocker-grade evidence; downgraded to effective P2.`,
        priority,
        timing,
        layer,
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
            layer === undefined
              ? `Finding ${findingKey} required-now ${priority} is missing layer L1 and is treated as non-blocking (effective P2).`
              : `Finding ${findingKey} required-now ${priority} uses layer=${layer}; only L1 is blocker-eligible, treated as non-blocking (effective P2).`,
          priority,
          timing,
          layer,
          evidenceRefs,
          effectivePriority: "P2"
        })
      );
    }
  }

  let effectiveTiming = timing;
  let roundGateViolated = false;
  const roundGateApplies = input.round > input.roundGateAppliesAfter;
  if (
    roundGateApplies &&
    timing === "required-now" &&
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
            ? `Finding ${findingKey} auto-demoted from required-now to later-hardening after round ${input.roundGateAppliesAfter}.`
            : `Finding ${findingKey} auto-demoted from required-now to later-hardening after round ${input.roundGateAppliesAfter}; effective non-blocker was already established by ${effectivePriorityReasons.join(" + ")}.`,
        priority,
        timing,
        layer,
        evidenceRefs,
        effectivePriority
      })
    );
  }

  const normalizedFinding: Finding = {
    ...input.finding,
    priority,
    ...(input.finding.severity !== undefined ? { severity: priority } : {})
  };
  if (hasTiming || input.finding.timing !== undefined || effectiveTiming !== timing) {
    normalizedFinding.timing = effectiveTiming;
  }
  if (!hasLayer && input.finding.layer !== undefined) {
    delete normalizedFinding.layer;
  }
  if (effectivePriority !== priority) {
    normalizedFinding.effective_priority = effectivePriority;
  } else {
    delete normalizedFinding.effective_priority;
  }

  return {
    warnings,
    findingEvaluation: {
      finding_key: findingKey,
      priority,
      effective_priority: effectivePriority,
      timing,
      effective_timing: effectiveTiming,
      ...(layer !== undefined ? { layer } : {})
    },
    normalizedFinding,
    roundGateViolated
  };
}
