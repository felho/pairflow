import type { LoadedStateSnapshot } from "../../../core/state/stateStore.js";
import {
  buildAskHumanLockPath,
  buildAskHumanStateWriteFailureMessage
} from "../../shared/askHuman/askHumanExecutionArtifacts.js";
import {
  buildAskHumanAppendEnvelopeInput,
  buildAskHumanWriteSnapshotCallInput
} from "../../shared/askHuman/askHumanExecutionCallInputBuilders.js";
import type {
  ExecuteAskHumanExecutionDependencies,
  ExecuteAskHumanExecutionInput,
  ExecuteAskHumanExecutionResult
} from "../../shared/askHuman/askHumanFlowContract.js";
import { resolveAskHumanExecutionDependencies } from "../../shared/askHuman/askHumanExecutionDependencyResolution.js";
import { buildAskHumanExecutionDependencyResolutionInput } from "../../shared/askHuman/askHumanExecutionDependencyResolutionInputBuilder.js";
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
    buildAskHumanExecutionDependencyResolutionInput(dependencies)
  );

  const lockPath = buildAskHumanLockPath(input);

  const appended = await resolvedDependencies.appendEnvelope(
    buildAskHumanAppendEnvelopeInput(input, lockPath)
  );

  const nextState = resolvedDependencies.applyTransition(input.routing.state, {
    to: "WAITING_HUMAN",
    lastCommandAt: input.routing.nowIso
  });

  let written: LoadedStateSnapshot;
  try {
    const writeSnapshotInput = buildAskHumanWriteSnapshotCallInput(
      input,
      nextState
    );
    written = await resolvedDependencies.writeSnapshot(
      writeSnapshotInput.statePath,
      writeSnapshotInput.state,
      writeSnapshotInput.options
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
