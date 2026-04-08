import { resolve } from "node:path";

import { normalizeRepoPath } from "../executor/workspace/repoResolution.js";
import {
  readRepoRegistry,
  registerRepoInRegistry
} from "../executor/workspace/repoRegistry.js";
import {
  hasScopedRepo,
  loadUiRepoScopeState,
  refreshResolvedRepoState
} from "./repoScopeState.js";
import type { UiRepoScopeRefreshResult } from "./repoScopeState.js";
import { toUiRepoScopeError } from "./repoScopeErrors.js";

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

export interface UiRepoScope {
  readonly repos: string[];
  readonly registryPath?: string | undefined;
  has(repoPath: string): Promise<boolean>;
  refreshFromRegistry?(this: void): Promise<UiRepoScopeRefreshResult>;
}

export { UiRepoScopeError } from "./repoScopeErrors.js";

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
