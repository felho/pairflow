import { describe, expect, it, vi } from "vitest";

import { createApiClient, PairflowApiError } from "./api";
import type {
  UiActionBubbleState,
  UiActionEvent,
  UiAttachBubbleResult,
  UiEmitApprovalDecisionResult,
  UiEmitHumanReplyResult,
  UiEmitRequestReworkImmediateResult,
  UiEmitRequestReworkQueuedResult,
  UiStopBubbleResult
} from "./contracts/uiActions";
import {
  bubbleDetail,
  bubbleSummary,
  repoSummary,
  timelineDisplayItem
} from "../test/fixtures";

async function captureError(action: () => Promise<unknown>): Promise<unknown> {
  try {
    await action();
    return null;
  } catch (error) {
    return error;
  }
}

describe("createApiClient", () => {
  it("loads repositories and bubbles", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ repos: ["/repo-a"] }), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            repo: repoSummary("/repo-a"),
            bubbles: [bubbleSummary({ bubbleId: "b-a", repoPath: "/repo-a" })]
          }),
          { status: 200 }
        )
      );

    vi.stubGlobal("fetch", fetchMock);

    const client = createApiClient();
    await expect(client.getRepos()).resolves.toEqual(["/repo-a"]);
    await expect(client.getBubbles("/repo-a")).resolves.toMatchObject({
      repo: {
        repoPath: "/repo-a"
      },
      bubbles: [
        {
          bubbleId: "b-a"
        }
      ]
    });

    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/repos", undefined);
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/bubbles?repo=%2Frepo-a",
      undefined
    );
  });

  it("throws typed api errors", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: "not_found",
            message: "Unknown repo"
          }
        }),
        { status: 404 }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const client = createApiClient();

    const error = await captureError(() => client.getRepos());
    expect(error).toBeInstanceOf(PairflowApiError);
    expect(error).toMatchObject({
      name: "PairflowApiError",
      status: 404,
      code: "not_found",
      message: "Unknown repo"
    });
  });

  it("returns PairflowApiError on non-JSON error body", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("<html>bad gateway</html>", {
        status: 502,
        headers: {
          "content-type": "text/html"
        }
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const client = createApiClient();
    const error = await captureError(() => client.getRepos());

    expect(error).toBeInstanceOf(PairflowApiError);
    expect(error).toMatchObject({
      status: 502,
      code: "unknown",
      message: "API request failed: 502"
    });
  });

  it("preserves degraded review-policy conflict details on 409 responses", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: "conflict",
            message: "review policy conflict",
            details: {
              reasonCode: "REVIEW_POLICY_WRITE_CONFLICT",
              reviewPolicyConflict: {
                bubbleId: "b-a",
                repoPath: "/repo-a",
                currentState: null,
                bubbleToml: "id = \"b-a\"\nreview_loop_mode = \"meta_only\"\n",
                reviewPolicy: {
                  requested_loop_mode: "meta_only",
                  effective_loop_mode: "full",
                  support_status: "guarded",
                  reviewer_blocking_min_severity: "P1",
                  meta_review_auto_rework_min_severity: "P1",
                  meta_review_consecutive_clean_runs_required: 1,
                  blocked_reason_code: "REVIEW_POLICY_META_ONLY_GUARDED"
                }
              }
            }
          }
        }),
        { status: 409 }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const client = createApiClient();
    const error = await captureError(() =>
      client.updateReviewPolicy("/repo-a", "b-a", {
        reviewLoopMode: "meta_only",
        expectedBubbleToml: "id = \"b-a\"\n"
      })
    );

    expect(error).toBeInstanceOf(PairflowApiError);
    expect(error).toMatchObject({
      status: 409,
      code: "conflict",
      details: {
        reasonCode: "REVIEW_POLICY_WRITE_CONFLICT",
        reviewPolicyConflict: {
          bubbleId: "b-a",
          repoPath: "/repo-a",
          currentState: null,
          bubbleToml: "id = \"b-a\"\nreview_loop_mode = \"meta_only\"\n",
          reviewPolicy: {
            requested_loop_mode: "meta_only",
            effective_loop_mode: "full",
            support_status: "guarded",
            reviewer_blocking_min_severity: "P1",
            meta_review_auto_rework_min_severity: "P1",
            meta_review_consecutive_clean_runs_required: 1,
            blocked_reason_code: "REVIEW_POLICY_META_ONLY_GUARDED"
          }
        }
      }
    });
  });

  it("calls detail/timeline endpoints and posts action payloads", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ bubble: bubbleDetail({ bubbleId: "b-a", repoPath: "/repo-a" }) }), {
          status: 200
        })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            bubbleId: "b-a",
            repoPath: "/repo-a",
            timeline: [timelineDisplayItem()]
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            result: {
              bubbleId: "b-a",
              actionState: {
                bubbleId: "b-a",
                lifecycleState: "RUNNING",
                round: 1,
                activeAgent: "codex",
                activeRole: "implementer",
                activeSince: "2026-02-25T00:00:00.000Z",
                lastCommandAt: "2026-02-25T00:00:01.000Z",
                executionContext: null
              },
              tmuxSessionName: "pf-b-a",
              worktreePath: "/tmp/worktrees/b-a"
            }
          }),
          {
          status: 200
          }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            result: {
              bubbleId: "b-a",
              sequence: 4,
              event: {
                id: "env-commit-1",
                timestamp: "2026-02-25T00:02:00.000Z",
                bubbleId: "b-a",
                sender: "orchestrator",
                recipient: "human",
                type: "COMMIT_RESULT",
                round: 1,
                refs: ["artifacts/commit-evidence.md"],
                summary: "Committed abc123."
              },
              actionState: {
                bubbleId: "b-a",
                lifecycleState: "DONE",
                round: 1,
                activeAgent: null,
                activeRole: null,
                activeSince: null,
                lastCommandAt: "2026-02-25T00:02:00.000Z",
                executionContext: null
              },
              commitSha: "abc123",
              commitMessage: "Commit message",
              stagedFiles: ["src/example.ts"]
            }
          }),
          {
            status: 200
          }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            result: {
              kind: "review_policy_updated",
              bubbleId: "b-a",
              reviewPolicy: {
                requested_loop_mode: "meta_only",
                effective_loop_mode: "full",
                support_status: "guarded",
                reviewer_blocking_min_severity: "P1",
                meta_review_auto_rework_min_severity: "P1",
                meta_review_consecutive_clean_runs_required: 1,
                blocked_reason_code: "REVIEW_POLICY_META_ONLY_GUARDED"
              },
              previousRequestedLoopMode: "full",
              nextRequestedLoopMode: "meta_only",
              activationChange: "none",
              bubbleToml: "..."
            }
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            result: {
              bubbleId: "b-a",
              deleted: false,
              requiresConfirmation: true,
              artifacts: {
                worktree: {
                  exists: true,
                  path: "/tmp/worktrees/b-a"
                },
                tmux: {
                  exists: true,
                  sessionName: "pf-b-a"
                },
                runtimeSession: {
                  exists: true,
                  sessionName: "pf-b-a"
                },
                branch: {
                  exists: true,
                  name: "pairflow/bubble/b-a"
                }
              },
              tmuxSessionTerminated: false,
              runtimeSessionRemoved: false,
              removedWorktree: false,
              removedBubbleBranch: false
            }
          }),
          { status: 200 }
        )
      );

    vi.stubGlobal("fetch", fetchMock);

    const client = createApiClient();
    const expectedStartActionState = {
      bubbleId: "b-a",
      lifecycleState: "RUNNING",
      round: 1,
      activeAgent: "codex",
      activeRole: "implementer",
      activeSince: "2026-02-25T00:00:00.000Z",
      lastCommandAt: "2026-02-25T00:00:01.000Z",
      executionContext: null
    };
    const expectedCommitResult = {
      bubbleId: "b-a",
      sequence: 4,
      event: {
        id: "env-commit-1",
        timestamp: "2026-02-25T00:02:00.000Z",
        bubbleId: "b-a",
        sender: "orchestrator",
        recipient: "human",
        type: "COMMIT_RESULT",
        round: 1,
        refs: ["artifacts/commit-evidence.md"],
        summary: "Committed abc123."
      },
      actionState: {
        bubbleId: "b-a",
        lifecycleState: "DONE",
        round: 1,
        activeAgent: null,
        activeRole: null,
        activeSince: null,
        lastCommandAt: "2026-02-25T00:02:00.000Z",
        executionContext: null
      },
      commitSha: "abc123",
      commitMessage: "Commit message",
      stagedFiles: ["src/example.ts"]
    };
    await expect(client.getBubble("/repo-a", "b-a")).resolves.toMatchObject({
      bubbleId: "b-a",
      repoPath: "/repo-a"
    });
    await expect(client.getBubbleTimeline("/repo-a", "b-a")).resolves.toHaveLength(1);
    await expect(client.startBubble("/repo-a", "b-a")).resolves.toStrictEqual({
      bubbleId: "b-a",
      actionState: expectedStartActionState,
      tmuxSessionName: "pf-b-a",
      worktreePath: "/tmp/worktrees/b-a"
    });
    await expect(
      client.commitBubble("/repo-a", "b-a", {
        stageAll: true,
        refs: ["artifacts/commit-evidence.md"]
      })
    ).resolves.toStrictEqual(expectedCommitResult);
    await expect(
      client.updateReviewPolicy("/repo-a", "b-a", {
        reviewLoopMode: "meta_only",
        reviewBlockingMinSeverity: "P2",
        metaReviewQualityPreset: "P3+2"
      })
    ).resolves.toMatchObject({
      bubbleId: "b-a",
      reviewPolicy: {
        requested_loop_mode: "meta_only"
      }
    });
    await expect(
      client.deleteBubble("/repo-a", "b-a", {
        force: true
      })
    ).resolves.toMatchObject({
      bubbleId: "b-a",
      requiresConfirmation: true
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/bubbles/b-a?repo=%2Frepo-a",
      undefined
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/bubbles/b-a/timeline?repo=%2Frepo-a",
      undefined
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "/api/bubbles/b-a/start?repo=%2Frepo-a",
      {
        method: "POST"
      }
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      "/api/bubbles/b-a/commit?repo=%2Frepo-a",
      {
        method: "POST",
        body: JSON.stringify({
          stageAll: true,
          refs: ["artifacts/commit-evidence.md"]
        }),
        headers: {
          "content-type": "application/json"
        }
      }
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      5,
      "/api/bubbles/b-a/update-review-policy?repo=%2Frepo-a",
      {
        method: "POST",
        body: JSON.stringify({
          reviewLoopMode: "meta_only",
          reviewBlockingMinSeverity: "P2",
          metaReviewQualityPreset: "P3+2"
        }),
        headers: {
          "content-type": "application/json"
        }
      }
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      6,
      "/api/bubbles/b-a/delete?repo=%2Frepo-a",
      {
        method: "POST",
        body: JSON.stringify({
          force: true
        }),
        headers: {
          "content-type": "application/json"
        }
      }
    );
  });

  it("posts restart action payload", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        result: {
          bubbleId: "b-a",
          actionState: {
            bubbleId: "b-a",
            lifecycleState: "RUNNING",
            round: 1,
            activeAgent: "codex",
            activeRole: "implementer",
            activeSince: "2026-02-25T00:00:00.000Z",
            lastCommandAt: "2026-02-25T00:00:01.000Z",
            executionContext: null
          },
          tmuxSessionName: "pf-b-a",
          worktreePath: "/tmp/worktrees/b-a",
          previousTmuxSessionExisted: true,
          previousRuntimeSessionRemoved: true
        }
      }), {
        status: 200
      })
    );

    vi.stubGlobal("fetch", fetchMock);

    const client = createApiClient();
    await expect(client.restartBubble("/repo-a", "b-a")).resolves.toStrictEqual({
      bubbleId: "b-a",
      actionState: {
        bubbleId: "b-a",
        lifecycleState: "RUNNING",
        round: 1,
        activeAgent: "codex",
        activeRole: "implementer",
        activeSince: "2026-02-25T00:00:00.000Z",
        lastCommandAt: "2026-02-25T00:00:01.000Z",
        executionContext: null
      },
      tmuxSessionName: "pf-b-a",
      worktreePath: "/tmp/worktrees/b-a",
      previousTmuxSessionExisted: true,
      previousRuntimeSessionRemoved: true
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/bubbles/b-a/restart?repo=%2Frepo-a",
      {
        method: "POST"
      }
    );
  });

  it("returns action DTO results for approve, rework, reply, resume, and stop", async () => {
    const expectedActionState: UiActionBubbleState = {
      bubbleId: "b-a",
      lifecycleState: "RUNNING",
      round: 2,
      activeAgent: "codex",
      activeRole: "implementer",
      activeSince: "2026-02-25T00:00:00.000Z",
      lastCommandAt: "2026-02-25T00:02:00.000Z",
      executionContext: {
        handoffId: "handoff-default",
        executionId: "execution-default"
      }
    };
    const expectedHumanEvent = {
      id: "env-human-1",
      timestamp: "2026-02-25T00:02:00.000Z",
      bubbleId: "b-a",
      sender: "human",
      recipient: "orchestrator",
      type: "HUMAN_REPLY",
      round: 2,
      refs: ["artifact://reply.md"],
      message: "Human reply."
    } satisfies UiActionEvent;
    const expectedApproveResult = {
      bubbleId: "b-a",
      sequence: 5,
      event: {
        id: "env-approve-1",
        timestamp: "2026-02-25T00:02:00.000Z",
        bubbleId: "b-a",
        sender: "human",
        recipient: "orchestrator",
        type: "APPROVAL_DECISION",
        round: 2,
        refs: ["artifact://approval.md"],
        decision: "approve",
        message: "Approved."
      },
      actionState: {
        ...expectedActionState,
        lifecycleState: "APPROVED_FOR_COMMIT",
        activeAgent: null,
        activeRole: null,
        activeSince: null,
        executionContext: null
      },
      delivery: {
        statusDelivery: {
          status: "accepted",
          message: "Approval delivered.",
          sessionName: "pf-b-a",
          targetPaneIndex: 1
        }
      }
    } satisfies UiEmitApprovalDecisionResult;
    const expectedReworkResult = {
      mode: "immediate",
      bubbleId: "b-a",
      sequence: 6,
      event: {
        id: "env-rework-1",
        timestamp: "2026-02-25T00:03:00.000Z",
        bubbleId: "b-a",
        sender: "human",
        recipient: "orchestrator",
        type: "APPROVAL_DECISION",
        round: 2,
        refs: ["artifact://rework.md"],
        decision: "rework",
        message: "Please rework."
      },
      actionState: expectedActionState,
      delivery: {
        statusDelivery: {
          status: "accepted",
          message: "Rework status delivered.",
          sessionName: "pf-b-a",
          targetPaneIndex: 1
        },
        implementerDelivery: {
          status: "accepted",
          message: "Rework delivered.",
          sessionName: "pf-b-a",
          targetPaneIndex: 0
        }
      }
    } satisfies UiEmitRequestReworkImmediateResult;
    const expectedQueuedReworkResult = {
      mode: "queued",
      bubbleId: "b-a",
      intentId: "intent-queued-1",
      actionState: expectedActionState,
      queuedIntent: {
        intentId: "intent-queued-1",
        message: "Please rework later.",
        refs: ["artifact://queued-rework.md"],
        requestedBy: "human",
        requestedAt: "2026-02-25T00:04:00.000Z",
        status: "pending"
      }
    } satisfies UiEmitRequestReworkQueuedResult;
    const expectedReplyResult = {
      bubbleId: "b-a",
      sequence: 7,
      event: expectedHumanEvent,
      actionState: expectedActionState
    } satisfies UiEmitHumanReplyResult;
    const expectedResumeResult = {
      bubbleId: "b-a",
      sequence: 8,
      event: {
        ...expectedHumanEvent,
        id: "env-resume-1",
        message: "Resume bubble."
      },
      actionState: expectedActionState
    } satisfies UiEmitHumanReplyResult;
    const expectedStopResult = {
      bubbleId: "b-a",
      actionState: {
        ...expectedActionState,
        lifecycleState: "CANCELLED",
        activeAgent: null,
        activeRole: null,
        activeSince: null,
        executionContext: null
      },
      tmuxSessionName: "pf-b-a",
      tmuxSessionExisted: true,
      runtimeSessionRemoved: true
    } satisfies UiStopBubbleResult;
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ result: expectedApproveResult }), {
          status: 200
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ result: expectedReworkResult }), {
          status: 200
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ result: expectedQueuedReworkResult }), {
          status: 200
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ result: expectedReplyResult }), {
          status: 200
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ result: expectedResumeResult }), {
          status: 200
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ result: expectedStopResult }), {
          status: 200
        })
      );

    vi.stubGlobal("fetch", fetchMock);

    const client = createApiClient();
    await expect(
      client.approveBubble("/repo-a", "b-a", {
        refs: ["artifact://approval.md"],
        overrideNonApprove: true,
        overrideReason: "Manual override."
      })
    ).resolves.toStrictEqual(expectedApproveResult);
    await expect(
      client.requestRework("/repo-a", "b-a", {
        message: "Please rework.",
        refs: ["artifact://rework.md"]
      })
    ).resolves.toStrictEqual(expectedReworkResult);
    await expect(
      client.requestRework("/repo-a", "b-a", {
        message: "Please rework later.",
        refs: ["artifact://queued-rework.md"]
      })
    ).resolves.toStrictEqual(expectedQueuedReworkResult);
    await expect(
      client.replyBubble("/repo-a", "b-a", {
        message: "Human reply.",
        refs: ["artifact://reply.md"]
      })
    ).resolves.toStrictEqual(expectedReplyResult);
    await expect(client.resumeBubble("/repo-a", "b-a")).resolves.toStrictEqual(
      expectedResumeResult
    );
    await expect(client.stopBubble("/repo-a", "b-a")).resolves.toStrictEqual(
      expectedStopResult
    );

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/bubbles/b-a/approve?repo=%2Frepo-a",
      {
        method: "POST",
        body: JSON.stringify({
          refs: ["artifact://approval.md"],
          overrideNonApprove: true,
          overrideReason: "Manual override."
        }),
        headers: {
          "content-type": "application/json"
        }
      }
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/bubbles/b-a/request-rework?repo=%2Frepo-a",
      {
        method: "POST",
        body: JSON.stringify({
          message: "Please rework.",
          refs: ["artifact://rework.md"]
        }),
        headers: {
          "content-type": "application/json"
        }
      }
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "/api/bubbles/b-a/request-rework?repo=%2Frepo-a",
      {
        method: "POST",
        body: JSON.stringify({
          message: "Please rework later.",
          refs: ["artifact://queued-rework.md"]
        }),
        headers: {
          "content-type": "application/json"
        }
      }
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      "/api/bubbles/b-a/reply?repo=%2Frepo-a",
      {
        method: "POST",
        body: JSON.stringify({
          message: "Human reply.",
          refs: ["artifact://reply.md"]
        }),
        headers: {
          "content-type": "application/json"
        }
      }
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      5,
      "/api/bubbles/b-a/resume?repo=%2Frepo-a",
      {
        method: "POST"
      }
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      6,
      "/api/bubbles/b-a/stop?repo=%2Frepo-a",
      {
        method: "POST"
      }
    );
  });

  it("posts delete without body when force is omitted or false", async () => {
    const deleteResult = {
      result: {
        bubbleId: "b-a",
        deleted: false,
        requiresConfirmation: true,
        artifacts: {
          worktree: {
            exists: true,
            path: "/tmp/worktrees/b-a"
          },
          tmux: {
            exists: false,
            sessionName: "pf-b-a"
          },
          runtimeSession: {
            exists: false,
            sessionName: null
          },
          branch: {
            exists: true,
            name: "pairflow/bubble/b-a"
          }
        },
        tmuxSessionTerminated: false,
        runtimeSessionRemoved: false,
        removedWorktree: false,
        removedBubbleBranch: false
      }
    };

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(deleteResult), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(deleteResult), { status: 200 }));

    vi.stubGlobal("fetch", fetchMock);

    const client = createApiClient();
    await client.deleteBubble("/repo-a", "b-a");
    await client.deleteBubble("/repo-a", "b-a", { force: false });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/bubbles/b-a/delete?repo=%2Frepo-a",
      {
        method: "POST"
      }
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/bubbles/b-a/delete?repo=%2Frepo-a",
      {
        method: "POST"
      }
    );
  });

  it("posts attach action and returns its action DTO", async () => {
    const expectedAttachResult = {
      bubbleId: "b-a",
      tmuxSessionName: "pf-b-a",
      launcherRequested: "terminal",
      launcherUsed: "terminal",
      attachCommand: "tmux attach-session -t pf-b-a"
    } satisfies UiAttachBubbleResult;
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ result: expectedAttachResult }), {
        status: 200
      })
    );

    vi.stubGlobal("fetch", fetchMock);

    const client = createApiClient();
    await expect(client.attachBubble("/repo-a", "b-a")).resolves.toStrictEqual(
      expectedAttachResult
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/bubbles/b-a/attach?repo=%2Frepo-a",
      {
        method: "POST"
      }
    );
  });

  it("serializes expectedBubbleToml exactly for update-review-policy compare-and-swap payloads", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          result: {
            kind: "review_policy_updated",
            bubbleId: "b-a",
            reviewPolicy: {
              requested_loop_mode: "meta_only",
              effective_loop_mode: "full",
              support_status: "guarded",
              reviewer_blocking_min_severity: "P1",
              meta_review_auto_rework_min_severity: "P1"
            },
            previousRequestedLoopMode: "full",
            nextRequestedLoopMode: "meta_only",
            activationChange: "none",
            bubbleToml: "id = \"b-a\"\n"
          }
        }),
        { status: 200 }
      )
    );
    const expectedBubbleToml = "id = \"b-a\"\nreview_loop_mode = \"full\"\n";

    vi.stubGlobal("fetch", fetchMock);

    const client = createApiClient();
    await client.updateReviewPolicy("/repo-a", "b-a", {
      reviewLoopMode: "meta_only",
      reviewBlockingMinSeverity: "P3",
      expectedBubbleToml
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/bubbles/b-a/update-review-policy?repo=%2Frepo-a",
      {
        method: "POST",
        body: JSON.stringify({
          reviewLoopMode: "meta_only",
          reviewBlockingMinSeverity: "P3",
          expectedBubbleToml
        }),
        headers: {
          "content-type": "application/json"
        }
      }
    );
  });

  it("accepts HTTP 202 for confirmation-required delete responses", async () => {
    const deleteResult = {
      result: {
        bubbleId: "b-a",
        deleted: false,
        requiresConfirmation: true,
        artifacts: {
          worktree: {
            exists: true,
            path: "/tmp/worktrees/b-a"
          },
          tmux: {
            exists: true,
            sessionName: "pf-b-a"
          },
          runtimeSession: {
            exists: true,
            sessionName: "pf-b-a"
          },
          branch: {
            exists: true,
            name: "pairflow/bubble/b-a"
          }
        },
        tmuxSessionTerminated: false,
        runtimeSessionRemoved: false,
        removedWorktree: false,
        removedBubbleBranch: false
      }
    };

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(deleteResult), { status: 202 }));
    vi.stubGlobal("fetch", fetchMock);

    const client = createApiClient();
    await expect(client.deleteBubble("/repo-a", "b-a")).resolves.toMatchObject({
      bubbleId: "b-a",
      deleted: false,
      requiresConfirmation: true
    });
  });
});
