import { normalizeStringList } from "../../../../shared/normalization/stringNormalization.js";
import type {
  CommitBubbleInput,
  CommitBubbleResult
} from "../../commitCommandContract.js";
import type {
  CommitBubbleDependencies,
  CommitExecutionContext
} from "../../commitCommandApiContract.js";
import { BubbleCommitError } from "../error/commitCommandRuntime.js";
import {
  appendCommitResultEnvelope,
  emitCommitLifecycleEvent,
  persistCommittedThenDoneState
} from "../finalization/commitCommandFinalization.js";
import { syncRemoteCommitContinuityArtifacts } from "../../remoteCommitContinuitySync.js";
import { runCommitGitStep } from "../git/commitCommandGitStep.js";
import {
  canonicalizeCommitExecutionPath,
  resolveRemoteCommitExecutionContextFromEnv
} from "../remote/remoteCommitExecutionContext.js";

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
}) {
  return {
    resolved: input.context.resolved,
    bubbleIdentity: input.context.bubbleIdentity,
    round: input.round
  };
}

async function importRemoteCommitContinuityForCommit(input: {
  bubbleId: string;
  remoteClonePath: string;
  remoteTarget: Extract<CommitExecutionContext, { route: "remote" }>["remoteTarget"];
  importRemoteBubbleCommitContinuity:
    CommitBubbleDependencies["importRemoteBubbleCommitContinuity"];
}): ReturnType<CommitBubbleDependencies["importRemoteBubbleCommitContinuity"]> {
  try {
    return await input.importRemoteBubbleCommitContinuity({
      bubbleId: input.bubbleId,
      remoteClonePath: input.remoteClonePath,
      remoteTarget: input.remoteTarget
    });
  } catch (error) {
    const code = typeof (error as { code?: unknown }).code === "string"
      ? (error as { code: string }).code
      : undefined;
    const reasonCode = code === "REMOTE_COMMIT_TRANSPORT_FAILED"
      ? "REMOTE_COMMIT_CONTINUITY_IMPORT_UNAVAILABLE"
      : "REMOTE_COMMIT_CONTINUITY_IMPORT_INVALID";
    throw new BubbleCommitError({
      reasonCode,
      message:
        `Remote commit continuity import failed for '${input.bubbleId}': ${
          error instanceof Error ? error.message : String(error)
        }`,
      context: {
        bubble_id: input.bubbleId,
        command_name: "commit",
        remote_clone_path: input.remoteClonePath
      },
      cause: error
    });
  }
}

async function syncRemoteCommitContinuity(input: {
  result: {
    stateContent: string;
    transcriptContent: string;
  };
  context: Extract<CommitExecutionContext, { route: "remote" }>;
  dependencies: CommitBubbleDependencies;
  syncFailureReasonCode: string;
}): Promise<void> {
  try {
    await syncRemoteCommitContinuityArtifacts({
      statePath: input.context.resolved.bubblePaths.statePath,
      transcriptPath: input.context.resolved.bubblePaths.transcriptPath,
      stateContent: input.result.stateContent,
      transcriptContent: input.result.transcriptContent,
      ...(input.dependencies.renamePath !== undefined
        ? { renamePath: input.dependencies.renamePath }
        : {}),
      writeTextFile: input.dependencies.writeTextFile
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new BubbleCommitError({
      reasonCode: input.syncFailureReasonCode,
      message:
        `Remote commit succeeded for '${input.context.resolved.bubbleId}', but local continuity sync-back failed: ${reason}`,
      context: {
        bubble_id: input.context.resolved.bubbleId,
        command_name: "commit",
        remote_clone_path: input.context.remotePointer.remoteClonePath,
        state_path: input.context.resolved.bubblePaths.statePath,
        transcript_path: input.context.resolved.bubblePaths.transcriptPath
      },
      cause: error
    });
  }
}

async function commitRemoteExecutionRoute(input: {
  command: CommitBubbleInput;
  context: Extract<CommitExecutionContext, { route: "remote" }>;
  dependencies: CommitBubbleDependencies;
  refs: string[];
  now: Date;
  stageAll: boolean;
}): Promise<CommitBubbleResult> {
  const loadedStateBeforeImport = await input.dependencies.readStateSnapshot(
    input.context.resolved.bubblePaths.statePath
  );
  const imported = await importRemoteCommitContinuityForCommit({
    bubbleId: input.command.bubbleId,
    remoteClonePath: input.context.remotePointer.remoteClonePath,
    remoteTarget: input.context.remoteTarget,
    importRemoteBubbleCommitContinuity:
      input.dependencies.importRemoteBubbleCommitContinuity
  });

  if (imported.classification === "imported_remote_completion") {
    await syncRemoteCommitContinuity({
      result: imported,
      context: input.context,
      dependencies: input.dependencies,
      syncFailureReasonCode: "REMOTE_COMMIT_SYNC_BACK_FAILED"
    });

    if (loadedStateBeforeImport.state.state !== "DONE") {
      await emitCommitLifecycleEvent({
        context: buildCommitLifecycleContext({
          context: input.context,
          round: imported.state.round
        }),
        commitSha: imported.commitSha,
        commitMessage: imported.commitMessage,
        stagedFiles: imported.stagedFiles,
        refs: input.refs,
        now: input.now,
        auto: input.stageAll
      });
    }

    return {
      bubbleId: input.context.resolved.bubbleId,
      sequence: imported.sequence,
      envelope: imported.envelope,
      state: imported.state,
      commitSha: imported.commitSha,
      commitMessage: imported.commitMessage,
      stagedFiles: imported.stagedFiles
    };
  }

  if (loadedStateBeforeImport.state.state !== "APPROVED_FOR_COMMIT") {
    throw new BubbleCommitError(
      `bubble commit can only be used while state is APPROVED_FOR_COMMIT (current: ${loadedStateBeforeImport.state.state}).`
    );
  }

  const remoteResult = await input.dependencies.executeRemoteBubbleCommitCommand({
    bubbleId: input.command.bubbleId,
    remoteClonePath: input.context.remotePointer.remoteClonePath,
    remoteTarget: input.context.remoteTarget,
    refs: input.refs,
    ...(input.command.message !== undefined ? { message: input.command.message } : {}),
    stageAll: input.stageAll
  });

  await syncRemoteCommitContinuity({
    result: remoteResult,
    context: input.context,
    dependencies: input.dependencies,
    syncFailureReasonCode: "REMOTE_COMMIT_SYNC_BACK_FAILED"
  });

  await emitCommitLifecycleEvent({
    context: buildCommitLifecycleContext({
      context: input.context,
      round: remoteResult.state.round
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
  force: boolean;
}): Promise<CommitBubbleResult> {
  const { stagedFiles, commitMessage, commitSha } = await runCommitGitStep({
    command: input.command,
    context: input.context,
    stageAll: input.stageAll,
    force: input.force,
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

export async function runCommitCommandPipeline(
  input: CommitBubbleInput,
  dependencies: CommitBubbleDependencies
): Promise<CommitBubbleResult> {
  const now = input.now ?? new Date();
  const nowIso = now.toISOString();
  const stageAll = input.stageAll !== undefined
    ? input.stageAll
    : input.auto ?? false;
  const force = input.force ?? false;
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
    stageAll,
    force
  });
}
