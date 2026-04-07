import { emitBubbleLifecycleEventBestEffort } from "../../shared/metrics/bubbleEvents.js";
import { normalizeStringList } from "../../shared/normalization/stringNormalization.js";
import { deriveDonePackageSummary } from "./commitDonePackage.js";
import type {
  AppendedEnvelope,
  CommitRuntimeContext,
  WrittenState
} from "./commitCommandApiContract.js";
import {
  appendDonePackageEnvelopeMutation,
  persistCommittedThenDoneStateMutation
} from "../../shared/commit/commitCommandFinalizationMutation.js";

export async function appendDonePackageEnvelope(input: {
  context: CommitRuntimeContext;
  refs: string[];
  now: Date;
  stagedFiles: string[];
  commitMessage: string;
  commitSha: string;
}): Promise<AppendedEnvelope> {
  return appendDonePackageEnvelopeMutation({
    context: {
      bubbleId: input.context.resolved.bubbleId,
      bubblePaths: {
        locksDir: input.context.resolved.bubblePaths.locksDir,
        statePath: input.context.resolved.bubblePaths.statePath,
        transcriptPath: input.context.resolved.bubblePaths.transcriptPath
      },
      donePackagePath: input.context.donePackagePath,
      round: input.context.state.round
    },
    refs: input.refs,
    now: input.now,
    stagedFiles: input.stagedFiles,
    commitMessage: input.commitMessage,
    commitSha: input.commitSha,
    donePackageSummary: deriveDonePackageSummary(input.context.donePackageContent),
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
  context: CommitRuntimeContext;
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
    round: input.context.state.round,
    actorRole: "orchestrator",
    metadata: {
      commit_sha: input.commitSha,
      commit_message: input.commitMessage,
      staged_file_count: input.stagedFiles.length,
      done_package_path: input.context.donePackagePath,
      auto: input.auto,
      refs_count: normalizeStringList([...input.refs, input.context.donePackagePath]).length
    },
    now: input.now
  });
}
