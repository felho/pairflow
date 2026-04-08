import type { AppendProtocolEnvelopeResult } from "../ports/transcript.js";
import type { LoadedStateSnapshot } from "../ports/stateSnapshots.js";
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
