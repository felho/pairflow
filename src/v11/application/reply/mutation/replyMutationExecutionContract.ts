import type { BubblePaths } from "../../../shared/bubble/bubblePaths.js";
import type { ReplyWaitingHumanState } from "../../../domain/reply/waitingHumanStateGuard.js";
import type { BubbleConfig } from "../../../shared/config/bubbleConfigTypes.js";
import type { BubbleLifecycleState } from "../../../../contracts/kernel/lifecycle.js";
import type { BubbleStateSnapshot } from "../../../domain/state/snapshot/bubbleStateSnapshot.js";
import type {
  ProtocolEnvelope,
  ProtocolEnvelopeDraft
} from "../../../../types/protocol.js";

export interface ReplyResolvedBubble {
  bubbleId: string;
  bubbleConfig: BubbleConfig;
  bubblePaths: BubblePaths;
  repoPath: string;
}

export interface ReplyLoadedStateSnapshot {
  state: BubbleStateSnapshot;
  fingerprint: string;
}

export interface ReplyAppendProtocolEnvelopeInput {
  transcriptPath: string;
  mirrorPaths?: string[];
  lockPath: string;
  envelope: ProtocolEnvelopeDraft;
  now?: Date;
}

export interface ReplyAppendProtocolEnvelopeResult {
  envelope: ProtocolEnvelope;
  sequence: number;
}

export interface ReplyWriteStateSnapshotOptions {
  expectedFingerprint?: string;
  expectedState?: BubbleLifecycleState;
}

export interface ExecuteReplyMutationInput {
  resolved: ReplyResolvedBubble;
  loadedState: ReplyLoadedStateSnapshot;
  state: ReplyWaitingHumanState;
  message: string;
  refs: string[];
  now: Date;
  nowIso: string;
  dependencies: {
    appendProtocolEnvelope: (
      input: ReplyAppendProtocolEnvelopeInput
    ) => Promise<ReplyAppendProtocolEnvelopeResult>;
    writeStateSnapshot: (
      statePath: string,
      state: BubbleStateSnapshot,
      options?: ReplyWriteStateSnapshotOptions
    ) => Promise<ReplyLoadedStateSnapshot>;
  };
  createError: PairflowCreateCommandError;
}

export interface ExecuteReplyMutationResult {
  appended: Pick<ReplyAppendProtocolEnvelopeResult, "envelope" | "sequence">;
  written: ReplyLoadedStateSnapshot;
}
