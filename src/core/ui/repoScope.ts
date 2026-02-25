import { resolve } from "node:path";

import { normalizeRepoPath } from "../bubble/repoResolution.js";
import { readRepoRegistry, registerRepoInRegistry } from "../repo/registry.js";

export interface ResolveUiRepoScopeInput {
  repoPaths?: string[] | undefined;
  cwd?: string | undefined;
  registryPath?: string | undefined;
  readRepoRegistry?: typeof readRepoRegistry;
  registerRepoInRegistry?: typeof registerRepoInRegistry;
  reportRegistryRegistrationWarning?:
    | ((message: string) => void)
    | undefined;
}

export interface UiRepoScopeRefreshResult {
  changed: boolean;
  added: string[];
  removed: string[];
  repos: string[];
}

export interface UiRepoScope {
  readonly repos: string[];
  readonly registryPath?: string | undefined;
  has(repoPath: string): Promise<boolean>;
  refreshFromRegistry?(): Promise<UiRepoScopeRefreshResult>;
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

function diffRepos(previous: string[], next: string[]): {
  added: string[];
  removed: string[];
} {
  const previousSet = new Set(previous);
  const nextSet = new Set(next);
  const added = next.filter((repoPath) => !previousSet.has(repoPath));
  const removed = previous.filter((repoPath) => !nextSet.has(repoPath));
  return {
    added,
    removed
  };
}

function resolveReposFromRegistry(input: {
  registryRepos: string[];
  explicitRepoFilter?: Set<string> | undefined;
}): string[] {
  if (input.explicitRepoFilter === undefined) {
    return uniqueSorted(input.registryRepos);
  }

  const registrySet = new Set(input.registryRepos);
  return uniqueSorted(
    [...input.explicitRepoFilter].filter((repoPath) => registrySet.has(repoPath))
  );
}

export async function resolveUiRepoScope(
  input: ResolveUiRepoScopeInput = {}
): Promise<UiRepoScope> {
  const scopeCwd = resolve(input.cwd ?? process.cwd());
  const readRegistry = input.readRepoRegistry ?? readRepoRegistry;
  const register = input.registerRepoInRegistry ?? registerRepoInRegistry;
  const reportRegistrationWarning =
    input.reportRegistryRegistrationWarning ??
    ((message: string) => {
      process.stderr.write(`${message}\n`);
    });
  const explicitRepoPaths = input.repoPaths ?? [];
  let explicitRepoFilter: Set<string> | undefined;
  if (explicitRepoPaths.length > 0) {
    const normalizedExplicitRepoPaths = uniqueSorted(await Promise.all(
      explicitRepoPaths.map((repoPath) =>
        normalizeRepoPath(resolve(scopeCwd, repoPath))
      )
    ));
    for (const repoPath of normalizedExplicitRepoPaths) {
      try {
        await register({
          repoPath,
          ...(input.registryPath !== undefined
            ? { registryPath: input.registryPath }
            : {})
        });
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        reportRegistrationWarning(
          `Pairflow warning: failed to auto-register repository for ui scope (${repoPath}): ${reason}`
        );
      }
    }
    explicitRepoFilter = new Set(normalizedExplicitRepoPaths);
  }

  const loadedRegistry = await readRegistry({
    allowMissing: true,
    normalizePaths: true,
    ...(input.registryPath !== undefined
      ? { registryPath: input.registryPath }
      : {})
  });
  const registryRepos = loadedRegistry.entries.map((entry) => entry.repoPath);
  const initialRegistryRepos =
    explicitRepoFilter === undefined
      ? registryRepos
      // Keep explicit scope repos in the initial set to avoid transient
      // read-back mismatches after successful registration (TOCTOU on fs state).
      : uniqueSorted([...registryRepos, ...explicitRepoFilter]);
  let resolvedRepos = resolveReposFromRegistry({
    registryRepos: initialRegistryRepos,
    explicitRepoFilter
  });

  let repoSet = new Set(resolvedRepos);
  const registryPath = loadedRegistry.registryPath;
  let lastMissingScopedRepoWarningKey: string | null = null;
  let refreshTail: Promise<void> = Promise.resolve();

  const performRefreshFromRegistry = async (): Promise<UiRepoScopeRefreshResult> => {
    const refreshed = await readRegistry({
      registryPath,
      allowMissing: true,
      normalizePaths: true
    });
    const refreshedRegistryRepos = refreshed.entries.map((entry) => entry.repoPath);
    const nextRepos = resolveReposFromRegistry({
      registryRepos: refreshedRegistryRepos,
      explicitRepoFilter
    });
    if (explicitRepoFilter !== undefined) {
      const refreshedSet = new Set(refreshedRegistryRepos);
      const missingScopedRepos = [...explicitRepoFilter]
        .filter((repoPath) => !refreshedSet.has(repoPath))
        .sort((left, right) => left.localeCompare(right));
      if (missingScopedRepos.length === 0) {
        lastMissingScopedRepoWarningKey = null;
      } else {
        const warningKey = missingScopedRepos.join("\n");
        if (warningKey !== lastMissingScopedRepoWarningKey) {
          reportRegistrationWarning(
            `UI repo scope refresh warning: ${missingScopedRepos.length} scoped repo(s) are no longer registered and were dropped: ${missingScopedRepos.join(", ")}`
          );
          lastMissingScopedRepoWarningKey = warningKey;
        }
      }
    }
    const diff = diffRepos(resolvedRepos, nextRepos);
    resolvedRepos = nextRepos;
    repoSet = new Set(resolvedRepos);
    return {
      changed: diff.added.length > 0 || diff.removed.length > 0,
      added: diff.added,
      removed: diff.removed,
      repos: [...resolvedRepos]
    };
  };

  return {
    get repos(): string[] {
      return [...resolvedRepos];
    },
    registryPath,
    async has(repoPath: string): Promise<boolean> {
      const normalized = await normalizeRepoPath(resolve(scopeCwd, repoPath));
      return repoSet.has(normalized);
    },
    async refreshFromRegistry(): Promise<UiRepoScopeRefreshResult> {
      const refreshResult = refreshTail
        .catch(() => undefined)
        .then(() => performRefreshFromRegistry());
      refreshTail = refreshResult.then(
        () => undefined,
        () => undefined
      );
      return refreshResult;
    }
  };
}

export interface ResolveScopedRepoInput {
  scope: UiRepoScope;
  repoParam?: string | undefined;
  requireExplicitWhenMultiRepo?: boolean | undefined;
  cwd?: string | undefined;
}

export async function resolveScopedRepoPath(
  input: ResolveScopedRepoInput
): Promise<string> {
  const repoCount = input.scope.repos.length;

  if (input.repoParam === undefined || input.repoParam.trim().length === 0) {
    if (repoCount === 0) {
      throw new UiRepoScopeError(
        "UI scope has no repositories. Add one with `pairflow repo add <path>`."
      );
    }
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

  const normalized = await normalizeRepoPath(
    resolve(input.cwd ?? process.cwd(), input.repoParam)
  );
  if (!(await input.scope.has(normalized))) {
    throw new UiRepoScopeError(`Repository is out of UI scope: ${normalized}`);
  }
  return normalized;
}
