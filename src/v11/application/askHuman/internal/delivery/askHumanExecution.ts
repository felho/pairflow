import { join } from "node:path";

import type { LoadedDomainStateSnapshot } from "../../../../ports/stateSnapshots.js";
import type { AppendProtocolEnvelopeResult } from "../../../../ports/transcript.js";
import type {
  ExecuteAskHumanExecutionDependencies,
  ExecuteAskHumanExecutionInput,
  ExecuteAskHumanExecutionResult
} from "../mutation/askHumanFlowContract.js";
import { applyStateTransition } from "../../../../domain/state/machine.js";
import { adaptPersistedWritePortToDomain } from "../../../../shared/mutation/mutationBoundaryIO.js";
import {
  appendProtocolEnvelope,
  writeStateSnapshot
} from "../../../start/startCommandDependencyDefaults.js";
export type {
  ExecuteAskHumanExecutionDependencies,
  ExecuteAskHumanExecutionInput,
  ExecuteAskHumanExecutionResult
};

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
  const appendEnvelope =
    dependencies.appendProtocolEnvelope ?? appendProtocolEnvelope;
  const writeSnapshot =
    dependencies.writeStateSnapshot
    ?? adaptPersistedWritePortToDomain(writeStateSnapshot);
  const applyTransition =
    dependencies.applyStateTransition ?? applyStateTransition;

  const lockPath = join(
    input.routing.resolved.bubblePaths.locksDir,
    `${input.routing.resolved.bubbleId}.lock`
  );

  const appended = await appendEnvelope({
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

  const nextState = applyTransition(input.routing.state, {
    to: "WAITING_HUMAN",
    lastCommandAt: input.routing.nowIso
  });

  let written: LoadedDomainStateSnapshot;
  try {
    written = await writeSnapshot(
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
