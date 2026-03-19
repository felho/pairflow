import type {
  AgentName,
  AgentRole,
  BubbleStateSnapshot
} from "../../../types/bubble.js";

export type ReplyWaitingHumanState = BubbleStateSnapshot & {
  state: "WAITING_HUMAN";
  active_agent: AgentName;
  active_role: AgentRole;
  active_since: string;
};

export interface EnsureReplyWaitingHumanStateInput {
  state: BubbleStateSnapshot;
  createError: (message: string) => Error;
}

function raiseWaitingHumanStateError(
  createError: (message: string) => Error,
  message: string
): never {
  throw createError(message);
}

export function ensureReplyWaitingHumanState(
  input: EnsureReplyWaitingHumanStateInput
): ReplyWaitingHumanState {
  const { state, createError } = input;

  if (state.state !== "WAITING_HUMAN") {
    raiseWaitingHumanStateError(
      createError,
      `bubble reply can only be used while bubble is WAITING_HUMAN (current: ${state.state}).`
    );
  }

  if (state.round < 1) {
    raiseWaitingHumanStateError(
      createError,
      `WAITING_HUMAN state must have round >= 1 (found ${state.round}).`
    );
  }

  if (state.active_agent === null || state.active_role === null || state.active_since === null) {
    raiseWaitingHumanStateError(
      createError,
      "WAITING_HUMAN state is missing active agent context; cannot resume RUNNING after reply."
    );
  }

  return state as ReplyWaitingHumanState;
}
