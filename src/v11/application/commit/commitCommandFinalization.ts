import { emitBubbleLifecycleEventBestEffort } from "../metrics/bubbleEvents.js";
import type {
  AppendedEnvelope,
  CommitRuntimeContext,
  WrittenState
} from "./commitCommandApiContract.js";
import {
  appendCommitResultEnvelopeMutation,
  persistCommittedThenDoneStateMutation
} from "./commitCommandFinalizationMutation.js";

export async function appendCommitResultEnvelope(input: {
  context: CommitRuntimeContext;
  refs: string[];
  now: Date;
  stagedFiles: string[];
  commitMessage: string;
  commitSha: string;
}): Promise<AppendedEnvelope> {
  return appendCommitResultEnvelopeMutation({
    context: {
      bubbleId: input.context.resolved.bubbleId,
      bubblePaths: {
        locksDir: input.context.resolved.bubblePaths.locksDir,
        statePath: input.context.resolved.bubblePaths.statePath,
        transcriptPath: input.context.resolved.bubblePaths.transcriptPath
      },
      round: input.context.state.round
    },
    refs: input.refs,
    now: input.now,
    stagedFiles: input.stagedFiles,
    commitMessage: input.commitMessage,
    commitSha: input.commitSha,
    appendProtocolEnvelope: input.context.appendProtocolEnvelope
  });
}

export async function persistCommittedThenDoneState(input: {
  context: CommitRuntimeContext;
  nowIso: string;
  appended: AppendedEnvelope;
  commitSha: string;
}): Promise<WrittenState> {
  return persistCommittedThenDoneStateMutation({
    context: {
      statePath: input.context.resolved.bubblePaths.statePath,
      state: input.context.state,
      loadedState: input.context.loadedState
    },
    nowIso: input.nowIso,
    appended: input.appended,
    commitSha: input.commitSha,
    writeStateSnapshot: input.context.writeStateSnapshot
  });
}

export async function emitCommitLifecycleEvent(input: {
  context: {
    resolved: CommitRuntimeContext["resolved"];
    bubbleIdentity: CommitRuntimeContext["bubbleIdentity"];
    round: number;
  };
  commitSha: string;
  commitMessage: string;
  stagedFiles: string[];
  refs: string[];
  now: Date;
  auto: boolean;
}): Promise<void> {
  await emitBubbleLifecycleEventBestEffort({
    repoPath: input.context.resolved.repoPath,
    bubbleId: input.context.resolved.bubbleId,
    bubbleInstanceId: input.context.bubbleIdentity.bubbleInstanceId,
    eventType: "bubble_committed",
    round: input.context.round,
    actorRole: "orchestrator",
    metadata: {
      commit_sha: input.commitSha,
      commit_message: input.commitMessage,
      staged_file_count: input.stagedFiles.length,
      auto: input.auto,
      refs_count: input.refs.length
    },
    now: input.now
  });
}
