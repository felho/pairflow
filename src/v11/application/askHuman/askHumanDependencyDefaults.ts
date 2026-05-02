import { applyStateTransition } from "../../domain/state/machine.js";
import { appendProtocolEnvelope } from "../../shared/transcript/transcriptDependencyDefaults.js";
import { writeStateSnapshot } from "../../shared/state/stateStoreDefaults.js";
export const askHumanExecutionDependencyDefaults = {
  appendProtocolEnvelope,
  writeStateSnapshot,
  applyStateTransition
} as const;
