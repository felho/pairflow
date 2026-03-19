import { describe, expect, it } from "vitest";

import { buildKickoffTaskEnvelope } from "../../../../src/v11/shared/kickoff/kickoffTaskEnvelope.js";

describe("buildKickoffTaskEnvelope", () => {
  it("builds TASK envelope for inline kickoff input", () => {
    const envelope = buildKickoffTaskEnvelope({
      bubbleId: "b_kickoff_envelope_01",
      implementer: "codex",
      task: {
        content: "Implement kickoff transition",
        source: "inline"
      },
      taskArtifactPath: "/tmp/task.md"
    });

    expect(envelope).toEqual({
      bubble_id: "b_kickoff_envelope_01",
      sender: "orchestrator",
      recipient: "codex",
      type: "TASK",
      round: 1,
      payload: {
        summary: "Implement kickoff transition",
        metadata: {
          source: "inline"
        }
      },
      refs: ["/tmp/task.md"]
    });
  });

  it("includes source_path when task input comes from file", () => {
    const envelope = buildKickoffTaskEnvelope({
      bubbleId: "b_kickoff_envelope_02",
      implementer: "codex",
      task: {
        content: "Implement from file",
        source: "file",
        sourcePath: "/tmp/in/task.md"
      },
      taskArtifactPath: "/tmp/out/task.md"
    });

    expect(envelope.payload.metadata).toEqual({
      source: "file",
      source_path: "/tmp/in/task.md"
    });
    expect(envelope.refs).toEqual(["/tmp/out/task.md"]);
  });
});
