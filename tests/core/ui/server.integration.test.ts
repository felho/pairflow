import { appendFile, mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { getBubblePaths } from "../../../src/core/bubble/paths.js";
import { normalizeRepoPath } from "../../../src/core/bubble/repoResolution.js";
import { emitAskHumanFromWorkspace } from "../../../src/core/agent/askHuman.js";
import {
  startUiServer,
  type StartUiServerInput,
  type UiServerHandle
} from "../../../src/core/ui/server.js";
import { upsertRuntimeSession } from "../../../src/core/runtime/sessionsRegistry.js";
import { initGitRepository } from "../../helpers/git.js";
import { setupRunningBubbleFixture } from "../../helpers/bubble.js";

const tempDirs: string[] = [];

async function createTempDir(prefix: string): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), prefix));
  tempDirs.push(root);
  return root;
}

async function createRepoFixture(): Promise<{
  repoPath: string;
  bubbleId: string;
}> {
  const repoPath = await createTempDir("pairflow-ui-server-repo-");
  await initGitRepository(repoPath);

  const created = await setupRunningBubbleFixture({
    bubbleId: "b_ui_server_01",
    repoPath,
    task: "Build UI API"
  });

  await emitAskHumanFromWorkspace({
    question: "Need operator answer?",
    cwd: created.paths.worktreePath,
    now: new Date("2026-02-24T10:00:00.000Z")
  });

  const bubblePaths = getBubblePaths(repoPath, created.bubbleId);
  await upsertRuntimeSession({
    sessionsPath: bubblePaths.sessionsPath,
    bubbleId: created.bubbleId,
    repoPath,
    worktreePath: bubblePaths.worktreePath,
    tmuxSessionName: `pf-${created.bubbleId}`,
    now: new Date("2026-02-24T10:00:30.000Z")
  });

  return {
    repoPath,
    bubbleId: created.bubbleId
  };
}

async function createAssetsFixture(): Promise<string> {
  const assetsDir = await createTempDir("pairflow-ui-server-assets-");
  await mkdir(assetsDir, {
    recursive: true
  });
  await writeFile(
    join(assetsDir, "index.html"),
    "<!doctype html><html><body>pairflow-ui-test</body></html>\n",
    "utf8"
  );
  await writeFile(join(assetsDir, "app.js"), "console.log('pairflow');\n", "utf8");
  return assetsDir;
}

async function startServer(input: {
  repoPath: string;
  assetsDir: string;
  routerDependencies?: StartUiServerInput["routerDependencies"];
}): Promise<UiServerHandle> {
  return startUiServer({
    repoPaths: [input.repoPath],
    assetsDir: input.assetsDir,
    host: "127.0.0.1",
    port: 0,
    pollIntervalMs: 75,
    debounceMs: 10,
    ...(input.routerDependencies !== undefined
      ? { routerDependencies: input.routerDependencies }
      : {})
  });
}

async function requestJson(
  baseUrl: string,
  path: string,
  init: RequestInit = {}
): Promise<{ status: number; body: unknown; raw: string }> {
  const response = await fetch(`${baseUrl}${path}`, init);
  const raw = await response.text();
  return {
    status: response.status,
    body: raw.length === 0 ? null : (JSON.parse(raw) as unknown),
    raw
  };
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((path) =>
      rm(path, {
        recursive: true,
        force: true
      })
    )
  );
});

describe("UI server integration", () => {
  it("serves static assets and read API endpoints", async () => {
    const fixture = await createRepoFixture();
    const assetsDir = await createAssetsFixture();
    const normalizedRepoPath = await normalizeRepoPath(fixture.repoPath);
    const server = await startServer({
      repoPath: fixture.repoPath,
      assetsDir
    });

    try {
      const indexResponse = await fetch(`${server.url}/`);
      const indexText = await indexResponse.text();
      expect(indexResponse.status).toBe(200);
      expect(indexText).toContain("pairflow-ui-test");

      const assetResponse = await fetch(`${server.url}/app.js`);
      const assetText = await assetResponse.text();
      expect(assetResponse.status).toBe(200);
      expect(assetText).toContain("pairflow");

      const repos = await requestJson(server.url, "/api/repos");
      expect(repos.status).toBe(200);
      expect(repos.body).toEqual({
        repos: [normalizedRepoPath]
      });

      const list = await requestJson(
        server.url,
        `/api/bubbles?repo=${encodeURIComponent(fixture.repoPath)}`
      );
      expect(list.status).toBe(200);
      expect(list.body).toMatchObject({
        repo: {
          repoPath: normalizedRepoPath
        },
        bubbles: [
          {
            bubbleId: fixture.bubbleId,
            runtime: {
              present: true,
              stale: false
            }
          }
        ]
      });

      const detail = await requestJson(
        server.url,
        `/api/bubbles/${fixture.bubbleId}?repo=${encodeURIComponent(fixture.repoPath)}`
      );
      expect(detail.status).toBe(200);
      expect(detail.body).toMatchObject({
        bubble: {
          bubbleId: fixture.bubbleId,
          repoPath: normalizedRepoPath,
          state: "WAITING_HUMAN",
          runtime: {
            present: true
          },
          pendingInboxItems: {
            humanQuestions: 1
          }
        }
      });

      const bubblePaths = getBubblePaths(fixture.repoPath, fixture.bubbleId);
      await appendFile(bubblePaths.transcriptPath, "{\"id\":\"partial\"", "utf8");

      const timeline = await requestJson(
        server.url,
        `/api/bubbles/${fixture.bubbleId}/timeline?repo=${encodeURIComponent(fixture.repoPath)}`
      );
      expect(timeline.status).toBe(200);
      expect(timeline.body).toMatchObject({
        bubbleId: fixture.bubbleId,
        repoPath: normalizedRepoPath
      });
      const timelineEntries = (timeline.body as { timeline: unknown[] }).timeline;
      expect(timelineEntries.length).toBeGreaterThan(0);
    } finally {
      await server.close();
    }
  });

  it("maps action endpoint validation/not-found/conflict/runtime errors", async () => {
    const fixture = await createRepoFixture();
    const assetsDir = await createAssetsFixture();

    const startBubbleMock = vi.fn(() =>
      Promise.resolve({
        bubbleId: fixture.bubbleId,
        state: "RUNNING"
      })
    );
    const commitBubbleMock = vi.fn(() =>
      Promise.resolve({
        bubbleId: fixture.bubbleId,
        commitSha: "abc123"
      })
    );
    const mergeBubbleMock = vi.fn(() =>
      Promise.resolve({
        bubbleId: fixture.bubbleId,
        mergeCommitSha: "def456"
      })
    );
    const openBubbleMock = vi.fn(() =>
      Promise.resolve({
        bubbleId: fixture.bubbleId,
        command: "cursor /tmp/worktree",
        worktreePath: "/tmp/worktree"
      })
    );
    const stopBubbleMock = vi.fn(() =>
      Promise.resolve({
        bubbleId: fixture.bubbleId,
        state: "CANCELLED"
      })
    );
    const deleteBubbleMock = vi.fn(() =>
      Promise.resolve({
        bubbleId: fixture.bubbleId,
        deleted: true,
        requiresConfirmation: false,
        artifacts: {
          worktree: {
            exists: false,
            path: "/tmp/worktree"
          },
          tmux: {
            exists: false,
            sessionName: "pf-bubble"
          },
          runtimeSession: {
            exists: false,
            sessionName: null
          },
          branch: {
            exists: false,
            name: "pairflow/bubble/branch"
          }
        },
        tmuxSessionTerminated: false,
        runtimeSessionRemoved: false,
        removedWorktree: false,
        removedBubbleBranch: false
      })
    );
    const resumeBubbleMock = vi.fn(() =>
      Promise.resolve({
        bubbleId: fixture.bubbleId
      })
    );
    const emitRequestReworkMock = vi.fn(() =>
      Promise.resolve({
        bubbleId: fixture.bubbleId
      })
    );
    const emitHumanReplyMock = vi.fn(() =>
      Promise.resolve({
        bubbleId: fixture.bubbleId
      })
    );
    const emitApproveMock = vi.fn(() =>
      Promise.reject(
        new Error(
          "approval decision can only be used while bubble is READY_FOR_APPROVAL (current: WAITING_HUMAN)."
        )
      )
    );

    const server = await startServer({
      repoPath: fixture.repoPath,
      assetsDir,
      routerDependencies: {
        startBubble: startBubbleMock,
        commitBubble: commitBubbleMock,
        mergeBubble: mergeBubbleMock,
        openBubble: openBubbleMock,
        stopBubble: stopBubbleMock,
        deleteBubble: deleteBubbleMock,
        resumeBubble: resumeBubbleMock,
        emitRequestRework: emitRequestReworkMock,
        emitHumanReply: emitHumanReplyMock,
        emitApprove: emitApproveMock
      } as unknown as StartUiServerInput["routerDependencies"]
    });

    try {
      const start = await requestJson(
        server.url,
        `/api/bubbles/${fixture.bubbleId}/start?repo=${encodeURIComponent(fixture.repoPath)}`,
        {
          method: "POST"
        }
      );
      expect(start.status).toBe(200);
      expect(startBubbleMock).toHaveBeenCalledTimes(1);

      const approve = await requestJson(
        server.url,
        `/api/bubbles/${fixture.bubbleId}/approve?repo=${encodeURIComponent(fixture.repoPath)}`,
        {
          method: "POST",
          body: JSON.stringify({})
        }
      );
      expect(approve.status).toBe(409);
      expect(approve.body).toMatchObject({
        error: {
          code: "conflict"
        }
      });
      expect(approve.body).toMatchObject({
        error: {
          details: {
            currentState: "WAITING_HUMAN"
          }
        }
      });

      const reworkMissingMessage = await requestJson(
        server.url,
        `/api/bubbles/${fixture.bubbleId}/request-rework?repo=${encodeURIComponent(fixture.repoPath)}`,
        {
          method: "POST",
          body: JSON.stringify({})
        }
      );
      expect(reworkMissingMessage.status).toBe(400);

      const replyMissingMessage = await requestJson(
        server.url,
        `/api/bubbles/${fixture.bubbleId}/reply?repo=${encodeURIComponent(fixture.repoPath)}`,
        {
          method: "POST",
          body: JSON.stringify({})
        }
      );
      expect(replyMissingMessage.status).toBe(400);

      const commitInvalid = await requestJson(
        server.url,
        `/api/bubbles/${fixture.bubbleId}/commit?repo=${encodeURIComponent(fixture.repoPath)}`,
        {
          method: "POST",
          body: JSON.stringify({
            auto: "yes",
            refs: "not-array"
          })
        }
      );
      expect(commitInvalid.status).toBe(400);

      const commit = await requestJson(
        server.url,
        `/api/bubbles/${fixture.bubbleId}/commit?repo=${encodeURIComponent(fixture.repoPath)}`,
        {
          method: "POST",
          body: JSON.stringify({
            auto: true,
            refs: ["artifacts/done-package.md"]
          })
        }
      );
      expect(commit.status).toBe(200);
      expect(commitBubbleMock).toHaveBeenCalledTimes(1);

      const merge = await requestJson(
        server.url,
        `/api/bubbles/${fixture.bubbleId}/merge?repo=${encodeURIComponent(fixture.repoPath)}`,
        {
          method: "POST",
          body: JSON.stringify({
            push: false,
            deleteRemote: false
          })
        }
      );
      expect(merge.status).toBe(200);
      expect(mergeBubbleMock).toHaveBeenCalledTimes(1);

      const open = await requestJson(
        server.url,
        `/api/bubbles/${fixture.bubbleId}/open?repo=${encodeURIComponent(fixture.repoPath)}`,
        {
          method: "POST"
        }
      );
      expect(open.status).toBe(200);
      expect(openBubbleMock).toHaveBeenCalledTimes(1);

      const stop = await requestJson(
        server.url,
        `/api/bubbles/${fixture.bubbleId}/stop?repo=${encodeURIComponent(fixture.repoPath)}`,
        {
          method: "POST"
        }
      );
      expect(stop.status).toBe(200);
      expect(stopBubbleMock).toHaveBeenCalledTimes(1);

      const deleteInvalid = await requestJson(
        server.url,
        `/api/bubbles/${fixture.bubbleId}/delete?repo=${encodeURIComponent(fixture.repoPath)}`,
        {
          method: "POST",
          body: JSON.stringify({
            force: "yes"
          })
        }
      );
      expect(deleteInvalid.status).toBe(400);

      const deleted = await requestJson(
        server.url,
        `/api/bubbles/${fixture.bubbleId}/delete?repo=${encodeURIComponent(fixture.repoPath)}`,
        {
          method: "POST",
          body: JSON.stringify({
            force: true
          })
        }
      );
      expect(deleted.status).toBe(200);
      expect(deleteBubbleMock).toHaveBeenCalledTimes(1);
      expect(deleteBubbleMock).toHaveBeenCalledWith(
        expect.objectContaining({
          bubbleId: fixture.bubbleId,
          force: true
        })
      );

      const resume = await requestJson(
        server.url,
        `/api/bubbles/${fixture.bubbleId}/resume?repo=${encodeURIComponent(fixture.repoPath)}`,
        {
          method: "POST"
        }
      );
      expect(resume.status).toBe(200);
      expect(resumeBubbleMock).toHaveBeenCalledTimes(1);

      const outOfScope = await requestJson(
        server.url,
        `/api/bubbles?repo=${encodeURIComponent("/tmp/not-in-scope")}`
      );
      expect(outOfScope.status).toBe(404);

      const missingBubble = await requestJson(
        server.url,
        `/api/bubbles/does-not-exist?repo=${encodeURIComponent(fixture.repoPath)}`
      );
      expect(missingBubble.status).toBe(404);

      const afterConflictRead = await requestJson(
        server.url,
        `/api/bubbles/${fixture.bubbleId}?repo=${encodeURIComponent(fixture.repoPath)}`
      );
      expect(afterConflictRead.status).toBe(200);
      expect(afterConflictRead.body).toMatchObject({
        bubble: {
          state: "WAITING_HUMAN"
        }
      });
    } finally {
      await server.close();
    }
  });

  it("closes promptly even when SSE connections are active", async () => {
    const fixture = await createRepoFixture();
    const assetsDir = await createAssetsFixture();
    const server = await startServer({
      repoPath: fixture.repoPath,
      assetsDir
    });

    const abortController = new AbortController();
    const sseResponse = await fetch(
      `${server.url}/api/events?repo=${encodeURIComponent(fixture.repoPath)}`,
      {
        signal: abortController.signal
      }
    );
    expect(sseResponse.status).toBe(200);

    const closePromise = server.close();
    await expect(
      Promise.race([
        closePromise,
        new Promise<void>((_, reject) => {
          setTimeout(() => {
            reject(new Error("Timed out waiting for server.close()."));
          }, 2_000);
        })
      ])
    ).resolves.toBeUndefined();

    abortController.abort();
  });

  it("returns safe generic 500 body for static asset read failures", async () => {
    const fixture = await createRepoFixture();
    const assetsDir = await createAssetsFixture();
    const indexPath = join(assetsDir, "index.html");
    await rm(indexPath);
    await mkdir(indexPath);

    const server = await startServer({
      repoPath: fixture.repoPath,
      assetsDir
    });

    try {
      const response = await fetch(`${server.url}/`);
      const body = await response.text();
      expect(response.status).toBe(500);
      expect(body).toBe("Internal server error\n");
    } finally {
      await server.close();
    }
  });
});
