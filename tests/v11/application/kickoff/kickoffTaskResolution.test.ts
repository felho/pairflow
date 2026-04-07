import { describe, expect, it } from "vitest";

import { resolveKickoffTask } from "../../../../src/v11/shared/kickoff/kickoffTaskResolution.js";

async function unsupportedRead(): Promise<string> {
  throw new Error("read should not be called in this test");
}

async function unsupportedStat(): Promise<{ isFile(): boolean }> {
  throw new Error("stat should not be called in this test");
}

describe("resolveKickoffTask", () => {
  it("resolves inline kickoff task input", async () => {
    const result = await resolveKickoffTask({
      task: "  Implement kickoff seam  ",
      cwd: process.cwd(),
      readFile: unsupportedRead,
      statFile: unsupportedStat
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
      cwd: process.cwd(),
      readFile: unsupportedRead,
      statFile: unsupportedStat
    });

    expect(result).toEqual({
      kind: "invalid"
    });
  });

  it("rethrows non-validation errors", async () => {
    await expect(
      resolveKickoffTask({
        taskFile: "\u0000bad-path",
        cwd: process.cwd(),
        readFile: unsupportedRead,
        statFile: unsupportedStat
      })
    ).rejects.toThrow();
  });
});
