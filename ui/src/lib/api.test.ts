import { describe, expect, it, vi } from "vitest";

import { createApiClient, PairflowApiError } from "./api";
import { bubbleDetail, bubbleSummary, repoSummary, timelineEntry } from "../test/fixtures";

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

    const error = await client.getRepos().catch((reason) => reason);
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
    const error = await client.getRepos().catch((reason) => reason);

    expect(error).toBeInstanceOf(PairflowApiError);
    expect(error).toMatchObject({
      status: 502,
      code: "unknown",
      message: "API request failed: 502"
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
        auto: true,
        refs: ["artifacts/done-package.md"]
      })
    ).resolves.toMatchObject({
      bubbleId: "b-a",
      commitSha: "abc123"
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
          auto: true,
          refs: ["artifacts/done-package.md"]
        }),
        headers: {
          "content-type": "application/json"
        }
      }
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      5,
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
