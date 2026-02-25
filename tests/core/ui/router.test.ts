import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { createUiRouter, resolveStaticAssetPath } from "../../../src/core/ui/router.js";
import type { UiEventsBroker } from "../../../src/core/ui/events.js";
import type { UiRepoScope } from "../../../src/core/ui/repoScope.js";

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
