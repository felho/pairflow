import type { AgentName, RoundRoleHistoryEntry } from "../../types/bubble.js";
import { isFindingSeverity } from "../../types/findings.js";
import type { ProtocolEnvelope } from "../../types/protocol.js";
import { isRecord } from "../validation.js";

export interface ConvergencePolicyInput {
  currentRound: number;
  reviewer: AgentName;
  implementer: AgentName;
  roundRoleHistory: RoundRoleHistoryEntry[];
  transcript: ProtocolEnvelope[];
}

export interface ConvergencePolicyResult {
  ok: boolean;
  errors: string[];
}

function getReviewerFindingsStatus(envelope: ProtocolEnvelope): {
  missing: boolean;
  invalid: boolean;
  hasBlocking: boolean;
} {
  const findings = envelope.payload.findings;
  if (!Array.isArray(findings)) {
    return {
      missing: true,
      invalid: false,
      hasBlocking: false
    };
  }

  let invalid = false;
  const hasBlocking = findings.some((finding) => {
    if (!isRecord(finding)) {
      invalid = true;
      return false;
    }

    const severity = finding.severity;
    if (!isFindingSeverity(severity)) {
      invalid = true;
      return false;
    }
    return severity === "P0" || severity === "P1";
  });

  return {
    missing: false,
    invalid,
    hasBlocking
  };
}

function hasUnresolvedHumanQuestion(transcript: ProtocolEnvelope[]): boolean {
  let openQuestions = 0;
  for (const envelope of transcript) {
    if (envelope.type === "HUMAN_QUESTION") {
      openQuestions += 1;
      continue;
    }

    if (envelope.type === "HUMAN_REPLY" && openQuestions > 0) {
      openQuestions -= 1;
    }
  }

  return openQuestions > 0;
}

export function validateConvergencePolicy(
  input: ConvergencePolicyInput
): ConvergencePolicyResult {
  const errors: string[] = [];

  const currentRoundHistory = input.roundRoleHistory.find(
    (entry) => entry.round === input.currentRound
  );
  if (currentRoundHistory === undefined) {
    errors.push(
      `round_role_history is missing current round entry (${input.currentRound}).`
    );
  } else {
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

  const distinctRounds = new Set(input.roundRoleHistory.map((entry) => entry.round));
  if (distinctRounds.size < 2) {
    errors.push(
      "Convergence requires reviewer-role alternation evidence across at least two rounds."
    );
  }

  const previousRound = input.currentRound - 1;
  const previousReviewerPass = [...input.transcript]
    .reverse()
    .find(
      (envelope) =>
        envelope.type === "PASS" &&
        envelope.sender === input.reviewer &&
        envelope.recipient === input.implementer &&
        envelope.round === previousRound
    );

  if (previousRound < 1 || previousReviewerPass === undefined) {
    errors.push(
      "Convergence requires a previous reviewer PASS from the prior round."
    );
  } else {
    const findingsStatus = getReviewerFindingsStatus(previousReviewerPass);
    if (findingsStatus.missing) {
      errors.push(
        "Convergence requires previous reviewer PASS to declare findings explicitly (use --finding or --no-findings)."
      );
    } else if (findingsStatus.invalid) {
      errors.push(
        "Convergence blocked: previous reviewer PASS has invalid findings payload."
      );
    } else if (findingsStatus.hasBlocking) {
      errors.push(
        "Convergence blocked: previous reviewer PASS still contains open P0/P1 findings."
      );
    }
  }

  if (hasUnresolvedHumanQuestion(input.transcript)) {
    errors.push("Convergence blocked: unresolved HUMAN_QUESTION exists.");
  }

  return {
    ok: errors.length === 0,
    errors
  };
}
