import { describe, expect, it } from "vitest";

function toErrorMessage(input: PairflowCommandErrorInput): string {
  if (typeof input === "string") {
    return input;
  }
  return (input.reasonCode !== undefined ? input.reasonCode + ": " : "") + input.message;
}

import type { Finding } from "../../../../src/types/findings.js";
import { prepareReviewerPass } from "../../../../src/v11/application/pass/internal/reviewerDelivery/reviewerPassPreparation.js";

describe("prepareReviewerPass", () => {
  it("returns empty result for implementer when reviewer-only flags are not present", () => {
    const result = prepareReviewerPass({
      senderRole: "implementer",
      round: 1,
      noFindings: false,
      findings: [],
      hasFindings: false,
      findingsPayloadInvalid: false,
      reviewArtifactType: "code",
      severityGateRound: 2,
      reviewerBlockingMinSeverity: "P3",
      summary: "handoff",
      createError: (message: PairflowCommandErrorInput) => new Error(toErrorMessage(message))
    });

    expect(result).toEqual({});
  });

  it("throws when implementer passes reviewer-only findings flags", () => {
    const findings: Finding[] = [{ title: "p1", priority: "P1" }];

    expect(() =>
      prepareReviewerPass({
        senderRole: "implementer",
        round: 1,
        noFindings: false,
        findings,
        hasFindings: true,
        findingsPayloadInvalid: false,
        reviewArtifactType: "document",
        severityGateRound: 2,
        reviewerBlockingMinSeverity: "P3",
        summary: "handoff",
        createError: (message: PairflowCommandErrorInput) => new Error(toErrorMessage(message))
      })
    ).toThrow("Implementer PASS does not accept findings flags; findings are reviewer-only.");
  });

  it("orchestrates reviewer validation and claim resolution in order", () => {
    const findings: Finding[] = [{ title: "p2", priority: "P2" }];
    const callOrder: string[] = [];

    const result = prepareReviewerPass(
      {
        senderRole: "reviewer",
        round: 3,
        noFindings: false,
        findings,
        hasFindings: true,
        findingsPayloadInvalid: false,
        reviewArtifactType: "document",
        severityGateRound: 2,
        reviewerBlockingMinSeverity: "P2",
        summary: "Reviewer found one issue.",
        createError: (message: PairflowCommandErrorInput) => new Error(toErrorMessage(message))
      },
      {
        validateReviewerPassGate: (input) => {
          callOrder.push("validate");
          expect(input.reviewerBlockingMinSeverity).toBe("P2");
        },
        assertReviewerNoFindingsSummaryConsistency: () => {
          callOrder.push("summary-consistency");
        },
        inferReviewerPassIntent: () => {
          callOrder.push("infer-intent");
          return "fix_request";
        },
        resolveReviewerFindingsClaim: () => {
          callOrder.push("resolve-claim");
          return {
            state: "open_findings",
            source: "payload_findings_count"
          };
        },
        resolveReviewerFindingsClaimParserMetadata: () => {
          callOrder.push("resolve-parser-metadata");
          return {
            parserState: "open_findings",
            parserDivergence: false
          };
        }
      }
    );

    expect(callOrder).toEqual([
      "validate",
      "summary-consistency",
      "infer-intent",
      "resolve-claim",
      "resolve-parser-metadata"
    ]);
    expect(result.inferredReviewerIntent).toBe("fix_request");
    expect(result.reviewerFindingsClaim).toEqual({
      state: "open_findings",
      source: "payload_findings_count"
    });
    expect(result.reviewerFindingsClaimParserMetadata).toEqual({
      parserState: "open_findings",
      parserDivergence: false
    });
  });
});
