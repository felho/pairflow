import type { BubbleStateSnapshot } from "../../../types/bubble.js";
import type { AskHumanRunningState } from "./askHumanRoutingContext.js";

function assertRunningLifecycleState(
  state: BubbleStateSnapshot,
  createError: (message: string) => Error
): void {
  if (state.state !== "RUNNING") {
    // reason_code=ASK_HUMAN_STATE_NOT_RUNNING context=routing_precondition
    throw createError(
      `ask-human can only be used while bubble is RUNNING (current: ${state.state}).`
    );
  }
}

function assertRunningRound(
  state: BubbleStateSnapshot,
  createError: (message: string) => Error
): void {
  if (state.round < 1) {
    // reason_code=ASK_HUMAN_RUNNING_ROUND_INVALID context=routing_precondition
    throw createError(
      `RUNNING state must have round >= 1 (found ${state.round}).`
    );
  }
}

function assertRunningActiveContext(
  state: BubbleStateSnapshot,
  createError: (message: string) => Error
): void {
  if (
    state.active_agent === null
    || state.active_role === null
    || state.active_since === null
  ) {
    // reason_code=ASK_HUMAN_ACTIVE_CONTEXT_MISSING context=routing_precondition
    throw createError(
      "RUNNING state is missing active agent context; cannot emit HUMAN_QUESTION."
    );
  }
}

function assertRunningRoleAllowed(
  state: BubbleStateSnapshot,
  createError: (message: string) => Error
): void {
  if (state.active_role === "meta_reviewer") {
    // reason_code=ASK_HUMAN_ROLE_UNSUPPORTED context=routing_precondition
    throw createError(
      "ask-human cannot be used from meta_reviewer role while bubble is RUNNING."
    );
  }
}

export function assertAskHumanRunningState(
  state: BubbleStateSnapshot,
  createError: (message: string) => Error
): asserts state is AskHumanRunningState {
  assertRunningLifecycleState(state, createError);
  assertRunningRound(state, createError);
  assertRunningActiveContext(state, createError);
  assertRunningRoleAllowed(state, createError);
}
