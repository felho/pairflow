import type { BubbleFailingGate } from "../../gateStateTypes.js";
import {
  isFindingLayer,
  isFindingTiming,
  resolveFindingPriority,
  type Finding,
  type FindingLayer,
  type FindingPriority,
  type FindingTiming
} from "../../../../../contracts/kernel/findings.js";
import { normalizeEvidenceRefs } from "./docContractReviewerGateEvidence.js";
import { evaluateReviewerFindingPolicy } from "./docContractReviewerGatePolicy.js";

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

export function evaluateReviewerFinding(
  input: EvaluateReviewerFindingInput
): EvaluateReviewerFindingResult {
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
  const {
    warnings,
    effectivePriority,
    effectiveTiming,
    roundGateViolated
  } = evaluateReviewerFindingPolicy({
    round: input.round,
    roundGateAppliesAfter: input.roundGateAppliesAfter,
    findingKey,
    finding: input.finding,
    priority,
    timing,
    layer,
    evidenceRefs,
    hasPriority,
    hasTiming,
    hasLayer
  });

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
