import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

import { readStateSnapshot } from "../../infrastructure/state/stateStore.js";
import { resolveBubbleById } from "../../infrastructure/executor/workspace/bubbleLookup.js";
import { buildBubbleTmuxSessionName } from "../../infrastructure/channel/tmux/tmuxManager.js";
import { ensureBubbleInstanceIdForMutation } from "../../infrastructure/artifact/bubble/bubbleInstanceId.js";
import { readReviewerBriefArtifact, readReviewerFocusArtifact } from "../../../v11/shared/reviewer/reviewerBrief.js";
import type { ReviewerFocusExtractionResult } from "../../../v11/shared/reviewer/reviewerBrief.js";
import {
  reviewerSeverityOntologyFullMarkdown,
  reviewerSeverityOntologySourceDoc
} from "../reviewer/reviewerSeverityOntology.generated.js";
import type { StartBubbleInput } from "../../application/start/startCommandContract.js";
import { resolveStartBubbleMode } from "./startCommandOrchestration.js";
import { createStartBubbleError } from "./startCommandRuntime.js";

export type StartLoadedState = Awaited<ReturnType<typeof readStateSnapshot>>;
export const reviewerPolicySnapshotFileName = "reviewer-policy-snapshot.md";
export const reviewerPolicySnapshotUnavailableReasonCode =
  "REVIEWER_POLICY_SNAPSHOT_UNAVAILABLE";

function buildReviewerPolicySnapshotContent(): string {
  return `${reviewerSeverityOntologyFullMarkdown}\n`;
}

async function ensureReviewerPolicySnapshot(
  artifactsDir: string
): Promise<string> {
  const artifactPath = join(artifactsDir, reviewerPolicySnapshotFileName);
  const artifactPathAbs = resolve(artifactPath);
  const snapshotContent = buildReviewerPolicySnapshotContent();

  try {
    await mkdir(dirname(artifactPathAbs), { recursive: true });
    await writeFile(artifactPathAbs, snapshotContent, "utf8");
  } catch (error) {
    throw createStartBubbleError({
      reasonCode: reviewerPolicySnapshotUnavailableReasonCode,
      message: "Failed to write reviewer policy snapshot artifact.",
      context: {
        artifact_path: artifactPathAbs,
        source_doc: reviewerSeverityOntologySourceDoc,
        stage: "write"
      },
      cause: error
    });
  }

  let readBack: string;
  try {
    readBack = await readFile(artifactPathAbs, "utf8");
  } catch (error) {
    throw createStartBubbleError({
      reasonCode: reviewerPolicySnapshotUnavailableReasonCode,
      message: "Failed to read reviewer policy snapshot artifact after write.",
      context: {
        artifact_path: artifactPathAbs,
        source_doc: reviewerSeverityOntologySourceDoc,
        stage: "read_back"
      },
      cause: error
    });
  }

  if (readBack.trim().length === 0) {
    throw createStartBubbleError({
      reasonCode: reviewerPolicySnapshotUnavailableReasonCode,
      message: "Reviewer policy snapshot artifact is empty after write.",
      context: {
        artifact_path: artifactPathAbs,
        source_doc: reviewerSeverityOntologySourceDoc,
        stage: "validate_non_empty"
      }
    });
  }

  return artifactPathAbs;
}

export interface StartExecutionContext {
  resolved: Awaited<ReturnType<typeof resolveBubbleById>>;
  now: Date;
  nowIso: string;
  bubbleIdentity: Awaited<ReturnType<typeof ensureBubbleInstanceIdForMutation>>;
  loadedState: StartLoadedState;
  startMode: ReturnType<typeof resolveStartBubbleMode>;
  expectedTmuxSessionName: string;
  donePackagePath: string;
  policySnapshotPathAbs: string;
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
  const policySnapshotPathAbs = await ensureReviewerPolicySnapshot(
    resolved.bubblePaths.artifactsDir
  );
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
    policySnapshotPathAbs,
    ...(reviewerBriefText !== undefined ? { reviewerBriefText } : {}),
    ...(reviewerFocus !== undefined ? { reviewerFocus } : {})
  };
}
