import { describe, expect, it } from "vitest";

import { appendHumanApprovalRequestEnvelope } from "../../../src/core/bubble/approvalRequestEnvelope.js";
import { deliveryTargetRoleMetadataKey, type ProtocolEnvelope } from "../../../src/types/protocol.js";
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
      meta_review_gate_route: "human_gate_approve"
    });
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
});
