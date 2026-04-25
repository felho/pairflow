import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { AttachBubbleError } from "../../../src/v11/application/attach/emitAttachV11.js";
import { BubbleCommitErrorV11 as BubbleCommitError } from "../../../src/v11/application/commit/emitCommitV11.js";
import { BubbleMergeErrorV11 as BubbleMergeError } from "../../../src/v11/application/merge/emitMergeV11.js";
import { RemoteBubbleApprovalCommandError } from "../../../src/v11/infrastructure/executor/ssh/sshBubbleApprovalCommand.js";
import { RemoteBubbleCommitCommandError } from "../../../src/v11/infrastructure/executor/ssh/sshBubbleCommitCommand.js";
import { RemoteBubbleStatusError } from "../../../src/v11/infrastructure/executor/ssh/sshBubbleStatus.js";
import type { RestartBubbleResult } from "../../../src/v11/application/restart/restartCommandContract.js";
import type * as EmitApprovalModule from "../../../src/v11/application/approval/emitApprovalV11.js";
import {
  projectApprovalDecisionDeliverySignalToUiDeliverySignal,
  projectApprovalDecisionDeliverySignalsToUiDeliverySignals
} from "../../../src/v11/defaults/ui/routerDefaults.js";
import {
  UiBubbleReviewPolicyConflictError,
  UiBubbleReviewPolicyStateConflictError
} from "../../../src/v11/defaults/ui/updateBubbleReviewPolicyForUi.js";
import { createUiRouter, resolveStaticAssetPath } from "../../../src/v11/infrastructure/ui/router.js";
import type { UiEventsBroker } from "../../../src/v11/infrastructure/ui/events.js";
import type { UiRepoScope } from "../../../src/v11/infrastructure/ui/repoScope.js";
import type { BubbleInboxView } from "../../../src/v11/shared/inbox/inboxCommandApi.js";
import type {
  UiBubbleListView,
  UiCommitBubbleResult
} from "../../../src/v11/shared/ports/uiRouter.js";
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

const emitApprovalModulePath =
  "../../../src/v11/application/approval/emitApprovalV11.js";

async function withMockedApproveRouteDependencies<T>(
  emitApproveV11: ReturnType<typeof vi.fn>,
  run: (createUiRouterWithDefaultProjection: typeof createUiRouter) => Promise<T>
): Promise<T> {
  vi.resetModules();
  vi.doMock(emitApprovalModulePath, async () => {
    const actual = await vi.importActual<typeof EmitApprovalModule>(
      emitApprovalModulePath
    );

    return {
      ...actual,
      emitApproveV11
    };
  });

  try {
    const { createUiRouter: createUiRouterWithDefaultProjection } = await import(
      "../../../src/v11/infrastructure/ui/router.js"
    );
    return await run(createUiRouterWithDefaultProjection);
  } finally {
    vi.resetModules();
    vi.doUnmock(emitApprovalModulePath);
  }
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

describe("approval decision delivery projection", () => {
  it("projects application delivery compat fields out of the shared UI/public contract", () => {
    const accepted = projectApprovalDecisionDeliverySignalToUiDeliverySignal({
      status: "accepted",
      message: "Approval delivered to reviewer.",
      sessionName: "pf-b-router-approve-success",
      targetPaneIndex: 1
    });
    const rejected = projectApprovalDecisionDeliverySignalToUiDeliverySignal({
      status: "rejected",
      message: "Implementer delivery could not be confirmed.",
      reason: "no_runtime_session",
      reason_code: "DELIVERY_ACK_RUNTIME_SESSION_UNAVAILABLE"
    });

    expect(accepted).toStrictEqual({
      status: "accepted",
      message: "Approval delivered to reviewer.",
      sessionName: "pf-b-router-approve-success",
      targetPaneIndex: 1
    });
    expect("delivered" in (accepted as object)).toBe(false);
    expect(rejected).toStrictEqual({
      status: "rejected",
      message: "Implementer delivery could not be confirmed.",
      reason: "no_runtime_session",
      reason_code: "DELIVERY_ACK_RUNTIME_SESSION_UNAVAILABLE"
    });
    expect("delivered" in (rejected as object)).toBe(false);
  });

  it("projects approval delivery collections out of the shared UI/public contract", () => {
    const projected = projectApprovalDecisionDeliverySignalsToUiDeliverySignals({
      statusDelivery: {
        status: "accepted",
        message: "Approval delivered to reviewer.",
        sessionName: "pf-b-router-approve-success",
        targetPaneIndex: 1
      },
      implementerDelivery: {
        status: "rejected",
        message: "Implementer delivery could not be confirmed.",
        reason: "no_runtime_session",
        reason_code: "DELIVERY_ACK_RUNTIME_SESSION_UNAVAILABLE"
      }
    });

    expect(projected).toStrictEqual({
      statusDelivery: {
        status: "accepted",
        message: "Approval delivered to reviewer.",
        sessionName: "pf-b-router-approve-success",
        targetPaneIndex: 1
      },
      implementerDelivery: {
        status: "rejected",
        message: "Implementer delivery could not be confirmed.",
        reason: "no_runtime_session",
        reason_code: "DELIVERY_ACK_RUNTIME_SESSION_UNAVAILABLE"
      }
    });
    expect("delivered" in (projected.statusDelivery as object)).toBe(false);
    expect("delivered" in (projected.implementerDelivery as object)).toBe(false);
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

  it("suppresses previous-run quiet-pane attention through the first-party detail route", async () => {
    const repoPath = "/tmp/pairflow-ui-router-detail-prev-run-repo";
    const bubbleId = "b-router-detail-prev-run-01";
    const status: BubbleStatusView = {
      bubbleId,
      repoPath,
      worktreePath: "/tmp/worktree",
      bubbleStartedAt: "2026-02-24T12:00:00.000Z",
      state: "RUNNING",
      round: 2,
      activeAgent: "codex",
      activeRole: "implementer",
      activeSince: "2026-02-24T12:00:00.000Z",
      lastCommandAt: "2026-02-24T12:06:00.000Z",
      paneActivity: {
        readStatus: "ok",
        lastChangedAt: "2026-02-24T11:50:00.000Z",
        sampledAt: "2026-02-24T11:59:59.000Z",
        sinceLastChangedSeconds: 960,
        sinceSampledSeconds: 361,
        lastSampleStatus: "sampled",
        lastSampleError: null,
        sessionName: "pf-b-router-detail-prev-run-01",
        targetPane: "pf-b-router-detail-prev-run-01:0.1"
      },
      executionContext: null,
      watchdog: {
        monitored: true,
        monitoredAgent: "codex",
        timeoutMinutes: 30,
        referenceTimestamp: "2026-02-24T12:06:00.000Z",
        deadlineTimestamp: "2026-02-24T12:36:00.000Z",
        remainingSeconds: 1800,
        expired: false
      },
      pendingInboxItems: {
        humanQuestions: 0,
        approvalRequests: 0,
        total: 0
      },
      transcript: {
        totalMessages: 3,
        lastMessageType: "PASS",
        lastMessageTs: "2026-02-24T12:06:00.000Z",
        lastMessageId: "msg_prev_run_quiet_01"
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
      stateValidation: null
    };
    const inbox: BubbleInboxView = {
      bubbleId,
      repoPath,
      state: "RUNNING",
      pending: {
        humanQuestions: 0,
        approvalRequests: 0,
        total: 0
      },
      items: []
    };
    const getBubbleStatus = vi.fn(async () => status);
    const getBubbleInbox = vi.fn(async () => inbox);
    const readRuntimeSessionsRegistry = vi.fn(async () => ({
      [bubbleId]: {
        bubbleId,
        repoPath,
        worktreePath: "/tmp/worktree",
        tmuxSessionName: "pf-b-router-detail-prev-run-01",
        updatedAt: "2026-02-24T12:06:00.000Z"
      }
    }));

    const router = createUiRouter({
      repoScope: {
        repos: [repoPath],
        has: (value: string) => Promise.resolve(value === repoPath)
      },
      events: {
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
      },
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
        };
      };

      expect(response.status).toBe(200);
      expect(payload.bubble.attention ?? null).toBeNull();
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

describe("createUiRouter action routes", () => {
  describe("attach routes", () => {
    it("returns attach error when tmux session is missing", async () => {
      const repoPath = "/tmp/pairflow-ui-router-attach-repo";
      const attachBubble = vi.fn(() =>
        Promise.reject(
          new AttachBubbleError(
            "Tmux session \"pf-b-router-attach-recover\" does not exist. Start the bubble runtime first.",
            {
              reasonCode: "TMUX_SESSION_MISSING"
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
          `${server.url}/api/bubbles/b-router-attach-recover/attach?repo=${encodeURIComponent(repoPath)}`,
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

        expect(response.status).toBe(409);
        expect(payload.error.code).toBe("conflict");
        expect(payload.error.details).toMatchObject({
          bubbleId: "b-router-attach-recover",
          repoPath
        });
        expect(startBubble).not.toHaveBeenCalled();
        expect(attachBubble).toHaveBeenCalledTimes(1);
      } finally {
        await server.close();
      }
    });

    it("returns attach context when tmux-missing error is reported via context reason", async () => {
      const repoPath = "/tmp/pairflow-ui-router-attach-recover-context";
      const attachBubble = vi.fn(() =>
        Promise.reject(
          new AttachBubbleError(
            "Tmux session \"pf-b-router-attach-recover-context\" does not exist. Start the bubble runtime first.",
            {
              context: {
                reason: "tmux_session_missing"
              }
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
          `${server.url}/api/bubbles/b-router-attach-recover-context/attach?repo=${encodeURIComponent(repoPath)}`,
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

        expect(response.status).toBe(409);
        expect(payload.error.code).toBe("conflict");
        expect(startBubble).not.toHaveBeenCalled();
        expect(attachBubble).toHaveBeenCalledTimes(1);
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
  });

  describe("approval and rework routes", () => {
    it("returns neutral approval delivery signals from the first-party approve route", async () => {
      const repoPath = "/tmp/pairflow-ui-router-approve-success";
      const emitApprove = vi.fn(async () => ({
        bubbleId: "b-router-approve-success",
        sequence: 7,
        envelope: {} as never,
        state: {} as never,
        delivery: {
          statusDelivery: {
            status: "accepted" as const,
            message: "Approval delivered to reviewer.",
            sessionName: "pf-b-router-approve-success",
            targetPaneIndex: 1
          }
        }
      }));

      const router = createUiRouter({
        repoScope: {
          repos: [repoPath],
          has: (value: string) => Promise.resolve(value === repoPath)
        },
        events: {
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
        },
        dependencies: {
          emitApprove
        }
      });
      const server = await startRouterServer(router);

      try {
        const response = await fetch(
          `${server.url}/api/bubbles/b-router-approve-success/approve?repo=${encodeURIComponent(repoPath)}`,
          {
            method: "POST",
            headers: {
              "content-type": "application/json"
            },
            body: JSON.stringify({})
          }
        );
        const payload = (await response.json()) as {
          result: {
            delivery?: {
              statusDelivery: {
                status: string;
                message: string;
                sessionName?: string;
                targetPaneIndex?: number;
              };
            };
          };
        };

        expect(response.status).toBe(200);
        expect(payload.result.delivery?.statusDelivery).toStrictEqual({
          status: "accepted",
          message: "Approval delivered to reviewer.",
          sessionName: "pf-b-router-approve-success",
          targetPaneIndex: 1
        });
      } finally {
        await server.close();
      }
    });

    it("strips legacy delivered fields from the default first-party approve route dependency chain", async () => {
      let server: Awaited<ReturnType<typeof startRouterServer>> | undefined;

      const emitApproveV11 = vi.fn(async () => ({
        bubbleId: "b-router-approve-default",
        sequence: 9,
        envelope: {} as never,
        state: {} as never,
        delivery: {
          statusDelivery: {
            status: "accepted" as const,
            message: "Approval delivered to reviewer.",
            sessionName: "pf-b-router-approve-default",
            targetPaneIndex: 1
          },
          implementerDelivery: {
            status: "rejected" as const,
            message: "Implementer delivery could not be confirmed.",
            reason: "no_runtime_session" as const,
            reason_code: "DELIVERY_ACK_RUNTIME_SESSION_UNAVAILABLE" as const
          }
        }
      }));

      try {
        await withMockedApproveRouteDependencies(
          emitApproveV11,
          async (createUiRouterWithDefaultProjection) => {
            const repoPath = "/tmp/pairflow-ui-router-approve-default";
            const router = createUiRouterWithDefaultProjection({
              repoScope: {
                repos: [repoPath],
                has: (value: string) => Promise.resolve(value === repoPath)
              },
              events: {
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
              }
            });
            server = await startRouterServer(router);

            const response = await fetch(
              `${server.url}/api/bubbles/b-router-approve-default/approve?repo=${encodeURIComponent(repoPath)}`,
              {
                method: "POST",
                headers: {
                  "content-type": "application/json"
                },
                body: JSON.stringify({})
              }
            );
            const payload = (await response.json()) as {
              result: {
                delivery?: {
                  statusDelivery: {
                    status: string;
                    message: string;
                    sessionName?: string;
                    targetPaneIndex?: number;
                  };
                  implementerDelivery?: {
                    status: string;
                    message: string;
                    reason?: string;
                    reason_code?: string;
                  };
                };
              };
            };

            expect(response.status).toBe(200);
            expect(emitApproveV11).toHaveBeenCalledTimes(1);
            expect(payload.result.delivery).toStrictEqual({
              statusDelivery: {
                status: "accepted",
                message: "Approval delivered to reviewer.",
                sessionName: "pf-b-router-approve-default",
                targetPaneIndex: 1
              },
              implementerDelivery: {
                status: "rejected",
                message: "Implementer delivery could not be confirmed.",
                reason: "no_runtime_session",
                reason_code: "DELIVERY_ACK_RUNTIME_SESSION_UNAVAILABLE"
              }
            });
            expect(
              "delivered" in ((payload.result.delivery?.statusDelivery ?? {}) as object)
            ).toBe(false);
            expect(
              "delivered" in ((payload.result.delivery?.implementerDelivery ?? {}) as object)
            ).toBe(false);
          }
        );
      } finally {
        if (server !== undefined) {
          await server.close();
        }
      }
    });

    it("preserves neutral rework delivery rejection fields on the first-party route", async () => {
      const repoPath = "/tmp/pairflow-ui-router-rework-success";
      const emitRequestRework = vi.fn(async () => ({
        mode: "immediate" as const,
        bubbleId: "b-router-rework-success",
        sequence: 8,
        envelope: {} as never,
        state: {} as never,
        delivery: {
          statusDelivery: {
            status: "accepted" as const,
            message: "Rework request recorded for reviewer."
          },
          implementerDelivery: {
            status: "rejected" as const,
            message: "Implementer delivery could not be confirmed.",
            reason: "no_runtime_session" as const,
            reason_code: "DELIVERY_ACK_RUNTIME_SESSION_UNAVAILABLE" as const
          }
        }
      }));

      const router = createUiRouter({
        repoScope: {
          repos: [repoPath],
          has: (value: string) => Promise.resolve(value === repoPath)
        },
        events: {
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
        },
        dependencies: {
          emitRequestRework
        }
      });
      const server = await startRouterServer(router);

      try {
        const response = await fetch(
          `${server.url}/api/bubbles/b-router-rework-success/request-rework?repo=${encodeURIComponent(repoPath)}`,
          {
            method: "POST",
            headers: {
              "content-type": "application/json"
            },
            body: JSON.stringify({
              message: "Please rework."
            })
          }
        );
        const payload = (await response.json()) as {
          result: {
            mode: string;
            delivery?: {
              statusDelivery: {
                status: string;
                message: string;
              };
              implementerDelivery?: {
                status: string;
                message: string;
                reason?: string;
                reason_code?: string;
              };
            };
          };
        };

        expect(response.status).toBe(200);
        expect(payload.result.mode).toBe("immediate");
        expect(payload.result.delivery).toStrictEqual({
          statusDelivery: {
            status: "accepted",
            message: "Rework request recorded for reviewer."
          },
          implementerDelivery: {
            status: "rejected",
            message: "Implementer delivery could not be confirmed.",
            reason: "no_runtime_session",
            reason_code: "DELIVERY_ACK_RUNTIME_SESSION_UNAVAILABLE"
          }
        });
      } finally {
        await server.close();
      }
    });
    it("maps remote approve start-required failures to HTTP 409 conflict", async () => {
    const repoPath = "/tmp/pairflow-ui-router-approve-remote-created";
    const emitApprove = vi.fn(() =>
      Promise.reject(
        new Error(
          "Remote approval for 'b-router-approve-remote-created' requires a started remote pointer. Run `pairflow bubble start --id b-router-approve-remote-created` first."
        )
      )
    );
    const status: BubbleStatusView = {
      bubbleId: "b-router-approve-remote-created",
      repoPath,
      worktreePath: "/tmp/worktree",
      bubbleStartedAt: "2026-04-17T09:00:00.000Z",
      state: "CREATED",
      round: 0,
      activeAgent: null,
      activeRole: null,
      activeSince: null,
      lastCommandAt: null,
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
        approvalRequests: 0,
        total: 0
      },
      transcript: {
        totalMessages: 0,
        lastMessageType: null,
        lastMessageTs: null,
        lastMessageId: null
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
        round: 0
      },
      stateValidation: null
    };
    const inbox: BubbleInboxView = {
      bubbleId: "b-router-approve-remote-created",
      repoPath,
      state: "CREATED",
      pending: {
        humanQuestions: 0,
        approvalRequests: 0,
        total: 0
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
        emitApprove,
        getBubbleStatus,
        getBubbleInbox,
        readRuntimeSessionsRegistry
      }
    });
    const server = await startRouterServer(router);

    try {
      const response = await fetch(
        `${server.url}/api/bubbles/b-router-approve-remote-created/approve?repo=${encodeURIComponent(repoPath)}`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify({})
        }
      );
      const payload = (await response.json()) as {
        error: {
          code: string;
          details?: Record<string, unknown>;
        };
      };

      expect(response.status).toBe(409);
      expect(payload.error.code).toBe("conflict");
      expect(payload.error.details).toMatchObject({
        bubbleId: "b-router-approve-remote-created",
        repoPath,
        currentState: "CREATED"
      });
      expect(emitApprove).toHaveBeenCalledTimes(1);
    } finally {
      await server.close();
    }
    });

    it("maps remote approval transport failures to HTTP 500 with remote approval taxonomy", async () => {
    const repoPath = "/tmp/pairflow-ui-router-approve-remote-transport";
    const emitApprove = vi.fn(() =>
      Promise.reject(
        new RemoteBubbleApprovalCommandError({
          code: "REMOTE_APPROVAL_TRANSPORT_FAILED",
          message: "ssh transport failed (exit 255): connection refused"
        })
      )
    );
    const status: BubbleStatusView = {
      bubbleId: "b-router-approve-remote-transport",
      repoPath,
      worktreePath: "/tmp/worktree",
      bubbleStartedAt: "2026-04-17T09:00:00.000Z",
      state: "READY_FOR_HUMAN_APPROVAL",
      round: 2,
      activeAgent: null,
      activeRole: null,
      activeSince: null,
      lastCommandAt: "2026-04-17T09:00:00.000Z",
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
        lastMessageTs: "2026-04-17T09:00:00.000Z",
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
      stateValidation: null
    };
    const inbox: BubbleInboxView = {
      bubbleId: "b-router-approve-remote-transport",
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
        emitApprove,
        getBubbleStatus,
        getBubbleInbox,
        readRuntimeSessionsRegistry
      }
    });
    const server = await startRouterServer(router);

    try {
      const response = await fetch(
        `${server.url}/api/bubbles/b-router-approve-remote-transport/approve?repo=${encodeURIComponent(repoPath)}`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify({})
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
        bubbleId: "b-router-approve-remote-transport",
        repoPath,
        reasonCode: "REMOTE_APPROVAL_TRANSPORT_FAILED"
      });
    } finally {
      await server.close();
    }
    });

    it("maps remote approval payload failures to HTTP 500 with remote approval taxonomy", async () => {
    const repoPath = "/tmp/pairflow-ui-router-rework-remote-payload";
    const emitRequestRework = vi.fn(() =>
      Promise.reject(
        new RemoteBubbleApprovalCommandError({
          code: "REMOTE_APPROVAL_PAYLOAD_INVALID",
          message: "Remote request-rework returned malformed payload."
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
        emitRequestRework
      }
    });
    const server = await startRouterServer(router);

    try {
      const response = await fetch(
        `${server.url}/api/bubbles/b-router-rework-remote-payload/request-rework?repo=${encodeURIComponent(repoPath)}`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify({
            message: "Please rework."
          })
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
        bubbleId: "b-router-rework-remote-payload",
        repoPath,
        reasonCode: "REMOTE_APPROVAL_PAYLOAD_INVALID"
      });
    } finally {
      await server.close();
    }
    });
  });

  it("accepts stageAll commit bodies and rejects legacy auto before dispatch", async () => {
    const repoPath = "/tmp/pairflow-ui-router-commit-stage-all";
    const commitBubble = vi.fn(() =>
      Promise.resolve({
        bubbleId: "b-router-commit-stage-all",
        commitSha: "abc123"
      } as UiCommitBubbleResult)
    );
    const router = createUiRouter({
      repoScope: {
        repos: [repoPath],
        has: (value: string) => Promise.resolve(value === repoPath)
      },
      events: {
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
      },
      dependencies: {
        commitBubble
      }
    });
    const server = await startRouterServer(router);
    const commitUrl =
      `${server.url}/api/bubbles/b-router-commit-stage-all/commit?repo=${encodeURIComponent(repoPath)}`;

    try {
      const legacyAuto = await fetch(commitUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          auto: true
        })
      });
      expect(legacyAuto.status).toBe(400);
      await expect(legacyAuto.json()).resolves.toMatchObject({
        error: {
          message:
            "Commit request field `auto` is no longer supported; use boolean field `stageAll`."
        }
      });

      const dualField = await fetch(commitUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          stageAll: true,
          auto: true
        })
      });
      expect(dualField.status).toBe(400);
      await expect(dualField.json()).resolves.toMatchObject({
        error: {
          message:
            "Commit request cannot include both `stageAll` and legacy `auto`; remove `auto`."
        }
      });

      const missingStageAll = await fetch(commitUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({})
      });
      expect(missingStageAll.status).toBe(400);

      const valid = await fetch(commitUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          stageAll: true,
          message: "Commit message",
          refs: ["artifacts/commit-evidence.md"]
        })
      });

      expect(valid.status).toBe(200);
      expect(commitBubble).toHaveBeenCalledTimes(1);
      expect(commitBubble).toHaveBeenCalledWith(
        expect.objectContaining({
          bubbleId: "b-router-commit-stage-all",
          repoPath,
          stageAll: true,
          message: "Commit message",
          refs: ["artifacts/commit-evidence.md"]
        })
      );
    } finally {
      await server.close();
    }
  });

  it("maps remote commit start-required failures to HTTP 409 conflict with commit taxonomy", async () => {
    const repoPath = "/tmp/pairflow-ui-router-commit-remote-created";
    const commitBubble = vi.fn(() =>
      Promise.reject(
        new BubbleCommitError({
          reasonCode: "COMMIT_REMOTE_START_REQUIRED",
          message:
            "Remote commit for 'b-router-commit-remote-created' requires a started remote pointer. Run `pairflow bubble start --id b-router-commit-remote-created` first."
        })
      )
    );
    const status: BubbleStatusView = {
      bubbleId: "b-router-commit-remote-created",
      repoPath,
      worktreePath: "/tmp/worktree",
      bubbleStartedAt: "2026-04-18T08:00:00.000Z",
      state: "CREATED",
      round: 0,
      activeAgent: null,
      activeRole: null,
      activeSince: null,
      lastCommandAt: null,
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
        approvalRequests: 0,
        total: 0
      },
      transcript: {
        totalMessages: 0,
        lastMessageType: null,
        lastMessageTs: null,
        lastMessageId: null
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
        round: 0
      },
      stateValidation: null
    };
    const inbox: BubbleInboxView = {
      bubbleId: "b-router-commit-remote-created",
      repoPath,
      state: "CREATED",
      pending: {
        humanQuestions: 0,
        approvalRequests: 0,
        total: 0
      },
      items: []
    };
    const router = createUiRouter({
      repoScope: {
        repos: [repoPath],
        has: (value: string) => Promise.resolve(value === repoPath)
      },
      events: {
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
      },
      dependencies: {
        commitBubble,
        getBubbleStatus: vi.fn(async () => status),
        getBubbleInbox: vi.fn(async () => inbox),
        readRuntimeSessionsRegistry: vi.fn(async () => ({}))
      }
    });
    const server = await startRouterServer(router);

    try {
      const response = await fetch(
        `${server.url}/api/bubbles/b-router-commit-remote-created/commit?repo=${encodeURIComponent(repoPath)}`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify({
            stageAll: false
          })
        }
      );
      const payload = (await response.json()) as {
        error: {
          code: string;
          details?: Record<string, unknown>;
        };
      };

      expect(response.status).toBe(409);
      expect(payload.error.code).toBe("conflict");
      expect(payload.error.details).toMatchObject({
        bubbleId: "b-router-commit-remote-created",
        repoPath,
        currentState: "CREATED",
        reasonCode: "COMMIT_REMOTE_START_REQUIRED"
      });
    } finally {
      await server.close();
    }
  });

  it("maps remote commit sync-back failures to HTTP 500 with commit taxonomy", async () => {
    const repoPath = "/tmp/pairflow-ui-router-commit-syncback";
    const router = createUiRouter({
      repoScope: {
        repos: [repoPath],
        has: (value: string) => Promise.resolve(value === repoPath)
      },
      events: {
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
      },
      dependencies: {
        commitBubble: vi.fn(() =>
          Promise.reject(
            new BubbleCommitError({
              reasonCode: "REMOTE_COMMIT_SYNC_BACK_FAILED",
              message: "Remote commit succeeded, but local sync-back failed."
            })
          )
        )
      }
    });
    const server = await startRouterServer(router);

    try {
      const response = await fetch(
        `${server.url}/api/bubbles/b-router-commit-syncback/commit?repo=${encodeURIComponent(repoPath)}`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify({
            stageAll: false
          })
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
        bubbleId: "b-router-commit-syncback",
        repoPath,
        reasonCode: "REMOTE_COMMIT_SYNC_BACK_FAILED"
      });
    } finally {
      await server.close();
    }
  });

  it("maps remote commit transport failures to HTTP 500 with commit taxonomy", async () => {
    const repoPath = "/tmp/pairflow-ui-router-commit-transport";
    const router = createUiRouter({
      repoScope: {
        repos: [repoPath],
        has: (value: string) => Promise.resolve(value === repoPath)
      },
      events: {
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
      },
      dependencies: {
        commitBubble: vi.fn(() =>
          Promise.reject(
            new BubbleCommitError({
              reasonCode: "REMOTE_COMMIT_TRANSPORT_FAILED",
              message: "ssh transport failed during remote commit."
            })
          )
        )
      }
    });
    const server = await startRouterServer(router);

    try {
      const response = await fetch(
        `${server.url}/api/bubbles/b-router-commit-transport/commit?repo=${encodeURIComponent(repoPath)}`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify({
            stageAll: false
          })
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
        bubbleId: "b-router-commit-transport",
        repoPath,
        reasonCode: "REMOTE_COMMIT_TRANSPORT_FAILED"
      });
    } finally {
      await server.close();
    }
  });

  it("maps remote commit payload failures to HTTP 500 with commit taxonomy", async () => {
    const repoPath = "/tmp/pairflow-ui-router-commit-payload";
    const router = createUiRouter({
      repoScope: {
        repos: [repoPath],
        has: (value: string) => Promise.resolve(value === repoPath)
      },
      events: {
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
      },
      dependencies: {
        commitBubble: vi.fn(() =>
          Promise.reject(
            new BubbleCommitError({
              reasonCode: "REMOTE_COMMIT_PAYLOAD_INVALID",
              message: "Remote commit returned malformed payload."
            })
          )
        )
      }
    });
    const server = await startRouterServer(router);

    try {
      const response = await fetch(
        `${server.url}/api/bubbles/b-router-commit-payload/commit?repo=${encodeURIComponent(repoPath)}`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify({
            stageAll: false
          })
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
        bubbleId: "b-router-commit-payload",
        repoPath,
        reasonCode: "REMOTE_COMMIT_PAYLOAD_INVALID"
      });
    } finally {
      await server.close();
    }
  });

  it("preserves reasonCode when commitBubble leaks a raw remote commit command error", async () => {
    const repoPath = "/tmp/pairflow-ui-router-commit-raw-payload";
    const router = createUiRouter({
      repoScope: {
        repos: [repoPath],
        has: (value: string) => Promise.resolve(value === repoPath)
      },
      events: {
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
      },
      dependencies: {
        commitBubble: vi.fn(() =>
          Promise.reject(
            new RemoteBubbleCommitCommandError({
              code: "REMOTE_COMMIT_PAYLOAD_INVALID",
              message: "Remote commit returned malformed payload."
            })
          )
        )
      }
    });
    const server = await startRouterServer(router);

    try {
      const response = await fetch(
        `${server.url}/api/bubbles/b-router-commit-raw-payload/commit?repo=${encodeURIComponent(repoPath)}`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify({
            stageAll: false
          })
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
        bubbleId: "b-router-commit-raw-payload",
        repoPath,
        reasonCode: "REMOTE_COMMIT_PAYLOAD_INVALID"
      });
    } finally {
      await server.close();
    }
  });

  it("maps remote merge start-required failures to HTTP 409 with merge taxonomy", async () => {
    const repoPath = "/tmp/pairflow-ui-router-merge-remote-start";
    const router = createUiRouter({
      repoScope: {
        repos: [repoPath],
        has: (value: string) => Promise.resolve(value === repoPath)
      },
      events: {
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
      },
      dependencies: {
        getBubbleStatus: vi.fn(async (): Promise<BubbleStatusView> => ({
          bubbleId: "b-router-merge-remote-start",
          repoPath,
          worktreePath: "/tmp/worktree",
          bubbleStartedAt: null,
          state: "DONE" as const,
          round: 1,
          activeAgent: null,
          activeRole: null,
          activeSince: null,
          lastCommandAt: "2026-04-18T08:10:00.000Z",
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
            approvalRequests: 0,
            total: 0
          },
          transcript: {
            totalMessages: 0,
            lastMessageType: null,
            lastMessageTs: null,
            lastMessageId: null
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
            round: 1
          },
          stateValidation: null
        })),
        getBubbleInbox: vi.fn(async (): Promise<BubbleInboxView> => ({
          bubbleId: "b-router-merge-remote-start",
          repoPath,
          state: "DONE" as const,
          pending: {
            humanQuestions: 0,
            approvalRequests: 0,
            total: 0
          },
          items: []
        })),
        readRuntimeSessionsRegistry: vi.fn(async () => ({})),
        mergeBubble: vi.fn(() =>
          Promise.reject(
            new BubbleMergeError({
              reasonCode: "MERGE_REMOTE_START_REQUIRED",
              message: "Remote merge requires a started pointer."
            })
          )
        )
      }
    });
    const server = await startRouterServer(router);

    try {
      const response = await fetch(
        `${server.url}/api/bubbles/b-router-merge-remote-start/merge?repo=${encodeURIComponent(repoPath)}`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify({})
        }
      );
      const payload = (await response.json()) as {
        error: {
          code: string;
          details?: Record<string, unknown>;
        };
      };

      expect(response.status).toBe(409);
      expect(payload.error.code).toBe("conflict");
      expect(payload.error.details).toMatchObject({
        bubbleId: "b-router-merge-remote-start",
        repoPath,
        currentState: "DONE",
        reasonCode: "MERGE_REMOTE_START_REQUIRED"
      });
    } finally {
      await server.close();
    }
  });

  it.each([
    "REMOTE_MERGE_COMMAND_FAILED",
    "REMOTE_MERGE_TRANSPORT_FAILED",
    "REMOTE_MERGE_PAYLOAD_INVALID",
    "MERGE_REMOTE_HANDOFF_INVALID",
    "MERGE_REMOTE_IMPORT_FAILED",
    "MERGE_REMOTE_POST_CLEANUP_FLAGS_UNSUPPORTED",
    "MERGE_REMOTE_RECONCILE_FAILED",
    "MERGE_BASE_BRANCH_PUSH_FAILED",
    "MERGE_REMOTE_DELETE_ORIGIN_UNAVAILABLE",
    "MERGE_REMOTE_DELETE_FAILED"
  ])("maps %s merge failures to HTTP 500 with retained reason code", async (reasonCode) => {
    const repoPath = `/tmp/pairflow-ui-router-merge-${reasonCode.toLowerCase()}`;
    const router = createUiRouter({
      repoScope: {
        repos: [repoPath],
        has: (value: string) => Promise.resolve(value === repoPath)
      },
      events: {
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
      },
      dependencies: {
        mergeBubble: vi.fn(() =>
          Promise.reject(
            new BubbleMergeError({
              reasonCode,
              message: `${reasonCode}: merge failed`
            })
          )
        )
      }
    });
    const server = await startRouterServer(router);

    try {
      const response = await fetch(
        `${server.url}/api/bubbles/b-router-merge-internal/merge?repo=${encodeURIComponent(repoPath)}`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify({})
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
        bubbleId: "b-router-merge-internal",
        repoPath,
        reasonCode
      });
    } finally {
      await server.close();
    }
  });

  it("maps remote approval target/config failures to HTTP 400 with actionable taxonomy", async () => {
    const repoPath = "/tmp/pairflow-ui-router-approve-remote-config";
    const emitApprove = vi.fn(() =>
      Promise.reject(
        new RemoteBubbleStatusError({
          code: "REMOTE_STATUS_CONFIG_INVALID",
          message:
            "Remote status for b-router-approve-remote-config refused host mismatch: pointer host (pointer.example.com) does not match configured execution host (ssh.example.com)."
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
        emitApprove
      }
    });
    const server = await startRouterServer(router);

    try {
      const response = await fetch(
        `${server.url}/api/bubbles/b-router-approve-remote-config/approve?repo=${encodeURIComponent(repoPath)}`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify({})
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
        bubbleId: "b-router-approve-remote-config",
        repoPath,
        reasonCode: "REMOTE_STATUS_CONFIG_INVALID"
      });
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

describe("createUiRouter review policy action", () => {
  function createReviewPolicyStatus(input: {
    repoPath: string;
    bubbleId: string;
    state?: "RUNNING" | "DONE";
  }) {
    return {
      bubbleId: input.bubbleId,
      repoPath: input.repoPath,
      worktreePath: "/tmp/worktree",
      bubbleStartedAt: "2026-02-24T12:00:00.000Z",
      state: input.state ?? "RUNNING",
      round: 1,
      activeAgent: "codex" as const,
      activeRole: "implementer" as const,
      activeSince: "2026-02-24T12:00:00.000Z",
      lastCommandAt: "2026-02-24T12:00:30.000Z",
      paneActivity: {
        readStatus: "missing" as const,
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
      reviewPolicy: {
        requested_loop_mode: "full" as const,
        effective_loop_mode: "full" as const,
        support_status: "enabled" as const,
        meta_review_auto_rework_min_severity: "P1" as const
      },
      watchdog: {
        monitored: true,
        monitoredAgent: "codex" as const,
        timeoutMinutes: 30,
        referenceTimestamp: "2026-02-24T12:00:30.000Z",
        deadlineTimestamp: "2026-02-24T12:30:30.000Z",
        remainingSeconds: 1800,
        expired: false
      },
      pendingInboxItems: {
        humanQuestions: 0,
        approvalRequests: 0,
        total: 0
      },
      transcript: {
        totalMessages: 1,
        lastMessageType: "TASK" as const,
        lastMessageTs: "2026-02-24T12:00:00.000Z",
        lastMessageId: "msg_001"
      },
      metaReview: {
        actor: "meta-reviewer" as const,
        authorityActive: false,
        runtimeDelivery: null
      },
      commandPath: {
        status: "external" as const,
        profile: "external" as const,
        localEntrypoint: "/tmp/worktree/dist/cli/index.js",
        activeEntrypoint: "/usr/local/bin/pairflow",
        message: "external Pairflow CLI active",
        pinnedCommand: "pairflow"
      },
      accuracy_critical: false,
      last_review_verification: "missing" as const,
      failing_gates: [],
      spec_lock_state: {
        state: "IMPLEMENTABLE" as const,
        open_blocker_count: 0,
        open_required_now_count: 0
      },
      round_gate_state: {
        applies: false,
        violated: false,
        round: 1
      },
      stateValidation: null,
      bubbleToml: `id = "${input.bubbleId}"`
    };
  }

  it("routes review-policy updates to the dedicated dependency", async () => {
    const repoPath = "/tmp/pairflow-ui-router-review-policy-repo";
    const updateBubbleReviewPolicy = vi.fn(async () => ({
      kind: "review_policy_updated" as const,
      bubbleId: "b-router-policy-01",
      reviewPolicy: {
        requested_loop_mode: "meta_only" as const,
        effective_loop_mode: "full" as const,
        support_status: "guarded" as const,
        meta_review_auto_rework_min_severity: "P1" as const,
        blocked_reason_code: "REVIEW_POLICY_META_ONLY_GUARDED",
        blocked_prerequisites: [
          "reviewer_bypass_activation_phase3b_pending"
        ],
        provenance_note: "Phase 3A stays guarded."
      },
      previousRequestedLoopMode: "full" as const,
      nextRequestedLoopMode: "meta_only" as const,
      activationChange: "none" as const,
      bubbleToml: "bubble.toml"
    }));

    const router = createUiRouter({
      repoScope: {
        repos: [repoPath],
        has: (value: string) => Promise.resolve(value === repoPath)
      },
      events: {
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
      },
      dependencies: {
        updateBubbleReviewPolicy
      }
    });
    const server = await startRouterServer(router);

    try {
      const response = await fetch(
        `${server.url}/api/bubbles/b-router-policy-01/update-review-policy?repo=${encodeURIComponent(repoPath)}`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify({
            reviewLoopMode: "meta_only",
            metaReviewAutoReworkMinSeverity: "P2",
            expectedBubbleToml: "id = \"b-router-policy-01\""
          })
        }
      );
      const payload = (await response.json()) as {
        result: {
          bubbleId: string;
          activationChange: string;
          reviewPolicy: {
            requested_loop_mode: string;
            effective_loop_mode: string;
          };
        };
      };

      expect(response.status).toBe(200);
      expect(payload.result).toMatchObject({
        bubbleId: "b-router-policy-01",
        activationChange: "none",
        reviewPolicy: {
          requested_loop_mode: "meta_only",
          effective_loop_mode: "full"
        }
      });
      expect(updateBubbleReviewPolicy).toHaveBeenCalledWith({
        bubbleId: "b-router-policy-01",
        repoPath,
        reviewLoopMode: "meta_only",
        metaReviewAutoReworkMinSeverity: "P2",
        expectedBubbleToml: "id = \"b-router-policy-01\""
      });
    } finally {
      await server.close();
    }
  });

  it("rejects review-policy update when reviewLoopMode is invalid", async () => {
    const repoPath = "/tmp/pairflow-ui-router-review-policy-invalid-repo";
    const getBubbleStatus = vi.fn(async () =>
      createReviewPolicyStatus({
        repoPath,
        bubbleId: "b-router-policy-invalid-01"
      })
    );
    const updateBubbleReviewPolicy = vi.fn(async () => {
      throw new Error("should not be called");
    });

    const router = createUiRouter({
      repoScope: {
        repos: [repoPath],
        has: (value: string) => Promise.resolve(value === repoPath)
      },
      events: {
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
      },
      dependencies: {
        getBubbleStatus,
        updateBubbleReviewPolicy
      }
    });
    const server = await startRouterServer(router);

    try {
      const response = await fetch(
        `${server.url}/api/bubbles/b-router-policy-invalid-01/update-review-policy?repo=${encodeURIComponent(repoPath)}`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify({
            reviewLoopMode: "meta"
          })
        }
      );
      const payload = (await response.json()) as {
        error: {
          code: string;
          message: string;
        };
      };

      expect(response.status).toBe(400);
      expect(payload.error.code).toBe("bad_request");
      expect(payload.error.message).toContain("reviewLoopMode");
      expect(updateBubbleReviewPolicy).not.toHaveBeenCalled();
    } finally {
      await server.close();
    }
  });

  it("rejects review-policy update when expectedBubbleToml is not a string", async () => {
    const repoPath = "/tmp/pairflow-ui-router-review-policy-invalid-toml-repo";
    const getBubbleStatus = vi.fn(async () =>
      createReviewPolicyStatus({
        repoPath,
        bubbleId: "b-router-policy-invalid-02"
      })
    );
    const updateBubbleReviewPolicy = vi.fn(async () => {
      throw new Error("should not be called");
    });

    const router = createUiRouter({
      repoScope: {
        repos: [repoPath],
        has: (value: string) => Promise.resolve(value === repoPath)
      },
      events: {
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
      },
      dependencies: {
        getBubbleStatus,
        updateBubbleReviewPolicy
      }
    });
    const server = await startRouterServer(router);

    try {
      const response = await fetch(
        `${server.url}/api/bubbles/b-router-policy-invalid-02/update-review-policy?repo=${encodeURIComponent(repoPath)}`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify({
            reviewLoopMode: "meta_only",
            expectedBubbleToml: { stale: true }
          })
        }
      );
      const payload = (await response.json()) as {
        error: {
          code: string;
          message: string;
        };
      };

      expect(response.status).toBe(400);
      expect(payload.error.code).toBe("bad_request");
      expect(payload.error.message).toContain("expectedBubbleToml");
      expect(updateBubbleReviewPolicy).not.toHaveBeenCalled();
    } finally {
      await server.close();
    }
  });

  it("rejects review-policy update when metaReviewAutoReworkMinSeverity is invalid", async () => {
    const repoPath = "/tmp/pairflow-ui-router-review-policy-invalid-severity-repo";
    const getBubbleStatus = vi.fn(async () =>
      createReviewPolicyStatus({
        repoPath,
        bubbleId: "b-router-policy-invalid-severity-01"
      })
    );
    const updateBubbleReviewPolicy = vi.fn(async () => {
      throw new Error("should not be called");
    });

    const router = createUiRouter({
      repoScope: {
        repos: [repoPath],
        has: (value: string) => Promise.resolve(value === repoPath)
      },
      events: {
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
      },
      dependencies: {
        getBubbleStatus,
        updateBubbleReviewPolicy
      }
    });
    const server = await startRouterServer(router);

    try {
      const response = await fetch(
        `${server.url}/api/bubbles/b-router-policy-invalid-severity-01/update-review-policy?repo=${encodeURIComponent(repoPath)}`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify({
            reviewLoopMode: "meta_only",
            metaReviewAutoReworkMinSeverity: "P0"
          })
        }
      );
      const payload = (await response.json()) as {
        error: {
          code: string;
          message: string;
        };
      };

      expect(response.status).toBe(400);
      expect(payload.error.code).toBe("bad_request");
      expect(payload.error.message).toContain("metaReviewAutoReworkMinSeverity");
      expect(updateBubbleReviewPolicy).not.toHaveBeenCalled();
    } finally {
      await server.close();
    }
  });

  it("rejects review-policy update once the bubble is already terminal", async () => {
    const repoPath = "/tmp/pairflow-ui-router-review-policy-terminal-repo";
    const bubbleId = "b-router-policy-terminal-01";
    const updateBubbleReviewPolicy = vi.fn(async () => {
      throw new UiBubbleReviewPolicyStateConflictError({
        bubbleId,
        currentState: "DONE"
      });
    });

    const router = createUiRouter({
      repoScope: {
        repos: [repoPath],
        has: (value: string) => Promise.resolve(value === repoPath)
      },
      events: {
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
      },
      dependencies: {
        updateBubbleReviewPolicy
      }
    });
    const server = await startRouterServer(router);

    try {
      const response = await fetch(
        `${server.url}/api/bubbles/${bubbleId}/update-review-policy?repo=${encodeURIComponent(repoPath)}`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify({
            reviewLoopMode: "meta_only",
            expectedBubbleToml: "older"
          })
        }
      );
      const payload = (await response.json()) as {
        error: {
          code: string;
          details?: Record<string, unknown>;
          message: string;
        };
      };

      expect(response.status).toBe(409);
      expect(payload.error.code).toBe("conflict");
      expect(payload.error.message).toContain("requires non-terminal mutable state");
      expect(payload.error.details).toMatchObject({
        bubbleId,
        repoPath,
        currentState: "DONE",
        reasonCode: "REVIEW_POLICY_STATE_CONFLICT"
      });
      expect(updateBubbleReviewPolicy).toHaveBeenCalledWith({
        bubbleId,
        repoPath,
        reviewLoopMode: "meta_only",
        expectedBubbleToml: "older"
      });
    } finally {
      await server.close();
    }
  });

  it("rejects review-policy update when the request body is missing even if the bubble is terminal", async () => {
    const repoPath = "/tmp/pairflow-ui-router-review-policy-terminal-missing-body-repo";
    const bubbleId = "b-router-policy-terminal-missing-body-01";
    const getBubbleStatus = vi.fn(async () =>
      createReviewPolicyStatus({
        repoPath,
        bubbleId,
        state: "DONE"
      })
    );
    const updateBubbleReviewPolicy = vi.fn(async () => {
      throw new Error("should not be called");
    });

    const router = createUiRouter({
      repoScope: {
        repos: [repoPath],
        has: (value: string) => Promise.resolve(value === repoPath)
      },
      events: {
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
      },
      dependencies: {
        getBubbleStatus,
        updateBubbleReviewPolicy
      }
    });
    const server = await startRouterServer(router);

    try {
      const response = await fetch(
        `${server.url}/api/bubbles/${bubbleId}/update-review-policy?repo=${encodeURIComponent(repoPath)}`,
        {
          method: "POST"
        }
      );
      const payload = (await response.json()) as {
        error: {
          code: string;
          message: string;
        };
      };

      expect(response.status).toBe(400);
      expect(payload.error.code).toBe("bad_request");
      expect(payload.error.message).toContain("Review policy request body must be a JSON object");
      expect(getBubbleStatus).not.toHaveBeenCalled();
      expect(updateBubbleReviewPolicy).not.toHaveBeenCalled();
    } finally {
      await server.close();
    }
  });

  it("rejects review-policy update when the request body is not valid JSON", async () => {
    const repoPath = "/tmp/pairflow-ui-router-review-policy-invalid-json-repo";
    const bubbleId = "b-router-policy-invalid-json-01";
    const getBubbleStatus = vi.fn(async () =>
      createReviewPolicyStatus({
        repoPath,
        bubbleId
      })
    );
    const updateBubbleReviewPolicy = vi.fn(async () => {
      throw new Error("should not be called");
    });

    const router = createUiRouter({
      repoScope: {
        repos: [repoPath],
        has: (value: string) => Promise.resolve(value === repoPath)
      },
      events: {
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
      },
      dependencies: {
        getBubbleStatus,
        updateBubbleReviewPolicy
      }
    });
    const server = await startRouterServer(router);

    try {
      const response = await fetch(
        `${server.url}/api/bubbles/${bubbleId}/update-review-policy?repo=${encodeURIComponent(repoPath)}`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: "{"
        }
      );
      const payload = (await response.json()) as {
        error: {
          code: string;
          message: string;
        };
      };

      expect(response.status).toBe(400);
      expect(payload.error.code).toBe("bad_request");
      expect(payload.error.message).toContain("Request body must be valid JSON");
      expect(getBubbleStatus).not.toHaveBeenCalled();
      expect(updateBubbleReviewPolicy).not.toHaveBeenCalled();
    } finally {
      await server.close();
    }
  });

  it("maps review-policy write conflicts to HTTP 409 with current bubble detail", async () => {
    const repoPath = "/tmp/pairflow-ui-router-review-policy-conflict-repo";
    const bubbleId = "b-router-policy-conflict-01";
    const updateBubbleReviewPolicy = vi.fn(async () => {
      throw new UiBubbleReviewPolicyConflictError({
        bubbleId,
        currentBubbleToml: "id = \"b-router-policy-conflict-01\"\nreview_loop_mode = \"meta_only\"\n",
        currentReviewPolicy: {
          requested_loop_mode: "meta_only",
          effective_loop_mode: "full",
          support_status: "guarded",
          meta_review_auto_rework_min_severity: "P1",
          blocked_reason_code: "REVIEW_POLICY_META_ONLY_GUARDED"
        }
      });
    });
    const getBubbleStatus = vi.fn(async () =>
      createReviewPolicyStatus({
        repoPath,
        bubbleId
      })
    );
    const getBubbleInbox = vi.fn(async () => ({
      bubbleId,
      repoPath,
      state: "RUNNING" as const,
      pending: {
        humanQuestions: 0,
        approvalRequests: 0,
        total: 0
      },
      items: []
    }));
    const readRuntimeSessionsRegistry = vi.fn(async () => ({}));

    const router = createUiRouter({
      repoScope: {
        repos: [repoPath],
        has: (value: string) => Promise.resolve(value === repoPath)
      },
      events: {
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
      },
      dependencies: {
        updateBubbleReviewPolicy,
        getBubbleStatus,
        getBubbleInbox,
        readRuntimeSessionsRegistry
      }
    });
    const server = await startRouterServer(router);

    try {
      const response = await fetch(
        `${server.url}/api/bubbles/${bubbleId}/update-review-policy?repo=${encodeURIComponent(repoPath)}`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify({
            reviewLoopMode: "meta_only",
            expectedBubbleToml: "older"
          })
        }
      );
      const payload = (await response.json()) as {
        error: {
          code: string;
          details?: Record<string, unknown>;
        };
      };

      expect(response.status).toBe(409);
      expect(payload.error.code).toBe("conflict");
      expect(payload.error.details).toMatchObject({
        bubbleId,
        repoPath,
        reasonCode: "REVIEW_POLICY_WRITE_CONFLICT",
        currentState: "RUNNING",
        reviewPolicyConflict: {
          bubbleId,
          repoPath,
          currentState: "RUNNING",
          bubbleToml: "id = \"b-router-policy-conflict-01\"\nreview_loop_mode = \"meta_only\"\n",
          reviewPolicy: {
            requested_loop_mode: "meta_only",
            effective_loop_mode: "full",
            support_status: "guarded"
          }
        },
        bubble: {
          bubbleToml: "id = \"b-router-policy-conflict-01\"\nreview_loop_mode = \"meta_only\"\n",
          reviewPolicy: {
            requested_loop_mode: "meta_only",
            effective_loop_mode: "full",
            support_status: "guarded"
          }
        }
      });
      expect(getBubbleStatus).toHaveBeenCalledWith({
        bubbleId,
        repoPath
      });
      expect(getBubbleInbox).toHaveBeenCalledWith({
        bubbleId,
        repoPath
      });
    } finally {
      await server.close();
    }
  });

  it("keeps authoritative review-policy conflict context even when current bubble detail cannot be loaded", async () => {
    const repoPath = "/tmp/pairflow-ui-router-review-policy-conflict-no-detail-repo";
    const bubbleId = "b-router-policy-conflict-no-detail-01";
    const updateBubbleReviewPolicy = vi.fn(async () => {
      throw new UiBubbleReviewPolicyConflictError({
        bubbleId,
        currentBubbleToml:
          "id = \"b-router-policy-conflict-no-detail-01\"\nreview_loop_mode = \"meta_only\"\n",
        currentReviewPolicy: {
          requested_loop_mode: "meta_only",
          effective_loop_mode: "full",
          support_status: "guarded",
          meta_review_auto_rework_min_severity: "P1",
          blocked_reason_code: "REVIEW_POLICY_META_ONLY_GUARDED"
        }
      });
    });
    const getBubbleStatus = vi.fn(async () =>
      createReviewPolicyStatus({
        repoPath,
        bubbleId
      })
    );
    const getBubbleInbox = vi.fn(async () => {
      throw new Error("inbox unavailable");
    });
    const readRuntimeSessionsRegistry = vi.fn(async () => {
      throw new Error("runtime registry unavailable");
    });

    const router = createUiRouter({
      repoScope: {
        repos: [repoPath],
        has: (value: string) => Promise.resolve(value === repoPath)
      },
      events: {
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
      },
      dependencies: {
        updateBubbleReviewPolicy,
        getBubbleStatus,
        getBubbleInbox,
        readRuntimeSessionsRegistry
      }
    });
    const server = await startRouterServer(router);

    try {
      const response = await fetch(
        `${server.url}/api/bubbles/${bubbleId}/update-review-policy?repo=${encodeURIComponent(repoPath)}`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify({
            reviewLoopMode: "meta_only",
            expectedBubbleToml: "older"
          })
        }
      );
      const payload = (await response.json()) as {
        error: {
          code: string;
          details?: Record<string, unknown>;
        };
      };

      expect(response.status).toBe(409);
      expect(payload.error.code).toBe("conflict");
      expect(payload.error.details).toMatchObject({
        bubbleId,
        repoPath,
        reasonCode: "REVIEW_POLICY_WRITE_CONFLICT",
        currentState: null,
        reviewPolicyConflict: {
          bubbleId,
          repoPath,
          currentState: null,
          bubbleToml:
            "id = \"b-router-policy-conflict-no-detail-01\"\nreview_loop_mode = \"meta_only\"\n",
          reviewPolicy: {
            requested_loop_mode: "meta_only",
            effective_loop_mode: "full",
            support_status: "guarded"
          }
        }
      });
      expect(payload.error.details).not.toHaveProperty("bubble");
    } finally {
      await server.close();
    }
  });

  it("maps locked review-policy state revalidation conflicts to HTTP 409", async () => {
    const repoPath = "/tmp/pairflow-ui-router-review-policy-state-recheck-repo";
    const bubbleId = "b-router-policy-state-recheck-01";
    const getBubbleStatus = vi.fn(async () =>
      createReviewPolicyStatus({
        repoPath,
        bubbleId,
        state: "RUNNING"
      })
    );
    const updateBubbleReviewPolicy = vi.fn(async () => {
      throw new UiBubbleReviewPolicyStateConflictError({
        bubbleId,
        currentState: "DONE"
      });
    });

    const router = createUiRouter({
      repoScope: {
        repos: [repoPath],
        has: (value: string) => Promise.resolve(value === repoPath)
      },
      events: {
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
      },
      dependencies: {
        getBubbleStatus,
        updateBubbleReviewPolicy
      }
    });
    const server = await startRouterServer(router);

    try {
      const response = await fetch(
        `${server.url}/api/bubbles/${bubbleId}/update-review-policy?repo=${encodeURIComponent(repoPath)}`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify({
            reviewLoopMode: "meta_only",
            expectedBubbleToml: "older"
          })
        }
      );
      const payload = (await response.json()) as {
        error: {
          code: string;
          details?: Record<string, unknown>;
          message: string;
        };
      };

      expect(response.status).toBe(409);
      expect(payload.error.code).toBe("conflict");
      expect(payload.error.message).toContain("non-terminal mutable state");
      expect(payload.error.details).toMatchObject({
        bubbleId,
        repoPath,
        currentState: "DONE",
        reasonCode: "REVIEW_POLICY_STATE_CONFLICT"
      });
    } finally {
      await server.close();
    }
  });
});
