import { join } from "node:path";

import {
  type appendProtocolEnvelope,
  type AppendProtocolEnvelopeResult
} from "../../../core/protocol/transcriptStore.js";
import { type writeStateSnapshot, type LoadedStateSnapshot } from "../../../core/state/stateStore.js";
import type { applyStateTransition } from "../../../core/state/machine.js";
import { resolveAskHumanExecutionDependencies } from "../../shared/askHuman/askHumanExecutionDependencyResolution.js";
import type { AskHumanRoutingContext } from "../../shared/askHuman/askHumanRoutingContext.js";

export interface ExecuteAskHumanExecutionInput {
  now: Date;
  routing: AskHumanRoutingContext;
  createError: (message: string) => Error;
}

export interface ExecuteAskHumanExecutionResult {
  appended: AppendProtocolEnvelopeResult;
  written: LoadedStateSnapshot;
}

export interface ExecuteAskHumanExecutionDependencies {
  appendProtocolEnvelope?: typeof appendProtocolEnvelope;
  writeStateSnapshot?: typeof writeStateSnapshot;
  applyStateTransition?: typeof applyStateTransition;
}

function buildAskHumanLockPath(input: ExecuteAskHumanExecutionInput): string {
  return join(
    input.routing.resolved.bubblePaths.locksDir,
    `${input.routing.resolved.bubbleId}.lock`
  );
}

function buildAskHumanEnvelope(input: ExecuteAskHumanExecutionInput) {
  return {
    bubble_id: input.routing.resolved.bubbleId,
    sender: input.routing.state.active_agent,
    recipient: "human" as const,
    type: "HUMAN_QUESTION" as const,
    round: input.routing.state.round,
    payload: {
      question: input.routing.question
    },
    refs: input.routing.refs
  };
}

function buildStateWriteFailureMessage(
  appendResult: AppendProtocolEnvelopeResult,
  error: unknown
): string {
  const reason = error instanceof Error ? error.message : String(error);
  return `HUMAN_QUESTION ${appendResult.envelope.id} was appended but state update failed. Transcript remains canonical; recover state from transcript tail. Root error: ${reason}`;
}

export async function executeAskHumanExecution(
  input: ExecuteAskHumanExecutionInput,
  dependencies: ExecuteAskHumanExecutionDependencies = {}
): Promise<ExecuteAskHumanExecutionResult> {
  const resolvedDependencies = resolveAskHumanExecutionDependencies({
    appendProtocolEnvelope: dependencies.appendProtocolEnvelope,
    writeStateSnapshot: dependencies.writeStateSnapshot,
    applyStateTransition: dependencies.applyStateTransition
  });

  const lockPath = buildAskHumanLockPath(input);

  const appended = await resolvedDependencies.appendEnvelope({
    transcriptPath: input.routing.resolved.bubblePaths.transcriptPath,
    mirrorPaths: [input.routing.resolved.bubblePaths.inboxPath],
    lockPath,
    now: input.now,
    envelope: buildAskHumanEnvelope(input)
  });

  const nextState = resolvedDependencies.applyTransition(input.routing.state, {
    to: "WAITING_HUMAN",
    lastCommandAt: input.routing.nowIso
  });

  let written: LoadedStateSnapshot;
  try {
    written = await resolvedDependencies.writeSnapshot(
      input.routing.resolved.bubblePaths.statePath,
      nextState,
      {
        expectedFingerprint: input.routing.loadedState.fingerprint,
        expectedState: "RUNNING"
      }
    );
  } catch (error) {
    // reason_code=ASK_HUMAN_STATE_PERSIST_FAILED context=transcript_appended_state_write_failed
    throw input.createError(buildStateWriteFailureMessage(appended, error));
  }

  return {
    appended,
    written
  };
}
