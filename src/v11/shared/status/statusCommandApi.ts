import { statusCommandDependencyDefaults } from "./statusCommandDependencyDefaults.js";
import {
  countPendingHumanQuestions,
  readStatusTranscriptData,
  resolvePendingApprovalCount,
  resolveReviewVerificationState,
  resolveStatusGateState,
  withAccuracyCriticalVerificationGate
} from "./statusCommandInternals.js";
import {
  buildBubbleStatusView,
  type BubbleStatusView
} from "./statusCommandViewBuilder.js";
import type {
  ReadWatchdogPaneActivity,
  ReadWatchdogPaneActivityResult
} from "../watchdog/watchdogPaneActivityStore.js";
import { isNamedError } from "../errors/namedError.js";

export interface BubbleStatusInput {
  bubbleId: string;
  repoPath?: string | undefined;
  cwd?: string | undefined;
  now?: Date | undefined;
}

export type { BubbleStatusView } from "./statusCommandViewBuilder.js";

export interface BubbleStatusDependencies {
  readWatchdogPaneActivity: ReadWatchdogPaneActivity;
}

export class BubbleStatusError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "BubbleStatusError";
  }
}

export async function getBubbleStatus(
  input: BubbleStatusInput,
  dependencies: BubbleStatusDependencies
): Promise<BubbleStatusView> {
  const resolved = await statusCommandDependencyDefaults.resolveBubbleById({
    bubbleId: input.bubbleId,
    ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
    ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
  });
  const {
    state,
    stateValidation,
    transcript,
    inbox
  } = await readStatusTranscriptData(resolved);
  const pendingQuestions = countPendingHumanQuestions(inbox);
  const accuracyCritical = resolved.bubbleConfig.accuracy_critical === true;
  const pendingApprovals =
    stateValidation === null
      ? resolvePendingApprovalCount(resolved, state, inbox)
      : 0;
  const verificationStatus =
    stateValidation === null
      ? await resolveReviewVerificationState(
          resolved,
          state,
          accuracyCritical
        )
      : "missing";
  const gateState =
    stateValidation === null
      ? await resolveStatusGateState(resolved, state.round)
      : {
          failingGates: [],
          specLockState: {
            state: "IMPLEMENTABLE" as const,
            open_blocker_count: 0,
            open_required_now_count: 0
          },
          roundGateState: {
            applies: false,
            violated: false,
            round: state.round
          }
        };
  if (stateValidation === null) {
    gateState.failingGates = withAccuracyCriticalVerificationGate(
      gateState.failingGates,
      accuracyCritical,
      verificationStatus
    );
  }

  const now = input.now ?? new Date();
  const paneActivityRead: ReadWatchdogPaneActivityResult =
    await dependencies.readWatchdogPaneActivity({
      runtimeDir: resolved.bubblePaths.runtimeDir,
      bubbleId: resolved.bubbleId
    });

  return buildBubbleStatusView({
    resolved,
    state,
    transcript,
    pendingQuestions,
    pendingApprovals,
    accuracyCritical,
    verificationStatus,
    gateState,
    stateValidation,
    paneActivityRead,
    now
  });
}

export function asBubbleStatusError(error: unknown): never {
  if (error instanceof BubbleStatusError) {
    throw error;
  }
  if (isNamedError(error, "BubbleLookupError")) {
    throw new BubbleStatusError(
      `${error.message} context: command_name=status.`
    );
  }
  if (error instanceof Error) {
    throw new BubbleStatusError(
      `${error.message} context: command_name=status.`
    );
  }
  throw error;
}
