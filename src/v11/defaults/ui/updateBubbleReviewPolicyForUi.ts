import { resolveBubbleById } from "../bubbleLookup/bubbleLookupDefaults.js";
import type {
  BubbleLifecycleState,
  BubbleReviewPolicyRuntimeView
} from "../../../types/bubble.js";
import { buildBubbleReviewPolicyRuntimeView } from "../../shared/reviewPolicy/reviewPolicyRuntime.js";
import { isReviewPolicyMutableState } from "../../shared/reviewPolicy/reviewPolicyMutationEligibility.js";
import {
  REVIEW_POLICY_WRITE_CONFLICT,
  updateBubbleReviewPolicy
} from "../../shared/reviewPolicy/updateBubbleReviewPolicy.js";
import {
  readStateSnapshot,
  withStateWriteLock
} from "../../infrastructure/state/stateStore.js";
import type {
  UiUpdateBubbleReviewPolicyInput,
  UiUpdateBubbleReviewPolicyResult
} from "../../shared/ports/uiRouter.js";

export const REVIEW_POLICY_STATE_CONFLICT =
  "REVIEW_POLICY_STATE_CONFLICT" as const;

export class UiBubbleReviewPolicyConflictError extends Error {
  public readonly reasonCode: typeof REVIEW_POLICY_WRITE_CONFLICT;
  public readonly currentBubbleToml: string;
  public readonly currentReviewPolicy: BubbleReviewPolicyRuntimeView;

  public constructor(input: {
    bubbleId: string;
    currentBubbleToml: string;
    currentReviewPolicy: BubbleReviewPolicyRuntimeView;
  }) {
    super(
      `Review policy update conflict for bubble ${input.bubbleId}: bubble.toml changed since the expected revision.`
    );
    this.name = "UiBubbleReviewPolicyConflictError";
    this.reasonCode = REVIEW_POLICY_WRITE_CONFLICT;
    this.currentBubbleToml = input.currentBubbleToml;
    this.currentReviewPolicy = input.currentReviewPolicy;
  }
}

export class UiBubbleReviewPolicyStateConflictError extends Error {
  public readonly reasonCode: typeof REVIEW_POLICY_STATE_CONFLICT;
  public readonly currentState: BubbleLifecycleState;

  public constructor(input: {
    bubbleId: string;
    currentState: BubbleLifecycleState;
  }) {
    super(
      `Review policy update state conflict for bubble ${input.bubbleId}: update-review-policy requires non-terminal mutable state (current: ${input.currentState}).`
    );
    this.name = "UiBubbleReviewPolicyStateConflictError";
    this.reasonCode = REVIEW_POLICY_STATE_CONFLICT;
    this.currentState = input.currentState;
  }
}

export async function updateBubbleReviewPolicyForUi(
  input: UiUpdateBubbleReviewPolicyInput
): Promise<UiUpdateBubbleReviewPolicyResult> {
  const resolved = await resolveBubbleById({
    bubbleId: input.bubbleId,
    ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
    ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
  });
  return withStateWriteLock(
    resolved.bubblePaths.statePath,
    5_000,
    async () => {
      const loadedState = await readStateSnapshot(resolved.bubblePaths.statePath);
      if (!isReviewPolicyMutableState(loadedState.state.state)) {
        throw new UiBubbleReviewPolicyStateConflictError({
          bubbleId: input.bubbleId,
          currentState: loadedState.state.state
        });
      }

      // Reuse the shared state-write lock authority so lifecycle transitions and
      // review-policy writes serialize on the same statePath.lock contract.
      const result = await updateBubbleReviewPolicy({
        bubbleTomlPath: resolved.bubblePaths.bubbleTomlPath,
        patch: {
          review_loop_mode: input.reviewLoopMode,
          ...(input.metaReviewAutoReworkMinSeverity !== undefined
            ? {
                meta_review_auto_rework_min_severity:
                  input.metaReviewAutoReworkMinSeverity
              }
            : {})
        },
        ...(input.expectedBubbleToml !== undefined
          ? { expectedContent: input.expectedBubbleToml }
          : {})
      });

      if (result.kind === "conflict") {
        throw new UiBubbleReviewPolicyConflictError({
          bubbleId: input.bubbleId,
          currentBubbleToml: result.currentBubbleToml,
          currentReviewPolicy: buildBubbleReviewPolicyRuntimeView(result.currentConfig)
        });
      }

      const previousPolicy = buildBubbleReviewPolicyRuntimeView(result.previousConfig);
      const nextPolicy = buildBubbleReviewPolicyRuntimeView(result.nextConfig);

      return {
        kind: "review_policy_updated",
        bubbleId: input.bubbleId,
        reviewPolicy: nextPolicy,
        previousRequestedLoopMode: previousPolicy.requested_loop_mode,
        nextRequestedLoopMode: nextPolicy.requested_loop_mode,
        activationChange: "none",
        bubbleToml: result.nextBubbleToml
      };
    }
  );
}
