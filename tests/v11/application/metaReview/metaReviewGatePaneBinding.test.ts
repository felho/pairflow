import { describe, expect, it, vi } from "vitest";

import {
  resolveMetaReviewerPaneWarning
} from "../../../../src/v11/application/metaReviewGate/metaReviewGatePaneBinding.js";

describe("metaReviewGatePaneBinding", () => {
  it("returns runtime-unavailable when agent command builder is missing", async () => {
    const result = await resolveMetaReviewerPaneWarning({
      setMetaReviewerPane: vi.fn(),
      notifySubmissionRequest: vi.fn(),
      runTmuxRunner: vi.fn(),
      sessionsPath: "/repo/.pairflow/runtime/sessions.json",
      bubbleId: "b_meta_review_gate_missing_builder",
      round: 1,
      now: new Date("2026-04-13T00:00:00.000Z"),
      taskArtifactPath: "/repo/.pairflow/bubbles/b_meta_review_gate_missing_builder/artifacts/task.md",
      pairflowCommandProfile: "external"
    });

    expect(result).toEqual({
      delivery: {
        status: "failed",
        reasonCode: "META_REVIEWER_PANE_RUNTIME_UNAVAILABLE",
        message: "meta-review gate pane binding is missing agent command builder."
      },
      shouldDeactivate: false
    });
  });

  it("returns runtime-unavailable when respawn capability is missing", async () => {
    const result = await resolveMetaReviewerPaneWarning({
      setMetaReviewerPane: vi.fn(),
      notifySubmissionRequest: vi.fn(),
      runTmuxRunner: vi.fn(),
      buildAgentCommand: vi.fn(() => "codex meta-review"),
      sessionsPath: "/repo/.pairflow/runtime/sessions.json",
      bubbleId: "b_meta_review_gate_missing_respawn",
      round: 1,
      now: new Date("2026-04-13T00:00:00.000Z"),
      taskArtifactPath: "/repo/.pairflow/bubbles/b_meta_review_gate_missing_respawn/artifacts/task.md",
      pairflowCommandProfile: "external"
    });

    expect(result).toEqual({
      delivery: {
        status: "failed",
        reasonCode: "META_REVIEWER_PANE_RUNTIME_UNAVAILABLE",
        message: "meta-review gate pane binding is missing respawn capability."
      },
      shouldDeactivate: false
    });
  });

  it("returns pane-unavailable without deactivation when no runtime session can be bound", async () => {
    const result = await resolveMetaReviewerPaneWarning({
      setMetaReviewerPane: vi.fn(async () => ({
        updated: false as const,
        reason: "no_runtime_session" as const
      })),
      notifySubmissionRequest: vi.fn(),
      runTmuxRunner: vi.fn(),
      buildAgentCommand: vi.fn(() => "codex meta-review"),
      respawnTmuxPaneCommand: vi.fn(async () => undefined),
      sessionsPath: "/repo/.pairflow/runtime/sessions.json",
      bubbleId: "b_meta_review_gate_no_runtime",
      round: 1,
      now: new Date("2026-04-13T00:00:00.000Z"),
      taskArtifactPath: "/repo/.pairflow/bubbles/b_meta_review_gate_no_runtime/artifacts/task.md",
      pairflowCommandProfile: "external"
    });

    expect(result).toEqual({
      delivery: {
        status: "failed",
        reasonCode: "META_REVIEWER_PANE_UNAVAILABLE",
        message: "META_REVIEWER_PANE_UNAVAILABLE: no_runtime_session"
      },
      shouldDeactivate: false
    });
  });

  it("confirms durable handoff path without pane respawn when no record update is required", async () => {
    const notifySubmissionRequest = vi.fn();
    const respawnTmuxPaneCommand = vi.fn();
    const result = await resolveMetaReviewerPaneWarning({
      setMetaReviewerPane: vi.fn(async () => ({
        updated: true as const
      })),
      notifySubmissionRequest,
      runTmuxRunner: vi.fn(),
      buildAgentCommand: vi.fn(() => "codex meta-review"),
      respawnTmuxPaneCommand,
      sessionsPath: "/repo/.pairflow/runtime/sessions.json",
      bubbleId: "b_meta_review_gate_durable_handoff",
      round: 1,
      now: new Date("2026-04-13T00:00:00.000Z"),
      taskArtifactPath: "/repo/.pairflow/bubbles/b_meta_review_gate_durable_handoff/artifacts/task.md",
      pairflowCommandProfile: "external"
    });

    expect(result).toEqual({
      delivery: {
        status: "confirmed",
        reasonCode: null,
        message: "meta-review submit request uses durable handoff only; no pane binding update required."
      },
      shouldDeactivate: false
    });
    expect(respawnTmuxPaneCommand).not.toHaveBeenCalled();
    expect(notifySubmissionRequest).not.toHaveBeenCalled();
  });

  it("uses legacy runtime worktree authority when workspacePath is absent", async () => {
    const buildAgentCommand = vi.fn(() => "codex meta-review");
    const notifySubmissionRequest = vi.fn(async () => ({
      status: "confirmed" as const,
      reasonCode: null,
      message: "delivered"
    }));
    const respawnTmuxPaneCommand = vi.fn(async () => undefined);

    const result = await resolveMetaReviewerPaneWarning({
      setMetaReviewerPane: async () => ({
        updated: true,
        record: {
          bubbleId: "b_meta_review_gate_legacy_workspace",
          repoPath: "/repo",
          worktreePath: "/legacy/worktree",
          tmuxSessionName: "pf-b_meta_review_gate_legacy_workspace",
          updatedAt: "2026-04-13T00:00:00.000Z",
          metaReviewerPane: {
            role: "meta-reviewer",
            paneIndex: 3,
            active: true,
            updatedAt: "2026-04-13T00:00:00.000Z"
          }
        }
      }),
      notifySubmissionRequest,
      runTmuxRunner: vi.fn(),
      buildAgentCommand,
      respawnTmuxPaneCommand,
      sessionsPath: "/repo/.pairflow/runtime/sessions.json",
      bubbleId: "b_meta_review_gate_legacy_workspace",
      round: 2,
      now: new Date("2026-04-13T00:00:00.000Z"),
      taskArtifactPath: "/repo/.pairflow/bubbles/b_meta_review_gate_legacy_workspace/artifacts/task.md",
      pairflowCommandProfile: "external"
    });

    expect(result.shouldDeactivate).toBe(true);
    expect(buildAgentCommand).toHaveBeenCalledWith(expect.objectContaining({
      workspacePath: "/legacy/worktree"
    }));
    expect(respawnTmuxPaneCommand).toHaveBeenCalledWith(expect.objectContaining({
      cwd: "/legacy/worktree"
    }));
    expect(notifySubmissionRequest).toHaveBeenCalledWith(expect.objectContaining({
      targetPane: "pf-b_meta_review_gate_legacy_workspace:0.3"
    }), expect.any(Object));
  });

  it("fails closed when only clone-mode worktree fallback is available", async () => {
    const notifySubmissionRequest = vi.fn(async () => ({
      status: "confirmed" as const,
      reasonCode: null,
      message: "delivered"
    }));
    const respawnTmuxPaneCommand = vi.fn(async () => undefined);

    const result = await resolveMetaReviewerPaneWarning({
      setMetaReviewerPane: async () => ({
        updated: true,
        record: {
          bubbleId: "b_meta_review_gate_clone_fallback_forbidden",
          repoPath: "/repo",
          worktreePath: "/legacy/worktree",
          workspaceKind: "clone",
          tmuxSessionName: "pf-b_meta_review_gate_clone_fallback_forbidden",
          updatedAt: "2026-04-13T00:05:00.000Z",
          metaReviewerPane: {
            role: "meta-reviewer",
            paneIndex: 3,
            active: true,
            updatedAt: "2026-04-13T00:05:00.000Z"
          }
        }
      }),
      notifySubmissionRequest,
      runTmuxRunner: vi.fn(),
      buildAgentCommand: vi.fn(() => "codex meta-review"),
      respawnTmuxPaneCommand,
      sessionsPath: "/repo/.pairflow/runtime/sessions.json",
      bubbleId: "b_meta_review_gate_clone_fallback_forbidden",
      round: 2,
      now: new Date("2026-04-13T00:05:00.000Z"),
      taskArtifactPath: "/repo/.pairflow/bubbles/b_meta_review_gate_clone_fallback_forbidden/artifacts/task.md",
      pairflowCommandProfile: "external"
    });

    expect(result).toEqual({
      delivery: {
        status: "failed",
        reasonCode: "META_REVIEWER_PANE_UNAVAILABLE",
        message:
          "META_REVIEWER_PANE_UNAVAILABLE: Bubble b_meta_review_gate_clone_fallback_forbidden cannot bind meta-review pane because runtime session only retained a clone-mode worktree reference without canonical workspace authority."
      },
      shouldDeactivate: true
    });
    expect(respawnTmuxPaneCommand).not.toHaveBeenCalled();
    expect(notifySubmissionRequest).not.toHaveBeenCalled();
  });

  it("returns a failed delivery and preserves deactivation when pane respawn fails", async () => {
    const notifySubmissionRequest = vi.fn(async () => ({
      status: "confirmed" as const,
      reasonCode: null,
      message: "delivered"
    }));

    const result = await resolveMetaReviewerPaneWarning({
      setMetaReviewerPane: async () => ({
        updated: true,
        record: {
          bubbleId: "b_meta_review_gate_respawn_fail",
          repoPath: "/repo",
          worktreePath: "/worktree",
          workspacePath: "/workspace",
          workspaceKind: "clone",
          tmuxSessionName: "pf-b_meta_review_gate_respawn_fail",
          updatedAt: "2026-04-13T00:10:00.000Z",
          metaReviewerPane: {
            role: "meta-reviewer",
            paneIndex: 4,
            active: true,
            updatedAt: "2026-04-13T00:10:00.000Z"
          }
        }
      }),
      notifySubmissionRequest,
      runTmuxRunner: vi.fn(),
      buildAgentCommand: vi.fn(() => "codex meta-review"),
      respawnTmuxPaneCommand: vi.fn(async () => {
        throw new Error("respawn denied");
      }),
      sessionsPath: "/repo/.pairflow/runtime/sessions.json",
      bubbleId: "b_meta_review_gate_respawn_fail",
      round: 3,
      now: new Date("2026-04-13T00:10:00.000Z"),
      taskArtifactPath: "/repo/.pairflow/bubbles/b_meta_review_gate_respawn_fail/artifacts/task.md",
      pairflowCommandProfile: "external"
    });

    expect(result.shouldDeactivate).toBe(true);
    expect(result.delivery).toEqual({
      status: "failed",
      reasonCode: "META_REVIEWER_PANE_RESPAWN_FAILED",
      message: "META_REVIEWER_PANE_RESPAWN_FAILED: respawn denied"
    });
    expect(notifySubmissionRequest).not.toHaveBeenCalled();
  });
});
