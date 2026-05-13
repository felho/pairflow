import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { appendHumanApprovalRequestEnvelope as appendHumanApprovalRequestEnvelopeImpl } from "../../../src/v11/application/metaReviewGate/internal/humanGate/approvalRequestEnvelope.js";
import type { Finding } from "../../../src/contracts/kernel/findings.js";
import type { AgentName } from "../../../src/contracts/kernel/agentIdentity.js";
import { deliveryTargetRoleMetadataKey } from "../../../src/v11/shared/delivery/deliveryTargetMetadataContract.js";
import type { FindingsParityMetadata } from "../../../src/v11/shared/metaReviewGate/findingsParityMetadataContract.js";
import type { ProtocolEnvelope } from "../../../src/v11/shared/protocol/protocolEnvelopeContract.js";
import {
  appendProtocolEnvelope,
  type AppendProtocolEnvelopeResult,
  type AppendProtocolEnvelopeInput
} from "../../../src/v11/infrastructure/artifact/transcript/transcriptStore.js";
import { buildMetaReviewSubmitAdvisoryOnlyCorrectionNote } from "../../../src/v11/shared/metaReview/metaReviewSubmitGuidance.js";
import type { MetaReviewGateThresholdMetadata } from "../../../src/v11/shared/metaReviewGate/index.js";

const tempDirs: string[] = [];

async function createTempDir(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-approval-envelope-"));
  tempDirs.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((path) =>
      rm(path, { recursive: true, force: true })
    )
  );
});

function createAppendEnvelopeStub(now: Date): {
  appendEnvelope: (input: AppendProtocolEnvelopeInput) => Promise<AppendProtocolEnvelopeResult>;
  calls: AppendProtocolEnvelopeInput[];
} {
  const calls: AppendProtocolEnvelopeInput[] = [];
  return {
    appendEnvelope: async (input) => {
      calls.push(input);
      const envelope: ProtocolEnvelope = {
        id: "msg_approval_env_test_001",
        ts: now.toISOString(),
        ...input.envelope
      };
      return {
        envelope,
        sequence: 1,
        mirrorWriteFailures: []
      };
    },
    calls
  };
}

type AppendHumanApprovalRequestEnvelopeInput = Parameters<
  typeof appendHumanApprovalRequestEnvelopeImpl
>[0];

async function appendHumanApprovalRequestEnvelope(
  input: Omit<AppendHumanApprovalRequestEnvelopeInput, "metaReviewerAgent"> & {
    metaReviewerAgent?: AgentName;
  }
) {
  return await appendHumanApprovalRequestEnvelopeImpl({
    ...input,
    metaReviewerAgent: input.metaReviewerAgent ?? "codex"
  });
}

async function appendReviewerSnapshot(input: {
  transcriptPath: string;
  lockPath: string;
  bubbleId: string;
  round: number;
  now: Date;
  findings?: Finding[];
  advisoryFindingsOpenTotal?: number;
}): Promise<void> {
  await appendProtocolEnvelope({
    transcriptPath: input.transcriptPath,
    lockPath: input.lockPath,
    now: input.now,
    envelope: {
      bubble_id: input.bubbleId,
      sender: "claude",
      recipient: "orchestrator",
      type: "CONVERGENCE",
      round: input.round,
      payload: {
        summary: "Reviewer converged snapshot.",
        ...(input.findings !== undefined ? { findings: input.findings } : {}),
        ...(input.advisoryFindingsOpenTotal !== undefined
          ? {
              metadata: {
                advisory_findings_open_total: input.advisoryFindingsOpenTotal
              }
            }
          : {})
      },
      refs: []
    }
  });
}

describe("appendHumanApprovalRequestEnvelope", () => {
  it("keeps approve-route summary unchanged when parity metadata is consistent", async () => {
    const now = new Date("2026-03-14T12:30:00.000Z");
    const stub = createAppendEnvelopeStub(now);

    const originalSummary = "R18 review: 5 deduplicated findings, all non-blocking.";
    const result = await appendHumanApprovalRequestEnvelope({
      appendEnvelope: stub.appendEnvelope,
      transcriptPath: "/tmp/transcript.ndjson",
      inboxPath: "/tmp/inbox.ndjson",
      lockPath: "/tmp/bubble.lock",
      now,
      bubbleId: "b_approval_env_consistent_01",
      round: 18,
      summary: originalSummary,
      route: "human_gate_approve",
      refs: [],
      recommendation: "approve",
      parityMetadata: {
        findings_claimed_open_total: 0,
        findings_artifact_open_total: 0,
        findings_blocking_open_total: 0,
        findings_advisory_open_total: 0,
        findings_artifact_status: "available",
        findings_digest_sha256:
          "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        meta_review_run_id: "run_approval_env_consistent_01",
        findings_parity_status: "ok"
      }
    });

    expect(result.envelope.payload.summary).toBe(originalSummary);
    expect(result.envelope.payload.metadata).toMatchObject({
      [deliveryTargetRoleMetadataKey]: "status",
      latest_recommendation: "approve",
      meta_review_gate_route: "human_gate_approve"
    });
    expect(result.envelope.payload.metadata?.approval_summary_normalized).toBeUndefined();
  });

  it("emits the configured meta-reviewer agent in approval-request metadata", async () => {
    const now = new Date("2026-03-14T12:30:30.000Z");
    const stub = createAppendEnvelopeStub(now);

    const result = await appendHumanApprovalRequestEnvelope({
      appendEnvelope: stub.appendEnvelope,
      transcriptPath: "/tmp/transcript.ndjson",
      inboxPath: "/tmp/inbox.ndjson",
      lockPath: "/tmp/bubble.lock",
      now,
      bubbleId: "b_approval_env_meta_reviewer_agent_01",
      round: 18,
      summary: "Reviewer recommends approval after meta-review.",
      route: "human_gate_approve",
      refs: [],
      recommendation: "approve",
      metaReviewerAgent: "claude",
      parityMetadata: {
        findings_claimed_open_total: 0,
        findings_artifact_open_total: 0,
        findings_blocking_open_total: 0,
        findings_advisory_open_total: 0,
        findings_artifact_status: "available",
        findings_digest_sha256:
          "acacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacac",
        meta_review_run_id: "run_approval_env_meta_reviewer_agent_01",
        findings_parity_status: "ok"
      }
    });

    expect(result.envelope.payload.metadata).toMatchObject({
      actor: "meta-reviewer",
      actor_agent: "claude",
      latest_recommendation: "approve",
      meta_review_gate_route: "human_gate_approve"
    });
  });

  it("requires explicit meta-reviewer authority on the builder boundary", async () => {
    const now = new Date("2026-03-14T12:30:45.000Z");
    const stub = createAppendEnvelopeStub(now);

    const inputWithoutAuthority = {
      appendEnvelope: stub.appendEnvelope,
      transcriptPath: "/tmp/transcript.ndjson",
      inboxPath: "/tmp/inbox.ndjson",
      lockPath: "/tmp/bubble.lock",
      now,
      bubbleId: "b_approval_env_missing_meta_reviewer_agent_01",
      round: 18,
      summary: "Builder boundary must require explicit meta-reviewer authority.",
      route: "human_gate_approve",
      refs: [],
      recommendation: "approve" as const,
      parityMetadata: {
        findings_claimed_open_total: 0,
        findings_artifact_open_total: 0,
        findings_blocking_open_total: 0,
        findings_advisory_open_total: 0,
        findings_artifact_status: "available",
        findings_digest_sha256:
          "adadadadadadadadadadadadadadadadadadadadadadadadadadadadadadadad",
        meta_review_run_id: "run_approval_env_missing_meta_reviewer_agent_01",
        findings_parity_status: "ok"
      }
    };

    void inputWithoutAuthority;
    // @ts-expect-error metaReviewerAgent is mandatory on the builder boundary
    await appendHumanApprovalRequestEnvelopeImpl(inputWithoutAuthority);
  });

  it("normalizes approve-route summary when parity guard invariants are inconsistent", async () => {
    const now = new Date("2026-03-14T12:31:00.000Z");
    const stub = createAppendEnvelopeStub(now);

    await appendHumanApprovalRequestEnvelope({
      appendEnvelope: stub.appendEnvelope,
      transcriptPath: "/tmp/transcript.ndjson",
      inboxPath: "/tmp/inbox.ndjson",
      lockPath: "/tmp/bubble.lock",
      now,
      bubbleId: "b_approval_env_mismatch_01",
      round: 18,
      summary: "R18 review: 2 findings remain open.",
      route: "human_gate_approve",
      refs: [],
      recommendation: "approve",
      parityMetadata: {
        findings_claimed_open_total: 0,
        findings_artifact_open_total: 0,
        findings_blocking_open_total: 0,
        findings_advisory_open_total: 0,
        findings_artifact_status: "available",
        findings_digest_sha256:
          "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        meta_review_run_id: "run_approval_env_mismatch_01",
        findings_parity_status: "mismatch"
      }
    });

    const payload = stub.calls.at(-1)?.envelope.payload;
    expect(payload?.summary).toContain("META_REVIEW_GATE_APPROVAL_SUMMARY_NORMALIZED");
    expect(payload?.summary).toContain("META_REVIEW_GATE_APPROVAL_SUMMARY_METADATA_MISMATCH");
    expect(payload?.metadata).toMatchObject({
      approval_summary_normalized: true,
      approval_summary_normalization_reason_code:
        "META_REVIEW_GATE_APPROVAL_SUMMARY_METADATA_MISMATCH",
      approval_summary_normalization_original_summary: "R18 review: 2 findings remain open.",
      meta_review_gate_route: "human_gate_approve"
    });
  });

  it("fails closed when the latest same-round reviewer snapshot reports metadata-only open findings", async () => {
    const now = new Date("2026-03-14T12:31:15.000Z");
    const stub = createAppendEnvelopeStub(now);
    const root = await createTempDir();
    const transcriptPath = join(root, "transcript.ndjson");
    const lockPath = join(root, "bubble.lock");

    await appendReviewerSnapshot({
      transcriptPath,
      lockPath,
      bubbleId: "b_approval_env_snapshot_metadata_only_01",
      round: 18,
      now: new Date("2026-03-14T12:31:10.000Z"),
      findings: [],
      advisoryFindingsOpenTotal: 1
    });

    await expect(
      appendHumanApprovalRequestEnvelope({
        appendEnvelope: stub.appendEnvelope,
        transcriptPath,
        inboxPath: join(root, "inbox.ndjson"),
        lockPath,
        now,
        bubbleId: "b_approval_env_snapshot_metadata_only_01",
        round: 18,
        summary: "No findings remain after this review.",
        route: "human_gate_approve",
        refs: [],
        recommendation: "approve",
        parityMetadata: {
          findings_claimed_open_total: 0,
          findings_artifact_open_total: 0,
          findings_blocking_open_total: 0,
          findings_advisory_open_total: 0,
          findings_parity_status: "ok"
        }
      })
    ).rejects.toThrow(
      new RegExp(
        `META_REVIEW_GATE_REVIEWER_CONVERGENCE_CONFLICT[\\s\\S]*${buildMetaReviewSubmitAdvisoryOnlyCorrectionNote()
          .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`
      )
    );
  });

  it("keeps open-findings summary unchanged via structured-open-findings suppression branch even when parity status is mismatch", async () => {
    const now = new Date("2026-03-14T12:31:30.000Z");
    const stub = createAppendEnvelopeStub(now);

    const summary = "R18 review: 2 findings remain open.";
    const result = await appendHumanApprovalRequestEnvelope({
      appendEnvelope: stub.appendEnvelope,
      transcriptPath: "/tmp/transcript.ndjson",
      inboxPath: "/tmp/inbox.ndjson",
      lockPath: "/tmp/bubble.lock",
      now,
      bubbleId: "b_approval_env_open_findings_passthrough_01",
      round: 18,
      summary,
      route: "human_gate_approve",
      refs: [],
      recommendation: "approve",
      findings: [
        {
          severity: "P2",
          title: "Open findings passthrough a"
        },
        {
          severity: "P3",
          title: "Open findings passthrough b"
        }
      ],
      parityMetadata: {
        findings_claimed_open_total: 2,
        findings_artifact_open_total: 2,
        findings_blocking_open_total: 0,
        findings_advisory_open_total: 2,
        findings_artifact_status: "available",
        findings_digest_sha256:
          "abababababababababababababababababababababababababababababababab",
        meta_review_run_id: "run_approval_env_open_findings_passthrough_01",
        findings_parity_status: "mismatch"
      }
    });

    expect(result.envelope.payload.summary).toBe(summary);
    expect(result.envelope.payload.metadata).toMatchObject({
      findings_claimed_open_total: 2,
      findings_artifact_open_total: 2,
      findings_parity_status: "mismatch"
    });
    expect(
      result.envelope.payload.metadata?.approval_summary_normalized
    ).toBeUndefined();
    expect(
      result.envelope.payload.metadata?.approval_summary_normalization_reason_code
    ).toBeUndefined();
  });

  it("keeps non-approve route summary unchanged when structured parity proof is unavailable", async () => {
    const now = new Date("2026-03-14T12:32:00.000Z");
    const stub = createAppendEnvelopeStub(now);
    const summary = "R18 review: 2 findings remain open.";

    const result = await appendHumanApprovalRequestEnvelope({
      appendEnvelope: stub.appendEnvelope,
      transcriptPath: "/tmp/transcript.ndjson",
      inboxPath: "/tmp/inbox.ndjson",
      lockPath: "/tmp/bubble.lock",
      now,
      bubbleId: "b_approval_env_parity_unavailable_01",
      round: 18,
      summary,
      route: "human_gate_inconclusive",
      refs: [],
      recommendation: "inconclusive",
      parityMetadata: undefined
    });

    expect(result.envelope.payload.summary).toBe(summary);
    expect(result.envelope.payload.metadata).toMatchObject({
      [deliveryTargetRoleMetadataKey]: "status",
      latest_recommendation: "inconclusive",
      meta_review_gate_route: "human_gate_inconclusive"
    });
    expect(
      result.envelope.payload.metadata?.approval_summary_normalized
    ).toBeUndefined();
  });

  it("persists threshold-not-met route metadata with the exact compare key set", async () => {
    const now = new Date("2026-03-14T12:32:20.000Z");
    const stub = createAppendEnvelopeStub(now);

    const result = await appendHumanApprovalRequestEnvelope({
      appendEnvelope: stub.appendEnvelope,
      transcriptPath: "/tmp/transcript.ndjson",
      inboxPath: "/tmp/inbox.ndjson",
      lockPath: "/tmp/bubble.lock",
      now,
      bubbleId: "b_approval_env_threshold_not_met_01",
      round: 18,
      summary: "Highest open severity P3 did not meet configured minimum P2.",
      route: "human_gate_threshold_not_met",
      refs: [],
      recommendation: "rework",
      thresholdMetadata: {
        status: "not_met",
        reasonCode: "REVIEW_POLICY_AUTO_REWORK_THRESHOLD_NOT_MET",
        minSeverity: "P2",
        highestOpenSeverity: "P3"
      }
    });

    expect(result.envelope.payload.metadata).toMatchObject({
      [deliveryTargetRoleMetadataKey]: "status",
      latest_recommendation: "rework",
      meta_review_gate_route: "human_gate_threshold_not_met",
      meta_review_gate_reason_code: "REVIEW_POLICY_AUTO_REWORK_THRESHOLD_NOT_MET",
      meta_review_gate_threshold_status: "not_met",
      meta_review_gate_threshold_min_severity: "P2",
      meta_review_gate_threshold_highest_open_severity: "P3"
    });
  });

  it("persists threshold-unresolved route metadata for incomplete authority", async () => {
    const now = new Date("2026-03-14T12:32:40.000Z");
    const stub = createAppendEnvelopeStub(now);

    const result = await appendHumanApprovalRequestEnvelope({
      appendEnvelope: stub.appendEnvelope,
      transcriptPath: "/tmp/transcript.ndjson",
      inboxPath: "/tmp/inbox.ndjson",
      lockPath: "/tmp/bubble.lock",
      now,
      bubbleId: "b_approval_env_threshold_incomplete_01",
      round: 18,
      summary: "Threshold authority could not resolve highest open severity.",
      route: "human_gate_threshold_unresolved",
      refs: [],
      recommendation: "rework",
      thresholdMetadata: {
        status: "incomplete",
        reasonCode: "REVIEW_POLICY_THRESHOLD_CONTEXT_INCOMPLETE"
      }
    });

    expect(result.envelope.payload.metadata).toMatchObject({
      [deliveryTargetRoleMetadataKey]: "status",
      latest_recommendation: "rework",
      meta_review_gate_route: "human_gate_threshold_unresolved",
      meta_review_gate_reason_code: "REVIEW_POLICY_THRESHOLD_CONTEXT_INCOMPLETE",
      meta_review_gate_threshold_status: "incomplete"
    });
    expect(
      Object.prototype.hasOwnProperty.call(
        result.envelope.payload.metadata ?? {},
        "meta_review_gate_threshold_min_severity"
      )
    ).toBe(false);
    expect(
      Object.prototype.hasOwnProperty.call(
        result.envelope.payload.metadata ?? {},
        "meta_review_gate_threshold_highest_open_severity"
      )
    ).toBe(false);
  });

  it("rejects threshold routes that omit latest_recommendation=rework", async () => {
    const now = new Date("2026-03-14T12:32:50.000Z");
    const stub = createAppendEnvelopeStub(now);

    await expect(
      appendHumanApprovalRequestEnvelope({
        appendEnvelope: stub.appendEnvelope,
        transcriptPath: "/tmp/transcript.ndjson",
        inboxPath: "/tmp/inbox.ndjson",
        lockPath: "/tmp/bubble.lock",
        now,
        bubbleId: "b_approval_env_threshold_guard_01",
        round: 18,
        summary: "Threshold authority could not resolve highest open severity.",
        route: "human_gate_threshold_unresolved",
        refs: [],
        thresholdMetadata: {
          status: "unresolved",
          reasonCode: "REVIEW_POLICY_THRESHOLD_SOURCE_UNRESOLVED"
        }
      })
    ).rejects.toThrow(/requires latest_recommendation=rework/u);
  });

  it("rejects approve-route envelopes that try to carry threshold diagnostics", async () => {
    const now = new Date("2026-03-14T12:32:52.000Z");
    const stub = createAppendEnvelopeStub(now);

    await expect(
      appendHumanApprovalRequestEnvelope({
        appendEnvelope: stub.appendEnvelope,
        transcriptPath: "/tmp/transcript.ndjson",
        inboxPath: "/tmp/inbox.ndjson",
        lockPath: "/tmp/bubble.lock",
        now,
        bubbleId: "b_approval_env_threshold_approve_guard_01",
        round: 18,
        summary: "Open advisory finding remains.",
        route: "human_gate_approve",
        refs: [],
        recommendation: "approve",
        thresholdMetadata: {
          status: "not_met",
          reasonCode: "REVIEW_POLICY_AUTO_REWORK_THRESHOLD_NOT_MET",
          minSeverity: "P2",
          highestOpenSeverity: "P3"
        }
      })
    ).rejects.toThrow(/human_gate_approve cannot carry threshold diagnostic metadata/u);
  });

  it("rejects threshold-not-met routes with a non-canonical reason code", async () => {
    const now = new Date("2026-03-14T12:32:55.000Z");
    const stub = createAppendEnvelopeStub(now);

    await expect(
      appendHumanApprovalRequestEnvelope({
        appendEnvelope: stub.appendEnvelope,
        transcriptPath: "/tmp/transcript.ndjson",
        inboxPath: "/tmp/inbox.ndjson",
        lockPath: "/tmp/bubble.lock",
        now,
        bubbleId: "b_approval_env_threshold_guard_02",
        round: 18,
        summary: "Highest open severity P3 did not meet configured minimum P2.",
        route: "human_gate_threshold_not_met",
        refs: [],
        recommendation: "rework",
        thresholdMetadata: {
          status: "not_met",
          reasonCode: "REVIEW_POLICY_THRESHOLD_SOURCE_UNRESOLVED",
          minSeverity: "P2",
          highestOpenSeverity: "P3"
        } as unknown as MetaReviewGateThresholdMetadata
      })
    ).rejects.toThrow(/canonical not_met reason code/u);
  });

  it("rejects threshold-unresolved routes with a reason code from the wrong status family", async () => {
    const now = new Date("2026-03-14T12:32:57.000Z");
    const stub = createAppendEnvelopeStub(now);

    await expect(
      appendHumanApprovalRequestEnvelope({
        appendEnvelope: stub.appendEnvelope,
        transcriptPath: "/tmp/transcript.ndjson",
        inboxPath: "/tmp/inbox.ndjson",
        lockPath: "/tmp/bubble.lock",
        now,
        bubbleId: "b_approval_env_threshold_guard_03",
        round: 18,
        summary: "Threshold authority could not resolve highest open severity.",
        route: "human_gate_threshold_unresolved",
        refs: [],
        recommendation: "rework",
        thresholdMetadata: {
          status: "incomplete",
          reasonCode: "REVIEW_POLICY_THRESHOLD_SOURCE_UNRESOLVED"
        } as unknown as MetaReviewGateThresholdMetadata
      })
    ).rejects.toThrow(/canonical reason code for the supplied threshold status/u);
  });

  it("emits structured run-failed route metadata for prefix-independent approval history checks", async () => {
    const now = new Date("2026-03-14T12:33:00.000Z");
    const stub = createAppendEnvelopeStub(now);

    const result = await appendHumanApprovalRequestEnvelope({
      appendEnvelope: stub.appendEnvelope,
      transcriptPath: "/tmp/transcript.ndjson",
      inboxPath: "/tmp/inbox.ndjson",
      lockPath: "/tmp/bubble.lock",
      now,
      bubbleId: "b_approval_env_run_failed_metadata_01",
      round: 18,
      summary: "Runner failed in recovery route.",
      route: "human_gate_run_failed",
      refs: [],
      recommendation: "inconclusive",
      parityMetadata: undefined
    });

    expect(result.envelope.payload.metadata).toMatchObject({
      [deliveryTargetRoleMetadataKey]: "status",
      latest_recommendation: "inconclusive",
      meta_review_gate_route: "human_gate_run_failed",
      meta_review_gate_reason_code: "META_REVIEW_GATE_RUN_FAILED",
      meta_review_gate_run_failed: true
    });
  });

  it("keeps dispatch-failed fallback summary unchanged on approve recommendation without mismatch normalization", async () => {
    const now = new Date("2026-03-14T12:33:30.000Z");
    const stub = createAppendEnvelopeStub(now);
    const summary =
      "META_REVIEW_GATE_REWORK_DISPATCH_FAILED: FINDINGS_CLAIM_SOURCE_INVALID: recommendation=approve cannot carry findings_claim_state=open_findings.";

    const result = await appendHumanApprovalRequestEnvelope({
      appendEnvelope: stub.appendEnvelope,
      transcriptPath: "/tmp/transcript.ndjson",
      inboxPath: "/tmp/inbox.ndjson",
      lockPath: "/tmp/bubble.lock",
      now,
      bubbleId: "b_approval_env_dispatch_failed_approve_01",
      round: 18,
      summary,
      route: "human_gate_dispatch_failed",
      refs: [],
      recommendation: "approve",
      gateReasonCode: "META_REVIEW_APPROVE_THRESHOLD_BACKSTOP",
      parityMetadata: {
        findings_claimed_open_total: 4,
        findings_artifact_open_total: null,
        findings_blocking_open_total: 0,
        findings_advisory_open_total: 4,
        findings_artifact_status: "available",
        findings_digest_sha256:
          "0202020202020202020202020202020202020202020202020202020202020202",
        meta_review_run_id: "run_approval_env_dispatch_failed_approve_01",
        findings_parity_status: null
      }
    });

    expect(result.envelope.payload.summary).toBe(summary);
    expect(result.envelope.payload.metadata).toMatchObject({
      [deliveryTargetRoleMetadataKey]: "status",
      latest_recommendation: "approve",
      meta_review_gate_route: "human_gate_dispatch_failed",
      meta_review_gate_reason_code: "META_REVIEW_APPROVE_THRESHOLD_BACKSTOP",
      findings_claimed_open_total: 4,
      findings_blocking_open_total: 0,
      findings_advisory_open_total: 4
    });
    expect(result.envelope.payload.metadata?.approval_summary_normalized).toBeUndefined();
    expect(
      result.envelope.payload.metadata?.approval_summary_normalization_reason_code
    ).toBeUndefined();
  });

  it("normalizes clean summary when advisory findings are still open (defense-in-depth)", async () => {
    const now = new Date("2026-03-14T12:34:00.000Z");
    const stub = createAppendEnvelopeStub(now);

    const result = await appendHumanApprovalRequestEnvelope({
      appendEnvelope: stub.appendEnvelope,
      transcriptPath: "/tmp/transcript.ndjson",
      inboxPath: "/tmp/inbox.ndjson",
      lockPath: "/tmp/bubble.lock",
      now,
      bubbleId: "b_approval_env_advisory_defense_01",
      round: 18,
      summary: "No open findings remain.",
      route: "human_gate_approve",
      refs: [],
      recommendation: "approve",
      findings: [
        {
          severity: "P2",
          title: "Follow-up regression test coverage"
        },
        {
          severity: "P3",
          title: "CLI guidance wording consistency"
        }
      ],
      parityMetadata: {
        findings_claimed_open_total: 2,
        findings_artifact_open_total: 2,
        findings_blocking_open_total: 0,
        findings_advisory_open_total: 2,
        findings_artifact_status: "available",
        findings_digest_sha256:
          "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
        meta_review_run_id: "run_approval_env_advisory_defense_01",
        findings_parity_status: "ok"
      }
    });

    expect(result.envelope.payload.summary).toContain(
      "CONVERGED_SUMMARY_FINDINGS_CONTRADICTION_DEFENSE_IN_DEPTH"
    );
    expect(result.envelope.payload.metadata).toMatchObject({
      approval_summary_normalized: true,
      approval_summary_normalization_reason_code:
        "CONVERGED_SUMMARY_FINDINGS_CONTRADICTION_DEFENSE_IN_DEPTH",
      approval_summary_consistency_status: "mismatch",
      findings_blocking_open_total: 0,
      findings_advisory_open_total: 2
    });
    expect(result.envelope.payload.findings).toEqual([
      {
        severity: "P2",
        title: "Follow-up regression test coverage"
      },
      {
        severity: "P3",
        title: "CLI guidance wording consistency"
      }
    ]);
  });

  it("marks advisory count/list mismatch with dedicated reason code", async () => {
    const now = new Date("2026-03-14T12:35:00.000Z");
    const stub = createAppendEnvelopeStub(now);

    const result = await appendHumanApprovalRequestEnvelope({
      appendEnvelope: stub.appendEnvelope,
      transcriptPath: "/tmp/transcript.ndjson",
      inboxPath: "/tmp/inbox.ndjson",
      lockPath: "/tmp/bubble.lock",
      now,
      bubbleId: "b_approval_env_advisory_mismatch_01",
      round: 18,
      summary: "No open findings remain.",
      route: "human_gate_approve",
      refs: [],
      recommendation: "approve",
      findings: [
        {
          severity: "P2",
          title: "Follow-up regression test coverage"
        }
      ],
      parityMetadata: {
        findings_claimed_open_total: 0,
        findings_artifact_open_total: 0,
        findings_blocking_open_total: 0,
        findings_advisory_open_total: 0,
        findings_artifact_status: "available",
        findings_digest_sha256:
          "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
        meta_review_run_id: "run_approval_env_advisory_mismatch_01",
        findings_parity_status: "ok"
      }
    });

    expect(result.envelope.payload.summary).toContain(
      "CONVERGED_ADVISORY_COUNT_LIST_MISMATCH"
    );
    expect(result.envelope.payload.metadata).toMatchObject({
      approval_summary_normalized: true,
      approval_summary_normalization_reason_code:
        "CONVERGED_ADVISORY_COUNT_LIST_MISMATCH",
      approval_summary_normalization_original_summary: "No open findings remain.",
      approval_summary_consistency_status: "mismatch"
    });
  });

  it("reuses advisory findings from the latest same-round reviewer snapshot when the input omits them", async () => {
    const now = new Date("2026-03-14T12:35:20.000Z");
    const stub = createAppendEnvelopeStub(now);
    const root = await createTempDir();
    const transcriptPath = join(root, "transcript.ndjson");
    const lockPath = join(root, "bubble.lock");

    await appendReviewerSnapshot({
      transcriptPath,
      lockPath,
      bubbleId: "b_approval_env_snapshot_fallback_01",
      round: 18,
      now: new Date("2026-03-14T12:35:10.000Z"),
      findings: [
        {
          severity: "P2",
          title: "Follow-up regression test coverage"
        }
      ],
      advisoryFindingsOpenTotal: 1
    });

    const result = await appendHumanApprovalRequestEnvelope({
      appendEnvelope: stub.appendEnvelope,
      transcriptPath,
      inboxPath: join(root, "inbox.ndjson"),
      lockPath,
      now,
      bubbleId: "b_approval_env_snapshot_fallback_01",
      round: 18,
      summary: "1 advisory finding remains open.",
      route: "human_gate_approve",
      refs: [],
      recommendation: "approve",
      parityMetadata: {
        findings_claimed_open_total: 1,
        findings_artifact_open_total: 1,
        findings_blocking_open_total: 0,
        findings_advisory_open_total: 1,
        findings_parity_status: "ok"
      }
    });

    expect(result.envelope.payload.findings).toEqual([
      {
        severity: "P2",
        title: "Follow-up regression test coverage"
      }
    ]);
  });

  it("does not normalize summary for consistent advisory-only approve split when list count differs", async () => {
    const now = new Date("2026-03-14T12:35:30.000Z");
    const stub = createAppendEnvelopeStub(now);

    const result = await appendHumanApprovalRequestEnvelope({
      appendEnvelope: stub.appendEnvelope,
      transcriptPath: "/tmp/transcript.ndjson",
      inboxPath: "/tmp/inbox.ndjson",
      lockPath: "/tmp/bubble.lock",
      now,
      bubbleId: "b_approval_env_advisory_consistent_split_01",
      round: 18,
      summary: "2 advisory findings remain open.",
      route: "human_gate_approve",
      refs: [],
      recommendation: "approve",
      findings: [
        {
          severity: "P2",
          title: "Follow-up regression test coverage"
        }
      ],
      parityMetadata: {
        findings_claimed_open_total: 2,
        findings_artifact_open_total: 2,
        findings_blocking_open_total: 0,
        findings_advisory_open_total: 2,
        findings_artifact_status: "available",
        findings_digest_sha256:
          "efefefefefefefefefefefefefefefefefefefefefefefefefefefefefefefef",
        meta_review_run_id: "run_approval_env_advisory_consistent_split_01",
        findings_parity_status: "ok"
      }
    });

    expect(result.envelope.payload.summary).toBe("2 advisory findings remain open.");
    expect(result.envelope.payload.metadata?.approval_summary_normalized).toBeUndefined();
  });

  it("keeps advisory-only approve summary unchanged when findings_artifact_open_total is null", async () => {
    const now = new Date("2026-03-14T12:36:00.000Z");
    const stub = createAppendEnvelopeStub(now);
    const summary = "2 advisory findings remain open.";

    const result = await appendHumanApprovalRequestEnvelope({
      appendEnvelope: stub.appendEnvelope,
      transcriptPath: "/tmp/transcript.ndjson",
      inboxPath: "/tmp/inbox.ndjson",
      lockPath: "/tmp/bubble.lock",
      now,
      bubbleId: "b_approval_env_advisory_artifact_null_01",
      round: 18,
      summary,
      route: "human_gate_approve",
      refs: [],
      recommendation: "approve",
      findings: [
        {
          severity: "P2",
          title: "Follow-up regression test coverage"
        },
        {
          severity: "P3",
          title: "CLI guidance wording consistency"
        }
      ],
      parityMetadata: {
        findings_claimed_open_total: 2,
        findings_artifact_open_total: null,
        findings_blocking_open_total: 0,
        findings_advisory_open_total: 2,
        findings_artifact_status: "available",
        findings_digest_sha256:
          "0101010101010101010101010101010101010101010101010101010101010101",
        meta_review_run_id: "run_approval_env_advisory_artifact_null_01",
        findings_parity_status: null
      }
    });

    expect(result.envelope.payload.summary).toBe(summary);
    expect(result.envelope.payload.metadata).toMatchObject({
      findings_claimed_open_total: 2,
      findings_artifact_open_total: null,
      findings_blocking_open_total: 0,
      findings_advisory_open_total: 2,
      findings_parity_status: null
    });
    expect(
      result.envelope.payload.metadata?.approval_summary_normalization_reason_code
    ).toBeUndefined();
  });

  it("keeps advisory-only approve summary unchanged when summary only asserts no P0/P1 findings", async () => {
    const now = new Date("2026-03-14T12:36:30.000Z");
    const stub = createAppendEnvelopeStub(now);
    const summary = "No open P0/P1 findings remain.";

    const result = await appendHumanApprovalRequestEnvelope({
      appendEnvelope: stub.appendEnvelope,
      transcriptPath: "/tmp/transcript.ndjson",
      inboxPath: "/tmp/inbox.ndjson",
      lockPath: "/tmp/bubble.lock",
      now,
      bubbleId: "b_approval_env_advisory_no_blocking_scope_01",
      round: 18,
      summary,
      route: "human_gate_approve",
      refs: [],
      recommendation: "approve",
      parityMetadata: {
        findings_claimed_open_total: 2,
        findings_artifact_open_total: null,
        findings_blocking_open_total: 0,
        findings_advisory_open_total: 2,
        findings_artifact_status: "available",
        findings_digest_sha256:
          "3434343434343434343434343434343434343434343434343434343434343434",
        meta_review_run_id: "run_approval_env_advisory_no_blocking_scope_01",
        findings_parity_status: null
      }
    });

    expect(result.envelope.payload.summary).toBe(summary);
    expect(result.envelope.payload.metadata?.approval_summary_normalized).toBeUndefined();
    expect(
      result.envelope.payload.metadata?.approval_summary_normalization_reason_code
    ).toBeUndefined();
  });

  it("does not fail-closed on empty advisory findings list without advisory aggregate signal", async () => {
    const now = new Date("2026-03-14T12:37:00.000Z");
    const stub = createAppendEnvelopeStub(now);

    const result = await appendHumanApprovalRequestEnvelope({
      appendEnvelope: stub.appendEnvelope,
      transcriptPath: "/tmp/transcript.ndjson",
      inboxPath: "/tmp/inbox.ndjson",
      lockPath: "/tmp/bubble.lock",
      now,
      bubbleId: "b_approval_env_advisory_empty_list_01",
      round: 18,
      summary: "No open findings remain.",
      route: "human_gate_approve",
      refs: [],
      recommendation: "approve",
      findings: [],
      parityMetadata: {
        findings_claimed_open_total: 0,
        findings_artifact_open_total: 0,
        findings_blocking_open_total: 0,
        findings_advisory_open_total: 0,
        findings_artifact_status: "available",
        findings_digest_sha256:
          "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
        meta_review_run_id: "run_approval_env_advisory_empty_list_01",
        findings_parity_status: "ok"
      }
    });

    expect(result.envelope.payload.summary).toBe("No open findings remain.");
    expect(result.envelope.payload.findings).toBeUndefined();
    expect(result.envelope.payload.metadata?.approval_summary_normalized).toBeUndefined();
  });

  it("omits undefined parity metadata keys from approval envelope metadata", async () => {
    const now = new Date("2026-03-14T12:38:00.000Z");
    const stub = createAppendEnvelopeStub(now);
    const parityMetadata = {
      findings_claimed_open_total: 0,
      findings_artifact_open_total: 0,
      meta_review_run_id: "run_approval_env_undefined_keys_01",
      findings_parity_status: "ok"
    } as Record<string, unknown>;
    parityMetadata.findings_blocking_open_total = undefined;
    parityMetadata.findings_advisory_open_total = undefined;
    parityMetadata.findings_artifact_status = undefined;
    parityMetadata.findings_digest_sha256 = undefined;

    const result = await appendHumanApprovalRequestEnvelope({
      appendEnvelope: stub.appendEnvelope,
      transcriptPath: "/tmp/transcript.ndjson",
      inboxPath: "/tmp/inbox.ndjson",
      lockPath: "/tmp/bubble.lock",
      now,
      bubbleId: "b_approval_env_undefined_keys_01",
      round: 18,
      summary: "No open findings remain.",
      route: "human_gate_inconclusive",
      refs: [],
      recommendation: "inconclusive",
      parityMetadata: parityMetadata as FindingsParityMetadata
    });

    const metadata = result.envelope.payload.metadata ?? {};
    expect(metadata).toMatchObject({
      findings_claimed_open_total: 0,
      findings_artifact_open_total: 0,
      findings_parity_status: "ok",
      meta_review_run_id: "run_approval_env_undefined_keys_01"
    });
    expect(
      Object.prototype.hasOwnProperty.call(metadata, "findings_blocking_open_total")
    ).toBe(false);
    expect(
      Object.prototype.hasOwnProperty.call(metadata, "findings_advisory_open_total")
    ).toBe(false);
    expect(
      Object.prototype.hasOwnProperty.call(metadata, "findings_artifact_status")
    ).toBe(false);
    expect(
      Object.prototype.hasOwnProperty.call(metadata, "findings_digest_sha256")
    ).toBe(false);
  });

  it("fails closed when an explicit empty advisory list contradicts the latest same-round reviewer snapshot", async () => {
    const now = new Date("2026-03-14T12:38:30.000Z");
    const stub = createAppendEnvelopeStub(now);
    const root = await createTempDir();
    const transcriptPath = join(root, "transcript.ndjson");
    const lockPath = join(root, "bubble.lock");

    await appendReviewerSnapshot({
      transcriptPath,
      lockPath,
      bubbleId: "b_approval_env_snapshot_empty_list_conflict_01",
      round: 18,
      now: new Date("2026-03-14T12:38:20.000Z"),
      findings: [
        {
          severity: "P2",
          title: "Follow-up regression test coverage"
        }
      ],
      advisoryFindingsOpenTotal: 1
    });

    await expect(
      appendHumanApprovalRequestEnvelope({
        appendEnvelope: stub.appendEnvelope,
        transcriptPath,
        inboxPath: join(root, "inbox.ndjson"),
        lockPath,
        now,
        bubbleId: "b_approval_env_snapshot_empty_list_conflict_01",
        round: 18,
        summary: "1 advisory finding remains open.",
        route: "human_gate_approve",
        refs: [],
        recommendation: "approve",
        findings: [],
        parityMetadata: {
          findings_claimed_open_total: 1,
          findings_artifact_open_total: 1,
          findings_blocking_open_total: 0,
          findings_advisory_open_total: 1,
          findings_parity_status: "ok"
        }
      })
    ).rejects.toThrow("META_REVIEW_GATE_REVIEWER_CONVERGENCE_CONFLICT");
  });

  it("fails closed when advisory_v1 routing metadata is incomplete", async () => {
    const now = new Date("2026-03-14T12:36:00.000Z");
    const stub = createAppendEnvelopeStub(now);

    await expect(
      appendHumanApprovalRequestEnvelope({
        appendEnvelope: stub.appendEnvelope,
        transcriptPath: "/tmp/transcript.ndjson",
        inboxPath: "/tmp/inbox.ndjson",
        lockPath: "/tmp/bubble.lock",
        now,
        bubbleId: "b_approval_env_advisory_required_01",
        round: 18,
        summary: "No open findings remain.",
        route: "human_gate_approve",
        refs: [],
        recommendation: "approve",
        findings: [
          {
            severity: "P2",
            title: "Follow-up regression test coverage"
          }
        ],
        parityMetadata: {
          findings_claimed_open_total: 1,
          findings_artifact_open_total: 1,
          findings_artifact_status: "available",
          findings_digest_sha256:
            "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
          meta_review_run_id: "run_approval_env_advisory_required_01",
          findings_parity_status: "ok"
        }
      })
    ).rejects.toThrow("CONVERGED_ADVISORY_METADATA_REQUIRED");
  });

  it("fails closed when recommendation=approve carries blocking open findings", async () => {
    const now = new Date("2026-03-14T12:39:00.000Z");
    const stub = createAppendEnvelopeStub(now);

    const appendPromise = appendHumanApprovalRequestEnvelope({
      appendEnvelope: stub.appendEnvelope,
      transcriptPath: "/tmp/transcript.ndjson",
      inboxPath: "/tmp/inbox.ndjson",
      lockPath: "/tmp/bubble.lock",
      now,
      bubbleId: "b_approval_env_blocking_guard_01",
      round: 18,
      summary: "Blocking findings remain open.",
      route: "human_gate_approve",
      refs: [],
      recommendation: "approve",
      parityMetadata: {
        findings_claimed_open_total: 1,
        findings_artifact_open_total: 1,
        findings_blocking_open_total: 1,
        findings_advisory_open_total: 0,
        findings_parity_status: "ok"
      }
    });

    await expect(appendPromise).rejects.toThrow(
      "META_REVIEW_APPROVE_BLOCKING_FINDINGS_PRESENT"
    );
    await expect(appendPromise).rejects.not.toThrow(
      buildMetaReviewSubmitAdvisoryOnlyCorrectionNote()
    );
  });

  it("fails closed when recommendation=approve split arithmetic is inconsistent", async () => {
    const now = new Date("2026-03-14T12:40:00.000Z");
    const stub = createAppendEnvelopeStub(now);

    await expect(
      appendHumanApprovalRequestEnvelope({
        appendEnvelope: stub.appendEnvelope,
        transcriptPath: "/tmp/transcript.ndjson",
        inboxPath: "/tmp/inbox.ndjson",
        lockPath: "/tmp/bubble.lock",
        now,
        bubbleId: "b_approval_env_split_guard_01",
        round: 18,
        summary: "Advisory findings remain open.",
        route: "human_gate_approve",
        refs: [],
        recommendation: "approve",
        parityMetadata: {
          findings_claimed_open_total: 2,
          findings_artifact_open_total: 2,
          findings_blocking_open_total: 0,
          findings_advisory_open_total: 1,
          findings_parity_status: "ok"
        }
      })
    ).rejects.toThrow("META_REVIEW_FINDINGS_PARITY_GUARD");
  });

  it("fails closed with blocking reason precedence when blocking findings and artifact mismatch are both present", async () => {
    const now = new Date("2026-03-14T12:41:00.000Z");
    const stub = createAppendEnvelopeStub(now);

    const appendPromise = appendHumanApprovalRequestEnvelope({
      appendEnvelope: stub.appendEnvelope,
      transcriptPath: "/tmp/transcript.ndjson",
      inboxPath: "/tmp/inbox.ndjson",
      lockPath: "/tmp/bubble.lock",
      now,
      bubbleId: "b_approval_env_blocking_precedence_01",
      round: 18,
      summary: "Blocking findings remain open.",
      route: "human_gate_approve",
      refs: [],
      recommendation: "approve",
      parityMetadata: {
        findings_claimed_open_total: 1,
        findings_artifact_open_total: 2,
        findings_blocking_open_total: 1,
        findings_advisory_open_total: 0,
        findings_parity_status: "ok"
      }
    });

    await expect(appendPromise).rejects.toThrow(
      "META_REVIEW_APPROVE_BLOCKING_FINDINGS_PRESENT"
    );
    await expect(appendPromise).rejects.not.toThrow(
      buildMetaReviewSubmitAdvisoryOnlyCorrectionNote()
    );
  });

  it("keeps valid refs while dropping invalid refs within the same advisory finding", async () => {
    const now = new Date("2026-03-14T12:42:00.000Z");
    const stub = createAppendEnvelopeStub(now);

    const result = await appendHumanApprovalRequestEnvelope({
      appendEnvelope: stub.appendEnvelope,
      transcriptPath: "/tmp/transcript.ndjson",
      inboxPath: "/tmp/inbox.ndjson",
      lockPath: "/tmp/bubble.lock",
      now,
      bubbleId: "b_approval_env_refs_partial_01",
      round: 18,
      summary: "2 advisory findings remain open.",
      route: "human_gate_approve",
      refs: [],
      recommendation: "approve",
      findings: [
        {
          severity: "P2",
          title: "Follow-up regression test coverage",
          refs: ["artifact://ok-a", "", "   ", "artifact://ok-b"]
        }
      ],
      parityMetadata: {
        findings_claimed_open_total: 1,
        findings_artifact_open_total: 1,
        findings_blocking_open_total: 0,
        findings_advisory_open_total: 1,
        findings_parity_status: "ok"
      }
    });

    expect(result.envelope.payload.findings).toEqual([
      {
        severity: "P2",
        title: "Follow-up regression test coverage",
        refs: ["artifact://ok-a", "artifact://ok-b"]
      }
    ]);
  });

});
