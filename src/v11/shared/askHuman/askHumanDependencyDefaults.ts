import { applyStateTransition } from "../../domain/state/machine.js";
import { appendProtocolEnvelope } from "../transcript/transcriptDependencyDefaults.js";
import { writeStateSnapshot } from "../state/stateStoreDefaults.js";
export const askHumanExecutionDependencyDefaults = {
  appendProtocolEnvelope,
  writeStateSnapshot,
  applyStateTransition
} as const;
