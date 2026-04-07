import type { LoadedStateSnapshot } from "../../../core/state/stateStore.js";
import { isMetaReviewExecutionContextActiveState } from "../metaReview/metaReviewExecutionContext.js";
import { readTranscriptEnvelopes } from "../../../core/protocol/transcriptStore.js";
import type { ProtocolEnvelope } from "../../../types/protocol.js";
import type {
  MetaReviewGateRoute,
  MetaReviewGateResult
} from "./metaReviewGateTypes.js";
import { MetaReviewGateError } from "./metaReviewGateTypes.js";
import type { ApplyMetaReviewGateExecutionContext } from "./metaReviewGateApplyContext.js";

const persistedHumanGateRoutes = new Set<
  Exclude<MetaReviewGateRoute, "meta_review_running" | "auto_rework">
>([
  "human_gate_sticky_bypass",
  "human_gate_approve",
  "human_gate_budget_exhausted",
  "human_gate_inconclusive",
  "human_gate_run_failed",
  "human_gate_dispatch_failed"
]);

function resolvePersistedHumanGateRoute(
  envelope: ProtocolEnvelope
): Exclude<MetaReviewGateRoute, "meta_review_running" | "auto_rework"> | null {
  const route = envelope.payload.metadata?.meta_review_gate_route;
  if (typeof route !== "string" || !persistedHumanGateRoutes.has(route as never)) {
    return null;
  }
  return route as Exclude<MetaReviewGateRoute, "meta_review_running" | "auto_rework">;
}

export async function reconcileObservedGateResult(input: {
  context: ApplyMetaReviewGateExecutionContext;
  kickoffResult: MetaReviewGateResult;
  observedState: LoadedStateSnapshot;
}): Promise<MetaReviewGateResult> {
  if (isMetaReviewExecutionContextActiveState(input.observedState.state)) {
    return {
      ...input.kickoffResult,
      state: input.observedState.state
    };
  }

  const transcript = await readTranscriptEnvelopes(
    input.context.resolved.bubblePaths.transcriptPath,
    {
      allowMissing: true,
      tolerateInvalidEnvelopeLines: true
    }
  );
  const round =
    input.observedState.state.meta_review?.execution_context?.round ??
    input.observedState.state.round;

  if (input.observedState.state.state === "RUNNING") {
    for (let index = transcript.length - 1; index >= 0; index -= 1) {
      const envelope = transcript[index]!;
      if (
        envelope.type === "APPROVAL_DECISION" &&
        envelope.round === round &&
        envelope.sender === "orchestrator" &&
        envelope.recipient === input.context.resolved.bubbleConfig.agents.implementer &&
        envelope.payload.decision === "rework"
      ) {
        return {
          bubbleId: input.context.resolved.bubbleId,
          route: "auto_rework",
          gateSequence: index + 1,
          gateEnvelope: envelope,
          state: input.observedState.state
        };
      }
    }
  }

  if (input.observedState.state.state === "READY_FOR_HUMAN_APPROVAL") {
    for (let index = transcript.length - 1; index >= 0; index -= 1) {
      const envelope = transcript[index]!;
      if (
        envelope.type === "APPROVAL_REQUEST" &&
        envelope.round === round &&
        envelope.sender === "orchestrator" &&
        envelope.recipient === "human"
      ) {
        const route = resolvePersistedHumanGateRoute(envelope);
        if (route !== null) {
          return {
            bubbleId: input.context.resolved.bubbleId,
            route,
            gateSequence: index + 1,
            gateEnvelope: envelope,
            state: input.observedState.state
          };
        }
      }
    }
  }

  throw new MetaReviewGateError(
    "META_REVIEW_GATE_TRANSITION_INVALID",
    `META_REVIEW_GATE_TRANSITION_INVALID: runtime delivery observation saw progressed state=${input.observedState.state.state} without a matching gate envelope in the transcript.`
  );
}
