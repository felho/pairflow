import { appendProtocolEnvelope } from "../../../v11/infrastructure/artifact/transcript/transcriptStore.js";
import { writeStateSnapshot } from "../../infrastructure/state/stateStore.js";
import { applyStateTransition } from "../../domain/state/machine.js";

export const askHumanExecutionDependencyDefaults = {
  appendProtocolEnvelope,
  writeStateSnapshot,
  applyStateTransition
} as const;
