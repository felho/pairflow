import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  applyMetaReviewGateOnConvergenceV11,
  notifyMetaReviewerSubmissionRequestV11
} from "../../../../src/v11/application/metaReviewGate/emitMetaReviewGateV11.js";
import type {
  MetaReviewGateRuntimeCapabilities,
  MetaReviewRuntimeDeliveryObservation,
  NotifyMetaReviewerSubmissionRequestDependencies,
  ResolveMetaReviewerPaneWarning
} from "../../../../src/v11/application/metaReviewGate/metaReviewGateCommandContract.js";
import { readStateSnapshot } from "../../../../src/v11/infrastructure/state/stateStore.js";
import { setupRunningBubbleFixture } from "../../../helpers/bubble.js";
import { initGitRepository } from "../../../helpers/git.js";

const tempDirs: string[] = [];

async function createTempRepo(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-meta-review-gate-v11-"));
  tempDirs.push(root);
  await initGitRepository(root);
  return root;
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((path) =>
      rm(path, { recursive: true, force: true })
    )
  );
});

async function applyWithResolvedDelivery(input: {
  delivery: MetaReviewRuntimeDeliveryObservation;
  shouldDeactivate: boolean;
}) {
  const repoPath = await createTempRepo();
  const bubble = await setupRunningBubbleFixture({
    repoPath,
    bubbleId: `b_meta_review_apply_v11_${input.delivery.status}`,
    task: `Verify ${input.delivery.status} delivery persistence through the V11 wrapper.`
  });
  const paneBindingCalls: boolean[] = [];

  const result = await applyMetaReviewGateOnConvergenceV11({
    bubbleId: bubble.bubbleId,
    repoPath,
    summary: "Ready for meta-review.",
    now: new Date("2026-03-13T12:15:00.000Z")
  }, {
    resolveMetaReviewerPaneWarning: async () => ({
      delivery: input.delivery,
      shouldDeactivate: input.shouldDeactivate
    }),
    setMetaReviewerPaneBinding: async ({ active }) => {
      paneBindingCalls.push(active);
      return {
        updated: false as const,
        reason: "no_runtime_session" as const
      };
    },
    notifyMetaReviewerSubmissionRequest: async () => ({
      status: "confirmed" as const,
      reasonCode: null,
      message: "ok"
    })
  });

  const persisted = await readStateSnapshot(bubble.paths.statePath);
  return {
    result,
    persisted,
    paneBindingCalls
  };
}

describe("metaReviewGate V11 defaults", () => {
  it("keeps the notify default runner when caller override explicitly passes undefined", async () => {
    const observedRunner: unknown[] = [];
    const runtime: NonNullable<
      NotifyMetaReviewerSubmissionRequestDependencies["runtime"]
    > = {
      tmux: {
        maybeAcceptTrustPrompt: async () => undefined,
        sendSubmissionRequestMessage: async (runner) => {
          observedRunner.push(runner);
          throw new Error("stop after runner capture");
        },
        submitPaneInput: async () => undefined
      }
    };
    Object.assign(
      runtime.tmux as Record<string, unknown>,
      { runner: undefined }
    );

    const result = await notifyMetaReviewerSubmissionRequestV11({
      bubbleId: "b_meta_review_notify_v11_runner_default",
      round: 4,
      targetPane: "pf-b_meta_review_notify_v11_runner_default:0.3"
    }, {
      runtime
    });

    expect(result).toEqual({
      status: "failed",
      reasonCode: "META_REVIEW_REQUEST_DELIVERY_FAILED",
      message: "stop after runner capture"
    });
    expect(observedRunner).toHaveLength(1);
    expect(typeof observedRunner[0]).toBe("function");
  });

  it("injects default runtime authority into explicit resolve overrides without caller runtime", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_review_apply_v11_custom_resolve",
      task: "Verify explicit resolve overrides keep default runtime authority."
    });
    const observedRuntime: unknown[] = [];
    const resolveMetaReviewerPaneWarning: ResolveMetaReviewerPaneWarning = async (
      input
    ) => {
      observedRuntime.push(input.runtime);
      return {
        delivery: {
          status: "confirmed",
          reasonCode: null,
          message: "ok"
        },
        shouldDeactivate: false
      };
    };

    const result = await applyMetaReviewGateOnConvergenceV11({
      bubbleId: bubble.bubbleId,
      repoPath,
      summary: "Ready for meta-review.",
      now: new Date("2026-03-13T12:00:00.000Z")
    }, {
      resolveMetaReviewerPaneWarning,
      setMetaReviewerPaneBinding: async () => ({
        updated: false as const,
        reason: "no_runtime_session" as const
      }),
      notifyMetaReviewerSubmissionRequest: async () => ({
        status: "confirmed" as const,
        reasonCode: null,
        message: "ok"
      })
    });

    expect(result.route).toBe("meta_review_running");
    expect(observedRuntime).toHaveLength(1);
    expect(typeof (observedRuntime[0] as {
      notify?: { tmux?: { runner?: unknown } };
    }).notify?.tmux?.runner).toBe("function");
    expect(typeof (observedRuntime[0] as {
      notify?: {
        tmux?: {
          sendSubmissionRequestMessage?: unknown;
          submitPaneInput?: unknown;
        };
      };
    }).notify?.tmux?.sendSubmissionRequestMessage).toBe("function");
    expect(typeof (observedRuntime[0] as {
      notify?: {
        tmux?: {
          sendSubmissionRequestMessage?: unknown;
          submitPaneInput?: unknown;
        };
      };
    }).notify?.tmux?.submitPaneInput).toBe("function");
    expect(typeof (observedRuntime[0] as {
      paneBinding?: {
        tmux?: {
          runner?: unknown;
          respawnPaneCommand?: unknown;
        };
        buildAgentCommand?: unknown;
      };
    }).paneBinding?.tmux?.runner).toBe("function");
    expect(typeof (observedRuntime[0] as {
      paneBinding?: {
        tmux?: {
          runner?: unknown;
          respawnPaneCommand?: unknown;
        };
        buildAgentCommand?: unknown;
      };
    }).paneBinding?.buildAgentCommand).toBe("function");
    expect(typeof (observedRuntime[0] as {
      paneBinding?: {
        tmux?: {
          runner?: unknown;
          respawnPaneCommand?: unknown;
        };
        buildAgentCommand?: unknown;
      };
    }).paneBinding?.tmux?.respawnPaneCommand).toBe("function");
  });

  it("keeps explicit notify overrides canonical while avoiding default helper injection", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_review_apply_v11_custom_notify",
      task: "Verify explicit notify overrides preserve caller runtime."
    });
    const observedRuntime: Array<
      NonNullable<NotifyMetaReviewerSubmissionRequestDependencies["runtime"]>
    > = [];
    const runtime: MetaReviewGateRuntimeCapabilities = {
      notify: {
        tmux: {
          sendSubmissionRequestMessage: async () => undefined,
          submitPaneInput: async () => undefined
        }
      },
      paneBinding: {
        buildAgentCommand: () => "codex meta-review",
        tmux: {
          runner: async () => ({
            stdout: "",
            stderr: "",
            exitCode: 0
          }),
          respawnPaneCommand: async () => undefined
        }
      }
    };

    const result = await applyMetaReviewGateOnConvergenceV11({
      bubbleId: bubble.bubbleId,
      repoPath,
      summary: "Ready for meta-review.",
      now: new Date("2026-03-13T12:05:00.000Z")
    }, {
      runtime,
      setMetaReviewerPaneBinding: async ({ bubbleId: targetBubbleId, active }) => ({
        updated: true,
        record: {
          bubbleId: targetBubbleId,
          repoPath,
          worktreePath: bubble.paths.worktreePath,
          workspacePath: bubble.paths.worktreePath,
          workspaceKind: "worktree",
          tmuxSessionName: "pf-meta-review-v11-custom-notify",
          updatedAt: "2026-03-13T12:05:00.000Z",
          metaReviewerPane: {
            role: "meta-reviewer",
            paneIndex: 3,
            active,
            updatedAt: "2026-03-13T12:05:00.000Z"
          }
        }
      }),
      notifyMetaReviewerSubmissionRequest: async (_input, dependencies = {}) => {
        if (dependencies.runtime === undefined) {
          throw new Error("expected notify runtime");
        }
        observedRuntime.push(dependencies.runtime);
        return {
          status: "confirmed",
          reasonCode: null,
          message: "ok"
        };
      }
    });

    expect(result.route).toBe("meta_review_running");
    expect(observedRuntime).toHaveLength(1);
    expect(typeof observedRuntime[0]?.tmux?.runner).toBe("function");
    expect(typeof observedRuntime[0]?.tmux?.sendSubmissionRequestMessage).toBe("function");
    expect(typeof observedRuntime[0]?.tmux?.submitPaneInput).toBe("function");
    expect(observedRuntime[0]?.tmux?.maybeAcceptTrustPrompt).toBeUndefined();
  });

  it("confirms built-in pane-binding and notify delivery without trust-prompt helper", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_review_apply_v11_builtin_delivery",
      task: "Verify built-in pane-binding and notify delivery."
    });
    const submittedMessages: string[] = [];
    const notifyRunner = async () => ({
      stdout: submittedMessages.at(-1) ?? "",
      stderr: "",
      exitCode: 0
    });
    const paneRunnerCalls: string[] = [];

    const result = await applyMetaReviewGateOnConvergenceV11({
      bubbleId: bubble.bubbleId,
      repoPath,
      summary: "Ready for meta-review.",
      now: new Date("2026-03-13T12:10:00.000Z")
    }, {
      runtime: {
        notify: {
          tmux: {
            runner: notifyRunner,
            sendSubmissionRequestMessage: async (_runner, _targetPane, message) => {
              submittedMessages.push(message);
            },
            submitPaneInput: async () => undefined
          }
        },
        paneBinding: {
          buildAgentCommand: () => "codex meta-review",
          tmux: {
            runner: async () => ({
              stdout: "",
              stderr: "",
              exitCode: 0
            }),
            respawnPaneCommand: async ({ command, runner }) => {
              paneRunnerCalls.push(command);
              expect(typeof runner).toBe("function");
            }
          }
        }
      },
      setMetaReviewerPaneBinding: async ({ bubbleId: targetBubbleId, active }) => ({
        updated: true,
        record: {
          bubbleId: targetBubbleId,
          repoPath,
          worktreePath: bubble.paths.worktreePath,
          workspacePath: bubble.paths.worktreePath,
          workspaceKind: "worktree",
          tmuxSessionName: "pf-meta-review-v11-builtin-delivery",
          updatedAt: "2026-03-13T12:10:00.000Z",
          metaReviewerPane: {
            role: "meta-reviewer",
            paneIndex: 3,
            active,
            updatedAt: "2026-03-13T12:10:00.000Z"
          }
        }
      })
    });

    expect(result.route).toBe("meta_review_running");
    expect(paneRunnerCalls).toEqual(["codex meta-review"]);
    expect(submittedMessages).toHaveLength(1);
    expect(submittedMessages[0]).toContain(
      "bubble=b_meta_review_apply_v11_builtin_delivery meta-review request round=1."
    );
    expect(
      result.state.meta_review?.runtime_delivery
    ).toMatchObject({
      status: "confirmed",
      reason_code: null
    });
  });

  it("persists failed runtime delivery through the V11 emit/apply boundary", async () => {
    const delivery: MetaReviewRuntimeDeliveryObservation = {
      status: "failed",
      reasonCode: "META_REVIEW_REQUEST_DELIVERY_RUNTIME_UNAVAILABLE",
      message: "meta-review gate notify runtime capabilities are unavailable."
    };

    const { result, persisted, paneBindingCalls } = await applyWithResolvedDelivery({
      delivery,
      shouldDeactivate: false
    });

    expect(result.route).toBe("meta_review_running");
    expect(result.state.meta_review?.runtime_delivery).toMatchObject({
      status: "failed",
      reason_code: "META_REVIEW_REQUEST_DELIVERY_RUNTIME_UNAVAILABLE",
      message: delivery.message
    });
    expect(persisted.state.meta_review?.runtime_delivery).toMatchObject({
      status: "failed",
      reason_code: "META_REVIEW_REQUEST_DELIVERY_RUNTIME_UNAVAILABLE",
      message: delivery.message
    });
    expect(paneBindingCalls).toEqual([]);
  });

  it("persists uncertain runtime delivery and deactivates on non-confirmed outcomes", async () => {
    const delivery: MetaReviewRuntimeDeliveryObservation = {
      status: "uncertain",
      reasonCode: "META_REVIEW_REQUEST_DELIVERY_UNCONFIRMED",
      message: "meta-reviewer pane did not confirm structured submit request delivery."
    };

    const { result, persisted, paneBindingCalls } = await applyWithResolvedDelivery({
      delivery,
      shouldDeactivate: true
    });

    expect(result.route).toBe("meta_review_running");
    expect(result.state.meta_review?.runtime_delivery).toMatchObject({
      status: "uncertain",
      reason_code: "META_REVIEW_REQUEST_DELIVERY_UNCONFIRMED",
      message: delivery.message
    });
    expect(persisted.state.meta_review?.runtime_delivery).toMatchObject({
      status: "uncertain",
      reason_code: "META_REVIEW_REQUEST_DELIVERY_UNCONFIRMED",
      message: delivery.message
    });
    expect(paneBindingCalls).toEqual([false]);
  });

  it("does not deactivate when delivery is confirmed even if pane binding asks for deactivation", async () => {
    const { result, persisted, paneBindingCalls } = await applyWithResolvedDelivery({
      delivery: {
        status: "confirmed",
        reasonCode: null,
        message: "meta-review submit request delivery confirmed from pane scrollback."
      },
      shouldDeactivate: true
    });

    expect(result.route).toBe("meta_review_running");
    expect(result.state.meta_review?.runtime_delivery).toMatchObject({
      status: "confirmed",
      reason_code: null
    });
    expect(persisted.state.meta_review?.runtime_delivery).toMatchObject({
      status: "confirmed",
      reason_code: null
    });
    expect(paneBindingCalls).toEqual([]);
  });
});
