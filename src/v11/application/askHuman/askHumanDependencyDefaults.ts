import { applyStateTransition } from "../../domain/state/machine.js";
import {
  appendProtocolEnvelope,
  writeStateSnapshot
} from "../start/startCommandDependencyDefaults.js";
export const askHumanExecutionDependencyDefaults = {
  appendProtocolEnvelope,
  writeStateSnapshot,
  applyStateTransition
} as const;
