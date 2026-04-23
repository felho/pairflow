import {
  validateHumanQuestions,
  validatePreviousReviewerVerdict
} from "./policyValidationSupport.js";
import type {
  ConvergencePolicyInput,
  ConvergencePolicyResult
} from "./policyTypes.js";

function validateSeverityGateRound(
  input: ConvergencePolicyInput,
  errors: string[]
): void {
  if (!Number.isInteger(input.severity_gate_round) || input.severity_gate_round < 4) {
    errors.push(
      "SEVERITY_GATE_ROUND_INVALID: severity_gate_round must be an integer >= 4."
    );
  }
}

function validateCurrentRoundHistory(
  input: ConvergencePolicyInput,
  errors: string[]
): void {
  const currentRoundHistory = input.roundRoleHistory.find(
    (entry) => entry.round === input.currentRound
  );
  if (currentRoundHistory === undefined) {
    errors.push(
      `round_role_history is missing current round entry (${input.currentRound}).`
    );
    return;
  }

  if (currentRoundHistory.reviewer !== input.reviewer) {
    errors.push(
      `round_role_history reviewer for round ${input.currentRound} must be ${input.reviewer}.`
    );
  }
  if (currentRoundHistory.implementer !== input.implementer) {
    errors.push(
      `round_role_history implementer for round ${input.currentRound} must be ${input.implementer}.`
    );
  }
}

function validateRoundAlternation(
  input: ConvergencePolicyInput,
  errors: string[]
): void {
  const distinctRounds = new Set(input.roundRoleHistory.map((entry) => entry.round));
  if (distinctRounds.size < 2) {
    errors.push(
      input.effectiveLoopMode === "meta_only"
        ? "Convergence requires evidence across at least two rounds before reviewer-bypass closure can be accepted."
        : "Convergence requires reviewer-role alternation evidence across at least two rounds."
    );
  }
}


export function validateConvergencePolicy(
  input: ConvergencePolicyInput
): ConvergencePolicyResult {
  const errors: string[] = [];
  const diagnostics: string[] = [];

  validateSeverityGateRound(input, errors);
  if (input.currentRound <= 1) {
    errors.push(
      "ROUND1_CONVERGENCE_GUARDRAIL: Convergence is not allowed in round 1."
    );
  }
  validateCurrentRoundHistory(input, errors);
  validateRoundAlternation(input, errors);
  validatePreviousReviewerVerdict(input, errors, diagnostics);
  validateHumanQuestions(input, errors);

  return {
    ok: errors.length === 0,
    errors,
    diagnostics
  };
}
