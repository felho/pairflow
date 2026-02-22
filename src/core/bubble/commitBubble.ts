import { readFile } from "node:fs/promises";
import { isAbsolute, join, resolve } from "node:path";

import { appendProtocolEnvelope } from "../protocol/transcriptStore.js";
import { applyStateTransition } from "../state/machine.js";
import { readStateSnapshot, writeStateSnapshot } from "../state/stateStore.js";
import { runGit, GitCommandError } from "../workspace/git.js";
import { normalizeStringList } from "../util/normalize.js";
import { BubbleLookupError, resolveBubbleById } from "./bubbleLookup.js";
import type { BubbleStateSnapshot } from "../../types/bubble.js";
import type { ProtocolEnvelope } from "../../types/protocol.js";

export interface CommitBubbleInput {
  bubbleId: string;
  refs?: string[] | undefined;
  message?: string | undefined;
  repoPath?: string | undefined;
  cwd?: string | undefined;
  now?: Date | undefined;
}

export interface CommitBubbleResult {
  bubbleId: string;
  sequence: number;
  envelope: ProtocolEnvelope;
  state: BubbleStateSnapshot;
  commitSha: string;
  commitMessage: string;
  stagedFiles: string[];
  donePackagePath: string;
}

export class BubbleCommitError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "BubbleCommitError";
  }
}

function isPathInside(parentPath: string, childPath: string): boolean {
  const normalizedParent = resolve(parentPath);
  const normalizedChild = resolve(childPath);
  return (
    normalizedChild === normalizedParent ||
    normalizedChild.startsWith(`${normalizedParent}/`)
  );
}

function deriveDonePackageSummary(content: string): string {
  const lines = content
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));

  const candidate = lines[0] ?? "Done package attached.";
  const chars = Array.from(candidate);
  return chars.length > 240 ? `${chars.slice(0, 237).join("")}...` : candidate;
}

async function collectStagedFiles(worktreePath: string): Promise<string[]> {
  const staged = await runGit(["diff", "--cached", "--name-only"], {
    cwd: worktreePath
  });
  return staged.stdout
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function assertStagedFilesWithinWorktree(
  stagedFiles: string[],
  worktreePath: string
): void {
  for (const file of stagedFiles) {
    if (isAbsolute(file)) {
      throw new BubbleCommitError(
        `Invalid staged file path (absolute path not allowed): ${file}`
      );
    }

    const absoluteFilePath = resolve(worktreePath, file);
    if (!isPathInside(worktreePath, absoluteFilePath)) {
      throw new BubbleCommitError(
        `Staged file is outside bubble worktree scope: ${file}`
      );
    }
  }
}

export async function commitBubble(
  input: CommitBubbleInput
): Promise<CommitBubbleResult> {
  const now = input.now ?? new Date();
  const nowIso = now.toISOString();
  const refs = normalizeStringList(input.refs ?? []);

  const resolved = await resolveBubbleById({
    bubbleId: input.bubbleId,
    ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
    ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
  });
  const loadedState = await readStateSnapshot(resolved.bubblePaths.statePath);
  const state = loadedState.state;

  if (state.state !== "APPROVED_FOR_COMMIT") {
    throw new BubbleCommitError(
      `bubble commit can only be used while state is APPROVED_FOR_COMMIT (current: ${state.state}).`
    );
  }

  const donePackagePath = resolve(resolved.bubblePaths.artifactsDir, "done-package.md");
  const donePackageContent = await readFile(donePackagePath, "utf8").catch(
    (error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") {
        throw new BubbleCommitError(
          `Missing done package artifact: ${donePackagePath}`
        );
      }
      throw error;
    }
  );
  if (donePackageContent.trim().length === 0) {
    throw new BubbleCommitError(
      `Done package artifact is empty: ${donePackagePath}`
    );
  }

  const stagedFiles = await collectStagedFiles(resolved.bubblePaths.worktreePath);
  if (stagedFiles.length === 0) {
    throw new BubbleCommitError(
      "No staged files found in bubble worktree. Stage changes before commit."
    );
  }

  assertStagedFilesWithinWorktree(stagedFiles, resolved.bubblePaths.worktreePath);

  const commitMessage = input.message ?? `bubble(${resolved.bubbleId}): finalize`;
  await runGit(["commit", "-m", commitMessage], {
    cwd: resolved.bubblePaths.worktreePath
  });
  const commitSha = (
    await runGit(["rev-parse", "HEAD"], {
      cwd: resolved.bubblePaths.worktreePath
    })
  ).stdout.trim();

  const envelopeRefs = normalizeStringList([...refs, donePackagePath]);
  const lockPath = join(resolved.bubblePaths.locksDir, `${resolved.bubbleId}.lock`);
  const appended = await appendProtocolEnvelope({
    transcriptPath: resolved.bubblePaths.transcriptPath,
    lockPath,
    now,
    envelope: {
      bubble_id: resolved.bubbleId,
      sender: "orchestrator",
      recipient: "human",
      type: "DONE_PACKAGE",
      round: state.round,
      payload: {
        summary: deriveDonePackageSummary(donePackageContent),
        metadata: {
          done_package_path: donePackagePath,
          staged_files: stagedFiles,
          commit_message: commitMessage,
          commit_sha: commitSha
        }
      },
      refs: envelopeRefs
    }
  });

  const committed = applyStateTransition(state, {
    to: "COMMITTED",
    lastCommandAt: nowIso
  });
  const committedWritten = await writeStateSnapshot(
    resolved.bubblePaths.statePath,
    committed,
    {
      expectedFingerprint: loadedState.fingerprint,
      expectedState: "APPROVED_FOR_COMMIT"
    }
  );

  const done = applyStateTransition(committedWritten.state, {
    to: "DONE",
    activeAgent: null,
    activeRole: null,
    activeSince: null,
    lastCommandAt: nowIso
  });

  let written;
  try {
    written = await writeStateSnapshot(resolved.bubblePaths.statePath, done, {
      expectedFingerprint: committedWritten.fingerprint,
      expectedState: "COMMITTED"
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new BubbleCommitError(
      `DONE_PACKAGE ${appended.envelope.id} was appended and git commit ${commitSha} completed, but DONE transition failed after COMMITTED state persisted. Transcript remains canonical; recover state from transcript tail. Root error: ${reason}`
    );
  }

  return {
    bubbleId: resolved.bubbleId,
    sequence: appended.sequence,
    envelope: appended.envelope,
    state: written.state,
    commitSha,
    commitMessage,
    stagedFiles,
    donePackagePath
  };
}

export function asBubbleCommitError(error: unknown): never {
  if (error instanceof BubbleCommitError) {
    throw error;
  }
  if (error instanceof BubbleLookupError) {
    throw new BubbleCommitError(error.message);
  }
  if (error instanceof GitCommandError) {
    throw new BubbleCommitError(error.message);
  }
  if (error instanceof Error) {
    throw new BubbleCommitError(error.message);
  }
  throw error;
}
