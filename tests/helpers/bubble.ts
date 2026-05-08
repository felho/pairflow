import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";

import { renderBubbleConfigToml } from "../../src/config/bubbleConfig.js";
import { createBubble } from "../../src/v11/defaults/create/createBubbleApi.js";
import type { BubbleCreateResult } from "../../src/v11/application/create/createCommandContract.js";
import { normalizeBubbleReviewPolicy } from "../../src/v11/shared/reviewPolicy/reviewPolicyRuntime.js";
import { buildRunningExecutionContext } from "../../src/v11/shared/state/executionContext.js";
import { readStateSnapshot, writeStateSnapshot } from "../../src/v11/infrastructure/state/stateStore.js";
import { bootstrapWorktreeWorkspace } from "../../src/v11/infrastructure/workspace/worktreeManager.js";
import type {
  BubbleReviewPolicyConfig
} from "../../src/v11/shared/reviewPolicy/reviewPolicyTypes.js";
import type {
  CreateReviewArtifactType,
  PairflowCommandProfile,
  ReviewArtifactType
} from "../../src/v11/shared/config/bubbleConfigVocabulary.js";

export interface SetupRunningBubbleFixtureInput {
  bubbleId: string;
  repoPath: string;
  task: string;
  startedAt?: string;
  reviewerBrief?: string;
  accuracyCritical?: boolean;
  reviewArtifactType?: CreateReviewArtifactType;
  reviewPolicy?: Partial<BubbleReviewPolicyConfig>;
  pairflowCommandProfile?: PairflowCommandProfile;
}

interface SetupRunningBubbleFixtureOverrideOptions {
  configReviewArtifactTypeOverride?: ReviewArtifactType;
}

function normalizeTestBubbleId(id: string): string {
  const trimmed = id.trim();
  if (/^[a-z][a-z0-9_-]{2,39}$/u.test(trimmed)) {
    return trimmed;
  }

  const hashSuffix = createHash("sha1")
    .update(trimmed)
    .digest("hex")
    .slice(0, 10);
  const prefixMaxLength = 40 - 1 - hashSuffix.length;
  const normalizedPrefix = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9_-]/gu, "-")
    .replace(/^[^a-z]+/u, "")
    .slice(0, prefixMaxLength)
    .replace(/[-_]+$/u, "");

  const safePrefix =
    normalizedPrefix.length >= 3 ? normalizedPrefix : "bubble";
  const candidate = `${safePrefix}-${hashSuffix}`.slice(0, 40);

  if (/^[a-z][a-z0-9_-]{2,39}$/u.test(candidate)) {
    return candidate;
  }

  return `bubble-${hashSuffix}`.slice(0, 40);
}

function mergeTestReviewPolicy(
  base: BubbleReviewPolicyConfig | undefined,
  override: Partial<BubbleReviewPolicyConfig>
): BubbleReviewPolicyConfig {
  const normalized = normalizeBubbleReviewPolicy(
    base === undefined ? {} : { review_policy: base }
  );
  return {
    review_loop_mode: override.review_loop_mode ?? normalized.review_loop_mode,
    reviewer_blocking_min_severity:
      override.reviewer_blocking_min_severity
      ?? normalized.reviewer_blocking_min_severity,
    meta_review_auto_rework_min_severity:
      override.meta_review_auto_rework_min_severity
      ?? normalized.meta_review_auto_rework_min_severity,
    meta_review_consecutive_clean_runs_required:
      override.meta_review_consecutive_clean_runs_required
      ?? normalized.meta_review_consecutive_clean_runs_required
  };
}

async function setupRunningBubbleFixtureWithOverride(
  input: SetupRunningBubbleFixtureInput,
  options: SetupRunningBubbleFixtureOverrideOptions = {}
): Promise<BubbleCreateResult> {
  const createReviewArtifactType = input.reviewArtifactType ?? "code";
  let created = await createBubble({
    id: normalizeTestBubbleId(input.bubbleId),
    repoPath: input.repoPath,
    baseBranch: "main",
    reviewArtifactType: createReviewArtifactType,
    task: input.task,
    ...(input.reviewerBrief !== undefined
      ? { reviewerBrief: input.reviewerBrief }
      : {}),
    ...(input.accuracyCritical === true ? { accuracyCritical: true } : {}),
    ...(input.pairflowCommandProfile !== undefined
      ? { pairflowCommandProfile: input.pairflowCommandProfile }
      : {}),
    cwd: input.repoPath
  });

  const overrideReviewArtifactType = options.configReviewArtifactTypeOverride;
  const shouldOverrideReviewArtifactType =
    overrideReviewArtifactType !== undefined
    && overrideReviewArtifactType !== createReviewArtifactType;
  if (shouldOverrideReviewArtifactType || input.reviewPolicy !== undefined) {
    const overriddenConfig = {
      ...created.config,
      ...(shouldOverrideReviewArtifactType
        ? { review_artifact_type: overrideReviewArtifactType }
        : {}),
      ...(input.reviewPolicy !== undefined
        ? {
            review_policy: mergeTestReviewPolicy(
              created.config.review_policy,
              input.reviewPolicy
            )
          }
        : {})
    };
    await writeFile(
      created.paths.bubbleTomlPath,
      renderBubbleConfigToml(overriddenConfig),
      "utf8"
    );
    created = {
      ...created,
      config: overriddenConfig
    };
  }

  await bootstrapWorktreeWorkspace({
    repoPath: input.repoPath,
    baseBranch: "main",
    bubbleBranch: created.config.bubble_branch,
    worktreePath: created.paths.worktreePath,
    workspaceKind: "worktree"
  });

  const loaded = await readStateSnapshot(created.paths.statePath);
  const startedAt = input.startedAt ?? "2026-02-21T12:00:00.000Z";

  await writeStateSnapshot(
    created.paths.statePath,
    {
      ...loaded.state,
      state: "RUNNING",
      round: 1,
      active_agent: created.config.agents.implementer,
      active_role: "implementer",
      execution_context: buildRunningExecutionContext({
        bubbleId: created.bubbleId,
        round: 1,
        activeRole: "implementer",
        startedAt,
        watchdogTimeoutMinutes: created.config.watchdog_timeout_minutes
      }),
      active_since: startedAt,
      last_command_at: startedAt,
      round_role_history: [
        {
          round: 1,
          implementer: created.config.agents.implementer,
          reviewer: created.config.agents.reviewer,
          switched_at: startedAt
        }
      ]
    },
    {
      expectedFingerprint: loaded.fingerprint,
      expectedState: "CREATED"
    }
  );

  return created;
}

export async function setupRunningBubbleFixture(
  input: SetupRunningBubbleFixtureInput
): Promise<BubbleCreateResult> {
  return setupRunningBubbleFixtureWithOverride(input);
}
