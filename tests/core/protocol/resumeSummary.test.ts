import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { buildResumeTranscriptSummary } from "../../../src/core/protocol/resumeSummary.js";
import type { ProtocolEnvelope } from "../../../src/types/protocol.js";

const tempDirs: string[] = [];

async function createTempRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-resume-summary-"));
  tempDirs.push(root);
  return root;
}

function createEnvelope(
  sequence: number,
  partial: Partial<ProtocolEnvelope> = {}
): ProtocolEnvelope {
  const base: ProtocolEnvelope = {
    id: `msg_20260224_${String(sequence).padStart(3, "0")}`,
    ts: `2026-02-24T12:${String(sequence % 60).padStart(2, "0")}:00.000Z`,
    bubble_id: "b_resume_summary_01",
    sender: "codex",
    recipient: "claude",
    type: "PASS",
    round: 1,
    payload: {
      summary: `pass summary ${sequence}`
    },
    refs: []
  };

  return {
    ...base,
    ...partial,
    payload: partial.payload ?? base.payload
  };
}

async function writeTranscript(
  transcriptPath: string,
  envelopes: readonly ProtocolEnvelope[]
): Promise<void> {
  const raw = `${envelopes.map((entry) => JSON.stringify(entry)).join("\n")}\n`;
  await writeFile(transcriptPath, raw, "utf8");
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((path) =>
      rm(path, { recursive: true, force: true })
    )
  );
});

describe("buildResumeTranscriptSummary", () => {
  it("summarizes empty/missing transcript safely", async () => {
    const root = await createTempRoot();
    const transcriptPath = join(root, "missing.ndjson");

    const summary = await buildResumeTranscriptSummary({ transcriptPath });

    expect(summary).toContain("messages=0");
    expect(summary).toContain("max_round=0");
    expect(summary).toContain("PASS highlights: none.");
    expect(summary).toContain("latest_message: none.");
  });

  it("keeps summary within deterministic bounds on long transcripts", async () => {
    const root = await createTempRoot();
    const transcriptPath = join(root, "transcript.ndjson");
    const longSummaryText = "x".repeat(240);

    await writeTranscript(
      transcriptPath,
      Array.from({ length: 64 }, (_, index) =>
        createEnvelope(index + 1, {
          round: index + 1,
          payload: {
            summary: `long-pass-${index + 1} ${longSummaryText}`
          }
        })
      )
    );

    const summary = await buildResumeTranscriptSummary({ transcriptPath });

    expect(summary.length).toBeLessThanOrEqual(3_800);
    expect(summary).toContain("messages=64");
    expect(summary).toContain("PASS r64");
  });

  it("extracts PASS summaries and reviewer findings", async () => {
    const root = await createTempRoot();
    const transcriptPath = join(root, "transcript.ndjson");

    await writeTranscript(transcriptPath, [
      createEnvelope(1, {
        payload: {
          summary: "implementer handoff"
        }
      }),
      createEnvelope(2, {
        sender: "claude",
        recipient: "codex",
        payload: {
          summary: "review feedback",
          findings: [
            {
              severity: "P1",
              title: "Missing guard in resume flow"
            },
            {
              severity: "P2",
              title: "Add coverage for reviewer kickoff"
            }
          ]
        }
      })
    ]);

    const summary = await buildResumeTranscriptSummary({ transcriptPath });

    expect(summary).toContain("PASS highlights:");
    expect(summary).toContain("implementer handoff");
    expect(summary).toContain("findings=[P1:Missing guard in resume flow");
    expect(summary).toContain("P2:Add coverage for reviewer kickoff");
  });

  it("infers unresolved HUMAN and APPROVAL items from transcript balances", async () => {
    const root = await createTempRoot();
    const transcriptPath = join(root, "transcript.ndjson");

    await writeTranscript(transcriptPath, [
      createEnvelope(1, {
        type: "HUMAN_QUESTION",
        recipient: "human",
        payload: {
          question: "Need API schema clarification."
        }
      }),
      createEnvelope(2, {
        sender: "orchestrator",
        recipient: "human",
        type: "APPROVAL_REQUEST",
        payload: {
          summary: "Ready for approval."
        }
      })
    ]);

    const summary = await buildResumeTranscriptSummary({ transcriptPath });

    expect(summary).toContain("unresolved_human_questions=1");
    expect(summary).toContain("unresolved_approval_requests=1");
    expect(summary).toContain("HUMAN flow:");
    expect(summary).toContain("HUMAN_QUESTION");
  });

  it("tolerates malformed trailing final line and still summarizes", async () => {
    const root = await createTempRoot();
    const transcriptPath = join(root, "transcript.ndjson");
    const valid = createEnvelope(1, {
      payload: {
        summary: "valid pass"
      }
    });
    await writeFile(
      transcriptPath,
      `${JSON.stringify(valid)}\n{"id":"truncated`,
      "utf8"
    );

    const summary = await buildResumeTranscriptSummary({ transcriptPath });

    expect(summary).toContain("messages=1");
    expect(summary).toContain("valid pass");
    expect(summary).not.toContain("summary unavailable");
  });

  it("returns compact fallback summary on transcript parse failure", async () => {
    const root = await createTempRoot();
    const transcriptPath = join(root, "transcript.ndjson");
    await writeFile(
      transcriptPath,
      "not-json\n{\"id\":\"msg_20260224_001\"}\n",
      "utf8"
    );

    const summary = await buildResumeTranscriptSummary({ transcriptPath });

    expect(summary).toContain("Resume transcript summary unavailable.");
    expect(summary).toContain("reason=");
    expect(summary).toContain("fallback=state-only context");
  });
});
