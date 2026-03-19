import type {
  AgentName,
  BubbleStateSnapshot,
  RoundRoleHistoryEntry
} from "../../../types/bubble.js";

export interface ResolvedPassHandoff {
  senderAgent: AgentName;
  senderRole: "implementer" | "reviewer";
  recipientAgent: AgentName;
  recipientRole: "implementer" | "reviewer";
  envelopeRound: number;
  nextRound: number;
  appendRoundRoleEntry?: RoundRoleHistoryEntry;
}

export interface ResolvePassHandoffInput {
  state: BubbleStateSnapshot;
  implementer: AgentName;
  reviewer: AgentName;
  nowIso: string;
  createError: (message: string) => Error;
}

function raiseResolutionError(
  createError: (message: string) => Error,
  message: string
): never {
  // reason_code=PASS_HANDOFF_RESOLUTION_ERROR context=handoff_resolution_input
  throw createError(message);
}

export function resolvePassHandoff(input: ResolvePassHandoffInput): ResolvedPassHandoff {
  const { state, implementer, reviewer, nowIso, createError } = input;

  if (state.state !== "RUNNING") {
    raiseResolutionError(
      createError,
      `PASS can only be used while bubble is RUNNING (current: ${state.state}).`
    );
  }

  if (state.active_agent === null || state.active_role === null) {
    raiseResolutionError(
      createError,
      "RUNNING state is missing active agent/role; cannot resolve PASS sender."
    );
  }

  if (state.active_role === "implementer" && state.active_agent !== implementer) {
    raiseResolutionError(
      createError,
      `Active role implementer must map to configured implementer agent (${implementer}).`
    );
  }
  if (state.active_role === "reviewer" && state.active_agent !== reviewer) {
    raiseResolutionError(
      createError,
      `Active role reviewer must map to configured reviewer agent (${reviewer}).`
    );
  }

  if (state.round < 1) {
    raiseResolutionError(
      createError,
      `RUNNING state must have round >= 1 (found ${state.round}).`
    );
  }

  if (state.active_role === "implementer") {
    return {
      senderAgent: implementer,
      senderRole: "implementer",
      recipientAgent: reviewer,
      recipientRole: "reviewer",
      envelopeRound: state.round,
      nextRound: state.round
    };
  }

  if (state.active_role !== "reviewer") {
    raiseResolutionError(
      createError,
      `Unsupported active role for PASS handoff resolution: ${state.active_role}.`
    );
  }

  const nextRound = state.round + 1;
  const hasRoundEntry = state.round_role_history.some((entry) => entry.round === nextRound);

  const base: ResolvedPassHandoff = {
    senderAgent: reviewer,
    senderRole: "reviewer",
    recipientAgent: implementer,
    recipientRole: "implementer",
    envelopeRound: state.round,
    nextRound
  };

  if (hasRoundEntry) {
    return base;
  }

  return {
    ...base,
    appendRoundRoleEntry: {
      round: nextRound,
      implementer,
      reviewer,
      switched_at: nowIso
    }
  };
}
