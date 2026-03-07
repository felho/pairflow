import { writeFile } from "node:fs/promises";

import { renderBubbleConfigToml } from "../../src/config/bubbleConfig.js";
import { createBubble, type BubbleCreateResult } from "../../src/core/bubble/createBubble.js";
import { readStateSnapshot, writeStateSnapshot } from "../../src/core/state/stateStore.js";
import { bootstrapWorktreeWorkspace } from "../../src/core/workspace/worktreeManager.js";
import type { CreateReviewArtifactType, ReviewArtifactType } from "../../src/types/bubble.js";

export interface SetupRunningBubbleFixtureInput {
  bubbleId: string;
  repoPath: string;
  task: string;
  startedAt?: string;
  reviewerBrief?: string;
  accuracyCritical?: boolean;
  reviewArtifactType?: CreateReviewArtifactType;
}

interface SetupRunningBubbleFixtureOverrideOptions {
  configReviewArtifactTypeOverride?: ReviewArtifactType;
}

async function setupRunningBubbleFixtureWithOverride(
  input: SetupRunningBubbleFixtureInput,
  options: SetupRunningBubbleFixtureOverrideOptions = {}
): Promise<BubbleCreateResult> {
  const createReviewArtifactType = input.reviewArtifactType ?? "code";
  let created = await createBubble({
    id: input.bubbleId,
    repoPath: input.repoPath,
    baseBranch: "main",
    reviewArtifactType: createReviewArtifactType,
    task: input.task,
    ...(input.reviewerBrief !== undefined
      ? { reviewerBrief: input.reviewerBrief }
      : {}),
    ...(input.accuracyCritical === true ? { accuracyCritical: true } : {}),
    cwd: input.repoPath
  });

  const overrideReviewArtifactType = options.configReviewArtifactTypeOverride;
  if (
    overrideReviewArtifactType !== undefined
    && overrideReviewArtifactType !== createReviewArtifactType
  ) {
    const overriddenConfig = {
      ...created.config,
      review_artifact_type: overrideReviewArtifactType
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
    worktreePath: created.paths.worktreePath
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

export async function setupRunningLegacyAutoBubbleFixture(
  input: Omit<SetupRunningBubbleFixtureInput, "reviewArtifactType">
): Promise<BubbleCreateResult> {
  return setupRunningBubbleFixtureWithOverride(
    {
      ...input,
      reviewArtifactType: "code"
    },
    {
      configReviewArtifactTypeOverride: "auto"
    }
  );
}
