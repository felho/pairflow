import { describe, expect, it } from "vitest";

import { buildKickoffEntrypointInvocation } from "../../../../src/v11/application/kickoff/kickoffEntrypointInvocationBuilder.js";

describe("kickoffEntrypointInvocationBuilder", () => {
  it("maps normalized kickoff entrypoint input to run-flow contract", () => {
    const now = new Date("2026-03-19T23:10:00.000Z");

    expect(
      buildKickoffEntrypointInvocation({
        normalizedInput: {
          bubbleId: "b_kickoff_invocation_01",
          repoPath: "/repo",
          task: "Implement kickoff flow seam",
          taskFile: "/tmp/task.md",
          cwd: "/repo/work",
          now
        }
      })
    ).toEqual({
      bubbleId: "b_kickoff_invocation_01",
      repoPath: "/repo",
      task: "Implement kickoff flow seam",
      taskFile: "/tmp/task.md",
      cwd: "/repo/work",
      now,
      nowIso: "2026-03-19T23:10:00.000Z"
    });
  });
});
