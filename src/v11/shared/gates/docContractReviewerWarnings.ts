import type {
  BubbleFailingGate,
  BubbleRoundGateState,
  BubbleSpecLockState
} from "./gateStateTypes.js";
import type { Finding } from "../../../types/findings.js";
import {
  evaluateReviewerFinding,
  type GateFindingEvaluation
} from "./docContractReviewerGateEvaluation.js";

export interface EvaluateReviewerGateInput {
  round: number;
  findings: Finding[];
  roundGateAppliesAfter: number;
}

export interface EvaluateReviewerGateResult {
  warnings: BubbleFailingGate[];
  findingEvaluations: GateFindingEvaluation[];
  normalizedFindings: Finding[];
  roundGateState: BubbleRoundGateState;
  specLockState: BubbleSpecLockState;
}

function createGateWarning(input: {
  gateId: string;
  reasonCode: BubbleFailingGate["reason_code"];
  message: string;
  priority?: BubbleFailingGate["priority"] | undefined;
  timing?: BubbleFailingGate["timing"] | undefined;
  layer?: BubbleFailingGate["layer"] | undefined;
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
  return warning;
}

function dedupeWarnings(warnings: BubbleFailingGate[]): BubbleFailingGate[] {
  const seen = new Set<string>();
  const deduped: BubbleFailingGate[] = [];
  for (const warning of warnings) {
    const key = `${warning.gate_id}|${warning.reason_code}|${warning.message}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(warning);
  }
  return deduped;
}

function computeSpecLockState(
  findings: GateFindingEvaluation[]
): BubbleSpecLockState {
  let openBlockerCount = 0;
  let openRequiredNowCount = 0;

  for (const finding of findings) {
    if (finding.effective_timing === "required-now") {
      openRequiredNowCount += 1;
    }

    if (
      finding.effective_timing === "required-now"
      && (finding.effective_priority === "P0" || finding.effective_priority === "P1")
      && finding.layer === "L1"
    ) {
      openBlockerCount += 1;
    }
  }

  return {
    state: openBlockerCount > 0 ? "LOCKED" : "IMPLEMENTABLE",
    open_blocker_count: openBlockerCount,
    open_required_now_count: openRequiredNowCount
  };
}

export function evaluateReviewerGateWarnings(
  input: EvaluateReviewerGateInput
): EvaluateReviewerGateResult {
  const warnings: BubbleFailingGate[] = [];
  const findingEvaluations: GateFindingEvaluation[] = [];
  const normalizedFindings: Finding[] = [];
  const roundGateApplies = input.round > input.roundGateAppliesAfter;
  let roundGateViolated = false;

  input.findings.forEach((finding, index) => {
    const evaluated = evaluateReviewerFinding({
      round: input.round,
      finding,
      index,
      roundGateAppliesAfter: input.roundGateAppliesAfter
    });
    warnings.push(...evaluated.warnings);
    findingEvaluations.push(evaluated.findingEvaluation);
    normalizedFindings.push(evaluated.normalizedFinding);
    roundGateViolated = roundGateViolated || evaluated.roundGateViolated;
  });

  if (roundGateApplies && roundGateViolated) {
    warnings.push(
      createGateWarning({
        gateId: "review_round.policy",
        reasonCode: "ROUND_GATE_WARNING",
        message:
          `Round gate policy violated in round ${input.round}; non-blocker required-now findings were auto-demoted.`,
        priority: "P2",
        timing: "later-hardening",
        layer: "L1"
      })
    );
  }

  const roundGateState: BubbleRoundGateState = {
    applies: roundGateApplies,
    violated: roundGateViolated,
    round: input.round,
    ...(roundGateViolated ? { reason_code: "ROUND_GATE_WARNING" } : {})
  };

  const dedupedWarnings = dedupeWarnings(warnings);
  const specLockState = computeSpecLockState(findingEvaluations);

  return {
    warnings: dedupedWarnings,
    findingEvaluations,
    normalizedFindings,
    roundGateState,
    specLockState
  };
}
