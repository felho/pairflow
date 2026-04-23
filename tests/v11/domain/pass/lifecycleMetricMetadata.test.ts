import { describe, expect, it } from "vitest";

import { buildPassLifecycleMetricMetadata } from "../../../../src/v11/domain/pass/lifecycleMetricMetadata.js";

describe("buildPassLifecycleMetricMetadata", () => {
  it("builds canonical pass lifecycle metadata with findings and repeat-clean fields", () => {
    const metadata = buildPassLifecycleMetricMetadata({
      passIntent: "review",
      inferredIntent: true,
      sender: "codex",
      recipient: "claude",
      recipientRole: "reviewer",
      refsCount: 2,
      hasFindings: true,
      noFindings: false,
      reviewerFindingsClaim: {
        state: "open",
        source: "payload_findings_count"
      },
      reviewerFindingsClaimParserMetadata: {
        parserState: "open",
        parserDivergence: false
      },
      transitionDecision: "normal_pass",
      repeatCleanReasonCode: "REPEAT_CLEAN_TRIGGER_NOT_MET",
      repeatCleanReasonDetail: "base_precondition_not_met",
      repeatCleanTrigger: false,
      mostRecentPreviousReviewerCleanPassEnvelope: false,
      findings: [{ title: "P1 finding", priority: "P1" }]
    });

    expect(metadata).toMatchObject({
      pass_intent: "review",
      inferred_intent: true,
      sender: "codex",
      recipient: "claude",
      recipient_role: "reviewer",
      refs_count: 2,
      has_findings: true,
      no_findings: false,
      findings_claim_state: "open",
      findings_claim_source: "payload_findings_count",
      findings_claim_parser_state: "open",
      findings_claim_parser_divergence: false,
      transition_decision: "normal_pass",
      repeat_clean_trigger: false,
      repeat_clean_reason_code: "REPEAT_CLEAN_TRIGGER_NOT_MET",
      repeat_clean_reason_detail: "base_precondition_not_met",
      most_recent_previous_reviewer_pass_is_clean: false,
      most_recent_previous_reviewer_clean_pass_envelope: false,
      p0: 0,
      p1: 1,
      p2: 0,
      p3: 0
    });
  });

  it("includes optional reviewer test and doc-gate failure metadata when provided", () => {
    const metadata = buildPassLifecycleMetricMetadata({
      passIntent: "review",
      inferredIntent: false,
      sender: "claude",
      recipient: "human",
      recipientRole: "human",
      refsCount: 0,
      hasFindings: false,
      noFindings: true,
      transitionDecision: "auto_converge",
      repeatCleanReasonCode: "REPEAT_CLEAN_AUTOCONVERGE_TRIGGERED",
      repeatCleanReasonDetail: "previous_reviewer_pass_clean",
      repeatCleanTrigger: true,
      mostRecentPreviousReviewerCleanPassEnvelope: true,
      findings: [],
      reviewerTestDirective: {
        skip_full_rerun: true,
        reason_code: "no_trigger",
        reason_detail: "docs-only scope, runtime checks not required",
        verification_status: "trusted"
      },
      docGateArtifactWriteFailureReason: "EACCES"
    });

    expect(metadata).toMatchObject({
      reviewer_test_evidence_decision: "skip_full_rerun",
      reviewer_test_evidence_reason_code: "no_trigger",
      reviewer_test_evidence_verification_status: "trusted",
      doc_gate_artifact_write_failed: true,
      doc_gate_artifact_write_failure_reason: "EACCES",
      p0: 0,
      p1: 0,
      p2: 0,
      p3: 0
    });
  });

  it("projects meta-review recipient role without collapsing it to reviewer semantics", () => {
    const metadata = buildPassLifecycleMetricMetadata({
      passIntent: "review",
      inferredIntent: false,
      sender: "claude",
      recipient: "codex",
      recipientRole: "meta_reviewer",
      refsCount: 1,
      hasFindings: false,
      noFindings: true,
      transitionDecision: "normal_pass",
      repeatCleanReasonCode: "REPEAT_CLEAN_TRIGGER_NOT_MET",
      repeatCleanReasonDetail: "base_precondition_not_met",
      repeatCleanTrigger: false,
      mostRecentPreviousReviewerCleanPassEnvelope: false,
      findings: []
    });

    expect(metadata).toMatchObject({
      recipient: "codex",
      recipient_role: "meta_reviewer",
      refs_count: 1,
      has_findings: false,
      no_findings: true,
      p0: 0,
      p1: 0,
      p2: 0,
      p3: 0
    });
  });
});
