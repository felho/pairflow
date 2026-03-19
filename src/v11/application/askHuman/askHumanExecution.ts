import { join } from "node:path";

import {
  appendProtocolEnvelope,
  type AppendProtocolEnvelopeResult
} from "../../../core/protocol/transcriptStore.js";
import { writeStateSnapshot, type LoadedStateSnapshot } from "../../../core/state/stateStore.js";
import { applyStateTransition } from "../../../core/state/machine.js";
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
  const appendProtocolEnvelopeFn =
    dependencies.appendProtocolEnvelope ?? appendProtocolEnvelope;
  const writeStateSnapshotFn =
    dependencies.writeStateSnapshot ?? writeStateSnapshot;
  const applyStateTransitionFn =
    dependencies.applyStateTransition ?? applyStateTransition;

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
    // reason_code=ASK_HUMAN_STATE_PERSIST_FAILED context=transcript_appended_state_write_failed
    throw input.createError(buildStateWriteFailureMessage(appended, error));
  }

  return {
    appended,
    written
  };
}
