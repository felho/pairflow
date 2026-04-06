import { resolveLegacySummaryFindingsClaimState } from "../../../v11/domain/convergence/policy.js";
import type { Finding } from "../../../types/findings.js";
import type {
  FindingsClaimSource,
  FindingsClaimState
} from "../../../types/protocol.js";

const findingsPayloadInvalidReasonCode = "FINDINGS_PAYLOAD_INVALID";

export interface ReviewerFindingsClaim {
  state: FindingsClaimState;
  source: FindingsClaimSource;
}

export interface ReviewerFindingsClaimParserMetadata {
  parserState: FindingsClaimState;
  parserDivergence: boolean;
}

function raiseReviewerFindingsClaimError(
  createError: PairflowCreateCommandError,
  message: string
): never {
  throw createError({
    reasonCode: findingsPayloadInvalidReasonCode,
    message,
    context: {
      guard: "reviewer_findings_claim_input"
    }
  });
}

export function resolveReviewerFindingsClaim(input: {
  noFindings: boolean;
  findings: Finding[];
  createError: PairflowCreateCommandError;
}): ReviewerFindingsClaim {
  if (input.noFindings) {
    return {
      state: "clean",
      source: "payload_flags"
    };
  }
  if (input.findings.length > 0) {
    return {
      state: "open_findings",
      source: "payload_findings_count"
    };
  }
  raiseReviewerFindingsClaimError(
    input.createError,
    "Reviewer PASS requires explicit findings declaration: use --finding <P0|P1|P2|P3:Title[|ref1,ref2]> (repeatable) or --no-findings."
  );
}

export function resolveReviewerFindingsClaimParserMetadata(input: {
  summary: string;
  claimState: FindingsClaimState;
}): ReviewerFindingsClaimParserMetadata {
  const parserState = resolveLegacySummaryFindingsClaimState(input.summary);
  const parserDivergence =
    (parserState === "open_findings" && input.claimState !== "open_findings") ||
    (parserState !== "open_findings" && input.claimState === "open_findings");
  return {
    parserState,
    parserDivergence
  };
}
