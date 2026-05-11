import type { AgentName } from "../../../contracts/kernel/agentIdentity.js";
import type {
  BubbleReviewLoopMode
} from "../../shared/reviewPolicy/reviewPolicyTypes.js";
import type { PersistedBubbleStateSnapshot } from "../../domain/state/snapshot/persistedBubbleStateSnapshot.js";
import type {
  RoundRoleHistoryEntry
} from "../../domain/state/snapshot/roundRoleHistory.js";

export type PassSenderRole = "implementer" | "reviewer";
export type PassRecipientRole = PassSenderRole | "meta_reviewer";

export interface ResolvedPassHandoff {
  senderAgent: AgentName;
  senderRole: PassSenderRole;
  recipientAgent: AgentName;
  recipientRole: PassRecipientRole;
  envelopeRound: number;
  nextRound: number;
  appendRoundRoleEntry?: RoundRoleHistoryEntry;
}

export interface ResolvePassHandoffInput {
  state: PersistedBubbleStateSnapshot;
  implementer: AgentName;
  reviewer: AgentName;
  metaReviewer: AgentName;
  effectiveLoopMode: BubbleReviewLoopMode;
  nowIso: string;
  createError: PairflowCreateCommandError;
}

const passHandoffResolutionErrorReasonCode = "PASS_HANDOFF_RESOLUTION_ERROR";

function raiseResolutionError(
  createError: PairflowCreateCommandError,
  message: string
): never {
  throw createError({
    reasonCode: passHandoffResolutionErrorReasonCode,
    message,
    context: {
      guard: "handoff_resolution_input"
    }
  });
}

export function resolvePassHandoff(input: ResolvePassHandoffInput): ResolvedPassHandoff {
  const {
    state,
    implementer,
    reviewer,
    effectiveLoopMode,
    nowIso,
    createError
  } = input;

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
    if (effectiveLoopMode === "meta_only") {
      return {
        senderAgent: implementer,
        senderRole: "implementer",
        recipientAgent: input.metaReviewer,
        recipientRole: "meta_reviewer",
        envelopeRound: state.round,
        nextRound: state.round
      };
    }

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
