import { EventEmitter } from "node:events";
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
import type * as EmitApprovalModule from "../../../src/v11/application/approval/emitApprovalV11.js";
import type * as EmitCommitModule from "../../../src/v11/application/commit/emitCommitV11.js";
import type * as EmitReplyModule from "../../../src/v11/application/reply/emitReplyV11.js";
import type * as RestartCommandModule from "../../../src/v11/application/restart/restartCommandApi.js";
import type * as EmitResumeModule from "../../../src/v11/application/resume/emitResumeV11.js";
import type * as EmitStartModule from "../../../src/v11/application/start/emitStartV11.js";
import type * as EmitStopModule from "../../../src/v11/application/stop/emitStopV11.js";
import {
  projectBubbleStateToUiActionState,
  projectPendingReworkIntentToUiActionPendingIntent,
  projectProtocolEnvelopeToUiActionEvent,
  projectApprovalDecisionDeliverySignalToUiDeliverySignal,
  projectApprovalDecisionDeliverySignalsToUiDeliverySignals
} from "../../../src/v11/defaults/ui/routerDefaults.js";
import {
  UiBubbleReviewPolicyConflictError,
  UiBubbleReviewPolicyStateConflictError
} from "../../../src/v11/defaults/ui/updateBubbleReviewPolicyForUi.js";
import { createUiRouter, resolveStaticAssetPath } from "../../../src/v11/infrastructure/ui/router.js";
import { handleUiEvents } from "../../../src/v11/infrastructure/ui/routerEvents.js";
import type { UiEventsBroker } from "../../../src/v11/infrastructure/ui/events.js";
import type { UiRepoScope } from "../../../src/v11/infrastructure/ui/repoScope.js";
import type { BubbleInboxView } from "../../../src/v11/shared/bubbleInbox/bubbleInboxReadModel.js";
import type {
  UiActionBubbleState,
  UiActionEvent
} from "../../../src/contracts/ui/uiActions.js";
import type {
  UiStartBubbleResult,
  UiStopBubbleResult,
  UiRestartBubbleResult,
  UiBubbleListView,
  UiCommitBubbleResult,
  UiDeleteBubbleResult,
  UiMergeBubbleResult
} from "../../../src/v11/shared/ports/uiRouter.js";
import {
  validateUiBubbleDetailResponseBody,
  validateUiBubbleListResponseBody,
  validateUiBubbleTimelineResponseBody
} from "../../../src/v11/infrastructure/ui/routerReadResponseValidation.js";
import type {
  UiBubbleDetail,
  UiBubbleSummary,
  UiRepoSummary,
  UiTimelineEntry
} from "../../../src/contracts/ui/uiReadModel.js";
import type {
  UiEvent,
  UiSnapshotEvent
} from "../../../src/contracts/ui/uiEvents.js";
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

async function readStreamUntil(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  expected: string,
  timeoutMs = 1_000
): Promise<string> {
  const decoder = new TextDecoder();
  let body = "";
  while (!body.includes(expected)) {
    const result = await Promise.race([
      reader.read(),
      new Promise<"timeout">((resolve) => {
        setTimeout(() => resolve("timeout"), timeoutMs);
      })
    ]);
    if (result === "timeout") {
      throw new Error(`Timed out waiting for stream chunk containing ${expected}.`);
    }
    if (result.done) {
      throw new Error(`Stream ended before chunk containing ${expected}.`);
    }
    body += decoder.decode(result.value, { stream: true });
  }
  return body;
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
const emitCommitModulePath =
  "../../../src/v11/application/commit/emitCommitV11.js";
const emitReplyModulePath =
  "../../../src/v11/application/reply/emitReplyV11.js";
const emitResumeModulePath =
  "../../../src/v11/application/resume/emitResumeV11.js";
const emitStartModulePath =
  "../../../src/v11/application/start/emitStartV11.js";
const emitStopModulePath = "../../../src/v11/application/stop/emitStopV11.js";
const restartCommandModulePath =
  "../../../src/v11/application/restart/restartCommandApi.js";

function uiActionStateFixture(
  bubbleId = "b-router-action-fixture"
): UiActionBubbleState {
  return {
    bubbleId,
    lifecycleState: "RUNNING",
    round: 1,
    activeAgent: "codex",
    activeRole: "implementer",
    activeSince: "2026-02-25T00:00:00.000Z",
    lastCommandAt: "2026-02-25T00:01:00.000Z",
    executionContext: null
  };
}

function uiActionEventFixture(bubbleId = "b-router-action-fixture"): UiActionEvent {
  return {
    id: "env-action-fixture",
    timestamp: "2026-02-25T00:02:00.000Z",
    bubbleId,
    sender: "human",
    recipient: "orchestrator",
    type: "APPROVAL_DECISION",
    round: 1,
    refs: []
  };
}

function uiCommitResultFixture(
  bubbleId = "b-router-commit-fixture"
): UiCommitBubbleResult {
  return {
    bubbleId,
    sequence: 13,
    event: {
      ...uiActionEventFixture(bubbleId),
      type: "COMMIT_RESULT",
      sender: "orchestrator",
      recipient: "human",
      summary: "Committed abc123."
    },
    actionState: {
      ...uiActionStateFixture(bubbleId),
      lifecycleState: "DONE",
      activeAgent: null,
      activeRole: null,
      activeSince: null,
      executionContext: null
    },
    commitSha: "abc123",
    commitMessage: "Commit message",
    stagedFiles: ["src/example.ts"]
  };
}

function uiMergeResultFixture(
  bubbleId = "b-router-merge-fixture"
): UiMergeBubbleResult {
  return {
    bubbleId,
    baseBranch: "main",
    bubbleBranch: `bubble/${bubbleId}`,
    mergeCommitSha: "abc123",
    presentationRoute: "local",
    pushedBaseBranch: false,
    deletedRemoteBranch: false,
    tmuxSessionName: `pf-${bubbleId}`,
    tmuxSessionExisted: true,
    runtimeSessionRemoved: true,
    removedWorktree: true,
    removedBubbleBranch: true
  };
}

function uiDeleteResultFixture(
  bubbleId = "b-router-delete-fixture",
  overrides: Partial<UiDeleteBubbleResult> = {}
): UiDeleteBubbleResult {
  return {
    bubbleId,
    deleted: true,
    requiresConfirmation: false,
    artifacts: {
      worktree: {
        exists: false,
        path: "/tmp/worktree"
      },
      tmux: {
        exists: false,
        sessionName: `pf-${bubbleId}`
      },
      runtimeSession: {
        exists: false,
        sessionName: null
      },
      branch: {
        exists: false,
        name: `pairflow/bubble/${bubbleId}`
      }
    },
    tmuxSessionTerminated: false,
    runtimeSessionRemoved: false,
    removedWorktree: false,
    removedBubbleBranch: false,
    ...overrides
  };
}

function rawProtocolEnvelopeFixture(
  bubbleId: string,
  type: "APPROVAL_DECISION" | "HUMAN_REPLY" | "COMMIT_RESULT",
  overrides: Partial<{
    id: string;
    sender: "human" | "orchestrator";
    recipient: "human" | "orchestrator";
    summary: string;
    message: string;
    decision: "approve" | "rework";
  }> = {}
) {
  return {
    id: overrides.id ?? `env-${bubbleId}`,
    ts: "2026-02-25T00:02:00.000Z",
    bubble_id: bubbleId,
    sender: overrides.sender ?? "human",
    recipient: overrides.recipient ?? "orchestrator",
    type,
    round: 2,
    payload: {
      ...(overrides.summary !== undefined ? { summary: overrides.summary } : {}),
      ...(overrides.message !== undefined ? { message: overrides.message } : {}),
      ...(overrides.decision !== undefined ? { decision: overrides.decision } : {}),
      metadata: {
        internal_only: true
      }
    },
    refs: ["artifact://action.md"]
  } as const;
}

function rawBubbleStateFixture(
  bubbleId: string,
  lifecycleState: "RUNNING" | "CANCELLED" | "DONE" = "RUNNING"
) {
  const hasActiveRuntime = lifecycleState === "RUNNING";
  return {
    bubble_id: bubbleId,
    state: lifecycleState,
    round: 2,
    active_agent: hasActiveRuntime ? "codex" : null,
    active_role: hasActiveRuntime ? "implementer" : null,
    active_since: hasActiveRuntime ? "2026-02-25T00:00:00.000Z" : null,
    execution_context:
      hasActiveRuntime
        ? {
            active_role: "implementer",
            awaited_output_type: "pass_result",
            handoff_id: "handoff-default",
            execution_id: "execution-default",
            round: 2,
            started_at: "2026-02-25T00:00:00.000Z",
            deadline_at: "2026-02-25T00:30:00.000Z",
            attempt: 4
          }
        : null,
    round_role_history: hasActiveRuntime
      ? [
          {
            round: 1,
            implementer: "codex",
            reviewer: "claude",
            switched_at: "2026-02-25T00:00:00.000Z"
          }
        ]
      : [],
    last_command_at: "2026-02-25T00:02:00.000Z",
    pending_rework_intent: null,
    ...(hasActiveRuntime
      ? {
          meta_review: {
            auto_rework_count: 0,
            auto_rework_limit: 10,
            sticky_human_gate: false,
            consecutive_clean_runs: 1,
            execution_context: null,
            runtime_delivery: null
          }
        }
      : {})
  } as const;
}

async function withMockedApproveRouteDependencies<T>(
  emitApproveV11: ReturnType<typeof vi.fn>,
  run: (createUiRouterWithDefaultProjection: typeof createUiRouter) => Promise<T>
): Promise<T> {
  return withMockedApprovalRouteDependencies(
    {
      emitApproveV11
    },
    run
  );
}

async function withMockedApprovalRouteDependencies<T>(
  mocks: {
    emitApproveV11?: ReturnType<typeof vi.fn>;
    emitRequestReworkV11?: ReturnType<typeof vi.fn>;
  },
  run: (createUiRouterWithDefaultProjection: typeof createUiRouter) => Promise<T>
): Promise<T> {
  vi.resetModules();
  vi.doMock(emitApprovalModulePath, async () => {
    const actual = await vi.importActual<typeof EmitApprovalModule>(
      emitApprovalModulePath
    );

    return {
      ...actual,
      ...(mocks.emitApproveV11 !== undefined
        ? { emitApproveV11: mocks.emitApproveV11 }
        : {}),
      ...(mocks.emitRequestReworkV11 !== undefined
        ? { emitRequestReworkV11: mocks.emitRequestReworkV11 }
        : {})
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

async function withMockedLifecycleRouteDependencies<T>(
  mocks: {
    startBubbleV11: ReturnType<typeof vi.fn>;
    stopBubbleV11: ReturnType<typeof vi.fn>;
    restartBubble: ReturnType<typeof vi.fn>;
  },
  run: (createUiRouterWithDefaultProjection: typeof createUiRouter) => Promise<T>
): Promise<T> {
  vi.resetModules();
  vi.doMock(emitStartModulePath, async () => {
    const actual = await vi.importActual<typeof EmitStartModule>(
      emitStartModulePath
    );
    return {
      ...actual,
      startBubbleV11: mocks.startBubbleV11
    };
  });
  vi.doMock(emitStopModulePath, async () => {
    const actual = await vi.importActual<typeof EmitStopModule>(
      emitStopModulePath
    );
    return {
      ...actual,
      stopBubbleV11: mocks.stopBubbleV11
    };
  });
  vi.doMock(restartCommandModulePath, async () => {
    const actual = await vi.importActual<typeof RestartCommandModule>(
      restartCommandModulePath
    );
    return {
      ...actual,
      restartBubble: mocks.restartBubble
    };
  });

  try {
    const { createUiRouter: createUiRouterWithDefaultProjection } = await import(
      "../../../src/v11/infrastructure/ui/router.js"
    );
    return await run(createUiRouterWithDefaultProjection);
  } finally {
    vi.resetModules();
    vi.doUnmock(emitStartModulePath);
    vi.doUnmock(emitStopModulePath);
    vi.doUnmock(restartCommandModulePath);
  }
}

async function withMockedEventRouteDependencies<T>(
  mocks: {
    commitBubbleV11: ReturnType<typeof vi.fn>;
    emitHumanReplyV11: ReturnType<typeof vi.fn>;
    resumeBubbleV11: ReturnType<typeof vi.fn>;
  },
  run: (createUiRouterWithDefaultProjection: typeof createUiRouter) => Promise<T>
): Promise<T> {
  vi.resetModules();
  vi.doMock(emitCommitModulePath, async () => {
    const actual = await vi.importActual<typeof EmitCommitModule>(
      emitCommitModulePath
    );
    return {
      ...actual,
      commitBubbleV11: mocks.commitBubbleV11
    };
  });
  vi.doMock(emitReplyModulePath, async () => {
    const actual = await vi.importActual<typeof EmitReplyModule>(
      emitReplyModulePath
    );
    return {
      ...actual,
      emitHumanReplyV11: mocks.emitHumanReplyV11
    };
  });
  vi.doMock(emitResumeModulePath, async () => {
    const actual = await vi.importActual<typeof EmitResumeModule>(
      emitResumeModulePath
    );
    return {
      ...actual,
      resumeBubbleV11: mocks.resumeBubbleV11
    };
  });

  try {
    const { createUiRouter: createUiRouterWithDefaultProjection } = await import(
      "../../../src/v11/infrastructure/ui/router.js"
    );
    return await run(createUiRouterWithDefaultProjection);
  } finally {
    vi.resetModules();
    vi.doUnmock(emitCommitModulePath);
    vi.doUnmock(emitReplyModulePath);
    vi.doUnmock(emitResumeModulePath);
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
  it("projects raw action state to the explicit UI action DTO without hidden state slices", () => {
    const projected = projectBubbleStateToUiActionState({
      bubble_id: "b-router-action-state",
      state: "RUNNING",
      round: 3,
      active_agent: "codex",
      active_role: "implementer",
      active_since: "2026-02-25T00:00:00.000Z",
      last_command_at: "2026-02-25T00:01:00.000Z",
      execution_context: {
        active_role: "implementer",
        awaited_output_type: "pass_result",
        handoff_id: "handoff-1",
        execution_id: "execution-1",
        round: 3,
        started_at: "2026-02-25T00:00:00.000Z",
        deadline_at: "2026-02-25T00:30:00.000Z",
        attempt: 2
      },
      round_role_history: [
        {
          round: 1,
          implementer: "codex",
          reviewer: "claude",
          switched_at: "2026-02-25T00:00:00.000Z"
        }
      ],
      pending_rework_intent: null,
      rework_intent_history: [],
      meta_review: {
        auto_rework_count: 0,
        auto_rework_limit: 10,
        sticky_human_gate: false,
        consecutive_clean_runs: 1,
        execution_context: null,
        runtime_delivery: null
      }
    });

    expect(projected).toStrictEqual({
      bubbleId: "b-router-action-state",
      lifecycleState: "RUNNING",
      round: 3,
      activeAgent: "codex",
      activeRole: "implementer",
      activeSince: "2026-02-25T00:00:00.000Z",
      lastCommandAt: "2026-02-25T00:01:00.000Z",
      executionContext: {
        handoffId: "handoff-1",
        executionId: "execution-1"
      }
    });
    expect(projected).not.toHaveProperty("round_role_history");
    expect(projected).not.toHaveProperty("meta_review");
    expect(projected.executionContext).not.toHaveProperty("deadlineAt");
    expect(projected.executionContext).not.toHaveProperty("awaitedOutputType");
  });

  it("projects raw action envelopes to display-safe event fields only", () => {
    const refs = ["artifact://approval.md"];
    const projected = projectProtocolEnvelopeToUiActionEvent({
      id: "env-1",
      ts: "2026-02-25T00:02:00.000Z",
      bubble_id: "b-router-event",
      sender: "human",
      recipient: "orchestrator",
      type: "APPROVAL_DECISION",
      round: 3,
      refs,
      payload: {
        message: "Approved.",
        decision: "approve",
        pass_intent: "review",
        findings_claim_state: "open_findings",
        findings_claim_source: "payload_findings_count",
        findings: [
          {
            title: "Raw finding",
            priority: "P1",
            timing: "required-now",
            layer: "L1",
            detail: "Not carried by action DTO."
          }
        ],
        metadata: {
          delivery_target_role: "status",
          internal_only: true
        }
      }
    });

    expect(projected).toStrictEqual({
      id: "env-1",
      timestamp: "2026-02-25T00:02:00.000Z",
      bubbleId: "b-router-event",
      sender: "human",
      recipient: "orchestrator",
      type: "APPROVAL_DECISION",
      round: 3,
      refs: ["artifact://approval.md"],
      message: "Approved.",
      decision: "approve",
      passIntent: "review",
      findingsClaimState: "open_findings",
      findingsClaimSource: "payload_findings_count"
    });
    expect(projected).not.toHaveProperty("payload");
    expect(projected).not.toHaveProperty("metadata");
    expect(projected).not.toHaveProperty("findings");
    expect(projected.refs).not.toBe(refs);
  });

  it("projects queued rework intent facts explicitly", () => {
    const refs = ["artifact://rework.md"];
    const projected = projectPendingReworkIntentToUiActionPendingIntent({
      intent_id: "intent-1",
      message: "Please rework.",
      refs,
      requested_by: "human",
      requested_at: "2026-02-25T00:03:00.000Z",
      status: "pending",
      superseded_by_intent_id: "intent-2"
    });

    expect(projected).toStrictEqual({
      intentId: "intent-1",
      message: "Please rework.",
      refs: ["artifact://rework.md"],
      requestedBy: "human",
      requestedAt: "2026-02-25T00:03:00.000Z",
      status: "pending",
      supersededByIntentId: "intent-2"
    });
    expect(projected).not.toHaveProperty("intent_id");
    expect(projected).not.toHaveProperty("requested_by");
    expect(projected.refs).not.toBe(refs);
  });

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
        consecutiveCleanRuns: 0,
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
      items: [
        {
          envelopeId: "msg_approval_01",
          type: "APPROVAL_REQUEST",
          ts: "2026-02-24T12:00:30.000Z",
          round: 2,
          sender: "orchestrator",
          summary: "Human approval required after meta-review.",
          refs: [],
          latestRecommendation: "rework",
          gateRoute: "human_gate_budget_exhausted"
        }
      ]
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
      expect(payload.bubble).toMatchObject({
        inbox: {
          items: [
            {
              type: "APPROVAL_REQUEST",
              latestRecommendation: "rework",
              gateRoute: "human_gate_budget_exhausted"
            }
          ]
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
        consecutiveCleanRuns: 0,
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

describe("UI read response validation", () => {
  const repo: UiRepoSummary = {
    repoPath: "/tmp/pairflow-ui-read-validation",
    total: 1,
    byState: {
      CREATED: 0,
      PREPARING_WORKSPACE: 0,
      RUNNING: 1,
      WAITING_HUMAN: 0,
      READY_FOR_HUMAN_APPROVAL: 0,
      APPROVED_FOR_COMMIT: 0,
      COMMITTED: 0,
      DONE: 0,
      FAILED: 0,
      CANCELLED: 0
    },
    runtimeSessions: {
      registered: 1,
      stale: 0
    }
  };

  const bubble: UiBubbleSummary = {
    bubbleId: "b-router-read-validation",
    repoPath: repo.repoPath,
    worktreePath: "/tmp/worktree",
    state: "RUNNING",
    round: 1,
    activeAgent: "codex",
    activeRole: "implementer",
    activeSince: "2026-02-25T00:00:00.000Z",
    lastCommandAt: null,
    stateValidation: null,
    runtimeSession: null,
    runtime: {
      expected: true,
      present: false,
      stale: true
    },
    attention: null,
    reviewPolicy: null,
    metaReview: {
      actor: "meta-reviewer",
      authorityActive: false,
      consecutiveCleanRuns: 0,
      runtimeDelivery: null
    }
  };

  function expectInvalidReadResponse(
    action: () => unknown,
    responseFamily: string
  ): void {
    try {
      action();
      throw new Error("Expected UI read response validation to fail.");
    } catch (error) {
      expect(error).toMatchObject({
        apiError: {
          status: 500,
          body: {
            error: {
              code: "internal_error",
              details: {
                reasonCode: "UI_READ_RESPONSE_INVALID",
                responseFamily
              }
            }
          }
        }
      });
    }
  }

  it("preserves valid list responses and rejects malformed list envelopes", () => {
    expect(
      validateUiBubbleListResponseBody({
        repo,
        bubbles: [bubble]
      })
    ).toStrictEqual({
      repo,
      bubbles: [bubble]
    });

    expectInvalidReadResponse(
      () =>
        validateUiBubbleListResponseBody({
          repo: {
            ...repo,
            repoPath: 42
          },
          bubbles: [bubble]
        }),
      "bubble_list"
    );

    expectInvalidReadResponse(
      () =>
        validateUiBubbleListResponseBody({
          repo: {
            ...repo,
            byState: {
              ...repo.byState,
              EXTRA_STATE: 1
            }
          },
          bubbles: [bubble]
        }),
      "bubble_list"
    );

    expectInvalidReadResponse(
      () =>
        validateUiBubbleListResponseBody({
          repo: {
            ...repo,
            remoteExecutionSummary: {
              createdNotStarted: 0,
              unavailableStarted: 0,
              unexpected: true
            }
          },
          bubbles: [bubble]
        }),
      "bubble_list"
    );
  });

  it("preserves valid detail responses and rejects malformed detail envelopes", () => {
    const detail: UiBubbleDetail = {
      ...bubble,
      bubbleToml: null,
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
      inbox: {
        pending: {
          humanQuestions: 0,
          approvalRequests: 0,
          total: 0
        },
        items: []
      },
      transcript: {
        totalMessages: 0,
        lastMessageType: null,
        lastMessageTs: null,
        lastMessageId: null
      }
    };

    expect(
      validateUiBubbleDetailResponseBody({
        bubble: detail
      })
    ).toStrictEqual({
      bubble: detail
    });

    expectInvalidReadResponse(
      () =>
        validateUiBubbleDetailResponseBody({
          bubble: {
            ...detail,
            state: "DRIFTED"
          }
        }),
      "bubble_detail"
    );

    expectInvalidReadResponse(
      () =>
        validateUiBubbleDetailResponseBody({
          bubble: {
            ...detail,
            unexpected: true
          }
        }),
      "bubble_detail"
    );

    expectInvalidReadResponse(
      () =>
        validateUiBubbleDetailResponseBody({
          bubble: {
            ...detail,
            watchdog: {
              ...detail.watchdog,
              expired: "false"
            }
          }
        }),
      "bubble_detail"
    );

    expectInvalidReadResponse(
      () =>
        validateUiBubbleDetailResponseBody({
          bubble: {
            ...detail,
            metaReview: {
              ...detail.metaReview,
              runtimeDelivery: {
                status: "confirmed"
              }
            }
          }
        }),
      "bubble_detail"
    );

    expectInvalidReadResponse(
      () =>
        validateUiBubbleDetailResponseBody({
          bubble: {
            ...detail,
            reviewPolicy: {
              requested_loop_mode: "full",
              effective_loop_mode: "full",
              support_status: "enabled",
              reviewer_blocking_min_severity: "P3",
              meta_review_auto_rework_min_severity: "P3",
              meta_review_consecutive_clean_runs_required: 2,
              unexpected: true
            }
          }
        }),
      "bubble_detail"
    );

    expectInvalidReadResponse(
      () =>
        validateUiBubbleDetailResponseBody({
          bubble: {
            ...detail,
            runtimeSession: {
              bubbleId: detail.bubbleId,
              repoPath: detail.repoPath,
              worktreePath: detail.worktreePath,
              tmuxSessionName: "pf-detail",
              updatedAt: "2026-02-25T00:00:00.000Z",
              workspaceKind: "invalid"
            }
          }
        }),
      "bubble_detail"
    );

    expectInvalidReadResponse(
      () =>
        validateUiBubbleDetailResponseBody({
          bubble: {
            ...detail,
            inbox: {
              ...detail.inbox,
              items: [
                {
                  envelopeId: "msg-invalid-inbox-item",
                  type: "APPROVAL_REQUEST",
                  ts: "2026-02-25T00:00:00.000Z",
                  round: 1,
                  sender: "orchestrator",
                  summary: "Approval required.",
                  refs: "not-array"
                }
              ]
            }
          }
        }),
      "bubble_detail"
    );

    expectInvalidReadResponse(
      () =>
        validateUiBubbleDetailResponseBody({
          bubble: {
            ...detail,
            inbox: {
              ...detail.inbox,
              items: [
                {
                  envelopeId: "msg-invalid-gate-route",
                  type: "APPROVAL_REQUEST",
                  ts: "2026-02-25T00:00:00.000Z",
                  round: 1,
                  sender: "orchestrator",
                  summary: "Approval required.",
                  refs: [],
                  gateRoute: "not_a_gate_route"
                }
              ]
            }
          }
        }),
      "bubble_detail"
    );
  });

  it("preserves valid timeline responses and rejects malformed entries", () => {
    const entry: UiTimelineEntry = {
      id: "env-router-read-validation",
      ts: "2026-02-25T00:00:00.000Z",
      round: 1,
      type: "PASS",
      sender: "codex",
      recipient: "human",
      display: {
        title: "Validated.",
        summaryText: "Validated.",
        summarySource: "summary",
        senderLabel: "codex",
        role: "implementer",
        rowKind: "normal",
        tone: "neutral",
        badges: [],
        progress: null,
        validationFailure: null,
        syntheticApproval: null
      },
      payload: {
        summary: "Validated."
      },
      refs: []
    };

    expect(
      validateUiBubbleTimelineResponseBody({
        bubbleId: bubble.bubbleId,
        repoPath: repo.repoPath,
        timeline: [entry]
      })
    ).toStrictEqual({
      bubbleId: bubble.bubbleId,
      repoPath: repo.repoPath,
      timeline: [entry]
    });

    expectInvalidReadResponse(
      () =>
        validateUiBubbleTimelineResponseBody({
          bubbleId: bubble.bubbleId,
          repoPath: repo.repoPath,
          timeline: [
            {
              ...entry,
              refs: "not-array"
            }
          ]
        }),
      "bubble_timeline"
    );

    for (const progress of [
      {
        kind: "meta_review_handoff",
        label: "handoff 1.5",
        handoffAttempt: 1.5
      },
      {
        kind: "clean_run",
        label: "clean NaN",
        cleanRunCount: Number.NaN,
        cleanRunsRequired: 2
      },
      {
        kind: "clean_run",
        label: "clean Infinity",
        cleanRunCount: 1,
        cleanRunsRequired: Number.POSITIVE_INFINITY
      },
      {
        kind: "clean_run",
        label: "clean negative",
        cleanRunCount: -1,
        cleanRunsRequired: null
      }
    ]) {
      expectInvalidReadResponse(
        () =>
          validateUiBubbleTimelineResponseBody({
            bubbleId: bubble.bubbleId,
            repoPath: repo.repoPath,
            timeline: [
              {
                ...entry,
                display: {
                  ...entry.display,
                  progress
                }
              }
            ]
          }),
        "bubble_timeline"
      );
    }
  });
});

describe("createUiRouter read response validation failures", () => {
  it("returns internal_error when the list route dependency returns malformed read data", async () => {
    const repoPath = "/tmp/pairflow-ui-router-invalid-read";
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
        listBubbles: vi.fn(
          async () =>
            ({
              repoPath,
              total: 1,
              byState: {
                RUNNING: 1
              },
              runtimeSessions: {
                registered: 0,
                stale: 0
              },
              bubbles: []
            }) as unknown as UiBubbleListView
        )
      }
    });
    const server = await startRouterServer(router);

    try {
      const response = await fetch(
        `${server.url}/api/bubbles?repo=${encodeURIComponent(repoPath)}`
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
        reasonCode: "UI_READ_RESPONSE_INVALID",
        responseFamily: "bubble_list"
      });
    } finally {
      await server.close();
    }
  });

  it("returns internal_error when the detail route dependency returns malformed read data", async () => {
    const repoPath = "/tmp/pairflow-ui-router-invalid-detail";
    const bubbleId = "b-router-invalid-detail";
    const status = {
      bubbleId,
      repoPath,
      worktreePath: "/tmp/worktree",
      bubbleStartedAt: "2026-02-25T00:00:00.000Z",
      state: "RUNNING",
      round: 1,
      activeAgent: "codex",
      activeRole: "implementer",
      activeSince: "2026-02-25T00:00:00.000Z",
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
        total: "0"
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
        consecutiveCleanRuns: 0,
        runtimeDelivery: null
      },
      commandPath: {
        status: "external",
        profile: "external",
        localEntrypoint: "/tmp/pairflow/dist/cli/index.js",
        activeEntrypoint: "/tmp/pairflow/dist/cli/index.js",
        message: "external",
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
    } as unknown as BubbleStatusView;
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
        getBubbleStatus: vi.fn(async () => status),
        getBubbleInbox: vi.fn(async () => ({
          bubbleId,
          repoPath,
          state: "RUNNING" as const,
          pending: {
            humanQuestions: 0,
            approvalRequests: 0,
            total: 0
          },
          items: []
        })),
        readRuntimeSessionsRegistry: vi.fn(async () => ({}))
      }
    });
    const server = await startRouterServer(router);

    try {
      const response = await fetch(
        `${server.url}/api/bubbles/${bubbleId}?repo=${encodeURIComponent(repoPath)}`
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
        reasonCode: "UI_READ_RESPONSE_INVALID",
        responseFamily: "bubble_detail"
      });
    } finally {
      await server.close();
    }
  });

  it("returns internal_error when the timeline route dependency returns malformed read data", async () => {
    const repoPath = "/tmp/pairflow-ui-router-invalid-timeline";
    const bubbleId = "b-router-invalid-timeline";
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
        readBubbleTimeline: vi.fn(
          async () =>
            ([
              {
                id: "env-invalid-timeline",
                ts: "2026-02-25T00:00:00.000Z",
                round: 1,
                type: "PASS",
                sender: "codex",
                recipient: "claude",
                payload: {
                  summary: "Invalid."
                },
                refs: "not-array"
              }
            ]) as unknown as UiTimelineEntry[]
        )
      }
    });
    const server = await startRouterServer(router);

    try {
      const response = await fetch(
        `${server.url}/api/bubbles/${bubbleId}/timeline?repo=${encodeURIComponent(repoPath)}`
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
        reasonCode: "UI_READ_RESPONSE_INVALID",
        responseFamily: "bubble_timeline"
      });
    } finally {
      await server.close();
    }
  });
});

describe("createUiRouter event payload validation failures", () => {
  const repoPath = "/tmp/pairflow-ui-router-event-validation";
  const repo: UiRepoSummary = {
    repoPath,
    total: 1,
    byState: {
      CREATED: 0,
      PREPARING_WORKSPACE: 0,
      RUNNING: 1,
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
    }
  };
  const bubble: UiBubbleSummary = {
    bubbleId: "b-router-event-validation",
    repoPath,
    worktreePath: "/tmp/worktree",
    state: "RUNNING",
    round: 1,
    activeAgent: "codex",
    activeRole: "implementer",
    activeSince: "2026-02-25T00:00:00.000Z",
    lastCommandAt: null,
    stateValidation: null,
    runtimeSession: null,
    runtime: {
      expected: true,
      present: true,
      stale: false
    },
    attention: null,
    reviewPolicy: null,
    metaReview: {
      actor: "meta-reviewer",
      authorityActive: false,
      consecutiveCleanRuns: 0,
      runtimeDelivery: null
    }
  };

  it("returns internal_error when SSE connected payload validation fails", async () => {
    const router = createUiRouter({
      repoScope: {
        repos: [repoPath, 42] as unknown as string[],
        has: (value: string) => Promise.resolve(value === repoPath)
      },
      events: {
        subscribe: () => () => undefined,
        getSnapshot: () => ({
          id: 1,
          ts: "2026-02-25T00:00:00.000Z",
          type: "snapshot",
          repos: [repo],
          bubbles: [bubble]
        }),
        refreshNow: () => Promise.resolve(undefined),
        addRepo: () => Promise.resolve(false),
        removeRepo: () => Promise.resolve(false),
        close: () => Promise.resolve(undefined)
      }
    });
    const server = await startRouterServer(router);

    try {
      const response = await fetch(`${server.url}/api/events`);
      const payload = (await response.json()) as {
        error: {
          code: string;
          details?: Record<string, unknown>;
        };
      };

      expect(response.status).toBe(500);
      expect(payload.error.code).toBe("internal_error");
      expect(payload.error.details).toMatchObject({
        reasonCode: "UI_EVENT_PAYLOAD_INVALID",
        eventFamily: "connected"
      });
    } finally {
      await server.close();
    }
  });

  it("returns internal_error when SSE connect snapshot payload validation fails", async () => {
    const subscribe = vi.fn(() => () => undefined);
    const router = createUiRouter({
      repoScope: {
        repos: [repoPath],
        has: (value: string) => Promise.resolve(value === repoPath)
      },
      events: {
        subscribe,
        getSnapshot: () =>
          ({
            id: 1,
            ts: "2026-02-25T00:00:00.000Z",
            type: "snapshot",
            repos: [repo],
            bubbles: [
              {
                ...bubble,
                state: "DRIFTED"
              }
            ]
          }) as unknown as UiSnapshotEvent,
        refreshNow: () => Promise.resolve(undefined),
        addRepo: () => Promise.resolve(false),
        removeRepo: () => Promise.resolve(false),
        close: () => Promise.resolve(undefined)
      }
    });
    const server = await startRouterServer(router);

    try {
      const response = await fetch(
        `${server.url}/api/events?repo=${encodeURIComponent(repoPath)}`
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
        reasonCode: "UI_EVENT_PAYLOAD_INVALID",
        eventFamily: "snapshot"
      });
      expect(subscribe).not.toHaveBeenCalled();
    } finally {
      await server.close();
    }
  });

  it("drops malformed subscriber events without writing trusted SSE data", async () => {
    const subscribers: Array<(event: UiEvent) => void> = [];
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const router = createUiRouter({
      repoScope: {
        repos: [repoPath],
        has: (value: string) => Promise.resolve(value === repoPath)
      },
      events: {
        subscribe: (_input, callback) => {
          subscribers.push(callback);
          return () => {
            subscribers.splice(subscribers.indexOf(callback), 1);
          };
        },
        getSnapshot: () => ({
          id: 1,
          ts: "2026-02-25T00:00:00.000Z",
          type: "snapshot",
          repos: [repo],
          bubbles: [bubble]
        }),
        refreshNow: () => Promise.resolve(undefined),
        addRepo: () => Promise.resolve(false),
        removeRepo: () => Promise.resolve(false),
        close: () => Promise.resolve(undefined)
      },
      keepAliveIntervalMs: 25
    });
    const server = await startRouterServer(router);

    try {
      const response = await fetch(
        `${server.url}/api/events?repo=${encodeURIComponent(repoPath)}`
      );
      expect(response.status).toBe(200);
      expect(response.body).not.toBeNull();
      const reader = response.body!.getReader();
      try {
        await readStreamUntil(reader, "event: snapshot");
        const subscriber = subscribers[0];
        if (subscriber === undefined) {
          throw new Error("Expected SSE subscriber callback to be registered.");
        }
        subscriber({
          id: 2,
          ts: "2026-02-25T00:00:01.000Z",
          type: "bubble.updated",
          repoPath,
          bubbleId: bubble.bubbleId,
          bubble: {
            ...bubble,
            state: "DRIFTED"
          }
        } as unknown as UiEvent);

        const heartbeat = await readStreamUntil(reader, "event: heartbeat");
        expect(heartbeat).not.toContain("event: bubble.updated");
        expect(warn).toHaveBeenCalledWith(
          "UI_EVENT_PAYLOAD_INVALID",
          expect.objectContaining({
            reasonCode: "UI_EVENT_PAYLOAD_INVALID",
            eventFamily: "bubble.updated"
          })
        );
      } finally {
        await reader.cancel();
      }
    } finally {
      warn.mockRestore();
      await server.close();
    }
  });

  it("logs non-validation subscriber callback failures before stream cleanup", async () => {
    const subscribers: Array<(event: UiEvent) => void> = [];
    let unsubscribed = false;
    let ended = false;
    let writeCalls = 0;
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const req = Object.assign(new EventEmitter(), { headers: {} });
    const res = Object.assign(new EventEmitter(), {
      writable: true,
      writableEnded: false,
      writeHead: vi.fn(),
      write: vi.fn(() => {
        writeCalls += 1;
        if (writeCalls > 3) {
          throw new Error("simulated subscriber write failure");
        }
        return true;
      }),
      end: vi.fn(() => {
        ended = true;
        res.writableEnded = true;
      })
    });

    try {
      await handleUiEvents({
        req: req as never,
        res: res as never,
        url: new URL(
          `/api/events?repo=${encodeURIComponent(repoPath)}`,
          "http://127.0.0.1"
        ),
        repoScope: {
          repos: [repoPath],
          has: (value: string) => Promise.resolve(value === repoPath)
        },
        routerCwd: process.cwd(),
        keepAliveIntervalMs: 1_000,
        events: {
          subscribe: (_input, callback) => {
            subscribers.push(callback);
            return () => {
              unsubscribed = true;
            };
          },
          getSnapshot: () => ({
            id: 1,
            ts: "2026-02-25T00:00:00.000Z",
            type: "snapshot",
            repos: [repo],
            bubbles: [bubble]
          }),
          refreshNow: () => Promise.resolve(undefined),
          addRepo: () => Promise.resolve(false),
          removeRepo: () => Promise.resolve(false),
          close: () => Promise.resolve(undefined)
        }
      });
      const subscriber = subscribers[0];
      if (subscriber === undefined) {
        throw new Error("Expected SSE subscriber callback to be registered.");
      }
      subscriber({
        id: 2,
        ts: "2026-02-25T00:00:01.000Z",
        type: "repo.removed",
        repoPath
      });

      expect(warn).toHaveBeenCalledWith(
        "UI_EVENT_SUBSCRIBER_CALLBACK_FAILED",
        expect.objectContaining({
          reasonCode: "UI_EVENT_SUBSCRIBER_CALLBACK_FAILED",
          error: "simulated subscriber write failure"
        })
      );
      expect(unsubscribed).toBe(true);
      expect(ended).toBe(true);
    } finally {
      warn.mockRestore();
    }
  });

  it("closes the stream after repeated malformed subscriber events reach the drop limit", async () => {
    const subscribers: Array<(event: UiEvent) => void> = [];
    let unsubscribed = false;
    let ended = false;
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const req = Object.assign(new EventEmitter(), { headers: {} });
    const res = Object.assign(new EventEmitter(), {
      writable: true,
      writableEnded: false,
      writeHead: vi.fn(),
      write: vi.fn(() => true),
      end: vi.fn(() => {
        ended = true;
        res.writableEnded = true;
      })
    });

    try {
      await handleUiEvents({
        req: req as never,
        res: res as never,
        url: new URL(
          `/api/events?repo=${encodeURIComponent(repoPath)}`,
          "http://127.0.0.1"
        ),
        repoScope: {
          repos: [repoPath],
          has: (value: string) => Promise.resolve(value === repoPath)
        },
        routerCwd: process.cwd(),
        keepAliveIntervalMs: 1_000,
        events: {
          subscribe: (_input, callback) => {
            subscribers.push(callback);
            return () => {
              unsubscribed = true;
            };
          },
          getSnapshot: () => ({
            id: 1,
            ts: "2026-02-25T00:00:00.000Z",
            type: "snapshot",
            repos: [repo],
            bubbles: [bubble]
          }),
          refreshNow: () => Promise.resolve(undefined),
          addRepo: () => Promise.resolve(false),
          removeRepo: () => Promise.resolve(false),
          close: () => Promise.resolve(undefined)
        }
      });
      const subscriber = subscribers[0];
      if (subscriber === undefined) {
        throw new Error("Expected SSE subscriber callback to be registered.");
      }
      for (let index = 0; index < 10; index += 1) {
        subscriber({
          id: index + 2,
          ts: `2026-02-25T00:00:${String(index + 10).padStart(2, "0")}.000Z`,
          type: "repo.removed",
          repoPath,
          extra: true
        } as unknown as UiEvent);
      }

      expect(warn).toHaveBeenCalledWith(
        "UI_EVENT_PAYLOAD_DROP_LIMIT_REACHED",
        expect.objectContaining({
          reasonCode: "UI_EVENT_PAYLOAD_DROP_LIMIT_REACHED",
          source: "sse_subscriber",
          invalidDropCount: 10
        })
      );
      expect(unsubscribed).toBe(true);
      expect(ended).toBe(true);
    } finally {
      warn.mockRestore();
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

  it("fails closed before status selection when delete action response is malformed", async () => {
    const repoPath = "/tmp/pairflow-ui-router-delete-invalid-response";
    const refreshNow = vi.fn(() => Promise.resolve(undefined));
    const deleteBubble = vi.fn(() =>
      Promise.resolve({
        ...uiDeleteResultFixture("b-router-delete-invalid"),
        requiresConfirmation: "yes"
      } as unknown as UiDeleteBubbleResult)
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
        refreshNow,
        addRepo: () => Promise.resolve(false),
        removeRepo: () => Promise.resolve(false),
        close: () => Promise.resolve(undefined)
      },
      dependencies: {
        deleteBubble
      }
    });
    const server = await startRouterServer(router);

    try {
      const response = await fetch(
        `${server.url}/api/bubbles/b-router-delete-invalid/delete?repo=${encodeURIComponent(repoPath)}`,
        { method: "POST" }
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
        reasonCode: "UI_ACTION_RESPONSE_INVALID",
        action: "delete"
      });
      expect(deleteBubble).toHaveBeenCalledTimes(1);
      expect(refreshNow).not.toHaveBeenCalled();
    } finally {
      await server.close();
    }
  });
});

describe("createUiRouter action routes", () => {
  it("projects default start, stop, and restart route results to UI action DTOs", async () => {
    let server: Awaited<ReturnType<typeof startRouterServer>> | undefined;
    const repoPath = "/tmp/pairflow-ui-router-lifecycle-defaults";
    const startBubbleV11 = vi.fn(async () => ({
      bubbleId: "b-router-lifecycle-defaults",
      state: rawBubbleStateFixture("b-router-lifecycle-defaults"),
      tmuxSessionName: "pf-b-router-lifecycle-defaults",
      worktreePath: "/tmp/worktrees/b-router-lifecycle-defaults",
      executionTarget: "local" as const,
      runtimeWorkspacePath: "/tmp/runtime/b-router-lifecycle-defaults"
    }));
    const stopBubbleV11 = vi.fn(async () => ({
      bubbleId: "b-router-lifecycle-defaults",
      state: rawBubbleStateFixture("b-router-lifecycle-defaults", "CANCELLED"),
      tmuxSessionName: "pf-b-router-lifecycle-defaults",
      tmuxSessionExisted: true,
      runtimeSessionRemoved: true
    }));
    const restartBubble = vi.fn(async () => ({
      bubbleId: "b-router-lifecycle-defaults",
      state: rawBubbleStateFixture("b-router-lifecycle-defaults"),
      tmuxSessionName: "pf-b-router-lifecycle-defaults",
      worktreePath: "/tmp/worktrees/b-router-lifecycle-defaults",
      previousTmuxSessionExisted: true,
      previousRuntimeSessionRemoved: true
    }));

    try {
      await withMockedLifecycleRouteDependencies(
        {
          startBubbleV11,
          stopBubbleV11,
          restartBubble
        },
        async (createUiRouterWithDefaultProjection) => {
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

          const start = await fetch(
            `${server.url}/api/bubbles/b-router-lifecycle-defaults/start?repo=${encodeURIComponent(repoPath)}`,
            { method: "POST" }
          );
          const stop = await fetch(
            `${server.url}/api/bubbles/b-router-lifecycle-defaults/stop?repo=${encodeURIComponent(repoPath)}`,
            { method: "POST" }
          );
          const restart = await fetch(
            `${server.url}/api/bubbles/b-router-lifecycle-defaults/restart?repo=${encodeURIComponent(repoPath)}`,
            { method: "POST" }
          );
          const startPayload = (await start.json()) as {
            result: UiStartBubbleResult & Record<string, unknown>;
          };
          const stopPayload = (await stop.json()) as {
            result: UiStopBubbleResult & Record<string, unknown>;
          };
          const restartPayload = (await restart.json()) as {
            result: UiRestartBubbleResult & Record<string, unknown>;
          };

          expect(start.status).toBe(200);
          expect(stop.status).toBe(200);
          expect(restart.status).toBe(200);
          expect(startPayload.result).toStrictEqual({
            bubbleId: "b-router-lifecycle-defaults",
            actionState: {
              bubbleId: "b-router-lifecycle-defaults",
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
            },
            tmuxSessionName: "pf-b-router-lifecycle-defaults",
            worktreePath: "/tmp/worktrees/b-router-lifecycle-defaults"
          });
          expect(stopPayload.result).toStrictEqual({
            bubbleId: "b-router-lifecycle-defaults",
            actionState: {
              bubbleId: "b-router-lifecycle-defaults",
              lifecycleState: "CANCELLED",
              round: 2,
              activeAgent: null,
              activeRole: null,
              activeSince: null,
              lastCommandAt: "2026-02-25T00:02:00.000Z",
              executionContext: null
            },
            tmuxSessionName: "pf-b-router-lifecycle-defaults",
            tmuxSessionExisted: true,
            runtimeSessionRemoved: true
          });
          expect(restartPayload.result).toStrictEqual({
            bubbleId: "b-router-lifecycle-defaults",
            actionState: startPayload.result.actionState,
            tmuxSessionName: "pf-b-router-lifecycle-defaults",
            worktreePath: "/tmp/worktrees/b-router-lifecycle-defaults",
            previousTmuxSessionExisted: true,
            previousRuntimeSessionRemoved: true
          });
          for (const result of [
            startPayload.result,
            stopPayload.result,
            restartPayload.result
          ]) {
            expect(result).not.toHaveProperty("state");
            expect(result).not.toHaveProperty("executionTarget");
            expect(result).not.toHaveProperty("runtimeWorkspacePath");
            expect(result.actionState).not.toHaveProperty("round_role_history");
            expect(result.actionState).not.toHaveProperty("roundRoleHistory");
            expect(result.actionState).not.toHaveProperty("meta_review");
            expect(result.actionState).not.toHaveProperty("metaReview");
            if (result.actionState.executionContext !== null) {
              expect(result.actionState.executionContext).not.toHaveProperty("attempt");
              expect(result.actionState.executionContext).not.toHaveProperty("deadlineAt");
            }
          }
        }
      );
    } finally {
      if (server !== undefined) {
        await server.close();
      }
    }
  });

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
        event: uiActionEventFixture("b-router-approve-success"),
        actionState: uiActionStateFixture("b-router-approve-success"),
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
        envelope: {
          id: "env-approve-default",
          ts: "2026-02-25T00:02:00.000Z",
          bubble_id: "b-router-approve-default",
          sender: "human" as const,
          recipient: "orchestrator" as const,
          type: "APPROVAL_DECISION" as const,
          round: 2,
          payload: {
            decision: "approve" as const,
            message: "Approved."
          },
          refs: []
        },
        state: {
          bubble_id: "b-router-approve-default",
          state: "APPROVED_FOR_COMMIT" as const,
          round: 2,
          active_agent: null,
          active_role: null,
          active_since: null,
          execution_context: null,
          round_role_history: [],
          last_command_at: "2026-02-25T00:02:00.000Z",
          pending_rework_intent: null
        },
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
                event?: Record<string, unknown>;
                actionState?: Record<string, unknown>;
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
            expect(payload.result.event).toStrictEqual({
              id: "env-approve-default",
              timestamp: "2026-02-25T00:02:00.000Z",
              bubbleId: "b-router-approve-default",
              sender: "human",
              recipient: "orchestrator",
              type: "APPROVAL_DECISION",
              round: 2,
              refs: [],
              message: "Approved.",
              decision: "approve"
            });
            expect(payload.result.actionState).toStrictEqual({
              bubbleId: "b-router-approve-default",
              lifecycleState: "APPROVED_FOR_COMMIT",
              round: 2,
              activeAgent: null,
              activeRole: null,
              activeSince: null,
              lastCommandAt: "2026-02-25T00:02:00.000Z",
              executionContext: null
            });
            expect(payload.result).not.toHaveProperty("envelope");
            expect(payload.result).not.toHaveProperty("state");
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

    it("projects queued rework results through the first-party route dependency chain", async () => {
      let server: Awaited<ReturnType<typeof startRouterServer>> | undefined;
      const repoPath = "/tmp/pairflow-ui-router-rework-default-queued";
      const emitRequestReworkV11 = vi.fn(async () => ({
        mode: "queued" as const,
        bubbleId: "b-router-rework-default-queued",
        intentId: "intent-queued-1",
        state: {
          ...rawBubbleStateFixture("b-router-rework-default-queued"),
          pending_rework_intent: {
            intent_id: "intent-queued-1",
            message: "Please rework queued.",
            refs: ["artifact://queued-rework.md"],
            requested_by: "human",
            requested_at: "2026-02-25T00:04:00.000Z",
            status: "pending" as const,
            superseded_by_intent_id: "intent-queued-0"
          }
        },
        supersededIntentId: "intent-queued-0"
      }));

      try {
        await withMockedApprovalRouteDependencies(
          {
            emitRequestReworkV11
          },
          async (createUiRouterWithDefaultProjection) => {
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
              `${server.url}/api/bubbles/b-router-rework-default-queued/request-rework?repo=${encodeURIComponent(repoPath)}`,
              {
                method: "POST",
                headers: {
                  "content-type": "application/json"
                },
                body: JSON.stringify({
                  message: "Please rework queued.",
                  refs: ["artifact://queued-rework.md"]
                })
              }
            );
            const payload = (await response.json()) as {
              result: Record<string, unknown> & {
                actionState: Record<string, unknown>;
                queuedIntent: Record<string, unknown>;
              };
            };

            expect(response.status).toBe(200);
            expect(emitRequestReworkV11).toHaveBeenCalledTimes(1);
            expect(payload.result).toStrictEqual({
              mode: "queued",
              bubbleId: "b-router-rework-default-queued",
              intentId: "intent-queued-1",
              actionState: {
                bubbleId: "b-router-rework-default-queued",
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
              },
              queuedIntent: {
                intentId: "intent-queued-1",
                message: "Please rework queued.",
                refs: ["artifact://queued-rework.md"],
                requestedBy: "human",
                requestedAt: "2026-02-25T00:04:00.000Z",
                status: "pending",
                supersededByIntentId: "intent-queued-0"
              },
              supersededIntentId: "intent-queued-0"
            });
            expect(payload.result).not.toHaveProperty("state");
            expect(payload.result).not.toHaveProperty("envelope");
            expect(payload.result.actionState).not.toHaveProperty(
              "pending_rework_intent"
            );
            expect(payload.result.actionState).not.toHaveProperty(
              "round_role_history"
            );
            expect(payload.result.actionState).not.toHaveProperty("meta_review");
            expect(payload.result.queuedIntent).not.toHaveProperty("intent_id");
            expect(payload.result.queuedIntent).not.toHaveProperty("requested_by");
          }
        );
      } finally {
        if (server !== undefined) {
          await server.close();
        }
      }
    });

    it("does not synthesize queued rework intent details when state lags", async () => {
      let server: Awaited<ReturnType<typeof startRouterServer>> | undefined;
      const repoPath = "/tmp/pairflow-ui-router-rework-default-queued-lag";
      const emitRequestReworkV11 = vi.fn(async () => ({
        mode: "queued" as const,
        bubbleId: "b-router-rework-default-queued-lag",
        intentId: "intent-queued-lag",
        state: {
          ...rawBubbleStateFixture("b-router-rework-default-queued-lag"),
          pending_rework_intent: null
        }
      }));

      try {
        await withMockedApprovalRouteDependencies(
          {
            emitRequestReworkV11
          },
          async (createUiRouterWithDefaultProjection) => {
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
              `${server.url}/api/bubbles/b-router-rework-default-queued-lag/request-rework?repo=${encodeURIComponent(repoPath)}`,
              {
                method: "POST",
                headers: {
                  "content-type": "application/json"
                },
                body: JSON.stringify({
                  message: "Request body must not become queuedIntent.",
                  refs: ["artifact://request-only.md"]
                })
              }
            );
            const payload = (await response.json()) as {
              result: Record<string, unknown>;
            };

            expect(response.status).toBe(200);
            expect(payload.result).toMatchObject({
              mode: "queued",
              bubbleId: "b-router-rework-default-queued-lag",
              intentId: "intent-queued-lag",
              queuedIntent: null
            });
          }
        );
      } finally {
        if (server !== undefined) {
          await server.close();
        }
      }
    });

    it("projects immediate rework results through the first-party route dependency chain", async () => {
      let server: Awaited<ReturnType<typeof startRouterServer>> | undefined;
      const repoPath = "/tmp/pairflow-ui-router-rework-default-immediate";
      const emitRequestReworkV11 = vi.fn(async () => ({
        mode: "immediate" as const,
        bubbleId: "b-router-rework-default-immediate",
        sequence: 10,
        envelope: rawProtocolEnvelopeFixture(
          "b-router-rework-default-immediate",
          "APPROVAL_DECISION",
          {
            message: "Please rework.",
            decision: "rework"
          }
        ),
        state: rawBubbleStateFixture("b-router-rework-default-immediate"),
        delivery: {
          statusDelivery: {
            status: "accepted" as const,
            message: "Rework request recorded for reviewer."
          }
        }
      }));

      try {
        await withMockedApprovalRouteDependencies(
          {
            emitRequestReworkV11
          },
          async (createUiRouterWithDefaultProjection) => {
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
              `${server.url}/api/bubbles/b-router-rework-default-immediate/request-rework?repo=${encodeURIComponent(repoPath)}`,
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
              result: Record<string, unknown>;
            };

            expect(response.status).toBe(200);
            expect(payload.result).toStrictEqual({
              mode: "immediate",
              bubbleId: "b-router-rework-default-immediate",
              sequence: 10,
              event: {
                id: "env-b-router-rework-default-immediate",
                timestamp: "2026-02-25T00:02:00.000Z",
                bubbleId: "b-router-rework-default-immediate",
                sender: "human",
                recipient: "orchestrator",
                type: "APPROVAL_DECISION",
                round: 2,
                refs: ["artifact://action.md"],
                message: "Please rework.",
                decision: "rework"
              },
              actionState: {
                bubbleId: "b-router-rework-default-immediate",
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
              },
              delivery: {
                statusDelivery: {
                  status: "accepted",
                  message: "Rework request recorded for reviewer."
                }
              }
            });
            expect(payload.result).not.toHaveProperty("state");
            expect(payload.result).not.toHaveProperty("envelope");
          }
        );
      } finally {
        if (server !== undefined) {
          await server.close();
        }
      }
    });

    it("serializes neutral rework delivery rejection fields from the DTO port", async () => {
      const repoPath = "/tmp/pairflow-ui-router-rework-success";
      const emitRequestRework = vi.fn(async () => ({
        mode: "immediate" as const,
        bubbleId: "b-router-rework-success",
        sequence: 8,
        event: uiActionEventFixture("b-router-rework-success"),
        actionState: uiActionStateFixture("b-router-rework-success"),
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
        consecutiveCleanRuns: 0,
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
        consecutiveCleanRuns: 0,
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

  it("projects default reply, resume, and commit route results to UI action DTOs", async () => {
    let server: Awaited<ReturnType<typeof startRouterServer>> | undefined;
    const repoPath = "/tmp/pairflow-ui-router-event-defaults";
    const emitHumanReplyV11 = vi.fn(async () => ({
      bubbleId: "b-router-event-defaults",
      sequence: 11,
      envelope: rawProtocolEnvelopeFixture(
        "b-router-event-defaults",
        "HUMAN_REPLY",
        {
          message: "Human reply."
        }
      ),
      state: rawBubbleStateFixture("b-router-event-defaults")
    }));
    const resumeBubbleV11 = vi.fn(async () => ({
      bubbleId: "b-router-event-defaults",
      sequence: 12,
      envelope: rawProtocolEnvelopeFixture(
        "b-router-event-defaults",
        "HUMAN_REPLY",
        {
          id: "env-resume-default",
          message: "Resume bubble."
        }
      ),
      state: rawBubbleStateFixture("b-router-event-defaults")
    }));
    const commitBubbleV11 = vi.fn(async () => ({
      bubbleId: "b-router-event-defaults",
      sequence: 13,
      envelope: rawProtocolEnvelopeFixture(
        "b-router-event-defaults",
        "COMMIT_RESULT",
        {
          id: "env-commit-default",
          sender: "orchestrator",
          recipient: "human",
          summary: "Committed abc123."
        }
      ),
      state: {
        ...rawBubbleStateFixture("b-router-event-defaults", "DONE"),
        round: 2
      },
      commitSha: "abc123",
      commitMessage: "Commit message",
      stagedFiles: ["src/example.ts"]
    }));

    try {
      await withMockedEventRouteDependencies(
        {
          commitBubbleV11,
          emitHumanReplyV11,
          resumeBubbleV11
        },
        async (createUiRouterWithDefaultProjection) => {
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

          const reply = await fetch(
            `${server.url}/api/bubbles/b-router-event-defaults/reply?repo=${encodeURIComponent(repoPath)}`,
            {
              method: "POST",
              headers: {
                "content-type": "application/json"
              },
              body: JSON.stringify({
                message: "Human reply."
              })
            }
          );
          const resume = await fetch(
            `${server.url}/api/bubbles/b-router-event-defaults/resume?repo=${encodeURIComponent(repoPath)}`,
            { method: "POST" }
          );
          const commit = await fetch(
            `${server.url}/api/bubbles/b-router-event-defaults/commit?repo=${encodeURIComponent(repoPath)}`,
            {
              method: "POST",
              headers: {
                "content-type": "application/json"
              },
              body: JSON.stringify({
                stageAll: true,
                message: "Commit message"
              })
            }
          );
          const replyPayload = (await reply.json()) as {
            result: Record<string, unknown>;
          };
          const resumePayload = (await resume.json()) as {
            result: Record<string, unknown>;
          };
          const commitPayload = (await commit.json()) as {
            result: Record<string, unknown>;
          };

          expect(reply.status).toBe(200);
          expect(resume.status).toBe(200);
          expect(commit.status).toBe(200);
          expect(replyPayload.result).toStrictEqual({
            bubbleId: "b-router-event-defaults",
            sequence: 11,
            event: {
              id: "env-b-router-event-defaults",
              timestamp: "2026-02-25T00:02:00.000Z",
              bubbleId: "b-router-event-defaults",
              sender: "human",
              recipient: "orchestrator",
              type: "HUMAN_REPLY",
              round: 2,
              refs: ["artifact://action.md"],
              message: "Human reply."
            },
            actionState: {
              bubbleId: "b-router-event-defaults",
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
            }
          });
          expect(resumePayload.result).toStrictEqual({
            bubbleId: "b-router-event-defaults",
            sequence: 12,
            event: {
              id: "env-resume-default",
              timestamp: "2026-02-25T00:02:00.000Z",
              bubbleId: "b-router-event-defaults",
              sender: "human",
              recipient: "orchestrator",
              type: "HUMAN_REPLY",
              round: 2,
              refs: ["artifact://action.md"],
              message: "Resume bubble."
            },
            actionState: {
              bubbleId: "b-router-event-defaults",
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
            }
          });
          expect(commitPayload.result).toStrictEqual({
            bubbleId: "b-router-event-defaults",
            sequence: 13,
            event: {
              id: "env-commit-default",
              timestamp: "2026-02-25T00:02:00.000Z",
              bubbleId: "b-router-event-defaults",
              sender: "orchestrator",
              recipient: "human",
              type: "COMMIT_RESULT",
              round: 2,
              refs: ["artifact://action.md"],
              summary: "Committed abc123."
            },
            actionState: {
              bubbleId: "b-router-event-defaults",
              lifecycleState: "DONE",
              round: 2,
              activeAgent: null,
              activeRole: null,
              activeSince: null,
              lastCommandAt: "2026-02-25T00:02:00.000Z",
              executionContext: null
            },
            commitSha: "abc123",
            commitMessage: "Commit message",
            stagedFiles: ["src/example.ts"]
          });
          for (const result of [
            replyPayload.result,
            resumePayload.result,
            commitPayload.result
          ]) {
            expect(result).not.toHaveProperty("state");
            expect(result).not.toHaveProperty("envelope");
          }
        }
      );
    } finally {
      if (server !== undefined) {
        await server.close();
      }
    }
  });

  it("accepts stageAll commit bodies and rejects legacy auto before dispatch", async () => {
    const repoPath = "/tmp/pairflow-ui-router-commit-stage-all";
    const commitBubble = vi.fn(() =>
      Promise.resolve(uiCommitResultFixture("b-router-commit-stage-all"))
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

  it("fails closed when commit action response is malformed", async () => {
    const repoPath = "/tmp/pairflow-ui-router-commit-invalid-response";
    const missingCommitMessageResult: Record<string, unknown> = {
      ...uiCommitResultFixture("b-router-commit-invalid")
    };
    delete missingCommitMessageResult.commitMessage;
    const commitBubble = vi
      .fn()
      .mockResolvedValueOnce({
        ...uiCommitResultFixture("b-router-commit-invalid"),
        stagedFiles: "src/example.ts"
      } as unknown as UiCommitBubbleResult)
      .mockResolvedValueOnce(
        missingCommitMessageResult as unknown as UiCommitBubbleResult
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

    try {
      const response = await fetch(
        `${server.url}/api/bubbles/b-router-commit-invalid/commit?repo=${encodeURIComponent(repoPath)}`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify({
            stageAll: true
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
        reasonCode: "UI_ACTION_RESPONSE_INVALID",
        action: "commit"
      });

      const missingRequired = await fetch(
        `${server.url}/api/bubbles/b-router-commit-invalid/commit?repo=${encodeURIComponent(repoPath)}`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify({
            stageAll: true
          })
        }
      );
      const missingRequiredPayload = (await missingRequired.json()) as {
        error: {
          code: string;
          details?: Record<string, unknown>;
        };
      };

      expect(missingRequired.status).toBe(500);
      expect(missingRequiredPayload.error.code).toBe("internal_error");
      expect(missingRequiredPayload.error.details).toMatchObject({
        reasonCode: "UI_ACTION_RESPONSE_INVALID",
        action: "commit"
      });
      expect(commitBubble).toHaveBeenCalledTimes(2);
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
        consecutiveCleanRuns: 0,
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
            consecutiveCleanRuns: 0,
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

  it("returns merge, open, and attach success DTOs without raw carrier fields", async () => {
    const repoPath = "/tmp/pairflow-ui-router-success-actions";
    const expectedMergeResult = {
      bubbleId: "b-router-success-actions",
      baseBranch: "main",
      bubbleBranch: "bubble/b-router-success-actions",
      mergeCommitSha: "abc123",
      presentationRoute: "local" as const,
      pushedBaseBranch: false,
      deletedRemoteBranch: false,
      tmuxSessionName: "pf-b-router-success-actions",
      tmuxSessionExisted: true,
      runtimeSessionRemoved: true,
      removedWorktree: true,
      removedBubbleBranch: true
    };
    const expectedOpenResult = {
      bubbleId: "b-router-success-actions",
      workspaceKind: "local_worktree" as const,
      workspacePath: "/tmp/worktrees/b-router-success-actions",
      worktreePath: "/tmp/worktrees/b-router-success-actions",
      command: "code /tmp/worktrees/b-router-success-actions"
    };
    const expectedAttachResult = {
      bubbleId: "b-router-success-actions",
      tmuxSessionName: "pf-b-router-success-actions",
      launcherRequested: "auto" as const,
      launcherUsed: "iterm2" as const,
      attachCommand: "tmux attach -t pf-b-router-success-actions"
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
        mergeBubble: vi.fn(async () => expectedMergeResult),
        openBubble: vi.fn(async () => expectedOpenResult),
        attachBubble: vi.fn(async () => expectedAttachResult)
      }
    });
    const server = await startRouterServer(router);

    try {
      const merge = await fetch(
        `${server.url}/api/bubbles/b-router-success-actions/merge?repo=${encodeURIComponent(repoPath)}`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify({
            push: false,
            deleteRemote: false
          })
        }
      );
      const open = await fetch(
        `${server.url}/api/bubbles/b-router-success-actions/open?repo=${encodeURIComponent(repoPath)}`,
        { method: "POST" }
      );
      const attach = await fetch(
        `${server.url}/api/bubbles/b-router-success-actions/attach?repo=${encodeURIComponent(repoPath)}`,
        { method: "POST" }
      );
      const mergePayload = (await merge.json()) as {
        result: Record<string, unknown>;
      };
      const openPayload = (await open.json()) as {
        result: Record<string, unknown>;
      };
      const attachPayload = (await attach.json()) as {
        result: Record<string, unknown>;
      };

      expect(merge.status).toBe(200);
      expect(open.status).toBe(200);
      expect(attach.status).toBe(200);
      expect(mergePayload.result).toStrictEqual(expectedMergeResult);
      expect(openPayload.result).toStrictEqual(expectedOpenResult);
      expect(attachPayload.result).toStrictEqual(expectedAttachResult);
      for (const result of [
        mergePayload.result,
        openPayload.result,
        attachPayload.result
      ]) {
        expect(result).not.toHaveProperty("state");
        expect(result).not.toHaveProperty("envelope");
        expect(result).not.toHaveProperty("actionState");
        expect(result).not.toHaveProperty("executionTarget");
        expect(result).not.toHaveProperty("runtimeWorkspacePath");
      }
    } finally {
      await server.close();
    }
  });

  it("fails closed when merge action response is malformed", async () => {
    const repoPath = "/tmp/pairflow-ui-router-merge-invalid-response";
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
        mergeBubble: vi.fn(async () => ({
          ...uiMergeResultFixture("b-router-merge-invalid"),
          presentationRoute: "remote"
        } as unknown as UiMergeBubbleResult))
      }
    });
    const server = await startRouterServer(router);

    try {
      const response = await fetch(
        `${server.url}/api/bubbles/b-router-merge-invalid/merge?repo=${encodeURIComponent(repoPath)}`,
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
        reasonCode: "UI_ACTION_RESPONSE_INVALID",
        action: "merge"
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
      actionState: {
        bubbleId: "b-router-restart-01",
        lifecycleState: "RUNNING" as const,
        round: 1,
        activeAgent: "codex" as const,
        activeRole: "implementer" as const,
        activeSince: "2026-02-25T00:00:00.000Z",
        lastCommandAt: "2026-02-25T00:01:00.000Z",
        executionContext: null
      },
      tmuxSessionName: "pf-b-router-restart-01",
      worktreePath: "/tmp/worktree",
      previousTmuxSessionExisted: true,
      previousRuntimeSessionRemoved: true
    }));

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
        result: Awaited<ReturnType<typeof restartBubble>>;
      };

      expect(response.status).toBe(200);
      expect(payload.result).toStrictEqual({
        bubbleId: "b-router-restart-01",
        actionState: {
          bubbleId: "b-router-restart-01",
          lifecycleState: "RUNNING",
          round: 1,
          activeAgent: "codex",
          activeRole: "implementer",
          activeSince: "2026-02-25T00:00:00.000Z",
          lastCommandAt: "2026-02-25T00:01:00.000Z",
          executionContext: null
        },
        tmuxSessionName: "pf-b-router-restart-01",
        worktreePath: "/tmp/worktree",
        previousTmuxSessionExisted: true,
        previousRuntimeSessionRemoved: true
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
        reviewer_blocking_min_severity: "P1" as const,
        meta_review_auto_rework_min_severity: "P1" as const,
        meta_review_consecutive_clean_runs_required: 1
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
        consecutiveCleanRuns: 0,
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
        reviewer_blocking_min_severity: "P3" as const,
        meta_review_auto_rework_min_severity: "P3" as const,
        meta_review_consecutive_clean_runs_required: 2,
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
            reviewBlockingMinSeverity: "P3",
            metaReviewQualityPreset: "P3+1",
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
            meta_review_consecutive_clean_runs_required: number;
          };
        };
      };

      expect(response.status).toBe(200);
      expect(payload.result).toMatchObject({
        bubbleId: "b-router-policy-01",
        activationChange: "none",
        reviewPolicy: {
          requested_loop_mode: "meta_only",
          effective_loop_mode: "full",
          meta_review_consecutive_clean_runs_required: 2
        }
      });
      expect(updateBubbleReviewPolicy).toHaveBeenCalledWith({
        bubbleId: "b-router-policy-01",
        repoPath,
        reviewLoopMode: "meta_only",
        reviewBlockingMinSeverity: "P3",
        metaReviewQualityPreset: "P3+1",
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

  it("rejects review-policy update when reviewBlockingMinSeverity is invalid", async () => {
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
            reviewBlockingMinSeverity: "P0"
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
      expect(payload.error.message).toContain("reviewBlockingMinSeverity");
      expect(updateBubbleReviewPolicy).not.toHaveBeenCalled();
    } finally {
      await server.close();
    }
  });

  it("rejects review-policy update when reviewer severity conflicts with quality preset", async () => {
    const repoPath = "/tmp/pairflow-ui-router-review-policy-preset-mismatch-repo";
    const getBubbleStatus = vi.fn(async () =>
      createReviewPolicyStatus({
        repoPath,
        bubbleId: "b-router-policy-preset-mismatch-01"
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
        `${server.url}/api/bubbles/b-router-policy-preset-mismatch-01/update-review-policy?repo=${encodeURIComponent(repoPath)}`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify({
            reviewLoopMode: "meta_only",
            reviewBlockingMinSeverity: "P2",
            metaReviewQualityPreset: "P3+2"
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
      expect(payload.error.message).toContain("must match");
      expect(updateBubbleReviewPolicy).not.toHaveBeenCalled();
    } finally {
      await server.close();
    }
  });

  it("rejects review-policy update when the legacy metaReviewAutoReworkMinSeverity body field is sent", async () => {
    const repoPath = "/tmp/pairflow-ui-router-review-policy-legacy-severity-repo";
    const getBubbleStatus = vi.fn(async () =>
      createReviewPolicyStatus({
        repoPath,
        bubbleId: "b-router-policy-legacy-severity-01"
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
        `${server.url}/api/bubbles/b-router-policy-legacy-severity-01/update-review-policy?repo=${encodeURIComponent(repoPath)}`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify({
            reviewLoopMode: "meta_only",
            metaReviewAutoReworkMinSeverity: "P2"
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
      expect(payload.error.message).toContain("reviewBlockingMinSeverity");
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
          reviewer_blocking_min_severity: "P1",
          meta_review_auto_rework_min_severity: "P1",
          meta_review_consecutive_clean_runs_required: 1,
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
      const details = payload.error.details as {
        bubble?: {
          reviewPolicy?: unknown;
        };
        reviewPolicyConflict?: {
          reviewPolicy?: unknown;
        };
      };
      expect(details.bubble?.reviewPolicy).toEqual(
        details.reviewPolicyConflict?.reviewPolicy
      );
      expect(details.bubble?.reviewPolicy).toMatchObject({
        meta_review_consecutive_clean_runs_required: 1
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
          reviewer_blocking_min_severity: "P1",
          meta_review_auto_rework_min_severity: "P1",
          meta_review_consecutive_clean_runs_required: 1,
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
