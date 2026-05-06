import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  readBubbleTimeline,
  readBubbleTimelineFromTranscriptPath
} from "../../../src/v11/infrastructure/ui/presenters/timelinePresenter.js";

const tempDirs: string[] = [];

async function createTempDir(): Promise<string> {
  const path = await mkdtemp(join(tmpdir(), "pairflow-ui-timeline-"));
  tempDirs.push(path);
  return path;
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((path) =>
      rm(path, {
        recursive: true,
        force: true
      })
    )
  );
});

describe("timelinePresenter lenient fallback", () => {
  it("returns timeline display items while dropping open claims without renderable findings", async () => {
    const dir = await createTempDir();
    const transcriptPath = join(dir, "transcript.ndjson");

    const taskLine = JSON.stringify({
      id: "msg_20260313_001",
      ts: "2026-03-13T12:05:14.149Z",
      bubble_id: "b_ui_compat_01",
      sender: "orchestrator",
      recipient: "codex",
      type: "TASK",
      round: 0,
      payload: {
        summary: "Task"
      },
      refs: []
    });
    const passLineWithNewFields = JSON.stringify({
      id: "msg_20260313_002",
      ts: "2026-03-13T12:25:31.766Z",
      bubble_id: "b_ui_compat_01",
      sender: "codex",
      recipient: "claude",
      type: "PASS",
      round: 1,
      payload: {
        summary: "Forward-compatible payload fields",
        pass_intent: "review",
        findings_claim_state: "open_findings",
        findings_claim_source: "payload_findings_count"
      },
      refs: [".pairflow/evidence/typecheck.log"]
    });
    await writeFile(transcriptPath, `${taskLine}\n${passLineWithNewFields}\n`, "utf8");

    const timeline = await readBubbleTimelineFromTranscriptPath(transcriptPath);

    expect(timeline).toHaveLength(2);
    expect(timeline[0]).toMatchObject({
      id: "msg_20260313_001",
      summaryText: "Task",
      senderLabel: "orchestrator",
      role: "system"
    });
    expect(timeline[1]).toMatchObject({
      id: "msg_20260313_002",
      summaryText: "Forward-compatible payload fields",
      senderLabel: "codex",
      role: "implementer",
      badges: []
    });
  });

  it("falls back after strict parser Invalid protocol envelope and drops open claims without findings", async () => {
    const dir = await createTempDir();
    const transcriptPath = join(dir, "transcript.ndjson");

    const invalidForStrictButLenientCompatibleLine = JSON.stringify({
      id: "msg_20260313_003",
      ts: "2026-03-13T12:30:31.766Z",
      bubble_id: "b_ui_compat_02",
      sender: "reviewer",
      recipient: "human",
      type: "PASS",
      round: 1,
      payload: {
        summary: "Strict parse should fail because sender enum is invalid.",
        pass_intent: "review",
        findings_claim_state: "open_findings",
        findings_claim_source: "payload_findings_count"
      },
      refs: [".pairflow/evidence/typecheck.log"]
    });
    await writeFile(
      transcriptPath,
      `${invalidForStrictButLenientCompatibleLine}\n`,
      "utf8"
    );

    const timeline = await readBubbleTimelineFromTranscriptPath(transcriptPath);

    expect(timeline).toHaveLength(1);
    expect(timeline[0]).toMatchObject({
      senderLabel: "reviewer",
      role: "reviewer",
      badges: []
    });
    expect(timeline[0]?.summaryText).toContain("Strict parse should fail");
  });

  it("reads remote transcript content for started ssh bubbles instead of stale local transcript", async () => {
    const dir = await createTempDir();
    const transcriptPath = join(dir, "transcript.ndjson");
    await writeFile(
      transcriptPath,
      `${JSON.stringify({
        id: "msg_local_001",
        ts: "2026-04-19T19:50:57.099Z",
        bubble_id: "remote-smoke18",
        sender: "orchestrator",
        recipient: "codex",
        type: "TASK",
        round: 0,
        payload: {
          summary: "Only local bootstrap task"
        },
        refs: []
      })}\n`,
      "utf8"
    );

    const runCommand = vi.fn(async () => ({
      stdout: [
        JSON.stringify({
          id: "msg_20260419_001",
          ts: "2026-04-19T19:50:57.099Z",
          bubble_id: "remote-smoke18",
          sender: "orchestrator",
          recipient: "codex",
          type: "TASK",
          round: 0,
          payload: {
            summary: "Remote task"
          },
          refs: []
        }),
        JSON.stringify({
          id: "msg_20260419_002",
          ts: "2026-04-19T19:51:43.291Z",
          bubble_id: "remote-smoke18",
          sender: "codex",
          recipient: "claude",
          type: "PASS",
          round: 1,
          payload: {
            summary: "Remote PASS"
          },
          refs: []
        })
      ].join("\n"),
      stderr: "",
      exitCode: 0
    }));

    const timeline = await readBubbleTimeline(
      {
        bubbleId: "remote-smoke18",
        repoPath: "/repo"
      },
      {
        resolveBubbleById: vi.fn(async () => ({
          bubbleId: "remote-smoke18",
          repoPath: "/repo",
          bubbleConfig: {
            executor: {
              type: "ssh",
              remote: "spark1"
            }
          },
          bubblePaths: {
            transcriptPath,
            remotePointerPath: "/repo/.pairflow/bubbles/remote-smoke18/remote.json"
          }
        })) as never,
        readRemotePointer: vi.fn(async () => ({
          kind: "started",
          host: "spark1",
          remoteClonePath: "/home/felho/repos/pairflow--remote-smoke18",
          instanceId: "instance-1",
          tmuxSession: "pf-remote-smoke18",
          startedAt: "2026-04-19T19:50:57.099Z"
        })) as never,
        resolveRemoteBubbleStatusTarget: vi.fn(async () => ({
          alias: "spark1",
          host: "spark1",
          pairflowCommand: "pairflow"
        })) as never,
        runCommand: runCommand as never
      }
    );

    expect(timeline).toHaveLength(2);
    expect(timeline.map((entry) => entry.id)).toEqual([
      "msg_20260419_001",
      "msg_20260419_002"
    ]);
    expect(timeline[1]?.summaryText).toBe("Remote PASS");
    expect(runCommand).toHaveBeenCalledWith(
      "ssh",
      expect.arrayContaining([
        "spark1",
        "if [ -f '/home/felho/repos/pairflow--remote-smoke18/.pairflow/bubbles/remote-smoke18/transcript.ndjson' ]; then cat '/home/felho/repos/pairflow--remote-smoke18/.pairflow/bubbles/remote-smoke18/transcript.ndjson'; fi"
      ]),
      expect.any(Object)
    );
  });
});
