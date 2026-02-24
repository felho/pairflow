import { resolve } from "node:path";

import { normalizeRepoPath, resolveRepoPath } from "../bubble/repoResolution.js";
import { assertGitRepository, GitRepositoryError } from "../workspace/git.js";

export interface ResolveUiRepoScopeInput {
  repoPaths?: string[] | undefined;
  cwd?: string | undefined;
}

export interface UiRepoScope {
  repos: string[];
  has(repoPath: string): Promise<boolean>;
}

export class UiRepoScopeError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "UiRepoScopeError";
  }
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

async function assertRepo(path: string): Promise<void> {
  try {
    await assertGitRepository(path);
  } catch (error) {
    if (error instanceof GitRepositoryError) {
      throw new UiRepoScopeError(error.message);
    }
    if (error instanceof Error) {
      throw new UiRepoScopeError(
        `Failed to validate repository path ${path}: ${error.message}`
      );
    }
    throw error;
  }
}

export async function resolveUiRepoScope(
  input: ResolveUiRepoScopeInput = {}
): Promise<UiRepoScope> {
  const explicitRepoPaths = input.repoPaths ?? [];
  const resolvedRepoPaths: string[] = [];

  if (explicitRepoPaths.length > 0) {
    for (const repoPath of explicitRepoPaths) {
      const normalized = await normalizeRepoPath(resolve(repoPath));
      await assertRepo(normalized);
      resolvedRepoPaths.push(normalized);
    }
  } else {
    let discoveredRepoPath: string;
    try {
      discoveredRepoPath = await resolveRepoPath({
        cwd: input.cwd
      });
    } catch (error) {
      if (error instanceof Error) {
        throw new UiRepoScopeError(error.message);
      }
      throw error;
    }
    await assertRepo(discoveredRepoPath);
    resolvedRepoPaths.push(discoveredRepoPath);
  }

  const repos = uniqueSorted(resolvedRepoPaths);
  if (repos.length === 0) {
    throw new UiRepoScopeError(
      "No repositories resolved for Pairflow UI server scope."
    );
  }

  const repoSet = new Set(repos);
  return {
    repos,
    async has(repoPath: string): Promise<boolean> {
      const normalized = await normalizeRepoPath(resolve(repoPath));
      return repoSet.has(normalized);
    }
  };
}

export interface ResolveScopedRepoInput {
  scope: UiRepoScope;
  repoParam?: string | undefined;
  requireExplicitWhenMultiRepo?: boolean | undefined;
}

export async function resolveScopedRepoPath(
  input: ResolveScopedRepoInput
): Promise<string> {
  const repoCount = input.scope.repos.length;

  if (input.repoParam === undefined || input.repoParam.trim().length === 0) {
    if (repoCount === 1) {
      const first = input.scope.repos[0];
      if (first === undefined) {
        throw new UiRepoScopeError("Resolved scope unexpectedly has no repos.");
      }
      return first;
    }
    if (input.requireExplicitWhenMultiRepo ?? true) {
      throw new UiRepoScopeError(
        "Query parameter `repo` is required when UI scope contains multiple repositories."
      );
    }
    throw new UiRepoScopeError("Missing `repo` query parameter.");
  }

  const normalized = await normalizeRepoPath(resolve(input.repoParam));
  if (!(await input.scope.has(normalized))) {
    throw new UiRepoScopeError(`Repository is out of UI scope: ${normalized}`);
  }
  return normalized;
}
