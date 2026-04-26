import { describe, expect, it } from "vitest";

import {
  REVIEWER_COMMAND_GATE_FORBIDDEN,
  REVIEWER_COMMAND_GATE_REQ_A,
  REVIEWER_COMMAND_GATE_REQ_B,
  REVIEWER_COMMAND_GATE_REQ_C,
  REVIEWER_COMMAND_GATE_REQ_D,
  REVIEWER_COMMAND_GATE_REQ_E,
  REVIEWER_COMMAND_GATE_REQ_F,
  buildReviewerCanonicalCommandGateLines,
  buildReviewerFindingsPassInstruction,
  buildReviewerRoundCommandGateProjection
} from "../../../src/v11/shared/reviewer/reviewerCommandGateGuidance.js";

describe("reviewerCommandGateGuidance", () => {
  it("keeps canonical routing and forbidden-pattern guidance in startup lines", () => {
    const lines = buildReviewerCanonicalCommandGateLines();
    const text = lines.join(" ");

    expect(lines).toEqual(
      expect.arrayContaining([
        REVIEWER_COMMAND_GATE_REQ_A,
        REVIEWER_COMMAND_GATE_REQ_B,
        REVIEWER_COMMAND_GATE_REQ_C,
        REVIEWER_COMMAND_GATE_REQ_D,
        REVIEWER_COMMAND_GATE_REQ_F
      ])
    );
    expect(text).toContain(
      "no findings meet the current post-gate blocking threshold"
    );
    expect(text).toContain("Forbidden consistency patterns: summary-only finding claims without structured `--finding`");
    expect(text).toContain("clean/no findings");
    expect(text).toContain("meets-threshold findings -> `pairflow agent emit --kind pass");
    expect(text).toContain("below-threshold findings -> `pairflow agent emit --kind convergence");
    expect(text).toContain("clean -> `pairflow agent emit --kind convergence");
    expect(text).toContain(
      "Current post-gate routing threshold is `review_policy.reviewer_blocking_min_severity=P3` (default baseline)."
    );
    expect(text).not.toContain(REVIEWER_COMMAND_GATE_REQ_E);
    for (const forbiddenToken of REVIEWER_COMMAND_GATE_FORBIDDEN) {
      expect(text).not.toContain(forbiddenToken);
    }
  });

  it("projects non-default threshold authority directly into canonical startup lines", () => {
    const lines = buildReviewerCanonicalCommandGateLines({
      reviewerBlockingMinSeverity: "P2"
    });
    const text = lines.join(" ");

    expect(text).toContain(
      "review_policy.reviewer_blocking_min_severity=P2"
    );
    expect(text).toContain(
      "Findings below that threshold (for example `P3`-only sets) are advisory for routing after `severity_gate_round`"
    );
    expect(text).toContain(
      "no findings meet the current post-gate blocking threshold"
    );
    expect(text).toContain(
      "meets-threshold findings -> `pairflow agent emit --kind pass"
    );
    for (const forbiddenToken of REVIEWER_COMMAND_GATE_FORBIDDEN) {
      expect(text).not.toContain(forbiddenToken);
    }
  });

  it("projects round 1 guidance to pass-only routing with explicit findings declaration", () => {
    const projection = buildReviewerRoundCommandGateProjection({ round: 1 });

    expect(projection).toContain(REVIEWER_COMMAND_GATE_REQ_A);
    expect(projection).toContain(REVIEWER_COMMAND_GATE_REQ_D);
    expect(projection).toContain(REVIEWER_COMMAND_GATE_REQ_F);
    expect(projection).not.toContain(REVIEWER_COMMAND_GATE_REQ_B);
    expect(projection).not.toContain(REVIEWER_COMMAND_GATE_REQ_C);
    expect(projection).not.toContain(REVIEWER_COMMAND_GATE_REQ_E);
  });

  it("keeps round 0 projection identical to round 1 pass-only guidance", () => {
    const projection = buildReviewerRoundCommandGateProjection({ round: 0 });

    expect(projection).toContain(REVIEWER_COMMAND_GATE_REQ_A);
    expect(projection).toContain(REVIEWER_COMMAND_GATE_REQ_D);
    expect(projection).toContain(REVIEWER_COMMAND_GATE_REQ_F);
    expect(projection).not.toContain(REVIEWER_COMMAND_GATE_REQ_B);
    expect(projection).not.toContain(REVIEWER_COMMAND_GATE_REQ_C);
    expect(projection).not.toContain(REVIEWER_COMMAND_GATE_REQ_E);
  });

  it("ignores variant override for round<=1 to keep deterministic pass-only routing", () => {
    const cleanProjection = buildReviewerRoundCommandGateProjection({
      round: 1,
      variant: "clean"
    });
    const findingsProjection = buildReviewerRoundCommandGateProjection({
      round: 1,
      variant: "findings"
    });

    expect(cleanProjection).toBe(findingsProjection);
  });

  it("projects round>=2 clean routing to converged without blocker pass guidance", () => {
    const projection = buildReviewerRoundCommandGateProjection({
      round: 2,
      variant: "clean"
    });

    expect(projection).toContain(REVIEWER_COMMAND_GATE_REQ_B);
    expect(projection).toContain(REVIEWER_COMMAND_GATE_REQ_C);
    expect(projection).toContain(REVIEWER_COMMAND_GATE_REQ_D);
    expect(projection).toContain(REVIEWER_COMMAND_GATE_REQ_F);
    expect(projection).not.toContain(REVIEWER_COMMAND_GATE_REQ_E);
  });

  it("projects round>=2 findings routing to pass for blockers only", () => {
    const projection = buildReviewerRoundCommandGateProjection({
      round: 2,
      variant: "findings"
    });

    expect(projection).toContain(REVIEWER_COMMAND_GATE_REQ_E);
    expect(projection).toContain(REVIEWER_COMMAND_GATE_REQ_C);
    expect(projection).toContain(REVIEWER_COMMAND_GATE_REQ_D);
    expect(projection).toContain(REVIEWER_COMMAND_GATE_REQ_F);
    expect(projection).not.toContain(REVIEWER_COMMAND_GATE_REQ_B);
    expect(projection).toContain(
      "Current post-gate routing threshold is `review_policy.reviewer_blocking_min_severity=P3` (default baseline)."
    );
    expect(projection).toContain(
      "this is a configuration baseline, not a redefinition of `P3` severity"
    );
  });

  it("projects non-default threshold authority into round>=2 clean and findings routing", () => {
    const cleanProjection = buildReviewerRoundCommandGateProjection({
      round: 2,
      variant: "clean",
      reviewerBlockingMinSeverity: "P2"
    });
    const findingsProjection = buildReviewerRoundCommandGateProjection({
      round: 2,
      variant: "findings",
      reviewerBlockingMinSeverity: "P1"
    });

    expect(cleanProjection).toContain(
      "review_policy.reviewer_blocking_min_severity=P2"
    );
    expect(cleanProjection).toContain(
      "Findings below that threshold (for example `P3`-only sets) are advisory for routing after `severity_gate_round`"
    );
    expect(cleanProjection).not.toContain(
      "review_policy.reviewer_blocking_min_severity=P3"
    );

    expect(findingsProjection).toContain(
      "review_policy.reviewer_blocking_min_severity=P1"
    );
    expect(findingsProjection).toContain(
      "Findings below that threshold (for example `P2/P3`-only sets) are advisory for routing after `severity_gate_round`"
    );
    expect(findingsProjection).not.toContain(
      "review_policy.reviewer_blocking_min_severity=P3"
    );
  });

  it("fails closed to findings projection in round>=2 when variant is omitted", () => {
    const projection = buildReviewerRoundCommandGateProjection({
      round: 2
    });

    expect(projection).toContain(REVIEWER_COMMAND_GATE_REQ_E);
    expect(projection).toContain(REVIEWER_COMMAND_GATE_REQ_C);
    expect(projection).toContain(REVIEWER_COMMAND_GATE_REQ_D);
    expect(projection).toContain(REVIEWER_COMMAND_GATE_REQ_F);
    expect(projection).not.toContain(REVIEWER_COMMAND_GATE_REQ_B);
  });

  it("documents document-scope blocker vs threshold-routing command semantics", () => {
    const instruction = buildReviewerFindingsPassInstruction("document");

    expect(instruction).toContain(
      "canonical `pairflow agent emit --kind pass ... --finding ...` for blocker-grade `P0/P1` requires strict qualifiers"
    );
    expect(instruction).toContain(
      "unqualified document-scope `P0/P1` entries are treated as `P2` for post-gate routing-threshold evaluation"
    );
    expect(instruction).toContain(
      "review_policy.reviewer_blocking_min_severity=P3"
    );
  });

  it("projects non-default threshold authority into document-scope findings guidance", () => {
    const instruction = buildReviewerFindingsPassInstruction("document", {
      reviewerBlockingMinSeverity: "P1"
    });

    expect(instruction).toContain(
      "unqualified document-scope `P0/P1` entries are treated as `P2` for post-gate routing-threshold evaluation"
    );
    expect(instruction).toContain(
      "review_policy.reviewer_blocking_min_severity=P1"
    );
    expect(instruction).toContain(
      "Findings below that threshold (for example `P2/P3`-only sets) are advisory for routing after `severity_gate_round`"
    );
    expect(instruction).not.toContain(
      "review_policy.reviewer_blocking_min_severity=P3"
    );
  });

  it("keeps explicit pass-with-finding guidance for code scope threshold matches", () => {
    const instruction = buildReviewerFindingsPassInstruction("code");

    expect(instruction).toContain(
      "If findings meeting the current post-gate blocking threshold remain"
    );
    expect(instruction).toContain(
      "`pairflow agent emit --kind pass --repo <repo> --bubble-id <id> --handoff-id <handoff-id> --execution-id <execution-id> --summary ... --finding '<severity>:...|artifact://...'`"
    );
  });

  it("retains known forbidden command phrases for drift detection", () => {
    expect(REVIEWER_COMMAND_GATE_FORBIDDEN).toContain(
      "If review round is 2 or higher and you have blocker findings: use `pairflow agent emit --kind convergence ...`."
    );
    expect(REVIEWER_COMMAND_GATE_FORBIDDEN).toContain(
      "Use `pairflow agent emit --kind pass ... --no-findings` for clean path in round 2 or higher."
    );
  });
});
