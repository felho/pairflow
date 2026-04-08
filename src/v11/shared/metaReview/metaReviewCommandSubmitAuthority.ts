import {
  validateActiveMetaReviewExecutionContext
} from "./metaReviewExecutionContext.js";
import { MetaReviewError } from "./metaReviewError.js";
import type { BubbleStateSnapshot } from "../../../types/bubble.js";
import type { MetaReviewCommandDependencies } from "./metaReviewCommandContract.js";

const metaReviewerSubmitterAgent = "codex" as const;

export function assertActiveMetaReviewExecutionContext(
  state: BubbleStateSnapshot
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
  sessionsPath: string;
  readRuntimeSessions: NonNullable<MetaReviewCommandDependencies["readRuntimeSessionsRegistry"]>;
  state: BubbleStateSnapshot;
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

  if (input.state.active_agent !== metaReviewerSubmitterAgent) {
    const activeAgent = input.state.active_agent ?? "null";
    throw new MetaReviewError({
      reasonCode: "META_REVIEW_SENDER_MISMATCH",
      message: `meta-review submit rejected: active meta-review ownership is missing or stale (active_agent=${activeAgent}; expected active_agent=${metaReviewerSubmitterAgent}).`,
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
