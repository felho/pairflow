import { join } from "node:path";

import { buildRunningExecutionContext } from "../state/executionContext.js";
import type { BubblePaths } from "../bubble/bubblePaths.js";
import { applyStateTransition } from "../../domain/state/machine.js";
import { buildHumanReplyEnvelopeDraft } from "../../domain/reply/replyEnvelopeDraft.js";
import {
  raiseReplyPostAppendStateWriteFailed
} from "../../domain/reply/postAppendStateWriteFailure.js";
import type { ResolvedReplyCommandDependencies } from "./replyCommandDependencyResolution.js";
import type { ReplyWaitingHumanState } from "../../domain/reply/waitingHumanStateGuard.js";
import type {
  BubbleConfig,
  BubbleLifecycleState,
  BubbleStateSnapshot
} from "../../../types/bubble.js";
import type { ProtocolEnvelope, ProtocolEnvelopeDraft } from "../../../types/protocol.js";

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
  dependencies: Pick<
    ResolvedReplyCommandDependencies,
    "appendProtocolEnvelope" | "writeStateSnapshot"
  >;
  createError: PairflowCreateCommandError;
}

export interface ExecuteReplyMutationResult {
  appended: Pick<ReplyAppendProtocolEnvelopeResult, "envelope" | "sequence">;
  written: ReplyLoadedStateSnapshot;
}

export async function executeReplyMutation(
  input: ExecuteReplyMutationInput
): Promise<ExecuteReplyMutationResult> {
  const lockPath = join(
    input.resolved.bubblePaths.locksDir,
    `${input.resolved.bubbleId}.lock`
  );

  const appended = await input.dependencies.appendProtocolEnvelope({
    transcriptPath: input.resolved.bubblePaths.transcriptPath,
    mirrorPaths: [input.resolved.bubblePaths.inboxPath],
    lockPath,
    now: input.now,
    envelope: buildHumanReplyEnvelopeDraft({
      bubbleId: input.resolved.bubbleId,
      recipient: input.state.active_agent,
      recipientRole: input.state.active_role,
      round: input.state.round,
      message: input.message,
      refs: input.refs
    })
  });

  const nextState = applyStateTransition(input.state, {
    to: "RUNNING",
    executionContext: buildRunningExecutionContext({
      bubbleId: input.resolved.bubbleId,
      round: input.state.round,
      activeRole: input.state.active_role,
      startedAt: input.nowIso,
      watchdogTimeoutMinutes: input.resolved.bubbleConfig.watchdog_timeout_minutes
    }),
    activeSince: input.nowIso,
    lastCommandAt: input.nowIso
  });

  try {
    const written = await input.dependencies.writeStateSnapshot(
      input.resolved.bubblePaths.statePath,
      nextState,
      {
        expectedFingerprint: input.loadedState.fingerprint,
        expectedState: "WAITING_HUMAN"
      }
    );
    return {
      appended: {
        envelope: appended.envelope,
        sequence: appended.sequence
      },
      written
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    raiseReplyPostAppendStateWriteFailed({
      envelopeId: appended.envelope.id,
      reason,
      createError: input.createError
    });
  }
}
