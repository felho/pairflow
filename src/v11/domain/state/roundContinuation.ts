import type {
  AgentName,
  BubbleExecutionContext,
  RoundRoleHistoryEntry
} from "../../../types/bubble.js";
import { buildRunningExecutionContext } from "../../shared/state/executionContext.js";

export interface ResolveRuntimeAlignedNextRoundContinuationInput {
  bubbleId: string;
  currentRound: number;
  roundRoleHistory: RoundRoleHistoryEntry[];
  implementer: AgentName;
  reviewer: AgentName;
  nowIso: string;
  watchdogTimeoutMinutes: number;
}

export interface RuntimeAlignedNextRoundContinuation {
  nextRound: number;
  activeAgent: AgentName;
  activeRole: "implementer";
  executionContext: BubbleExecutionContext;
  appendRoundRoleEntry?: RoundRoleHistoryEntry;
}

export function resolveRuntimeAlignedNextRoundContinuation(
  input: ResolveRuntimeAlignedNextRoundContinuationInput
): RuntimeAlignedNextRoundContinuation {
  const nextRound = input.currentRound + 1;
  const roundRoleHistory = input.roundRoleHistory ?? [];
  const hasRoundEntry = roundRoleHistory.some(
    (entry) => entry.round === nextRound
  );

  return {
    nextRound,
    activeAgent: input.implementer,
    activeRole: "implementer",
    executionContext: buildRunningExecutionContext({
      bubbleId: input.bubbleId,
      round: nextRound,
      activeRole: "implementer",
      startedAt: input.nowIso,
      watchdogTimeoutMinutes: input.watchdogTimeoutMinutes
    }),
    ...(hasRoundEntry
      ? {}
      : {
          appendRoundRoleEntry: {
            round: nextRound,
            implementer: input.implementer,
            reviewer: input.reviewer,
            switched_at: input.nowIso
          }
        })
  };
}
