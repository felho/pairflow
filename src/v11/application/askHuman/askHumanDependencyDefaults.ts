import { applyStateTransition } from "../../domain/state/machine.js";
import { appendProtocolEnvelope } from "../transcript/transcriptDependencyDefaults.js";
import { writeStateSnapshot } from "../start/startCommandDependencyDefaults.js";
export const askHumanExecutionDependencyDefaults = {
  appendProtocolEnvelope,
  writeStateSnapshot,
  applyStateTransition
} as const;
