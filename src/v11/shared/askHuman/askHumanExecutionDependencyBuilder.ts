import type {
  appendProtocolEnvelope
} from "../../../core/protocol/transcriptStore.js";
import type {
  writeStateSnapshot
} from "../../../core/state/stateStore.js";
import type {
  applyStateTransition
} from "../../../core/state/machine.js";

export interface AskHumanExecutionDependencySource {
  appendProtocolEnvelope?: typeof appendProtocolEnvelope;
  writeStateSnapshot?: typeof writeStateSnapshot;
  applyStateTransition?: typeof applyStateTransition;
}

export interface AskHumanExecutionDependencies {
  appendProtocolEnvelope?: typeof appendProtocolEnvelope;
  writeStateSnapshot?: typeof writeStateSnapshot;
  applyStateTransition?: typeof applyStateTransition;
}

export function buildAskHumanExecutionDependencies(
  dependencies: AskHumanExecutionDependencySource
): AskHumanExecutionDependencies {
  return {
    ...(dependencies.appendProtocolEnvelope !== undefined
      ? { appendProtocolEnvelope: dependencies.appendProtocolEnvelope }
      : {}),
    ...(dependencies.writeStateSnapshot !== undefined
      ? { writeStateSnapshot: dependencies.writeStateSnapshot }
      : {}),
    ...(dependencies.applyStateTransition !== undefined
      ? { applyStateTransition: dependencies.applyStateTransition }
      : {})
  };
}
