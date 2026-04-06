import { join } from "node:path";

import { emitBubbleLifecycleEventBestEffort } from "../../../core/metrics/bubbleEvents.js";
import { appendProtocolEnvelope } from "../../../v11/infrastructure/artifact/transcript/transcriptStore.js";
import { applyStateTransition } from "../../domain/state/machine.js";
import { writeStateSnapshot } from "../../infrastructure/state/stateStore.js";
import { normalizeStringList } from "../normalization/stringNormalization.js";
import { deriveDonePackageSummary } from "./commitDonePackage.js";
import { BubbleCommitError } from "./commitCommandRuntime.js";
import type {
  AppendedEnvelope,
  CommitRuntimeContext,
  WrittenState
} from "./commitCommandApiContract.js";

export async function appendDonePackageEnvelope(input: {
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

export async function persistCommittedThenDoneState(input: {
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
