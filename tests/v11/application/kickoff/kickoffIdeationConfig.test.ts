import { describe, expect, it } from "vitest";

import type { BubbleConfig } from "../../../../src/types/bubble.js";
import { buildKickoffIdeationConfig } from "../../../../src/v11/shared/kickoff/kickoffIdeationConfig.js";

describe("buildKickoffIdeationConfig", () => {
  it("sets kicked_off_at and task_pending while preserving started_at", () => {
    const updated = buildKickoffIdeationConfig({
      bubbleConfig: {
        id: "b_kickoff_config_01",
        created_at: "2026-03-19T21:00:00.000Z",
        updated_at: "2026-03-19T21:00:00.000Z",
        status: "active",
        base_branch: "main",
        bubble_branch: "bubble/b_kickoff_config_01",
        worktree_path: "/tmp/worktree",
        task: "Placeholder",
        task_artifact: "task.md",
        review_artifact_type: "code",
        review_artifact_ref: "review.md",
        transcript_path: "transcript.ndjson",
        state_path: "state.json",
        spec_ref: null,
        implementer_prompt_ref: null,
        reviewer_prompt_ref: null,
        checkpoints: [],
        commit_message_template: "msg",
        agents: {
          implementer: "codex",
          reviewer: "claude"
        },
        ideation: {
          mode: true,
          task_pending: true,
          started_at: "2026-03-19T20:00:00.000Z"
        }
      } as unknown as BubbleConfig,
      nowIso: "2026-03-19T22:15:00.000Z"
    });

    expect(updated.ideation).toEqual({
      mode: true,
      task_pending: false,
      started_at: "2026-03-19T20:00:00.000Z",
      kicked_off_at: "2026-03-19T22:15:00.000Z"
    });
  });

  it("works when started_at is missing", () => {
    const updated = buildKickoffIdeationConfig({
      bubbleConfig: {
        id: "b_kickoff_config_02",
        created_at: "2026-03-19T21:00:00.000Z",
        updated_at: "2026-03-19T21:00:00.000Z",
        status: "active",
        base_branch: "main",
        bubble_branch: "bubble/b_kickoff_config_02",
        worktree_path: "/tmp/worktree",
        task: "Placeholder",
        task_artifact: "task.md",
        review_artifact_type: "code",
        review_artifact_ref: "review.md",
        transcript_path: "transcript.ndjson",
        state_path: "state.json",
        spec_ref: null,
        implementer_prompt_ref: null,
        reviewer_prompt_ref: null,
        checkpoints: [],
        commit_message_template: "msg",
        agents: {
          implementer: "codex",
          reviewer: "claude"
        },
        ideation: {
          mode: true,
          task_pending: true
        }
      } as unknown as BubbleConfig,
      nowIso: "2026-03-19T22:20:00.000Z"
    });

    expect(updated.ideation).toEqual({
      mode: true,
      task_pending: false,
      kicked_off_at: "2026-03-19T22:20:00.000Z"
    });
  });
});
