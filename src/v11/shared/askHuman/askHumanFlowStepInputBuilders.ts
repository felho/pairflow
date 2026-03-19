import type { AppendProtocolEnvelopeResult } from "../../../core/protocol/transcriptStore.js";
import type { LoadedStateSnapshot } from "../../../core/state/stateStore.js";
import type { AskHumanRoutingContext } from "./askHumanRoutingContext.js";

export interface BuildAskHumanExecutionStepInput {
  now: Date;
  routing: AskHumanRoutingContext;
  createError: (message: string) => Error;
}

export function buildAskHumanExecutionStepInput(
  input: BuildAskHumanExecutionStepInput
) {
  return {
    now: input.now,
    routing: input.routing,
    createError: input.createError
  };
}

export interface BuildAskHumanFinalizationStepInput {
  now: Date;
  routing: AskHumanRoutingContext;
  appended: AppendProtocolEnvelopeResult;
  written: LoadedStateSnapshot;
}

export function buildAskHumanFinalizationStepInput(
  input: BuildAskHumanFinalizationStepInput
) {
  return {
    now: input.now,
    routing: input.routing,
    appended: input.appended,
    written: input.written
  };
}
