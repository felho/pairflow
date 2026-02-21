import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

export interface GitRunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

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
  await runGit(repoPath, ["init", "-b", initialBranch]);
  await runGit(repoPath, ["config", "user.email", "pairflow@example.test"]);
  await runGit(repoPath, ["config", "user.name", "Pairflow Test"]);
  await writeFile(join(repoPath, "README.md"), "# Pairflow\n", "utf8");
  await runGit(repoPath, ["add", "README.md"]);
  await runGit(repoPath, ["commit", "-m", "init"]);
}
