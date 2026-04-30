import { describe, expect, it } from "vitest";

import {
  presentBubbleDetail,
  presentRepoSummary,
  presentBubbleSummaryFromListEntry,
  presentRuntimeHealth
} from "../../../src/v11/infrastructure/ui/presenters/bubblePresenter.js";

describe("bubblePresenter", () => {
  it("marks runtime as stale when a runtime-expected state has no session", () => {
    const runtime = presentRuntimeHealth("RUNNING", null);

    expect(runtime.expected).toBe(true);
    expect(runtime.present).toBe(false);
    expect(runtime.stale).toBe(true);
  });

  it("marks runtime as stale when a non-runtime state still has session", () => {
    const runtime = presentRuntimeHealth("DONE", {
      bubbleId: "b_1",
      repoPath: "/tmp/repo",
      worktreePath: "/tmp/worktree",
      tmuxSessionName: "pf-b_1",
      updatedAt: "2026-02-24T12:00:00.000Z"
    });

    expect(runtime.expected).toBe(false);
    expect(runtime.present).toBe(true);
    expect(runtime.stale).toBe(true);
  });

  it("treats remote bubbles as not expecting a local runtime session even if a placeholder session leaks through", () => {
    const runtime = presentRuntimeHealth(
      "RUNNING",
      {
        bubbleId: "b_remote_placeholder_01",
        repoPath: "/tmp/repo",
        worktreePath: "/tmp/worktree",
        tmuxSessionName: "remote:b_remote_placeholder_01",
        updatedAt: "2026-04-16T10:01:00.000Z"
      },
      null,
      {
        alias: "lab",
        host: "ssh.example.com",
        pointerKind: "started",
        viewKind: "status",
        statusSource: "live",
        cacheStatus: "present",
        runtimeAvailability: "active"
      }
    );

    expect(runtime.expected).toBe(false);
    expect(runtime.present).toBe(false);
    expect(runtime.stale).toBe(false);
  });

  it("does not degrade refreshed active remote entries into stale runtime summaries", () => {
    const presented = presentBubbleSummaryFromListEntry({
      bubbleId: "b_remote_refresh_active_01",
      repoPath: "/tmp/repo",
      worktreePath: "/tmp/worktree",
      state: "RUNNING",
      round: 4,
      activeAgent: "codex",
      activeRole: "implementer",
      activeSince: "2026-04-16T09:41:00.000Z",
      lastCommandAt: "2026-04-16T10:00:00.000Z",
      stateValidation: null,
      metaReview: {
        actor: "meta-reviewer",
        authorityActive: false,
        consecutiveCleanRuns: 0,
        runtimeDelivery: null
      },
      attention: null,
      runtimeSession: null,
      remoteExecution: {
        alias: "lab",
        host: "ssh.example.com",
        pointerKind: "started",
        viewKind: "list",
        stateSource: "refresh",
        cacheStatus: "present",
        remoteClonePath: "/srv/pairflow/repo--b_remote_refresh_active_01",
        lastCacheCheckAt: "2026-04-16T10:01:00.000Z"
      }
    });

    expect(presented.runtime).toStrictEqual({
      expected: false,
      present: false,
      stale: false
    });
    expect(presented.attention).toBeNull();
  });

  it("presents list entries with runtime metadata for attach gating", () => {
    const presented = presentBubbleSummaryFromListEntry({
      bubbleId: "b_attach_01",
      repoPath: "/tmp/repo",
      worktreePath: "/tmp/worktree",
      state: "WAITING_HUMAN",
      round: 2,
      activeAgent: "codex",
      activeRole: "implementer",
      activeSince: "2026-02-24T12:00:00.000Z",
      lastCommandAt: "2026-02-24T12:00:30.000Z",
      stateValidation: null,
      metaReview: {
        actor: "meta-reviewer",
        authorityActive: false,
        consecutiveCleanRuns: 0,
        runtimeDelivery: null
      },
      attention: null,
      runtimeSession: {
        bubbleId: "b_attach_01",
        repoPath: "/tmp/repo",
        worktreePath: "/tmp/worktree",
        tmuxSessionName: "pf-b_attach_01",
        updatedAt: "2026-02-24T12:00:30.000Z"
      }
    });

    expect(presented.runtime.present).toBe(true);
    expect(presented.runtime.stale).toBe(false);
    expect(presented.runtimeSession?.tmuxSessionName).toBe("pf-b_attach_01");
    expect(presented.attention).toBeNull();
    expect(presented.metaReview).toStrictEqual({
      actor: "meta-reviewer",
      authorityActive: false,
      consecutiveCleanRuns: 0,
      runtimeDelivery: null
    });
    expect(Object.keys(presented.metaReview).sort()).toStrictEqual([
      "actor",
      "authorityActive",
      "consecutiveCleanRuns",
      "runtimeDelivery"
    ]);
  });

  it("preserves remote unavailable markers in first-party list summaries", () => {
    const presented = presentBubbleSummaryFromListEntry({
      bubbleId: "b_remote_ui_01",
      repoPath: "/tmp/repo",
      worktreePath: "/tmp/worktree",
      state: "RUNNING",
      round: 2,
      activeAgent: null,
      activeRole: null,
      activeSince: null,
      lastCommandAt: null,
      stateValidation: null,
      metaReview: {
        actor: "meta-reviewer",
        authorityActive: false,
        consecutiveCleanRuns: 0,
        runtimeDelivery: null
      },
      attention: null,
      runtimeSession: null,
      remoteExecution: {
        alias: "lab",
        host: "ssh.example.com",
        pointerKind: "started",
        viewKind: "list",
        stateSource: "unavailable_started",
        cacheStatus: "missing",
        refreshAttemptedAt: "2026-04-16T10:02:00.000Z",
        reasonCode: "LIST_REMOTE_REFRESH_UNAVAILABLE",
        remoteClonePath: "/srv/pairflow/repo--b_remote_ui_01",
        compatLifecyclePlaceholder: {
          state: "RUNNING",
          round: 2,
          source: "local_control_plane_compat"
        }
      }
    });

    expect(presented.remoteExecution).toStrictEqual({
      alias: "lab",
      host: "ssh.example.com",
      pointerKind: "started",
      viewKind: "list",
      stateSource: "unavailable_started",
      cacheStatus: "missing",
      refreshAttemptedAt: "2026-04-16T10:02:00.000Z",
      reasonCode: "LIST_REMOTE_REFRESH_UNAVAILABLE",
      remoteClonePath: "/srv/pairflow/repo--b_remote_ui_01",
      compatLifecyclePlaceholder: {
        state: "RUNNING",
        round: 2,
        source: "local_control_plane_compat"
      }
    });
    expect(presented.runtime).toStrictEqual({
      expected: false,
      present: false,
      stale: false
    });
  });

  it("preserves remote execution aggregates in repo summaries", () => {
    const presented = presentRepoSummary({
      repoPath: "/tmp/repo",
      total: 1,
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
        unavailableStarted: 1
      }
    });

    expect(presented.remoteExecutionSummary).toStrictEqual({
      createdNotStarted: 0,
      unavailableStarted: 1
    });
  });

  it("preserves remote status metadata in the first-party detail path", () => {
    const detail = presentBubbleDetail({
      status: {
        bubbleId: "b_detail_01",
        repoPath: "/tmp/repo",
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
          remoteClonePath: "/srv/pairflow/repo--b_detail_01",
          lastLiveCheckAt: "2026-02-24T12:00:31.000Z",
          lastCacheCheckAt: "2026-02-24T12:00:30.000Z"
        }
      },
      inbox: {
        bubbleId: "b_detail_01",
        repoPath: "/tmp/repo",
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
      },
      runtimeSession: null
    });

    expect(detail.metaReview).toStrictEqual({
      actor: "meta-reviewer",
      authorityActive: false,
      consecutiveCleanRuns: 0,
      runtimeDelivery: null
    });
    expect(Object.keys(detail.metaReview).sort()).toStrictEqual([
      "actor",
      "authorityActive",
      "consecutiveCleanRuns",
      "runtimeDelivery"
    ]);
    expect(detail.remoteExecution).toStrictEqual({
      alias: "lab",
      host: "ssh.example.com",
      pointerKind: "started",
      viewKind: "status",
      statusSource: "live",
      cacheStatus: "present",
      runtimeAvailability: "missing",
      reasonCode: "STATUS_REMOTE_RUNTIME_MISSING",
      remoteClonePath: "/srv/pairflow/repo--b_detail_01",
      lastLiveCheckAt: "2026-02-24T12:00:31.000Z",
      lastCacheCheckAt: "2026-02-24T12:00:30.000Z"
    });
    expect(detail.runtime).toStrictEqual({
      expected: false,
      present: false,
      stale: false
    });
    expect(detail.attention).toBeNull();
    expect(detail.inbox.items).toStrictEqual([
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
    ]);
  });

  it("suppresses stale quiet-pane attention in the direct detail presenter path", () => {
    const detail = presentBubbleDetail({
      status: {
        bubbleId: "b_detail_prev_run_quiet_01",
        repoPath: "/tmp/repo",
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
          sinceSampledSeconds: 360,
          lastSampleStatus: "sampled",
          lastSampleError: null,
          sessionName: "pf-b_detail_prev_run_quiet_01",
          targetPane: "pf-b_detail_prev_run_quiet_01:0.1"
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
      },
      inbox: {
        bubbleId: "b_detail_prev_run_quiet_01",
        repoPath: "/tmp/repo",
        state: "RUNNING",
        pending: {
          humanQuestions: 0,
          approvalRequests: 0,
          total: 0
        },
        items: []
      },
      runtimeSession: {
        bubbleId: "b_detail_prev_run_quiet_01",
        repoPath: "/tmp/repo",
        worktreePath: "/tmp/worktree",
        tmuxSessionName: "pf-b_detail_prev_run_quiet_01",
        updatedAt: "2026-02-24T12:06:00.000Z"
      },
      now: new Date("2026-02-24T12:06:00.000Z")
    });

    expect(detail.attention).toBeNull();
  });

  it("preserves non-runtime attention on remote detail views", () => {
    const detail = presentBubbleDetail({
      status: {
        bubbleId: "b_detail_remote_invalid_01",
        repoPath: "/tmp/repo",
        worktreePath: "/tmp/worktree",
        bubbleStartedAt: "2026-02-24T12:00:00.000Z",
        state: "RUNNING",
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
          approvalRequests: 0,
          total: 0
        },
        transcript: {
          totalMessages: 1,
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
          round: 2
        },
        stateValidation: {
          message: "invalid",
          errors: [
            {
              path: "state.round",
              message: "Expected integer"
            }
          ]
        },
        remoteExecution: {
          alias: "lab",
          host: "ssh.example.com",
          pointerKind: "started",
          viewKind: "status",
          statusSource: "live",
          cacheStatus: "present",
          runtimeAvailability: "active"
        }
      },
      inbox: {
        bubbleId: "b_detail_remote_invalid_01",
        repoPath: "/tmp/repo",
        state: "RUNNING",
        pending: {
          humanQuestions: 0,
          approvalRequests: 0,
          total: 0
        },
        items: []
      },
      runtimeSession: null
    });

    expect(detail.attention).toMatchObject({
      code: "state_invalid",
      severity: "critical",
      label: "Invalid state"
    });
  });

  it("suppresses leaked local runtime mismatch attention on remote detail views", () => {
    const detail = presentBubbleDetail({
      status: {
        bubbleId: "b_detail_remote_leaked_runtime_01",
        repoPath: "/tmp/repo",
        worktreePath: "/tmp/worktree",
        bubbleStartedAt: "2026-02-24T12:00:00.000Z",
        state: "RUNNING",
        round: 2,
        activeAgent: "codex",
        activeRole: "implementer",
        activeSince: "2026-02-24T12:00:00.000Z",
        lastCommandAt: "2026-02-24T12:00:30.000Z",
        paneActivity: {
          readStatus: "ok",
          lastChangedAt: "2026-02-24T12:00:25.000Z",
          sampledAt: "2026-02-24T12:00:30.000Z",
          sinceLastChangedSeconds: 5,
          sinceSampledSeconds: 0,
          lastSampleStatus: "sampled",
          lastSampleError: null,
          sessionName: "remote:session",
          targetPane: "remote:session:0.1"
        },
        executionContext: null,
        watchdog: {
          monitored: true,
          monitoredAgent: "codex",
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
          runtimeAvailability: "active"
        }
      },
      inbox: {
        bubbleId: "b_detail_remote_leaked_runtime_01",
        repoPath: "/tmp/repo",
        state: "RUNNING",
        pending: {
          humanQuestions: 0,
          approvalRequests: 0,
          total: 0
        },
        items: []
      },
      runtimeSession: {
        bubbleId: "b_detail_remote_leaked_runtime_01",
        repoPath: "/tmp/repo",
        worktreePath: "/tmp/worktree",
        tmuxSessionName: "pf-b_detail_remote_leaked_runtime_01",
        updatedAt: "2026-02-24T12:00:30.000Z"
      },
      now: new Date("2026-02-24T12:00:30.000Z")
    });

    expect(detail.attention).toBeNull();
    expect(detail.runtime).toStrictEqual({
      expected: false,
      present: false,
      stale: false
    });
  });
});
