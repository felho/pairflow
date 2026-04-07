import { appendProtocolEnvelope } from "../../../core/protocol/transcriptStore.js";
import { writeStateSnapshot } from "../../../core/state/stateStore.js";
import { applyStateTransition } from "../../domain/state/machine.js";

export const askHumanExecutionDependencyDefaults = {
  appendProtocolEnvelope,
  writeStateSnapshot,
  applyStateTransition
} as const;
