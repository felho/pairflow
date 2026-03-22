import { describe, expect, it } from "vitest";

import { appendHumanApprovalRequestEnvelope } from "../../../src/core/bubble/approvalRequestEnvelope.js";
import {
  deliveryTargetRoleMetadataKey,
  type FindingsParityMetadata,
  type ProtocolEnvelope
} from "../../../src/types/protocol.js";
import {
  type AppendProtocolEnvelopeResult,
  type AppendProtocolEnvelopeInput
} from "../../../src/core/protocol/transcriptStore.js";

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

  it("keeps open-findings summary unchanged when structured parity explicitly indicates open findings", async () => {
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
    expect(
      result.envelope.payload.metadata?.approval_summary_normalized
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
      route: "human_gate_approve",
      refs: [],
      recommendation: "approve",
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
});
