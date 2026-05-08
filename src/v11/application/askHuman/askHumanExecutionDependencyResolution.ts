import type {
  ResolvedAskHumanExecutionDependencies,
  ResolveAskHumanExecutionDependenciesInput
} from "./askHumanExecutionDependencyResolutionContract.js";
import { applyStateTransition } from "../../domain/state/machine.js";
import {
  appendProtocolEnvelope,
  writeStateSnapshot
} from "../start/startCommandDependencyDefaults.js";

export function resolveAskHumanExecutionDependencies(
  input: ResolveAskHumanExecutionDependenciesInput
): ResolvedAskHumanExecutionDependencies {
  return {
    appendEnvelope:
      input.appendProtocolEnvelope
      ?? appendProtocolEnvelope,
    writeSnapshot:
      input.writeStateSnapshot
      ?? writeStateSnapshot,
    applyTransition:
      input.applyStateTransition
      ?? applyStateTransition
  };
}
