import type { LoadedStateSnapshot } from "../../ports/stateSnapshots.js";
import { buildAskHumanStateWriteFailureMessage } from "./askHumanExecutionFailureMessageBuilder.js";
import { buildAskHumanLockPath } from "./askHumanLockPathBuilder.js";
import {
  buildAskHumanAppendEnvelopeInput,
  buildAskHumanWriteSnapshotCallInput
} from "./askHumanExecutionCallInputBuilders.js";
import type {
  ExecuteAskHumanExecutionDependencies,
  ExecuteAskHumanExecutionInput,
  ExecuteAskHumanExecutionResult
} from "./askHumanFlowContract.js";
import { resolveAskHumanExecutionDependencies } from "./askHumanExecutionDependencyResolution.js";
import { buildAskHumanExecutionDependencyResolutionInput } from "./askHumanExecutionDependencyResolutionInputBuilder.js";
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
