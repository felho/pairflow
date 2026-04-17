import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { AttachBubbleError } from "../../../src/v11/application/attach/emitAttachV11.js";
import type { RestartBubbleResult } from "../../../src/v11/application/restart/restartCommandContract.js";
import { createUiRouter, resolveStaticAssetPath } from "../../../src/v11/infrastructure/ui/router.js";
import type { UiEventsBroker } from "../../../src/v11/infrastructure/ui/events.js";
import type { UiRepoScope } from "../../../src/v11/infrastructure/ui/repoScope.js";
import type { BubbleInboxView } from "../../../src/v11/shared/inbox/inboxCommandApi.js";
import type { UiBubbleListView } from "../../../src/v11/shared/ports/uiRouter.js";
import type { BubbleStatusView } from "../../../src/v11/shared/status/statusCommandApi.js";

function createDeferred<T>(): {
  promise: Promise<T>;
  resolve(value: T): void;
  reject(reason?: unknown): void;
} {
  let resolve: ((value: T) => void) | null = null;
  let reject: ((reason?: unknown) => void) | null = null;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  if (resolve === null || reject === null) {
    throw new Error("Failed to create deferred handlers.");
  }
  return {
    promise,
    resolve,
    reject
  };
}

async function startRouterServer(router: ReturnType<typeof createUiRouter>): Promise<{
  url: string;
  close(): Promise<void>;
}> {
  const server: Server = createServer((req, res) => {
    void (async () => {
      const handled = await router.handleRequest(req, res);
      if (!handled) {
        res.statusCode = 404;
        res.end("Not found");
      }
    })();
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      resolve();
    });
  });

  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("Failed to resolve router server address.");
  }

  return {
    url: `http://127.0.0.1:${address.port}`,
    async close(): Promise<void> {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error !== undefined) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    }
  };
}

const tempDirs: string[] = [];

async function createAssetsDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "pairflow-ui-router-"));
  tempDirs.push(dir);
  await writeFile(join(dir, "index.html"), "<html>index</html>\n", "utf8");
  await writeFile(join(dir, "app.js"), "console.log('ok');\n", "utf8");
  return dir;
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

describe("resolveStaticAssetPath", () => {
  it("resolves existing static files inside assets dir", async () => {
    const assetsDir = await createAssetsDir();

    const resolved = await resolveStaticAssetPath({
      assetsDir,
      requestPath: "/app.js"
    });

    expect(resolved.type).toBe("file");
    expect(resolved.path).toBe(join(assetsDir, "app.js"));
  });

  it("falls back to index for traversal attempts", async () => {
    const assetsDir = await createAssetsDir();

    const resolved = await resolveStaticAssetPath({
      assetsDir,
      requestPath: "/../../etc/passwd"
    });

    expect(resolved.type).toBe("fallback");
    expect(resolved.path).toBe(join(assetsDir, "index.html"));
  });
});

describe("createUiRouter bubble detail resource", () => {
  it("preserves remote status metadata through the first-party detail route", async () => {
    const repoPath = "/tmp/pairflow-ui-router-detail-repo";
    const bubbleId = "b-router-detail-01";
    const status: BubbleStatusView = {
      bubbleId,
      repoPath,
      worktreePath: "/tmp/worktree",
      bubbleStartedAt: "2026-02-24T12:00:00.000Z",
      state: "READY_FOR_HUMAN_APPROVAL",
      round: 2,
      activeAgent: null,
      activeRole: null,
      activeSince: null,
      lastCommandAt: "2026-02-24T12:00:30.000Z",
      paneActivity: {
        readStatus: "missing",
        lastChangedAt: null,
        sampledAt: null,
        sinceLastChangedSeconds: null,
        sinceSampledSeconds: null,
        lastSampleStatus: null,
        lastSampleError: null,
        sessionName: null,
        targetPane: null
      },
      executionContext: null,
      watchdog: {
        monitored: false,
        monitoredAgent: null,
        timeoutMinutes: 30,
        referenceTimestamp: null,
        deadlineTimestamp: null,
        remainingSeconds: null,
        expired: false
      },
      pendingInboxItems: {
        humanQuestions: 0,
        approvalRequests: 1,
        total: 1
      },
      transcript: {
        totalMessages: 4,
        lastMessageType: "APPROVAL_REQUEST",
        lastMessageTs: "2026-02-24T12:00:30.000Z",
        lastMessageId: "msg_approval_01"
      },
      metaReview: {
        actor: "meta-reviewer",
        authorityActive: false,
        runtimeDelivery: null
      },
      commandPath: {
        status: "external",
        profile: "external",
        localEntrypoint: "/tmp/worktree/dist/cli/index.js",
        activeEntrypoint: "/usr/local/bin/pairflow",
        message: "external Pairflow CLI active",
        pinnedCommand: "pairflow"
      },
      accuracy_critical: false,
      last_review_verification: "missing",
      failing_gates: [],
      spec_lock_state: {
        state: "IMPLEMENTABLE",
        open_blocker_count: 0,
        open_required_now_count: 0
      },
      round_gate_state: {
        applies: false,
        violated: false,
        round: 2
      },
      stateValidation: null,
      remoteExecution: {
        alias: "lab",
        host: "ssh.example.com",
        pointerKind: "started",
        viewKind: "status",
        statusSource: "live",
        cacheStatus: "present",
        runtimeAvailability: "missing",
        reasonCode: "STATUS_REMOTE_RUNTIME_MISSING",
        remoteClonePath: "/srv/pairflow/repo--b-router-detail-01",
        lastLiveCheckAt: "2026-02-24T12:00:31.000Z",
        lastCacheCheckAt: "2026-02-24T12:00:30.000Z"
      }
    };
    const inbox: BubbleInboxView = {
      bubbleId,
      repoPath,
      state: "READY_FOR_HUMAN_APPROVAL",
      pending: {
        humanQuestions: 0,
        approvalRequests: 1,
        total: 1
      },
      items: []
    };
    const getBubbleStatus = vi.fn(async () => status);
    const getBubbleInbox = vi.fn(async () => inbox);
    const readRuntimeSessionsRegistry = vi.fn(async () => ({}));

    const scope: UiRepoScope = {
      repos: [repoPath],
      has: (value: string) => Promise.resolve(value === repoPath)
    };
    const events: UiEventsBroker = {
      subscribe: () => () => undefined,
      getSnapshot: () => ({
        id: 1,
        ts: "2026-02-25T00:00:00.000Z",
        type: "snapshot",
        repos: [],
        bubbles: []
      }),
      refreshNow: () => Promise.resolve(undefined),
      addRepo: () => Promise.resolve(false),
      removeRepo: () => Promise.resolve(false),
      close: () => Promise.resolve(undefined)
    };

    const router = createUiRouter({
      repoScope: scope,
      events,
      dependencies: {
        getBubbleStatus,
        getBubbleInbox,
        readRuntimeSessionsRegistry
      }
    });
    const server = await startRouterServer(router);

    try {
      const response = await fetch(
        `${server.url}/api/bubbles/${bubbleId}?repo=${encodeURIComponent(repoPath)}`
      );
      const payload = (await response.json()) as {
        bubble: {
          attention?: unknown;
          remoteExecution?: BubbleStatusView["remoteExecution"];
          runtime?: {
            expected: boolean;
            present: boolean;
            stale: boolean;
          };
        };
      };

      expect(response.status).toBe(200);
      expect(payload.bubble.attention ?? null).toBeNull();
      expect(payload.bubble.runtime).toStrictEqual({
        expected: false,
        present: false,
        stale: false
      });
      expect(payload.bubble.remoteExecution).toStrictEqual({
        alias: "lab",
        host: "ssh.example.com",
        pointerKind: "started",
        viewKind: "status",
        statusSource: "live",
        cacheStatus: "present",
        runtimeAvailability: "missing",
        reasonCode: "STATUS_REMOTE_RUNTIME_MISSING",
        remoteClonePath: "/srv/pairflow/repo--b-router-detail-01",
        lastLiveCheckAt: "2026-02-24T12:00:31.000Z",
        lastCacheCheckAt: "2026-02-24T12:00:30.000Z"
      });
      expect(getBubbleStatus).toHaveBeenCalledWith({
        bubbleId,
        repoPath
      });
      expect(getBubbleInbox).toHaveBeenCalledWith({
        bubbleId,
        repoPath
      });
      expect(readRuntimeSessionsRegistry).toHaveBeenCalledTimes(1);
    } finally {
      await server.close();
    }
  });
});

describe("createUiRouter bubble list resource", () => {
  it("forwards refresh=true to the first-party list route", async () => {
    const repoPath = "/tmp/pairflow-ui-router-list-repo";
    const listView: UiBubbleListView = {
      repoPath,
      total: 0,
      byState: {
        CREATED: 0,
        PREPARING_WORKSPACE: 0,
        RUNNING: 0,
        WAITING_HUMAN: 0,
        READY_FOR_HUMAN_APPROVAL: 0,
        APPROVED_FOR_COMMIT: 0,
        COMMITTED: 0,
        DONE: 0,
        FAILED: 0,
        CANCELLED: 0
      },
      runtimeSessions: {
        registered: 0,
        stale: 0
      },
      bubbles: [],
      remoteExecutionSummary: {
        createdNotStarted: 0,
        unavailableStarted: 0,
        refreshedThisRun: true
      }
    };
    const listBubbles = vi.fn(async () => listView);

    const scope: UiRepoScope = {
      repos: [repoPath],
      has: (value: string) => Promise.resolve(value === repoPath)
    };
    const events: UiEventsBroker = {
      subscribe: () => () => undefined,
      getSnapshot: () => ({
        id: 1,
        ts: "2026-02-25T00:00:00.000Z",
        type: "snapshot",
        repos: [],
        bubbles: []
      }),
      refreshNow: () => Promise.resolve(undefined),
      addRepo: () => Promise.resolve(false),
      removeRepo: () => Promise.resolve(false),
      close: () => Promise.resolve(undefined)
    };

    const router = createUiRouter({
      repoScope: scope,
      events,
      dependencies: {
        listBubbles
      }
    });
    const server = await startRouterServer(router);

    try {
      const response = await fetch(
        `${server.url}/api/bubbles?repo=${encodeURIComponent(repoPath)}&refresh=true`
      );
      const payload = (await response.json()) as {
        repo: {
          repoPath: string;
        };
        bubbles: unknown[];
      };

      expect(response.status).toBe(200);
      expect(payload.repo.repoPath).toBe(repoPath);
      expect(payload.bubbles).toStrictEqual([]);
      expect(listBubbles).toHaveBeenCalledWith({
        repoPath,
        refresh: true
      });
    } finally {
      await server.close();
    }
  });

  it("forwards refresh=false to the first-party list route without forcing refresh", async () => {
    const repoPath = "/tmp/pairflow-ui-router-list-repo";
    const listView: UiBubbleListView = {
      repoPath,
      total: 0,
      byState: {
        CREATED: 0,
        PREPARING_WORKSPACE: 0,
        RUNNING: 0,
        WAITING_HUMAN: 0,
        READY_FOR_HUMAN_APPROVAL: 0,
        APPROVED_FOR_COMMIT: 0,
        COMMITTED: 0,
        DONE: 0,
        FAILED: 0,
        CANCELLED: 0
      },
      runtimeSessions: {
        registered: 0,
        stale: 0
      },
      bubbles: []
    };
    const listBubbles = vi.fn(async () => listView);

    const scope: UiRepoScope = {
      repos: [repoPath],
      has: (value: string) => Promise.resolve(value === repoPath)
    };
    const events: UiEventsBroker = {
      subscribe: () => () => undefined,
      getSnapshot: () => ({
        id: 1,
        ts: "2026-02-25T00:00:00.000Z",
        type: "snapshot",
        repos: [],
        bubbles: []
      }),
      refreshNow: () => Promise.resolve(undefined),
      addRepo: () => Promise.resolve(false),
      removeRepo: () => Promise.resolve(false),
      close: () => Promise.resolve(undefined)
    };

    const router = createUiRouter({
      repoScope: scope,
      events,
      dependencies: {
        listBubbles
      }
    });
    const server = await startRouterServer(router);

    try {
      const response = await fetch(
        `${server.url}/api/bubbles?repo=${encodeURIComponent(repoPath)}&refresh=false`
      );

      expect(response.status).toBe(200);
      expect(listBubbles).toHaveBeenCalledWith({
        repoPath,
        refresh: false
      });
    } finally {
      await server.close();
    }
  });
});

describe("createUiRouter delete action", () => {
  it("responds before refreshNow resolves", async () => {
    const repoPath = "/tmp/pairflow-ui-router-delete-repo";
    const refreshDeferred = createDeferred<void>();
    const refreshNow = vi.fn(() => refreshDeferred.promise);
    const deleteBubble = vi.fn(() =>
      Promise.resolve({
      bubbleId: "b-router-delete-01",
      deleted: true,
      requiresConfirmation: false,
      artifacts: {
        worktree: {
          exists: false,
          path: "/tmp/worktree"
        },
        tmux: {
          exists: false,
          sessionName: "pf-b-router-delete-01"
        },
        runtimeSession: {
          exists: false,
          sessionName: null
        },
        branch: {
          exists: false,
          name: "pairflow/bubble/b-router-delete-01"
        }
      },
      tmuxSessionTerminated: false,
      runtimeSessionRemoved: false,
      removedWorktree: false,
      removedBubbleBranch: false
      })
    );

    const scope: UiRepoScope = {
      repos: [repoPath],
      has: (value: string) => Promise.resolve(value === repoPath)
    };
    const events: UiEventsBroker = {
      subscribe: () => () => undefined,
      getSnapshot: () => ({
        id: 1,
        ts: "2026-02-25T00:00:00.000Z",
        type: "snapshot",
        repos: [],
        bubbles: []
      }),
      refreshNow,
      addRepo: () => Promise.resolve(false),
      removeRepo: () => Promise.resolve(false),
      close: () => Promise.resolve(undefined)
    };

    const router = createUiRouter({
      repoScope: scope,
      events,
      dependencies: {
        deleteBubble
      }
    });
    const server = await startRouterServer(router);

    try {
      const responsePromise = fetch(
        `${server.url}/api/bubbles/b-router-delete-01/delete?repo=${encodeURIComponent(repoPath)}`,
        {
          method: "POST",
          body: JSON.stringify({
            force: true
          })
        }
      );

      const response = await Promise.race([
        responsePromise,
        new Promise<Response | null>((resolve) => {
          setTimeout(() => resolve(null), 500);
        })
      ]);

      expect(response).not.toBeNull();
      expect(response?.status).toBe(200);
      expect(refreshNow).toHaveBeenCalledTimes(1);
    } finally {
      refreshDeferred.resolve();
      await server.close();
    }
  });

  it("logs refreshNow failures after successful delete response", async () => {
    const repoPath = "/tmp/pairflow-ui-router-delete-repo";
    const refreshError = new Error("refresh failed");
    const refreshNow = vi.fn(() => Promise.reject(refreshError));
    const deleteBubble = vi.fn(() =>
      Promise.resolve({
      bubbleId: "b-router-delete-err-01",
      deleted: true,
      requiresConfirmation: false,
      artifacts: {
        worktree: {
          exists: false,
          path: "/tmp/worktree"
        },
        tmux: {
          exists: false,
          sessionName: "pf-b-router-delete-err-01"
        },
        runtimeSession: {
          exists: false,
          sessionName: null
        },
        branch: {
          exists: false,
          name: "pairflow/bubble/b-router-delete-err-01"
        }
      },
      tmuxSessionTerminated: false,
      runtimeSessionRemoved: false,
      removedWorktree: false,
      removedBubbleBranch: false
      })
    );
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    const scope: UiRepoScope = {
      repos: [repoPath],
      has: (value: string) => Promise.resolve(value === repoPath)
    };
    const events: UiEventsBroker = {
      subscribe: () => () => undefined,
      getSnapshot: () => ({
        id: 1,
        ts: "2026-02-25T00:00:00.000Z",
        type: "snapshot",
        repos: [],
        bubbles: []
      }),
      refreshNow,
      addRepo: () => Promise.resolve(false),
      removeRepo: () => Promise.resolve(false),
      close: () => Promise.resolve(undefined)
    };

    const router = createUiRouter({
      repoScope: scope,
      events,
      dependencies: {
        deleteBubble
      }
    });
    const server = await startRouterServer(router);

    try {
      const response = await fetch(
        `${server.url}/api/bubbles/b-router-delete-err-01/delete?repo=${encodeURIComponent(repoPath)}`,
        {
          method: "POST",
          body: JSON.stringify({
            force: true
          })
        }
      );

      expect(response.status).toBe(200);
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to refresh UI events after bubble delete",
        refreshError
      );
    } finally {
      consoleErrorSpy.mockRestore();
      await server.close();
    }
  });

  it("returns HTTP 202 confirmation payload without refreshing events when delete is not executed", async () => {
    const repoPath = "/tmp/pairflow-ui-router-delete-repo";
    const refreshNow = vi.fn(() => Promise.resolve(undefined));
    const deleteBubble = vi.fn(() =>
      Promise.resolve({
      bubbleId: "b-router-delete-02",
      deleted: false,
      requiresConfirmation: true,
      artifacts: {
        worktree: {
          exists: true,
          path: "/tmp/worktree"
        },
        tmux: {
          exists: true,
          sessionName: "pf-b-router-delete-02"
        },
        runtimeSession: {
          exists: true,
          sessionName: "pf-b-router-delete-02"
        },
        branch: {
          exists: true,
          name: "pairflow/bubble/b-router-delete-02"
        }
      },
      tmuxSessionTerminated: false,
      runtimeSessionRemoved: false,
      removedWorktree: false,
      removedBubbleBranch: false
      })
    );

    const scope: UiRepoScope = {
      repos: [repoPath],
      has: (value: string) => Promise.resolve(value === repoPath)
    };
    const events: UiEventsBroker = {
      subscribe: () => () => undefined,
      getSnapshot: () => ({
        id: 1,
        ts: "2026-02-25T00:00:00.000Z",
        type: "snapshot",
        repos: [],
        bubbles: []
      }),
      refreshNow,
      addRepo: () => Promise.resolve(false),
      removeRepo: () => Promise.resolve(false),
      close: () => Promise.resolve(undefined)
    };

    const router = createUiRouter({
      repoScope: scope,
      events,
      dependencies: {
        deleteBubble
      }
    });
    const server = await startRouterServer(router);

    try {
      const response = await fetch(
        `${server.url}/api/bubbles/b-router-delete-02/delete?repo=${encodeURIComponent(repoPath)}`,
        {
          method: "POST"
        }
      );
      const payload = (await response.json()) as {
        result: { deleted: boolean; requiresConfirmation: boolean };
      };

      expect(response.status).toBe(202);
      expect(payload.result.deleted).toBe(false);
      expect(payload.result.requiresConfirmation).toBe(true);
      expect(refreshNow).not.toHaveBeenCalled();
    } finally {
      await server.close();
    }
  });
});

describe("createUiRouter attach action", () => {
  it("restarts runtime and retries attach when tmux session is missing", async () => {
    const repoPath = "/tmp/pairflow-ui-router-attach-repo";
    const attachBubble = vi
      .fn()
      .mockRejectedValueOnce(
        new AttachBubbleError(
          "Tmux session \"pf-b-router-attach-recover\" does not exist. Start the bubble runtime first.",
          {
            reasonCode: "TMUX_SESSION_MISSING"
          }
        )
      )
      .mockResolvedValueOnce({
        bubbleId: "b-router-attach-recover",
        tmuxSessionName: "pf-b-router-attach-recover",
        launcherRequested: "auto",
        launcherUsed: "copy",
        attachCommand: "tmux attach -t pf-b-router-attach-recover"
      });
    const startBubble = vi.fn(async () => ({} as never));

    const scope: UiRepoScope = {
      repos: [repoPath],
      has: (value: string) => Promise.resolve(value === repoPath)
    };
    const events: UiEventsBroker = {
      subscribe: () => () => undefined,
      getSnapshot: () => ({
        id: 1,
        ts: "2026-02-25T00:00:00.000Z",
        type: "snapshot",
        repos: [],
        bubbles: []
      }),
      refreshNow: () => Promise.resolve(undefined),
      addRepo: () => Promise.resolve(false),
      removeRepo: () => Promise.resolve(false),
      close: () => Promise.resolve(undefined)
    };

    const router = createUiRouter({
      repoScope: scope,
      events,
      dependencies: {
        attachBubble,
        startBubble
      }
    });
    const server = await startRouterServer(router);

    try {
      const response = await fetch(
        `${server.url}/api/bubbles/b-router-attach-recover/attach?repo=${encodeURIComponent(repoPath)}`,
        {
          method: "POST"
        }
      );
      const payload = (await response.json()) as {
        result: {
          bubbleId: string;
          launcherUsed: string;
          attachCommand?: string;
        };
      };

      expect(response.status).toBe(200);
      expect(payload.result).toMatchObject({
        bubbleId: "b-router-attach-recover",
        launcherUsed: "copy",
        attachCommand: "tmux attach -t pf-b-router-attach-recover"
      });
      expect(startBubble).toHaveBeenCalledTimes(1);
      expect(attachBubble).toHaveBeenCalledTimes(2);
    } finally {
      await server.close();
    }
  });

  it("restarts runtime when attach error carries tmux-missing context reason without explicit reasonCode", async () => {
    const repoPath = "/tmp/pairflow-ui-router-attach-recover-context";
    const attachBubble = vi
      .fn()
      .mockRejectedValueOnce(
        new AttachBubbleError(
          "Tmux session \"pf-b-router-attach-recover-context\" does not exist. Start the bubble runtime first.",
          {
            context: {
              reason: "tmux_session_missing"
            }
          }
        )
      )
      .mockResolvedValueOnce({
        bubbleId: "b-router-attach-recover-context",
        tmuxSessionName: "pf-b-router-attach-recover-context",
        launcherRequested: "auto",
        launcherUsed: "copy",
        attachCommand: "tmux attach -t pf-b-router-attach-recover-context"
      });
    const startBubble = vi.fn(async () => ({} as never));

    const scope: UiRepoScope = {
      repos: [repoPath],
      has: (value: string) => Promise.resolve(value === repoPath)
    };
    const events: UiEventsBroker = {
      subscribe: () => () => undefined,
      getSnapshot: () => ({
        id: 1,
        ts: "2026-02-25T00:00:00.000Z",
        type: "snapshot",
        repos: [],
        bubbles: []
      }),
      refreshNow: () => Promise.resolve(undefined),
      addRepo: () => Promise.resolve(false),
      removeRepo: () => Promise.resolve(false),
      close: () => Promise.resolve(undefined)
    };

    const router = createUiRouter({
      repoScope: scope,
      events,
      dependencies: {
        attachBubble,
        startBubble
      }
    });
    const server = await startRouterServer(router);

    try {
      const response = await fetch(
        `${server.url}/api/bubbles/b-router-attach-recover-context/attach?repo=${encodeURIComponent(repoPath)}`,
        {
          method: "POST"
        }
      );

      expect(response.status).toBe(200);
      expect(startBubble).toHaveBeenCalledTimes(1);
      expect(attachBubble).toHaveBeenCalledTimes(2);
    } finally {
      await server.close();
    }
  });

  it("maps launcher_unavailable attach errors to HTTP 400 with launcher details", async () => {
    const repoPath = "/tmp/pairflow-ui-router-attach-repo";
    const attachBubble = vi.fn(() =>
      Promise.reject(
        new AttachBubbleError("Attach launcher 'iterm2' is unavailable on this host.", {
          launcher: "iterm2",
          failureClass: "launcher_unavailable",
          stderrExcerpt: "Unable to find application named \"iTerm\""
        })
      )
    );

    const scope: UiRepoScope = {
      repos: [repoPath],
      has: (value: string) => Promise.resolve(value === repoPath)
    };
    const events: UiEventsBroker = {
      subscribe: () => () => undefined,
      getSnapshot: () => ({
        id: 1,
        ts: "2026-02-25T00:00:00.000Z",
        type: "snapshot",
        repos: [],
        bubbles: []
      }),
      refreshNow: () => Promise.resolve(undefined),
      addRepo: () => Promise.resolve(false),
      removeRepo: () => Promise.resolve(false),
      close: () => Promise.resolve(undefined)
    };

    const router = createUiRouter({
      repoScope: scope,
      events,
      dependencies: {
        attachBubble
      }
    });
    const server = await startRouterServer(router);

    try {
      const response = await fetch(
        `${server.url}/api/bubbles/b-router-attach-01/attach?repo=${encodeURIComponent(repoPath)}`,
        {
          method: "POST"
        }
      );
      const payload = (await response.json()) as {
        error: {
          code: string;
          details?: Record<string, unknown>;
        };
      };

      expect(response.status).toBe(400);
      expect(payload.error.code).toBe("bad_request");
      expect(payload.error.details).toMatchObject({
        bubbleId: "b-router-attach-01",
        repoPath,
        launcher: "iterm2",
        failureClass: "launcher_unavailable",
        stderrExcerpt: "Unable to find application named \"iTerm\""
      });
    } finally {
      await server.close();
    }
  });

  it("does not retry startBubble for remote attach start-required errors", async () => {
    const repoPath = "/tmp/pairflow-ui-router-attach-repo";
    const attachBubble = vi.fn(() =>
      Promise.reject(
        new AttachBubbleError(
          "Remote bubble 'b-router-attach-remote-created' is not started yet. Run `pairflow bubble start --id b-router-attach-remote-created` first.",
          {
            reasonCode: "REMOTE_ATTACH_START_REQUIRED"
          }
        )
      )
    );
    const startBubble = vi.fn(async () => ({} as never));

    const scope: UiRepoScope = {
      repos: [repoPath],
      has: (value: string) => Promise.resolve(value === repoPath)
    };
    const events: UiEventsBroker = {
      subscribe: () => () => undefined,
      getSnapshot: () => ({
        id: 1,
        ts: "2026-02-25T00:00:00.000Z",
        type: "snapshot",
        repos: [],
        bubbles: []
      }),
      refreshNow: () => Promise.resolve(undefined),
      addRepo: () => Promise.resolve(false),
      removeRepo: () => Promise.resolve(false),
      close: () => Promise.resolve(undefined)
    };

    const router = createUiRouter({
      repoScope: scope,
      events,
      dependencies: {
        attachBubble,
        startBubble
      }
    });
    const server = await startRouterServer(router);

    try {
      const response = await fetch(
        `${server.url}/api/bubbles/b-router-attach-remote-created/attach?repo=${encodeURIComponent(repoPath)}`,
        {
          method: "POST"
        }
      );
      const payload = (await response.json()) as {
        error: {
          code: string;
          details?: Record<string, unknown>;
        };
      };

      expect(response.status).toBe(400);
      expect(payload.error.code).toBe("bad_request");
      expect(payload.error.details).toMatchObject({
        bubbleId: "b-router-attach-remote-created",
        repoPath,
        reasonCode: "REMOTE_ATTACH_START_REQUIRED"
      });
      expect(startBubble).not.toHaveBeenCalled();
      expect(attachBubble).toHaveBeenCalledTimes(1);
    } finally {
      await server.close();
    }
  });

  it("maps remote executor incompatibility attach errors to HTTP 400 with config-invalid taxonomy", async () => {
    const repoPath = "/tmp/pairflow-ui-router-attach-config-invalid";
    const attachBubble = vi.fn(() =>
      Promise.reject(
        new AttachBubbleError(
          "Remote attach for 'b-router-attach-config-invalid' requires an ssh executor configuration.",
          {
            reasonCode: "REMOTE_ATTACH_CONFIG_INVALID",
            context: {
              reason: "remote_executor_invalid"
            }
          }
        )
      )
    );

    const scope: UiRepoScope = {
      repos: [repoPath],
      has: (value: string) => Promise.resolve(value === repoPath)
    };
    const events: UiEventsBroker = {
      subscribe: () => () => undefined,
      getSnapshot: () => ({
        id: 1,
        ts: "2026-02-25T00:00:00.000Z",
        type: "snapshot",
        repos: [],
        bubbles: []
      }),
      refreshNow: () => Promise.resolve(undefined),
      addRepo: () => Promise.resolve(false),
      removeRepo: () => Promise.resolve(false),
      close: () => Promise.resolve(undefined)
    };

    const router = createUiRouter({
      repoScope: scope,
      events,
      dependencies: {
        attachBubble
      }
    });
    const server = await startRouterServer(router);

    try {
      const response = await fetch(
        `${server.url}/api/bubbles/b-router-attach-config-invalid/attach?repo=${encodeURIComponent(repoPath)}`,
        {
          method: "POST"
        }
      );
      const payload = (await response.json()) as {
        error: {
          code: string;
          details?: Record<string, unknown>;
        };
      };

      expect(response.status).toBe(400);
      expect(payload.error.code).toBe("bad_request");
      expect(payload.error.details).toMatchObject({
        bubbleId: "b-router-attach-config-invalid",
        repoPath,
        reasonCode: "REMOTE_ATTACH_CONFIG_INVALID",
        attachContextReason: "remote_executor_invalid"
      });
    } finally {
      await server.close();
    }
  });

  it("maps launcher_launch_failed attach errors to HTTP 500 with launcher details", async () => {
    const repoPath = "/tmp/pairflow-ui-router-attach-repo";
    const attachBubble = vi.fn(() =>
      Promise.reject(
        new AttachBubbleError("Attach launcher 'warp' failed with launcher_launch_failed.", {
          launcher: "warp",
          failureClass: "launcher_launch_failed",
          stderrExcerpt: "URI launch failed"
        })
      )
    );
    const startBubble = vi.fn(async () => ({} as never));

    const scope: UiRepoScope = {
      repos: [repoPath],
      has: (value: string) => Promise.resolve(value === repoPath)
    };
    const events: UiEventsBroker = {
      subscribe: () => () => undefined,
      getSnapshot: () => ({
        id: 1,
        ts: "2026-02-25T00:00:00.000Z",
        type: "snapshot",
        repos: [],
        bubbles: []
      }),
      refreshNow: () => Promise.resolve(undefined),
      addRepo: () => Promise.resolve(false),
      removeRepo: () => Promise.resolve(false),
      close: () => Promise.resolve(undefined)
    };

    const router = createUiRouter({
      repoScope: scope,
      events,
      dependencies: {
        attachBubble,
        startBubble
      }
    });
    const server = await startRouterServer(router);

    try {
      const response = await fetch(
        `${server.url}/api/bubbles/b-router-attach-02/attach?repo=${encodeURIComponent(repoPath)}`,
        {
          method: "POST"
        }
      );
      const payload = (await response.json()) as {
        error: {
          code: string;
          details?: Record<string, unknown>;
        };
      };

      expect(response.status).toBe(500);
      expect(payload.error.code).toBe("internal_error");
      expect(payload.error.details).toMatchObject({
        bubbleId: "b-router-attach-02",
        repoPath,
        launcher: "warp",
        failureClass: "launcher_launch_failed",
        stderrExcerpt: "URI launch failed"
      });
      expect(startBubble).not.toHaveBeenCalled();
    } finally {
      await server.close();
    }
  });
});

describe("createUiRouter restart action", () => {
  it("routes restart action to restartBubble dependency", async () => {
    const repoPath = "/tmp/pairflow-ui-router-restart-repo";
    const restartBubble = vi.fn(async () => ({
      bubbleId: "b-router-restart-01",
      state: {
        state: "RUNNING"
      },
      tmuxSessionName: "pf-b-router-restart-01",
      worktreePath: "/tmp/worktree",
      previousTmuxSessionExisted: true,
      previousRuntimeSessionRemoved: true
    } as unknown as RestartBubbleResult));

    const scope: UiRepoScope = {
      repos: [repoPath],
      has: (value: string) => Promise.resolve(value === repoPath)
    };
    const events: UiEventsBroker = {
      subscribe: () => () => undefined,
      getSnapshot: () => ({
        id: 1,
        ts: "2026-02-25T00:00:00.000Z",
        type: "snapshot",
        repos: [],
        bubbles: []
      }),
      refreshNow: () => Promise.resolve(undefined),
      addRepo: () => Promise.resolve(false),
      removeRepo: () => Promise.resolve(false),
      close: () => Promise.resolve(undefined)
    };

    const router = createUiRouter({
      repoScope: scope,
      events,
      dependencies: {
        restartBubble
      }
    });
    const server = await startRouterServer(router);

    try {
      const response = await fetch(
        `${server.url}/api/bubbles/b-router-restart-01/restart?repo=${encodeURIComponent(repoPath)}`,
        {
          method: "POST"
        }
      );
      const payload = (await response.json()) as {
        result: { bubbleId: string; tmuxSessionName: string };
      };

      expect(response.status).toBe(200);
      expect(payload.result).toMatchObject({
        bubbleId: "b-router-restart-01",
        tmuxSessionName: "pf-b-router-restart-01"
      });
      expect(restartBubble).toHaveBeenCalledWith({
        bubbleId: "b-router-restart-01",
        repoPath
      });
    } finally {
      await server.close();
    }
  });
});
