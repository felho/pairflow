import { describe, expect, it, vi } from "vitest";

import { createApiClient, PairflowApiError } from "./api";
import { bubbleSummary, repoSummary } from "../test/fixtures";

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
});
