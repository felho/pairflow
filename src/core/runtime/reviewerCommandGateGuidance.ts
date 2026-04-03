import type { ReviewArtifactType } from "../../types/bubble.js";

export type ReviewerCommandGateProjectionVariant = "clean" | "findings";

export const REVIEWER_COMMAND_GATE_REQ_A =
  "If review round is 1: do not use canonical convergence emit yet; use `pairflow agent emit --kind pass ...` and declare findings explicitly (`--finding` when findings exist, `--no-findings` only when the review is truly clean).";
export const REVIEWER_COMMAND_GATE_REQ_B =
  "If review round is at or above `severity_gate_round` and no blocker findings remain (document scope blocker requires `P0/P1` + `timing=required-now` + `layer=L1`): use `pairflow agent emit --kind convergence ...`; advisory findings must be passed as structured `--finding` entries and are limited to `P2/P3` on this path.";
export const REVIEWER_COMMAND_GATE_REQ_C =
  "Do not use canonical pass emit (`pairflow agent emit --kind pass`, including `--no-findings`) for clean or non-blocking-only outcomes when round is at or above `severity_gate_round`.";
export const REVIEWER_COMMAND_GATE_REQ_D =
  "Document scope qualifier: CLI `--finding` carries severity/title/refs only; without strict qualifiers (`timing=required-now` + `layer=L1`) findings are advisory (non-blocking) for post-gate command routing. Forbidden consistency patterns: summary-only finding claims without structured `--finding`, and `clean/no findings` summary claims while structured findings are present.";
export const REVIEWER_COMMAND_GATE_REQ_E =
  "If blocker findings remain under current scope policy, keep using `pairflow agent emit --kind pass ... --finding ...`.";
export const REVIEWER_COMMAND_GATE_REQ_F =
  "Routing matrix (copy-paste after resolving `executionContext` from `pairflow bubble status --json`): blocker -> `pairflow agent emit --kind pass --repo <repo> --bubble-id <id> --handoff-id <handoff-id> --summary \"...\" --finding \"P1:Title|artifact://ref\"`; advisory-only (`P2/P3`) -> `pairflow agent emit --kind convergence --repo <repo> --bubble-id <id> --handoff-id <handoff-id> --summary \"...\" --finding \"P2:Title|artifact://ref\"`; clean -> `pairflow agent emit --kind convergence --repo <repo> --bubble-id <id> --handoff-id <handoff-id> --summary \"...\"` (no `--finding`).";

export const REVIEWER_COMMAND_GATE_FORBIDDEN = [
  "If review round is 2 or higher and you have blocker findings: use `pairflow agent emit --kind convergence ...`.",
  "Use `pairflow agent emit --kind pass ... --no-findings` for clean path in round 2 or higher.",
  "If review round is 2 or higher and you have findings: use `pairflow agent emit --kind convergence ...`.",
  "If review round is at or above `severity_gate_round` and blocker findings (`P0/P1`) remain: use `pairflow agent emit --kind convergence ...`."
] as const;

export function buildReviewerCanonicalCommandGateLines(): string[] {
  return [
    REVIEWER_COMMAND_GATE_REQ_A,
    REVIEWER_COMMAND_GATE_REQ_B,
    REVIEWER_COMMAND_GATE_REQ_C,
    REVIEWER_COMMAND_GATE_REQ_D,
    REVIEWER_COMMAND_GATE_REQ_F
  ];
}

/**
 * Round-1 policy is pass-only, so `variant` has no effect for `round <= 1`.
 * We intentionally project the same command-gate lines for both clean/findings
 * in round 0-1 to keep startup/resume guidance deterministic.
 * For round>=2 we fail closed to the findings projection when variant is omitted.
 */
export function buildReviewerRoundCommandGateProjection(input: {
  round: number;
  variant?: ReviewerCommandGateProjectionVariant;
}): string {
  if (input.round <= 1) {
    return [
      REVIEWER_COMMAND_GATE_REQ_A,
      REVIEWER_COMMAND_GATE_REQ_D,
      REVIEWER_COMMAND_GATE_REQ_F
    ].join(" ");
  }

  const variant = input.variant ?? "findings";
  if (variant === "findings") {
    return [
      REVIEWER_COMMAND_GATE_REQ_E,
      REVIEWER_COMMAND_GATE_REQ_C,
      REVIEWER_COMMAND_GATE_REQ_D,
      REVIEWER_COMMAND_GATE_REQ_F
    ].join(" ");
  }

  return [
    REVIEWER_COMMAND_GATE_REQ_B,
    REVIEWER_COMMAND_GATE_REQ_C,
    REVIEWER_COMMAND_GATE_REQ_D,
    REVIEWER_COMMAND_GATE_REQ_F
  ].join(" ");
}

export function buildReviewerFindingsPassInstruction(
  reviewArtifactType: ReviewArtifactType
): string {
  if (reviewArtifactType === "document") {
    return "Document scope: canonical `pairflow agent emit --kind pass ... --finding ...` for blockers is valid only when structured findings include strict qualifiers (`timing=required-now` + `layer=L1`). CLI `--finding` cannot encode these qualifiers, so unqualified `P0/P1` entries are advisory and should converge at/after `severity_gate_round` using `pairflow agent emit --kind convergence ... --finding ...` (`P2/P3` only), or plain canonical convergence when clean.";
  }

  return "If blocker findings (`P0/P1`) remain, first resolve `executionContext` via `pairflow bubble status --json`, then run `pairflow agent emit --kind pass --repo <repo> --bubble-id <id> --handoff-id <handoff-id> --summary ... --finding 'P1:...|artifact://...'` (repeatable; for P0/P1 include finding-level refs).";
}
