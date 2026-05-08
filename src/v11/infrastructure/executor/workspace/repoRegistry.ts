import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";

import {
  FileLockTimeoutError,
  withFileLock
} from "../../foundation/fs/fileLock.js";
import { normalizeRepoPath } from "./repoResolution.js";
import {
  normalizeRegistryEntries,
  uniqueSortedRegistryEntries
} from "./repoRegistryEntries.js";
import {
  normalizeLabel,
  parseRegistryDocument,
  serializeRegistry
} from "./repoRegistryDocument.js";
import {
  toRepoRegistryError,
  toRepoRegistryLockError
} from "./repoRegistryErrors.js";
import type {
  RegisterRepoInRegistryPort,
  RegisterRepoInput,
  RegisterRepoResult,
  RepoRegistryEntry
} from "../../../ports/repoRegistry.js";

export type {
  RegisterRepoInRegistryPort,
  RegisterRepoInput,
  RegisterRepoResult,
  RepoRegistryEntry
} from "../../../ports/repoRegistry.js";
export { RepoRegistryError, RepoRegistryLockError } from "./repoRegistryErrors.js";

const defaultLockTimeoutMs = 5_000;
const registryPathEnvVar = "PAIRFLOW_REPO_REGISTRY_PATH";

export interface ReadRepoRegistryInput {
  registryPath?: string | undefined;
  allowMissing?: boolean | undefined;
  normalizePaths?: boolean | undefined;
  reportNormalizationWarning?:
    | ((message: string) => void)
    | undefined;
}

export interface ReadRepoRegistryResult {
  registryPath: string;
  entries: RepoRegistryEntry[];
}

export interface RemoveRepoInput {
  repoPath: string;
  registryPath?: string | undefined;
  lockTimeoutMs?: number | undefined;
}

export interface RemoveRepoResult {
  removed: boolean;
  registryPath: string;
  removedEntry?: RepoRegistryEntry | undefined;
}

async function atomicWriteRegistry(
  registryPath: string,
  entries: RepoRegistryEntry[]
): Promise<void> {
  const parent = dirname(registryPath);
  await mkdir(parent, { recursive: true });

  const tempPath = join(parent, `.repos-${randomUUID()}.tmp`);
  try {
    await writeFile(tempPath, serializeRegistry(entries), {
      encoding: "utf8"
    });
    await rename(tempPath, registryPath);
  } catch (error) {
    await rm(tempPath, {
      force: true
    }).catch(() => undefined);
    throw error;
  }
}

async function withRegistryLock<T>(
  registryPath: string,
  timeoutMs: number,
  task: () => Promise<T>
): Promise<T> {
  const lockPath = `${registryPath}.lock`;
  try {
    return await withFileLock(
      {
        lockPath,
        timeoutMs,
        ensureParentDir: true
      },
      task
    );
  } catch (error) {
    if (error instanceof FileLockTimeoutError) {
      throw toRepoRegistryLockError({
        message: `Could not acquire repo registry lock: ${lockPath}`,
        context: {
          lockPath,
          registryPath,
          reason: "lock_timeout"
        },
        cause: error
      });
    }
    throw error;
  }
}

export function resolveRepoRegistryPath(path?: string): string {
  if (path !== undefined) {
    return resolve(path);
  }
  const fromEnv = process.env[registryPathEnvVar];
  if (fromEnv !== undefined && fromEnv.trim().length > 0) {
    return resolve(fromEnv);
  }
  return join(homedir(), ".pairflow", "repos.json");
}

export async function readRepoRegistry(
  input: ReadRepoRegistryInput = {}
): Promise<ReadRepoRegistryResult> {
  const registryPath = resolveRepoRegistryPath(input.registryPath);
  let raw: string;
  try {
    raw = await readFile(registryPath, "utf8");
  } catch (error) {
    const typedError = error as NodeJS.ErrnoException;
    if ((input.allowMissing ?? false) && typedError.code === "ENOENT") {
      return {
        registryPath,
        entries: []
      };
    }
    if (typedError.code === "ENOENT") {
      throw toRepoRegistryError({
        message: `Repo registry file does not exist: ${registryPath}`,
        context: {
          registryPath,
          reason: "registry_missing"
        },
        cause: error
      });
    }
    throw error;
  }

  const parsed = parseRegistryDocument(raw);
  const reportNormalizationWarning =
    input.reportNormalizationWarning ??
    ((message: string) => {
      process.stderr.write(message);
    });
  const entries =
    input.normalizePaths ?? false
      ? await normalizeRegistryEntries(parsed.repos, reportNormalizationWarning)
      : uniqueSortedRegistryEntries(parsed.repos);
  return {
    registryPath,
    entries
  };
}

export const registerRepoInRegistry: RegisterRepoInRegistryPort = async (
  input: RegisterRepoInput
): Promise<RegisterRepoResult> => {
  const registryPath = resolveRepoRegistryPath(input.registryPath);
  const normalizedRepoPath = await normalizeRepoPath(resolve(input.repoPath));
  const label = normalizeLabel(input.label);
  const nowIso = (input.now ?? new Date()).toISOString();

  return withRegistryLock(
    registryPath,
    input.lockTimeoutMs ?? defaultLockTimeoutMs,
    async () => {
      const loaded = await readRepoRegistry({
        registryPath,
        allowMissing: true,
        normalizePaths: true
      });
      const existing = loaded.entries.find(
        (entry) => entry.repoPath === normalizedRepoPath
      );
      if (existing !== undefined) {
        return {
          added: false,
          entry: existing,
          registryPath
        };
      }

      const nextEntry: RepoRegistryEntry = {
        repoPath: normalizedRepoPath,
        addedAt: nowIso,
        ...(label !== undefined ? { label } : {})
      };
      const nextEntries = [...loaded.entries, nextEntry];
      await atomicWriteRegistry(registryPath, nextEntries);
      return {
        added: true,
        entry: nextEntry,
        registryPath
      };
    }
  );
};

export async function removeRepoFromRegistry(
  input: RemoveRepoInput
): Promise<RemoveRepoResult> {
  const registryPath = resolveRepoRegistryPath(input.registryPath);
  const normalizedRepoPath = await normalizeRepoPath(resolve(input.repoPath));

  return withRegistryLock(
    registryPath,
    input.lockTimeoutMs ?? defaultLockTimeoutMs,
    async () => {
      const loaded = await readRepoRegistry({
        registryPath,
        allowMissing: true,
        normalizePaths: true
      });

      const entry = loaded.entries.find(
        (item) => item.repoPath === normalizedRepoPath
      );
      if (entry === undefined) {
        return {
          removed: false,
          registryPath
        };
      }

      const nextEntries = loaded.entries.filter(
        (item) => item.repoPath !== entry.repoPath
      );
      await atomicWriteRegistry(registryPath, nextEntries);
      return {
        removed: true,
        registryPath,
        removedEntry: entry
      };
    }
  );
}
