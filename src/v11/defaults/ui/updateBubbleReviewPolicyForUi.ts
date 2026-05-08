import { resolveBubbleById } from "../bubbleLookup/bubbleLookupDefaults.js";
import type {
  BubbleReviewPolicyRuntimeView
} from "../../shared/reviewPolicy/reviewPolicyTypes.js";
import type {
  BubbleLifecycleState
} from "../../../types/bubble.js";
import { buildBubbleReviewPolicyRuntimeView } from "../../shared/reviewPolicy/reviewPolicyRuntime.js";
import { isReviewPolicyMutableState } from "../../shared/reviewPolicy/reviewPolicyMutationEligibility.js";
import {
  buildSharedUiReviewPolicyPatch,
  REVIEW_POLICY_WRITE_CONFLICT
} from "../../shared/reviewPolicy/updateBubbleReviewPolicy.js";
import {
  updateBubbleReviewPolicy,
  writeBubbleTomlAtomically
} from "../../infrastructure/artifact/reviewPolicy/updateBubbleReviewPolicy.js";
import { statusCommandDependencyDefaults } from "../status/statusCommandDependencyDefaults.js";
import {
  readStateSnapshot,
  withStateWriteLock
} from "../../infrastructure/state/stateStore.js";
import {
  executeRemoteBubbleReviewPolicyCommand,
  type ExecuteRemoteBubbleReviewPolicyCommandInput
} from "../../infrastructure/executor/ssh/sshBubbleReviewPolicyCommand.js";
import type {
  UiUpdateBubbleReviewPolicyInput,
  UiUpdateBubbleReviewPolicyResult
} from "../../ports/uiRouter.js";

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

export interface UpdateBubbleReviewPolicyForUiDependencies {
  executeRemoteBubbleReviewPolicyCommand?: (
    input: ExecuteRemoteBubbleReviewPolicyCommandInput
  ) => Promise<
    Awaited<ReturnType<typeof executeRemoteBubbleReviewPolicyCommand>>
  >;
  readRemotePointer?: typeof statusCommandDependencyDefaults.readRemotePointer;
  resolveRemoteBubbleStatusTarget?:
    typeof statusCommandDependencyDefaults.resolveRemoteBubbleStatusTarget;
}

function buildReviewPolicyPatch(input: UiUpdateBubbleReviewPolicyInput) {
  return buildSharedUiReviewPolicyPatch({
    reviewLoopMode: input.reviewLoopMode,
    ...(input.reviewBlockingMinSeverity !== undefined
      ? { reviewBlockingMinSeverity: input.reviewBlockingMinSeverity }
      : {}),
    ...(input.metaReviewQualityPreset !== undefined
      ? { metaReviewQualityPreset: input.metaReviewQualityPreset }
      : {})
  });
}

async function updateLocalBubbleReviewPolicy(input: {
  command: UiUpdateBubbleReviewPolicyInput;
  bubbleTomlPath: string;
  expectedBubbleToml?: string | undefined;
}) {
  return updateBubbleReviewPolicy({
    bubbleTomlPath: input.bubbleTomlPath,
    patch: buildReviewPolicyPatch(input.command),
    ...(input.expectedBubbleToml !== undefined
      ? { expectedContent: input.expectedBubbleToml }
      : {})
  });
}

async function updateRemoteBubbleReviewPolicyForUi(input: {
  command: UiUpdateBubbleReviewPolicyInput;
  resolved: Awaited<ReturnType<typeof resolveBubbleById>>;
  dependencies: Required<UpdateBubbleReviewPolicyForUiDependencies>;
}): Promise<UiUpdateBubbleReviewPolicyResult> {
  const remotePointer = await input.dependencies.readRemotePointer(
    input.resolved.bubblePaths.remotePointerPath
  );
  if (remotePointer?.kind !== "started") {
    throw new UiBubbleReviewPolicyStateConflictError({
      bubbleId: input.command.bubbleId,
      currentState: "CREATED"
    });
  }

  const remoteTarget =
    await input.dependencies.resolveRemoteBubbleStatusTarget({
      bubbleId: input.resolved.bubbleId,
      remoteAlias: input.resolved.bubbleConfig.executor?.remote ?? "",
      expectedHost: remotePointer.host
    });

  const localResult = await updateLocalBubbleReviewPolicy({
    command: input.command,
    bubbleTomlPath: input.resolved.bubblePaths.bubbleTomlPath,
    ...(input.command.expectedBubbleToml !== undefined
      ? { expectedBubbleToml: input.command.expectedBubbleToml }
      : {})
  });
  if (localResult.kind === "conflict") {
    throw new UiBubbleReviewPolicyConflictError({
      bubbleId: input.command.bubbleId,
      currentBubbleToml: localResult.currentBubbleToml,
      currentReviewPolicy: buildBubbleReviewPolicyRuntimeView(
        localResult.currentConfig
      )
    });
  }

  let remoteResult;
  try {
    remoteResult =
      await input.dependencies.executeRemoteBubbleReviewPolicyCommand({
        bubbleId: input.command.bubbleId,
        remoteClonePath: remotePointer.remoteClonePath,
        remoteTarget,
        reviewLoopMode: input.command.reviewLoopMode,
        ...(input.command.expectedBubbleToml !== undefined
          ? { expectedBubbleToml: input.command.expectedBubbleToml }
          : {}),
        ...(input.command.reviewBlockingMinSeverity !== undefined
          ? {
              reviewBlockingMinSeverity:
                input.command.reviewBlockingMinSeverity
            }
          : {}),
        ...(input.command.metaReviewQualityPreset !== undefined
          ? { metaReviewQualityPreset: input.command.metaReviewQualityPreset }
          : {})
      });
  } catch (error) {
    await writeBubbleTomlAtomically({
      bubbleTomlPath: input.resolved.bubblePaths.bubbleTomlPath,
      nextBubbleToml: localResult.previousBubbleToml
    });
    throw error;
  }

  if (remoteResult.kind === "conflict") {
    await writeBubbleTomlAtomically({
      bubbleTomlPath: input.resolved.bubblePaths.bubbleTomlPath,
      nextBubbleToml: localResult.previousBubbleToml
    });
    if (remoteResult.reasonCode === REVIEW_POLICY_STATE_CONFLICT) {
      throw new UiBubbleReviewPolicyStateConflictError({
        bubbleId: input.command.bubbleId,
        currentState:
          (remoteResult.currentState as BubbleLifecycleState | undefined)
          ?? "CREATED"
      });
    }
    throw new UiBubbleReviewPolicyConflictError({
      bubbleId: input.command.bubbleId,
      currentBubbleToml: remoteResult.currentBubbleToml ?? "",
      currentReviewPolicy:
        remoteResult.currentReviewPolicy
        ?? buildBubbleReviewPolicyRuntimeView(localResult.nextConfig)
    });
  }

  const previousPolicy = buildBubbleReviewPolicyRuntimeView(
    localResult.previousConfig
  );
  const nextPolicy = buildBubbleReviewPolicyRuntimeView(localResult.nextConfig);

  return {
    kind: "review_policy_updated",
    bubbleId: input.command.bubbleId,
    reviewPolicy: nextPolicy,
    previousRequestedLoopMode: previousPolicy.requested_loop_mode,
    nextRequestedLoopMode: nextPolicy.requested_loop_mode,
    activationChange: "none",
    bubbleToml: localResult.nextBubbleToml
  };
}

export async function updateBubbleReviewPolicyForUi(
  input: UiUpdateBubbleReviewPolicyInput,
  dependencies: UpdateBubbleReviewPolicyForUiDependencies = {}
): Promise<UiUpdateBubbleReviewPolicyResult> {
  const resolved = await resolveBubbleById({
    bubbleId: input.bubbleId,
    ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
    ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
  });
  const resolvedDependencies = {
    executeRemoteBubbleReviewPolicyCommand:
      dependencies.executeRemoteBubbleReviewPolicyCommand
      ?? executeRemoteBubbleReviewPolicyCommand,
    readRemotePointer:
      dependencies.readRemotePointer
      ?? statusCommandDependencyDefaults.readRemotePointer,
    resolveRemoteBubbleStatusTarget:
      dependencies.resolveRemoteBubbleStatusTarget
      ?? statusCommandDependencyDefaults.resolveRemoteBubbleStatusTarget
  };

  if (resolved.bubbleConfig.executor?.type === "ssh") {
    return updateRemoteBubbleReviewPolicyForUi({
      command: input,
      resolved,
      dependencies: resolvedDependencies
    });
  }

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
      const result = await updateLocalBubbleReviewPolicy({
        command: input,
        bubbleTomlPath: resolved.bubblePaths.bubbleTomlPath,
        ...(input.expectedBubbleToml !== undefined
          ? { expectedBubbleToml: input.expectedBubbleToml }
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
