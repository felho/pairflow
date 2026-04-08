import { resolve } from "node:path";

import { normalizeRepoPath } from "../executor/workspace/repoResolution.js";
import {
  readRepoRegistry,
  registerRepoInRegistry
} from "../executor/workspace/repoRegistry.js";

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
  refreshFromRegistry?(this: void): Promise<UiRepoScopeRefreshResult>;
}

interface UiRepoScopeErrorContext {
  cwd?: string | undefined;
  reason?: string | undefined;
  repoCount?: number | undefined;
  repoParam?: string | undefined;
  resolvedRepoPath?: string | undefined;
}

interface UiRepoScopeErrorOptions extends ErrorOptions {
  context?: UiRepoScopeErrorContext | undefined;
}

export class UiRepoScopeError extends Error {
  public readonly context: UiRepoScopeErrorContext | undefined;

  public constructor(message: string, options?: UiRepoScopeErrorOptions) {
    super(message, options);
    this.name = "UiRepoScopeError";
    this.context = options?.context;
  }
}

function toUiRepoScopeError(input: {
  message: string;
  context: UiRepoScopeErrorContext;
  cause?: unknown;
}): UiRepoScopeError {
  return new UiRepoScopeError(input.message, {
    context: input.context,
    ...(input.cause !== undefined ? { cause: input.cause } : {})
  });
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function sameStringArray(left: string[], right: string[]): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
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

function createNormalizeRepoList(): (
  repoPaths: Iterable<string>
) => Promise<string[]> {
  return async (repoPaths) =>
    uniqueSorted(
      await Promise.all(
        [...repoPaths].map((repoPath) => normalizeRepoPath(resolve(repoPath)))
      )
    );
}

async function registerExplicitRepoPaths(input: {
  explicitRepoPaths: string[];
  registryPath?: string | undefined;
  register: typeof registerRepoInRegistry;
  reportRegistrationWarning: (message: string) => void;
  scopeCwd: string;
}): Promise<Set<string> | undefined> {
  if (input.explicitRepoPaths.length === 0) {
    return undefined;
  }

  const normalizedExplicitRepoPaths = uniqueSorted(
    await Promise.all(
      input.explicitRepoPaths.map((repoPath) =>
        normalizeRepoPath(resolve(input.scopeCwd, repoPath))
      )
    )
  );
  for (const repoPath of normalizedExplicitRepoPaths) {
    try {
      await input.register({
        repoPath,
        ...(input.registryPath !== undefined
          ? { registryPath: input.registryPath }
          : {})
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      input.reportRegistrationWarning(
        `Pairflow warning: failed to auto-register repository for ui scope (${repoPath}): ${reason}`
      );
    }
  }

  return new Set(normalizedExplicitRepoPaths);
}

function createUiRepoScopeState(input: {
  registryRepos: string[];
  explicitRepoFilter?: Set<string> | undefined;
}): {
  resolvedRepos: string[];
  repoSet: Set<string>;
  explicitRepoFilter?: Set<string> | undefined;
  lastMissingScopedRepoWarningKey: string | null;
  refreshTail: Promise<void>;
} {
  const resolvedRepos = resolveReposFromRegistry(input);
  return {
    resolvedRepos,
    repoSet: new Set(resolvedRepos),
    ...(input.explicitRepoFilter !== undefined
      ? { explicitRepoFilter: input.explicitRepoFilter }
      : {}),
    lastMissingScopedRepoWarningKey: null,
    refreshTail: Promise.resolve()
  };
}

async function refreshExplicitRepoFilter(input: {
  explicitRepoFilter?: Set<string> | undefined;
  normalizeRepoList: (repoPaths: Iterable<string>) => Promise<string[]>;
}): Promise<Set<string> | undefined> {
  if (input.explicitRepoFilter === undefined) {
    return undefined;
  }
  return new Set(await input.normalizeRepoList(input.explicitRepoFilter));
}

async function refreshResolvedRepoState(input: {
  state: {
    resolvedRepos: string[];
    repoSet: Set<string>;
    explicitRepoFilter?: Set<string> | undefined;
    lastMissingScopedRepoWarningKey: string | null;
  };
  readRegistry: typeof readRepoRegistry;
  registryPath?: string | undefined;
  normalizeRepoList: (repoPaths: Iterable<string>) => Promise<string[]>;
  reportRegistrationWarning: (message: string) => void;
}): Promise<UiRepoScopeRefreshResult> {
  const refreshed = await input.readRegistry({
    registryPath: input.registryPath,
    allowMissing: true,
    normalizePaths: true
  });
  const explicitRepoFilter = await refreshExplicitRepoFilter({
    explicitRepoFilter: input.state.explicitRepoFilter,
    normalizeRepoList: input.normalizeRepoList
  });
  input.state.explicitRepoFilter = explicitRepoFilter;
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
      input.state.lastMissingScopedRepoWarningKey = null;
    } else {
      const warningKey = missingScopedRepos.join("\n");
      if (warningKey !== input.state.lastMissingScopedRepoWarningKey) {
        input.reportRegistrationWarning(
          `UI repo scope refresh warning: ${missingScopedRepos.length} scoped repo(s) are no longer registered and were dropped: ${missingScopedRepos.join(", ")}`
        );
        input.state.lastMissingScopedRepoWarningKey = warningKey;
      }
    }
  }

  const diff = diffRepos(input.state.resolvedRepos, nextRepos);
  input.state.resolvedRepos = nextRepos;
  input.state.repoSet = new Set(nextRepos);
  return {
    changed: diff.added.length > 0 || diff.removed.length > 0,
    added: diff.added,
    removed: diff.removed,
    repos: [...nextRepos]
  };
}

async function ensureNormalizedResolvedRepos(input: {
  state: {
    resolvedRepos: string[];
    repoSet: Set<string>;
    explicitRepoFilter?: Set<string> | undefined;
  };
  normalizeRepoList: (repoPaths: Iterable<string>) => Promise<string[]>;
}): Promise<void> {
  const renormalizedRepos = await input.normalizeRepoList(input.state.resolvedRepos);
  if (!sameStringArray(input.state.resolvedRepos, renormalizedRepos)) {
    input.state.resolvedRepos =
      input.state.explicitRepoFilter === undefined
        ? renormalizedRepos
        : renormalizedRepos.filter((repoPath) =>
            input.state.explicitRepoFilter?.has(repoPath) ?? false
          );
    input.state.repoSet = new Set(input.state.resolvedRepos);
  }
}

async function hasScopedRepo(input: {
  state: {
    resolvedRepos: string[];
    repoSet: Set<string>;
    explicitRepoFilter?: Set<string> | undefined;
  };
  normalizeRepoList: (repoPaths: Iterable<string>) => Promise<string[]>;
  scopeCwd: string;
  repoPath: string;
}): Promise<boolean> {
  const normalized = await normalizeRepoPath(resolve(input.scopeCwd, input.repoPath));
  if (input.state.repoSet.has(normalized)) {
    return true;
  }

  await ensureNormalizedResolvedRepos({
    state: input.state,
    normalizeRepoList: input.normalizeRepoList
  });
  return input.state.repoSet.has(normalized);
}

async function loadUiRepoScopeState(input: {
  scopeCwd: string;
  registryPath?: string | undefined;
  explicitRepoPaths: string[];
  readRegistry: typeof readRepoRegistry;
  register: typeof registerRepoInRegistry;
  reportRegistrationWarning: (message: string) => void;
}): Promise<{
  state: {
    resolvedRepos: string[];
    repoSet: Set<string>;
    explicitRepoFilter?: Set<string> | undefined;
    lastMissingScopedRepoWarningKey: string | null;
    refreshTail: Promise<void>;
  };
  registryPath?: string | undefined;
  normalizeRepoList: (repoPaths: Iterable<string>) => Promise<string[]>;
}> {
  const normalizeRepoList = createNormalizeRepoList();
  const explicitRepoFilter = await registerExplicitRepoPaths({
    explicitRepoPaths: input.explicitRepoPaths,
    registryPath: input.registryPath,
    register: input.register,
    reportRegistrationWarning: input.reportRegistrationWarning,
    scopeCwd: input.scopeCwd
  });
  const loadedRegistry = await input.readRegistry({
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
      : uniqueSorted([...registryRepos, ...explicitRepoFilter]);
  return {
    state: createUiRepoScopeState({
      registryRepos: initialRegistryRepos,
      explicitRepoFilter
    }),
    registryPath: loadedRegistry.registryPath,
    normalizeRepoList
  };
}

function createUiRepoScopeApi(input: {
  scopeCwd: string;
  state: {
    resolvedRepos: string[];
    repoSet: Set<string>;
    explicitRepoFilter?: Set<string> | undefined;
    lastMissingScopedRepoWarningKey: string | null;
    refreshTail: Promise<void>;
  };
  registryPath?: string | undefined;
  readRegistry: typeof readRepoRegistry;
  normalizeRepoList: (repoPaths: Iterable<string>) => Promise<string[]>;
  reportRegistrationWarning: (message: string) => void;
}): UiRepoScope {
  return {
    get repos(): string[] {
      return [...input.state.resolvedRepos];
    },
    registryPath: input.registryPath,
    async has(repoPath: string): Promise<boolean> {
      return hasScopedRepo({
        state: input.state,
        normalizeRepoList: input.normalizeRepoList,
        scopeCwd: input.scopeCwd,
        repoPath
      });
    },
    async refreshFromRegistry(
      this: void
    ): Promise<UiRepoScopeRefreshResult> {
      const refreshResult = input.state.refreshTail
        .catch(() => undefined)
        .then(() =>
          refreshResolvedRepoState({
            state: input.state,
            readRegistry: input.readRegistry,
            registryPath: input.registryPath,
            normalizeRepoList: input.normalizeRepoList,
            reportRegistrationWarning: input.reportRegistrationWarning
          })
        );
      input.state.refreshTail = refreshResult.then(
        () => undefined,
        () => undefined
      );
      return refreshResult;
    }
  };
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
  const { state, registryPath, normalizeRepoList } = await loadUiRepoScopeState({
    scopeCwd,
    registryPath: input.registryPath,
    explicitRepoPaths: input.repoPaths ?? [],
    readRegistry,
    register,
    reportRegistrationWarning
  });
  return createUiRepoScopeApi({
    scopeCwd,
    state,
    registryPath,
    readRegistry,
    normalizeRepoList,
    reportRegistrationWarning
  });
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
  const cwd = resolve(input.cwd ?? process.cwd());

  if (input.repoParam === undefined || input.repoParam.trim().length === 0) {
    if (repoCount === 0) {
      throw toUiRepoScopeError({
        message: "UI scope has no repositories. Add one with `pairflow repo add <path>`.",
        context: {
          cwd,
          reason: "empty_ui_scope",
          repoCount
        }
      });
    }
    if (repoCount === 1) {
      const first = input.scope.repos[0];
      if (first === undefined) {
        throw toUiRepoScopeError({
          message: "Resolved scope unexpectedly has no repos.",
          context: {
            cwd,
            reason: "missing_single_scope_repo",
            repoCount
          }
        });
      }
      return first;
    }
    if (input.requireExplicitWhenMultiRepo ?? true) {
      throw toUiRepoScopeError({
        message: "Query parameter `repo` is required when UI scope contains multiple repositories.",
        context: {
          cwd,
          reason: "missing_repo_param_for_multi_repo_scope",
          repoCount
        }
      });
    }
    throw toUiRepoScopeError({
      message: "Missing `repo` query parameter.",
      context: {
        cwd,
        reason: "missing_repo_param",
        repoCount
      }
    });
  }

  const normalized = await normalizeRepoPath(resolve(cwd, input.repoParam));
  if (!(await input.scope.has(normalized))) {
    throw toUiRepoScopeError({
      message: `Repository is out of UI scope: ${normalized}`,
      context: {
        cwd,
        reason: "repo_out_of_scope",
        repoCount,
        repoParam: input.repoParam,
        resolvedRepoPath: normalized
      }
    });
  }
  return normalized;
}
