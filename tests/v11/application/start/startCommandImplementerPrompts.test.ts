import { describe, expect, it } from "vitest";

import { buildImplementerStartupPrompt } from "../../../../src/v11/application/start/startCommandImplementerPrompts.js";
import { buildResumeImplementerStartupPrompt } from "../../../../src/v11/application/start/startCommandResumeImplementerPrompt.js";
import type { BubbleStateSnapshot } from "../../../../src/types/bubble.js";

function expectNoDonePackagePromptTokens(prompt: string): void {
  expect(prompt).not.toContain("done-package");
  expect(prompt).not.toContain("Done package");
  expect(prompt).not.toContain("donePackagePath");
}

describe("startCommandImplementerPrompts", () => {
  it("keeps fresh implementer startup prompt free of retired done-package tokens", () => {
    const prompt = buildImplementerStartupPrompt({
      bubbleId: "bubble_prompt_fresh_01",
      repoPath: "/tmp/repo",
      workspacePath: "/tmp/worktree",
      taskArtifactPath: "/tmp/worktree/.pairflow/bubbles/bubble_prompt_fresh_01/artifacts/task.md",
      reviewArtifactType: "code",
      pairflowCommandProfile: "external",
      ideationPending: false
    });

    expect(prompt).toContain(
      "Use the PASS summary plus evidence refs as the handoff package"
    );
    expectNoDonePackagePromptTokens(prompt);
  });

  it("keeps resume implementer startup prompt free of retired done-package tokens", () => {
    const state: BubbleStateSnapshot = {
      bubble_id: "bubble_prompt_resume_01",
      state: "RUNNING",
      round: 3,
      active_agent: "codex",
      active_since: "2026-04-25T21:00:42.033Z",
      active_role: "implementer",
      execution_context: null,
      round_role_history: [],
      last_command_at: "2026-04-25T21:00:42.033Z"
    };

    const prompt = buildResumeImplementerStartupPrompt({
      bubbleId: "bubble_prompt_resume_01",
      repoPath: "/tmp/repo",
      workspacePath: "/tmp/worktree",
      taskArtifactPath: "/tmp/worktree/.pairflow/bubbles/bubble_prompt_resume_01/artifacts/task.md",
      reviewArtifactType: "code",
      pairflowCommandProfile: "external",
      state,
      transcriptSummary: "resume-summary: implementer active"
    });

    expect(prompt).toContain(
      "Use transcript state, the PASS summary, and evidence refs as the handoff boundary"
    );
    expectNoDonePackagePromptTokens(prompt);
  });
});
