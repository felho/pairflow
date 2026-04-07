import { realpath } from "node:fs/promises";
import { resolve } from "node:path";

import { runGit } from "../../workspace/git.js";
import { listPairflowWorkspaceCandidateCwds } from "./commandWorkspaceFallback.js";
import type {
  ResolveRepoPathInput,
  ResolveRepoPathPort
} from "../../../shared/ports/repoResolution.js";

export type {
  ResolveRepoPathInput,
  ResolveRepoPathPort
} from "../../../shared/ports/repoResolution.js";

export class RepoResolutionError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "RepoResolutionError";
  }
}

export async function normalizeRepoPath(path: string): Promise<string> {
  return realpath(path).catch(() => resolve(path));
}

export const resolveRepoPath: ResolveRepoPathPort = async (
  input: ResolveRepoPathInput = {}
): Promise<string> => {
  if (input.repoPath !== undefined) {
    return normalizeRepoPath(resolve(input.repoPath));
  }

  const candidateCwds = listPairflowWorkspaceCandidateCwds(input.cwd);
  const requestedCwd = resolve(input.cwd ?? process.cwd());

  for (const cwd of candidateCwds) {
    const result = await runGit(["rev-parse", "--git-common-dir"], {
      cwd,
      allowFailure: true
    });
    if (result.exitCode !== 0) {
      continue;
    }

    const raw = result.stdout.trim();
    if (raw.length === 0) {
      continue;
    }

    return normalizeRepoPath(resolve(cwd, raw, ".."));
  }

  throw new RepoResolutionError(
    `Could not resolve repository root from cwd: ${requestedCwd}`
  );
};
