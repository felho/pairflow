import { describe, expect, it } from "vitest";

import {
  buildResumeReviewerKickoffMessage,
  inferResumeReviewerProjectionVariant
} from "../../../../src/v11/shared/start/startCommandResumeKickoffMessageBuilders.js";

describe("startCommandResumeKickoffMessageBuilders", () => {
  it("keeps clean projection for round<=1 regardless of summary tokens", () => {
    expect(
      inferResumeReviewerProjectionVariant({
        round: 1,
        transcriptSummary: "resume-summary: reviewer-active findings=5"
      })
    ).toBe("clean");
    expect(
      inferResumeReviewerProjectionVariant({
        round: 0,
        transcriptSummary: "resume-summary: reviewer-active findings=unknown"
      })
    ).toBe("clean");
  });

  it("fails closed to findings projection when round>=2 summary cannot prove zero findings", () => {
    expect(
      inferResumeReviewerProjectionVariant({
        round: 2,
        transcriptSummary: "resume-summary: reviewer-active"
      })
    ).toBe("findings");
    expect(
      inferResumeReviewerProjectionVariant({
        round: 2,
        transcriptSummary: "resume-summary: reviewer-active findings=NaN"
      })
    ).toBe("findings");
  });

  it("returns clean projection when all parsed findings counters are zero", () => {
    expect(
      inferResumeReviewerProjectionVariant({
        round: 3,
        transcriptSummary: "resume-summary: reviewer-active findings=0"
      })
    ).toBe("clean");
    expect(
      inferResumeReviewerProjectionVariant({
        round: 3,
        transcriptSummary: "resume-summary: reviewer-active findings=0 findings=0"
      })
    ).toBe("clean");
  });

  it("returns findings projection when any parsed findings counter is above zero", () => {
    expect(
      inferResumeReviewerProjectionVariant({
        round: 3,
        transcriptSummary: "resume-summary: reviewer-active findings=0 findings=2"
      })
    ).toBe("findings");
  });

  it("renders findings projection kickoff text with blocker-pass requirement in round>=2", () => {
    const message = buildResumeReviewerKickoffMessage({
      bubbleId: "b_start_resume_projection_01",
      worktreePath: "/tmp/worktree",
      round: 2,
      reviewArtifactType: "document",
      pairflowCommandProfile: "external",
      projectionVariant: "findings"
    });

    expect(message).toContain("resume kickoff (reviewer)");
    expect(message).toContain("If blocker findings remain under current scope policy, keep using `pairflow pass --finding`.");
    expect(message).toContain("Routing matrix (copy-paste)");
  });

  it("renders round<=1 kickoff with pass-only explicit findings declaration line", () => {
    const message = buildResumeReviewerKickoffMessage({
      bubbleId: "b_start_resume_projection_02",
      worktreePath: "/tmp/worktree",
      round: 1,
      reviewArtifactType: "document",
      pairflowCommandProfile: "external",
      projectionVariant: "findings"
    });

    expect(message).toContain("State is RUNNING at round 1.");
    expect(message).toContain("If review round is 1: do not use `pairflow converged`");
    expect(message).toContain("In round 1, use `pairflow pass --summary ...` and declare findings explicitly");
    expect(message).not.toContain(
      "Document scope: `pairflow pass --finding` for blockers is valid only"
    );
  });
});
