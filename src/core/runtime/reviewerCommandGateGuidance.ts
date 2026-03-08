import type { ReviewArtifactType } from "../../types/bubble.js";

export type ReviewerCommandGateProjectionVariant = "clean" | "findings";

export const REVIEWER_COMMAND_GATE_REQ_A =
  "If review round is 1: do not use `pairflow converged`; use `pairflow pass`.";
export const REVIEWER_COMMAND_GATE_REQ_B =
  "If review round is at or above `severity_gate_round` and no blocker findings remain (document scope blocker requires `P0/P1` + `timing=required-now` + `layer=L1`): use `pairflow converged`.";
export const REVIEWER_COMMAND_GATE_REQ_C =
  "Do not use `pairflow pass` (including `--no-findings`) for clean or non-blocking-only outcomes when round is at or above `severity_gate_round`.";
export const REVIEWER_COMMAND_GATE_REQ_D =
  "Document scope qualifier: CLI `--finding` carries severity/title/refs only; without strict qualifiers (`timing=required-now` + `layer=L1`) findings are advisory (non-blocking) for post-gate command routing.";
export const REVIEWER_COMMAND_GATE_REQ_E =
  "If blocker findings remain under current scope policy, keep using `pairflow pass`.";

export const REVIEWER_COMMAND_GATE_FORBIDDEN = [
  "If review round is 2 or higher and you have blocker findings: use `pairflow converged`.",
  "Use `pairflow pass --no-findings` for clean path in round 2 or higher.",
  "Use `pairflow pass --no-findings` for the clean path in round 2 or higher.",
  "Use `pairflow pass --no-findings` in round 2 or higher for the clean path.",
  "If review round is 2 or higher and you have findings: use `pairflow converged`.",
  "If review round is at or above `severity_gate_round` and blocker findings (`P0/P1`) remain: use `pairflow converged`."
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

export function buildReviewerFindingsPassInstruction(
  reviewArtifactType: ReviewArtifactType
): string {
  if (reviewArtifactType === "document") {
    return "Document scope: `pairflow pass` for blockers is valid only when structured findings include strict qualifiers (`timing=required-now` + `layer=L1`). CLI `--finding` cannot encode these qualifiers, so unqualified `P0/P1` entries are advisory and should converge at/after `severity_gate_round`.";
  }

  return "If blocker findings (`P0/P1`) remain, run `pairflow pass --summary ... --finding 'P1:...|artifact://...'` (repeatable; for P0/P1 include finding-level refs).";
}
