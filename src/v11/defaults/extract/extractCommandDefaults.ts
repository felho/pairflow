import { constants } from "node:fs";
import { copyFile, lstat, mkdir } from "node:fs/promises";

import { resolveRepoPath } from "../../infrastructure/executor/workspace/repoResolution.js";
import { runGit } from "../../infrastructure/workspace/git.js";
import { resolveBubbleById } from "../../shared/bubbleLookup/bubbleLookupDefaults.js";
import type { ExtractCommandDependencies } from "../../application/extract/extractCommandContract.js";

export const extractCommandDependencyDefaults: ExtractCommandDependencies = {
  copyFile: async (sourcePath, targetPath) => {
    await copyFile(sourcePath, targetPath, constants.COPYFILE_EXCL);
  },
  createDirectory: async (path) => {
    await mkdir(path);
  },
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
