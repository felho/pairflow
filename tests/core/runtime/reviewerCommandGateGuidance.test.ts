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
} from "../../../src/core/runtime/reviewerCommandGateGuidance.js";

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
    expect(text).toContain("advisory findings must be passed as structured `--finding` entries and are limited to `P2/P3`");
    expect(text).toContain("Forbidden consistency patterns: summary-only finding claims without structured `--finding`");
    expect(text).toContain("clean/no findings");
    expect(text).toContain("blocker -> `pairflow agent emit --kind pass");
    expect(text).toContain("advisory-only (`P2/P3`) -> `pairflow agent emit --kind convergence");
    expect(text).toContain("clean -> `pairflow agent emit --kind convergence");
    expect(text).not.toContain(REVIEWER_COMMAND_GATE_REQ_E);
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

  it("documents document-scope blocker vs advisory command routing", () => {
    const instruction = buildReviewerFindingsPassInstruction("document");

    expect(instruction).toContain(
      "canonical `pairflow agent emit --kind pass ... --finding ...` for blockers is valid only"
    );
    expect(instruction).toContain(
      "`pairflow agent emit --kind convergence ... --finding ...` (`P2/P3` only)"
    );
    expect(instruction).toContain("plain canonical convergence when clean");
  });

  it("keeps explicit pass-with-finding guidance for code scope blockers", () => {
    const instruction = buildReviewerFindingsPassInstruction("code");

    expect(instruction).toContain("If blocker findings (`P0/P1`) remain");
    expect(instruction).toContain(
      "`pairflow agent emit --kind pass --repo <repo> --bubble-id <id> --handoff-id <handoff-id> --summary ... --finding 'P1:...|artifact://...'`"
    );
  });

  it("retains known forbidden command phrases for drift detection", () => {
    expect(REVIEWER_COMMAND_GATE_FORBIDDEN).toContain(
      "If review round is 2 or higher and you have blocker findings: use `pairflow converged`."
    );
    expect(REVIEWER_COMMAND_GATE_FORBIDDEN).toContain(
      "Use `pairflow pass --no-findings` for clean path in round 2 or higher."
    );
  });
});
