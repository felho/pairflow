import { spawn } from "node:child_process";

export class GitCommandError extends Error {
  public readonly args: string[];
  public readonly exitCode: number;
  public readonly stderr: string;

  public constructor(args: string[], exitCode: number, stderr: string) {
    super(
      `Git command failed (exit ${exitCode}): git ${args.join(" ")}\n${stderr.trim()}`
    );
    this.name = "GitCommandError";
    this.args = args;
    this.exitCode = exitCode;
    this.stderr = stderr;
  }
}

export class GitRepositoryError extends Error {
  public readonly repoPath: string;

  public constructor(repoPath: string) {
    super(`Not a git repository or bare repository: ${repoPath}`);
    this.name = "GitRepositoryError";
    this.repoPath = repoPath;
  }
}

export interface GitRunOptions {
  cwd: string;
  allowFailure?: boolean;
}

export interface GitRunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export async function runGit(
  args: string[],
  options: GitRunOptions
): Promise<GitRunResult> {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn("git", args, {
      cwd: options.cwd,
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
      if (code !== 0 && !options.allowFailure) {
        rejectPromise(new GitCommandError(args, code, stderr));
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

export async function assertGitRepository(repoPath: string): Promise<void> {
  const insideWorktree = await runGit(["rev-parse", "--is-inside-work-tree"], {
    cwd: repoPath,
    allowFailure: true
  });
  if (insideWorktree.exitCode === 0 && insideWorktree.stdout.trim() === "true") {
    return;
  }

  const isBare = await runGit(["rev-parse", "--is-bare-repository"], {
    cwd: repoPath,
    allowFailure: true
  });
  if (isBare.exitCode === 0 && isBare.stdout.trim() === "true") {
    return;
  }

  throw new GitRepositoryError(repoPath);
}

export async function branchExists(repoPath: string, branch: string): Promise<boolean> {
  const result = await runGit(
    ["show-ref", "--verify", "--quiet", `refs/heads/${branch}`],
    {
      cwd: repoPath,
      allowFailure: true
    }
  );
  return result.exitCode === 0;
}

export async function refExists(repoPath: string, ref: string): Promise<boolean> {
  const result = await runGit(["show-ref", "--verify", "--quiet", ref], {
    cwd: repoPath,
    allowFailure: true
  });
  return result.exitCode === 0;
}
