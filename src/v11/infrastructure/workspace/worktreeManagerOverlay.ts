import { cp, lstat, mkdir, symlink } from "node:fs/promises";
import { dirname, isAbsolute, resolve } from "node:path";

import {
  DEFAULT_LOCAL_OVERLAY_ENABLED,
  DEFAULT_LOCAL_OVERLAY_ENTRIES,
  DEFAULT_LOCAL_OVERLAY_MODE
} from "../../../config/defaults.js";
import type { LocalOverlayConfig } from "../../ports/worktreeWorkspace.js";
import { toWorkspaceBootstrapError } from "./worktreeManagerErrors.js";

function resolveLocalOverlayConfig(
  input: LocalOverlayConfig | undefined
): LocalOverlayConfig {
  if (input === undefined) {
    return {
      enabled: DEFAULT_LOCAL_OVERLAY_ENABLED,
      mode: DEFAULT_LOCAL_OVERLAY_MODE,
      entries: [...DEFAULT_LOCAL_OVERLAY_ENTRIES]
    };
  }

  return {
    enabled: input.enabled,
    mode: input.mode,
    entries: [...input.entries]
  };
}

function assertLocalOverlayEntry(entry: string): void {
  if (entry.trim().length === 0) {
    throw toWorkspaceBootstrapError({
      message: "Local overlay entry cannot be empty.",
      context: {
        entry,
        reason: "empty_local_overlay_entry"
      }
    });
  }

  if (isAbsolute(entry)) {
    throw toWorkspaceBootstrapError({
      message: `Local overlay entry must be a relative path: ${entry}`,
      context: {
        entry,
        reason: "absolute_local_overlay_entry"
      }
    });
  }

  const normalized = entry.replaceAll("\\", "/");
  if (normalized.includes("//")) {
    throw toWorkspaceBootstrapError({
      message: `Local overlay entry must be normalized: ${entry}`,
      context: {
        entry,
        reason: "non_normalized_local_overlay_entry"
      }
    });
  }

  const segments = normalized.split("/");
  if (segments.some((segment) => segment === "." || segment === ".." || segment.length === 0)) {
    throw toWorkspaceBootstrapError({
      message: `Local overlay entry cannot contain '.'/'..' segments: ${entry}`,
      context: {
        entry,
        reason: "invalid_local_overlay_segments"
      }
    });
  }
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    const typedError = error as NodeJS.ErrnoException;
    if (typedError.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

export async function syncLocalOverlayEntries(input: {
  repoPath: string;
  worktreePath: string;
  config: LocalOverlayConfig | undefined;
}): Promise<void> {
  const localOverlay = resolveLocalOverlayConfig(input.config);
  if (!localOverlay.enabled) {
    return;
  }

  for (const entry of localOverlay.entries) {
    assertLocalOverlayEntry(entry);

    const sourcePath = resolve(input.repoPath, entry);
    const targetPath = resolve(input.worktreePath, entry);

    if (!(await pathExists(sourcePath))) {
      continue;
    }

    if (await pathExists(targetPath)) {
      continue;
    }

    await mkdir(dirname(targetPath), { recursive: true });
    if (localOverlay.mode === "copy") {
      const sourceStats = await lstat(sourcePath);
      await cp(sourcePath, targetPath, {
        recursive: sourceStats.isDirectory(),
        errorOnExist: true,
        force: false
      });
      continue;
    }

    await symlink(sourcePath, targetPath);
  }
}
