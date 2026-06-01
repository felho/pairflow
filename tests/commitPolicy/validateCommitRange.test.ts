import { execFile } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const repoRoot = process.cwd();
const rangeCliPath = join(repoRoot, "tools/commit-policy/validateCommitRange.ts");
const tsxBinPath = join(repoRoot, "node_modules/.bin/tsx");

function outputFrom(error: unknown, stream: "stdout" | "stderr"): string {
  if (typeof error === "object" && error !== null && stream in error) {
    const value = (error as Record<typeof stream, unknown>)[stream];
    return typeof value === "string" ? value : "";
  }
  return "";
}

async function expectCommandFailure(
  command: Promise<unknown>,
  expectedStderr: string
): Promise<void> {
  let failure: unknown;
  try {
    await command;
  } catch (error) {
    failure = error;
  }

  expect(failure).toMatchObject({ code: 1 });
  expect(outputFrom(failure, "stderr")).toContain(expectedStderr);
}

async function git(cwd: string, args: string[]): Promise<string> {
  const result = await execFileAsync("git", args, { cwd });
  return result.stdout.trim();
}

async function createRepo(): Promise<string> {
  const repoDir = await mkdtemp(join(tmpdir(), "pairflow-commit-range-"));
  await git(repoDir, ["init"]);
  await git(repoDir, ["config", "user.name", "Pairflow Test"]);
  await git(repoDir, ["config", "user.email", "pairflow@example.test"]);
  await writeFile(join(repoDir, "file.txt"), "base\n", "utf8");
  await git(repoDir, ["add", "."]);
  await git(repoDir, ["commit", "-m", "chore(test): base"]);
  return repoDir;
}

async function commit(repoDir: string, message: string): Promise<string> {
  const filePath = join(repoDir, "file.txt");
  await writeFile(filePath, `${message}\n${Date.now()}\n`, { flag: "a" });
  await git(repoDir, ["add", "."]);
  await git(repoDir, ["commit", "-m", message]);
  return git(repoDir, ["rev-parse", "HEAD"]);
}

async function commitWithBody(repoDir: string): Promise<string> {
  const filePath = join(repoDir, "file.txt");
  await writeFile(filePath, `body-only\n${Date.now()}\n`, { flag: "a" });
  await git(repoDir, ["add", "."]);
  await git(repoDir, [
    "commit",
    "-m",
    "update stuff",
    "-m",
    "feat(cli): body cannot rescue this"
  ]);
  return git(repoDir, ["rev-parse", "HEAD"]);
}

describe("validate commit range CLI", () => {
  it("validates an explicit safe range", async () => {
    const repoDir = await createRepo();
    const base = await git(repoDir, ["rev-parse", "HEAD"]);
    await commit(repoDir, "feat(cli): add range validator");
    const head = await git(repoDir, ["rev-parse", "HEAD"]);

    const result = await execFileAsync(
      tsxBinPath,
      [rangeCliPath, "--from", base, "--to", head],
      { cwd: repoDir }
    );

    expect(result.stdout).toContain("commit-policy range: validated");
    expect(result.stdout).toContain("reason_code: range_validated");
  });

  it("reports all invalid commits in an explicit safe range", async () => {
    const repoDir = await createRepo();
    const base = await git(repoDir, ["rev-parse", "HEAD"]);
    await commit(repoDir, "update stuff");
    await commit(repoDir, "bubble(2b-commit-policy): finalize");
    const head = await git(repoDir, ["rev-parse", "HEAD"]);

    await expectCommandFailure(
      execFileAsync(
        tsxBinPath,
        [rangeCliPath, "--from", base, "--to", head],
        { cwd: repoDir }
      ),
      "range_contains_invalid_commit"
    );
  });

  it("fails closed when explicit range endpoints are missing", async () => {
    await expectCommandFailure(
      execFileAsync("pnpm", ["commit-policy:validate-range"], {
        cwd: process.cwd()
      }),
      "rejected_missing_safe_range"
    );
  });

  it("fails closed when an explicit safe range contains no commits", async () => {
    const repoDir = await createRepo();
    const head = await git(repoDir, ["rev-parse", "HEAD"]);

    await expectCommandFailure(
      execFileAsync(
        tsxBinPath,
        [rangeCliPath, "--from", head, "--to", head],
        { cwd: repoDir }
      ),
      "explicit safe range contained no commits"
    );
  });

  it("fails closed with missing safe range reason when revisions cannot be resolved", async () => {
    const repoDir = await createRepo();
    const head = await git(repoDir, ["rev-parse", "HEAD"]);

    await expectCommandFailure(
      execFileAsync(
        tsxBinPath,
        [rangeCliPath, "--from", "missing-base", "--to", head],
        { cwd: repoDir }
      ),
      "rejected_missing_safe_range"
    );
  });

  it("rejects body-only conventional candidates inside a range", async () => {
    const repoDir = await createRepo();
    const base = await git(repoDir, ["rev-parse", "HEAD"]);
    await commitWithBody(repoDir);
    const head = await git(repoDir, ["rev-parse", "HEAD"]);

    await expectCommandFailure(
      execFileAsync(
        tsxBinPath,
        [rangeCliPath, "--from", base, "--to", head],
        { cwd: repoDir }
      ),
      "rejected_body_only_conventional"
    );
  });

  it("exposes the range validator through the package script entrypoint", async () => {
    await expectCommandFailure(
      execFileAsync("pnpm", ["commit-policy:validate-range"], {
        cwd: repoRoot
      }),
      "rejected_missing_safe_range"
    );
  });
});
