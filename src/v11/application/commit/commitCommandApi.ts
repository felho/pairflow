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
  appendDonePackageEnvelope,
  emitCommitLifecycleEvent,
  persistCommittedThenDoneState,
  syncRemoteCommitContinuityArtifacts
} from "./commitCommandFinalization.js";
import {
  readOrCreateDonePackage
} from "./commitDonePackage.js";
import type {
  CommitExecutionContext,
  CommitBubbleDependencies
} from "./commitCommandApiContract.js";
import { runCommitGitStep } from "./commitCommandGitStep.js";
import {
  resolveRemoteCommitExecutionContextFromEnv
} from "./remoteCommitExecutionContext.js";
export { BubbleCommitError } from "./commitCommandRuntime.js";

async function prepareCommitExecutionContext(input: {
  command: CommitBubbleInput;
  now: Date;
  nowIso: string;
  auto: boolean;
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
  const donePackagePath = resolve(resolved.bubblePaths.artifactsDir, "done-package.md");

  if (resolved.bubbleConfig.executor?.type === "ssh") {
    const remoteCommitExecutionContext = resolveRemoteCommitExecutionContextFromEnv();
    const remotePointer = await input.dependencies.readRemotePointer(
      resolved.bubblePaths.remotePointerPath
    );
    if (
      remoteCommitExecutionContext?.kind === "remote_clone"
      && remoteCommitExecutionContext.workspaceRoot === resolved.repoPath
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
        donePackagePath,
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

  const donePackageContent = await readOrCreateDonePackage({
    donePackagePath,
    transcriptPath: resolved.bubblePaths.transcriptPath,
    bubbleId: resolved.bubbleId,
    round: state.round,
    nowIso: input.nowIso,
    autoGenerate: input.auto,
    implementer: resolved.bubbleConfig.agents.implementer,
    reviewer: resolved.bubbleConfig.agents.reviewer,
    readTranscriptEnvelopes: input.dependencies.readTranscriptEnvelopes
  });

  return {
    route: "local",
    resolved,
    bubbleIdentity,
    loadedState,
    state,
    appendProtocolEnvelope: input.dependencies.appendProtocolEnvelope,
    writeStateSnapshot: input.dependencies.writeStateSnapshot,
    donePackagePath,
    donePackageContent
  };
}

export async function commitBubble(
  input: CommitBubbleInput,
  dependencies: CommitBubbleDependencies
): Promise<CommitBubbleResult> {
  try {
    const now = input.now ?? new Date();
    const nowIso = now.toISOString();
    const auto = input.auto ?? false;
    const refs = normalizeStringList(input.refs ?? []);

    const context = await prepareCommitExecutionContext({
      command: input,
      now,
      nowIso,
      auto,
      dependencies
    });

    if (context.route === "remote") {
      const remoteResult = await dependencies.executeRemoteBubbleCommitCommand({
        bubbleId: input.bubbleId,
        remoteClonePath: context.remotePointer.remoteClonePath,
        remoteTarget: context.remoteTarget,
        refs,
        ...(input.message !== undefined ? { message: input.message } : {}),
        auto
      });

      try {
        await syncRemoteCommitContinuityArtifacts({
          statePath: context.resolved.bubblePaths.statePath,
          transcriptPath: context.resolved.bubblePaths.transcriptPath,
          donePackagePath: context.donePackagePath,
          stateContent: remoteResult.stateContent,
          transcriptContent: remoteResult.transcriptContent,
          donePackageContent: remoteResult.donePackageContent,
          ...(dependencies.renamePath !== undefined
            ? { renamePath: dependencies.renamePath }
            : {}),
          writeTextFile: dependencies.writeTextFile
        });
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        throw new BubbleCommitError({
          reasonCode: "REMOTE_COMMIT_SYNC_BACK_FAILED",
          message:
            `Remote commit succeeded for '${context.resolved.bubbleId}', but local continuity sync-back failed: ${reason}`,
          context: {
            bubble_id: context.resolved.bubbleId,
            command_name: "commit",
            remote_clone_path: context.remotePointer.remoteClonePath,
            state_path: context.resolved.bubblePaths.statePath,
            transcript_path: context.resolved.bubblePaths.transcriptPath,
            done_package_path: context.donePackagePath
          },
          cause: error
        });
      }

      await emitCommitLifecycleEvent({
        context: {
          resolved: context.resolved,
          bubbleIdentity: context.bubbleIdentity,
          donePackagePath: context.donePackagePath,
          round: remoteResult.state.round
        },
        commitSha: remoteResult.commitSha,
        commitMessage: remoteResult.commitMessage,
        stagedFiles: remoteResult.stagedFiles,
        refs,
        now,
        auto
      });

      return {
        bubbleId: context.resolved.bubbleId,
        sequence: remoteResult.sequence,
        envelope: remoteResult.envelope,
        state: remoteResult.state,
        commitSha: remoteResult.commitSha,
        commitMessage: remoteResult.commitMessage,
        stagedFiles: remoteResult.stagedFiles,
        donePackagePath: context.donePackagePath
      };
    }

    const { stagedFiles, commitMessage, commitSha } = await runCommitGitStep({
      command: input,
      context,
      auto,
      runGit: dependencies.runGit
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
      context: {
        resolved: context.resolved,
        bubbleIdentity: context.bubbleIdentity,
        donePackagePath: context.donePackagePath,
        round: context.state.round
      },
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
  } catch (error) {
    return throwAsBubbleCommitError(error);
  }
}

export function asBubbleCommitError(error: unknown): never {
  return throwAsBubbleCommitError(error);
}
