import { describe, expect, it } from "vitest";

import {
  presentBubbleDetail,
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
      runtimeDelivery: null
    });
    expect(Object.keys(presented.metaReview).sort()).toStrictEqual([
      "actor",
      "authorityActive",
      "runtimeDelivery"
    ]);
  });

  it("drops status-only route diagnostics from detail presenter output", () => {
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
          latestRoute: "human_gate_approve",
          latestRouteReasonCode: null,
          latestRouteObservedAt: "2026-02-24T12:00:30.000Z",
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
        bubbleId: "b_detail_01",
        repoPath: "/tmp/repo",
        state: "READY_FOR_HUMAN_APPROVAL",
        pending: {
          humanQuestions: 0,
          approvalRequests: 1,
          total: 1
        },
        items: []
      },
      runtimeSession: null
    });

    expect(detail.metaReview).toStrictEqual({
      actor: "meta-reviewer",
      authorityActive: false,
      runtimeDelivery: null
    });
    expect(Object.keys(detail.metaReview).sort()).toStrictEqual([
      "actor",
      "authorityActive",
      "runtimeDelivery"
    ]);
  });
});
