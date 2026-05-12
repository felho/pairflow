import type { BubbleStateSnapshot, BubbleStateWaitingHuman } from "../../domain/state/snapshot/bubbleStateSnapshot.js";

// ReplyWaitingHumanState is the narrowed variant produced by
// ensureReplyWaitingHumanState. Structurally identical to
// BubbleStateWaitingHuman (lifecycle WAITING_HUMAN + active_*).
export type ReplyWaitingHumanState = BubbleStateWaitingHuman;

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

  // Defense-in-depth runtime check: the BubbleStateWaitingHuman variant
  // pins active_agent / active_role / active_since to non-null at the type
  // level (post-parser invariant). The variant builder uses `as` casts that
  // do not fully validate the persisted input shape, so the runtime guard
  // remains useful against malformed persisted input that the current
  // parser is too lenient about. Step 4b-γ should tighten the parser so
  // this guard becomes provably dead; until then it is intentional defense.
  const activeAgentLoose: unknown = state.active_agent;
  const activeRoleLoose: unknown = state.active_role;
  const activeSinceLoose: unknown = state.active_since;
  if (
    activeAgentLoose === null
    || activeRoleLoose === null
    || activeSinceLoose === null
  ) {
    raiseWaitingHumanStateError(
      createError,
      REPLY_WAITING_HUMAN_CONTEXT_INCOMPLETE,
      "WAITING_HUMAN state is missing active agent context; cannot resume RUNNING after reply.",
      {
        has_active_agent: activeAgentLoose !== null,
        has_active_role: activeRoleLoose !== null,
        has_active_since: activeSinceLoose !== null
      }
    );
  }

  return state;
}
