import { describe, expect, it } from "vitest";

function toErrorMessage(input: PairflowCommandErrorInput): string {
  if (typeof input === "string") {
    return input;
  }
  return (input.reasonCode !== undefined ? input.reasonCode + ": " : "") + input.message;
}

import type { PersistedBubbleStateSnapshot } from "../../../../src/v11/domain/state/snapshot/persistedBubbleStateSnapshot.js";
import { writePostAppendPassState } from "../../../../src/v11/application/pass/internal/normalPass/postAppendStateWriter.js";

class TestPostAppendStateWriterError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "TestPostAppendStateWriterError";
  }
}

function createError(message: PairflowCommandErrorInput): Error {
  return new TestPostAppendStateWriterError(toErrorMessage(message));
}

function buildState(): PersistedBubbleStateSnapshot {
  return {
    bubble_id: "b_123",
    state: "RUNNING",
    round: 2,
    active_agent: "codex",
    active_since: "2026-03-19T11:59:00.000Z",
    active_role: "implementer",
    round_role_history: [
      {
        round: 1,
        implementer: "codex",
        reviewer: "claude",
        switched_at: "2026-03-19T11:00:00.000Z"
      },
      {
        round: 2,
        implementer: "codex",
        reviewer: "claude",
        switched_at: "2026-03-19T11:30:00.000Z"
      }
    ],
    last_command_at: "2026-03-19T11:59:00.000Z"
  };
}

describe("writePostAppendPassState", () => {
  it("writes next state with expected fingerprint and RUNNING guard", async () => {
    const writes: unknown[] = [];
    const result = await writePostAppendPassState(
      {
        statePath: "/tmp/state.json",
        state: buildState(),
        handoff: {
          nextRound: 2,
          recipientAgent: "claude",
          recipientRole: "reviewer"
        },
        nowIso: "2026-03-19T12:00:00.000Z",
        watchdogTimeoutMinutes: 60,
        expectedFingerprint: "fp_1",
        envelopeId: "msg_1",
        createError
      },
      {
        writeStateSnapshot: async (statePath, state, options) => {
          writes.push({ statePath, state, options });
          return {
            state,
            fingerprint: "fp_2"
          };
        }
      }
    );

    expect(writes).toHaveLength(1);
    expect(writes[0]).toMatchObject({
      statePath: "/tmp/state.json",
      options: {
        expectedFingerprint: "fp_1",
        expectedState: "RUNNING"
      }
    });
    expect((writes[0] as { state: PersistedBubbleStateSnapshot }).state).toMatchObject({
      round: 2,
      active_agent: "claude",
      active_role: "reviewer",
      execution_context: {
        active_role: "reviewer",
        awaited_output_type: "pass_result",
        handoff_id: "reviewer:b_123:round:2:attempt:1",
        round: 2,
        started_at: "2026-03-19T12:00:00.000Z",
        deadline_at: "2026-03-19T13:00:00.000Z",
        attempt: 1
      },
      active_since: "2026-03-19T12:00:00.000Z",
      last_command_at: "2026-03-19T12:00:00.000Z"
    });
    expect(result.fingerprint).toBe("fp_2");
  });

  it("appends round role history when handoff includes appendRoundRoleEntry", async () => {
    let capturedState: PersistedBubbleStateSnapshot | undefined;
    await writePostAppendPassState(
      {
        statePath: "/tmp/state.json",
        state: buildState(),
        handoff: {
          nextRound: 3,
          recipientAgent: "codex",
          recipientRole: "implementer",
          appendRoundRoleEntry: {
            round: 3,
            implementer: "codex",
            reviewer: "claude",
            switched_at: "2026-03-19T12:00:00.000Z"
          }
        },
        nowIso: "2026-03-19T12:00:00.000Z",
        watchdogTimeoutMinutes: 60,
        expectedFingerprint: "fp_1",
        envelopeId: "msg_1",
        createError
      },
      {
        writeStateSnapshot: async (_path, state) => {
          capturedState = state;
          return {
            state,
            fingerprint: "fp_2"
          };
        }
      }
    );

    expect(capturedState?.round_role_history).toHaveLength(3);
    expect(capturedState?.round_role_history[2]).toEqual({
      round: 3,
      implementer: "codex",
      reviewer: "claude",
      switched_at: "2026-03-19T12:00:00.000Z"
    });
  });

  it("writes canonical meta-review authority when bypass handoff targets meta-reviewer", async () => {
    let capturedState: PersistedBubbleStateSnapshot | undefined;
    await writePostAppendPassState(
      {
        statePath: "/tmp/state.json",
        state: buildState(),
        handoff: {
          nextRound: 2,
          recipientAgent: "codex",
          recipientRole: "meta_reviewer"
        },
        nowIso: "2026-03-19T12:00:00.000Z",
        watchdogTimeoutMinutes: 60,
        expectedFingerprint: "fp_1",
        envelopeId: "msg_meta",
        createError
      },
      {
        writeStateSnapshot: async (_path, state) => {
          capturedState = state;
          return {
            state,
            fingerprint: "fp_meta"
          };
        }
      }
    );

    expect(capturedState).toMatchObject({
      round: 2,
      active_agent: "codex",
      active_role: "meta_reviewer",
      execution_context: {
        active_role: "meta_reviewer",
        awaited_output_type: "meta_review_result",
        handoff_id: "meta_review:b_123:round:2:attempt:1",
        round: 2
      }
    });
  });

  it("wraps state write failure with post-append state error", async () => {
    await expect(
      writePostAppendPassState(
        {
          statePath: "/tmp/state.json",
          state: buildState(),
          handoff: {
            nextRound: 2,
            recipientAgent: "claude",
            recipientRole: "reviewer"
          },
          nowIso: "2026-03-19T12:00:00.000Z",
          watchdogTimeoutMinutes: 60,
          expectedFingerprint: "fp_1",
          envelopeId: "msg_1",
          createError
        },
        {
          writeStateSnapshot: async () => {
            throw new Error("state conflict");
          }
        }
      )
    ).rejects.toThrowError(
      new TestPostAppendStateWriterError(
        "PASS msg_1 was appended but state update failed. Transcript remains canonical; recover state from transcript tail. Root error: state conflict"
      )
    );
  });
});
