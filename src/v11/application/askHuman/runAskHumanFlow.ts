import { join } from "node:path";

import {
  appendProtocolEnvelope,
  type AppendProtocolEnvelopeResult
} from "../../../core/protocol/transcriptStore.js";
import { writeStateSnapshot, type LoadedStateSnapshot } from "../../../core/state/stateStore.js";
import { applyStateTransition } from "../../../core/state/machine.js";
import { emitBubbleNotification } from "../../../core/runtime/notifications.js";
import {
  emitTmuxDeliveryNotification,
  resolveDeliveryMessageRef
} from "../../../core/runtime/tmuxDelivery.js";
import { emitBubbleLifecycleEventBestEffort } from "../../../core/metrics/bubbleEvents.js";
import type { BubbleStateSnapshot } from "../../../types/bubble.js";
import type { ProtocolEnvelope } from "../../../types/protocol.js";
import type { AskHumanRoutingContext } from "../../shared/askHuman/askHumanRoutingContext.js";

export interface RunAskHumanFlowInput {
  now: Date;
  routing: AskHumanRoutingContext;
  createError: (message: string) => Error;
}

export interface RunAskHumanFlowResult {
  bubbleId: string;
  sequence: number;
  envelope: ProtocolEnvelope;
  state: BubbleStateSnapshot;
  inferredRecipient: "human";
}

export interface RunAskHumanFlowDependencies {
  appendProtocolEnvelope?: typeof appendProtocolEnvelope;
  writeStateSnapshot?: typeof writeStateSnapshot;
  applyStateTransition?: typeof applyStateTransition;
  emitTmuxDeliveryNotification?: typeof emitTmuxDeliveryNotification;
  emitBubbleNotification?: typeof emitBubbleNotification;
  resolveDeliveryMessageRef?: typeof resolveDeliveryMessageRef;
  emitBubbleLifecycleEventBestEffort?: typeof emitBubbleLifecycleEventBestEffort;
}

function buildStateWriteFailureMessage(
  appendResult: AppendProtocolEnvelopeResult,
  error: unknown
): string {
  const reason = error instanceof Error ? error.message : String(error);
  return `HUMAN_QUESTION ${appendResult.envelope.id} was appended but state update failed. Transcript remains canonical; recover state from transcript tail. Root error: ${reason}`;
}

export async function runAskHumanFlow(
  input: RunAskHumanFlowInput,
  dependencies: RunAskHumanFlowDependencies = {}
): Promise<RunAskHumanFlowResult> {
  const appendProtocolEnvelopeFn =
    dependencies.appendProtocolEnvelope ?? appendProtocolEnvelope;
  const writeStateSnapshotFn =
    dependencies.writeStateSnapshot ?? writeStateSnapshot;
  const applyStateTransitionFn =
    dependencies.applyStateTransition ?? applyStateTransition;
  const emitTmuxDeliveryNotificationFn =
    dependencies.emitTmuxDeliveryNotification ?? emitTmuxDeliveryNotification;
  const emitBubbleNotificationFn =
    dependencies.emitBubbleNotification ?? emitBubbleNotification;
  const resolveDeliveryMessageRefFn =
    dependencies.resolveDeliveryMessageRef ?? resolveDeliveryMessageRef;
  const emitBubbleLifecycleEventBestEffortFn =
    dependencies.emitBubbleLifecycleEventBestEffort ?? emitBubbleLifecycleEventBestEffort;

  const lockPath = join(
    input.routing.resolved.bubblePaths.locksDir,
    `${input.routing.resolved.bubbleId}.lock`
  );

  const appended = await appendProtocolEnvelopeFn({
    transcriptPath: input.routing.resolved.bubblePaths.transcriptPath,
    mirrorPaths: [input.routing.resolved.bubblePaths.inboxPath],
    lockPath,
    now: input.now,
    envelope: {
      bubble_id: input.routing.resolved.bubbleId,
      sender: input.routing.state.active_agent,
      recipient: "human",
      type: "HUMAN_QUESTION",
      round: input.routing.state.round,
      payload: {
        question: input.routing.question
      },
      refs: input.routing.refs
    }
  });

  const nextState = applyStateTransitionFn(input.routing.state, {
    to: "WAITING_HUMAN",
    lastCommandAt: input.routing.nowIso
  });

  let written: LoadedStateSnapshot;
  try {
    written = await writeStateSnapshotFn(
      input.routing.resolved.bubblePaths.statePath,
      nextState,
      {
        expectedFingerprint: input.routing.loadedState.fingerprint,
        expectedState: "RUNNING"
      }
    );
  } catch (error) {
    throw input.createError(buildStateWriteFailureMessage(appended, error));
  }

  const messageRef = resolveDeliveryMessageRefFn({
    bubbleId: input.routing.resolved.bubbleId,
    sessionsPath: input.routing.resolved.bubblePaths.sessionsPath,
    envelope: appended.envelope
  });

  // Optional UX signal; never block protocol/state progression on notification failure.
  void emitTmuxDeliveryNotificationFn({
    bubbleId: input.routing.resolved.bubbleId,
    bubbleConfig: input.routing.resolved.bubbleConfig,
    sessionsPath: input.routing.resolved.bubblePaths.sessionsPath,
    envelope: appended.envelope,
    messageRef
  });

  // Optional UX signal; never block protocol/state progression on notification failure.
  void emitBubbleNotificationFn(input.routing.resolved.bubbleConfig, "waiting-human");

  await emitBubbleLifecycleEventBestEffortFn({
    repoPath: input.routing.resolved.repoPath,
    bubbleId: input.routing.resolved.bubbleId,
    bubbleInstanceId: input.routing.bubbleIdentity.bubbleInstanceId,
    eventType: "bubble_asked_human",
    round: input.routing.state.round,
    actorRole: input.routing.state.active_role,
    metadata: {
      sender: input.routing.state.active_agent,
      refs_count: input.routing.refs.length,
      question_length: Array.from(input.routing.question).length
    },
    now: input.now
  });

  return {
    bubbleId: input.routing.resolved.bubbleId,
    sequence: appended.sequence,
    envelope: appended.envelope,
    state: written.state,
    inferredRecipient: "human"
  };
}
