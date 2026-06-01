import { execFile } from "node:child_process";
import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  stat,
  unlink,
  writeFile
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const repoRoot = process.cwd();

function outputFrom(error: unknown, stream: "stdout" | "stderr"): string {
  if (typeof error === "object" && error !== null && stream in error) {
    const value = (error as Record<typeof stream, unknown>)[stream];
    return typeof value === "string" ? value : "";
  }
  return "";
}

async function createHookFixture(): Promise<string> {
  const fixtureDir = await mkdtemp(join(tmpdir(), "pairflow-hooks-"));
  await mkdir(join(fixtureDir, "scripts"), { recursive: true });
  await mkdir(join(fixtureDir, ".githooks"), { recursive: true });
  await writeFile(
    join(fixtureDir, "scripts/install-git-hooks.sh"),
    await readFile(join(repoRoot, "scripts/install-git-hooks.sh"), "utf8"),
    "utf8"
  );
  await writeFile(
    join(fixtureDir, ".githooks/pre-push"),
    await readFile(join(repoRoot, ".githooks/pre-push"), "utf8"),
    "utf8"
  );
  await writeFile(
    join(fixtureDir, ".githooks/commit-msg"),
    await readFile(join(repoRoot, ".githooks/commit-msg"), "utf8"),
    "utf8"
  );
  await chmod(join(fixtureDir, "scripts/install-git-hooks.sh"), 0o755);
  await execFileAsync("git", ["init"], { cwd: fixtureDir });
  return fixtureDir;
}

describe("install git hooks script", () => {
  it("installs commit-msg beside pre-push and preserves local CI pre-push behavior", async () => {
    const fixtureDir = await createHookFixture();
    const result = await execFileAsync("bash", ["scripts/install-git-hooks.sh"], {
      cwd: fixtureDir
    });

    const hookPath = await execFileAsync("git", ["config", "core.hooksPath"], {
      cwd: fixtureDir
    });
    const prePush = await readFile(join(fixtureDir, ".githooks/pre-push"), "utf8");
    const prePushMode = (await stat(join(fixtureDir, ".githooks/pre-push"))).mode;
    const commitMsgMode = (await stat(join(fixtureDir, ".githooks/commit-msg"))).mode;

    expect(hookPath.stdout.trim()).toBe(".githooks");
    expect(prePush).toContain("pnpm ci:local");
    expect(prePushMode & 0o111).not.toBe(0);
    expect(commitMsgMode & 0o111).not.toBe(0);
    expect(result.stdout).toContain("pre-push hook is now active");
    expect(result.stdout).toContain("commit-msg hook is now active");
  });

  it("stops before git config and chmod when a required hook is missing", async () => {
    const fixtureDir = await createHookFixture();
    await unlink(join(fixtureDir, ".githooks/commit-msg"));

    let failure: unknown;
    try {
      await execFileAsync("bash", ["scripts/install-git-hooks.sh"], {
        cwd: fixtureDir
      });
    } catch (error) {
      failure = error;
    }

    expect(failure).toMatchObject({ code: 1 });
    expect(outputFrom(failure, "stderr")).toContain("Missing required git hook");

    await expect(
      execFileAsync("git", ["config", "core.hooksPath"], { cwd: fixtureDir })
    ).rejects.toMatchObject({ code: 1 });
    const prePushMode = (await stat(join(fixtureDir, ".githooks/pre-push"))).mode;
    expect(prePushMode & 0o111).toBe(0);
  });
});
