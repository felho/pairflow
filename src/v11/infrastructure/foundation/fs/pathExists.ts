import { constants as fsConstants } from "node:fs";
import { access } from "node:fs/promises";

import type { PathExistsPort } from "../../../shared/ports/pathExists.js";

export type { PathExistsPort } from "../../../shared/ports/pathExists.js";

export const pathExists: PathExistsPort = async (
  path: string
): Promise<boolean> => {
  return access(path, fsConstants.F_OK)
    .then(() => true)
    .catch((error: unknown) => {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error.code === "ENOENT" || error.code === "ENOTDIR")
      ) {
        return false;
      }
      throw error;
    });
};
