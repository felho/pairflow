import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";

import {
  FileLockTimeoutError,
  withFileLock
} from "../../foundation/fs/fileLock.js";
import { isIsoTimestamp } from "../../../shared/validation/primitives.js";
import { normalizeRepoPath } from "./repoResolution.js";
import type {
  RegisterRepoInRegistryPort,
  RegisterRepoInput,
  RegisterRepoResult,
  RepoRegistryEntry
} from "../../../shared/ports/repoRegistry.js";

export type {
  RegisterRepoInRegistryPort,
  RegisterRepoInput,
  RegisterRepoResult,
  RepoRegistryEntry
} from "../../../shared/ports/repoRegistry.js";

const registryVersion = 1;
const defaultLockTimeoutMs = 5_000;
const registryPathEnvVar = "PAIRFLOW_REPO_REGISTRY_PATH";

interface RepoRegistryDocument {
  version: number;
  repos: RepoRegistryEntry[];
}

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

interface RepoRegistryErrorContext {
  entryIndex?: number | undefined;
  fieldName?: string | undefined;
  lockPath?: string | undefined;
  registryPath?: string | undefined;
  reason?: string | undefined;
  repoPath?: string | undefined;
  version?: number | undefined;
}

interface RepoRegistryErrorOptions extends ErrorOptions {
  context?: RepoRegistryErrorContext | undefined;
}

export class RepoRegistryError extends Error {
  public readonly context: RepoRegistryErrorContext | undefined;

  public constructor(message: string, options?: RepoRegistryErrorOptions) {
    super(message, options);
    this.name = "RepoRegistryError";
    this.context = options?.context;
  }
}

export class RepoRegistryLockError extends RepoRegistryError {
  public constructor(message: string, options?: RepoRegistryErrorOptions) {
    super(message, options);
    this.name = "RepoRegistryLockError";
  }
}

function toRepoRegistryError(input: {
  message: string;
  context: RepoRegistryErrorContext;
  cause?: unknown;
}): RepoRegistryError {
  return new RepoRegistryError(input.message, {
    context: input.context,
    ...(input.cause !== undefined ? { cause: input.cause } : {})
  });
}

function toRepoRegistryLockError(input: {
  message: string;
  context: RepoRegistryErrorContext;
  cause?: unknown;
}): RepoRegistryLockError {
  return new RepoRegistryLockError(input.message, {
    context: input.context,
    ...(input.cause !== undefined ? { cause: input.cause } : {})
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireNonEmptyString(value: unknown, fieldName: string): string {
  if (typeof value !== "string") {
    throw toRepoRegistryError({
      message: `${fieldName} must be a string.`,
      context: {
        fieldName,
        reason: "field_not_string"
      }
    });
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw toRepoRegistryError({
      message: `${fieldName} cannot be empty.`,
      context: {
        fieldName,
        reason: "field_empty"
      }
    });
  }
  return trimmed;
}

function parseRegistryDocument(raw: string): RepoRegistryDocument {
  if (raw.trim().length === 0) {
    return {
      version: registryVersion,
      repos: []
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw toRepoRegistryError({
      message: `Invalid repo registry JSON: ${message}`,
      context: {
        reason: "invalid_json"
      },
      cause: error
    });
  }

  if (!isRecord(parsed)) {
    throw toRepoRegistryError({
      message: "Repo registry must be a JSON object.",
      context: {
        reason: "not_a_json_object"
      }
    });
  }

  const versionRaw = parsed.version;
  if (typeof versionRaw !== "number" || !Number.isInteger(versionRaw)) {
    throw toRepoRegistryError({
      message: "Repo registry `version` must be an integer.",
      context: {
        fieldName: "version",
        reason: "invalid_version_type"
      }
    });
  }
  if (versionRaw !== registryVersion) {
    throw toRepoRegistryError({
      message: `Unsupported repo registry version: ${versionRaw}.`,
      context: {
        fieldName: "version",
        reason: "unsupported_version",
        version: versionRaw
      }
    });
  }

  const reposRaw = parsed.repos;
  if (!Array.isArray(reposRaw)) {
    throw toRepoRegistryError({
      message: "Repo registry `repos` must be an array.",
      context: {
        fieldName: "repos",
        reason: "repos_not_array"
      }
    });
  }

  const repos: RepoRegistryEntry[] = reposRaw.map((value, index) => {
    if (!isRecord(value)) {
      throw toRepoRegistryError({
        message: `Repo registry entry at index ${index} must be an object.`,
        context: {
          entryIndex: index,
          reason: "entry_not_object"
        }
      });
    }
    const repoPath = requireNonEmptyString(
      value.repoPath,
      `repo registry entry ${index} repoPath`
    );
    const addedAt = requireNonEmptyString(
      value.addedAt,
      `repo registry entry ${index} addedAt`
    );
    if (!isIsoTimestamp(addedAt)) {
      throw toRepoRegistryError({
        message: `repo registry entry ${index} addedAt must be an ISO-8601 UTC timestamp.`,
        context: {
          entryIndex: index,
          fieldName: "addedAt",
          reason: "invalid_timestamp"
        }
      });
    }
    const labelRaw = value.label;
    if (labelRaw !== undefined && typeof labelRaw !== "string") {
      throw toRepoRegistryError({
        message: `repo registry entry ${index} label must be a string when provided.`,
        context: {
          entryIndex: index,
          fieldName: "label",
          reason: "invalid_label_type"
        }
      });
    }
    const label = labelRaw?.trim();
    if (labelRaw !== undefined && label !== undefined && label.length === 0) {
      throw toRepoRegistryError({
        message: `repo registry entry ${index} label cannot be empty when provided.`,
        context: {
          entryIndex: index,
          fieldName: "label",
          reason: "empty_label"
        }
      });
    }
    return {
      repoPath,
      addedAt,
      ...(label !== undefined ? { label } : {})
    };
  });

  return {
    version: versionRaw,
    repos
  };
}

function serializeRegistry(entries: RepoRegistryEntry[]): string {
  const sorted = [...entries].sort((left, right) =>
    left.repoPath.localeCompare(right.repoPath)
  );
  return `${JSON.stringify(
    {
      version: registryVersion,
      repos: sorted
    },
    null,
    2
  )}\n`;
}

async function normalizeEntries(
  entries: RepoRegistryEntry[],
  reportNormalizationWarning: (message: string) => void
): Promise<RepoRegistryEntry[]> {
  const normalizedByPath = new Map<string, RepoRegistryEntry>();
  const warnedPaths = new Set<string>();
  for (const entry of entries) {
    const normalizedPath = await normalizeRepoPath(resolve(entry.repoPath));
    const existing = normalizedByPath.get(normalizedPath);
    if (existing !== undefined) {
      if (existing.label !== entry.label && !warnedPaths.has(normalizedPath)) {
        reportNormalizationWarning(
          `Pairflow warning: deduplicating repo registry aliases with conflicting labels for ${normalizedPath} (${existing.label ?? "<none>"} vs ${entry.label ?? "<none>"}).\n`
        );
        warnedPaths.add(normalizedPath);
      }
      continue;
    }

    normalizedByPath.set(normalizedPath, {
      repoPath: normalizedPath,
      addedAt: entry.addedAt,
      ...(entry.label !== undefined ? { label: entry.label } : {})
    });
  }
  return [...normalizedByPath.values()].sort((left, right) =>
    left.repoPath.localeCompare(right.repoPath)
  );
}

function uniqueSortedEntries(entries: RepoRegistryEntry[]): RepoRegistryEntry[] {
  const seen = new Set<string>();
  const deduped: RepoRegistryEntry[] = [];
  for (const entry of entries) {
    if (seen.has(entry.repoPath)) {
      continue;
    }
    seen.add(entry.repoPath);
    deduped.push(entry);
  }
  return deduped.sort((left, right) => left.repoPath.localeCompare(right.repoPath));
}

function normalizeLabel(
  label: string | undefined
): string | undefined {
  if (label === undefined) {
    return undefined;
  }
  const trimmed = label.trim();
  if (trimmed.length === 0) {
    throw toRepoRegistryError({
      message: "label cannot be empty.",
      context: {
        fieldName: "label",
        reason: "empty_label"
      }
    });
  }
  return trimmed;
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
      ? await normalizeEntries(parsed.repos, reportNormalizationWarning)
      : uniqueSortedEntries(parsed.repos);
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
