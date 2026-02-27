import { createHash } from "node:crypto";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

import { normalizeRepoPath } from "../bubble/repoResolution.js";

const archiveRootEnvVar = "PAIRFLOW_ARCHIVE_ROOT";

export interface ResolveArchivePathsInput {
  repoPath: string;
  bubbleInstanceId: string;
  archiveRootPath?: string | undefined;
}

export interface ArchivePaths {
  archiveRootPath: string;
  archiveIndexPath: string;
  normalizedRepoPath: string;
  repoKey: string;
  repoArchiveRootPath: string;
  bubbleInstanceArchivePath: string;
}

export function resolveArchiveRootPath(path?: string): string {
  if (path !== undefined) {
    return resolve(path);
  }

  const fromEnv = process.env[archiveRootEnvVar];
  if (fromEnv !== undefined && fromEnv.trim().length > 0) {
    return resolve(fromEnv);
  }

  return join(homedir(), ".pairflow", "archive");
}

export function deriveArchiveRepoKey(normalizedRepoPath: string): string {
  return createHash("sha256")
    .update(normalizedRepoPath)
    .digest("hex")
    .slice(0, 16);
}

export async function resolveArchivePaths(
  input: ResolveArchivePathsInput
): Promise<ArchivePaths> {
  const normalizedRepoPath = await normalizeRepoPath(resolve(input.repoPath));
  const archiveRootPath = resolveArchiveRootPath(input.archiveRootPath);
  const repoKey = deriveArchiveRepoKey(normalizedRepoPath);
  const repoArchiveRootPath = join(archiveRootPath, repoKey);

  return {
    archiveRootPath,
    archiveIndexPath: join(archiveRootPath, "index.json"),
    normalizedRepoPath,
    repoKey,
    repoArchiveRootPath,
    bubbleInstanceArchivePath: join(repoArchiveRootPath, input.bubbleInstanceId)
  };
}
