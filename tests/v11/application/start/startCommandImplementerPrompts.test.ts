import { describe, expect, it } from "vitest";

import {
  buildImplementerKickoffMessage,
  buildImplementerStartupPrompt
} from "../../../../src/v11/application/start/internal/prompts/startCommandImplementerPrompts.js";
import { buildResumeImplementerStartupPrompt } from "../../../../src/v11/application/start/internal/prompts/startCommandResumeImplementerPrompt.js";
import {
  buildRolePromptConcernLines,
  buildTranscriptContextLine,
  type ResumePromptConcernBuildInput
} from "../../../../src/v11/shared/role/prompts/rolePromptConcerns.js";
import type {
  buildReviewerPolicySnapshotContractLines
} from "../../../../src/v11/shared/role/prompts/rolePromptConcerns.js";
import {
  buildMetaReviewerStartupPrompt,
  buildReviewerStartupPrompt
} from "../../../../src/v11/application/start/internal/prompts/startCommandPrompts.js";
import {
  buildResumeMetaReviewerStartupPrompt,
  buildResumeReviewerStartupPrompt
} from "../../../../src/v11/application/start/internal/prompts/startCommandResumePrompts.js";
import { buildMetaReviewSubmitCommandTemplate } from "../../../../src/v11/shared/metaReview/metaReviewSubmitGuidance.js";
import type { BubbleStateSnapshot } from "../../../../src/v11/domain/state/bubbleStateSnapshotTypes.js";

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

  it("routes the ideation-pending implementer startup prompt through the registry seam", () => {
    const prompt = buildImplementerStartupPrompt({
      bubbleId: "bubble_prompt_start_ideation_01",
      repoPath: "/tmp/repo",
      workspacePath: "/tmp/worktree",
      taskArtifactPath: "/tmp/worktree/.pairflow/bubbles/bubble_prompt_start_ideation_01/artifacts/task.md",
      reviewArtifactType: "code",
      pairflowCommandProfile: "external",
      ideationPending: true
    });

    expect(prompt).toContain("This bubble is ideation-pending (`round=0`).");
    expect(prompt).toContain("Do nothing now. Stay idle.");
    expect(prompt).toContain(
      "Do not run lifecycle/protocol commands (`pairflow bubble kickoff`, `pairflow agent emit`) unless explicit human instruction arrives."
    );
    expect(prompt).not.toContain("Read task:");
    expect(prompt).not.toContain("Use the PASS summary plus evidence refs as the handoff package");
  });

  it("keeps implementer kickoff guidance aligned with the registry-owned canonical emit lookup copy", () => {
    const kickoffMessage = buildImplementerKickoffMessage({
      bubbleId: "bubble_prompt_kickoff_01",
      workspacePath: "/tmp/worktree",
      taskArtifactPath: "/tmp/worktree/.pairflow/bubbles/bubble_prompt_kickoff_01/artifacts/task.md",
      reviewArtifactType: "code",
      pairflowCommandProfile: "external"
    });

    expect(kickoffMessage).toContain("Before direct canonical emit, fetch fresh actor authority");
    expect(kickoffMessage).toContain(
      "Repeat this before each emit because authority can change after every successful handoff, convergence, meta-review transition, or human reply."
    );
    expect(kickoffMessage).toContain(
      "If no explicit authority snapshot is available yet, refresh status and wait for a current handoff instead of falling back to removed aliases."
    );
  });

  it("renders document-scope kickoff as docs refinement instead of code implementation", () => {
    const kickoffMessage = buildImplementerKickoffMessage({
      bubbleId: "bubble_prompt_doc_kickoff_01",
      workspacePath: "/tmp/worktree",
      taskArtifactPath: "/tmp/worktree/.pairflow/bubbles/bubble_prompt_doc_kickoff_01/artifacts/task.md",
      reviewArtifactType: "document",
      pairflowCommandProfile: "external"
    });

    expect(kickoffMessage).toContain(
      "Document refinement mode (`review_artifact_type=document`)"
    );
    expect(kickoffMessage).toContain(
      "Do not implement product/runtime/source-code changes in this bubble"
    );
    expect(kickoffMessage).toContain(
      "emit a blocker or route-back/replan request"
    );
    expect(kickoffMessage).not.toContain("Start implementation immediately");
  });

  it("keeps document-scope startup and resume prompts out of code implementation mode", () => {
    const state: BubbleStateSnapshot = {
      bubble_id: "bubble_prompt_doc_resume_01",
      state: "RUNNING",
      round: 1,
      active_agent: "codex",
      active_since: "2026-04-25T21:00:42.033Z",
      active_role: "implementer",
      execution_context: null,
      round_role_history: [],
      last_command_at: "2026-04-25T21:00:42.033Z"
    };

    const startup = buildImplementerStartupPrompt({
      bubbleId: "bubble_prompt_doc_start_01",
      repoPath: "/tmp/repo",
      workspacePath: "/tmp/worktree",
      taskArtifactPath: "/tmp/worktree/task.md",
      reviewArtifactType: "document",
      pairflowCommandProfile: "external",
      ideationPending: false
    });
    const resume = buildResumeImplementerStartupPrompt({
      bubbleId: "bubble_prompt_doc_resume_01",
      repoPath: "/tmp/repo",
      workspacePath: "/tmp/worktree",
      taskArtifactPath: "/tmp/worktree/task.md",
      reviewArtifactType: "document",
      pairflowCommandProfile: "external",
      state,
      transcriptSummary: "resume"
    });

    expect(startup).toContain("Refine document/task/spec artifacts");
    expect(startup).toContain(
      "Do not implement product/runtime/source-code changes"
    );
    expect(startup).toContain("Document bubble source-code guard:");
    expect(startup).toContain("`target_files`, `target_write_files`");
    expect(resume).toContain("Continue document/task/spec refinement now");
    expect(resume).toContain(
      "Do not edit product/runtime source code in document scope"
    );
    expect(resume).toContain("Document bubble source-code guard:");
    expect(resume).toContain("they do not authorize code edits");
    expect(startup).not.toContain(
      "Implement in this launch workspace and run relevant validation before handoff."
    );
    expect(resume).not.toContain("Continue implementation now");
  });

  it("lists required validation commands in startup, kickoff, and resume prompts", () => {
    const validationCommands = {
      test: "pnpm test",
      typecheck: "pnpm typecheck",
      fitness: "pnpm fitness",
      validation_required: ["fitness", "typecheck"]
    };
    const state: BubbleStateSnapshot = {
      bubble_id: "bubble_prompt_validation_01",
      state: "RUNNING",
      round: 2,
      active_agent: "codex",
      active_since: "2026-04-25T21:00:42.033Z",
      active_role: "implementer",
      execution_context: null,
      round_role_history: [],
      last_command_at: "2026-04-25T21:00:42.033Z"
    };

    const startup = buildImplementerStartupPrompt({
      bubbleId: "bubble_prompt_validation_01",
      repoPath: "/tmp/repo",
      workspacePath: "/tmp/worktree",
      taskArtifactPath: "/tmp/worktree/task.md",
      reviewArtifactType: "code",
      pairflowCommandProfile: "external",
      ideationPending: false,
      validationCommands
    });
    const kickoff = buildImplementerKickoffMessage({
      bubbleId: "bubble_prompt_validation_01",
      workspacePath: "/tmp/worktree",
      taskArtifactPath: "/tmp/worktree/task.md",
      reviewArtifactType: "code",
      pairflowCommandProfile: "external",
      validationCommands
    });
    const resume = buildResumeImplementerStartupPrompt({
      bubbleId: "bubble_prompt_validation_01",
      repoPath: "/tmp/repo",
      workspacePath: "/tmp/worktree",
      taskArtifactPath: "/tmp/worktree/task.md",
      reviewArtifactType: "code",
      pairflowCommandProfile: "external",
      state,
      transcriptSummary: "resume",
      validationCommands
    });

    for (const prompt of [startup, kickoff, resume]) {
      expect(prompt).toContain("fitness: `pnpm fitness`");
      expect(prompt).toContain("typecheck: `pnpm typecheck`");
      expect(prompt).toContain("PASS will re-run");
      expect(prompt).toContain("PASS-owned evidence logs are authoritative");
      expect(prompt).toContain("Run the bubble-level validation commands listed above");
      expect(prompt).not.toContain(
        "Run validation via `pnpm lint`, `pnpm typecheck`, `pnpm test`, or `pnpm check`"
      );
    }
  });

  it("warns on invalid empty required validation policy instead of rendering empty required commands", () => {
    const prompt = buildImplementerStartupPrompt({
      bubbleId: "bubble_prompt_invalid_validation_01",
      repoPath: "/tmp/repo",
      workspacePath: "/tmp/worktree",
      taskArtifactPath: "/tmp/worktree/task.md",
      reviewArtifactType: "code",
      pairflowCommandProfile: "external",
      ideationPending: false,
      validationCommands: {
        test: "pnpm test",
        typecheck: "pnpm typecheck",
        validation_required: []
      }
    });

    expect(prompt).toContain("Bubble-level PASS validation policy is invalid");
    expect(prompt).toContain(
      "commands.validation_required=[] requires commands.validation_required_explicit=true"
    );
    expect(prompt).toContain("PASS will fail closed until the bubble config is corrected");
    expect(prompt).not.toContain("Required PASS validation commands for this bubble:  You may run them locally");
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
    expect(
      prompt.indexOf("Transcript context: resume-summary: implementer active")
    ).toBeLessThan(
      prompt.indexOf(
        "Use transcript state, the PASS summary, and evidence refs as the handoff boundary"
      )
    );
    expectNoDonePackagePromptTokens(prompt);
  });

  it("keeps the ideation-pending implementer resume prompt routed through the registry seam", () => {
    const state: BubbleStateSnapshot = {
      bubble_id: "bubble_prompt_resume_ideation_01",
      state: "RUNNING",
      round: 0,
      active_agent: "codex",
      active_since: "2026-04-25T21:00:42.033Z",
      active_role: "implementer",
      execution_context: null,
      round_role_history: [],
      last_command_at: "2026-04-25T21:00:42.033Z"
    };

    const prompt = buildResumeImplementerStartupPrompt({
      bubbleId: "bubble_prompt_resume_ideation_01",
      repoPath: "/tmp/repo",
      workspacePath: "/tmp/worktree",
      taskArtifactPath: "/tmp/worktree/.pairflow/bubbles/bubble_prompt_resume_ideation_01/artifacts/task.md",
      reviewArtifactType: "code",
      pairflowCommandProfile: "external",
      state,
      transcriptSummary: "resume-summary: ideation pending",
      kickoffDiagnostic: "waiting for kickoff task"
    });

    expect(prompt).toContain("This bubble is ideation-pending (`RUNNING`, `round=0`).");
    expect(prompt).toContain("Do not run lifecycle/protocol commands (`pairflow bubble kickoff`, `pairflow agent emit`) unless explicit human instruction arrives.");
    expect(prompt).toContain("Kickoff diagnostic: waiting for kickoff task");
    expect(prompt).not.toContain("Task:");
    expect(prompt).not.toContain("Execute pairflow commands from this launch workspace path only");
  });

  it("does not apply the ideation-pending bypass outside implementer prompt routes", () => {
    const reviewerStartupPrompt = buildRolePromptConcernLines({
      role: "reviewer",
      phase: "startup",
      context: {
        bubbleId: "bubble_prompt_reviewer_start_round0_guard_01",
        repoPath: "/tmp/repo",
        workspacePath: "/tmp/worktree",
        taskArtifactPath: "/tmp/worktree/.pairflow/bubbles/bubble_prompt_reviewer_start_round0_guard_01/artifacts/task.md",
        policySnapshotPathAbs: "/tmp/worktree/.pairflow/policy/reviewer.md",
        reviewArtifactType: "code",
        pairflowCommandProfile: "external",
        ideationPending: true
      }
    }).join(" ");
    const metaReviewerResumePrompt = buildRolePromptConcernLines({
      role: "meta_reviewer",
      phase: "resume",
      context: {
        bubbleId: "bubble_prompt_meta_resume_round0_guard_01",
        repoPath: "/tmp/repo",
        workspacePath: "/tmp/worktree",
        taskArtifactPath: "/tmp/worktree/.pairflow/bubbles/bubble_prompt_meta_resume_round0_guard_01/artifacts/task.md",
        pairflowCommandProfile: "external",
        state: {
          bubble_id: "bubble_prompt_meta_resume_round0_guard_01",
          state: "RUNNING",
          round: 0,
          active_agent: "codex",
          active_since: "2026-04-25T21:00:42.033Z",
          active_role: "meta_reviewer",
          execution_context: null,
          round_role_history: [],
          last_command_at: "2026-04-25T21:00:42.033Z"
        },
        transcriptSummary: "resume-summary: meta-review round0"
      }
    }).join(" ");

    expect(reviewerStartupPrompt).toContain("Pairflow reviewer start for bubble");
    expect(reviewerStartupPrompt).toContain(
      "Reviewer policy file: /tmp/worktree/.pairflow/policy/reviewer.md"
    );
    expect(reviewerStartupPrompt).not.toContain("This bubble is ideation-pending (`round=0`).");
    expect(metaReviewerResumePrompt).toContain("Pairflow meta-reviewer resume for bubble");
    expect(metaReviewerResumePrompt).toContain(
      "Transcript context: resume-summary: meta-review round0"
    );
    expect(metaReviewerResumePrompt).not.toContain(
      "This bubble is ideation-pending (`RUNNING`, `round=0`)."
    );
  });

  it("keeps reviewer and meta-reviewer prompts aligned with the registry-driven concern composition", () => {
    const reviewerState: BubbleStateSnapshot = {
      bubble_id: "bubble_prompt_reviewer_resume_01",
      state: "RUNNING",
      round: 2,
      active_agent: "claude",
      active_since: "2026-04-25T21:00:42.033Z",
      active_role: "reviewer",
      execution_context: null,
      round_role_history: [],
      last_command_at: "2026-04-25T21:00:42.033Z"
    };
    const metaReviewerState: BubbleStateSnapshot = {
      ...reviewerState,
      bubble_id: "bubble_prompt_meta_resume_01",
      active_agent: "codex",
      active_role: "meta_reviewer"
    };

    const reviewerStartupPrompt = buildReviewerStartupPrompt({
      bubbleId: "bubble_prompt_reviewer_start_01",
      repoPath: "/tmp/repo",
      workspacePath: "/tmp/worktree",
      taskArtifactPath: "/tmp/worktree/.pairflow/bubbles/bubble_prompt_reviewer_start_01/artifacts/task.md",
      policySnapshotPathAbs: "/tmp/worktree/.pairflow/policy/reviewer.md",
      reviewArtifactType: "code",
      pairflowCommandProfile: "external",
      reviewerBriefText: "Check the active regression surface.",
      reviewerFocus: {
        status: "present",
        source: "frontmatter",
        focus_text: "- Re-check canonical emit authority copy\n- Verify resume ordering",
        focus_items: [
          "Re-check canonical emit authority copy",
          "Verify resume ordering"
        ]
      }
    });
    const reviewerResumePrompt = buildResumeReviewerStartupPrompt({
      bubbleId: "bubble_prompt_reviewer_resume_01",
      repoPath: "/tmp/repo",
      workspacePath: "/tmp/worktree",
      taskArtifactPath: "/tmp/worktree/.pairflow/bubbles/bubble_prompt_reviewer_resume_01/artifacts/task.md",
      policySnapshotPathAbs: "/tmp/worktree/.pairflow/policy/reviewer.md",
      pairflowCommandProfile: "external",
      state: reviewerState,
      transcriptSummary: "resume-summary: reviewer active",
      reviewArtifactType: "code",
      reviewerTestDirectiveLine: "reuse trusted evidence"
    });
    const metaReviewerStartupPrompt = buildMetaReviewerStartupPrompt({
      bubbleId: "bubble_prompt_meta_start_01",
      repoPath: "/tmp/repo",
      workspacePath: "/tmp/worktree",
      taskArtifactPath: "/tmp/worktree/.pairflow/bubbles/bubble_prompt_meta_start_01/artifacts/task.md",
      pairflowCommandProfile: "external"
    });
    const metaReviewerResumePrompt = buildResumeMetaReviewerStartupPrompt({
      bubbleId: "bubble_prompt_meta_resume_01",
      repoPath: "/tmp/repo",
      workspacePath: "/tmp/worktree",
      taskArtifactPath: "/tmp/worktree/.pairflow/bubbles/bubble_prompt_meta_resume_01/artifacts/task.md",
      pairflowCommandProfile: "external",
      state: metaReviewerState,
      transcriptSummary: "resume-summary: meta-review active",
      kickoffDiagnostic: "meta gate re-entered"
    });

    expect(reviewerStartupPrompt).toContain("Before direct canonical emit, fetch fresh actor authority");
    expect(reviewerStartupPrompt).toContain(
      "Repeat this before each emit because authority can change after every successful handoff, convergence, meta-review transition, or human reply."
    );
    expect(reviewerStartupPrompt).toContain(
      "If no explicit authority snapshot is available yet, refresh status and wait for a current handoff instead of falling back to removed aliases."
    );
    expect(reviewerStartupPrompt).toContain("Reviewer policy file: /tmp/worktree/.pairflow/policy/reviewer.md");
    expect(reviewerStartupPrompt).toContain("Check the active regression surface.");
    expect(reviewerStartupPrompt).toContain(
      "Reviewer brief (persisted artifact `reviewer-brief.md`):"
    );
    expect(reviewerStartupPrompt).toContain(
      "Reviewer Focus (bridged from task artifact `reviewer-focus.json`):"
    );
    expect(reviewerStartupPrompt).toContain(
      "- Re-check canonical emit authority copy\n- Verify resume ordering"
    );

    expect(reviewerResumePrompt).toContain("Current directive: reuse trusted evidence");
    expect(reviewerResumePrompt).toContain("State snapshot: state=RUNNING, round=2, active_agent=claude, active_role=reviewer.");
    expect(reviewerResumePrompt).toContain("You are currently active. Continue review now.");
    expect(
      reviewerResumePrompt.indexOf(
        "Decision matrix triggers that still require tests:"
      )
    ).toBeLessThan(
      reviewerResumePrompt.indexOf("Current directive: reuse trusted evidence")
    );
    expect(
      reviewerResumePrompt.indexOf("Current directive: reuse trusted evidence")
    ).toBeLessThan(
      reviewerResumePrompt.indexOf(
        "IMPORTANT: This bubble primarily targets code changes."
      )
    );

    expect(metaReviewerStartupPrompt).toContain(buildMetaReviewSubmitCommandTemplate());
    expect(metaReviewerStartupPrompt).toContain("Do not modify transcript/inbox/state files manually.");
    expect(metaReviewerStartupPrompt).toContain("Before direct canonical emit, fetch fresh actor authority");

    expect(metaReviewerResumePrompt).toContain("This pane is static across rounds; do not restart unless explicitly instructed.");
    expect(metaReviewerResumePrompt).toContain("Transcript context: resume-summary: meta-review active");
    expect(metaReviewerResumePrompt).toContain("Kickoff diagnostic: meta gate re-entered");
    expect(
      metaReviewerResumePrompt.indexOf("State snapshot: state=RUNNING, round=2, active_agent=codex, active_role=meta_reviewer.")
    ).toBeLessThan(
      metaReviewerResumePrompt.indexOf("Transcript context: resume-summary: meta-review active")
    );
    expect(
      metaReviewerResumePrompt.indexOf("Transcript context: resume-summary: meta-review active")
    ).toBeLessThan(
      metaReviewerResumePrompt.indexOf("Kickoff diagnostic: meta gate re-entered")
    );
  });

  it("keeps runtime fail-closed behavior when transcript context rendering is invoked without transcriptSummary", () => {
    const state: BubbleStateSnapshot = {
      bubble_id: "bubble_prompt_resume_missing_transcript_01",
      state: "RUNNING",
      round: 2,
      active_agent: "codex",
      active_since: "2026-04-25T21:00:42.033Z",
      active_role: "implementer",
      execution_context: null,
      round_role_history: [],
      last_command_at: "2026-04-25T21:00:42.033Z"
    };

    expect(() =>
      buildTranscriptContextLine(
        {
          bubbleId: "bubble_prompt_resume_missing_transcript_01",
          repoPath: "/tmp/repo",
          workspacePath: "/tmp/worktree",
          taskArtifactPath: "/tmp/worktree/.pairflow/bubbles/bubble_prompt_resume_missing_transcript_01/artifacts/task.md",
          pairflowCommandProfile: "external",
          state,
          reviewArtifactType: "code"
        } as ResumePromptConcernBuildInput
      )
    ).toThrowError(
      new Error(
        "PROMPT_CONCERN_REQUIRED_INPUT: prompt concern transcript_context_line requires transcriptSummary input. context: concern_id=transcript_context_line field=transcriptSummary."
      )
    );
  });

  it("keeps runtime fail-closed behavior when resume prompt rendering receives an empty transcriptSummary", () => {
    expect(() =>
      buildRolePromptConcernLines({
        role: "reviewer",
        phase: "resume",
        context: {
          bubbleId: "bubble_prompt_resume_empty_transcript_01",
          repoPath: "/tmp/repo",
          workspacePath: "/tmp/worktree",
          taskArtifactPath: "/tmp/worktree/.pairflow/bubbles/bubble_prompt_resume_empty_transcript_01/artifacts/task.md",
          policySnapshotPathAbs: "/tmp/worktree/.pairflow/policy/reviewer.md",
          pairflowCommandProfile: "external",
          state: {
            bubble_id: "bubble_prompt_resume_empty_transcript_01",
            state: "RUNNING",
            round: 2,
            active_agent: "claude",
            active_since: "2026-04-25T21:00:42.033Z",
            active_role: "reviewer",
            execution_context: null,
            round_role_history: [],
            last_command_at: "2026-04-25T21:00:42.033Z"
          },
          transcriptSummary: "",
          reviewArtifactType: "code"
        }
      })
    ).toThrowError(
      new Error(
        "PROMPT_CONCERN_REQUIRED_INPUT: prompt concern transcript_context_line requires transcriptSummary input. context: concern_id=transcript_context_line field=transcriptSummary."
      )
    );
  });

  it("types resume prompt concern input as requiring transcriptSummary", () => {
    // @ts-expect-error resume prompt concern input requires transcriptSummary
    const invalidResumeInput: ResumePromptConcernBuildInput = {
      bubbleId: "bubble_prompt_resume_missing_transcript_type_01",
      repoPath: "/tmp/repo",
      workspacePath: "/tmp/worktree",
      taskArtifactPath: "/tmp/worktree/.pairflow/bubbles/bubble_prompt_resume_missing_transcript_type_01/artifacts/task.md",
      pairflowCommandProfile: "external",
      state: {
        bubble_id: "bubble_prompt_resume_missing_transcript_type_01",
        state: "RUNNING",
        round: 2,
        active_agent: "codex",
        active_since: "2026-04-25T21:00:42.033Z",
        active_role: "implementer",
        execution_context: null,
        round_role_history: [],
        last_command_at: "2026-04-25T21:00:42.033Z"
      }
    };

    expect(invalidResumeInput).toBeDefined();
  });

  it("types reviewer prompt concern helper input as requiring policySnapshotPathAbs", () => {
    type ReviewerPolicySnapshotHelperInput = Parameters<
      typeof buildReviewerPolicySnapshotContractLines
    >[0];

    // @ts-expect-error reviewer startup helper input requires policySnapshotPathAbs
    const invalidReviewerStartupInput: ReviewerPolicySnapshotHelperInput = {
      bubbleId: "bubble_prompt_reviewer_missing_policy_01",
      repoPath: "/tmp/repo",
      workspacePath: "/tmp/worktree",
      taskArtifactPath: "/tmp/worktree/.pairflow/bubbles/bubble_prompt_reviewer_missing_policy_01/artifacts/task.md",
      reviewArtifactType: "code",
      pairflowCommandProfile: "external"
    };

    // @ts-expect-error reviewer resume helper input requires policySnapshotPathAbs
    const invalidReviewerResumeInput: ReviewerPolicySnapshotHelperInput = {
      bubbleId: "bubble_prompt_reviewer_missing_policy_02",
      repoPath: "/tmp/repo",
      workspacePath: "/tmp/worktree",
      taskArtifactPath: "/tmp/worktree/.pairflow/bubbles/bubble_prompt_reviewer_missing_policy_02/artifacts/task.md",
      pairflowCommandProfile: "external",
      state: {
        bubble_id: "bubble_prompt_reviewer_missing_policy_02",
        state: "RUNNING",
        round: 2,
        active_agent: "claude",
        active_since: "2026-04-25T21:00:42.033Z",
        active_role: "reviewer",
        execution_context: null,
        round_role_history: [],
        last_command_at: "2026-04-25T21:00:42.033Z"
      },
      transcriptSummary: "resume-summary: reviewer active",
      reviewArtifactType: "code"
    };

    expect(invalidReviewerStartupInput).toBeDefined();
    expect(invalidReviewerResumeInput).toBeDefined();
  });
});
