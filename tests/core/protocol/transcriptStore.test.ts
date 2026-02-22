import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  appendProtocolEnvelope,
  appendProtocolEnvelopes,
  ProtocolTranscriptLockError,
  ProtocolTranscriptValidationError,
  readTranscriptEnvelopesOrThrow,
  readTranscriptEnvelopes
} from "../../../src/core/protocol/transcriptStore.js";
import type { ProtocolEnvelopeDraft } from "../../../src/core/protocol/transcriptStore.js";

const tempDirs: string[] = [];

async function createTempRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-protocol-store-"));
  tempDirs.push(root);
  return root;
}

function createDraft(partial: Partial<ProtocolEnvelopeDraft> = {}): ProtocolEnvelopeDraft {
  return {
    bubble_id: "b_protocol_01",
    sender: "codex",
    recipient: "claude",
    type: "PASS",
    round: 1,
    payload: {
      summary: "handoff"
    },
    refs: [],
    ...partial
  };
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((path) =>
      rm(path, { recursive: true, force: true })
    )
  );
});

describe("appendProtocolEnvelope", () => {
  it("appends validated envelopes with allocated sequence ids", async () => {
    const root = await createTempRoot();
    const transcriptPath = join(root, "transcript.ndjson");
    const lockPath = join(root, "b_protocol_01.lock");
    const now = new Date("2026-02-21T12:00:00.000Z");

    const first = await appendProtocolEnvelope({
      transcriptPath,
      lockPath,
      envelope: createDraft(),
      now
    });
    const second = await appendProtocolEnvelope({
      transcriptPath,
      lockPath,
      envelope: createDraft({ round: 2, sender: "claude", recipient: "codex" }),
      now
    });

    expect(first.sequence).toBe(1);
    expect(first.envelope.id).toBe("msg_20260221_001");
    expect(first.mirrorWriteFailures).toEqual([]);
    expect(second.sequence).toBe(2);
    expect(second.envelope.id).toBe("msg_20260221_002");
    expect(second.mirrorWriteFailures).toEqual([]);

    const transcript = await readTranscriptEnvelopes(transcriptPath);
    expect(transcript).toHaveLength(2);
    expect(transcript[0]?.id).toBe("msg_20260221_001");
    expect(transcript[1]?.id).toBe("msg_20260221_002");
  });

  it("rejects transcript with mixed bubble ids", async () => {
    const root = await createTempRoot();
    const transcriptPath = join(root, "transcript.ndjson");
    const lockPath = join(root, "b_protocol_01.lock");

    await writeFile(
      transcriptPath,
      `${JSON.stringify({
        id: "msg_20260221_001",
        ts: "2026-02-21T12:00:00.000Z",
        bubble_id: "b_other",
        sender: "codex",
        recipient: "claude",
        type: "PASS",
        round: 1,
        payload: { summary: "x" },
        refs: []
      })}\n`,
      "utf8"
    );

    await expect(
      appendProtocolEnvelope({
        transcriptPath,
        lockPath,
        envelope: createDraft()
      })
    ).rejects.toBeInstanceOf(ProtocolTranscriptValidationError);
  });

  it("writes configured mirror files under the same lock scope", async () => {
    const root = await createTempRoot();
    const transcriptPath = join(root, "transcript.ndjson");
    const inboxPath = join(root, "inbox.ndjson");
    const lockPath = join(root, "b_protocol_01.lock");
    const now = new Date("2026-02-21T12:00:00.000Z");

    const appended = await appendProtocolEnvelope({
      transcriptPath,
      mirrorPaths: [inboxPath],
      lockPath,
      envelope: createDraft(),
      now
    });

    expect(appended.sequence).toBe(1);
    expect(appended.mirrorWriteFailures).toEqual([]);

    const transcript = await readTranscriptEnvelopes(transcriptPath);
    const inbox = await readTranscriptEnvelopes(inboxPath);

    expect(transcript).toHaveLength(1);
    expect(inbox).toHaveLength(1);
    expect(transcript[0]?.id).toBe(inbox[0]?.id);
    expect(inbox[0]?.type).toBe("PASS");
  });

  it("appends a batch atomically under one lock cycle", async () => {
    const root = await createTempRoot();
    const transcriptPath = join(root, "transcript.ndjson");
    const inboxPath = join(root, "inbox.ndjson");
    const lockPath = join(root, "b_protocol_01.lock");
    const now = new Date("2026-02-21T12:00:00.000Z");

    const appended = await appendProtocolEnvelopes({
      transcriptPath,
      lockPath,
      now,
      entries: [
        {
          envelope: createDraft({
            sender: "claude",
            recipient: "orchestrator",
            type: "CONVERGENCE",
            payload: {
              summary: "Converged."
            }
          })
        },
        {
          envelope: createDraft({
            sender: "orchestrator",
            recipient: "human",
            type: "APPROVAL_REQUEST",
            payload: {
              summary: "Please approve."
            }
          }),
          mirrorPaths: [inboxPath]
        }
      ]
    });

    expect(appended.entries).toHaveLength(2);
    expect(appended.entries[0]?.sequence).toBe(1);
    expect(appended.entries[1]?.sequence).toBe(2);
    expect(appended.entries[0]?.mirrorWriteFailures).toEqual([]);
    expect(appended.entries[1]?.mirrorWriteFailures).toEqual([]);

    const transcript = await readTranscriptEnvelopes(transcriptPath);
    const inbox = await readTranscriptEnvelopes(inboxPath);

    expect(transcript.map((entry) => entry.type)).toEqual([
      "CONVERGENCE",
      "APPROVAL_REQUEST"
    ]);
    expect(inbox.map((entry) => entry.type)).toEqual(["APPROVAL_REQUEST"]);
  });

  it("does not fail when mirror write fails after transcript append", async () => {
    const root = await createTempRoot();
    const transcriptPath = join(root, "transcript.ndjson");
    const lockPath = join(root, "b_protocol_01.lock");
    const now = new Date("2026-02-21T12:00:00.000Z");

    const appended = await appendProtocolEnvelope({
      transcriptPath,
      mirrorPaths: [root],
      lockPath,
      envelope: createDraft(),
      now
    });

    expect(appended.sequence).toBe(1);
    expect(appended.mirrorWriteFailures).toHaveLength(1);
    expect(appended.mirrorWriteFailures[0]?.path).toBe(root);

    const transcript = await readTranscriptEnvelopes(transcriptPath);
    expect(transcript).toHaveLength(1);
    expect(transcript[0]?.id).toBe("msg_20260221_001");
  });

  it("keeps strict monotonic ids under concurrent appends", async () => {
    const root = await createTempRoot();
    const transcriptPath = join(root, "transcript.ndjson");
    const lockPath = join(root, "b_protocol_01.lock");
    const now = new Date("2026-02-21T15:30:00.000Z");

    const writes = await Promise.all(
      Array.from({ length: 12 }, (_, index) =>
        appendProtocolEnvelope({
          transcriptPath,
          lockPath,
          envelope: createDraft({ round: index + 1 }),
          now
        })
      )
    );

    expect(writes).toHaveLength(12);

    const transcript = await readTranscriptEnvelopes(transcriptPath);
    expect(transcript).toHaveLength(12);

    const ids = transcript.map((entry) => entry.id);
    expect(ids).toEqual([
      "msg_20260221_001",
      "msg_20260221_002",
      "msg_20260221_003",
      "msg_20260221_004",
      "msg_20260221_005",
      "msg_20260221_006",
      "msg_20260221_007",
      "msg_20260221_008",
      "msg_20260221_009",
      "msg_20260221_010",
      "msg_20260221_011",
      "msg_20260221_012"
    ]);
  });

  it("fails when lock cannot be acquired before timeout", async () => {
    const root = await createTempRoot();
    const transcriptPath = join(root, "transcript.ndjson");
    const lockPath = join(root, "b_protocol_01.lock");

    await writeFile(lockPath, "locked", "utf8");

    await expect(
      appendProtocolEnvelope({
        transcriptPath,
        lockPath,
        envelope: createDraft(),
        lockTimeoutMs: 20
      })
    ).rejects.toBeInstanceOf(ProtocolTranscriptLockError);
  });

  it("drops truncated final line during read and recovers on next append", async () => {
    const root = await createTempRoot();
    const transcriptPath = join(root, "transcript.ndjson");
    const lockPath = join(root, "b_protocol_01.lock");
    const now = new Date("2026-02-21T12:00:00.000Z");

    await writeFile(
      transcriptPath,
      `${JSON.stringify({
        id: "msg_20260221_001",
        ts: "2026-02-21T12:00:00.000Z",
        bubble_id: "b_protocol_01",
        sender: "codex",
        recipient: "claude",
        type: "PASS",
        round: 1,
        payload: { summary: "valid" },
        refs: []
      })}\n{"id":"msg_20260221_002"`,
      "utf8"
    );

    const readBeforeAppend = await readTranscriptEnvelopes(transcriptPath);
    expect(readBeforeAppend).toHaveLength(1);

    await appendProtocolEnvelope({
      transcriptPath,
      lockPath,
      envelope: createDraft({ round: 2 }),
      now
    });

    const recovered = await readTranscriptEnvelopes(transcriptPath);
    expect(recovered).toHaveLength(2);
    expect(recovered[0]?.id).toBe("msg_20260221_001");
    expect(recovered[1]?.id).toBe("msg_20260221_002");
  });

  it("provides an or-throw reader for explicit missing-file handling", async () => {
    const root = await createTempRoot();
    const transcriptPath = join(root, "missing.ndjson");

    await expect(readTranscriptEnvelopesOrThrow(transcriptPath)).rejects.toMatchObject({
      code: "ENOENT"
    });
  });
});
