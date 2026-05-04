import { lstat } from "node:fs/promises";

import { resolveRepoPath } from "../../infrastructure/executor/workspace/repoResolution.js";
import { runGit } from "../../infrastructure/workspace/git.js";
import { resolveBubbleById } from "../../shared/bubbleLookup/bubbleLookupDefaults.js";
import type { ExtractCommandDependencies } from "../../application/extract/extractCommandContract.js";

export const extractCommandDependencyDefaults: ExtractCommandDependencies = {
  fileExists: async (path) =>
    lstat(path)
      .then(() => true)
      .catch(() => false),
  fileInfo: async (path) =>
    lstat(path)
      .then((stats) => ({
        exists: true,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory()
      }))
      .catch((error: NodeJS.ErrnoException) => ({
        exists: false,
        isFile: false,
        isDirectory: false,
        ...(error.code !== undefined ? { errorCode: error.code } : {})
      })),
  resolveBubbleById,
  resolveRepoPath,
  runGit
};
