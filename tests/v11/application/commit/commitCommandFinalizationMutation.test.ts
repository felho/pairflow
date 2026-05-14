import { describe, expect, it, vi } from "vitest";

import {
  appendCommitResultEnvelopeMutation,
  persistCommittedThenDoneStateMutation,
  type CommitFinalizationAppendResult,
  type CommitFinalizationLoadedState
} from "../../../../src/v11/application/commit/internal/finalization/commitCommandFinalizationMutation.js";
import type { BubbleStateSnapshot } from "../../../../src/v11/domain/state/snapshot/bubbleStateSnapshot.js";
import { buildBubbleStateSnapshotVariant } from "../../../../src/v11/domain/state/snapshot/buildBubbleStateSnapshot.js";

function createApprovedState(): BubbleStateSnapshot {
  return buildBubbleStateSnapshotVariant({
    bubble_id: "bubble-a",
    state: "APPROVED_FOR_COMMIT",
    round: 2,
    active_agent: "codex",
    active_role: "implementer",
    active_since: "2026-05-04T00:00:00.000Z",
    last_command_at: "2026-05-04T00:00:00.000Z",
    round_role_history: []
  });
}

describe("commitCommandFinalizationMutation", () => {
  it("appends COMMIT_RESULT through the injected transcript callback", async () => {
    const appended: CommitFinalizationAppendResult = {
      envelope: {
        id: "msg_commit_result",
        ts: "2026-05-04T00:00:00.000Z",
        bubble_id: "bubble-a",
        sender: "orchestrator",
        recipient: "human",
        type: "COMMIT_RESULT",
        round: 2,
        payload: {
          commit_message: "commit local helpers",
          commit_sha: "abc123",
          staged_files: ["src/file.ts"]
        },
        refs: ["ref-a"]
      },
      sequence: 3,
      mirrorWriteFailures: []
    };
    const appendProtocolEnvelope = vi.fn(async () => appended);

    await expect(
      appendCommitResultEnvelopeMutation({
        context: {
          bubbleId: "bubble-a",
          bubblePaths: {
            locksDir: "/repo/.pairflow/locks",
            statePath: "/repo/.pairflow/bubbles/bubble-a/state.json",
            transcriptPath: "/repo/.pairflow/bubbles/bubble-a/transcript.ndjson"
          },
          round: 2
        },
        refs: ["ref-a"],
        now: new Date("2026-05-04T00:00:00.000Z"),
        stagedFiles: ["src/file.ts"],
        commitMessage: "commit local helpers",
        commitSha: "abc123",
        appendProtocolEnvelope
      })
    ).resolves.toBe(appended);

    expect(appendProtocolEnvelope).toHaveBeenCalledWith({
      transcriptPath: "/repo/.pairflow/bubbles/bubble-a/transcript.ndjson",
      lockPath: "/repo/.pairflow/locks/bubble-a.lock",
      now: new Date("2026-05-04T00:00:00.000Z"),
      envelope: {
        bubble_id: "bubble-a",
        sender: "orchestrator",
        recipient: "human",
        type: "COMMIT_RESULT",
        round: 2,
        payload: {
          commit_message: "commit local helpers",
          commit_sha: "abc123",
          staged_files: ["src/file.ts"]
        },
        refs: ["ref-a"]
      }
    });
  });

  it("persists COMMITTED then DONE through the injected state callback", async () => {
    const approved = createApprovedState();
    const committedState = buildBubbleStateSnapshotVariant({
      bubble_id: "bubble-a",
      state: "COMMITTED",
      round: 2,
      active_agent: "codex",
      active_role: "implementer",
      active_since: "2026-05-04T00:00:00.000Z",
      last_command_at: "2026-05-04T01:00:00.000Z",
      execution_context: null,
      round_role_history: [],
      pending_rework_intent: null,
      rework_intent_history: []
    });
    const committed: CommitFinalizationLoadedState = {
      state: committedState,
      fingerprint: "committed-fingerprint"
    };
    const doneState = buildBubbleStateSnapshotVariant({
      bubble_id: "bubble-a",
      state: "DONE",
      round: 2,
      active_agent: null,
      active_role: null,
      active_since: null,
      last_command_at: "2026-05-04T01:00:00.000Z",
      execution_context: null,
      round_role_history: [],
      pending_rework_intent: null,
      rework_intent_history: []
    });
    const done: CommitFinalizationLoadedState = {
      state: doneState,
      fingerprint: "done-fingerprint"
    };
    const writeStateSnapshot = vi
      .fn()
      .mockResolvedValueOnce(committed)
      .mockResolvedValueOnce(done);

    await expect(
      persistCommittedThenDoneStateMutation({
        context: {
          statePath: "/repo/.pairflow/bubbles/bubble-a/state.json",
          state: approved,
          loadedState: {
            state: approved,
            fingerprint: "approved-fingerprint"
          }
        },
        nowIso: "2026-05-04T01:00:00.000Z",
        appended: {
          envelope: {
            id: "msg_commit_result"
          }
        } as CommitFinalizationAppendResult,
        commitSha: "abc123",
        writeStateSnapshot
      })
    ).resolves.toBe(done);

    expect(writeStateSnapshot).toHaveBeenNthCalledWith(
      1,
      "/repo/.pairflow/bubbles/bubble-a/state.json",
      committedState,
      {
        expectedFingerprint: "approved-fingerprint",
        expectedState: "APPROVED_FOR_COMMIT"
      }
    );
    expect(writeStateSnapshot).toHaveBeenNthCalledWith(
      2,
      "/repo/.pairflow/bubbles/bubble-a/state.json",
      doneState,
      {
        expectedFingerprint: "committed-fingerprint",
        expectedState: "COMMITTED"
      }
    );
  });
});
