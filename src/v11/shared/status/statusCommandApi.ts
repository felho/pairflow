import { BubbleLookupError, resolveBubbleById } from "../../../core/bubble/bubbleLookup.js";
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

export interface BubbleStatusInput {
  bubbleId: string;
  repoPath?: string | undefined;
  cwd?: string | undefined;
  now?: Date | undefined;
}

export type { BubbleStatusView } from "./statusCommandViewBuilder.js";

export class BubbleStatusError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "BubbleStatusError";
  }
}

export async function getBubbleStatus(input: BubbleStatusInput): Promise<BubbleStatusView> {
  const resolved = await resolveBubbleById({
    bubbleId: input.bubbleId,
    ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
    ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
  });
  const { state, transcript, inbox } = await readStatusTranscriptData(resolved);
  const pendingQuestions = countPendingHumanQuestions(inbox);
  const pendingApprovals = resolvePendingApprovalCount(resolved, state, inbox);
  const accuracyCritical = resolved.bubbleConfig.accuracy_critical === true;
  const verificationStatus = await resolveReviewVerificationState(
    resolved,
    state,
    accuracyCritical
  );
  const gateState = await resolveStatusGateState(resolved, state.round);
  gateState.failingGates = withAccuracyCriticalVerificationGate(
    gateState.failingGates,
    accuracyCritical,
    verificationStatus
  );

  return buildBubbleStatusView({
    resolved,
    state,
    transcript,
    pendingQuestions,
    pendingApprovals,
    accuracyCritical,
    verificationStatus,
    gateState,
    now: input.now ?? new Date()
  });
}

export function asBubbleStatusError(error: unknown): never {
  if (error instanceof BubbleStatusError) {
    throw error;
  }
  if (error instanceof BubbleLookupError) {
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
