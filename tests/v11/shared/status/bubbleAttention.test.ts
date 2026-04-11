import { describe, expect, it } from "vitest";

import {
  isRuntimeSessionExpectedState,
  resolveBubbleAttention
} from "../../../../src/v11/shared/status/bubbleAttention.js";

describe("v11 status bubbleAttention", () => {
  it("marks runtime-managed states as session-expected", () => {
    expect(isRuntimeSessionExpectedState("RUNNING")).toBe(true);
    expect(isRuntimeSessionExpectedState("WAITING_HUMAN")).toBe(true);
    expect(isRuntimeSessionExpectedState("CREATED")).toBe(false);
  });

  it("surfaces runtime-missing attention when a runtime state has no session", () => {
    const attention = resolveBubbleAttention({
      state: "RUNNING",
      runtimeSession: null,
      stateValidation: null,
      watchdog: {
        monitored: true,
        expired: false,
        referenceTimestamp: "2026-02-22T18:40:00.000Z"
      },
      paneActivityRead: {
        status: "missing"
      },
      now: new Date("2026-02-22T18:45:00.000Z")
    });

    expect(attention).toMatchObject({
      code: "runtime_missing",
      severity: "critical",
      label: "No session"
    });
  });

  it("suppresses runtime-mismatch attention during PREPARING_WORKSPACE", () => {
    const attention = resolveBubbleAttention({
      state: "PREPARING_WORKSPACE",
      runtimeSession: {
        bubbleId: "b_status_attention_01",
        repoPath: "/repo",
        worktreePath: "/repo/.pairflow-worktree",
        tmuxSessionName: "pf-b_status_attention_01",
        updatedAt: "2026-02-22T18:45:01.000Z"
      },
      stateValidation: null,
      watchdog: {
        monitored: false,
        expired: false,
        referenceTimestamp: "2026-02-22T18:45:00.000Z"
      },
      paneActivityRead: {
        status: "missing"
      },
      now: new Date("2026-02-22T18:45:02.000Z")
    });

    expect(attention).toBeNull();
  });

  it("surfaces startup-incomplete attention only after five minutes in PREPARING_WORKSPACE", () => {
    const freshAttention = resolveBubbleAttention({
      state: "PREPARING_WORKSPACE",
      runtimeSession: null,
      stateValidation: null,
      watchdog: {
        monitored: false,
        expired: false,
        referenceTimestamp: "2026-02-22T18:41:00.000Z"
      },
      paneActivityRead: {
        status: "missing"
      },
      now: new Date("2026-02-22T18:45:00.000Z")
    });

    const staleAttention = resolveBubbleAttention({
      state: "PREPARING_WORKSPACE",
      runtimeSession: null,
      stateValidation: null,
      watchdog: {
        monitored: false,
        expired: false,
        referenceTimestamp: "2026-02-22T18:39:30.000Z"
      },
      paneActivityRead: {
        status: "missing"
      },
      now: new Date("2026-02-22T18:45:00.000Z")
    });

    expect(freshAttention).toBeNull();
    expect(staleAttention).toMatchObject({
      code: "startup_incomplete",
      severity: "warning",
      label: "Startup incomplete",
      detail: "This bubble is not resumable. Delete it and create a new bubble."
    });
  });

  it("does not surface startup-incomplete attention when PREPARING_WORKSPACE lacks a reference timestamp", () => {
    const attention = resolveBubbleAttention({
      state: "PREPARING_WORKSPACE",
      runtimeSession: null,
      stateValidation: null,
      watchdog: {
        monitored: false,
        expired: false,
        referenceTimestamp: null
      },
      paneActivityRead: {
        status: "missing"
      },
      now: new Date("2026-02-22T18:45:00.000Z")
    });

    expect(attention).toBeNull();
  });

  it("surfaces quiet-pane attention after three quiet minutes", () => {
    const attention = resolveBubbleAttention({
      state: "RUNNING",
      runtimeSession: {
        bubbleId: "b_status_attention_02",
        repoPath: "/repo",
        worktreePath: "/repo/.pairflow-worktree",
        tmuxSessionName: "pf-b_status_attention_02",
        updatedAt: "2026-02-22T18:30:00.000Z"
      },
      stateValidation: null,
      watchdog: {
        monitored: true,
        expired: false,
        referenceTimestamp: "2026-02-22T18:22:00.000Z"
      },
      paneActivityRead: {
        status: "ok",
        record: {
          bubble_id: "b_status_attention_02",
          sampled_at: "2026-02-22T18:22:50.000Z",
          pane_hash: "hash-quiet",
          last_changed_at: "2026-02-22T18:20:00.000Z",
          session_name: "pf-b_status_attention_02",
          target_pane: "pf-b_status_attention_02:0.1",
          last_sample_status: "sampled"
        }
      },
      now: new Date("2026-02-22T18:23:00.000Z")
    });

    expect(attention).toMatchObject({
      code: "quiet_pane",
      severity: "warning",
      label: "Quiet 3m"
    });
  });
});
