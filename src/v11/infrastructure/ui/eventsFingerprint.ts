import { realpathSync } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import { join, resolve } from "node:path";

import { getBubblePaths } from "../artifact/bubble/paths.js";
import { type BubbleListEntry } from "../../../core/bubble/listBubbles.js";
import type { UiRepoSummary } from "../../../types/ui.js";

function normalizeRepoPathForQueue(repoPath: string): string {
  const resolvedRepoPath = resolve(repoPath);
  try {
    return realpathSync(resolvedRepoPath);
  } catch {
    return resolvedRepoPath;
  }
}

async function listBubbleIds(repoPath: string): Promise<string[]> {
  const bubblesDir = join(repoPath, ".pairflow", "bubbles");
  const entries = await readdir(bubblesDir, {
    withFileTypes: true
  }).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") {
      return [];
    }
    throw error;
  });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));
}

async function fileFingerprint(path: string): Promise<string> {
  const info = await stat(path).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") {
      return undefined;
    }
    throw error;
  });
  if (info === undefined) {
    return "missing";
  }
  return `${info.mtimeMs}:${info.size}`;
}

async function bubbleFingerprint(
  repoPath: string,
  entry: BubbleListEntry
): Promise<string> {
  const paths = getBubblePaths(repoPath, entry.bubbleId);
  const [stateSig, inboxSig, transcriptSig] = await Promise.all([
    fileFingerprint(paths.statePath),
    fileFingerprint(paths.inboxPath),
    fileFingerprint(paths.transcriptPath)
  ]);

  const runtimeSig =
    entry.runtimeSession === null
      ? "none"
      : [entry.runtimeSession.updatedAt, entry.runtimeSession.tmuxSessionName].join(":");
  const attentionSig =
    entry.attention === null
      ? "none"
      : [
          entry.attention.code,
          entry.attention.severity,
          entry.attention.label,
          entry.attention.detail ?? ""
        ].join(":");

  return [
    stateSig,
    inboxSig,
    transcriptSig,
    runtimeSig,
    attentionSig,
    entry.state,
    String(entry.round)
  ].join("|");
}

function sameRepoSummary(left: UiRepoSummary, right: UiRepoSummary): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export {
  bubbleFingerprint,
  listBubbleIds,
  normalizeRepoPathForQueue,
  sameRepoSummary
};
