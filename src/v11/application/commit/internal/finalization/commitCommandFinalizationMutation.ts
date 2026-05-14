import { join } from "node:path";

import { applyStateTransition } from "../../../../domain/state/machine.js";
import { normalizeStringList } from "../../../../shared/normalization/stringNormalization.js";
import { BubbleCommitError } from "../error/commitCommandError.js";
import type { BubbleStateSnapshot } from "../../../../domain/state/snapshot/bubbleStateSnapshot.js";
import type {
  LoadedStateSnapshot,
  WriteStateSnapshotPort
} from "../../../../ports/stateSnapshots.js";
import type {
  ProtocolEnvelope,
  ProtocolEnvelopeDraft
} from "../../../../shared/protocol/protocolEnvelopeContract.js";

export interface CommitFinalizationContext {
  bubbleId: string;
  bubblePaths: {
    locksDir: string;
    statePath: string;
    transcriptPath: string;
  };
  round: number;
}

export interface CommitFinalizationAppendResult {
  envelope: ProtocolEnvelope;
  sequence: number;
  mirrorWriteFailures: Array<{
    path: string;
    message: string;
    code?: string;
  }>;
}

export type CommitFinalizationLoadedState = LoadedStateSnapshot;

export async function appendCommitResultEnvelopeMutation(input: {
  context: CommitFinalizationContext;
  refs: string[];
  now: Date;
  stagedFiles: string[];
  commitMessage: string;
  commitSha: string;
  appendProtocolEnvelope: (input: {
    transcriptPath: string;
    mirrorPaths?: string[];
    lockPath: string;
    envelope: ProtocolEnvelopeDraft;
    now?: Date;
  }) => Promise<CommitFinalizationAppendResult>;
}): Promise<CommitFinalizationAppendResult> {
  const envelopeRefs = normalizeStringList(input.refs);
  const lockPath = join(
    input.context.bubblePaths.locksDir,
    `${input.context.bubbleId}.lock`
  );
  const appendEnvelope = input.appendProtocolEnvelope;
  return appendEnvelope({
    transcriptPath: input.context.bubblePaths.transcriptPath,
    lockPath,
    now: input.now,
    envelope: {
      bubble_id: input.context.bubbleId,
      sender: "orchestrator",
      recipient: "human",
      type: "COMMIT_RESULT",
      round: input.context.round,
      payload: {
        commit_message: input.commitMessage,
        commit_sha: input.commitSha,
        staged_files: input.stagedFiles
      },
      refs: envelopeRefs
    }
  });
}

export async function persistCommittedThenDoneStateMutation(input: {
  context: {
    statePath: string;
    state: BubbleStateSnapshot;
    loadedState: CommitFinalizationLoadedState;
  };
  nowIso: string;
  appended: CommitFinalizationAppendResult;
  commitSha: string;
  writeStateSnapshot: WriteStateSnapshotPort;
}): Promise<CommitFinalizationLoadedState> {
  const writeSnapshot = input.writeStateSnapshot;
  const committed = applyStateTransition(input.context.state, {
    to: "COMMITTED",
    lastCommandAt: input.nowIso
  });
  const committedWritten = await writeSnapshot(
    input.context.statePath,
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
    return await writeSnapshot(input.context.statePath, done, {
      expectedFingerprint: committedWritten.fingerprint,
      expectedState: "COMMITTED"
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new BubbleCommitError(
      `COMMIT_RESULT ${input.appended.envelope.id} was appended and git commit ${input.commitSha} completed, but DONE transition failed after COMMITTED state persisted. Transcript remains canonical; recover state from transcript tail. Root error: ${reason}`
    );
  }
}
