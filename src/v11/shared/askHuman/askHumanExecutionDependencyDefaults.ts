import { appendProtocolEnvelope } from "../../../core/protocol/transcriptStore.js";
import { writeStateSnapshot } from "../../../core/state/stateStore.js";
import { applyStateTransition } from "../../../core/state/machine.js";

export const askHumanExecutionDependencyDefaults = {
  appendProtocolEnvelope,
  writeStateSnapshot,
  applyStateTransition
} as const;
