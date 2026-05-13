import { describe, expect, it } from "vitest";

function toErrorMessage(input: PairflowCommandErrorInput): string {
  if (typeof input === "string") {
    return input;
  }
  return (input.reasonCode !== undefined ? input.reasonCode + ": " : "") + input.message;
}

import type { Finding } from "../../../../src/contracts/kernel/findings.js";
import {
  resolveReviewerFindingsClaim,
  resolveReviewerFindingsClaimParserMetadata
} from "../../../../src/v11/domain/pass/reviewerFindingsClaim.js";

class TestReviewerFindingsClaimError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "TestReviewerFindingsClaimError";
  }
}

function createError(message: PairflowCommandErrorInput): Error {
  return new TestReviewerFindingsClaimError(toErrorMessage(message));
}

describe("resolveReviewerFindingsClaim", () => {
  const blockingFinding: Finding = {
    severity: "P1",
    title: "Blocking defect"
  };

  it("returns clean claim when --no-findings is set", () => {
    const claim = resolveReviewerFindingsClaim({
      noFindings: true,
      findings: [],
      createError
    });
    expect(claim).toEqual({
      state: "clean",
      source: "payload_flags"
    });
  });

  it("keeps no-findings precedence even when findings payload is present", () => {
    const claim = resolveReviewerFindingsClaim({
      noFindings: true,
      findings: [blockingFinding],
      createError
    });
    expect(claim).toEqual({
      state: "clean",
      source: "payload_flags"
    });
  });

  it("returns open_findings claim when findings list is non-empty", () => {
    const claim = resolveReviewerFindingsClaim({
      noFindings: false,
      findings: [blockingFinding],
      createError
    });
    expect(claim).toEqual({
      state: "open_findings",
      source: "payload_findings_count"
    });
  });

  it("throws invalid payload error when neither flag nor findings are present", () => {
    expect(() =>
      resolveReviewerFindingsClaim({
        noFindings: false,
        findings: [],
        createError
      })
    ).toThrowError(
      new TestReviewerFindingsClaimError(
        "FINDINGS_PAYLOAD_INVALID: Reviewer PASS requires explicit findings declaration: use --finding <P0|P1|P2|P3:Title[|ref1,ref2]> (repeatable) or --no-findings."
      )
    );
  });
});

describe("resolveReviewerFindingsClaimParserMetadata", () => {
  it("marks divergence when parser detects open findings but structured claim is clean", () => {
    const metadata = resolveReviewerFindingsClaimParserMetadata({
      summary: "There is 1 open finding remaining in this round.",
      claimState: "clean"
    });
    expect(metadata).toEqual({
      parserState: "open_findings",
      parserDivergence: true
    });
  });

  it("does not mark divergence when both parser and structured claim are non-open", () => {
    const metadata = resolveReviewerFindingsClaimParserMetadata({
      summary: "No open issues were found in this review.",
      claimState: "unknown"
    });
    expect(metadata).toEqual({
      parserState: "unknown",
      parserDivergence: false
    });
  });
});
