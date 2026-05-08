import { describe, expect, it } from "vitest";

import { resolveResumeKickoffMessages } from "../../../../src/v11/application/start/startCommandResumeKickoffMessages.js";
import type { BubbleStateSnapshot } from "../../../../src/v11/shared/state/bubbleStateSnapshotTypes.js";

function createRunningMetaReviewerState(
  activeAgent: "codex" | "claude"
): BubbleStateSnapshot {
  return {
    bubble_id: "b_resume_kickoff_meta_01",
    state: "RUNNING",
    round: 4,
    active_agent: activeAgent,
    active_since: "2026-04-26T12:00:00.000Z",
    active_role: "meta_reviewer",
    execution_context: null,
    round_role_history: [],
    last_command_at: "2026-04-26T12:00:00.000Z"
  };
}

function createBaseInput(state: BubbleStateSnapshot) {
  return {
    bubbleId: "b_resume_kickoff_meta_01",
    repoPath: "/tmp/repo",
    workspacePath: "/tmp/worktree",
    taskArtifactPath: "/tmp/worktree/.pairflow/task.md",
    reviewArtifactType: "code" as const,
    pairflowCommandProfile: "external" as const,
    state,
    transcriptSummary: "resume-summary: meta-review active",
    implementerAgent: "codex" as const,
    reviewerAgent: "claude" as const,
    metaReviewerAgent: "claude" as const
  };
}

describe("startCommandResumeKickoffMessages", () => {
  it("sends the meta-reviewer kickoff only when RUNNING meta-review authority matches the configured agent", () => {
    const resolved = resolveResumeKickoffMessages(
      createBaseInput(createRunningMetaReviewerState("claude"))
    );

    expect(resolved.metaReviewerKickoffMessage).toContain(
      "resume kickoff (meta-reviewer)"
    );
    expect(resolved.kickoffDiagnostic).toBeUndefined();
    expect(resolved.implementerKickoffMessage).toBeUndefined();
    expect(resolved.reviewerKickoffMessage).toBeUndefined();
  });

  it("fails closed with a diagnostic when RUNNING meta-review authority does not match the configured agent", () => {
    const resolved = resolveResumeKickoffMessages(
      createBaseInput(createRunningMetaReviewerState("codex"))
    );

    expect(resolved.metaReviewerKickoffMessage).toBeUndefined();
    expect(resolved.kickoffDiagnostic).toContain(
      "RUNNING meta-review state active context is inconsistent;"
    );
    expect(resolved.kickoffDiagnostic).toContain("active_role=meta_reviewer,");
    expect(resolved.kickoffDiagnostic).toContain("active_agent=codex.");
    expect(resolved.kickoffDiagnostic).toContain(
      "configured_meta_reviewer=claude."
    );
  });
});
