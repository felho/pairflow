import { DEFAULT_REVIEW_POLICY_REVIEWER_BLOCKING_MIN_SEVERITY } from "../../../../../config/defaults.js";
import type {
  BubbleReviewAutoReworkSeverity
} from "../../../reviewPolicy/reviewPolicyTypes.js";
import type {
  ReviewArtifactType
} from "../../../config/bubbleConfigVocabulary.js";

export type ReviewerCommandGateProjectionVariant = "clean" | "findings";

function resolveReviewerBlockingMinSeverity(
  reviewerBlockingMinSeverity?: BubbleReviewAutoReworkSeverity
): BubbleReviewAutoReworkSeverity {
  return (
    reviewerBlockingMinSeverity
    ?? DEFAULT_REVIEW_POLICY_REVIEWER_BLOCKING_MIN_SEVERITY
  );
}

export function buildReviewerBlockingThresholdLabel(input: {
  reviewerBlockingMinSeverity?: BubbleReviewAutoReworkSeverity;
} = {}): string {
  const reviewerBlockingMinSeverity = resolveReviewerBlockingMinSeverity(
    input.reviewerBlockingMinSeverity
  );
  return `review_policy.reviewer_blocking_min_severity=${reviewerBlockingMinSeverity}`;
}

export function buildReviewerBlockingThresholdAuthorityLine(input: {
  reviewerBlockingMinSeverity?: BubbleReviewAutoReworkSeverity;
} = {}): string {
  const reviewerBlockingMinSeverity = resolveReviewerBlockingMinSeverity(
    input.reviewerBlockingMinSeverity
  );
  const label = buildReviewerBlockingThresholdLabel({
    reviewerBlockingMinSeverity
  });

  if (reviewerBlockingMinSeverity === "P3") {
    return `Current post-gate routing threshold is \`${label}\` (default baseline). A \`P3\`-only finding set can still remain reviewer-blocking after \`severity_gate_round\`; this is a configuration baseline, not a redefinition of \`P3\` severity.`;
  }
  if (reviewerBlockingMinSeverity === "P2") {
    return `Current post-gate routing threshold is \`${label}\`. Findings below that threshold (for example \`P3\`-only sets) are advisory for routing after \`severity_gate_round\`; the severity ontology itself does not change.`;
  }

  return `Current post-gate routing threshold is \`${label}\`. Findings below that threshold (for example \`P2/P3\`-only sets) are advisory for routing after \`severity_gate_round\`; the severity ontology itself does not change.`;
}

export function buildReviewerDocumentScopeThresholdRoutingNote(): string {
  return "Document scope qualifier: CLI `--finding` carries severity/title/refs only. For post-gate routing, document-scope `P0/P1` is blocker-grade only with strict qualifiers (`timing=required-now` + `layer=L1`). Without those qualifiers the finding is treated as `P2` for routing-threshold evaluation.";
}

export const REVIEWER_COMMAND_GATE_REQ_A =
  "If review round is 1: do not use canonical convergence emit yet; use `pairflow agent emit --kind pass ...` and declare findings explicitly (`--finding` when findings exist, `--no-findings` only when the review is truly clean).";

export function buildReviewerCommandGateReqB(input: {
  reviewerBlockingMinSeverity?: BubbleReviewAutoReworkSeverity;
} = {}): string {
  return `If review round is at or above \`severity_gate_round\` and no findings meet the current post-gate blocking threshold (\`${buildReviewerBlockingThresholdLabel(input)}\`): use \`pairflow agent emit --kind convergence ...\`; below-threshold findings must still be passed as structured \`--finding\` entries on that path. ${buildReviewerBlockingThresholdAuthorityLine(input)}`;
}

export const REVIEWER_COMMAND_GATE_REQ_B = buildReviewerCommandGateReqB();
export const REVIEWER_COMMAND_GATE_REQ_C =
  "Do not use canonical pass emit (`pairflow agent emit --kind pass`, including `--no-findings`) for clean or non-blocking-only outcomes when round is at or above `severity_gate_round`.";

export function buildReviewerCommandGateReqD(): string {
  return `${buildReviewerDocumentScopeThresholdRoutingNote()} Forbidden consistency patterns: summary-only finding claims without structured \`--finding\`, and \`clean/no findings\` summary claims while structured findings are present.`;
}

export const REVIEWER_COMMAND_GATE_REQ_D = buildReviewerCommandGateReqD();

export function buildReviewerCommandGateReqE(input: {
  reviewerBlockingMinSeverity?: BubbleReviewAutoReworkSeverity;
} = {}): string {
  return `If findings meeting the current post-gate blocking threshold remain under current scope policy, keep using \`pairflow agent emit --kind pass ... --finding ...\`. ${buildReviewerBlockingThresholdAuthorityLine(input)}`;
}

export const REVIEWER_COMMAND_GATE_REQ_E = buildReviewerCommandGateReqE();

export function buildReviewerCommandGateReqF(input: {
  reviewerBlockingMinSeverity?: BubbleReviewAutoReworkSeverity;
} = {}): string {
  return `Routing matrix (copy-paste after resolving \`executionContext\` from \`pairflow bubble status --json\`): meets-threshold findings -> \`pairflow agent emit --kind pass --repo <repo> --bubble-id <id> --handoff-id <handoff-id> --execution-id <execution-id> --summary "..." --finding "<severity>:Title|artifact://ref"\`; below-threshold findings -> \`pairflow agent emit --kind convergence --repo <repo> --bubble-id <id> --handoff-id <handoff-id> --execution-id <execution-id> --summary "..." --finding "<severity>:Title|artifact://ref"\`; clean -> \`pairflow agent emit --kind convergence --repo <repo> --bubble-id <id> --handoff-id <handoff-id> --execution-id <execution-id> --summary "..."\` (no \`--finding\`). ${buildReviewerBlockingThresholdAuthorityLine(input)}`;
}

export const REVIEWER_COMMAND_GATE_REQ_F = buildReviewerCommandGateReqF();

export const REVIEWER_COMMAND_GATE_FORBIDDEN = [
  "If review round is 2 or higher and you have blocker findings: use `pairflow agent emit --kind convergence ...`.",
  "Use `pairflow agent emit --kind pass ... --no-findings` for clean path in round 2 or higher.",
  "If review round is 2 or higher and you have findings: use `pairflow agent emit --kind convergence ...`.",
  "If review round is at or above `severity_gate_round` and blocker findings (`P0/P1`) remain: use `pairflow agent emit --kind convergence ...`.",
  "If review round is at or above `severity_gate_round`, `P2/P3` findings are always advisory-only."
] as const;

export function buildReviewerCanonicalCommandGateLines(input: {
  reviewerBlockingMinSeverity?: BubbleReviewAutoReworkSeverity;
} = {}): string[] {
  return [
    REVIEWER_COMMAND_GATE_REQ_A,
    buildReviewerCommandGateReqB(input),
    REVIEWER_COMMAND_GATE_REQ_C,
    REVIEWER_COMMAND_GATE_REQ_D,
    buildReviewerCommandGateReqF(input)
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
  reviewerBlockingMinSeverity?: BubbleReviewAutoReworkSeverity;
}): string {
  if (input.round <= 1) {
    return [
      REVIEWER_COMMAND_GATE_REQ_A,
      REVIEWER_COMMAND_GATE_REQ_D,
      buildReviewerCommandGateReqF(input)
    ].join(" ");
  }

  const variant = input.variant ?? "findings";
  if (variant === "findings") {
    return [
      buildReviewerCommandGateReqE(input),
      REVIEWER_COMMAND_GATE_REQ_C,
      REVIEWER_COMMAND_GATE_REQ_D,
      buildReviewerCommandGateReqF(input)
    ].join(" ");
  }

  return [
    buildReviewerCommandGateReqB(input),
    REVIEWER_COMMAND_GATE_REQ_C,
    REVIEWER_COMMAND_GATE_REQ_D,
    buildReviewerCommandGateReqF(input)
  ].join(" ");
}

export function buildReviewerFindingsPassInstruction(
  reviewArtifactType: ReviewArtifactType,
  input: {
    reviewerBlockingMinSeverity?: BubbleReviewAutoReworkSeverity;
  } = {}
): string {
  if (reviewArtifactType === "document") {
    return `Document scope: canonical \`pairflow agent emit --kind pass ... --finding ...\` for blocker-grade \`P0/P1\` requires strict qualifiers (\`timing=required-now\` + \`layer=L1\`). CLI \`--finding\` cannot encode those qualifiers, so unqualified document-scope \`P0/P1\` entries are treated as \`P2\` for post-gate routing-threshold evaluation, not as automatic blocker-grade findings. ${buildReviewerBlockingThresholdAuthorityLine(input)}`;
  }

  return `If findings meeting the current post-gate blocking threshold remain, first resolve \`executionContext\` via \`pairflow bubble status --json\`, then run \`pairflow agent emit --kind pass --repo <repo> --bubble-id <id> --handoff-id <handoff-id> --execution-id <execution-id> --summary ... --finding '<severity>:...|artifact://...'\` (repeatable; for any \`P0/P1\` finding include finding-level refs). ${buildReviewerBlockingThresholdAuthorityLine(input)}`;
}
