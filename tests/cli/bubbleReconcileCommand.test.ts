import { describe, expect, it } from "vitest";

import {
  getBubbleReconcileHelpText,
  parseBubbleReconcileCommandOptions,
  runBubbleReconcileCommand
} from "../../src/cli/commands/bubble/reconcile.js";

describe("parseBubbleReconcileCommandOptions", () => {
  it("parses optional flags", () => {
    const parsed = parseBubbleReconcileCommandOptions([
      "--repo",
      "/tmp/repo",
      "--dry-run",
      "--json"
    ]);

    expect(parsed.help).toBe(false);
    if (parsed.help) {
      throw new Error("Expected validated bubble reconcile options");
    }

    expect(parsed.repo).toBe("/tmp/repo");
    expect(parsed.dryRun).toBe(true);
    expect(parsed.json).toBe(true);
  });

  it("supports help", () => {
    const parsed = parseBubbleReconcileCommandOptions(["--help"]);
    expect(parsed.help).toBe(true);
    expect(getBubbleReconcileHelpText()).toContain("pairflow bubble reconcile");
  });
});

describe("runBubbleReconcileCommand", () => {
  it("returns null on help", async () => {
    const result = await runBubbleReconcileCommand(["--help"]);
    expect(result).toBeNull();
  });
});
