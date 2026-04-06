import type { AppendProtocolEnvelopeResult } from "../../../v11/infrastructure/artifact/transcript/transcriptStore.js";
import type { LoadedStateSnapshot } from "../../infrastructure/state/stateStore.js";
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
