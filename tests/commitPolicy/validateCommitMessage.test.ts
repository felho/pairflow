import { execFile } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import { describe, expect, it, vi } from "vitest";

import { validateCommitMessageFile } from "../../tools/commit-policy/validateCommitMessage.js";

const execFileAsync = promisify(execFile);

async function writeMessage(content: string): Promise<string> {
  const tempDir = await mkdtemp(join(tmpdir(), "pairflow-commit-message-"));
  const messagePath = join(tempDir, "COMMIT_EDITMSG");
  await writeFile(messagePath, content, "utf8");
  return messagePath;
}

describe("validate commit message CLI", () => {
  it("accepts a valid message through the package script entrypoint", async () => {
    const messagePath = await writeMessage("feat(cli): add validator\n");
    const result = await execFileAsync(
      "pnpm",
      ["commit-policy:validate-message", "--", messagePath],
      { cwd: process.cwd() }
    );

    expect(result.stdout).toContain("commit-policy: accepted");
    expect(result.stdout).toContain("reason_code: accepted_conventional");
  });

  it("rejects invalid first lines with guidance output", async () => {
    const messagePath = await writeMessage(
      "update stuff\n\nfeat(cli): body cannot rescue this\n"
    );
    const stderr = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      await expect(validateCommitMessageFile(messagePath)).resolves.toBe(1);
      expect(stderr).toHaveBeenCalledWith(
        expect.stringContaining("docs/commit-message-guidance.md")
      );
    } finally {
      stderr.mockRestore();
    }
  });
});
