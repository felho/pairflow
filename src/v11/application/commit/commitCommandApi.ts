import { resolve } from "node:path";

import { normalizeStringList } from "../../shared/normalization/stringNormalization.js";
import type {
  CommitBubbleInput,
  CommitBubbleResult
} from "./commitCommandContract.js";
import {
  BubbleCommitError,
  throwAsBubbleCommitError
} from "./commitCommandRuntime.js";
import {
  appendCommitResultEnvelope,
  emitCommitLifecycleEvent,
  persistCommittedThenDoneState,
  syncRemoteCommitContinuityArtifacts
} from "./commitCommandFinalization.js";
import type {
  CommitExecutionContext,
  CommitBubbleDependencies
} from "./commitCommandApiContract.js";
import { runCommitGitStep } from "./commitCommandGitStep.js";
import {
  canonicalizeCommitExecutionPath,
  resolveRemoteCommitExecutionContextFromEnv
} from "./remoteCommitExecutionContext.js";
export { BubbleCommitError } from "./commitCommandRuntime.js";

async function prepareCommitExecutionContext(input: {
  command: CommitBubbleInput;
  now: Date;
  dependencies: CommitBubbleDependencies;
}): Promise<CommitExecutionContext> {
  const resolved = await input.dependencies.resolveBubbleById({
    bubbleId: input.command.bubbleId,
    ...(input.command.repoPath !== undefined ? { repoPath: input.command.repoPath } : {}),
    ...(input.command.cwd !== undefined ? { cwd: input.command.cwd } : {})
  });
  const bubbleIdentity = await input.dependencies.ensureBubbleInstanceIdForMutation({
    bubbleId: resolved.bubbleId,
    repoPath: resolved.repoPath,
    bubblePaths: resolved.bubblePaths,
    bubbleConfig: resolved.bubbleConfig,
    now: input.now
  });
  resolved.bubbleConfig = bubbleIdentity.bubbleConfig;

  if (resolved.bubbleConfig.executor?.type === "ssh") {
    const remoteCommitExecutionContext = resolveRemoteCommitExecutionContextFromEnv();
    const resolvedRepoPath = canonicalizeCommitExecutionPath(resolved.repoPath);
    const remotePointer = await input.dependencies.readRemotePointer(
      resolved.bubblePaths.remotePointerPath
    );
    if (
      remoteCommitExecutionContext?.kind === "remote_clone"
      && remoteCommitExecutionContext.workspaceRoot === resolvedRepoPath
    ) {
      if (remotePointer !== null) {
        throw new BubbleCommitError({
          reasonCode: "COMMIT_REMOTE_START_REQUIRED",
          message:
            `Remote inner commit for '${resolved.bubbleId}' refused to continue because source-repo remote artifacts are still present.`,
          context: {
            bubble_id: resolved.bubbleId,
            command_name: "commit",
            remote_pointer_kind: remotePointer.kind,
            remote_workspace_root: remoteCommitExecutionContext.workspaceRoot
          }
        });
      }
    } else {
      if (remotePointer?.kind !== "started") {
        throw new BubbleCommitError({
          reasonCode: "COMMIT_REMOTE_START_REQUIRED",
          message:
            `Remote commit for '${resolved.bubbleId}' requires a started remote pointer. Run \`pairflow bubble start --id ${resolved.bubbleId}\` first.`,
          context: {
            bubble_id: resolved.bubbleId,
            command_name: "commit",
            remote_pointer_kind: remotePointer?.kind ?? "missing"
          }
        });
      }

      const remoteTarget = await input.dependencies.resolveRemoteBubbleStatusTarget({
        bubbleId: resolved.bubbleId,
        remoteAlias: resolved.bubbleConfig.executor.remote,
        expectedHost: remotePointer.host
      });

      return {
        route: "remote",
        resolved,
        bubbleIdentity,
        remotePointer,
        remoteTarget
      };
    }
  }

  const loadedState = await input.dependencies.readStateSnapshot(resolved.bubblePaths.statePath);
  const state = loadedState.state;

  if (state.state !== "APPROVED_FOR_COMMIT") {
    throw new BubbleCommitError(
      `bubble commit can only be used while state is APPROVED_FOR_COMMIT (current: ${state.state}).`
    );
  }

  return {
    route: "local",
    resolved,
    bubbleIdentity,
    loadedState,
    state,
    appendProtocolEnvelope: input.dependencies.appendProtocolEnvelope,
    writeStateSnapshot: input.dependencies.writeStateSnapshot
  };
}

function buildCommitLifecycleContext(input: {
  context: CommitExecutionContext;
  round: number;
  donePackagePath?: string;
}) {
  return {
    resolved: input.context.resolved,
    bubbleIdentity: input.context.bubbleIdentity,
    round: input.round,
    ...(input.donePackagePath !== undefined
      ? { donePackagePath: input.donePackagePath }
      : {})
  };
}

async function commitRemoteExecutionRoute(input: {
  command: CommitBubbleInput;
  context: Extract<CommitExecutionContext, { route: "remote" }>;
  dependencies: CommitBubbleDependencies;
  refs: string[];
  now: Date;
  stageAll: boolean;
}): Promise<CommitBubbleResult> {
  const donePackagePath = resolve(
    input.context.resolved.bubblePaths.artifactsDir,
    "done-package.md"
  );
  const remoteResult = await input.dependencies.executeRemoteBubbleCommitCommand({
    bubbleId: input.command.bubbleId,
    remoteClonePath: input.context.remotePointer.remoteClonePath,
    remoteTarget: input.context.remoteTarget,
    refs: input.refs,
    ...(input.command.message !== undefined ? { message: input.command.message } : {}),
    auto: input.stageAll
  });

  try {
    await syncRemoteCommitContinuityArtifacts({
      statePath: input.context.resolved.bubblePaths.statePath,
      transcriptPath: input.context.resolved.bubblePaths.transcriptPath,
      donePackagePath,
      stateContent: remoteResult.stateContent,
      transcriptContent: remoteResult.transcriptContent,
      donePackageContent: remoteResult.donePackageContent,
      ...(input.dependencies.renamePath !== undefined
        ? { renamePath: input.dependencies.renamePath }
        : {}),
      writeTextFile: input.dependencies.writeTextFile
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new BubbleCommitError({
      reasonCode: "REMOTE_COMMIT_SYNC_BACK_FAILED",
      message:
        `Remote commit succeeded for '${input.context.resolved.bubbleId}', but local continuity sync-back failed: ${reason}`,
      context: {
        bubble_id: input.context.resolved.bubbleId,
        command_name: "commit",
        remote_clone_path: input.context.remotePointer.remoteClonePath,
        state_path: input.context.resolved.bubblePaths.statePath,
        transcript_path: input.context.resolved.bubblePaths.transcriptPath,
        done_package_path: donePackagePath
      },
      cause: error
    });
  }

  await emitCommitLifecycleEvent({
    context: buildCommitLifecycleContext({
      context: input.context,
      round: remoteResult.state.round,
      donePackagePath
    }),
    commitSha: remoteResult.commitSha,
    commitMessage: remoteResult.commitMessage,
    stagedFiles: remoteResult.stagedFiles,
    refs: input.refs,
    now: input.now,
    auto: input.stageAll
  });

  return {
    bubbleId: input.context.resolved.bubbleId,
    sequence: remoteResult.sequence,
    envelope: remoteResult.envelope,
    state: remoteResult.state,
    commitSha: remoteResult.commitSha,
    commitMessage: remoteResult.commitMessage,
    stagedFiles: remoteResult.stagedFiles
  };
}

async function commitLocalExecutionRoute(input: {
  command: CommitBubbleInput;
  context: Extract<CommitExecutionContext, { route: "local" }>;
  dependencies: CommitBubbleDependencies;
  refs: string[];
  now: Date;
  nowIso: string;
  stageAll: boolean;
}): Promise<CommitBubbleResult> {
  const { stagedFiles, commitMessage, commitSha } = await runCommitGitStep({
    command: input.command,
    context: input.context,
    stageAll: input.stageAll,
    runGit: input.dependencies.runGit
  });

  const appended = await appendCommitResultEnvelope({
    context: input.context,
    refs: input.refs,
    now: input.now,
    stagedFiles,
    commitMessage,
    commitSha
  });

  const written = await persistCommittedThenDoneState({
    context: input.context,
    nowIso: input.nowIso,
    appended,
    commitSha
  });

  await emitCommitLifecycleEvent({
    context: buildCommitLifecycleContext({
      context: input.context,
      round: input.context.state.round
    }),
    commitSha,
    commitMessage,
    stagedFiles,
    refs: input.refs,
    now: input.now,
    auto: input.stageAll
  });

  return {
    bubbleId: input.context.resolved.bubbleId,
    sequence: appended.sequence,
    envelope: appended.envelope,
    state: written.state,
    commitSha,
    commitMessage,
    stagedFiles
  };
}

export async function commitBubble(
  input: CommitBubbleInput,
  dependencies: CommitBubbleDependencies
): Promise<CommitBubbleResult> {
  try {
    const now = input.now ?? new Date();
    const nowIso = now.toISOString();
    const stageAll = input.stageAll !== undefined
      ? input.stageAll
      : input.auto ?? false;
    const refs = normalizeStringList(input.refs ?? []);

    const context = await prepareCommitExecutionContext({
      command: input,
      now,
      dependencies
    });

    if (context.route === "remote") {
      return await commitRemoteExecutionRoute({
        command: input,
        context,
        dependencies,
        refs,
        now,
        stageAll
      });
    }

    return await commitLocalExecutionRoute({
      command: input,
      context,
      dependencies,
      refs,
      now,
      nowIso,
      stageAll
    });
  } catch (error) {
    return throwAsBubbleCommitError(error);
  }
}

export function asBubbleCommitError(error: unknown): never {
  return throwAsBubbleCommitError(error);
}
