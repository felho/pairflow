import { randomUUID } from "node:crypto";
import { cp, lstat, mkdir, realpath, rename, rm, symlink } from "node:fs/promises";
import { basename, dirname, join } from "node:path";

import type {
  SkillsInstallFileSystem,
  SkillsInstallPathStatus
} from "../../ports/skillsInstallFileSystem.js";

function mapPathStatus(error: unknown): SkillsInstallPathStatus | undefined {
  if (
    typeof error === "object"
    && error !== null
    && "code" in error
    && (error.code === "ENOENT" || error.code === "ENOTDIR")
  ) {
    return {
      exists: false
    };
  }
  return undefined;
}

function replacementStagingPath(destination: string): string {
  return join(
    dirname(destination),
    `.${basename(destination)}.pairflow-install-${process.pid}-${randomUUID()}`
  );
}

function pathIdentity(stats: Awaited<ReturnType<typeof lstat>>): string {
  return `${stats.dev}:${stats.ino}`;
}

class NodeSkillsInstallFileSystemError extends Error {
  readonly code = "SKILLS_INSTALL_PATH_CHANGED_AFTER_PREFLIGHT";

  constructor(message: string) {
    super(message);
    this.name = "NodeSkillsInstallFileSystemError";
  }
}

function assertPathStatusMatchesExpected(input: {
  path: string;
  current: SkillsInstallPathStatus;
  expected: SkillsInstallPathStatus;
}): void {
  if (!input.expected.exists && !input.current.exists) {
    return;
  }
  if (
    input.expected.exists
    && input.current.exists
    && input.current.type === input.expected.type
    && (
      input.expected.identity === undefined
      || input.current.identity === input.expected.identity
    )
  ) {
    return;
  }
  throw new NodeSkillsInstallFileSystemError(
    `Managed install path changed after preflight; refusing replacement: ${input.path}`
  );
}

export const nodeSkillsInstallFileSystem: SkillsInstallFileSystem = {
  async pathStatus(path) {
    try {
      const stats = await lstat(path);
      if (stats.isSymbolicLink()) {
        return {
          exists: true,
          type: "symlink",
          identity: pathIdentity(stats)
        };
      }
      if (stats.isDirectory()) {
        return {
          exists: true,
          type: "directory",
          identity: pathIdentity(stats)
        };
      }
      if (stats.isFile()) {
        return {
          exists: true,
          type: "file",
          identity: pathIdentity(stats)
        };
      }
      return {
        exists: true,
        type: "other",
        identity: pathIdentity(stats)
      };
    } catch (error) {
      const missing = mapPathStatus(error);
      if (missing !== undefined) {
        return missing;
      }
      throw error;
    }
  },

  async realPathIfExists(path) {
    try {
      return await realpath(path);
    } catch (error) {
      const missing = mapPathStatus(error);
      if (missing !== undefined) {
        return null;
      }
      throw error;
    }
  },

  async ensureDirectory(path) {
    await mkdir(path, {
      recursive: true
    });
  },

  async removePath(path) {
    await rm(path, {
      recursive: true,
      force: true
    });
  },

  async copyDirectory(source, destination) {
    await cp(source, destination, {
      recursive: true,
      force: true,
      errorOnExist: false
    });
  },

  async createSymlink(target, linkPath) {
    await symlink(target, linkPath, "dir");
  },

  async replaceDirectoryFromSource(input) {
    const stagingPath = replacementStagingPath(input.destination);
    try {
      await cp(input.source, stagingPath, {
        recursive: true,
        force: true,
        errorOnExist: false
      });
      assertPathStatusMatchesExpected({
        path: input.destination,
        current: await this.pathStatus(input.destination),
        expected: input.expectedDestination
      });
      await rm(input.destination, {
        recursive: true,
        force: true
      });
      await rename(stagingPath, input.destination);
    } catch (error) {
      await rm(stagingPath, {
        recursive: true,
        force: true
      });
      throw error;
    }
  },

  async replaceSymlink(input) {
    const stagingPath = replacementStagingPath(input.linkPath);
    try {
      await symlink(input.target, stagingPath, "dir");
      assertPathStatusMatchesExpected({
        path: input.linkPath,
        current: await this.pathStatus(input.linkPath),
        expected: input.expectedLinkPath
      });
      await rm(input.linkPath, {
        recursive: true,
        force: true
      });
      await rename(stagingPath, input.linkPath);
    } catch (error) {
      await rm(stagingPath, {
        recursive: true,
        force: true
      });
      throw error;
    }
  }
};
