import { describe, expect, it } from "vitest";

import type { ProtocolEnvelopeDraft } from "../../../../src/v11/infrastructure/artifact/transcript/transcriptStore.js";
import { executeNormalPassAppend } from "../../../../src/v11/application/pass/internal/normalPass/normalPassAppendExecution.js";

describe("executeNormalPassAppend", () => {
  it("builds pass draft and appends envelope with mapped sequence/envelope output", async () => {
    const now = new Date("2026-03-19T12:00:00.000Z");
    const draft = { marker: "draft" } as unknown as ProtocolEnvelopeDraft<"PASS">;
    const envelope = { id: "env_1" } as never;
    let capturedDraftInput:
      | Parameters<
          NonNullable<
            NonNullable<Parameters<typeof executeNormalPassAppend>[1]>["buildPassEnvelopeDraft"]
          >
        >[0]
      | undefined;
    let capturedAppendInput:
      | Parameters<
          NonNullable<
            NonNullable<Parameters<typeof executeNormalPassAppend>[1]>["appendProtocolEnvelope"]
          >
        >[0]
      | undefined;

    const result = await executeNormalPassAppend(
      {
        transcriptPath: "/tmp/transcript.ndjson",
        lockPath: "/tmp/locks/b_123.lock",
        now,
        bubbleId: "b_123",
        handoff: {
          senderAgent: "codex",
          recipientAgent: "claude",
          senderRole: "implementer",
          recipientRole: "reviewer",
          envelopeRound: 2
        },
        summary: "handoff",
        passIntent: "review",
        refs: [".pairflow/evidence/lint.log"],
        hasFindings: false,
        findingsForPayload: [],
        repeatCleanReasonCode: "REPEAT_CLEAN_TRIGGER_NOT_MET",
        repeatCleanReasonDetail: "base_precondition_not_met",
        repeatCleanTrigger: false,
        mostRecentPreviousReviewerCleanPassEnvelope: false
      },
      {
        buildPassEnvelopeDraft: (input) => {
          capturedDraftInput = input;
          return draft;
        },
        appendProtocolEnvelope: async (input) => {
          capturedAppendInput = input;
          return {
            sequence: 7,
            envelope
          } as never;
        }
      }
    );

    expect(capturedDraftInput?.bubbleId).toBe("b_123");
    expect(capturedDraftInput?.transitionDecision).toBe("normal_pass");
    expect(capturedAppendInput?.transcriptPath).toBe("/tmp/transcript.ndjson");
    expect(capturedAppendInput?.lockPath).toBe("/tmp/locks/b_123.lock");
    expect(capturedAppendInput?.now).toBe(now);
    expect(capturedAppendInput?.envelope).toBe(draft);
    expect(result).toEqual({
      sequence: 7,
      envelope
    });
  });

  it("forwards optional reviewer findings claim metadata into draft builder", async () => {
    let capturedDraftInput:
      | Parameters<
          NonNullable<
            NonNullable<Parameters<typeof executeNormalPassAppend>[1]>["buildPassEnvelopeDraft"]
          >
        >[0]
      | undefined;

    await executeNormalPassAppend(
      {
        transcriptPath: "/tmp/transcript.ndjson",
        lockPath: "/tmp/locks/b_123.lock",
        now: new Date("2026-03-19T12:00:00.000Z"),
        bubbleId: "b_123",
        handoff: {
          senderAgent: "claude",
          recipientAgent: "codex",
          senderRole: "reviewer",
          recipientRole: "implementer",
          envelopeRound: 2
        },
        summary: "handoff",
        passIntent: "fix_request",
        refs: [],
        hasFindings: true,
        findingsForPayload: [{ title: "p1", priority: "P1" }],
        reviewerFindingsClaim: {
          state: "open_findings",
          source: "payload_findings_count"
        },
        reviewerFindingsClaimParserMetadata: {
          parserState: "open_findings",
          parserDivergence: false
        },
        repeatCleanReasonCode: "REPEAT_CLEAN_TRIGGER_NOT_MET",
        repeatCleanReasonDetail: "base_precondition_not_met",
        repeatCleanTrigger: false,
        mostRecentPreviousReviewerCleanPassEnvelope: false
      },
      {
        buildPassEnvelopeDraft: (input) => {
          capturedDraftInput = input;
          return { marker: "draft" } as unknown as ProtocolEnvelopeDraft<"PASS">;
        },
        appendProtocolEnvelope: async () => ({
          sequence: 1,
          envelope: { id: "env_1" } as never
        } as never)
      }
    );

    expect(capturedDraftInput?.reviewerFindingsClaim).toEqual({
      state: "open_findings",
      source: "payload_findings_count"
    });
    expect(capturedDraftInput?.reviewerFindingsClaimParserMetadata).toEqual({
      parserState: "open_findings",
      parserDivergence: false
    });
  });
});
