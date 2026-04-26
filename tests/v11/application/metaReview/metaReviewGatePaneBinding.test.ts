import { describe, expect, it, vi } from "vitest";

import {
  getTopologySlotPaneIndexForRole
} from "../../../../src/v11/application/actorProtocol/roleDescriptorRegistry.js";
import {
  resolveMetaReviewerPaneWarning
} from "../../../../src/v11/application/metaReviewGate/metaReviewGatePaneBinding.js";
import type {
  SetMetaReviewerPaneBindingPort
} from "../../../../src/v11/shared/ports/runtimeSessions.js";
import type {
  NotifyMetaReviewerSubmissionRequestDependencies
} from "../../../../src/v11/shared/metaReviewGate/metaReviewGateTypes.js";

function resolveRuntimeFromNotifyCall(
  call: unknown
): NotifyMetaReviewerSubmissionRequestDependencies["runtime"] {
  if (!Array.isArray(call) || call.length < 2) {
    throw new Error("notifySubmissionRequest call is missing dependency payload.");
  }
  return (call[1] as NotifyMetaReviewerSubmissionRequestDependencies).runtime;
}

describe("metaReviewGatePaneBinding", () => {
  it("returns runtime-unavailable when agent command builder is missing", async () => {
    const result = await resolveMetaReviewerPaneWarning({
      setMetaReviewerPane: vi.fn(),
      notifySubmissionRequest: vi.fn(),
      sessionsPath: "/repo/.pairflow/runtime/sessions.json",
      bubbleId: "b_meta_review_gate_missing_builder",
      round: 1,
      now: new Date("2026-04-13T00:00:00.000Z"),
      taskArtifactPath: "/repo/.pairflow/bubbles/b_meta_review_gate_missing_builder/artifacts/task.md",
      pairflowCommandProfile: "external",
      metaReviewerAgent: "codex"
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
      runtime: {
        paneBinding: {
          buildAgentCommand: vi.fn(() => "codex meta-review")
        }
      },
      sessionsPath: "/repo/.pairflow/runtime/sessions.json",
      bubbleId: "b_meta_review_gate_missing_respawn",
      round: 1,
      now: new Date("2026-04-13T00:00:00.000Z"),
      taskArtifactPath: "/repo/.pairflow/bubbles/b_meta_review_gate_missing_respawn/artifacts/task.md",
      pairflowCommandProfile: "external",
      metaReviewerAgent: "codex"
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
      runtime: {
        paneBinding: {
          buildAgentCommand: vi.fn(() => "codex meta-review"),
          tmux: {
            runner: vi.fn(),
            respawnPaneCommand: vi.fn(async () => undefined)
          }
        }
      },
      sessionsPath: "/repo/.pairflow/runtime/sessions.json",
      bubbleId: "b_meta_review_gate_no_runtime",
      round: 1,
      now: new Date("2026-04-13T00:00:00.000Z"),
      taskArtifactPath: "/repo/.pairflow/bubbles/b_meta_review_gate_no_runtime/artifacts/task.md",
      pairflowCommandProfile: "external",
      metaReviewerAgent: "codex"
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
    const respawnPaneCommand = vi.fn();
    const result = await resolveMetaReviewerPaneWarning({
      setMetaReviewerPane: vi.fn(async () => ({
        updated: true as const,
        reason: "durable_handoff_only" as const
      })),
      runtime: {
        paneBinding: {
          buildAgentCommand: vi.fn(() => "codex meta-review"),
          tmux: {
            runner: vi.fn(),
            respawnPaneCommand
          }
        }
      },
      sessionsPath: "/repo/.pairflow/runtime/sessions.json",
      bubbleId: "b_meta_review_gate_durable_handoff",
      round: 1,
      now: new Date("2026-04-13T00:00:00.000Z"),
      taskArtifactPath: "/repo/.pairflow/bubbles/b_meta_review_gate_durable_handoff/artifacts/task.md",
      pairflowCommandProfile: "external",
      metaReviewerAgent: "codex"
    });

    expect(result).toEqual({
      delivery: {
        status: "confirmed",
        reasonCode: null,
        message: "meta-review submit request uses durable handoff only; no pane binding update required."
      },
      shouldDeactivate: false
    });
    expect(respawnPaneCommand).not.toHaveBeenCalled();
  });

  it("fails closed when pane binding reports updated without record or durable handoff reason", async () => {
    const notifySubmissionRequest = vi.fn();
    const result = await resolveMetaReviewerPaneWarning({
      setMetaReviewerPane: vi.fn(async () => (
        { updated: true as const } as unknown as Awaited<
          ReturnType<SetMetaReviewerPaneBindingPort>
        >
      )),
      notifySubmissionRequest,
      runtime: {
        paneBinding: {
          buildAgentCommand: vi.fn(() => "codex meta-review"),
          tmux: {
            runner: vi.fn(),
            respawnPaneCommand: vi.fn(async () => undefined)
          }
        }
      },
      sessionsPath: "/repo/.pairflow/runtime/sessions.json",
      bubbleId: "b_meta_review_gate_invalid_updated_without_record",
      round: 1,
      now: new Date("2026-04-13T00:00:00.000Z"),
      taskArtifactPath: "/repo/.pairflow/bubbles/b_meta_review_gate_invalid_updated_without_record/artifacts/task.md",
      pairflowCommandProfile: "external",
      metaReviewerAgent: "codex"
    });

    expect(result).toEqual({
      delivery: {
        status: "failed",
        reasonCode: "META_REVIEWER_PANE_RUNTIME_UNAVAILABLE",
        message: "meta-review gate pane binding updated without runtime session record authority."
      },
      shouldDeactivate: false
    });
    expect(notifySubmissionRequest).not.toHaveBeenCalled();
  });

  it("fails closed when runtime workspace authority is absent", async () => {
    const buildAgentCommand = vi.fn(() => "codex meta-review");
    const notifySubmissionRequest = vi.fn(async () => ({
      status: "confirmed" as const,
      reasonCode: null,
      message: "delivered"
    }));
    const respawnPaneCommand = vi.fn(async () => undefined);

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
      runtime: {
        paneBinding: {
          buildAgentCommand,
          tmux: {
            runner: vi.fn(),
            respawnPaneCommand
          }
        }
      },
      sessionsPath: "/repo/.pairflow/runtime/sessions.json",
      bubbleId: "b_meta_review_gate_legacy_workspace",
      round: 2,
      now: new Date("2026-04-13T00:00:00.000Z"),
      taskArtifactPath: "/repo/.pairflow/bubbles/b_meta_review_gate_legacy_workspace/artifacts/task.md",
      pairflowCommandProfile: "external",
      metaReviewerAgent: "codex"
    });

    expect(result).toEqual({
      delivery: {
        status: "failed",
        reasonCode: "META_REVIEWER_PANE_UNAVAILABLE",
        message:
          "META_REVIEWER_PANE_UNAVAILABLE: Bubble b_meta_review_gate_legacy_workspace cannot bind meta-review pane because runtime workspace authority is empty."
      },
      shouldDeactivate: true
    });
    expect(buildAgentCommand).not.toHaveBeenCalled();
    expect(respawnPaneCommand).not.toHaveBeenCalled();
    expect(notifySubmissionRequest).not.toHaveBeenCalled();
  });

  it("fails closed when clone-mode session has no canonical workspace authority", async () => {
    const notifySubmissionRequest = vi.fn(async () => ({
      status: "confirmed" as const,
      reasonCode: null,
      message: "delivered"
    }));
    const respawnPaneCommand = vi.fn(async () => undefined);

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
      runtime: {
        paneBinding: {
          buildAgentCommand: vi.fn(() => "codex meta-review"),
          tmux: {
            runner: vi.fn(),
            respawnPaneCommand
          }
        }
      },
      sessionsPath: "/repo/.pairflow/runtime/sessions.json",
      bubbleId: "b_meta_review_gate_clone_fallback_forbidden",
      round: 2,
      now: new Date("2026-04-13T00:05:00.000Z"),
      taskArtifactPath: "/repo/.pairflow/bubbles/b_meta_review_gate_clone_fallback_forbidden/artifacts/task.md",
      pairflowCommandProfile: "external",
      metaReviewerAgent: "codex"
    });

    expect(result).toEqual({
      delivery: {
        status: "failed",
        reasonCode: "META_REVIEWER_PANE_UNAVAILABLE",
        message:
          "META_REVIEWER_PANE_UNAVAILABLE: Bubble b_meta_review_gate_clone_fallback_forbidden cannot bind meta-review pane because runtime workspace authority is empty."
      },
      shouldDeactivate: true
    });
    expect(respawnPaneCommand).not.toHaveBeenCalled();
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
      runtime: {
        paneBinding: {
          buildAgentCommand: vi.fn(() => "codex meta-review"),
          tmux: {
            runner: vi.fn(),
            respawnPaneCommand: vi.fn(async () => {
              throw new Error("respawn denied");
            })
          }
        }
      },
      sessionsPath: "/repo/.pairflow/runtime/sessions.json",
      bubbleId: "b_meta_review_gate_respawn_fail",
      round: 3,
      now: new Date("2026-04-13T00:10:00.000Z"),
      taskArtifactPath: "/repo/.pairflow/bubbles/b_meta_review_gate_respawn_fail/artifacts/task.md",
      pairflowCommandProfile: "external",
      metaReviewerAgent: "codex"
    });

    expect(result.shouldDeactivate).toBe(true);
    expect(result.delivery).toEqual({
      status: "failed",
      reasonCode: "META_REVIEWER_PANE_RESPAWN_FAILED",
      message: "META_REVIEWER_PANE_RESPAWN_FAILED: respawn denied"
    });
    expect(notifySubmissionRequest).not.toHaveBeenCalled();
  });

  it("fails closed after respawn when notify capability is absent on the active pane path", async () => {
    const result = await resolveMetaReviewerPaneWarning({
      setMetaReviewerPane: async () => ({
        updated: true,
        record: {
          bubbleId: "b_meta_review_gate_notify_missing_after_respawn",
          repoPath: "/repo",
          worktreePath: "/worktree",
          workspacePath: "/workspace",
          workspaceKind: "clone",
          tmuxSessionName: "pf-b_meta_review_gate_notify_missing_after_respawn",
          updatedAt: "2026-04-13T00:12:00.000Z",
          metaReviewerPane: {
            role: "meta-reviewer",
            paneIndex: 4,
            active: true,
            updatedAt: "2026-04-13T00:12:00.000Z"
          }
        }
      }),
      runtime: {
        paneBinding: {
          buildAgentCommand: vi.fn(() => "codex meta-review"),
          tmux: {
            runner: vi.fn(),
            respawnPaneCommand: vi.fn(async () => undefined)
          }
        }
      },
      sessionsPath: "/repo/.pairflow/runtime/sessions.json",
      bubbleId: "b_meta_review_gate_notify_missing_after_respawn",
      round: 3,
      now: new Date("2026-04-13T00:12:00.000Z"),
      taskArtifactPath: "/repo/.pairflow/bubbles/b_meta_review_gate_notify_missing_after_respawn/artifacts/task.md",
      pairflowCommandProfile: "external",
      metaReviewerAgent: "codex"
    });

    expect(result).toEqual({
      delivery: {
        status: "failed",
        reasonCode: "META_REVIEW_REQUEST_DELIVERY_RUNTIME_UNAVAILABLE",
        message: "meta-review gate notify capability is unavailable."
      },
      shouldDeactivate: true
    });
  });

  it("forwards notify runtime and falls back to pane-binding runner on successful rebinding", async () => {
    const paneRunner = vi.fn();
    const notifyRunner = vi.fn();
    const buildAgentCommand = vi.fn(() => "codex meta-review");
    const respawnPaneCommand = vi.fn(async () => undefined);
    const notifySubmissionRequest = vi.fn(async () => ({
      status: "confirmed" as const,
      reasonCode: null,
      message: "delivered"
    }));

    const result = await resolveMetaReviewerPaneWarning({
      setMetaReviewerPane: async () => ({
        updated: true,
        record: {
          bubbleId: "b_meta_review_gate_notify_forwarding",
          repoPath: "/repo",
          worktreePath: "/worktree",
          workspacePath: "/workspace",
          workspaceKind: "clone",
          tmuxSessionName: "pf-b_meta_review_gate_notify_forwarding",
          updatedAt: "2026-04-13T00:15:00.000Z",
          metaReviewerPane: {
            role: "meta-reviewer",
            paneIndex: 5,
            active: true,
            updatedAt: "2026-04-13T00:15:00.000Z"
          }
        }
      }),
      notifySubmissionRequest,
      runtime: {
        notify: {
          tmux: {
            runner: notifyRunner,
            sendSubmissionRequestMessage: vi.fn(async () => undefined),
            submitPaneInput: vi.fn(async () => undefined)
          }
        },
        paneBinding: {
          buildAgentCommand,
          tmux: {
            runner: paneRunner,
            respawnPaneCommand
          }
        }
      },
      sessionsPath: "/repo/.pairflow/runtime/sessions.json",
      bubbleId: "b_meta_review_gate_notify_forwarding",
      round: 4,
      now: new Date("2026-04-13T00:15:00.000Z"),
      taskArtifactPath: "/repo/.pairflow/bubbles/b_meta_review_gate_notify_forwarding/artifacts/task.md",
      pairflowCommandProfile: "external",
      metaReviewerAgent: "codex"
    });

    expect(result).toEqual({
      delivery: {
        status: "confirmed",
        reasonCode: null,
        message: "delivered"
      },
      shouldDeactivate: true
    });
    expect(buildAgentCommand).toHaveBeenCalledTimes(1);
    expect(respawnPaneCommand).toHaveBeenCalledWith({
      sessionName: "pf-b_meta_review_gate_notify_forwarding",
      paneIndex: getTopologySlotPaneIndexForRole("meta_reviewer"),
      cwd: "/workspace",
      command: "codex meta-review",
      runner: paneRunner
    });
    expect(notifySubmissionRequest).toHaveBeenCalledWith({
      bubbleId: "b_meta_review_gate_notify_forwarding",
      metaReviewerAgent: "codex",
      round: 4,
      targetPane: `pf-b_meta_review_gate_notify_forwarding:0.${String(
        getTopologySlotPaneIndexForRole("meta_reviewer")
      )}`
    }, expect.anything());
    const notifyForwardingCall = notifySubmissionRequest.mock.calls.at(-1);
    expect(notifyForwardingCall).toBeDefined();
    const notifyRuntime = resolveRuntimeFromNotifyCall(notifyForwardingCall);
    expect(notifyRuntime?.tmux?.runner).toBe(notifyRunner);
    expect(typeof notifyRuntime?.tmux?.sendSubmissionRequestMessage).toBe("function");
    expect(typeof notifyRuntime?.tmux?.submitPaneInput).toBe("function");
  });

  it("falls back to pane-binding runner when notify runtime has no runner", async () => {
    const paneRunner = vi.fn();
    const notifySubmissionRequest = vi.fn(async () => ({
      status: "confirmed" as const,
      reasonCode: null,
      message: "delivered"
    }));

    await resolveMetaReviewerPaneWarning({
      setMetaReviewerPane: async () => ({
        updated: true,
        record: {
          bubbleId: "b_meta_review_gate_notify_runner_fallback",
          repoPath: "/repo",
          worktreePath: "/worktree",
          workspacePath: "/workspace",
          workspaceKind: "clone",
          tmuxSessionName: "pf-b_meta_review_gate_notify_runner_fallback",
          updatedAt: "2026-04-13T00:20:00.000Z",
          metaReviewerPane: {
            role: "meta-reviewer",
            paneIndex: 3,
            active: true,
            updatedAt: "2026-04-13T00:20:00.000Z"
          }
        }
      }),
      notifySubmissionRequest,
      runtime: {
        notify: {
          tmux: {
            sendSubmissionRequestMessage: vi.fn(async () => undefined),
            submitPaneInput: vi.fn(async () => undefined)
          }
        },
        paneBinding: {
          buildAgentCommand: vi.fn(() => "codex meta-review"),
          tmux: {
            runner: paneRunner,
            respawnPaneCommand: vi.fn(async () => undefined)
          }
        }
      },
      sessionsPath: "/repo/.pairflow/runtime/sessions.json",
      bubbleId: "b_meta_review_gate_notify_runner_fallback",
      round: 2,
      now: new Date("2026-04-13T00:20:00.000Z"),
      taskArtifactPath: "/repo/.pairflow/bubbles/b_meta_review_gate_notify_runner_fallback/artifacts/task.md",
      pairflowCommandProfile: "external",
      metaReviewerAgent: "codex"
    });

    expect(notifySubmissionRequest).toHaveBeenCalledWith(expect.anything(), expect.anything());
    const fallbackCall = notifySubmissionRequest.mock.calls.at(-1);
    expect(fallbackCall).toBeDefined();
    const fallbackRuntime = resolveRuntimeFromNotifyCall(fallbackCall);
    expect(fallbackRuntime?.tmux?.runner).toBe(paneRunner);
    expect(typeof fallbackRuntime?.tmux?.sendSubmissionRequestMessage).toBe("function");
    expect(typeof fallbackRuntime?.tmux?.submitPaneInput).toBe("function");
  });

});
