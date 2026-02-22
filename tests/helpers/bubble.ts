import { createBubble, type BubbleCreateResult } from "../../src/core/bubble/createBubble.js";
import { readStateSnapshot, writeStateSnapshot } from "../../src/core/state/stateStore.js";
import { bootstrapWorktreeWorkspace } from "../../src/core/workspace/worktreeManager.js";

export interface SetupRunningBubbleFixtureInput {
  bubbleId: string;
  repoPath: string;
  task: string;
  startedAt?: string;
}

export async function setupRunningBubbleFixture(
  input: SetupRunningBubbleFixtureInput
): Promise<BubbleCreateResult> {
  const created = await createBubble({
    id: input.bubbleId,
    repoPath: input.repoPath,
    baseBranch: "main",
    task: input.task,
    cwd: input.repoPath
  });

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
