import { execFile } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);

function outputFrom(error: unknown, stream: "stdout" | "stderr"): string {
  if (typeof error === "object" && error !== null && stream in error) {
    const value = (error as Record<typeof stream, unknown>)[stream];
    return typeof value === "string" ? value : "";
  }
  return "";
}

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

    let failure: unknown;
    try {
      await execFileAsync("pnpm", ["commit-policy:validate-message", "--", messagePath], {
        cwd: process.cwd()
      });
    } catch (error) {
      failure = error;
    }

    expect(failure).toMatchObject({ code: 1 });
    expect(outputFrom(failure, "stderr")).toContain("docs/commit-message-guidance.md");
  });
});
