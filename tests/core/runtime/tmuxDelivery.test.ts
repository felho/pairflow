import { describe, expect, it } from "vitest";

import { emitTmuxDeliveryNotification, retryStuckAgentInput } from "../../../src/core/runtime/tmuxDelivery.js";
import type { RuntimeSessionsRegistry } from "../../../src/core/runtime/sessionsRegistry.js";
import type { TmuxRunResult, TmuxRunner } from "../../../src/core/runtime/tmuxManager.js";
import type { ReviewerTestExecutionDirective } from "../../../src/core/reviewer/testEvidence.js";
import type { BubbleConfig } from "../../../src/types/bubble.js";
import type { ProtocolEnvelope } from "../../../src/types/protocol.js";

const baseConfig: BubbleConfig = {
  id: "b_delivery_01",
  repo_path: "/tmp/repo",
  base_branch: "main",
  bubble_branch: "pf/b_delivery_01",
  work_mode: "worktree",
  quality_mode: "strict",
  review_artifact_type: "auto",
  reviewer_context_mode: "persistent",
  watchdog_timeout_minutes: 5,
  max_rounds: 8,
  commit_requires_approval: true,
  agents: {
    implementer: "codex",
    reviewer: "claude"
  },
  commands: {
    test: "pnpm test",
    typecheck: "pnpm typecheck"
  },
  notifications: {
    enabled: true
  }
};

function createEnvelope(overrides: Partial<ProtocolEnvelope> = {}): ProtocolEnvelope {
  return {
    id: "msg_20260222_101",
    ts: "2026-02-22T12:00:00.000Z",
    bubble_id: "b_delivery_01",
    sender: "codex",
    recipient: "claude",
    type: "PASS",
    round: 1,
    payload: {
      summary: "handoff"
    },
    refs: ["artifact://handoff.md"],
    ...overrides
  };
}

function createRegistry(): RuntimeSessionsRegistry {
  return {
    b_delivery_01: {
      bubbleId: "b_delivery_01",
      repoPath: "/tmp/repo",
      worktreePath: "/tmp/worktree",
      tmuxSessionName: "pf-b_delivery_01",
      updatedAt: "2026-02-22T12:00:00.000Z"
    }
  };
}

describe("emitTmuxDeliveryNotification", () => {
  it("routes PASS delivery to recipient agent pane with full ontology in fresh mode", async () => {
    const calls: string[][] = [];
    const runner: TmuxRunner = (args): Promise<TmuxRunResult> => {
      calls.push(args);
      if (args[0] === "capture-pane") {
        return Promise.resolve({
          stdout:
            "# [pairflow] r1 PASS codex->claude msg=msg_20260222_101 ref=artifact://handoff.md. Action: Implementer handoff received.",
          stderr: "",
          exitCode: 0
        });
      }
      return Promise.resolve({
        stdout: "",
        stderr: "",
        exitCode: 0
      });
    };

    const reviewerTestDirective: ReviewerTestExecutionDirective = {
      skip_full_rerun: true,
      reason_code: "no_trigger",
      reason_detail: "Evidence is verified, fresh, and complete.",
      verification_status: "trusted"
    };

    const result = await emitTmuxDeliveryNotification({
      bubbleId: "b_delivery_01",
      bubbleConfig: {
        ...baseConfig,
        reviewer_context_mode: "fresh"
      },
      sessionsPath: "/tmp/repo/.pairflow/runtime/sessions.json",
      envelope: createEnvelope(),
      reviewerTestDirective,
      runner,
      readSessionsRegistry: () => Promise.resolve(createRegistry()),
      deliveryAttempts: 2
    });

    expect(result.delivered).toBe(true);
    expect(result.sessionName).toBe("pf-b_delivery_01");
    expect(result.targetPaneIndex).toBe(2);
    expect(calls).toContainEqual([
      "send-keys",
      "-t",
      "pf-b_delivery_01:0.2",
      "-l",
      expect.stringContaining(
        "# [pairflow] r1 PASS codex->claude msg=msg_20260222_101 ref=artifact://handoff.md."
      )
    ]);
    const messageCall = calls.find(
      (call) =>
        call[0] === "send-keys" &&
        call[2] === "pf-b_delivery_01:0.2" &&
        call[3] === "-l" &&
        call[4]?.includes("# [pairflow] r1 PASS codex->claude")
    );
    expect(messageCall?.[4]).toContain(
      "Action: Implementer handoff received. Run a fresh review now"
    );
    expect(messageCall?.[4]).toContain("Severity Ontology v1 reminder");
    expect(messageCall?.[4]).toContain(
      "Full canonical ontology (embedded from `docs/reviewer-severity-ontology.md`)"
    );
    expect(messageCall?.[4]).toContain("Blocker severities (`P0/P1`) require concrete evidence");
    expect(messageCall?.[4]).toContain("Without blocker-grade evidence (`P0/P1`), downgrade to `P2` by default");
    expect(messageCall?.[4]).toContain("Cosmetic/comment-only findings are `P3`");
    expect(messageCall?.[4]).toContain("Out-of-scope observations should be notes (`P3`)");
    expect(messageCall?.[4]).toContain(
      "Implementer test evidence has been orchestrator-verified. Do not re-run full tests unless a trigger from the decision matrix applies."
    );
    expect(messageCall?.[4]).toContain(
      "Execute pairflow commands directly (no confirmation prompt)"
    );
    expect(messageCall?.[4]).toContain(
      "--finding 'P1:...|artifact://...'"
    );
    expect(messageCall?.[4]).toContain(
      "Run pairflow commands from worktree: /tmp/worktree."
    );
    // Message must NOT embed CR/LF — Enter is sent as a separate tmux command.
    expect(messageCall?.[4]).not.toMatch(/[\r\n]$/);
    expect(calls).toContainEqual([
      "send-keys",
      "-t",
      "pf-b_delivery_01:0.2",
      "Enter"
    ]);
    expect(calls).toContainEqual([
      "capture-pane",
      "-pt",
      "pf-b_delivery_01:0.2"
    ]);
  });

  it("keeps concise ontology reminder in persistent reviewer context mode", async () => {
    const calls: string[][] = [];
    const runner: TmuxRunner = (args): Promise<TmuxRunResult> => {
      calls.push(args);
      if (args[0] === "capture-pane") {
        return Promise.resolve({
          stdout:
            "# [pairflow] r1 PASS codex->claude msg=msg_20260222_101 ref=artifact://handoff.md. Action: Implementer handoff received.",
          stderr: "",
          exitCode: 0
        });
      }
      return Promise.resolve({
        stdout: "",
        stderr: "",
        exitCode: 0
      });
    };

    await emitTmuxDeliveryNotification({
      bubbleId: "b_delivery_01",
      bubbleConfig: {
        ...baseConfig,
        reviewer_context_mode: "persistent"
      },
      sessionsPath: "/tmp/repo/.pairflow/runtime/sessions.json",
      envelope: createEnvelope(),
      runner,
      readSessionsRegistry: () => Promise.resolve(createRegistry())
    });

    const messageCall = calls.find(
      (call) =>
        call[0] === "send-keys" &&
        call[2] === "pf-b_delivery_01:0.2" &&
        call[3] === "-l" &&
        call[4]?.includes("# [pairflow] r1 PASS codex->claude")
    );

    expect(messageCall?.[4]).toContain("Severity Ontology v1 reminder");
    expect(messageCall?.[4]).not.toContain(
      "Full canonical ontology (embedded from `docs/reviewer-severity-ontology.md`)"
    );
  });

  it("re-injects full ontology on every fresh-mode reviewer handoff round with directive", async () => {
    const calls: string[][] = [];
    let lastDeliveryMessage = "";
    const reviewerTestDirective: ReviewerTestExecutionDirective = {
      skip_full_rerun: true,
      reason_code: "no_trigger",
      reason_detail: "Evidence is verified, fresh, and complete.",
      verification_status: "trusted"
    };
    const runner: TmuxRunner = (args): Promise<TmuxRunResult> => {
      calls.push(args);
      if (args[0] === "send-keys" && args[3] === "-l") {
        lastDeliveryMessage = args[4] ?? "";
      }
      if (args[0] === "capture-pane") {
        return Promise.resolve({
          stdout: lastDeliveryMessage,
          stderr: "",
          exitCode: 0
        });
      }
      return Promise.resolve({
        stdout: "",
        stderr: "",
        exitCode: 0
      });
    };

    await emitTmuxDeliveryNotification({
      bubbleId: "b_delivery_01",
      bubbleConfig: {
        ...baseConfig,
        reviewer_context_mode: "fresh"
      },
      sessionsPath: "/tmp/repo/.pairflow/runtime/sessions.json",
      envelope: createEnvelope({
        id: "msg_20260222_101",
        round: 1
      }),
      reviewerTestDirective,
      runner,
      readSessionsRegistry: () => Promise.resolve(createRegistry())
    });

    await emitTmuxDeliveryNotification({
      bubbleId: "b_delivery_01",
      bubbleConfig: {
        ...baseConfig,
        reviewer_context_mode: "fresh"
      },
      sessionsPath: "/tmp/repo/.pairflow/runtime/sessions.json",
      envelope: createEnvelope({
        id: "msg_20260222_102",
        round: 2
      }),
      reviewerTestDirective,
      runner,
      readSessionsRegistry: () => Promise.resolve(createRegistry())
    });

    const reviewerMessages = calls.filter(
      (call) =>
        call[0] === "send-keys" &&
        call[2] === "pf-b_delivery_01:0.2" &&
        call[3] === "-l" &&
        call[4]?.includes("PASS codex->claude")
    );
    expect(reviewerMessages).toHaveLength(2);
    for (const messageCall of reviewerMessages) {
      expect(messageCall[4]).toContain("Severity Ontology v1 reminder");
      expect(messageCall[4]).toContain(
        "Full canonical ontology (embedded from `docs/reviewer-severity-ontology.md`)"
      );
      expect(messageCall[4]).toContain(
        "Implementer test evidence has been orchestrator-verified. Do not re-run full tests unless a trigger from the decision matrix applies."
      );
    }
  });

  it("injects decision matrix reminder in fresh mode when reviewer test directive is unavailable", async () => {
    const calls: string[][] = [];
    const runner: TmuxRunner = (args): Promise<TmuxRunResult> => {
      calls.push(args);
      if (args[0] === "capture-pane") {
        return Promise.resolve({
          stdout:
            "# [pairflow] r1 PASS codex->claude msg=msg_20260222_101 ref=artifact://handoff.md. Action: Implementer handoff received.",
          stderr: "",
          exitCode: 0
        });
      }
      return Promise.resolve({
        stdout: "",
        stderr: "",
        exitCode: 0
      });
    };

    await emitTmuxDeliveryNotification({
      bubbleId: "b_delivery_01",
      bubbleConfig: {
        ...baseConfig,
        reviewer_context_mode: "fresh"
      },
      sessionsPath: "/tmp/repo/.pairflow/runtime/sessions.json",
      envelope: createEnvelope(),
      runner,
      readSessionsRegistry: () => Promise.resolve(createRegistry())
    });

    const messageCall = calls.find(
      (call) =>
        call[0] === "send-keys" &&
        call[2] === "pf-b_delivery_01:0.2" &&
        call[3] === "-l" &&
        call[4]?.includes("# [pairflow] r1 PASS codex->claude")
    );
    expect(messageCall?.[4]).toContain(
      "Run required checks before final judgment. Reason: reviewer test verification directive was unavailable."
    );
    expect(messageCall?.[4]).toContain(
      "Decision matrix triggers that still require tests:"
    );
    expect(messageCall?.[4]).toContain(
      "Full canonical ontology (embedded from `docs/reviewer-severity-ontology.md`)"
    );
  });

  it("uses document-focused reviewer guidance when review artifact type is document", async () => {
    const calls: string[][] = [];
    const runner: TmuxRunner = (args): Promise<TmuxRunResult> => {
      calls.push(args);
      if (args[0] === "capture-pane") {
        return Promise.resolve({
          stdout:
            "# [pairflow] r1 PASS codex->claude msg=msg_20260222_101 ref=artifact://handoff.md.",
          stderr: "",
          exitCode: 0
        });
      }
      return Promise.resolve({
        stdout: "",
        stderr: "",
        exitCode: 0
      });
    };

    await emitTmuxDeliveryNotification({
      bubbleId: "b_delivery_01",
      bubbleConfig: {
        ...baseConfig,
        review_artifact_type: "document"
      },
      sessionsPath: "/tmp/repo/.pairflow/runtime/sessions.json",
      envelope: createEnvelope(),
      runner,
      readSessionsRegistry: () => Promise.resolve(createRegistry())
    });

    const messageCall = calls.find(
      (call) =>
        call[0] === "send-keys" &&
        call[2] === "pf-b_delivery_01:0.2" &&
        call[3] === "-l" &&
        call[4]?.includes("# [pairflow] r1 PASS codex->claude")
    );
    expect(messageCall?.[4]).toContain("document/task artifacts");
    expect(messageCall?.[4]).toContain("Do not force `feature-dev:code-reviewer`");
  });

  it("routes human recipient notifications to status pane", async () => {
    const calls: string[][] = [];
    const runner: TmuxRunner = (args): Promise<TmuxRunResult> => {
      calls.push(args);
      if (args[0] === "capture-pane") {
        return Promise.resolve({
          stdout:
            "# [pairflow] r1 HUMAN_QUESTION claude->human msg=msg_20260222_101 ref=artifact://handoff.md.",
          stderr: "",
          exitCode: 0
        });
      }
      return Promise.resolve({
        stdout: "",
        stderr: "",
        exitCode: 0
      });
    };

    const result = await emitTmuxDeliveryNotification({
      bubbleId: "b_delivery_01",
      bubbleConfig: baseConfig,
      sessionsPath: "/tmp/repo/.pairflow/runtime/sessions.json",
      envelope: createEnvelope({
        sender: "claude",
        recipient: "human",
        type: "HUMAN_QUESTION"
      }),
      runner,
      readSessionsRegistry: () => Promise.resolve(createRegistry())
    });

    expect(result.delivered).toBe(true);
    expect(result.targetPaneIndex).toBe(0);
    const toStatusPane = calls.find(
      (call) => call[0] === "send-keys" && call[2] === "pf-b_delivery_01:0.0"
    );
    expect(toStatusPane).toBeDefined();
    expect(calls).toContainEqual([
      "send-keys",
      "-t",
      "pf-b_delivery_01:0.0",
      "Enter"
    ]);
    expect(calls.some((call) => call[0] === "capture-pane")).toBe(true);
  });

  it("routes approval-wait notification to implementer pane with stop instruction", async () => {
    const calls: string[][] = [];
    const runner: TmuxRunner = (args): Promise<TmuxRunResult> => {
      calls.push(args);
      if (args[0] === "capture-pane") {
        return Promise.resolve({
          stdout:
            "# [pairflow] r1 APPROVAL_REQUEST orchestrator->codex msg=msg_20260222_101 ref=artifact://handoff.md.",
          stderr: "",
          exitCode: 0
        });
      }
      return Promise.resolve({
        stdout: "",
        stderr: "",
        exitCode: 0
      });
    };

    const result = await emitTmuxDeliveryNotification({
      bubbleId: "b_delivery_01",
      bubbleConfig: baseConfig,
      sessionsPath: "/tmp/repo/.pairflow/runtime/sessions.json",
      envelope: createEnvelope({
        sender: "orchestrator",
        recipient: "codex",
        type: "APPROVAL_REQUEST"
      }),
      runner,
      readSessionsRegistry: () => Promise.resolve(createRegistry())
    });

    expect(result.delivered).toBe(true);
    expect(result.targetPaneIndex).toBe(1);
    expect(
      calls.some((call) => call[0] === "send-keys" && call[2] === "pf-b_delivery_01:0.1")
    ).toBe(true);
    expect(calls).toContainEqual([
      "send-keys",
      "-t",
      "pf-b_delivery_01:0.1",
      "Enter"
    ]);
    expect(calls.some((call) => call[0] === "capture-pane")).toBe(true);
    const approvalCall = calls.find(
      (call) =>
        call[0] === "send-keys" &&
        call[2] === "pf-b_delivery_01:0.1" &&
        call[3] === "-l" &&
        call[4]?.includes("APPROVAL_REQUEST")
    );
    expect(approvalCall?.[4]).toContain(
      "Bubble is READY_FOR_APPROVAL. Stop coding and wait for human decision"
    );
  });

  it("routes rework approval decision to implementer pane with rework instruction", async () => {
    const calls: string[][] = [];
    const runner: TmuxRunner = (args): Promise<TmuxRunResult> => {
      calls.push(args);
      if (args[0] === "capture-pane") {
        return Promise.resolve({
          stdout:
            "# [pairflow] r2 APPROVAL_DECISION human->codex msg=msg_20260222_101 ref=transcript.ndjson#msg_20260222_101.",
          stderr: "",
          exitCode: 0
        });
      }
      return Promise.resolve({
        stdout: "",
        stderr: "",
        exitCode: 0
      });
    };

    const result = await emitTmuxDeliveryNotification({
      bubbleId: "b_delivery_01",
      bubbleConfig: baseConfig,
      sessionsPath: "/tmp/repo/.pairflow/runtime/sessions.json",
      envelope: createEnvelope({
        sender: "human",
        recipient: "codex",
        type: "APPROVAL_DECISION",
        round: 2,
        payload: {
          decision: "revise",
          message: "Please address reviewer findings."
        }
      }),
      messageRef: "transcript.ndjson#msg_20260222_101",
      runner,
      readSessionsRegistry: () => Promise.resolve(createRegistry())
    });

    expect(result.delivered).toBe(true);
    expect(result.targetPaneIndex).toBe(1);
    const approvalCall = calls.find(
      (call) =>
        call[0] === "send-keys" &&
        call[2] === "pf-b_delivery_01:0.1" &&
        call[3] === "-l" &&
        call[4]?.includes("APPROVAL_DECISION human->codex")
    );
    expect(approvalCall?.[4]).toContain("Human requested rework.");
    expect(calls).toContainEqual([
      "send-keys",
      "-t",
      "pf-b_delivery_01:0.1",
      "Enter"
    ]);
  });

  it("routes approval-wait notification to reviewer pane with hold instruction", async () => {
    const calls: string[][] = [];
    const runner: TmuxRunner = (args): Promise<TmuxRunResult> => {
      calls.push(args);
      if (args[0] === "capture-pane") {
        return Promise.resolve({
          stdout:
            "# [pairflow] r1 APPROVAL_REQUEST orchestrator->claude msg=msg_20260222_101 ref=artifact://handoff.md.",
          stderr: "",
          exitCode: 0
        });
      }
      return Promise.resolve({
        stdout: "",
        stderr: "",
        exitCode: 0
      });
    };

    const result = await emitTmuxDeliveryNotification({
      bubbleId: "b_delivery_01",
      bubbleConfig: baseConfig,
      sessionsPath: "/tmp/repo/.pairflow/runtime/sessions.json",
      envelope: createEnvelope({
        sender: "orchestrator",
        recipient: "claude",
        type: "APPROVAL_REQUEST"
      }),
      runner,
      readSessionsRegistry: () => Promise.resolve(createRegistry())
    });

    expect(result.delivered).toBe(true);
    expect(result.targetPaneIndex).toBe(2);
    expect(
      calls.some((call) => call[0] === "send-keys" && call[2] === "pf-b_delivery_01:0.2")
    ).toBe(true);
    expect(calls).toContainEqual([
      "send-keys",
      "-t",
      "pf-b_delivery_01:0.2",
      "Enter"
    ]);
    expect(calls.some((call) => call[0] === "capture-pane")).toBe(true);
    const approvalCall = calls.find(
      (call) =>
        call[0] === "send-keys" &&
        call[2] === "pf-b_delivery_01:0.2" &&
        call[3] === "-l" &&
        call[4]?.includes("APPROVAL_REQUEST")
    );
    expect(approvalCall?.[4]).toContain(
      "Bubble is READY_FOR_APPROVAL. Review is complete; wait for human decision"
    );
  });

  it("returns no_runtime_session when registry has no entry", async () => {
    const calls: string[][] = [];
    const runner: TmuxRunner = (args): Promise<TmuxRunResult> => {
      calls.push(args);
      return Promise.resolve({
        stdout: "",
        stderr: "",
        exitCode: 0
      });
    };

    const result = await emitTmuxDeliveryNotification({
      bubbleId: "b_delivery_01",
      bubbleConfig: baseConfig,
      sessionsPath: "/tmp/repo/.pairflow/runtime/sessions.json",
      envelope: createEnvelope(),
      runner,
      readSessionsRegistry: () => Promise.resolve({})
    });

    expect(result).toMatchObject({
      delivered: false,
      reason: "no_runtime_session"
    });
    expect(result.message).toContain(
      "# [pairflow] r1 PASS codex->claude msg=msg_20260222_101 ref=artifact://handoff.md."
    );
    expect(result.message).toContain(
      "Run pairflow commands from the bubble worktree root."
    );
    expect(calls).toHaveLength(0);
  });

  it("returns registry_read_failed when session registry load fails", async () => {
    const result = await emitTmuxDeliveryNotification({
      bubbleId: "b_delivery_01",
      bubbleConfig: baseConfig,
      sessionsPath: "/tmp/repo/.pairflow/runtime/sessions.json",
      envelope: createEnvelope(),
      readSessionsRegistry: async () => Promise.reject(new Error("invalid json"))
    });

    expect(result).toMatchObject({
      delivered: false,
      reason: "registry_read_failed"
    });
    expect(result.message).toContain(
      "# [pairflow] r1 PASS codex->claude msg=msg_20260222_101 ref=artifact://handoff.md."
    );
    expect(result.message).toContain(
      "Run pairflow commands from the bubble worktree root."
    );
  });

  it("returns tmux_send_failed when tmux command fails", async () => {
    const runner: TmuxRunner = () => Promise.reject(new Error("tmux unavailable"));

    const result = await emitTmuxDeliveryNotification({
      bubbleId: "b_delivery_01",
      bubbleConfig: baseConfig,
      sessionsPath: "/tmp/repo/.pairflow/runtime/sessions.json",
      envelope: createEnvelope(),
      runner,
      readSessionsRegistry: () => Promise.resolve(createRegistry()),
      deliveryAttempts: 2
    });

    expect(result).toMatchObject({
      delivered: false,
      sessionName: "pf-b_delivery_01",
      targetPaneIndex: 2,
      reason: "tmux_send_failed"
    });
    expect(result.message).toContain(
      "# [pairflow] r1 PASS codex->claude msg=msg_20260222_101 ref=artifact://handoff.md."
    );
    expect(result.message).toContain(
      "Run pairflow commands from worktree: /tmp/worktree."
    );
  });

  it("retries delivery when handoff marker is not visible after first submit", async () => {
    const calls: string[][] = [];
    let captureCount = 0;
    const runner: TmuxRunner = (args): Promise<TmuxRunResult> => {
      calls.push(args);
      if (args[0] === "capture-pane") {
        captureCount += 1;
        return Promise.resolve({
          stdout:
            captureCount >= 3
              ? "# [pairflow] r1 PASS codex->claude msg=msg_20260222_101 ref=artifact://handoff.md."
              : "",
          stderr: "",
          exitCode: 0
        });
      }
      return Promise.resolve({
        stdout: "",
        stderr: "",
        exitCode: 0
      });
    };

    const result = await emitTmuxDeliveryNotification({
      bubbleId: "b_delivery_01",
      bubbleConfig: baseConfig,
      sessionsPath: "/tmp/repo/.pairflow/runtime/sessions.json",
      envelope: createEnvelope(),
      runner,
      readSessionsRegistry: () => Promise.resolve(createRegistry()),
      deliveryAttempts: 2
    });

    expect(result.delivered).toBe(true);
    const submitCalls = calls.filter(
      (call) => call[0] === "send-keys" && call[2] === "pf-b_delivery_01:0.2"
    );
    // one message write + Enter (initial) + Enter (retry) = 3 send-keys calls
    expect(submitCalls.length).toBe(3);
    const captureCalls = calls.filter((call) => call[0] === "capture-pane");
    expect(captureCalls.length).toBeGreaterThanOrEqual(2);
  });

  it("detects marker stuck in input buffer and retries Enter", async () => {
    const calls: string[][] = [];
    let captureCount = 0;
    const runner: TmuxRunner = (args): Promise<TmuxRunResult> => {
      calls.push(args);
      if (args[0] === "capture-pane") {
        captureCount += 1;
        if (captureCount <= 2) {
          // Marker appears after the > prompt — stuck in input buffer.
          return Promise.resolve({
            stdout: [
              "Claude Code is ready.",
              "",
              "> # [pairflow] r1 PASS codex->claude msg=msg_20260222_101 ref=artifact://handoff.md."
            ].join("\n"),
            stderr: "",
            exitCode: 0
          });
        }
        // After retry Enter, marker moves to output area (before prompt).
        return Promise.resolve({
          stdout: [
            "# [pairflow] r1 PASS codex->claude msg=msg_20260222_101 ref=artifact://handoff.md.",
            "",
            ">"
          ].join("\n"),
          stderr: "",
          exitCode: 0
        });
      }
      return Promise.resolve({
        stdout: "",
        stderr: "",
        exitCode: 0
      });
    };

    const result = await emitTmuxDeliveryNotification({
      bubbleId: "b_delivery_01",
      bubbleConfig: baseConfig,
      sessionsPath: "/tmp/repo/.pairflow/runtime/sessions.json",
      envelope: createEnvelope(),
      runner,
      readSessionsRegistry: () => Promise.resolve(createRegistry()),
      deliveryAttempts: 3
    });

    expect(result.delivered).toBe(true);
    // Verify retry Enter was sent after detecting stuck_in_input.
    const enterRetries = calls.filter(
      (call) =>
        call[0] === "send-keys" &&
        call[2] === "pf-b_delivery_01:0.2" &&
        call[3] === "Enter" &&
        call.length === 4
    );
    // Initial Enter (from sendAndSubmitTmuxPaneMessage) + at least one retry Enter.
    expect(enterRetries.length).toBeGreaterThanOrEqual(2);
  });

  it("returns delivery_unconfirmed when marker never appears", async () => {
    const runner: TmuxRunner = (args): Promise<TmuxRunResult> => {
      if (args[0] === "capture-pane") {
        return Promise.resolve({
          stdout: "",
          stderr: "",
          exitCode: 0
        });
      }
      return Promise.resolve({
        stdout: "",
        stderr: "",
        exitCode: 0
      });
    };

    const result = await emitTmuxDeliveryNotification({
      bubbleId: "b_delivery_01",
      bubbleConfig: baseConfig,
      sessionsPath: "/tmp/repo/.pairflow/runtime/sessions.json",
      envelope: createEnvelope(),
      runner,
      readSessionsRegistry: () => Promise.resolve(createRegistry()),
      deliveryAttempts: 2
    });

    expect(result).toMatchObject({
      delivered: false,
      reason: "delivery_unconfirmed",
      sessionName: "pf-b_delivery_01",
      targetPaneIndex: 2
    });
  });
});

describe("retryStuckAgentInput", () => {
  it("sends Enter when pairflow marker is stuck in input buffer", async () => {
    const calls: string[][] = [];
    const runner: TmuxRunner = (args): Promise<TmuxRunResult> => {
      calls.push(args);
      if (args[0] === "capture-pane") {
        return Promise.resolve({
          stdout: [
            "Claude Code is ready.",
            "",
            "❯ # [pairflow] r1 PASS codex->claude msg=msg_123 ref=handoff.md."
          ].join("\n"),
          stderr: "",
          exitCode: 0
        });
      }
      return Promise.resolve({ stdout: "", stderr: "", exitCode: 0 });
    };

    const result = await retryStuckAgentInput({
      bubbleId: "b_delivery_01",
      bubbleConfig: baseConfig,
      sessionsPath: "/tmp/sessions.json",
      activeAgent: "claude",
      runner,
      readSessionsRegistry: () => Promise.resolve(createRegistry())
    });

    expect(result.retried).toBe(true);
    expect(calls).toContainEqual([
      "send-keys",
      "-t",
      "pf-b_delivery_01:0.2",
      "Enter"
    ]);
  });

  it("does not retry when marker is in output area (already submitted)", async () => {
    const calls: string[][] = [];
    const runner: TmuxRunner = (args): Promise<TmuxRunResult> => {
      calls.push(args);
      if (args[0] === "capture-pane") {
        return Promise.resolve({
          stdout: [
            "# [pairflow] r1 PASS codex->claude msg=msg_123 ref=handoff.md.",
            "Processing...",
            "❯"
          ].join("\n"),
          stderr: "",
          exitCode: 0
        });
      }
      return Promise.resolve({ stdout: "", stderr: "", exitCode: 0 });
    };

    const result = await retryStuckAgentInput({
      bubbleId: "b_delivery_01",
      bubbleConfig: baseConfig,
      sessionsPath: "/tmp/sessions.json",
      activeAgent: "claude",
      runner,
      readSessionsRegistry: () => Promise.resolve(createRegistry())
    });

    expect(result).toMatchObject({ retried: false, reason: "not_stuck" });
    const enterCalls = calls.filter((c) => c[0] === "send-keys" && c[3] === "Enter");
    expect(enterCalls).toHaveLength(0);
  });

  it("does not retry when no pairflow marker is present", async () => {
    const runner: TmuxRunner = (args): Promise<TmuxRunResult> => {
      if (args[0] === "capture-pane") {
        return Promise.resolve({
          stdout: "❯ hello world",
          stderr: "",
          exitCode: 0
        });
      }
      return Promise.resolve({ stdout: "", stderr: "", exitCode: 0 });
    };

    const result = await retryStuckAgentInput({
      bubbleId: "b_delivery_01",
      bubbleConfig: baseConfig,
      sessionsPath: "/tmp/sessions.json",
      activeAgent: "claude",
      runner,
      readSessionsRegistry: () => Promise.resolve(createRegistry())
    });

    expect(result).toMatchObject({ retried: false, reason: "not_stuck" });
  });

  it("returns no_session when sessions registry is empty", async () => {
    const result = await retryStuckAgentInput({
      bubbleId: "b_delivery_01",
      bubbleConfig: baseConfig,
      sessionsPath: "/tmp/sessions.json",
      activeAgent: "claude",
      readSessionsRegistry: () => Promise.resolve({})
    });

    expect(result).toMatchObject({ retried: false, reason: "no_session" });
  });

  it("routes implementer agent to pane 1", async () => {
    const calls: string[][] = [];
    const runner: TmuxRunner = (args): Promise<TmuxRunResult> => {
      calls.push(args);
      if (args[0] === "capture-pane") {
        return Promise.resolve({
          stdout: [
            "",
            "❯ # [pairflow] r1 TASK orchestrator->codex msg=msg_123 ref=task.md."
          ].join("\n"),
          stderr: "",
          exitCode: 0
        });
      }
      return Promise.resolve({ stdout: "", stderr: "", exitCode: 0 });
    };

    const result = await retryStuckAgentInput({
      bubbleId: "b_delivery_01",
      bubbleConfig: baseConfig,
      sessionsPath: "/tmp/sessions.json",
      activeAgent: "codex",
      runner,
      readSessionsRegistry: () => Promise.resolve(createRegistry())
    });

    expect(result.retried).toBe(true);
    expect(calls).toContainEqual([
      "capture-pane",
      "-pt",
      "pf-b_delivery_01:0.1"
    ]);
    expect(calls).toContainEqual([
      "send-keys",
      "-t",
      "pf-b_delivery_01:0.1",
      "Enter"
    ]);
  });
});
