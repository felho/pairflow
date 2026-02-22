import { realpath } from "node:fs/promises";
import { resolve } from "node:path";

import { runGit } from "../workspace/git.js";

export interface ResolveRepoPathInput {
  repoPath?: string | undefined;
  cwd?: string | undefined;
}

export class RepoResolutionError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "RepoResolutionError";
  }
}

export async function normalizeRepoPath(path: string): Promise<string> {
  return realpath(path).catch(() => resolve(path));
}

export async function resolveRepoPath(
  input: ResolveRepoPathInput = {}
): Promise<string> {
  if (input.repoPath !== undefined) {
    return normalizeRepoPath(resolve(input.repoPath));
  }

  const cwd = resolve(input.cwd ?? process.cwd());
  const result = await runGit(["rev-parse", "--show-toplevel"], {
    cwd,
    allowFailure: true
  });
  if (result.exitCode !== 0) {
    throw new RepoResolutionError(
      `Could not resolve repository root from cwd: ${cwd}`
    );
  }

  const raw = result.stdout.trim();
  if (raw.length === 0) {
    throw new RepoResolutionError(`Git repository root is empty for cwd: ${cwd}`);
  }

  return normalizeRepoPath(resolve(cwd, raw));
}
