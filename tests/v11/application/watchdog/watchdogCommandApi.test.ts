import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  runBubbleWatchdogV11,
  type BubbleWatchdogV11Dependencies
} from "../../../../src/v11/application/watchdog/emitWatchdogV11.js";
import type { RuntimeSessionsRegistry } from "../../../../src/v11/shared/ports/runtimeSessions.js";
import type {
  PaneActivitySampleResult
} from "../../../../src/v11/application/watchdog/watchdogPaneActivitySampler.js";
import {
  getWatchdogPaneActivityPath,
  readWatchdogPaneActivity,
  writeWatchdogPaneActivity
} from "../../../../src/v11/infrastructure/artifact/watchdog/watchdogPaneActivityStore.js";
import {
  getWatchdogTracePath
} from "../../../../src/v11/infrastructure/artifact/watchdog/watchdogTraceStore.js";
import { setupRunningBubbleFixture } from "../../../helpers/bubble.js";
import { initGitRepository } from "../../../helpers/git.js";
import { readStateSnapshot, writeStateSnapshot } from "../../../../src/v11/infrastructure/state/stateStore.js";
import { buildRunningExecutionContext } from "../../../../src/v11/shared/state/executionContext.js";

const tempDirs: string[] = [];

async function createTempRepo(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-watchdog-v11-"));
  tempDirs.push(root);
  await initGitRepository(root);
  return root;
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((path) =>
      rm(path, { recursive: true, force: true })
    )
  );
});

describe("watchdogCommandApi", () => {
  async function readWatchdogTraceEntries(
    runtimeDir: string,
    bubbleId: string
  ): Promise<Record<string, unknown>[]> {
    const raw = await readFile(getWatchdogTracePath(runtimeDir, bubbleId), "utf8");
    return raw
      .trim()
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .map((line) => JSON.parse(line) as Record<string, unknown>);
  }

  function sampledPaneActivity(
    sampledAt: string,
    paneHash: string,
    changed: boolean
  ): Extract<PaneActivitySampleResult, { status: "sampled" }> {
    return {
      status: "sampled",
      sampled_at: sampledAt,
      pane_hash: paneHash,
      changed,
      session_name: "pf-watchdog-v11",
      target_pane: "pf-watchdog-v11:0.1"
    };
  }

  function baseDependencies(input: {
    sampleWatchdogPaneActivity?: () => Promise<PaneActivitySampleResult>;
  } = {}): BubbleWatchdogV11Dependencies {
    return {
      emitTmuxDeliveryNotification: () =>
        Promise.resolve({
          delivered: true,
          message: "ok"
        }),
      emitBubbleNotification: () =>
        Promise.resolve({
          kind: "waiting-human" as const,
          attempted: false,
          delivered: false,
          soundPath: null,
          reason: "disabled" as const
        }),
      readRuntimeSessionsRegistry: () =>
        Promise.resolve({} satisfies RuntimeSessionsRegistry),
      runTmux: () =>
        Promise.resolve({
          stdout: "",
          stderr: "",
          exitCode: 0
        }),
      ...(input.sampleWatchdogPaneActivity !== undefined
        ? {
            sampleWatchdogPaneActivity: input.sampleWatchdogPaneActivity
          }
        : {})
    };
  }

  it("seeds the first pane-activity record before timeout without escalating", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_watchdog_v11_seed_01",
      task: "Watchdog v11 initial pane-activity sample",
      startedAt: "2026-02-22T12:00:00.000Z"
    });

    const result = await runBubbleWatchdogV11(
      {
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        now: new Date("2026-02-22T12:03:00.000Z")
      },
      baseDependencies({
        sampleWatchdogPaneActivity: () =>
          Promise.resolve(
            sampledPaneActivity("2026-02-22T12:03:00.000Z", "pane-hash-01", true)
          )
      })
    );

    expect(result.escalated).toBe(false);
    expect(result.reason).toBe("not_expired");

    const stored = await readWatchdogPaneActivity({
      runtimeDir: bubble.paths.runtimeDir,
      bubbleId: bubble.bubbleId
    });
    expect(stored.status).toBe("ok");
    if (stored.status !== "ok") {
      return;
    }
    expect(stored.record.bubble_id).toBe(bubble.bubbleId);
    expect(stored.record.sampled_at).toBe("2026-02-22T12:03:00.000Z");
    expect(stored.record.pane_hash).toBe("pane-hash-01");
    expect(stored.record.last_changed_at).toBe("2026-02-22T12:03:00.000Z");
    expect(stored.record.last_sample_status).toBe("sampled");

    const traceEntries = await readWatchdogTraceEntries(
      bubble.paths.runtimeDir,
      bubble.bubbleId
    );
    expect(traceEntries).toHaveLength(1);
    expect(traceEntries[0]).toMatchObject({
      ts: "2026-02-22T12:03:00.000Z",
      bubble_id: bubble.bubbleId,
      state: "RUNNING",
      active_role: "implementer",
      watchdog: {
        monitored: true,
        expired: false,
        timeout_minutes: bubble.config.watchdog_timeout_minutes
      },
      pane_activity: {
        read_status: "missing",
        sample_status: "sampled",
        changed: true,
        sampled_at: "2026-02-22T12:03:00.000Z",
        pane_hash: "pane-hash-01",
        target_pane: "pf-watchdog-v11:0.1",
        current_sampled_at: "2026-02-22T12:03:00.000Z",
        current_last_changed_at: "2026-02-22T12:03:00.000Z",
        current_last_sample_status: "sampled"
      },
      result: {
        escalated: false,
        reason: "not_expired",
        state: "RUNNING"
      }
    });
  });

  it("rate-limits pane sampling to once per minute", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_watchdog_v11_rate_01",
      task: "Watchdog v11 pane-activity rate limit",
      startedAt: "2026-02-22T12:00:00.000Z"
    });
    let sampleCalls = 0;

    const sample = async () => {
      sampleCalls += 1;
      return sampledPaneActivity("2026-02-22T12:03:00.000Z", "pane-hash-01", true);
    };

    await runBubbleWatchdogV11(
      {
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        now: new Date("2026-02-22T12:03:00.000Z")
      },
      baseDependencies({
        sampleWatchdogPaneActivity: sample
      })
    );

    await runBubbleWatchdogV11(
      {
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        now: new Date("2026-02-22T12:03:30.000Z")
      },
      baseDependencies({
        sampleWatchdogPaneActivity: async () => {
          sampleCalls += 1;
          return sampledPaneActivity("2026-02-22T12:03:30.000Z", "pane-hash-02", true);
        }
      })
    );

    expect(sampleCalls).toBe(1);
    const stored = await readWatchdogPaneActivity({
      runtimeDir: bubble.paths.runtimeDir,
      bubbleId: bubble.bubbleId
    });
    expect(stored.status).toBe("ok");
    if (stored.status !== "ok") {
      return;
    }
    expect(stored.record.sampled_at).toBe("2026-02-22T12:03:00.000Z");
    expect(stored.record.pane_hash).toBe("pane-hash-01");

    const traceEntries = await readWatchdogTraceEntries(
      bubble.paths.runtimeDir,
      bubble.bubbleId
    );
    expect(traceEntries).toHaveLength(2);
    expect(traceEntries[0]?.pane_activity).toMatchObject({
      sample_status: "sampled",
      sampled_at: "2026-02-22T12:03:00.000Z"
    });
    expect(traceEntries[1]).toMatchObject({
      ts: "2026-02-22T12:03:30.000Z",
      bubble_id: bubble.bubbleId,
      pane_activity: {
        read_status: "ok",
        sample_status: "skipped",
        current_sampled_at: "2026-02-22T12:03:00.000Z",
        current_last_changed_at: "2026-02-22T12:03:00.000Z",
        current_last_sample_status: "sampled"
      },
      result: {
        escalated: false,
        reason: "not_expired",
        state: "RUNNING"
      }
    });
  });

  it("re-samples immediately when the active role switches to a different pane target", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_watchdog_v11_role_switch_01",
      task: "Watchdog v11 immediate pane resample on role switch",
      startedAt: "2026-02-22T12:00:00.000Z"
    });
    const loaded = await readStateSnapshot(bubble.paths.statePath);
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        active_agent: bubble.config.agents.reviewer,
        active_role: "reviewer",
        active_since: "2026-02-22T12:03:20.000Z",
        last_command_at: "2026-02-22T12:03:20.000Z",
        execution_context: buildRunningExecutionContext({
          bubbleId: bubble.bubbleId,
          round: 1,
          activeRole: "reviewer",
          startedAt: "2026-02-22T12:03:20.000Z",
          watchdogTimeoutMinutes: bubble.config.watchdog_timeout_minutes
        })
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );
    await writeWatchdogPaneActivity({
      runtimeDir: bubble.paths.runtimeDir,
      bubbleId: bubble.bubbleId,
      record: {
        bubble_id: bubble.bubbleId,
        sampled_at: "2026-02-22T12:03:00.000Z",
        pane_hash: "pane-hash-implementer",
        last_changed_at: "2026-02-22T12:03:00.000Z",
        session_name: "pf-watchdog-v11",
        target_pane: "pf-watchdog-v11:0.1",
        last_sample_status: "sampled"
      }
    });
    let sampleCalls = 0;

    await runBubbleWatchdogV11(
      {
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        now: new Date("2026-02-22T12:03:30.000Z")
      },
      baseDependencies({
        sampleWatchdogPaneActivity: async () => {
          sampleCalls += 1;
          return {
            status: "sampled",
            sampled_at: "2026-02-22T12:03:30.000Z",
            pane_hash: "pane-hash-reviewer",
            changed: true,
            session_name: "pf-watchdog-v11",
            target_pane: "pf-watchdog-v11:0.2"
          };
        }
      })
    );

    expect(sampleCalls).toBe(1);
    const stored = await readWatchdogPaneActivity({
      runtimeDir: bubble.paths.runtimeDir,
      bubbleId: bubble.bubbleId
    });
    expect(stored.status).toBe("ok");
    if (stored.status !== "ok") {
      return;
    }
    expect(stored.record.target_pane).toBe("pf-watchdog-v11:0.2");
    expect(stored.record.sampled_at).toBe("2026-02-22T12:03:30.000Z");
    expect(stored.record.last_changed_at).toBe("2026-02-22T12:03:30.000Z");
  });

  it("keeps RUNNING bubble active after timeout when pane changed recently", async () => {
    const repoPath = await createTempRepo();
    const startedAt = "2026-02-22T12:00:00.000Z";
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_watchdog_v11_recent_01",
      task: "Watchdog v11 recent pane activity no-op",
      startedAt
    });

    await writeWatchdogPaneActivity({
      runtimeDir: bubble.paths.runtimeDir,
      bubbleId: bubble.bubbleId,
      record: {
        bubble_id: bubble.bubbleId,
        sampled_at: "2026-02-22T12:30:00.000Z",
        pane_hash: "pane-hash-stable",
        last_changed_at: "2026-02-22T12:25:00.000Z",
        session_name: "pf-watchdog-v11",
        target_pane: "pf-watchdog-v11:0.1",
        last_sample_status: "sampled"
      }
    });

    const result = await runBubbleWatchdogV11(
      {
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        now: new Date(
          Date.parse(startedAt) + (bubble.config.watchdog_timeout_minutes + 1) * 60_000
        )
      },
      baseDependencies({
        sampleWatchdogPaneActivity: () =>
          Promise.resolve(
            sampledPaneActivity("2026-02-22T12:31:00.000Z", "pane-hash-stable", false)
          )
      })
    );

    expect(result.escalated).toBe(false);
    expect(result.reason).toBe("not_expired");
    expect(result.state.state).toBe("RUNNING");

    const stored = await readWatchdogPaneActivity({
      runtimeDir: bubble.paths.runtimeDir,
      bubbleId: bubble.bubbleId
    });
    expect(stored.status).toBe("ok");
    if (stored.status !== "ok") {
      return;
    }
    expect(stored.record.sampled_at).toBe("2026-02-22T12:31:00.000Z");
    expect(stored.record.last_changed_at).toBe("2026-02-22T12:25:00.000Z");
  });

  it("resets the quiet window when the raw pane hash changes", async () => {
    const repoPath = await createTempRepo();
    const startedAt = "2026-02-22T12:00:00.000Z";
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_watchdog_v11_diff_01",
      task: "Watchdog v11 raw pane diff resets quiet window",
      startedAt
    });

    await writeWatchdogPaneActivity({
      runtimeDir: bubble.paths.runtimeDir,
      bubbleId: bubble.bubbleId,
      record: {
        bubble_id: bubble.bubbleId,
        sampled_at: "2026-02-22T12:30:00.000Z",
        pane_hash: "pane-hash-old",
        last_changed_at: "2026-02-22T12:20:00.000Z",
        session_name: "pf-watchdog-v11",
        target_pane: "pf-watchdog-v11:0.1",
        last_sample_status: "sampled"
      }
    });

    const result = await runBubbleWatchdogV11(
      {
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        now: new Date(
          Date.parse(startedAt) + (bubble.config.watchdog_timeout_minutes + 1) * 60_000
        )
      },
      baseDependencies({
        sampleWatchdogPaneActivity: () =>
          Promise.resolve(
            sampledPaneActivity("2026-02-22T12:31:00.000Z", "pane-hash-new", true)
          )
      })
    );

    expect(result.escalated).toBe(false);
    expect(result.reason).toBe("not_expired");

    const stored = await readWatchdogPaneActivity({
      runtimeDir: bubble.paths.runtimeDir,
      bubbleId: bubble.bubbleId
    });
    expect(stored.status).toBe("ok");
    if (stored.status !== "ok") {
      return;
    }
    expect(stored.record.pane_hash).toBe("pane-hash-new");
    expect(stored.record.last_changed_at).toBe("2026-02-22T12:31:00.000Z");
  });

  it("escalates expired RUNNING watchdog after the quiet window is reached", async () => {
    const repoPath = await createTempRepo();
    const startedAt = "2026-02-22T12:00:00.000Z";
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_watchdog_v11_quiet_01",
      task: "Watchdog v11 quiet-window escalation",
      startedAt
    });

    await writeWatchdogPaneActivity({
      runtimeDir: bubble.paths.runtimeDir,
      bubbleId: bubble.bubbleId,
      record: {
        bubble_id: bubble.bubbleId,
        sampled_at: "2026-02-22T12:30:00.000Z",
        pane_hash: "pane-hash-stable",
        last_changed_at: "2026-02-22T12:20:00.000Z",
        session_name: "pf-watchdog-v11",
        target_pane: "pf-watchdog-v11:0.1",
        last_sample_status: "sampled"
      }
    });

    const result = await runBubbleWatchdogV11(
      {
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        now: new Date(
          Date.parse(startedAt) + (bubble.config.watchdog_timeout_minutes + 1) * 60_000
        )
      },
      baseDependencies({
        sampleWatchdogPaneActivity: () =>
          Promise.resolve(
            sampledPaneActivity("2026-02-22T12:31:00.000Z", "pane-hash-stable", false)
          )
      })
    );

    expect(result.escalated).toBe(true);
    expect(result.reason).toBe("escalated");
    expect(result.envelope?.type).toBe("HUMAN_QUESTION");
    expect(result.state.state).toBe("WAITING_HUMAN");
  });

  it("escalates after timeout when the runtime session is missing", async () => {
    const repoPath = await createTempRepo();
    const startedAt = "2026-02-22T12:00:00.000Z";
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_watchdog_v11_missing_session_01",
      task: "Watchdog v11 missing session escalation",
      startedAt
    });

    const result = await runBubbleWatchdogV11(
      {
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        now: new Date(
          Date.parse(startedAt) + (bubble.config.watchdog_timeout_minutes + 1) * 60_000
        )
      },
      baseDependencies({
        sampleWatchdogPaneActivity: () =>
          Promise.resolve({
            status: "no_session",
            sampled_at: "2026-02-22T12:31:00.000Z",
            error: "runtime session missing"
          })
      })
    );

    expect(result.escalated).toBe(true);
    expect(result.reason).toBe("escalated");
    expect(result.state.state).toBe("WAITING_HUMAN");
  });

  it("re-escalates on expired rate-limited cycle when the stored last sample already shows no_session", async () => {
    const repoPath = await createTempRepo();
    const startedAt = "2026-02-22T12:00:00.000Z";
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_watchdog_v11_missing_session_rate_01",
      task: "Watchdog v11 rate-limited hard signal escalation",
      startedAt
    });
    await writeWatchdogPaneActivity({
      runtimeDir: bubble.paths.runtimeDir,
      bubbleId: bubble.bubbleId,
      record: {
        bubble_id: bubble.bubbleId,
        sampled_at: "2026-02-22T12:30:30.000Z",
        pane_hash: "pane-hash-stale",
        last_changed_at: "2026-02-22T12:20:00.000Z",
        last_sample_status: "no_session",
        last_sample_error: "runtime session missing"
      }
    });
    let sampleCalls = 0;

    const result = await runBubbleWatchdogV11(
      {
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        now: new Date("2026-02-22T12:31:00.000Z")
      },
      baseDependencies({
        sampleWatchdogPaneActivity: () => {
          sampleCalls += 1;
          return Promise.resolve(
            sampledPaneActivity("2026-02-22T12:31:00.000Z", "pane-hash-recovered", true)
          );
        }
      })
    );

    expect(sampleCalls).toBe(0);
    expect(result.escalated).toBe(true);
    expect(result.reason).toBe("escalated");
    expect(result.state.state).toBe("WAITING_HUMAN");
  });

  it("escalates after timeout when the target pane is unreadable", async () => {
    const repoPath = await createTempRepo();
    const startedAt = "2026-02-22T12:00:00.000Z";
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_watchdog_v11_unreadable_01",
      task: "Watchdog v11 unreadable pane escalation",
      startedAt
    });

    const result = await runBubbleWatchdogV11(
      {
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        now: new Date(
          Date.parse(startedAt) + (bubble.config.watchdog_timeout_minutes + 1) * 60_000
        )
      },
      baseDependencies({
        sampleWatchdogPaneActivity: () =>
          Promise.resolve({
            status: "pane_unreadable",
            sampled_at: "2026-02-22T12:31:00.000Z",
            error: "capture failed",
            session_name: "pf-watchdog-v11",
            target_pane: "pf-watchdog-v11:0.1"
          })
      })
    );

    expect(result.escalated).toBe(true);
    expect(result.reason).toBe("escalated");
    expect(result.state.state).toBe("WAITING_HUMAN");
  });

  it("seeds a fresh record on the first expired run without escalating", async () => {
    const repoPath = await createTempRepo();
    const startedAt = "2026-02-22T12:00:00.000Z";
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_watchdog_v11_expired_seed_01",
      task: "Watchdog v11 first expired run seeds activity",
      startedAt
    });

    const result = await runBubbleWatchdogV11(
      {
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        now: new Date(
          Date.parse(startedAt) + (bubble.config.watchdog_timeout_minutes + 1) * 60_000
        )
      },
      baseDependencies({
        sampleWatchdogPaneActivity: () =>
          Promise.resolve(
            sampledPaneActivity("2026-02-22T12:31:00.000Z", "pane-hash-expired", true)
          )
      })
    );

    expect(result.escalated).toBe(false);
    expect(result.reason).toBe("not_expired");
    expect(result.state.state).toBe("RUNNING");
  });

  it("rebuilds a corrupt pane-activity record on expired run without escalating", async () => {
    const repoPath = await createTempRepo();
    const startedAt = "2026-02-22T12:00:00.000Z";
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_watchdog_v11_corrupt_01",
      task: "Watchdog v11 corrupt pane-activity rebuild",
      startedAt
    });

    const corruptPath = getWatchdogPaneActivityPath(
      bubble.paths.runtimeDir,
      bubble.bubbleId
    );
    await mkdir(dirname(corruptPath), { recursive: true });
    await writeFile(corruptPath, "{ invalid-json\n", "utf8");

    const result = await runBubbleWatchdogV11(
      {
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        now: new Date(
          Date.parse(startedAt) + (bubble.config.watchdog_timeout_minutes + 1) * 60_000
        )
      },
      baseDependencies({
        sampleWatchdogPaneActivity: () =>
          Promise.resolve(
            sampledPaneActivity("2026-02-22T12:31:00.000Z", "pane-hash-rebuilt", true)
          )
      })
    );

    expect(result.escalated).toBe(false);
    expect(result.reason).toBe("not_expired");

    const raw = await readFile(corruptPath, "utf8");
    expect(raw).toContain("\"pane_hash\": \"pane-hash-rebuilt\"");
  });
});
