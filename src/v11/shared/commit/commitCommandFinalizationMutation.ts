import { join } from "node:path";

import { applyStateTransition } from "../../domain/state/machine.js";
import { normalizeStringList } from "../normalization/stringNormalization.js";
import { BubbleCommitError } from "./commitCommandError.js";
import type { BubbleStateSnapshot } from "../../../types/bubble.js";
import type {
  ProtocolEnvelope,
  ProtocolEnvelopeDraft
} from "../../../types/protocol.js";

export interface CommitFinalizationContext {
  bubbleId: string;
  bubblePaths: {
    locksDir: string;
    statePath: string;
    transcriptPath: string;
  };
  donePackagePath: string;
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

export interface CommitFinalizationLoadedState {
  state: BubbleStateSnapshot;
  fingerprint: string;
}

export async function appendDonePackageEnvelopeMutation(input: {
  context: CommitFinalizationContext;
  refs: string[];
  now: Date;
  stagedFiles: string[];
  commitMessage: string;
  commitSha: string;
  donePackageSummary: string;
  appendProtocolEnvelope: (input: {
    transcriptPath: string;
    mirrorPaths?: string[];
    lockPath: string;
    envelope: ProtocolEnvelopeDraft;
    now?: Date;
  }) => Promise<CommitFinalizationAppendResult>;
}): Promise<CommitFinalizationAppendResult> {
  const envelopeRefs = normalizeStringList([
    ...input.refs,
    input.context.donePackagePath
  ]);
  const lockPath = join(
    input.context.bubblePaths.locksDir,
    `${input.context.bubbleId}.lock`
  );
  return input.appendProtocolEnvelope({
    transcriptPath: input.context.bubblePaths.transcriptPath,
    lockPath,
    now: input.now,
    envelope: {
      bubble_id: input.context.bubbleId,
      sender: "orchestrator",
      recipient: "human",
      type: "DONE_PACKAGE",
      round: input.context.round,
      payload: {
        summary: input.donePackageSummary,
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

export async function persistCommittedThenDoneStateMutation(input: {
  context: {
    statePath: string;
    state: BubbleStateSnapshot;
    loadedState: CommitFinalizationLoadedState;
  };
  nowIso: string;
  appended: CommitFinalizationAppendResult;
  commitSha: string;
  writeStateSnapshot: (
    statePath: string,
    state: BubbleStateSnapshot,
    options?: {
      expectedFingerprint?: string;
      expectedState?: BubbleStateSnapshot["state"];
    }
  ) => Promise<CommitFinalizationLoadedState>;
}): Promise<CommitFinalizationLoadedState> {
  const committed = applyStateTransition(input.context.state, {
    to: "COMMITTED",
    lastCommandAt: input.nowIso
  });
  const committedWritten = await input.writeStateSnapshot(
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
    return await input.writeStateSnapshot(input.context.statePath, done, {
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
