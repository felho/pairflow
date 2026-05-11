import { join } from "node:path";

import { buildRunningExecutionContext } from "../../../shared/state/executionContext.js";
import { applyStateTransition } from "../../../domain/state/machine.js";
import { buildHumanReplyEnvelopeDraft } from "../../../domain/reply/replyEnvelopeDraft.js";
import {
  raiseReplyPostAppendStateWriteFailed
} from "../../../domain/reply/postAppendStateWriteFailure.js";
import type {
  ExecuteReplyMutationInput,
  ExecuteReplyMutationResult
} from "./replyMutationExecutionContract.js";

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
