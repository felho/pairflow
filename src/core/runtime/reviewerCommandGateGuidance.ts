export type ReviewerCommandGateProjectionVariant = "clean" | "findings";

export const REVIEWER_COMMAND_GATE_REQ_A =
  "If review round is 1: do not use `pairflow converged`; use `pairflow pass`.";
export const REVIEWER_COMMAND_GATE_REQ_B =
  "If review round is 2 or higher and you have no findings: use `pairflow converged`.";
export const REVIEWER_COMMAND_GATE_REQ_C =
  "Do not use `pairflow pass --no-findings` for the clean path in round 2 or higher.";
export const REVIEWER_COMMAND_GATE_REQ_D =
  "Blocker-handling policy remains unchanged in this bugfix scope.";
export const REVIEWER_COMMAND_GATE_REQ_E =
  "If review round is 2 or higher and you have findings, keep using `pairflow pass`.";

export const REVIEWER_COMMAND_GATE_FORBIDDEN = [
  "If review round is 2 or higher and you have blocker findings: use `pairflow converged`.",
  "Use `pairflow pass --no-findings` for clean path in round 2 or higher.",
  "Use `pairflow pass --no-findings` for the clean path in round 2 or higher.",
  "Use `pairflow pass --no-findings` in round 2 or higher for the clean path.",
  "If review round is 2 or higher and you have findings: use `pairflow converged`."
] as const;

export function buildReviewerCanonicalCommandGateLines(): string[] {
  return [
    REVIEWER_COMMAND_GATE_REQ_A,
    REVIEWER_COMMAND_GATE_REQ_B,
    REVIEWER_COMMAND_GATE_REQ_C,
    REVIEWER_COMMAND_GATE_REQ_D
  ];
}

export function buildReviewerRoundCommandGateProjection(input: {
  round: number;
  variant?: ReviewerCommandGateProjectionVariant;
}): string {
  if (input.round <= 1) {
    return [REVIEWER_COMMAND_GATE_REQ_A, REVIEWER_COMMAND_GATE_REQ_D].join(" ");
  }

  if (input.variant === "findings") {
    return [
      REVIEWER_COMMAND_GATE_REQ_E,
      REVIEWER_COMMAND_GATE_REQ_C,
      REVIEWER_COMMAND_GATE_REQ_D
    ].join(" ");
  }

  return [
    REVIEWER_COMMAND_GATE_REQ_B,
    REVIEWER_COMMAND_GATE_REQ_C,
    REVIEWER_COMMAND_GATE_REQ_D
  ].join(" ");
}
