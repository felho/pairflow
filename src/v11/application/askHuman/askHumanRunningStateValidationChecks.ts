import type { BubbleStateSnapshot } from "../../shared/state/bubbleStateSnapshotTypes.js";

const askHumanStateNotRunningReasonCode = "ASK_HUMAN_STATE_NOT_RUNNING";
const askHumanRunningRoundInvalidReasonCode = "ASK_HUMAN_RUNNING_ROUND_INVALID";
const askHumanActiveContextMissingReasonCode = "ASK_HUMAN_ACTIVE_CONTEXT_MISSING";
const askHumanRoleUnsupportedReasonCode = "ASK_HUMAN_ROLE_UNSUPPORTED";

function assertRunningLifecycleState(
  state: BubbleStateSnapshot,
  createError: PairflowCreateCommandError
): void {
  if (state.state !== "RUNNING") {
    throw createError({
      reasonCode: askHumanStateNotRunningReasonCode,
      message: `ask-human can only be used while bubble is RUNNING (current: ${state.state}).`,
      context: {
        guard: "routing_precondition",
        current_state: state.state
      }
    });
  }
}

function assertRunningRound(
  state: BubbleStateSnapshot,
  createError: PairflowCreateCommandError
): void {
  if (state.round < 1) {
    throw createError({
      reasonCode: askHumanRunningRoundInvalidReasonCode,
      message: `RUNNING state must have round >= 1 (found ${state.round}).`,
      context: {
        guard: "routing_precondition",
        round: state.round
      }
    });
  }
}

function assertRunningActiveContext(
  state: BubbleStateSnapshot,
  createError: PairflowCreateCommandError
): void {
  if (
    state.active_agent === null
    || state.active_role === null
    || state.active_since === null
  ) {
    throw createError({
      reasonCode: askHumanActiveContextMissingReasonCode,
      message: "RUNNING state is missing active agent context; cannot emit HUMAN_QUESTION.",
      context: {
        guard: "routing_precondition"
      }
    });
  }
}

function assertRunningRoleAllowed(
  state: BubbleStateSnapshot,
  createError: PairflowCreateCommandError
): void {
  if (state.active_role === "meta_reviewer") {
    throw createError({
      reasonCode: askHumanRoleUnsupportedReasonCode,
      message: "ask-human cannot be used from meta_reviewer role while bubble is RUNNING.",
      context: {
        guard: "routing_precondition",
        active_role: state.active_role
      }
    });
  }
}

export function runAskHumanRunningStateValidationChecks(
  state: BubbleStateSnapshot,
  createError: PairflowCreateCommandError
): void {
  assertRunningLifecycleState(state, createError);
  assertRunningRound(state, createError);
  assertRunningActiveContext(state, createError);
  assertRunningRoleAllowed(state, createError);
}
