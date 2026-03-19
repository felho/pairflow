import type { LoadedStateSnapshot } from "../../../core/state/stateStore.js";
import {
  buildAskHumanEnvelope,
  buildAskHumanLockPath,
  buildAskHumanStateWriteFailureMessage
} from "../../shared/askHuman/askHumanExecutionArtifacts.js";
import type {
  ExecuteAskHumanExecutionDependencies,
  ExecuteAskHumanExecutionInput,
  ExecuteAskHumanExecutionResult
} from "../../shared/askHuman/askHumanFlowContract.js";
import { resolveAskHumanExecutionDependencies } from "../../shared/askHuman/askHumanExecutionDependencyResolution.js";
export type {
  ExecuteAskHumanExecutionDependencies,
  ExecuteAskHumanExecutionInput,
  ExecuteAskHumanExecutionResult
};

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
    throw input.createError(buildAskHumanStateWriteFailureMessage(appended, error));
  }

  return {
    appended,
    written
  };
}
