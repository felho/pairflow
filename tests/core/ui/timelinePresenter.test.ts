import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { readBubbleTimelineFromTranscriptPath } from "../../../src/core/ui/presenters/timelinePresenter.js";

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
  it("returns timeline entries when transcript includes forward-compatible PASS payload fields", async () => {
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
    expect(timeline[0]?.type).toBe("TASK");
    expect(timeline[1]?.type).toBe("PASS");
    expect(timeline[1]?.payload.summary).toBe("Forward-compatible payload fields");
    expect(timeline[1]?.payload.pass_intent).toBe("review");
  });
});
