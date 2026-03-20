import { resolve } from "node:path";

import { readStateSnapshot } from "../../../core/state/stateStore.js";
import { runGit } from "../../../core/workspace/git.js";
import { normalizeStringList } from "../../../core/util/normalize.js";
import { resolveBubbleById } from "../../../core/bubble/bubbleLookup.js";
import { ensureBubbleInstanceIdForMutation } from "../../../core/bubble/bubbleInstanceId.js";
import type {
  CommitBubbleInput,
  CommitBubbleResult
} from "../../application/commit/commitCommandContract.js";
import {
  BubbleCommitError,
  throwAsBubbleCommitError
} from "./commitCommandRuntime.js";
import {
  appendDonePackageEnvelope,
  emitCommitLifecycleEvent,
  persistCommittedThenDoneState
} from "./commitCommandFinalization.js";
import {
  readOrCreateDonePackage
} from "./commitDonePackage.js";
import {
  assertStagedFilesWithinWorktree,
  collectStagedFiles,
  formatCommitErrorMessage
} from "./commitStagedFiles.js";
import type {
  CommitGitResult,
  CommitRuntimeContext
} from "./commitCommandApiContract.js";
export { BubbleCommitError } from "./commitCommandRuntime.js";

async function prepareCommitRuntimeContext(input: {
  command: CommitBubbleInput;
  now: Date;
  nowIso: string;
  auto: boolean;
}): Promise<CommitRuntimeContext> {
  const resolved = await resolveBubbleById({
    bubbleId: input.command.bubbleId,
    ...(input.command.repoPath !== undefined ? { repoPath: input.command.repoPath } : {}),
    ...(input.command.cwd !== undefined ? { cwd: input.command.cwd } : {})
  });
  const bubbleIdentity = await ensureBubbleInstanceIdForMutation({
    bubbleId: resolved.bubbleId,
    repoPath: resolved.repoPath,
    bubblePaths: resolved.bubblePaths,
    bubbleConfig: resolved.bubbleConfig,
    now: input.now
  });
  resolved.bubbleConfig = bubbleIdentity.bubbleConfig;
  const loadedState = await readStateSnapshot(resolved.bubblePaths.statePath);
  const state = loadedState.state;

  if (state.state !== "APPROVED_FOR_COMMIT") {
    throw new BubbleCommitError(
      `bubble commit can only be used while state is APPROVED_FOR_COMMIT (current: ${state.state}).`
    );
  }

  const donePackagePath = resolve(resolved.bubblePaths.artifactsDir, "done-package.md");
  const donePackageContent = await readOrCreateDonePackage({
    donePackagePath,
    transcriptPath: resolved.bubblePaths.transcriptPath,
    bubbleId: resolved.bubbleId,
    round: state.round,
    nowIso: input.nowIso,
    autoGenerate: input.auto,
    implementer: resolved.bubbleConfig.agents.implementer,
    reviewer: resolved.bubbleConfig.agents.reviewer
  });

  return {
    resolved,
    bubbleIdentity,
    loadedState,
    state,
    donePackagePath,
    donePackageContent
  };
}

async function runCommitGitStep(input: {
  command: CommitBubbleInput;
  context: CommitRuntimeContext;
  auto: boolean;
}): Promise<CommitGitResult> {
  if (input.auto) {
    await runGit(["add", "-A"], {
      cwd: input.context.resolved.bubblePaths.worktreePath
    });
  }

  const stagedFiles = await collectStagedFiles(input.context.resolved.bubblePaths.worktreePath);
  if (stagedFiles.length === 0) {
    throw new BubbleCommitError(
      formatCommitErrorMessage({
        reasonCode: "COMMIT_STAGED_FILES_EMPTY",
        message:
          input.auto
            ? `No staged files found in bubble worktree even after --auto stage-all (bubble_id=${input.context.resolved.bubbleId}; command_name=commit).`
            : `No staged files found in bubble worktree. Stage changes before commit, or use \`pairflow bubble commit --auto\` (bubble_id=${input.context.resolved.bubbleId}; command_name=commit).`,
        context: {
          bubble_id: input.context.resolved.bubbleId,
          command_name: "commit",
          auto_generate: input.auto,
          worktree_path: input.context.resolved.bubblePaths.worktreePath
        }
      })
    );
  }

  assertStagedFilesWithinWorktree(
    stagedFiles,
    input.context.resolved.bubblePaths.worktreePath,
    input.context.resolved.bubbleId
  );

  const commitMessage = input.command.message ?? `bubble(${input.context.resolved.bubbleId}): finalize`;
  await runGit(["commit", "-m", commitMessage], {
    cwd: input.context.resolved.bubblePaths.worktreePath
  });
  const commitSha = (
    await runGit(["rev-parse", "HEAD"], {
      cwd: input.context.resolved.bubblePaths.worktreePath
    })
  ).stdout.trim();

  return { stagedFiles, commitMessage, commitSha };
}

export async function commitBubble(
  input: CommitBubbleInput
): Promise<CommitBubbleResult> {
  const now = input.now ?? new Date();
  const nowIso = now.toISOString();
  const auto = input.auto ?? false;
  const refs = normalizeStringList(input.refs ?? []);

  const context = await prepareCommitRuntimeContext({
    command: input,
    now,
    nowIso,
    auto
  });

  const { stagedFiles, commitMessage, commitSha } = await runCommitGitStep({
    command: input,
    context,
    auto
  });

  const appended = await appendDonePackageEnvelope({
    context,
    refs,
    now,
    stagedFiles,
    commitMessage,
    commitSha
  });

  const written = await persistCommittedThenDoneState({
    context,
    nowIso,
    appended,
    commitSha
  });

  await emitCommitLifecycleEvent({
    context,
    commitSha,
    commitMessage,
    stagedFiles,
    refs,
    now,
    auto
  });

  return {
    bubbleId: context.resolved.bubbleId,
    sequence: appended.sequence,
    envelope: appended.envelope,
    state: written.state,
    commitSha,
    commitMessage,
    stagedFiles,
    donePackagePath: context.donePackagePath
  };
}

export function asBubbleCommitError(error: unknown): never {
  return throwAsBubbleCommitError(error);
}
