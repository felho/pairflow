import type { LoadedStateSnapshot } from "../../ports/stateSnapshots.js";
import { buildAskHumanStateWriteFailureMessage } from "./askHumanExecutionFailureMessageBuilder.js";
import { buildAskHumanLockPath } from "./askHumanLockPathBuilder.js";
import { buildAskHumanEnvelope } from "./askHumanEnvelopeBuilder.js";
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

export async function executeAskHumanExecution(
  input: ExecuteAskHumanExecutionInput,
  dependencies: ExecuteAskHumanExecutionDependencies = {}
): Promise<ExecuteAskHumanExecutionResult> {
  const resolvedDependencies = resolveAskHumanExecutionDependencies(
    dependencies
  );

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
    throw input.createError(buildAskHumanStateWriteFailureMessage(appended, error));
  }

  return {
    appended,
    written
  };
}
