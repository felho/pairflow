import { resolve } from "node:path";

import { normalizeRepoPath } from "../executor/workspace/repoResolution.js";
import type {
  readRepoRegistry,
  registerRepoInRegistry
} from "../executor/workspace/repoRegistry.js";

export interface UiRepoScopeRefreshResult {
  changed: boolean;
  added: string[];
  removed: string[];
  repos: string[];
}

export interface UiRepoScopeState {
  resolvedRepos: string[];
  repoSet: Set<string>;
  explicitRepoFilter?: Set<string> | undefined;
  lastMissingScopedRepoWarningKey: string | null;
  refreshTail: Promise<void>;
}

export function uniqueSorted(values: string[]): string[] {
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

export function createNormalizeRepoList(): (
  repoPaths: Iterable<string>
) => Promise<string[]> {
  return async (repoPaths) =>
    uniqueSorted(
      await Promise.all(
        [...repoPaths].map((repoPath) => normalizeRepoPath(resolve(repoPath)))
      )
    );
}

export async function registerExplicitRepoPaths(input: {
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

export function createUiRepoScopeState(input: {
  registryRepos: string[];
  explicitRepoFilter?: Set<string> | undefined;
}): UiRepoScopeState {
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

export async function refreshResolvedRepoState(input: {
  state: UiRepoScopeState;
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

export async function ensureNormalizedResolvedRepos(input: {
  state: UiRepoScopeState;
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

export async function hasScopedRepo(input: {
  state: UiRepoScopeState;
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

export async function loadUiRepoScopeState(input: {
  scopeCwd: string;
  registryPath?: string | undefined;
  explicitRepoPaths: string[];
  readRegistry: typeof readRepoRegistry;
  register: typeof registerRepoInRegistry;
  reportRegistrationWarning: (message: string) => void;
}): Promise<{
  state: UiRepoScopeState;
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
