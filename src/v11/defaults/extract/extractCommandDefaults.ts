import { access } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";

import { resolveRepoPath } from "../../infrastructure/executor/workspace/repoResolution.js";
import { runGit } from "../../infrastructure/workspace/git.js";
import { resolveBubbleById } from "../../shared/bubbleLookup/bubbleLookupDefaults.js";
import type { ExtractCommandDependencies } from "../../application/extract/extractCommandContract.js";

export const extractCommandDependencyDefaults: ExtractCommandDependencies = {
  fileExists: async (path) =>
    access(path, fsConstants.F_OK)
      .then(() => true)
      .catch(() => false),
  resolveBubbleById,
  resolveRepoPath,
  runGit
};
