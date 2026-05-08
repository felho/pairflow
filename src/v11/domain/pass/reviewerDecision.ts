import type {
  BubbleReviewAutoReworkSeverity
} from "../../shared/reviewPolicy/reviewPolicyTypes.js";
import type {
  BubbleConfig
} from "../../shared/config/bubbleConfigTypes.js";
import {
  findingPriorities,
  resolveFindingPriority,
  type Finding,
  type FindingPriority
} from "../../../types/findings.js";
import type { PassIntent } from "../../../types/protocol.js";
import {
  evaluatePositiveSummaryFindingsAssertion,
  evaluateReviewerFindingsAggregate
} from "../../../v11/domain/convergence/policy.js";

const reviewerPassNonBlockingPostGateReasonCode =
  "REVIEWER_PASS_NON_BLOCKING_POST_GATE";
const reviewerPassNoFindingsPostGateReasonCode =
  "REVIEWER_PASS_NO_FINDINGS_POST_GATE";
const reviewerPassDecisionInvalidReasonCode = "REVIEWER_PASS_DECISION_INVALID";
const findingsPayloadInvalidReasonCode = "FINDINGS_PAYLOAD_INVALID";
const reviewerSummaryFindingsContradictionReasonCode =
  "REVIEWER_SUMMARY_FINDINGS_CONTRADICTION";

function raiseReviewerDecisionError(
  createError: PairflowCreateCommandError,
  input: {
    reasonCode: string;
    message: string;
    context?: Record<string, unknown>;
  }
): never {
  throw createError({
    reasonCode: input.reasonCode,
    message: input.message,
    context: {
      guard: "reviewer_pass_decision_input",
      ...(input.context ?? {})
    }
  });
}

function buildPostGateConvergedGuidance(input: {
  round: number;
  severityGateRound: number;
}): string {
  return `Use canonical convergence emit (\`pairflow agent emit --kind convergence ...\`) instead (round ${input.round} >= severity_gate_round ${input.severityGateRound}).`;
}

function priorityMeetsReviewerThreshold(input: {
  priority: FindingPriority;
  minSeverity: BubbleReviewAutoReworkSeverity;
}): boolean {
  return (
    findingPriorities.indexOf(input.priority)
    <= findingPriorities.indexOf(input.minSeverity)
  );
}

function resolveReviewerPostGateThresholdCategory(input: {
  highestEffectivePriority: FindingPriority | null;
}): "p3_only" | "below_threshold" {
  return input.highestEffectivePriority === "P3"
    ? "p3_only"
    : "below_threshold";
}

export function inferReviewerPassIntent(input: {
  hasFindings: boolean;
  noFindings: boolean;
  createError: PairflowCreateCommandError;
}): PassIntent {
  if (input.hasFindings && input.noFindings) {
    raiseReviewerDecisionError(
      input.createError,
      {
        reasonCode: reviewerPassDecisionInvalidReasonCode,
        message: "Reviewer PASS cannot use both --finding and --no-findings."
      }
    );
  }

  if (!input.hasFindings && !input.noFindings) {
    raiseReviewerDecisionError(
      input.createError,
      {
        reasonCode: findingsPayloadInvalidReasonCode,
        message:
          "Reviewer PASS requires explicit findings declaration: use --finding <P0|P1|P2|P3:Title[|ref1,ref2]> (repeatable) or --no-findings."
      }
    );
  }

  return input.noFindings ? "review" : "fix_request";
}

export function validateReviewerPassGate(input: {
  round: number;
  noFindings: boolean;
  findings: Finding[];
  findingsPayloadInvalid: boolean;
  reviewArtifactType: BubbleConfig["review_artifact_type"];
  severityGateRound: number;
  reviewerBlockingMinSeverity: BubbleReviewAutoReworkSeverity;
  createError: PairflowCreateCommandError;
}): void {
  const postGate = input.round >= input.severityGateRound;
  const invalidPayloadGuidance = postGate
    ? `Provide structured findings with severity/title (and optional refs), or use canonical convergence emit (\`pairflow agent emit --kind convergence ...\`) for clean/non-blocking outcomes. ${buildPostGateConvergedGuidance({
      round: input.round,
      severityGateRound: input.severityGateRound
    })}`
    : "Provide structured findings with severity/title (and optional refs) or use --no-findings explicitly for a clean review.";
  if (postGate && input.noFindings) {
    raiseReviewerDecisionError(
      input.createError,
      {
        reasonCode: reviewerPassNoFindingsPostGateReasonCode,
        message:
          `Reviewer PASS with --no-findings is not allowed after severity gate. ${buildPostGateConvergedGuidance({
            round: input.round,
            severityGateRound: input.severityGateRound
          })}`
      }
    );
  }

  if (input.findingsPayloadInvalid) {
    raiseReviewerDecisionError(
      input.createError,
      {
        reasonCode: findingsPayloadInvalidReasonCode,
        message: `Reviewer PASS findings payload is invalid. ${invalidPayloadGuidance}`
      }
    );
  }

  if (input.findings.length === 0 && !input.noFindings) {
    if (postGate) {
      raiseReviewerDecisionError(
        input.createError,
        {
          reasonCode: findingsPayloadInvalidReasonCode,
          message:
            `Reviewer PASS requires explicit structured findings in post-gate rounds. ${buildPostGateConvergedGuidance({
              round: input.round,
              severityGateRound: input.severityGateRound
            })}`
        }
      );
    }
    raiseReviewerDecisionError(
      input.createError,
      {
        reasonCode: findingsPayloadInvalidReasonCode,
        message:
          "Reviewer PASS requires explicit findings declaration: use --finding <P0|P1|P2|P3:Title[|ref1,ref2]> (repeatable) or --no-findings."
      }
    );
  }

  if (!postGate) {
    return;
  }

  const aggregate = evaluateReviewerFindingsAggregate({
    findings: input.findings,
    reviewArtifactType: input.reviewArtifactType
  });
  if (aggregate.invalid) {
    raiseReviewerDecisionError(
      input.createError,
      {
        reasonCode: findingsPayloadInvalidReasonCode,
        message: `Reviewer PASS findings payload is invalid. ${invalidPayloadGuidance}`
      }
    );
  }
  if (
    aggregate.highestEffectivePriority !== null
    && priorityMeetsReviewerThreshold({
      priority: aggregate.highestEffectivePriority,
      minSeverity: input.reviewerBlockingMinSeverity
    })
  ) {
    return;
  }

  const thresholdCategory = resolveReviewerPostGateThresholdCategory({
    highestEffectivePriority: aggregate.highestEffectivePriority
  });
  const p3Only = thresholdCategory === "p3_only";
  const hasDeclaredCanonicalBlocker = input.findings.some((finding) => {
    const priority = resolveFindingPriority({
      priority: finding.priority,
      severity: finding.severity
    });
    return priority === "P0" || priority === "P1";
  });
  const docScopeQualifierNote =
    input.reviewArtifactType === "document" && hasDeclaredCanonicalBlocker
      ? " Document scope qualifier: blocker findings require strict `timing=required-now` + `layer=L1`; CLI `--finding` cannot encode these qualifiers, so unqualified `P0/P1` entries are treated as non-blocking."
      : "";
  raiseReviewerDecisionError(
    input.createError,
    {
      reasonCode: reviewerPassNonBlockingPostGateReasonCode,
      message:
        `Reviewer PASS is not allowed after severity gate when no findings meet review_policy.reviewer_blocking_min_severity=${input.reviewerBlockingMinSeverity}${aggregate.highestEffectivePriority !== null ? ` (highest effective open severity=${aggregate.highestEffectivePriority})` : ""}${p3Only ? " (P3-only finding set)." : "."}${docScopeQualifierNote} ${buildPostGateConvergedGuidance({
          round: input.round,
          severityGateRound: input.severityGateRound
        })}`,
      context: {
        configuredMinSeverity: input.reviewerBlockingMinSeverity,
        highestEffectiveOpenSeverity: aggregate.highestEffectivePriority,
        thresholdCategory,
        reviewArtifactType: input.reviewArtifactType,
        declaredCanonicalBlockerPresent: hasDeclaredCanonicalBlocker
      }
    }
  );
}

export function assertReviewerNoFindingsSummaryConsistency(input: {
  summary: string;
  noFindings: boolean;
  createError: PairflowCreateCommandError;
}): void {
  if (!input.noFindings) {
    return;
  }

  const summaryAssertion = evaluatePositiveSummaryFindingsAssertion(input.summary);
  if (!summaryAssertion.hasPositiveAssertion) {
    return;
  }

  raiseReviewerDecisionError(
    input.createError,
    {
      reasonCode: reviewerSummaryFindingsContradictionReasonCode,
      message:
        "Reviewer PASS with --no-findings cannot include positive findings/severity summary assertions. Remove positive findings language from --summary or provide structured --finding entries."
    }
  );
}
