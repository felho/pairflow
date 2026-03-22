import type { AppendProtocolEnvelopeResult } from "../../../core/protocol/transcriptStore.js";
import type { LoadedStateSnapshot } from "../../../core/state/stateStore.js";
import type { AskHumanRoutingContext } from "./askHumanRoutingContext.js";

export interface BuildAskHumanExecutionStepInput {
  now: Date;
  routing: AskHumanRoutingContext;
  createError: PairflowCreateCommandError;
}

export interface BuildAskHumanFinalizationStepInput {
  now: Date;
  routing: AskHumanRoutingContext;
  appended: AppendProtocolEnvelopeResult;
  written: LoadedStateSnapshot;
}
