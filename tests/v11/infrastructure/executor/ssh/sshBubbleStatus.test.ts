import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

import { describe, expect, it } from "vitest";

import {
  executeRemoteBubbleStatus,
  remoteStatusCommandAbortKillGraceMsDefault,
  runCommandDefault,
  resolveRemoteBubbleStatusTarget
} from "../../../../../src/v11/infrastructure/executor/ssh/sshBubbleStatus.js";
import {
  normalizeRemoteBubbleStatusSnapshot
} from "../../../../../src/v11/infrastructure/executor/ssh/sshBubbleStatusPayload.js";
import type { RemoteBubbleStatusError } from "../../../../../src/v11/infrastructure/executor/ssh/sshBubbleStatus.js";

function remoteStatusPayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    bubbleStartedAt: "2026-04-16T09:45:00.000Z",
    state: "RUNNING",
    round: 2,
    activeAgent: "codex",
    activeRole: "implementer",
    activeSince: "2026-04-16T09:46:00.000Z",
    lastCommandAt: "2026-04-16T09:58:00.000Z",
    paneActivity: {
      readStatus: "ok",
      lastChangedAt: "2026-04-16T09:57:00.000Z",
      sampledAt: "2026-04-16T09:59:30.000Z",
      sinceLastChangedSeconds: 180,
      sinceSampledSeconds: 30,
      lastSampleStatus: "sampled",
      lastSampleError: null,
      sessionName: "pf-b_remote_status_payload_01",
      targetPane: "pf-b_remote_status_payload_01:0.1"
    },
    executionContext: null,
    watchdog: {
      monitored: false,
      monitoredAgent: "codex",
      timeoutMinutes: 30,
      referenceTimestamp: "2026-04-16T09:58:00.000Z",
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
      totalMessages: 5,
      lastMessageType: "PASS",
      lastMessageTs: "2026-04-16T09:58:00.000Z",
      lastMessageId: "msg_remote_status_payload_01"
    },
    metaReview: {
      actor: "meta-reviewer",
      authorityActive: false,
      consecutiveCleanRuns: 1,
      runtimeDelivery: null
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
    ...overrides
  };
}

describe("sshBubbleStatus", () => {
  it("resolves the remote target from global config and validates host consistency", async () => {
    const target = await resolveRemoteBubbleStatusTarget(
      {
        bubbleId: "b_remote_status_01",
        remoteAlias: "prod",
        expectedHost: "ssh.example.com"
      },
      {
        loadPairflowGlobalConfig: async () => ({
          remotes: {
            prod: {
              host: "ssh.example.com",
              repo_base: "/srv/pairflow",
              user: "pairflow",
              pairflow_command: "pairflow"
            }
          }
        })
      }
    );

    expect(target).toEqual({
      alias: "prod",
      host: "ssh.example.com",
      user: "pairflow",
      pairflowCommand: "pairflow"
    });
  });

  it("rejects pointer host mismatches against the configured ssh executor alias", async () => {
    await expect(() =>
      resolveRemoteBubbleStatusTarget(
        {
          bubbleId: "b_remote_status_target_mismatch",
          remoteAlias: "prod",
          expectedHost: "pointer.example.com"
        },
        {
          loadPairflowGlobalConfig: async () => ({
            remotes: {
              prod: {
                host: "ssh.example.com",
                repo_base: "/srv/pairflow",
                user: "pairflow",
                pairflow_command: "pairflow"
              }
            }
          })
        }
      )
    ).rejects.toMatchObject({
      code: "REMOTE_STATUS_CONFIG_INVALID",
      message:
        "Remote status for b_remote_status_target_mismatch refused host mismatch: pointer host (pointer.example.com) does not match configured execution host (ssh.example.com)."
    } satisfies Partial<RemoteBubbleStatusError>);
  });

  it("normalizes the remote status payload and infers runtime loss", async () => {
    const status = await executeRemoteBubbleStatus(
      {
        bubbleId: "b_remote_status_02",
        remoteClonePath: "/srv/pairflow/repo--b_remote_status_02",
        remoteTarget: {
          alias: "prod",
          host: "ssh.example.com",
          user: "pairflow",
          pairflowCommand: "pairflow"
        }
      },
      {
        now: () => new Date("2026-04-16T10:00:00.000Z"),
        runCommand: async () => ({
          stdout: JSON.stringify({
            bubbleStartedAt: "2026-04-16T09:45:00.000Z",
            state: "RUNNING",
            round: 2,
            activeAgent: "codex",
            activeRole: "implementer",
            activeSince: "2026-04-16T09:46:00.000Z",
            lastCommandAt: "2026-04-16T09:58:00.000Z",
            paneActivity: {
              readStatus: "ok",
              lastChangedAt: "2026-04-16T09:57:00.000Z",
              sampledAt: "2026-04-16T09:59:30.000Z",
              sinceLastChangedSeconds: 180,
              sinceSampledSeconds: 30,
              lastSampleStatus: "no_session",
              lastSampleError: null,
              sessionName: null,
              targetPane: null
            },
            executionContext: {
              activeRole: "implementer",
              awaitedOutputType: "pass_result",
              handoffId: "implementer:b_remote_status_02:round:2:attempt:1",
              executionId: "exec_remote_status_02",
              round: 2,
              startedAt: "2026-04-16T09:46:00.000Z",
              deadlineAt: "2026-04-16T10:16:00.000Z",
              attempt: 1
            },
            watchdog: {
              monitored: false,
              monitoredAgent: "codex",
              timeoutMinutes: 30,
              referenceTimestamp: "2026-04-16T09:58:00.000Z",
              deadlineTimestamp: null,
              remainingSeconds: null,
              expired: false
            },
            pendingInboxItems: {
              humanQuestions: 1,
              approvalRequests: 0,
              total: 1
            },
            transcript: {
              totalMessages: 5,
              lastMessageType: "PASS",
              lastMessageTs: "2026-04-16T09:58:00.000Z",
              lastMessageId: "msg_remote_status_02"
            },
            metaReview: {
              actor: "meta-reviewer",
              authorityActive: false,
              runtimeDelivery: null
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
          }),
          stderr: "",
          exitCode: 0
        })
      }
    );

    expect(status.state).toBe("RUNNING");
    expect(status.round).toBe(2);
    expect(status.runtimeAvailability).toBe("missing");
    expect(status.lastCheckedAt).toBe("2026-04-16T10:00:00.000Z");
  });

  it("validates additive remote meta-review clean-run streak payloads", () => {
    const status = normalizeRemoteBubbleStatusSnapshot({
      payload: remoteStatusPayload({
        metaReview: {
          actor: "meta-reviewer",
          authorityActive: false,
          consecutiveCleanRuns: 2,
          runtimeDelivery: null
        }
      }),
      lastCheckedAt: "2026-04-16T10:00:00.000Z"
    });

    expect(status.metaReview.consecutiveCleanRuns).toBe(2);
  });

  it.each([
    ["string", "2"],
    ["null", null],
    ["negative", -1],
    ["fractional", 1.5]
  ] as const)(
    "rejects malformed remote meta-review clean-run streak payloads (%s)",
    (_caseName, consecutiveCleanRuns) => {
    expect(() =>
      normalizeRemoteBubbleStatusSnapshot({
        payload: remoteStatusPayload({
          metaReview: {
            actor: "meta-reviewer",
            authorityActive: false,
            consecutiveCleanRuns,
            runtimeDelivery: null
          }
        }),
        lastCheckedAt: "2026-04-16T10:00:00.000Z"
      })
    ).toThrow(
      "Remote bubble status payload has invalid metaReview.consecutiveCleanRuns; expected integer >= 0."
    );
    }
  );

  it("keeps watchdog-expired runtime snapshots active when pane sampling still looks readable", async () => {
    const status = await executeRemoteBubbleStatus(
      {
        bubbleId: "b_remote_status_watchdog_expired_01",
        remoteClonePath: "/srv/pairflow/repo--b_remote_status_watchdog_expired_01",
        remoteTarget: {
          alias: "prod",
          host: "ssh.example.com",
          user: "pairflow",
          pairflowCommand: "pairflow"
        }
      },
      {
        now: () => new Date("2026-04-16T10:10:00.000Z"),
        runCommand: async () => ({
          stdout: JSON.stringify({
            bubbleStartedAt: "2026-04-16T09:45:00.000Z",
            state: "RUNNING",
            round: 2,
            activeAgent: "codex",
            activeRole: "implementer",
            activeSince: "2026-04-16T09:46:00.000Z",
            lastCommandAt: "2026-04-16T09:58:00.000Z",
            paneActivity: {
              readStatus: "ok",
              lastChangedAt: "2026-04-16T09:57:00.000Z",
              sampledAt: "2026-04-16T10:09:30.000Z",
              sinceLastChangedSeconds: 750,
              sinceSampledSeconds: 30,
              lastSampleStatus: "sampled",
              lastSampleError: null,
              sessionName: "pf-b_remote_status_watchdog_expired_01",
              targetPane: "pf-b_remote_status_watchdog_expired_01:0.1"
            },
            executionContext: {
              activeRole: "implementer",
              awaitedOutputType: "pass_result",
              handoffId:
                "implementer:b_remote_status_watchdog_expired_01:round:2:attempt:1",
              executionId: "exec_remote_status_watchdog_expired_01",
              round: 2,
              startedAt: "2026-04-16T09:46:00.000Z",
              deadlineAt: "2026-04-16T10:16:00.000Z",
              attempt: 1
            },
            watchdog: {
              monitored: true,
              monitoredAgent: "codex",
              timeoutMinutes: 30,
              referenceTimestamp: "2026-04-16T09:58:00.000Z",
              deadlineTimestamp: "2026-04-16T10:28:00.000Z",
              remainingSeconds: 0,
              expired: true
            },
            pendingInboxItems: {
              humanQuestions: 0,
              approvalRequests: 0,
              total: 0
            },
            transcript: {
              totalMessages: 5,
              lastMessageType: "PASS",
              lastMessageTs: "2026-04-16T09:58:00.000Z",
              lastMessageId: "msg_remote_status_watchdog_expired_01"
            },
            metaReview: {
              actor: "meta-reviewer",
              authorityActive: false,
              runtimeDelivery: null
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
          }),
          stderr: "",
          exitCode: 0
        })
      }
    );

    expect(status.runtimeAvailability).toBe("active");
    expect(status.watchdog).toMatchObject({
      monitored: true,
      monitoredAgent: "codex",
      expired: true
    });
  });

  it("keeps monitored recovery snapshots active when watchdog agent identity is null but live pane proof is intact", async () => {
    const status = await executeRemoteBubbleStatus(
      {
        bubbleId: "b_remote_status_meta_review_recovery_01",
        remoteClonePath:
          "/srv/pairflow/repo--b_remote_status_meta_review_recovery_01",
        remoteTarget: {
          alias: "prod",
          host: "ssh.example.com",
          user: "pairflow",
          pairflowCommand: "pairflow"
        }
      },
      {
        now: () => new Date("2026-04-16T10:10:00.000Z"),
        runCommand: async () => ({
          stdout: JSON.stringify({
            bubbleStartedAt: "2026-04-16T09:45:00.000Z",
            state: "RUNNING",
            round: 3,
            activeAgent: null,
            activeRole: null,
            activeSince: null,
            lastCommandAt: "2026-04-16T09:58:00.000Z",
            paneActivity: {
              readStatus: "ok",
              lastChangedAt: "2026-04-16T09:57:00.000Z",
              sampledAt: "2026-04-16T10:09:30.000Z",
              sinceLastChangedSeconds: 750,
              sinceSampledSeconds: 30,
              lastSampleStatus: "sampled",
              lastSampleError: null,
              sessionName: "pf-b_remote_status_meta_review_recovery_01",
              targetPane:
                "pf-b_remote_status_meta_review_recovery_01:0.1"
            },
            executionContext: null,
            watchdog: {
              monitored: true,
              monitoredAgent: null,
              timeoutMinutes: 30,
              referenceTimestamp: "2026-04-16T09:58:00.000Z",
              deadlineTimestamp: "2026-04-16T10:28:00.000Z",
              remainingSeconds: 1080,
              expired: false
            },
            pendingInboxItems: {
              humanQuestions: 0,
              approvalRequests: 0,
              total: 0
            },
            transcript: {
              totalMessages: 5,
              lastMessageType: "PASS",
              lastMessageTs: "2026-04-16T09:58:00.000Z",
              lastMessageId: "msg_remote_status_meta_review_recovery_01"
            },
            metaReview: {
              actor: "meta-reviewer",
              authorityActive: false,
              runtimeDelivery: null
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
              round: 3
            },
            stateValidation: null
          }),
          stderr: "",
          exitCode: 0
        })
      }
    );

    expect(status.runtimeAvailability).toBe("active");
    expect(status.watchdog).toMatchObject({
      monitored: true,
      monitoredAgent: null,
      expired: false
    });
  });

  it("uses a non-login shell for the remote status command to avoid shell-init stdout pollution", async () => {
    const calls: Array<{
      command: string;
      args: string[];
    }> = [];

    await executeRemoteBubbleStatus(
      {
        bubbleId: "b_remote_status_shell_01",
        remoteClonePath: "/srv/pairflow/repo--b_remote_status_shell_01",
        remoteTarget: {
          alias: "prod",
          host: "ssh.example.com",
          user: "pairflow",
          pairflowCommand: "pairflow"
        }
      },
      {
        now: () => new Date("2026-04-16T10:00:00.000Z"),
        runCommand: async (command, args) => {
          calls.push({ command, args });
          return {
            stdout: JSON.stringify({
              bubbleStartedAt: "2026-04-16T09:45:00.000Z",
              state: "RUNNING",
              round: 2,
              activeAgent: "codex",
              activeRole: "implementer",
              activeSince: "2026-04-16T09:46:00.000Z",
              lastCommandAt: "2026-04-16T09:58:00.000Z",
              paneActivity: {
                readStatus: "ok",
                lastChangedAt: "2026-04-16T09:57:00.000Z",
                sampledAt: "2026-04-16T09:59:30.000Z",
                sinceLastChangedSeconds: 180,
                sinceSampledSeconds: 30,
                lastSampleStatus: "sampled",
                lastSampleError: null,
                sessionName: "pf-b_remote_status_shell_01",
                targetPane: "pf-b_remote_status_shell_01:0.1"
              },
              executionContext: null,
              watchdog: {
                monitored: true,
                monitoredAgent: "codex",
                timeoutMinutes: 30,
                referenceTimestamp: "2026-04-16T09:58:00.000Z",
                deadlineTimestamp: "2026-04-16T10:28:00.000Z",
                remainingSeconds: 1380,
                expired: false
              },
              pendingInboxItems: {
                humanQuestions: 0,
                approvalRequests: 0,
                total: 0
              },
              transcript: {
                totalMessages: 5,
                lastMessageType: "PASS",
                lastMessageTs: "2026-04-16T09:58:00.000Z",
                lastMessageId: "msg_remote_status_shell_01"
              },
              metaReview: {
                actor: "meta-reviewer",
                authorityActive: false,
                runtimeDelivery: null
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
            }),
            stderr: "",
            exitCode: 0
          };
        }
      }
    );

    expect(calls).toHaveLength(1);
    expect(calls[0]?.command).toBe("ssh");
    expect(calls[0]?.args).toContain("bash");
    expect(calls[0]?.args).toContain("-c");
    expect(calls[0]?.args).not.toContain("-lc");
  });

  it("fails closed when ssh transport exits non-zero", async () => {
    await expect(() =>
      executeRemoteBubbleStatus(
        {
          bubbleId: "b_remote_status_03",
          remoteClonePath: "/srv/pairflow/repo--b_remote_status_03",
          remoteTarget: {
            alias: "prod",
            host: "ssh.example.com",
            pairflowCommand: "pairflow"
          }
        },
        {
          runCommand: async () => ({
            stdout: "",
            stderr: "ssh: connect to host ssh.example.com port 22: Operation timed out",
            exitCode: 255
          })
        }
      )
    ).rejects.toMatchObject({
      code: "REMOTE_STATUS_TRANSPORT_FAILED",
      message:
        "Remote status transport failed for b_remote_status_03 on prod: ssh: connect to host ssh.example.com port 22: Operation timed out"
    } satisfies Partial<RemoteBubbleStatusError>);
  });

  it("fails closed when the remote ssh command exceeds the local timeout", async () => {
    await expect(() =>
      executeRemoteBubbleStatus(
        {
          bubbleId: "b_remote_status_timeout_01",
          remoteClonePath: "/srv/pairflow/repo--b_remote_status_timeout_01",
          remoteTarget: {
            alias: "prod",
            host: "ssh.example.com",
            pairflowCommand: "pairflow"
          }
        },
        {
          commandTimeoutMs: 5,
          runCommand: async (_command, _args, options) =>
            new Promise((_resolve, reject) => {
              options?.signal?.addEventListener("abort", () => {
                reject(new Error("aborted by local timeout"));
              });
            })
        }
      )
    ).rejects.toMatchObject({
      code: "REMOTE_STATUS_TRANSPORT_FAILED",
      message:
        "Remote status transport timed out for b_remote_status_timeout_01 on prod after 5ms."
    } satisfies Partial<RemoteBubbleStatusError>);
  });

  it("force-kills an ignored transport after abort grace elapses", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "pairflow-ssh-timeout-"));
    const pidFilePath = join(tempDir, "child.pid");
    const abortController = new AbortController();
    const command = runCommandDefault(
      process.execPath,
      [
        "-e",
        [
          "const { writeFileSync } = require('node:fs');",
          "writeFileSync(process.argv[1], String(process.pid));",
          "process.on('SIGTERM', () => {});",
          "setInterval(() => {}, 1000);"
        ].join(" "),
        pidFilePath
      ],
      {
        signal: abortController.signal
      }
    );

    let pidText: string | null = null;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      try {
        pidText = await readFile(pidFilePath, "utf8");
        break;
      } catch (error) {
        const code =
          error instanceof Error && "code" in error
            ? String(error.code)
            : null;
        if (code !== "ENOENT") {
          throw error;
        }
        await delay(25);
      }
    }

    expect(pidText).not.toBeNull();
    abortController.abort();

    await expect(command).rejects.toMatchObject({
      name: "AbortError"
    });

    const pid = Number(pidText?.trim());
    expect(Number.isInteger(pid)).toBe(true);

    await delay(remoteStatusCommandAbortKillGraceMsDefault + 150);

    let alive = true;
    try {
      process.kill(pid, 0);
    } catch (error) {
      const code =
        error instanceof Error && "code" in error
          ? String(error.code)
          : null;
      if (code === "ESRCH") {
        alive = false;
      } else {
        throw error;
      }
    }

    expect(alive).toBe(false);
  });

  it("fails closed when the remote payload shape is invalid", async () => {
    await expect(() =>
      executeRemoteBubbleStatus(
        {
          bubbleId: "b_remote_status_04",
          remoteClonePath: "/srv/pairflow/repo--b_remote_status_04",
          remoteTarget: {
            alias: "prod",
            host: "ssh.example.com",
            pairflowCommand: "pairflow"
          }
        },
        {
          now: () => new Date("2026-04-16T10:05:00.000Z"),
          runCommand: async () => ({
            stdout: JSON.stringify({
              bubbleStartedAt: "2026-04-16T09:45:00.000Z",
              state: "RUNNING",
              round: 2,
              activeAgent: "codex",
              activeRole: "implementer",
              activeSince: "2026-04-16T09:46:00.000Z",
              lastCommandAt: "2026-04-16T09:58:00.000Z",
              paneActivity: {
                readStatus: "ok",
                lastChangedAt: "2026-04-16T09:57:00.000Z",
                sampledAt: "2026-04-16T09:59:30.000Z",
                sinceLastChangedSeconds: 180,
                sinceSampledSeconds: 30,
                lastSampleStatus: "sampled",
                lastSampleError: null,
                sessionName: "pf-b_remote_status_04",
                targetPane: "pf-b_remote_status_04:0.1"
              },
              executionContext: null,
              watchdog: {
                monitored: true,
                monitoredAgent: "codex",
                timeoutMinutes: 30,
                referenceTimestamp: "2026-04-16T09:58:00.000Z",
                deadlineTimestamp: "2026-04-16T10:28:00.000Z",
                remainingSeconds: 1380,
                expired: false
              },
              pendingInboxItems: {
                humanQuestions: 0,
                approvalRequests: 0,
                total: 0
              },
              transcript: {
                totalMessages: 5,
                lastMessageType: "PASS",
                lastMessageTs: "2026-04-16T09:58:00.000Z",
                lastMessageId: "msg_remote_status_04"
              },
              metaReview: {
                actor: "meta-reviewer",
                authorityActive: true,
                runtimeDelivery: {
                  status: "uncertain",
                  reasonCode: null,
                  message: "pane delivery not confirmed",
                  observedAt: "2026-04-16T09:59:00.000Z",
                  observedForHandoffId:
                    "meta_review:b_remote_status_04:round:2:attempt:1",
                  observedForRound: "2"
                }
              },
              accuracy_critical: false,
              last_review_verification: "missing",
              failing_gates: [
                {
                  gate_id: "doc_contract",
                  reason_code: "REVIEW_SCHEMA_WARNING",
                  message: "schema degraded",
                  priority: "P2",
                  timing: "later-hardening",
                  evidence_refs: ["artifact://gate.json"]
                }
              ],
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
                message: "ok",
                errors: [
                  {
                    path: "execution_context",
                    message: "missing execution context"
                  }
                ]
              }
            }),
            stderr: "",
            exitCode: 0
          })
        }
      )
    ).rejects.toMatchObject({
      code: "REMOTE_STATUS_PAYLOAD_INVALID",
      message:
        "Remote bubble status payload has invalid metaReview.runtimeDelivery.observedForRound; expected positive integer."
    } satisfies Partial<RemoteBubbleStatusError>);
  });

  it("distinguishes missing metaReview.actor from other invalid actor payloads", async () => {
    await expect(() =>
      executeRemoteBubbleStatus(
        {
          bubbleId: "b_remote_status_missing_actor_01",
          remoteClonePath: "/srv/pairflow/repo--b_remote_status_missing_actor_01",
          remoteTarget: {
            alias: "prod",
            host: "ssh.example.com",
            pairflowCommand: "pairflow"
          }
        },
        {
          runCommand: async () => ({
            stdout: JSON.stringify({
              bubbleStartedAt: "2026-04-16T09:45:00.000Z",
              state: "RUNNING",
              round: 2,
              activeAgent: "codex",
              activeRole: "implementer",
              activeSince: "2026-04-16T09:46:00.000Z",
              lastCommandAt: "2026-04-16T09:58:00.000Z",
              paneActivity: {
                readStatus: "ok",
                lastChangedAt: "2026-04-16T09:57:00.000Z",
                sampledAt: "2026-04-16T09:59:30.000Z",
                sinceLastChangedSeconds: 180,
                sinceSampledSeconds: 30,
                lastSampleStatus: "sampled",
                lastSampleError: null,
                sessionName: "pf-b_remote_status_missing_actor_01",
                targetPane: "pf-b_remote_status_missing_actor_01:0.1"
              },
              executionContext: null,
              watchdog: {
                monitored: true,
                monitoredAgent: "codex",
                timeoutMinutes: 30,
                referenceTimestamp: "2026-04-16T09:58:00.000Z",
                deadlineTimestamp: "2026-04-16T10:28:00.000Z",
                remainingSeconds: 1380,
                expired: false
              },
              pendingInboxItems: {
                humanQuestions: 0,
                approvalRequests: 0,
                total: 0
              },
              transcript: {
                totalMessages: 5,
                lastMessageType: "PASS",
                lastMessageTs: "2026-04-16T09:58:00.000Z",
                lastMessageId: "msg_remote_status_missing_actor_01"
              },
              metaReview: {
                actor: null,
                authorityActive: false,
                runtimeDelivery: null
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
            }),
            stderr: "",
            exitCode: 0
          })
        }
      )
    ).rejects.toMatchObject({
      code: "REMOTE_STATUS_PAYLOAD_INVALID",
      message:
        "Remote bubble status payload is missing metaReview.actor; expected \"meta-reviewer\"."
    } satisfies Partial<RemoteBubbleStatusError>);
  });

  it("accepts nullable runtime delivery correlation when both fields are absent", async () => {
    const status = await executeRemoteBubbleStatus(
      {
        bubbleId: "b_remote_status_04b",
        remoteClonePath: "/srv/pairflow/repo--b_remote_status_04b",
        remoteTarget: {
          alias: "prod",
          host: "ssh.example.com",
          pairflowCommand: "pairflow"
        }
      },
      {
        now: () => new Date("2026-04-16T10:06:00.000Z"),
        runCommand: async () => ({
          stdout: JSON.stringify({
            bubbleStartedAt: "2026-04-16T09:45:00.000Z",
            state: "RUNNING",
            round: 2,
            activeAgent: "codex",
            activeRole: "implementer",
            activeSince: "2026-04-16T09:46:00.000Z",
            lastCommandAt: "2026-04-16T09:58:00.000Z",
            paneActivity: {
              readStatus: "ok",
              lastChangedAt: "2026-04-16T09:57:00.000Z",
              sampledAt: "2026-04-16T09:59:30.000Z",
              sinceLastChangedSeconds: 180,
              sinceSampledSeconds: 30,
              lastSampleStatus: "sampled",
              lastSampleError: null,
              sessionName: "pf-b_remote_status_04b",
              targetPane: "pf-b_remote_status_04b:0.1"
            },
            executionContext: null,
            watchdog: {
              monitored: true,
              monitoredAgent: "codex",
              timeoutMinutes: 30,
              referenceTimestamp: "2026-04-16T09:58:00.000Z",
              deadlineTimestamp: "2026-04-16T10:28:00.000Z",
              remainingSeconds: 1380,
              expired: false
            },
            pendingInboxItems: {
              humanQuestions: 0,
              approvalRequests: 0,
              total: 0
            },
            transcript: {
              totalMessages: 5,
              lastMessageType: "PASS",
              lastMessageTs: "2026-04-16T09:58:00.000Z",
              lastMessageId: "msg_remote_status_04b"
            },
            metaReview: {
              actor: "meta-reviewer",
              authorityActive: true,
              runtimeDelivery: {
                status: "uncertain",
                reasonCode: null,
                message: "pane delivery not confirmed",
                observedAt: "2026-04-16T09:59:00.000Z",
                observedForHandoffId: null,
                observedForRound: null
              }
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
          }),
          stderr: "",
          exitCode: 0
        })
      }
    );

    expect(status.metaReview.runtimeDelivery).toStrictEqual({
      status: "uncertain",
      reasonCode: null,
      message: "pane delivery not confirmed",
      observedAt: "2026-04-16T09:59:00.000Z",
      observedForHandoffId: null,
      observedForRound: null
    });
  });

  it("rejects partial runtime delivery correlation payloads", async () => {
    await expect(() =>
      executeRemoteBubbleStatus(
        {
          bubbleId: "b_remote_status_04c",
          remoteClonePath: "/srv/pairflow/repo--b_remote_status_04c",
          remoteTarget: {
            alias: "prod",
            host: "ssh.example.com",
            pairflowCommand: "pairflow"
          }
        },
        {
          runCommand: async () => ({
            stdout: JSON.stringify({
              bubbleStartedAt: "2026-04-16T09:45:00.000Z",
              state: "RUNNING",
              round: 2,
              activeAgent: "codex",
              activeRole: "implementer",
              activeSince: "2026-04-16T09:46:00.000Z",
              lastCommandAt: "2026-04-16T09:58:00.000Z",
              paneActivity: {
                readStatus: "ok",
                lastChangedAt: "2026-04-16T09:57:00.000Z",
                sampledAt: "2026-04-16T09:59:30.000Z",
                sinceLastChangedSeconds: 180,
                sinceSampledSeconds: 30,
                lastSampleStatus: "sampled",
                lastSampleError: null,
                sessionName: "pf-b_remote_status_04c",
                targetPane: "pf-b_remote_status_04c:0.1"
              },
              executionContext: null,
              watchdog: {
                monitored: true,
                monitoredAgent: "codex",
                timeoutMinutes: 30,
                referenceTimestamp: "2026-04-16T09:58:00.000Z",
                deadlineTimestamp: "2026-04-16T10:28:00.000Z",
                remainingSeconds: 1380,
                expired: false
              },
              pendingInboxItems: {
                humanQuestions: 0,
                approvalRequests: 0,
                total: 0
              },
              transcript: {
                totalMessages: 5,
                lastMessageType: "PASS",
                lastMessageTs: "2026-04-16T09:58:00.000Z",
                lastMessageId: "msg_remote_status_04c"
              },
              metaReview: {
                actor: "meta-reviewer",
                authorityActive: true,
                runtimeDelivery: {
                  status: "uncertain",
                  reasonCode: null,
                  message: "pane delivery not confirmed",
                  observedAt: "2026-04-16T09:59:00.000Z",
                  observedForHandoffId:
                    "meta_review:b_remote_status_04c:round:2:attempt:1",
                  observedForRound: null
                }
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
            }),
            stderr: "",
            exitCode: 0
          })
        }
      )
    ).rejects.toMatchObject({
      code: "REMOTE_STATUS_PAYLOAD_INVALID",
      message:
        "Remote bubble status payload has inconsistent metaReview.runtimeDelivery correlation fields."
    } satisfies Partial<RemoteBubbleStatusError>);
  });

  it("treats missing pane activity as missing runtime and accepts undefined nullable counters", async () => {
    const status = await executeRemoteBubbleStatus(
      {
        bubbleId: "b_remote_status_05",
        remoteClonePath: "/srv/pairflow/repo--b_remote_status_05",
        remoteTarget: {
          alias: "prod",
          host: "ssh.example.com",
          pairflowCommand: "pairflow"
        }
      },
      {
        now: () => new Date("2026-04-16T10:10:00.000Z"),
        runCommand: async () => ({
          stdout: JSON.stringify({
            bubbleStartedAt: "2026-04-16T09:45:00.000Z",
            state: "RUNNING",
            round: 2,
            activeAgent: "codex",
            activeRole: "implementer",
            activeSince: "2026-04-16T09:46:00.000Z",
            lastCommandAt: "2026-04-16T09:58:00.000Z",
            paneActivity: {
              readStatus: "missing",
              lastChangedAt: null,
              sampledAt: null,
              lastSampleStatus: null,
              lastSampleError: null,
              sessionName: null,
              targetPane: null
            },
            executionContext: null,
            watchdog: {
              monitored: true,
              monitoredAgent: "codex",
              timeoutMinutes: 30,
              referenceTimestamp: "2026-04-16T09:58:00.000Z",
              deadlineTimestamp: "2026-04-16T10:28:00.000Z",
              expired: false
            },
            pendingInboxItems: {
              humanQuestions: 0,
              approvalRequests: 0,
              total: 0
            },
            transcript: {
              totalMessages: 5,
              lastMessageType: "PASS",
              lastMessageTs: "2026-04-16T09:58:00.000Z",
              lastMessageId: "msg_remote_status_05"
            },
            metaReview: {
              actor: "meta-reviewer",
              authorityActive: false,
              runtimeDelivery: null
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
          }),
          stderr: "",
          exitCode: 0
        })
      }
    );

    expect(status.runtimeAvailability).toBe("missing");
    expect(status.paneActivity.sinceLastChangedSeconds).toBeNull();
    expect(status.watchdog.remainingSeconds).toBeNull();
  });

  it("keeps healthy approval-waiting remote snapshots out of runtime-missing", async () => {
    const status = await executeRemoteBubbleStatus(
      {
        bubbleId: "b_remote_status_07",
        remoteClonePath: "/srv/pairflow/repo--b_remote_status_07",
        remoteTarget: {
          alias: "prod",
          host: "ssh.example.com",
          pairflowCommand: "pairflow"
        }
      },
      {
        now: () => new Date("2026-04-16T10:15:00.000Z"),
        runCommand: async () => ({
          stdout: JSON.stringify({
            bubbleStartedAt: "2026-04-16T09:45:00.000Z",
            state: "READY_FOR_HUMAN_APPROVAL",
            round: 2,
            activeAgent: null,
            activeRole: null,
            activeSince: null,
            lastCommandAt: "2026-04-16T10:14:00.000Z",
            paneActivity: {
              readStatus: "ok",
              lastChangedAt: "2026-04-16T10:14:00.000Z",
              sampledAt: "2026-04-16T10:14:30.000Z",
              sinceLastChangedSeconds: 60,
              sinceSampledSeconds: 30,
              lastSampleStatus: "sampled",
              lastSampleError: null,
              sessionName: "pf-b_remote_status_07",
              targetPane: "pf-b_remote_status_07:0.1"
            },
            executionContext: null,
            watchdog: {
              monitored: false,
              monitoredAgent: null,
              timeoutMinutes: 30,
              referenceTimestamp: "2026-04-16T10:14:00.000Z",
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
              totalMessages: 5,
              lastMessageType: "APPROVAL_REQUEST",
              lastMessageTs: "2026-04-16T10:14:00.000Z",
              lastMessageId: "msg_remote_status_07"
            },
            metaReview: {
              actor: "meta-reviewer",
              authorityActive: false,
              runtimeDelivery: null
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
          }),
          stderr: "",
          exitCode: 0
        })
      }
    );

    expect(status.runtimeAvailability).toBe("active");
  });

  it("fails closed for unmonitored runtime payloads when pane identity evidence is incomplete", async () => {
    const status = await executeRemoteBubbleStatus(
      {
        bubbleId: "b_remote_status_07b",
        remoteClonePath: "/srv/pairflow/repo--b_remote_status_07b",
        remoteTarget: {
          alias: "prod",
          host: "ssh.example.com",
          pairflowCommand: "pairflow"
        }
      },
      {
        now: () => new Date("2026-04-16T10:15:00.000Z"),
        runCommand: async () => ({
          stdout: JSON.stringify({
            bubbleStartedAt: "2026-04-16T09:45:00.000Z",
            state: "READY_FOR_HUMAN_APPROVAL",
            round: 2,
            activeAgent: null,
            activeRole: null,
            activeSince: null,
            lastCommandAt: "2026-04-16T10:14:00.000Z",
            paneActivity: {
              readStatus: "ok",
              lastChangedAt: "2026-04-16T10:14:00.000Z",
              sampledAt: "2026-04-16T10:14:30.000Z",
              sinceLastChangedSeconds: 60,
              sinceSampledSeconds: 30,
              lastSampleStatus: "sampled",
              lastSampleError: null,
              sessionName: null,
              targetPane: "pf-b_remote_status_07b:0.1"
            },
            executionContext: null,
            watchdog: {
              monitored: false,
              monitoredAgent: null,
              timeoutMinutes: 30,
              referenceTimestamp: "2026-04-16T10:14:00.000Z",
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
              totalMessages: 5,
              lastMessageType: "APPROVAL_REQUEST",
              lastMessageTs: "2026-04-16T10:14:00.000Z",
              lastMessageId: "msg_remote_status_07b"
            },
            metaReview: {
              actor: "meta-reviewer",
              authorityActive: false,
              runtimeDelivery: null
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
          }),
          stderr: "",
          exitCode: 0
        })
      }
    );

    expect(status.runtimeAvailability).toBe("missing");
  });

  it("rejects invalid enum fields in the remote payload", async () => {
    await expect(() =>
      executeRemoteBubbleStatus(
        {
          bubbleId: "b_remote_status_06",
          remoteClonePath: "/srv/pairflow/repo--b_remote_status_06",
          remoteTarget: {
            alias: "prod",
            host: "ssh.example.com",
            pairflowCommand: "pairflow"
          }
        },
        {
          runCommand: async () => ({
            stdout: JSON.stringify({
              bubbleStartedAt: "2026-04-16T09:45:00.000Z",
              state: "RUNNING",
              round: 2,
              activeAgent: "codex",
              activeRole: "implementer",
              activeSince: "2026-04-16T09:46:00.000Z",
              lastCommandAt: "2026-04-16T09:58:00.000Z",
              paneActivity: {
                readStatus: "ok",
                lastChangedAt: "2026-04-16T09:57:00.000Z",
                sampledAt: "2026-04-16T09:59:30.000Z",
                sinceLastChangedSeconds: 180,
                sinceSampledSeconds: 30,
                lastSampleStatus: "sampled",
                lastSampleError: null,
                sessionName: "pf-b_remote_status_06",
                targetPane: "pf-b_remote_status_06:0.1"
              },
              executionContext: null,
              watchdog: {
                monitored: true,
                monitoredAgent: "robot",
                timeoutMinutes: 30,
                referenceTimestamp: "2026-04-16T09:58:00.000Z",
                deadlineTimestamp: "2026-04-16T10:28:00.000Z",
                remainingSeconds: 1380,
                expired: false
              },
              pendingInboxItems: {
                humanQuestions: 0,
                approvalRequests: 0,
                total: 0
              },
              transcript: {
                totalMessages: 5,
                lastMessageType: "PASS",
                lastMessageTs: "2026-04-16T09:58:00.000Z",
                lastMessageId: "msg_remote_status_06"
              },
              metaReview: {
                actor: "meta-reviewer",
                authorityActive: false,
                runtimeDelivery: null
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
            }),
            stderr: "",
            exitCode: 0
          })
        }
      )
    ).rejects.toMatchObject({
      code: "REMOTE_STATUS_PAYLOAD_INVALID",
      message:
        "Remote bubble status payload has invalid watchdog.monitoredAgent; expected agent name|null."
    } satisfies Partial<RemoteBubbleStatusError>);
  });

  it("rejects invalid review verification states in the remote payload", async () => {
    await expect(() =>
      executeRemoteBubbleStatus(
        {
          bubbleId: "b_remote_status_07",
          remoteClonePath: "/srv/pairflow/repo--b_remote_status_07",
          remoteTarget: {
            alias: "prod",
            host: "ssh.example.com",
            pairflowCommand: "pairflow"
          }
        },
        {
          runCommand: async () => ({
            stdout: JSON.stringify({
              bubbleStartedAt: "2026-04-16T09:45:00.000Z",
              state: "RUNNING",
              round: 2,
              activeAgent: "codex",
              activeRole: "implementer",
              activeSince: "2026-04-16T09:46:00.000Z",
              lastCommandAt: "2026-04-16T09:58:00.000Z",
              paneActivity: {
                readStatus: "ok",
                lastChangedAt: "2026-04-16T09:57:00.000Z",
                sampledAt: "2026-04-16T09:59:30.000Z",
                sinceLastChangedSeconds: 180,
                sinceSampledSeconds: 30,
                lastSampleStatus: "sampled",
                lastSampleError: null,
                sessionName: "pf-b_remote_status_07",
                targetPane: "pf-b_remote_status_07:0.1"
              },
              executionContext: null,
              watchdog: {
                monitored: true,
                monitoredAgent: "codex",
                timeoutMinutes: 30,
                referenceTimestamp: "2026-04-16T09:58:00.000Z",
                deadlineTimestamp: "2026-04-16T10:28:00.000Z",
                remainingSeconds: 1380,
                expired: false
              },
              pendingInboxItems: {
                humanQuestions: 0,
                approvalRequests: 0,
                total: 0
              },
              transcript: {
                totalMessages: 5,
                lastMessageType: "PASS",
                lastMessageTs: "2026-04-16T09:58:00.000Z",
                lastMessageId: "msg_remote_status_07"
              },
              metaReview: {
                actor: "meta-reviewer",
                authorityActive: false,
                runtimeDelivery: null
              },
              accuracy_critical: false,
              last_review_verification: "stale",
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
            }),
            stderr: "",
            exitCode: 0
          })
        }
      )
    ).rejects.toMatchObject({
      code: "REMOTE_STATUS_PAYLOAD_INVALID",
      message:
        "Remote bubble status payload has invalid last_review_verification."
    } satisfies Partial<RemoteBubbleStatusError>);
  });
});
