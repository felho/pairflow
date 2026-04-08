import type { AgentName, ReviewArtifactType } from "../../../types/bubble.js";
import {
  isFindingsClaimSource,
  isFindingsClaimState,
  type FindingsClaimSource,
  type FindingsClaimState,
  type ProtocolEnvelope
} from "../../../types/protocol.js";
import { isRecord } from "../../shared/validation/primitives.js";
import {
  claimParserDivergenceDiagnosticReasonCode,
  claimSourceInvalidReasonCode,
  claimSourcePayloadFindingsCountFallbackDiagnosticReasonCode,
  claimStateRequiredReasonCode,
  claimStateRequiredSuppressedDiagnosticReasonCode,
} from "./policyCodes.js";
import { evaluateReviewerFindingsAggregate } from "./policyReviewerAggregate.js";
import { resolveLegacySummaryFindingsClaimState } from "./policySummaryAssertions.js";
import type { ConvergencePolicyInput } from "./policyTypes.js";

interface PreviousReviewerVerdict {
  type: "PASS" | "CONVERGENCE";
  payload: Record<string, unknown>;
}

export interface StructuredPassFindingsClaim {
  state: FindingsClaimState;
  source: FindingsClaimSource;
}

interface StructuredPassFindingsClaimResolution {
  claim: StructuredPassFindingsClaim | undefined;
  errors: string[];
  usedCountFallback: boolean;
}

export const previousReviewerPassMissingError =
  "CONVERGENCE_PREVIOUS_REVIEWER_PASS_MISSING: Convergence requires a previous reviewer PASS or CONVERGENCE verdict from the prior round.";
export const previousReviewerPassFindingsCountError =
  "Convergence requires previous reviewer PASS to include payload.findings so blocker parity can be evaluated deterministically.";

function resolvePreviousReviewerVerdict(input: {
  transcript: readonly ProtocolEnvelope[];
  previousRound: number;
  reviewer: AgentName;
  implementer: AgentName;
}): PreviousReviewerVerdict | undefined {
  if (input.previousRound < 1) {
    return undefined;
  }

  for (let index = input.transcript.length - 1; index >= 0; index -= 1) {
    const envelope = input.transcript[index];
    if (envelope === undefined) {
      continue;
    }
    if (envelope.round !== input.previousRound) {
      continue;
    }
    if (envelope.type !== "PASS" && envelope.type !== "CONVERGENCE") {
      continue;
    }
    if (envelope.sender !== input.reviewer) {
      continue;
    }
    if (envelope.type === "PASS" && envelope.recipient !== input.implementer) {
      continue;
    }
    if (envelope.type === "CONVERGENCE" && envelope.recipient !== "orchestrator") {
      continue;
    }

    return {
      type: envelope.type,
      payload: isRecord(envelope.payload) ? envelope.payload : {}
    };
  }

  return undefined;
}

function resolveStructuredPassFindingsClaim(input: {
  payload: Record<string, unknown>;
}): StructuredPassFindingsClaimResolution {
  const errors: string[] = [];
  const stateRaw = input.payload.findings_claim_state;
  const sourceRaw = input.payload.findings_claim_source;
  const hasState = isFindingsClaimState(stateRaw);
  const hasSource = isFindingsClaimSource(sourceRaw);
  const findings = input.payload.findings;

  if (!hasState && !hasSource) {
    if (Array.isArray(findings)) {
      return {
        claim: {
          state: findings.length === 0 ? "clean" : "open_findings",
          source: "payload_findings_count"
        },
        errors,
        usedCountFallback: true
      };
    }

    return {
      claim: undefined,
      errors,
      usedCountFallback: false
    };
  }

  if (hasState && !hasSource) {
    errors.push(
      "CLAIM_SOURCE_INVALID: previous reviewer PASS findings_claim_source is required when findings_claim_state is provided."
    );
  }
  if (!hasState && hasSource) {
    errors.push(
      "CLAIM_STATE_REQUIRED: previous reviewer PASS findings_claim_state is required when findings_claim_source is provided."
    );
  }

  if (!hasState || !hasSource) {
    return {
      claim: undefined,
      errors,
      usedCountFallback: false
    };
  }

  return {
    claim: {
      state: stateRaw,
      source: sourceRaw
    },
    errors,
    usedCountFallback: false
  };
}

function hasOpenClaimParserDivergence(input: {
  structuredState: FindingsClaimState;
  parserState: FindingsClaimState;
}): boolean {
  return (
    (input.structuredState === "clean" && input.parserState === "open_findings")
    || (input.structuredState === "open_findings" && input.parserState === "clean")
  );
}

function appendStructuredClaimIssues(input: {
  claimResolution: StructuredPassFindingsClaimResolution;
  parserClaimState: FindingsClaimState;
  currentRound: number;
  severityGateRound: number;
  errors: string[];
  diagnostics: string[];
}): StructuredPassFindingsClaim | undefined {
  const { claimResolution, parserClaimState, currentRound, severityGateRound } = input;

  if (
    claimResolution.usedCountFallback
    && currentRound >= severityGateRound
  ) {
    input.diagnostics.push(
      `${claimSourcePayloadFindingsCountFallbackDiagnosticReasonCode}: post_gate=true source=payload_findings_count explicit_claim=false.`
    );
  }

  if (claimResolution.claim === undefined) {
    if (claimResolution.errors.length === 0) {
      input.errors.push(
        `${claimStateRequiredReasonCode}: Convergence requires previous reviewer PASS to declare structured findings claim state/source (payload flags or findings count).`
      );
    } else {
      input.diagnostics.push(
        `${claimStateRequiredSuppressedDiagnosticReasonCode}: missing_claim_generic_error_suppressed due_to=${claimResolution.errors.length}_claim_error(s).`
      );
    }
    if (parserClaimState === "open_findings") {
      input.diagnostics.push(
        `${claimParserDivergenceDiagnosticReasonCode}: parser_state=open_findings structured_state=missing.`
      );
    }
    return undefined;
  }

  if (claimResolution.claim.source === "legacy_summary_parser") {
    input.errors.push(
      `${claimSourceInvalidReasonCode}: Convergence requires structured claim source; legacy_summary_parser is compatibility-only.`
    );
  }
  if (claimResolution.claim.state === "unknown") {
    input.errors.push(
      `${claimStateRequiredReasonCode}: Convergence requires determinate findings claim state; received unknown.`
    );
  }
  if (
    hasOpenClaimParserDivergence({
      structuredState: claimResolution.claim.state,
      parserState: parserClaimState
    })
  ) {
    input.diagnostics.push(
      `${claimParserDivergenceDiagnosticReasonCode}: parser_state=${parserClaimState} structured_state=${claimResolution.claim.state} structured_source=${claimResolution.claim.source}.`
    );
  }

  return claimResolution.claim;
}

function appendFindingsParityIssues(input: {
  claim: StructuredPassFindingsClaim | undefined;
  findingsAggregate: ReturnType<typeof evaluateReviewerFindingsAggregate>;
  currentRound: number;
  severityGateRound: number;
  reviewArtifactType: ReviewArtifactType;
  errors: string[];
}): void {
  if (input.findingsAggregate.missing) {
    input.errors.push(previousReviewerPassFindingsCountError);
    return;
  }
  if (input.findingsAggregate.invalid) {
    input.errors.push(
      "Convergence blocked: previous reviewer PASS has invalid findings payload."
    );
    return;
  }
  if (input.claim === undefined) {
    return;
  }

  if (
    input.claim.state === "clean" &&
    input.findingsAggregate.findingCount > 0
  ) {
    input.errors.push(
      `${claimSourceInvalidReasonCode}: Convergence blocked because findings_claim_state=clean but payload.findings contains ${input.findingsAggregate.findingCount} item(s).`
    );
    return;
  }
  if (
    input.claim.state === "open_findings" &&
    input.findingsAggregate.findingCount === 0
  ) {
    input.errors.push(
      `${claimSourceInvalidReasonCode}: Convergence blocked because findings_claim_state=open_findings but payload.findings is empty.`
    );
    return;
  }
  if (
    input.claim.state === "open_findings"
    && input.findingsAggregate.hasBlocking
    && (
      input.currentRound < input.severityGateRound
      || input.reviewArtifactType === "document"
    )
  ) {
    input.errors.push(
      "Convergence blocked: previous reviewer PASS still contains open P0/P1 findings."
    );
  }
}

function hasUnresolvedHumanQuestion(transcript: readonly ProtocolEnvelope[]): boolean {
  let humanQuestions = 0;
  let humanReplies = 0;
  for (const envelope of transcript) {
    if (envelope.type === "HUMAN_QUESTION") {
      humanQuestions += 1;
    } else if (envelope.type === "HUMAN_REPLY") {
      humanReplies += 1;
    }
  }
  return humanQuestions > humanReplies;
}

export function validatePreviousReviewerVerdict(
  input: ConvergencePolicyInput,
  errors: string[],
  diagnostics: string[]
): void {
  const previousRound = input.currentRound - 1;
  const previousReviewerVerdict = resolvePreviousReviewerVerdict({
    transcript: input.transcript,
    reviewer: input.reviewer,
    implementer: input.implementer,
    previousRound
  });

  if (previousRound < 1 || previousReviewerVerdict === undefined) {
    errors.push(previousReviewerPassMissingError);
    return;
  }

  if (previousReviewerVerdict.type !== "PASS") {
    return;
  }

  const claimResolution = resolveStructuredPassFindingsClaim({
    payload: previousReviewerVerdict.payload
  });
  errors.push(...claimResolution.errors);

  const findingsAggregate = evaluateReviewerFindingsAggregate({
    findings: previousReviewerVerdict.payload.findings,
    reviewArtifactType: input.reviewArtifactType
  });
  const parserClaimState = resolveLegacySummaryFindingsClaimState(
    previousReviewerVerdict.payload.summary as string | undefined
  );
  const claim = appendStructuredClaimIssues({
    claimResolution,
    parserClaimState,
    currentRound: input.currentRound,
    severityGateRound: input.severity_gate_round,
    errors,
    diagnostics
  });
  appendFindingsParityIssues({
    claim,
    findingsAggregate,
    currentRound: input.currentRound,
    severityGateRound: input.severity_gate_round,
    reviewArtifactType: input.reviewArtifactType,
    errors
  });
}

export function validateHumanQuestions(
  input: ConvergencePolicyInput,
  errors: string[]
): void {
  if (hasUnresolvedHumanQuestion(input.transcript)) {
    errors.push("Convergence blocked: unresolved HUMAN_QUESTION exists.");
  }
}
