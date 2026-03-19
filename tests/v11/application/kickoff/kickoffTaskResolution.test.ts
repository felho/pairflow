import { describe, expect, it } from "vitest";

import { resolveKickoffTask } from "../../../../src/v11/shared/kickoff/kickoffTaskResolution.js";

describe("resolveKickoffTask", () => {
  it("resolves inline kickoff task input", async () => {
    const result = await resolveKickoffTask({
      task: "  Implement kickoff seam  ",
      cwd: process.cwd()
    });

    expect(result).toEqual({
      kind: "resolved",
      task: {
        content: "Implement kickoff seam",
        source: "inline"
      }
    });
  });

  it("returns invalid result when kickoff task input validation fails", async () => {
    const result = await resolveKickoffTask({
      cwd: process.cwd()
    });

    expect(result).toEqual({
      kind: "invalid"
    });
  });

  it("rethrows non-validation errors", async () => {
    await expect(
      resolveKickoffTask({
        taskFile: "\u0000bad-path",
        cwd: process.cwd()
      })
    ).rejects.toThrow();
  });
});
