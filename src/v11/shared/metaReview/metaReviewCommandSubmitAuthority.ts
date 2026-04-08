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

export async function assertMetaReviewSubmitterAuthority(input: {
  bubbleId: string;
  sessionsPath: string;
  readRuntimeSessions: NonNullable<MetaReviewCommandDependencies["readRuntimeSessionsRegistry"]>;
  state: BubbleStateSnapshot;
}): Promise<void> {
  assertActiveMetaReviewExecutionContext(input.state);

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
