import type {
  BuildAskHumanExecutionStepInput,
  BuildAskHumanFinalizationStepInput
} from "./askHumanFlowStepInputContract.js";

export function buildAskHumanExecutionStepInput(
  input: BuildAskHumanExecutionStepInput
) {
  return {
    now: input.now,
    routing: input.routing,
    createError: input.createError
  };
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
