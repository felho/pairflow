import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

import { startCommandContextDefaults } from "./startCommandDependencyDefaults.js";
import { buildBubbleTmuxSessionName } from "../../shared/bubble/tmuxSessionName.js";
import { DEFAULT_REVIEW_POLICY_REVIEWER_BLOCKING_MIN_SEVERITY } from "../../../config/defaults.js";
import type { ReviewerFocusExtractionResult } from "../../shared/reviewer/reviewerBrief.js";
import type { BubbleReviewAutoReworkSeverity } from "../../../types/bubble.js";
import {
  reviewerSeverityOntologyFullMarkdown,
  reviewerSeverityOntologySourceDoc
} from "../../shared/reviewer/reviewerSeverityOntology.generated.js";
import {
  buildReviewerBlockingThresholdAuthorityLine,
  buildReviewerBlockingThresholdLabel,
  buildReviewerDocumentScopeThresholdRoutingNote
} from "../../shared/reviewer/reviewerCommandGateGuidance.js";
import type { RuntimeSessionRecord } from "../../shared/ports/runtimeSessions.js";
import type { StartBubbleInput } from "./startCommandContract.js";
import type {
  ReadReviewerBriefArtifactPort,
  ReadReviewerFocusArtifactPort
} from "../../shared/ports/reviewerArtifacts.js";
import type { BubbleRemotePointer } from "../../../types/bubble.js";
import { resolveStartBubbleMode } from "./startCommandOrchestration.js";
import { createStartBubbleError } from "./startCommandRuntime.js";
import {
  resolveRemoteCloneStartContextFromEnv,
  type RemoteCloneStartContext
} from "./startCommandRemoteExecutionContext.js";

export type StartLoadedState =
  Awaited<ReturnType<typeof startCommandContextDefaults.readStateSnapshot>>;
export type ResolvedStartBubble =
  Awaited<ReturnType<typeof startCommandContextDefaults.resolveBubbleById>>;
export const reviewerPolicySnapshotFileName = "reviewer-policy-snapshot.md";
export const reviewerPolicySnapshotUnavailableReasonCode =
  "REVIEWER_POLICY_SNAPSHOT_UNAVAILABLE";
const pairflowWorktreeRootEnvVar = "PAIRFLOW_WORKTREE_ROOT";

function buildReviewerPolicySnapshotContentForThreshold(
  reviewerBlockingMinSeverity: BubbleReviewAutoReworkSeverity
): string {
  const thresholdLabel = buildReviewerBlockingThresholdLabel({
    reviewerBlockingMinSeverity
  });
  return [
    "# Reviewer Policy Snapshot",
    "",
    "## Runtime Review Threshold",
    `- Current post-gate routing threshold: \`${thresholdLabel}\`.`,
    `- ${buildReviewerBlockingThresholdAuthorityLine({ reviewerBlockingMinSeverity })}`,
    "- This threshold controls reviewer PASS vs convergence after `severity_gate_round`; it does not redefine the canonical `P0/P1/P2/P3` severity meanings.",
    `- ${buildReviewerDocumentScopeThresholdRoutingNote()}`,
    `- Canonical ontology source: \`${reviewerSeverityOntologySourceDoc}\`.`,
    "",
    "## Canonical Severity Ontology",
    "",
    reviewerSeverityOntologyFullMarkdown,
    ""
  ].join("\n");
}

async function ensureReviewerPolicySnapshot(
  artifactsDir: string,
  reviewerBlockingMinSeverity: BubbleReviewAutoReworkSeverity
): Promise<string> {
  const artifactPath = join(artifactsDir, reviewerPolicySnapshotFileName);
  const artifactPathAbs = resolve(artifactPath);
  const snapshotContent = buildReviewerPolicySnapshotContentForThreshold(
    reviewerBlockingMinSeverity
  );

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

function resolveOptionalWorkspaceEnvPath(
  envVar: string
): string | undefined {
  const rawValue = process.env[envVar];
  if (typeof rawValue !== "string") {
    return undefined;
  }

  const trimmed = rawValue.trim();
  if (trimmed.length === 0) {
    return undefined;
  }

  return resolve(trimmed);
}

async function assertVerifiedRemoteCloneContext(input: {
  resolved: ResolvedStartBubble;
  remoteStartContext: RemoteCloneStartContext;
  readRemotePointer: (path: string) => Promise<BubbleRemotePointer | null>;
}): Promise<void> {
  const normalizedWorkspaceRoot = resolve(input.remoteStartContext.workspaceRoot);
  const pairflowWorktreeRoot = resolveOptionalWorkspaceEnvPath(
    pairflowWorktreeRootEnvVar
  );

  if (pairflowWorktreeRoot !== normalizedWorkspaceRoot) {
    throw createStartBubbleError({
      reasonCode: "START_REMOTE_EXECUTION_CONTEXT_INVALID",
      message:
        `Bubble ${input.resolved.bubbleId} remote inner-start env is only valid inside a verified remote clone workspace authority.`,
      context: {
        bubble_id: input.resolved.bubbleId,
        remote_workspace_root: normalizedWorkspaceRoot,
        pairflow_worktree_root: pairflowWorktreeRoot ?? null,
        required_env_var: pairflowWorktreeRootEnvVar
      }
    });
  }

  let remotePointer: BubbleRemotePointer | null;
  try {
    remotePointer = await input.readRemotePointer(
      input.resolved.bubblePaths.remotePointerPath
    );
  } catch (error) {
    throw createStartBubbleError({
      reasonCode: "START_REMOTE_EXECUTION_CONTEXT_INVALID",
      message:
        `Bubble ${input.resolved.bubbleId} could not verify remote clone control-plane boundaries for inner-start env.`,
      context: {
        bubble_id: input.resolved.bubbleId,
        remote_pointer_path: input.resolved.bubblePaths.remotePointerPath
      },
      cause: error
    });
  }

  if (remotePointer !== null) {
    throw createStartBubbleError({
      reasonCode: "START_REMOTE_EXECUTION_CONTEXT_INVALID",
      message:
        `Bubble ${input.resolved.bubbleId} refused remote inner-start env because local source-repo remote artifacts are still present.`,
      context: {
        bubble_id: input.resolved.bubbleId,
        remote_pointer_kind: remotePointer.kind,
        remote_pointer_path: input.resolved.bubblePaths.remotePointerPath
      }
    });
  }
}

export interface StartExecutionContext {
  resolved: ResolvedStartBubble;
  now: Date;
  nowIso: string;
  bubbleIdentity:
    Awaited<
      ReturnType<typeof startCommandContextDefaults.ensureBubbleInstanceIdForMutation>
    >;
  loadedState: StartLoadedState;
  startMode: ReturnType<typeof resolveStartBubbleMode>;
  expectedTmuxSessionName: string;
  policySnapshotPathAbs: string;
  runtimeSessionRecord?: RuntimeSessionRecord;
  reviewerBriefText?: string;
  reviewerFocus?: ReviewerFocusExtractionResult;
  remoteStartContext?: RemoteCloneStartContext;
}

export async function loadStartExecutionContext(
  input: StartBubbleInput,
  dependencies: {
    readReviewerBriefArtifact: ReadReviewerBriefArtifactPort;
    readReviewerFocusArtifact: ReadReviewerFocusArtifactPort;
    readRemotePointer: (path: string) => Promise<BubbleRemotePointer | null>;
  },
  options: {
    resolved?: ResolvedStartBubble;
  } = {}
): Promise<StartExecutionContext> {
  const resolved =
    options.resolved
    ?? await startCommandContextDefaults.resolveBubbleById({
      bubbleId: input.bubbleId,
      ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
      ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
    });
  const now = input.now ?? new Date();
  const nowIso = now.toISOString();
  const bubbleIdentity =
    await startCommandContextDefaults.ensureBubbleInstanceIdForMutation({
    bubbleId: resolved.bubbleId,
    repoPath: resolved.repoPath,
    bubblePaths: resolved.bubblePaths,
    bubbleConfig: resolved.bubbleConfig,
    now
  });
  resolved.bubbleConfig = bubbleIdentity.bubbleConfig;

  const reviewerBriefText = await dependencies.readReviewerBriefArtifact(
    resolved.bubblePaths.reviewerBriefArtifactPath
  ).catch(() => undefined);
  const reviewerFocus = await dependencies.readReviewerFocusArtifact(
    resolved.bubblePaths.reviewerFocusArtifactPath
  ).catch(() => undefined);
  const policySnapshotPathAbs = await ensureReviewerPolicySnapshot(
    resolved.bubblePaths.artifactsDir,
    resolved.bubbleConfig.review_policy?.reviewer_blocking_min_severity
      ?? DEFAULT_REVIEW_POLICY_REVIEWER_BLOCKING_MIN_SEVERITY
  );
  const loadedState =
    await startCommandContextDefaults.readStateSnapshot(resolved.bubblePaths.statePath);
  const remoteStartContext = resolveRemoteCloneStartContextFromEnv();
  if (
    remoteStartContext !== undefined
    && resolved.bubbleConfig.executor?.type !== "ssh"
  ) {
    throw createStartBubbleError({
      reasonCode: "START_REMOTE_EXECUTION_CONTEXT_INVALID",
      message:
        `Bubble ${resolved.bubbleId} received remote inner-start env context but is not configured for remote SSH execution.`,
      context: {
        bubble_id: resolved.bubbleId,
        executor_type: resolved.bubbleConfig.executor?.type ?? null
      }
    });
  }
  if (remoteStartContext !== undefined) {
    await assertVerifiedRemoteCloneContext({
      resolved,
      remoteStartContext,
      readRemotePointer: dependencies.readRemotePointer
    });
  }

  return {
    resolved,
    now,
    nowIso,
    bubbleIdentity,
    loadedState,
    startMode: resolveStartBubbleMode(loadedState.state.state),
    expectedTmuxSessionName: buildBubbleTmuxSessionName(resolved.bubbleId),
    policySnapshotPathAbs,
    ...(remoteStartContext !== undefined ? { remoteStartContext } : {}),
    ...(reviewerBriefText !== undefined ? { reviewerBriefText } : {}),
    ...(reviewerFocus !== undefined ? { reviewerFocus } : {})
  };
}
