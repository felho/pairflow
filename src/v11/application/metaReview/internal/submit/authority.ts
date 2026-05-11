import {
  validateActiveMetaReviewExecutionContext
} from "../../../../shared/metaReview/metaReviewExecutionContext.js";
import { MetaReviewError } from "../../../../shared/metaReview/metaReviewError.js";
import type { AgentName } from "../../../../../contracts/kernel/agentIdentity.js";
import type { PersistedBubbleStateSnapshot } from "../../../../domain/state/snapshot/persistedBubbleStateSnapshot.js";
import type { MetaReviewCommandDependencies } from "../../../../shared/metaReview/metaReviewCommandContract.js";

export function assertActiveMetaReviewExecutionContext(
  state: PersistedBubbleStateSnapshot
) {
  const executionContextResult = validateActiveMetaReviewExecutionContext(state);
  if (executionContextResult.ok) {
    return executionContextResult.value;
  }
  throw new MetaReviewError({
    reasonCode: "META_REVIEW_STATE_INVALID",
    message: `meta-review canonical execution context is invalid (${executionContextResult.errors.map((error) => `${error.path}: ${error.message}`).join("; ")}).`,
    context: {
      source: "assert_active_meta_review_execution_context",
      reason: "invalid_execution_context"
    }
  });
}

export function assertMetaReviewExecutionWindowActive(input: {
  bubbleId: string;
  executionContext: ReturnType<typeof assertActiveMetaReviewExecutionContext>;
  now: Date;
}): void {
  const startedAtMs = Date.parse(input.executionContext.started_at);
  const deadlineAtMs = Date.parse(input.executionContext.deadline_at);
  const nowMs = input.now.getTime();

  if (
    Number.isNaN(startedAtMs) ||
    Number.isNaN(deadlineAtMs) ||
    nowMs < startedAtMs ||
    nowMs > deadlineAtMs
  ) {
    throw new MetaReviewError({
      reasonCode: "META_REVIEW_STATE_INVALID",
      message:
        "meta-review submit rejected: canonical execution window is no longer active.",
      context: {
        source: "assert_meta_review_execution_window_active",
        reason: "execution_window_inactive",
        bubbleId: input.bubbleId
      }
    });
  }
}

export async function assertMetaReviewSubmitterAuthority(input: {
  bubbleId: string;
  metaReviewerAgent: AgentName;
  sessionsPath: string;
  readRuntimeSessions: NonNullable<MetaReviewCommandDependencies["readRuntimeSessionsRegistry"]>;
  state: PersistedBubbleStateSnapshot;
  now?: Date;
}): Promise<void> {
  const executionContext = assertActiveMetaReviewExecutionContext(input.state);
  if (input.now !== undefined) {
    assertMetaReviewExecutionWindowActive({
      bubbleId: input.bubbleId,
      executionContext,
      now: input.now
    });
  }

  const hasAnyActiveOwnership =
    input.state.active_agent !== null ||
    input.state.active_role !== null ||
    input.state.active_since !== null;
  const hasCompleteActiveOwnership =
    input.state.active_agent !== null &&
    input.state.active_role !== null &&
    input.state.active_since !== null;

  if (hasAnyActiveOwnership && !hasCompleteActiveOwnership) {
    throw new MetaReviewError({
      reasonCode: "META_REVIEW_STATE_INVALID",
      message:
        "meta-review submit rejected: active ownership fields are partially populated.",
      context: {
        source: "assert_meta_review_submitter_authority",
        reason: "partial_active_ownership",
        bubbleId: input.bubbleId
      }
    });
  }

  if (!hasAnyActiveOwnership) {
    const sessions = await input.readRuntimeSessions(input.sessionsPath, {
      allowMissing: true
    });
    void sessions[input.bubbleId]?.metaReviewerPane;
    return;
  }

  if (input.state.active_role !== "meta_reviewer") {
    throw new MetaReviewError({
      reasonCode: "META_REVIEW_SENDER_MISMATCH",
      message: `meta-review submit rejected: active role mismatch (expected meta_reviewer, found ${String(input.state.active_role)}).`,
      context: {
        source: "assert_meta_review_submitter_authority",
        reason: "active_role_mismatch",
        bubbleId: input.bubbleId
      }
    });
  }

  if (input.state.active_agent !== input.metaReviewerAgent) {
    const activeAgent = input.state.active_agent ?? "null";
    throw new MetaReviewError({
      reasonCode: "META_REVIEW_SENDER_MISMATCH",
      message: `meta-review submit rejected: active meta-review ownership is missing or stale (active_agent=${activeAgent}; expected active_agent=${input.metaReviewerAgent}).`,
      context: {
        source: "assert_meta_review_submitter_authority",
        reason: "active_agent_mismatch",
        bubbleId: input.bubbleId
      }
    });
  }

  const sessions = await input.readRuntimeSessions(input.sessionsPath, {
    allowMissing: true
  });
  void sessions[input.bubbleId]?.metaReviewerPane;
}

export function assertMetaReviewSubmitStaleGuard(input: {
  bubbleId: string;
  executionContext: ReturnType<typeof assertActiveMetaReviewExecutionContext>;
  stateFingerprint: string;
  expectedHandoffId?: string;
  expectedExecutionId?: string;
  expectedRole?: "implementer" | "reviewer" | "meta_reviewer";
  expectedRound?: number;
  expectedStateFingerprint?: string;
}): void {
  if (
    input.expectedHandoffId !== undefined &&
    input.executionContext.handoff_id !== input.expectedHandoffId
  ) {
    throw new MetaReviewError({
      reasonCode: "META_REVIEW_STATE_INVALID",
      message:
        `meta-review submit rejected: canonical handoff mismatch (expected ${input.expectedHandoffId}, active ${input.executionContext.handoff_id}).`,
      context: {
        source: "assert_meta_review_submit_stale_guard",
        reason: "handoff_id_mismatch",
        bubbleId: input.bubbleId
      }
    });
  }

  if (
    input.expectedExecutionId !== undefined &&
    input.executionContext.execution_id !== input.expectedExecutionId
  ) {
    throw new MetaReviewError({
      reasonCode: "META_REVIEW_STATE_INVALID",
      message:
        `meta-review submit rejected: canonical execution mismatch (expected ${input.expectedExecutionId}, active ${input.executionContext.execution_id}).`,
      context: {
        source: "assert_meta_review_submit_stale_guard",
        reason: "execution_id_mismatch",
        bubbleId: input.bubbleId
      }
    });
  }

  if (
    input.expectedRole !== undefined &&
    input.executionContext.active_role !== input.expectedRole
  ) {
    throw new MetaReviewError({
      reasonCode: "META_REVIEW_STATE_INVALID",
      message:
        `meta-review submit rejected: canonical role mismatch (expected ${input.expectedRole}, active ${input.executionContext.active_role}).`,
      context: {
        source: "assert_meta_review_submit_stale_guard",
        reason: "active_role_mismatch",
        bubbleId: input.bubbleId
      }
    });
  }

  if (
    input.expectedRound !== undefined &&
    input.executionContext.round !== input.expectedRound
  ) {
    throw new MetaReviewError({
      reasonCode: "META_REVIEW_STATE_INVALID",
      message:
        `meta-review submit rejected: canonical round mismatch (expected ${String(input.expectedRound)}, active ${String(input.executionContext.round)}).`,
      context: {
        source: "assert_meta_review_submit_stale_guard",
        reason: "round_mismatch",
        bubbleId: input.bubbleId
      }
    });
  }

  if (
    input.expectedStateFingerprint !== undefined &&
    input.stateFingerprint !== input.expectedStateFingerprint
  ) {
    throw new MetaReviewError({
      reasonCode: "META_REVIEW_STATE_INVALID",
      message:
        "meta-review submit rejected: canonical state fingerprint mismatch.",
      context: {
        source: "assert_meta_review_submit_stale_guard",
        reason: "state_fingerprint_mismatch",
        bubbleId: input.bubbleId
      }
    });
  }
}
