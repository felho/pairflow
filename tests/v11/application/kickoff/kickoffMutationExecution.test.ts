import { describe, expect, it, vi } from "vitest";

import { executeKickoffMutation } from "../../../../src/v11/application/kickoff/internal/mutation/kickoffMutationExecution.js";

describe("executeKickoffMutation", () => {
  it("writes artifacts, snapshots transcript, and appends TASK envelope", async () => {
    const writeFile = vi.fn(async () => {});
    const readFile = vi.fn(async () => "transcript-backup");
    const appendEnvelope = vi.fn(async () => {});
    const now = new Date("2026-03-19T22:40:00.000Z");

    const backup = await executeKickoffMutation({
      bubbleId: "b_kickoff_exec_01",
      implementer: "codex",
      task: {
        content: "Kickoff implementation task",
        source: "inline"
      },
      taskArtifactPath: "/tmp/task.md",
      bubbleTomlPath: "/tmp/bubble.toml",
      nextBubbleToml: "toml-next",
      transcriptPath: "/tmp/transcript.ndjson",
      locksDir: "/tmp/locks",
      now,
      writeFile,
      readFile,
      appendEnvelope
    });

    expect(backup).toBe("transcript-backup");
    expect(writeFile).toHaveBeenCalledTimes(2);
    expect(readFile).toHaveBeenCalledWith("/tmp/transcript.ndjson", "utf8");
    expect(appendEnvelope).toHaveBeenCalledWith({
      transcriptPath: "/tmp/transcript.ndjson",
      lockPath: "/tmp/locks/b_kickoff_exec_01.lock",
      now,
      envelope: {
        bubble_id: "b_kickoff_exec_01",
        sender: "orchestrator",
        recipient: "codex",
        type: "TASK",
        round: 1,
        payload: {
          summary: "Kickoff implementation task",
          metadata: {
            source: "inline"
          }
        },
        refs: ["/tmp/task.md"]
      }
    });
  });

  it("forwards appended envelope via optional callback", async () => {
    const writeFile = vi.fn(async () => {});
    const readFile = vi.fn(async () => "transcript-backup");
    const nowIso = "2026-03-19T22:41:00.000Z";
    const appendEnvelope = vi.fn(async () => ({
      envelope: {
        id: "msg_20260319_0001",
        ts: nowIso,
        bubble_id: "b_kickoff_exec_02",
        sender: "orchestrator",
        recipient: "codex",
        type: "TASK",
        round: 1,
        payload: {
          summary: "Kickoff callback task",
          metadata: {
            source: "inline"
          }
        },
        refs: ["/tmp/task.md"]
      }
    }));
    const onEnvelopeAppended = vi.fn();

    await executeKickoffMutation({
      bubbleId: "b_kickoff_exec_02",
      implementer: "codex",
      task: {
        content: "Kickoff callback task",
        source: "inline"
      },
      taskArtifactPath: "/tmp/task.md",
      bubbleTomlPath: "/tmp/bubble.toml",
      nextBubbleToml: "toml-next",
      transcriptPath: "/tmp/transcript.ndjson",
      locksDir: "/tmp/locks",
      now: new Date(nowIso),
      writeFile,
      readFile,
      appendEnvelope,
      onEnvelopeAppended
    });

    expect(onEnvelopeAppended).toHaveBeenCalledTimes(1);
    expect(onEnvelopeAppended).toHaveBeenCalledWith({
      id: "msg_20260319_0001",
      ts: nowIso,
      bubble_id: "b_kickoff_exec_02",
      sender: "orchestrator",
      recipient: "codex",
      type: "TASK",
      round: 1,
      payload: {
        summary: "Kickoff callback task",
        metadata: {
          source: "inline"
        }
      },
      refs: ["/tmp/task.md"]
    });
  });
});
