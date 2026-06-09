import { spawn } from "node:child_process";
import { cp, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll } from "vitest";

export interface GitRunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

const templateRepoPromises = new Map<string, Promise<string>>();
const templateRepoPaths = new Set<string>();

export async function runGit(
  cwd: string,
  args: string[],
  allowFailure: boolean = false
): Promise<GitRunResult> {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn("git", args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");

    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });

    child.on("error", (error) => {
      rejectPromise(error);
    });

    child.on("close", (exitCode) => {
      const code = exitCode ?? 1;
      if (code !== 0 && !allowFailure) {
        rejectPromise(
          new Error(`git ${args.join(" ")} failed (${code}): ${stderr.trim()}`)
        );
        return;
      }

      resolvePromise({
        stdout,
        stderr,
        exitCode: code
      });
    });
  });
}

export async function initGitRepository(
  repoPath: string,
  initialBranch: string = "main"
): Promise<void> {
  if (initialBranch === "main") {
    const templatePath = await getTemplateRepository(initialBranch);
    await cp(templatePath, repoPath, {
      recursive: true,
      force: true,
      verbatimSymlinks: true
    });
    return;
  }

  await initGitRepositorySlow(repoPath, initialBranch);
}

async function getTemplateRepository(initialBranch: string): Promise<string> {
  let templatePromise = templateRepoPromises.get(initialBranch);
  if (templatePromise === undefined) {
    templatePromise = createTemplateRepository(initialBranch);
    templateRepoPromises.set(initialBranch, templatePromise);
  }
  return templatePromise;
}

async function createTemplateRepository(initialBranch: string): Promise<string> {
  const templatePath = await mkdtemp(join(tmpdir(), "pairflow-git-template-"));
  templateRepoPaths.add(templatePath);
  await initGitRepositorySlow(templatePath, initialBranch);
  return templatePath;
}

async function initGitRepositorySlow(
  repoPath: string,
  initialBranch: string
): Promise<void> {
  await runGit(repoPath, ["init", "-b", initialBranch]);
  await runGit(repoPath, ["config", "user.email", "pairflow@example.test"]);
  await runGit(repoPath, ["config", "user.name", "Pairflow Test"]);
  await writeFile(join(repoPath, "README.md"), "# Pairflow\n", "utf8");
  await runGit(repoPath, ["add", "README.md"]);
  await runGit(repoPath, ["commit", "-m", "init"]);
}

afterAll(async () => {
  await Promise.all(
    [...templateRepoPaths].map((templatePath) =>
      rm(templatePath, { recursive: true, force: true })
    )
  );
  templateRepoPaths.clear();
  templateRepoPromises.clear();
});
