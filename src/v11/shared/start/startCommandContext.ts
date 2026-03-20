import { readStateSnapshot } from "../../../core/state/stateStore.js";
import { resolveBubbleById } from "../../../core/bubble/bubbleLookup.js";
import { buildBubbleTmuxSessionName } from "../../../core/runtime/tmuxManager.js";
import { ensureBubbleInstanceIdForMutation } from "../../../core/bubble/bubbleInstanceId.js";
import { join } from "node:path";
import { readReviewerBriefArtifact, readReviewerFocusArtifact } from "../../../core/reviewer/reviewerBrief.js";
import type { ReviewerFocusExtractionResult } from "../../../core/reviewer/reviewerBrief.js";
import type { StartBubbleInput } from "../../application/start/startCommandContract.js";
import { resolveStartBubbleMode } from "./startCommandOrchestration.js";

export type StartLoadedState = Awaited<ReturnType<typeof readStateSnapshot>>;

export interface StartExecutionContext {
  resolved: Awaited<ReturnType<typeof resolveBubbleById>>;
  now: Date;
  nowIso: string;
  bubbleIdentity: Awaited<ReturnType<typeof ensureBubbleInstanceIdForMutation>>;
  loadedState: StartLoadedState;
  startMode: ReturnType<typeof resolveStartBubbleMode>;
  expectedTmuxSessionName: string;
  donePackagePath: string;
  reviewerBriefText?: string;
  reviewerFocus?: ReviewerFocusExtractionResult;
}

export async function loadStartExecutionContext(
  input: StartBubbleInput
): Promise<StartExecutionContext> {
  const resolved = await resolveBubbleById({
    bubbleId: input.bubbleId,
    ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
    ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
  });
  const now = input.now ?? new Date();
  const nowIso = now.toISOString();
  const bubbleIdentity = await ensureBubbleInstanceIdForMutation({
    bubbleId: resolved.bubbleId,
    repoPath: resolved.repoPath,
    bubblePaths: resolved.bubblePaths,
    bubbleConfig: resolved.bubbleConfig,
    now
  });
  resolved.bubbleConfig = bubbleIdentity.bubbleConfig;

  const reviewerBriefText = await readReviewerBriefArtifact(
    resolved.bubblePaths.reviewerBriefArtifactPath
  ).catch(() => undefined);
  const reviewerFocus = await readReviewerFocusArtifact(
    resolved.bubblePaths.reviewerFocusArtifactPath
  ).catch(() => undefined);
  const loadedState = await readStateSnapshot(resolved.bubblePaths.statePath);

  return {
    resolved,
    now,
    nowIso,
    bubbleIdentity,
    loadedState,
    startMode: resolveStartBubbleMode(loadedState.state.state),
    expectedTmuxSessionName: buildBubbleTmuxSessionName(resolved.bubbleId),
    donePackagePath: join(resolved.bubblePaths.artifactsDir, "done-package.md"),
    ...(reviewerBriefText !== undefined ? { reviewerBriefText } : {}),
    ...(reviewerFocus !== undefined ? { reviewerFocus } : {})
  };
}
