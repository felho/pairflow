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
  createError: PairflowCreateCommandError;
}

function raiseWaitingHumanStateError(
  createError: PairflowCreateCommandError,
  reasonCode: string,
  message: string,
  context: PairflowCommandErrorContext
): never {
  throw createError({
    reasonCode,
    message,
    context: {
      command_name: "reply",
      ...context
    }
  });
}

const REPLY_WAITING_HUMAN_STATE_REQUIRED =
  "REPLY_WAITING_HUMAN_STATE_REQUIRED";
const REPLY_WAITING_HUMAN_ROUND_INVALID =
  "REPLY_WAITING_HUMAN_ROUND_INVALID";
const REPLY_WAITING_HUMAN_CONTEXT_INCOMPLETE =
  "REPLY_WAITING_HUMAN_CONTEXT_INCOMPLETE";

export function ensureReplyWaitingHumanState(
  input: EnsureReplyWaitingHumanStateInput
): ReplyWaitingHumanState {
  const { state, createError } = input;

  if (state.state !== "WAITING_HUMAN") {
    raiseWaitingHumanStateError(
      createError,
      REPLY_WAITING_HUMAN_STATE_REQUIRED,
      `bubble reply can only be used while bubble is WAITING_HUMAN (current: ${state.state}).`,
      {
        current_state: state.state
      }
    );
  }

  if (state.round < 1) {
    raiseWaitingHumanStateError(
      createError,
      REPLY_WAITING_HUMAN_ROUND_INVALID,
      `WAITING_HUMAN state must have round >= 1 (found ${state.round}).`,
      {
        state: state.state,
        round: state.round
      }
    );
  }

  if (state.active_agent === null || state.active_role === null || state.active_since === null) {
    raiseWaitingHumanStateError(
      createError,
      REPLY_WAITING_HUMAN_CONTEXT_INCOMPLETE,
      "WAITING_HUMAN state is missing active agent context; cannot resume RUNNING after reply.",
      {
        has_active_agent: state.active_agent !== null,
        has_active_role: state.active_role !== null,
        has_active_since: state.active_since !== null
      }
    );
  }

  return state as ReplyWaitingHumanState;
}
