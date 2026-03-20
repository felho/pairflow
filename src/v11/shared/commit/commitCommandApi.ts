import { join, resolve } from "node:path";

import { appendProtocolEnvelope } from "../../../core/protocol/transcriptStore.js";
import { applyStateTransition } from "../../../core/state/machine.js";
import { readStateSnapshot, writeStateSnapshot } from "../../../core/state/stateStore.js";
import { runGit } from "../../../core/workspace/git.js";
import { normalizeStringList } from "../../../core/util/normalize.js";
import { resolveBubbleById } from "../../../core/bubble/bubbleLookup.js";
import { ensureBubbleInstanceIdForMutation } from "../../../core/bubble/bubbleInstanceId.js";
import { emitBubbleLifecycleEventBestEffort } from "../../../core/metrics/bubbleEvents.js";
import type {
  CommitBubbleInput,
  CommitBubbleResult
} from "../../application/commit/commitCommandContract.js";
import {
  BubbleCommitError,
  throwAsBubbleCommitError
} from "./commitCommandRuntime.js";
import {
  deriveDonePackageSummary,
  readOrCreateDonePackage
} from "./commitDonePackage.js";
import {
  assertStagedFilesWithinWorktree,
  collectStagedFiles,
  formatCommitErrorMessage
} from "./commitStagedFiles.js";
export { BubbleCommitError } from "./commitCommandRuntime.js";

type ResolvedBubbleContext = Awaited<ReturnType<typeof resolveBubbleById>>;
type BubbleIdentity = Awaited<ReturnType<typeof ensureBubbleInstanceIdForMutation>>;
type LoadedState = Awaited<ReturnType<typeof readStateSnapshot>>;
type AppendedEnvelope = Awaited<ReturnType<typeof appendProtocolEnvelope>>;
type WrittenState = Awaited<ReturnType<typeof writeStateSnapshot>>;

interface CommitRuntimeContext {
  resolved: ResolvedBubbleContext;
  bubbleIdentity: BubbleIdentity;
  loadedState: LoadedState;
  state: LoadedState["state"];
  donePackagePath: string;
  donePackageContent: string;
}

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

interface CommitGitResult {
  stagedFiles: string[];
  commitMessage: string;
  commitSha: string;
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

async function appendDonePackageEnvelope(input: {
  context: CommitRuntimeContext;
  refs: string[];
  now: Date;
  stagedFiles: string[];
  commitMessage: string;
  commitSha: string;
}): Promise<AppendedEnvelope> {
  const envelopeRefs = normalizeStringList([...input.refs, input.context.donePackagePath]);
  const lockPath = join(
    input.context.resolved.bubblePaths.locksDir,
    `${input.context.resolved.bubbleId}.lock`
  );
  return appendProtocolEnvelope({
    transcriptPath: input.context.resolved.bubblePaths.transcriptPath,
    lockPath,
    now: input.now,
    envelope: {
      bubble_id: input.context.resolved.bubbleId,
      sender: "orchestrator",
      recipient: "human",
      type: "DONE_PACKAGE",
      round: input.context.state.round,
      payload: {
        summary: deriveDonePackageSummary(input.context.donePackageContent),
        metadata: {
          done_package_path: input.context.donePackagePath,
          staged_files: input.stagedFiles,
          commit_message: input.commitMessage,
          commit_sha: input.commitSha
        }
      },
      refs: envelopeRefs
    }
  });
}

async function persistCommittedThenDoneState(input: {
  context: CommitRuntimeContext;
  nowIso: string;
  appended: AppendedEnvelope;
  commitSha: string;
}): Promise<WrittenState> {
  const committed = applyStateTransition(input.context.state, {
    to: "COMMITTED",
    lastCommandAt: input.nowIso
  });
  const committedWritten = await writeStateSnapshot(
    input.context.resolved.bubblePaths.statePath,
    committed,
    {
      expectedFingerprint: input.context.loadedState.fingerprint,
      expectedState: "APPROVED_FOR_COMMIT"
    }
  );

  const done = applyStateTransition(committedWritten.state, {
    to: "DONE",
    activeAgent: null,
    activeRole: null,
    activeSince: null,
    lastCommandAt: input.nowIso
  });

  try {
    return await writeStateSnapshot(input.context.resolved.bubblePaths.statePath, done, {
      expectedFingerprint: committedWritten.fingerprint,
      expectedState: "COMMITTED"
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new BubbleCommitError(
      `DONE_PACKAGE ${input.appended.envelope.id} was appended and git commit ${input.commitSha} completed, but DONE transition failed after COMMITTED state persisted. Transcript remains canonical; recover state from transcript tail. Root error: ${reason}`
    );
  }
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

  await emitBubbleLifecycleEventBestEffort({
    repoPath: context.resolved.repoPath,
    bubbleId: context.resolved.bubbleId,
    bubbleInstanceId: context.bubbleIdentity.bubbleInstanceId,
    eventType: "bubble_committed",
    round: context.state.round,
    actorRole: "orchestrator",
    metadata: {
      commit_sha: commitSha,
      commit_message: commitMessage,
      staged_file_count: stagedFiles.length,
      done_package_path: context.donePackagePath,
      auto,
      refs_count: normalizeStringList([...refs, context.donePackagePath]).length
    },
    now
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
