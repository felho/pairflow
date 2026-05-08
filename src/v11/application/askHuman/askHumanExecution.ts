import { join } from "node:path";

import type { LoadedStateSnapshot } from "../../ports/stateSnapshots.js";
import type { AppendProtocolEnvelopeResult } from "../../ports/transcript.js";
import type {
  ExecuteAskHumanExecutionDependencies,
  ExecuteAskHumanExecutionInput,
  ExecuteAskHumanExecutionResult
} from "./askHumanFlowContract.js";
import { resolveAskHumanExecutionDependencies } from "./askHumanExecutionDependencyResolution.js";
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
  const resolvedDependencies = resolveAskHumanExecutionDependencies(
    dependencies
  );

  const lockPath = join(
    input.routing.resolved.bubblePaths.locksDir,
    `${input.routing.resolved.bubbleId}.lock`
  );

  const appended = await resolvedDependencies.appendEnvelope({
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
