import { describe, expect, it, vi } from "vitest";

import { createApiClient, PairflowApiError } from "./api";
import { bubbleDetail, bubbleSummary, repoSummary, timelineEntry } from "../test/fixtures";

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
            timeline: [timelineEntry()]
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ result: { bubbleId: "b-a", state: "RUNNING" } }), {
          status: 200
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ result: { bubbleId: "b-a", commitSha: "abc123" } }), {
          status: 200
        })
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
    await expect(client.getBubble("/repo-a", "b-a")).resolves.toMatchObject({
      bubbleId: "b-a",
      repoPath: "/repo-a"
    });
    await expect(client.getBubbleTimeline("/repo-a", "b-a")).resolves.toHaveLength(1);
    await expect(client.startBubble("/repo-a", "b-a")).resolves.toMatchObject({
      bubbleId: "b-a",
      state: "RUNNING"
    });
    await expect(
      client.commitBubble("/repo-a", "b-a", {
        stageAll: true,
        refs: ["artifacts/commit-evidence.md"]
      })
    ).resolves.toMatchObject({
      bubbleId: "b-a",
      commitSha: "abc123"
    });
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
      new Response(JSON.stringify({ result: { bubbleId: "b-a", state: "RUNNING" } }), {
        status: 200
      })
    );

    vi.stubGlobal("fetch", fetchMock);

    const client = createApiClient();
    await expect(client.restartBubble("/repo-a", "b-a")).resolves.toMatchObject({
      bubbleId: "b-a",
      state: "RUNNING"
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/bubbles/b-a/restart?repo=%2Frepo-a",
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
