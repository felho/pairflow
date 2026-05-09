import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { relative } from "node:path";
import { describe, expect, it } from "vitest";
import { createAlmostE2eSmokeFixtureRepo } from "./fixtureRepo.js";

describe("almost e2e smoke fixture repo", () => {
  it("creates a committed git repo with Pairflow config and cleanup", async () => {
    const fixture = await createAlmostE2eSmokeFixtureRepo();
    try {
      await expect(readFile(fixture.pairflowTomlPath, "utf8")).resolves.toContain(
        "base_branch"
      );
      await expect(readFile(`${fixture.root}/README.md`, "utf8")).resolves.toContain(
        "Smoke Fixture"
      );
      await expect(readFile(`${fixture.root}/.git/HEAD`, "utf8")).resolves.toContain(
        "main"
      );
    } finally {
      await fixture.cleanup();
    }

    await expect(readFile(fixture.pairflowTomlPath, "utf8")).rejects.toThrow();
  });

  it("sanitizes caller prefix before creating the temp directory", async () => {
    const fixture = await createAlmostE2eSmokeFixtureRepo({
      prefix: "../escape/path"
    });
    try {
      const relativePath = relative(tmpdir(), fixture.root);
      expect(relativePath.startsWith("..")).toBe(false);
      expect(relativePath).toContain("pairflow----escape-path-");
    } finally {
      await fixture.cleanup();
    }
  });
});
