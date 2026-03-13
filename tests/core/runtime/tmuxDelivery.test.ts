import { describe, expect, it } from "vitest";

import {
  buildTranscriptFallbackRef,
  emitTmuxDeliveryNotification,
  resolveDeliveryMessageRef,
  retryStuckAgentInput
} from "../../../src/core/runtime/tmuxDelivery.js";
import {
  REVIEWER_COMMAND_GATE_FORBIDDEN,
  REVIEWER_COMMAND_GATE_REQ_A,
  REVIEWER_COMMAND_GATE_REQ_B,
  REVIEWER_COMMAND_GATE_REQ_C,
  REVIEWER_COMMAND_GATE_REQ_D,
  REVIEWER_COMMAND_GATE_REQ_E
} from "../../../src/core/runtime/reviewerCommandGateGuidance.js";
import type { RuntimeSessionsRegistry } from "../../../src/core/runtime/sessionsRegistry.js";
import { runtimePaneIndices, type TmuxRunResult, type TmuxRunner } from "../../../src/core/runtime/tmuxManager.js";
import type { ReviewerTestExecutionDirective } from "../../../src/core/reviewer/testEvidence.js";
import type { BubbleConfig } from "../../../src/types/bubble.js";
import { deliveryTargetRoleMetadataKey, type ProtocolEnvelope } from "../../../src/types/protocol.js";

const baseConfig: BubbleConfig = {
  id: "b_delivery_01",
  repo_path: "/tmp/repo",
  base_branch: "main",
  bubble_branch: "pf/b_delivery_01",
  work_mode: "worktree",
  quality_mode: "strict",
  review_artifact_type: "auto",
  pairflow_command_profile: "external",
  reviewer_context_mode: "persistent",
  watchdog_timeout_minutes: 5,
  max_rounds: 8,
  severity_gate_round: 4,
  commit_requires_approval: true,
  attach_launcher: "auto",
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
  },
  enforcement_mode: {
    all_gate: "advisory",
    docs_gate: "advisory"
  },
  doc_contract_gates: {
    round_gate_applies_after: 2
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

function createSharedAgentConfig(
  agent: "codex" | "claude"
): BubbleConfig {
  return {
    ...baseConfig,
    agents: {
      implementer: agent,
      reviewer: agent
    }
  };
}

function expectNoForbiddenReviewerCommandGateTokens(text: string | undefined): void {
  expect(text).toBeDefined();
  for (const forbiddenToken of REVIEWER_COMMAND_GATE_FORBIDDEN) {
    expect(text).not.toContain(forbiddenToken);
  }
}

function expectReviewerValidationClaimGuardrails(text: string | undefined): void {
  expect(text).toBeDefined();
  expect(text).toContain(
    "Validation claim guardrail (applies to review output): derive validation claims from explicit evidence sources first, command-by-command for `lint`, `typecheck`, and `test`."
  );
  expect(text).toContain(
    "Never publish aggregate validation shorthand such as `typecheck/lint pass` or `all checks pass` without command-level evidence-backed statuses."
  );
  expect(text).toContain(
    "`Scout Coverage` must include command-level validation statuses: `lint=<pass|failed|not-run|unknown>`, `typecheck=<pass|failed|not-run|unknown>`, `test=<pass|failed|not-run|unknown>`."
  );
  expect(text).toContain(
    "Each validation status claim must cite an evidence source (for example evidence log path or transcript/reference anchor)."
  );
  expect(text).toContain(
    "Forbidden aggregate shorthand without command-level evidence: `typecheck/lint pass`, `all checks pass`, or equivalent aggregate phrasing."
  );
  expect(text).toContain(
    "If a command evidence source is missing or ambiguous, report `unknown` or `not-run` for that command and do not claim `pass`."
  );
}

describe("emitTmuxDeliveryNotification", () => {
  it("mentions meta-reviewer gate context for approval requests tagged with actor metadata", async () => {
    const calls: string[][] = [];
    const runner: TmuxRunner = (args): Promise<TmuxRunResult> => {
      calls.push(args);
      if (args[0] === "capture-pane") {
        return Promise.resolve({
          stdout:
            "# [pairflow] r2 APPROVAL_REQUEST orchestrator->codex msg=msg_20260222_102 ref=artifact://approval.md. Action: Bubble is READY_FOR_HUMAN_APPROVAL after meta-reviewer gate.",
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
        id: "msg_20260222_102",
        type: "APPROVAL_REQUEST",
        sender: "orchestrator",
        recipient: "codex",
        round: 2,
        payload: {
          summary: "Waiting for human decision",
          metadata: {
            actor: "meta-reviewer",
            latest_recommendation: "inconclusive"
          }
        },
        refs: ["artifact://approval.md"]
      }),
      runner,
      readSessionsRegistry: () => Promise.resolve(createRegistry()),
      deliveryAttempts: 2
    });

    expect(result.delivered).toBe(true);
    const messageCall = calls.find(
      (call) =>
        call[0] === "send-keys" &&
        call[2] === "pf-b_delivery_01:0.1" &&
        call[3] === "-l" &&
        call[4]?.includes("# [pairflow] r2 APPROVAL_REQUEST orchestrator->codex")
    );
    expect(messageCall?.[4]).toContain(
      "Meta-reviewer requested human gate decision"
    );
  });

  it("prioritizes explicit delivery target role over recipient agent matching", async () => {
    const calls: string[][] = [];
    const runner: TmuxRunner = (args): Promise<TmuxRunResult> => {
      calls.push(args);
      if (args[0] === "capture-pane") {
        return Promise.resolve({
          stdout:
            "# [pairflow] r1 TASK orchestrator->codex msg=msg_20260222_201 ref=artifact://meta-review-task.md.",
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
      bubbleConfig: createSharedAgentConfig("codex"),
      sessionsPath: "/tmp/repo/.pairflow/runtime/sessions.json",
      envelope: createEnvelope({
        id: "msg_20260222_201",
        sender: "orchestrator",
        recipient: "codex",
        type: "TASK",
        payload: {
          summary: "Run meta-review now.",
          metadata: {
            [deliveryTargetRoleMetadataKey]: "meta_reviewer"
          }
        },
        refs: ["artifact://meta-review-task.md"]
      }),
      runner,
      readSessionsRegistry: () => Promise.resolve(createRegistry())
    });

    expect(result.delivered).toBe(true);
    expect(result.targetPaneIndex).toBe(3);
    expect(
      calls.some((call) => call[0] === "send-keys" && call[2] === "pf-b_delivery_01:0.3")
    ).toBe(true);
  });

  it("falls back to legacy recipient mapping when delivery target role token is invalid", async () => {
    const calls: string[][] = [];
    const runner: TmuxRunner = (args): Promise<TmuxRunResult> => {
      calls.push(args);
      if (args[0] === "capture-pane") {
        return Promise.resolve({
          stdout:
            "# [pairflow] r1 PASS claude->codex msg=msg_20260222_202 ref=artifact://handoff.md.",
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
      bubbleConfig: createSharedAgentConfig("codex"),
      sessionsPath: "/tmp/repo/.pairflow/runtime/sessions.json",
      envelope: createEnvelope({
        id: "msg_20260222_202",
        sender: "claude",
        recipient: "codex",
        payload: {
          summary: "Fallback expected.",
          metadata: {
            [deliveryTargetRoleMetadataKey]: "meta-reviewer"
          }
        }
      }),
      runner,
      readSessionsRegistry: () => Promise.resolve(createRegistry())
    });

    expect(result.delivered).toBe(true);
    expect(result.targetPaneIndex).toBe(1);
    expect(result.deliveryTargetReasonCode).toBe("DELIVERY_TARGET_ROLE_INVALID");
    expect(
      calls.some((call) => call[0] === "send-keys" && call[2] === "pf-b_delivery_01:0.1")
    ).toBe(true);
  });

  it("falls back to legacy recipient mapping when explicit role is valid but pane index is unmapped", async () => {
    const mutablePaneIndices = runtimePaneIndices as {
      metaReviewer: number | undefined;
    };
    const originalMetaReviewerPaneIndex = mutablePaneIndices.metaReviewer;
    mutablePaneIndices.metaReviewer = undefined;
    try {
      const calls: string[][] = [];
      const runner: TmuxRunner = (args): Promise<TmuxRunResult> => {
        calls.push(args);
        if (args[0] === "capture-pane") {
          return Promise.resolve({
            stdout:
              "# [pairflow] r1 TASK orchestrator->codex msg=msg_20260222_203 ref=artifact://meta-review-task.md.",
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
        bubbleConfig: createSharedAgentConfig("codex"),
        sessionsPath: "/tmp/repo/.pairflow/runtime/sessions.json",
        envelope: createEnvelope({
          id: "msg_20260222_203",
          sender: "orchestrator",
          recipient: "codex",
          type: "TASK",
          payload: {
            summary: "Meta-review dispatch fallback expected.",
            metadata: {
              [deliveryTargetRoleMetadataKey]: "meta_reviewer"
            }
          },
          refs: ["artifact://meta-review-task.md"]
        }),
        runner,
        readSessionsRegistry: () => Promise.resolve(createRegistry())
      });

      expect(result.delivered).toBe(true);
      expect(result.targetPaneIndex).toBe(1);
      expect(result.deliveryTargetReasonCode).toBe("DELIVERY_TARGET_ROLE_UNMAPPED");
      expect(
        calls.some((call) => call[0] === "send-keys" && call[2] === "pf-b_delivery_01:0.1")
      ).toBe(true);
    } finally {
      mutablePaneIndices.metaReviewer = originalMetaReviewerPaneIndex;
    }
  });

  it("keeps role-target routing parity for shared non-codex agent identities", async () => {
    const calls: string[][] = [];
    const runner: TmuxRunner = (args): Promise<TmuxRunResult> => {
      calls.push(args);
      if (args[0] === "capture-pane") {
        return Promise.resolve({
          stdout:
            "# [pairflow] r1 PASS codex->claude msg=msg_20260222_204 ref=artifact://handoff.md.",
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
      bubbleConfig: createSharedAgentConfig("claude"),
      sessionsPath: "/tmp/repo/.pairflow/runtime/sessions.json",
      envelope: createEnvelope({
        id: "msg_20260222_204",
        sender: "codex",
        recipient: "claude",
        payload: {
          summary: "Route to reviewer pane.",
          metadata: {
            [deliveryTargetRoleMetadataKey]: "reviewer"
          }
        }
      }),
      runner,
      readSessionsRegistry: () => Promise.resolve(createRegistry())
    });

    expect(result.delivered).toBe(true);
    expect(result.targetPaneIndex).toBe(2);
    expect(
      calls.some((call) => call[0] === "send-keys" && call[2] === "pf-b_delivery_01:0.2")
    ).toBe(true);
  });

  it("routes HUMAN_REPLY to the explicit active role pane when agent identity is shared", async () => {
    const calls: string[][] = [];
    const runner: TmuxRunner = (args): Promise<TmuxRunResult> => {
      calls.push(args);
      if (args[0] === "capture-pane") {
        return Promise.resolve({
          stdout:
            "# [pairflow] r2 HUMAN_REPLY human->codex msg=msg_20260222_205 ref=artifact://reply.md.",
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
      bubbleConfig: createSharedAgentConfig("codex"),
      sessionsPath: "/tmp/repo/.pairflow/runtime/sessions.json",
      envelope: createEnvelope({
        id: "msg_20260222_205",
        sender: "human",
        recipient: "codex",
        type: "HUMAN_REPLY",
        round: 2,
        payload: {
          message: "Please continue reviewer analysis.",
          metadata: {
            [deliveryTargetRoleMetadataKey]: "reviewer"
          }
        },
        refs: ["artifact://reply.md"]
      }),
      runner,
      readSessionsRegistry: () => Promise.resolve(createRegistry())
    });

    expect(result.delivered).toBe(true);
    expect(result.targetPaneIndex).toBe(2);
    expect(
      calls.some((call) => call[0] === "send-keys" && call[2] === "pf-b_delivery_01:0.2")
    ).toBe(true);
  });

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
      reviewerBrief: "Verify factual claims against cited sources.",
      reviewerFocus: {
        status: "present",
        source: "section",
        focus_text: "- Validate reason-code fallback behavior",
        focus_items: ["Validate reason-code fallback behavior"]
      },
      runner,
      readSessionsRegistry: () => Promise.resolve(createRegistry()),
      deliveryAttempts: 2
    });

    expect(result.delivered).toBe(true);
    expect(result.sessionName).toBe("pf-b_delivery_01");
    expect(result.targetPaneIndex).toBe(2);
    expect(result.deliveryTargetReasonCode).toBe("DELIVERY_TARGET_ROLE_ABSENT");
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
    expect(messageCall?.[4]).toContain("Phase 1 reviewer round flow (prompt-level only):");
    expect(messageCall?.[4]).toContain("`Parallel Scout Scan`");
    expect(messageCall?.[4]).toContain(
      "same current worktree diff scope (`max_scout_agents=2` hard cap)"
    );
    expect(messageCall?.[4]).toContain("`required_scout_agents=2`");
    expect(messageCall?.[4]).toContain("`max_scout_agents=2`");
    expect(messageCall?.[4]).toContain("`max_scout_candidates_per_agent=8`");
    expect(messageCall?.[4]).toContain("`max_class_expansions_per_round=2`");
    expect(messageCall?.[4]).toContain("`max_expansion_siblings_per_class=5`");
    expect(messageCall?.[4]).toContain(
      "Summary scope guardrail: scope statements must cover only current worktree changes."
    );
    expect(messageCall?.[4]).toContain(
      "For summary scope claims, do not use branch-range diffs such as `git diff <revA>..<revB>` (including `git diff main..HEAD`)."
    );
    expect(messageCall?.[4]).not.toContain(
      "For summary scope claims, do not use `git diff main..HEAD` or any branch-range diff (`<revA>..<revB>`)."
    );
    expect(messageCall?.[4]).toContain(
      "Do not derive summary scope from history/log sources such as `git log --name-status` or `git show --name-status`."
    );
    expect(messageCall?.[4]).toContain(
      "Establish scope from current worktree changes using `git diff --name-status` + `git diff --cached --name-status` + `git ls-files --others --exclude-standard` (staged, unstaged, and untracked)."
    );
    expect(messageCall?.[4]).toContain(
      "If current worktree scope cannot be resolved reliably, avoid numeric file-operation claims."
    );
    expect(messageCall?.[4]).toMatch(/(<revA>\.\.<revB>|main\.\.HEAD)/);
    expect(messageCall?.[4]).toMatch(/git\s+(log|show)\s+--name-status/);
    expect(messageCall?.[4]).toMatch(/git diff --name-status/);
    expect(messageCall?.[4]).toMatch(
      /(cannot be resolved reliably|avoid numeric file-operation claims)/i
    );
    expect(messageCall?.[4]).toContain("Stop rules: stop expansion immediately when no new concrete locations are found");
    expect(messageCall?.[4]).toContain("repo-wide expansion scans are forbidden");
    expect(messageCall?.[4]).toContain("Required reviewer output contract (machine-checkable)");
    expect(messageCall?.[4]).toContain("`Scout Coverage`");
    expect(messageCall?.[4]).toContain("`Deduplicated Findings`");
    expect(messageCall?.[4]).toContain("`Issue-Class Expansions`");
    expect(messageCall?.[4]).toContain("`Residual Risk / Notes`");
    expect(messageCall?.[4]).toContain("`scouts_executed`, `scope_covered`, `guardrail_confirmation`, `raw_candidates_count`, `deduplicated_count`");
    expect(messageCall?.[4]).toContain(
      "`Scout Coverage.scope_covered` must describe current worktree changes only"
    );
    expect(messageCall?.[4]).toContain(
      "grounded in `git diff --name-status` + `git diff --cached --name-status` + `git ls-files --others --exclude-standard`."
    );
    expect(messageCall?.[4]).not.toContain(
      "`Scout Coverage.scope_covered` must cover only current worktree changes, grounded in `git diff HEAD --name-status` + `git ls-files --others --exclude-standard` or the combined trio `git diff --name-status` + `git diff --cached --name-status` + `git ls-files --others --exclude-standard`."
    );
    expect(messageCall?.[4]).toContain(
      "Do not justify `scope_covered` with branch-range diffs such as `git diff <revA>..<revB>` (including `git diff main..HEAD`)."
    );
    expect(messageCall?.[4]).toContain(
      "Do not justify `scope_covered` with history/log sources such as `git log --name-status` or `git show --name-status`."
    );
    expect(messageCall?.[4]).toContain("`title`, `severity`, `class`, `locations`, `evidence`, `expansion_siblings`");
    expect(messageCall?.[4]).toContain("`class`, `source_finding_title`, `scan_scope`, `siblings`, `stop_reason`");
    expect(messageCall?.[4]).toContain("`Deduplicated Findings: []`");
    expect(messageCall?.[4]).toContain("`Issue-Class Expansions: []`");
    expectReviewerValidationClaimGuardrails(messageCall?.[4]);
    expect(messageCall?.[4]).toContain(
      "Execute pairflow commands directly (no confirmation prompt)"
    );
    expect(messageCall?.[4]).toContain(
      "Reviewer brief reminder (from reviewer-brief.md): Verify factual claims against cited sources."
    );
    expect(messageCall?.[4]).toContain(
      "Reviewer focus reminder (bridged from reviewer-focus.json): - Validate reason-code fallback behavior"
    );
    expect(messageCall?.[4]).toContain(REVIEWER_COMMAND_GATE_REQ_A);
    expect(messageCall?.[4]).toContain(REVIEWER_COMMAND_GATE_REQ_D);
    expect(messageCall?.[4]).not.toContain(REVIEWER_COMMAND_GATE_REQ_B);
    expect(messageCall?.[4]).not.toContain(REVIEWER_COMMAND_GATE_REQ_C);
    expect(messageCall?.[4]).not.toContain(REVIEWER_COMMAND_GATE_REQ_E);
    expectNoForbiddenReviewerCommandGateTokens(messageCall?.[4]);
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

  it("omits reviewer focus reminder text when reviewer focus status is absent", async () => {
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

    const result = await emitTmuxDeliveryNotification({
      bubbleId: "b_delivery_01",
      bubbleConfig: {
        ...baseConfig,
        reviewer_context_mode: "fresh"
      },
      sessionsPath: "/tmp/repo/.pairflow/runtime/sessions.json",
      envelope: createEnvelope(),
      reviewerFocus: {
        status: "absent",
        source: "none",
        reason_code: "REVIEWER_FOCUS_ABSENT"
      },
      runner,
      readSessionsRegistry: () => Promise.resolve(createRegistry()),
      deliveryAttempts: 2
    });

    expect(result.delivered).toBe(true);
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
    expect(messageCall?.[4]).not.toContain(
      "Reviewer focus reminder (bridged from reviewer-focus.json):"
    );
    expect(messageCall?.[4]).not.toContain("reviewer-focus.json):");
  });

  it("renders docs-only skip directive reason without extra tmux formatting changes", async () => {
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
      reason_detail: "docs-only scope, runtime checks not required",
      verification_status: "trusted"
    };

    await emitTmuxDeliveryNotification({
      bubbleId: "b_delivery_01",
      bubbleConfig: {
        ...baseConfig,
        review_artifact_type: "document",
        reviewer_context_mode: "fresh"
      },
      sessionsPath: "/tmp/repo/.pairflow/runtime/sessions.json",
      envelope: createEnvelope(),
      reviewerTestDirective,
      runner,
      readSessionsRegistry: () => Promise.resolve(createRegistry()),
      deliveryAttempts: 2
    });

    const messageCall = calls.find(
      (call) =>
        call[0] === "send-keys" &&
        call[2] === "pf-b_delivery_01:0.2" &&
        call[3] === "-l" &&
        call[4]?.includes("# [pairflow] r1 PASS codex->claude")
    );
    expect(messageCall?.[4]).toContain(
      "Implementer test evidence has been orchestrator-verified."
    );
    expect(messageCall?.[4]).toContain(
      "Do not re-run full tests unless a trigger from the decision matrix applies."
    );
    expect(messageCall?.[4]).toContain(
      "Reason: docs-only scope, runtime checks not required"
    );
    expectReviewerValidationClaimGuardrails(messageCall?.[4]);
    expect(messageCall?.[4]).not.toContain(
      "  Execute pairflow commands directly (no confirmation prompt)."
    );
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
    expect(messageCall?.[4]).toContain("Phase 1 reviewer round flow (prompt-level only):");
    expect(messageCall?.[4]).toContain(
      "Summary scope guardrail: scope statements must cover only current worktree changes."
    );
    expect(messageCall?.[4]).toContain(
      "For summary scope claims, do not use branch-range diffs such as `git diff <revA>..<revB>` (including `git diff main..HEAD`)."
    );
    expect(messageCall?.[4]).not.toContain(
      "For summary scope claims, do not use `git diff main..HEAD` or any branch-range diff (`<revA>..<revB>`)."
    );
    expect(messageCall?.[4]).toContain(
      "Do not derive summary scope from history/log sources such as `git log --name-status` or `git show --name-status`."
    );
    expect(messageCall?.[4]).toContain(
      "Establish scope from current worktree changes using `git diff --name-status` + `git diff --cached --name-status` + `git ls-files --others --exclude-standard` (staged, unstaged, and untracked)."
    );
    expect(messageCall?.[4]).toContain(
      "If current worktree scope cannot be resolved reliably, avoid numeric file-operation claims."
    );
    expect(messageCall?.[4]).toMatch(/(<revA>\.\.<revB>|main\.\.HEAD)/);
    expect(messageCall?.[4]).toMatch(/git\s+(log|show)\s+--name-status/);
    expect(messageCall?.[4]).toMatch(/git diff --name-status/);
    expect(messageCall?.[4]).toMatch(
      /(cannot be resolved reliably|avoid numeric file-operation claims)/i
    );
    expect(messageCall?.[4]).toContain(
      "`Scout Coverage.scope_covered` must describe current worktree changes only"
    );
    expect(messageCall?.[4]).toContain(
      "grounded in `git diff --name-status` + `git diff --cached --name-status` + `git ls-files --others --exclude-standard`."
    );
    expect(messageCall?.[4]).not.toContain(
      "`Scout Coverage.scope_covered` must cover only current worktree changes, grounded in `git diff HEAD --name-status` + `git ls-files --others --exclude-standard` or the combined trio `git diff --name-status` + `git diff --cached --name-status` + `git ls-files --others --exclude-standard`."
    );
    expect(messageCall?.[4]).toContain(
      "Do not justify `scope_covered` with branch-range diffs such as `git diff <revA>..<revB>` (including `git diff main..HEAD`)."
    );
    expect(messageCall?.[4]).toContain(
      "Do not justify `scope_covered` with history/log sources such as `git log --name-status` or `git show --name-status`."
    );
    expect(messageCall?.[4]).not.toContain(
      "Full canonical ontology (embedded from `docs/reviewer-severity-ontology.md`)"
    );
    expect(messageCall?.[4]).not.toContain(
      "Reviewer brief reminder (from reviewer-brief.md):"
    );
  });

  it("injects clean-path round>=2 command gate for reviewer handoff", async () => {
    const calls: string[][] = [];
    const runner: TmuxRunner = (args): Promise<TmuxRunResult> => {
      calls.push(args);
      if (args[0] === "capture-pane") {
        return Promise.resolve({
          stdout:
            "# [pairflow] r2 PASS codex->claude msg=msg_20260222_102 ref=artifact://handoff.md. Action: Implementer handoff received.",
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
        id: "msg_20260222_102",
        round: 2
      }),
      runner,
      readSessionsRegistry: () => Promise.resolve(createRegistry())
    });

    const messageCall = calls.find(
      (call) =>
        call[0] === "send-keys" &&
        call[2] === "pf-b_delivery_01:0.2" &&
        call[3] === "-l" &&
        call[4]?.includes("# [pairflow] r2 PASS codex->claude")
    );
    expect(messageCall?.[4]).toContain(REVIEWER_COMMAND_GATE_REQ_B);
    expect(messageCall?.[4]).toContain(REVIEWER_COMMAND_GATE_REQ_C);
    expect(messageCall?.[4]).toContain(REVIEWER_COMMAND_GATE_REQ_D);
    expect(messageCall?.[4]).not.toContain(REVIEWER_COMMAND_GATE_REQ_A);
    expect(messageCall?.[4]).not.toContain(REVIEWER_COMMAND_GATE_REQ_E);
    expectNoForbiddenReviewerCommandGateTokens(messageCall?.[4]);
  });

  it("injects findings-path round>=2 command gate for reviewer handoff", async () => {
    const calls: string[][] = [];
    const runner: TmuxRunner = (args): Promise<TmuxRunResult> => {
      calls.push(args);
      if (args[0] === "capture-pane") {
        return Promise.resolve({
          stdout:
            "# [pairflow] r2 PASS codex->claude msg=msg_20260222_103 ref=artifact://handoff.md. Action: Implementer handoff received.",
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
        id: "msg_20260222_103",
        round: 2,
        payload: {
          summary: "handoff with explicit findings context",
          findings: [
            {
              severity: "P2",
              title: "existing finding context"
            }
          ]
        }
      }),
      runner,
      readSessionsRegistry: () => Promise.resolve(createRegistry())
    });

    const messageCall = calls.find(
      (call) =>
        call[0] === "send-keys" &&
        call[2] === "pf-b_delivery_01:0.2" &&
        call[3] === "-l" &&
        call[4]?.includes("# [pairflow] r2 PASS codex->claude")
    );
    expect(messageCall?.[4]).toContain(REVIEWER_COMMAND_GATE_REQ_E);
    expect(messageCall?.[4]).toContain(REVIEWER_COMMAND_GATE_REQ_C);
    expect(messageCall?.[4]).toContain(REVIEWER_COMMAND_GATE_REQ_D);
    expect(messageCall?.[4]).not.toContain(REVIEWER_COMMAND_GATE_REQ_A);
    expect(messageCall?.[4]).not.toContain(REVIEWER_COMMAND_GATE_REQ_B);
    expectNoForbiddenReviewerCommandGateTokens(messageCall?.[4]);
  });

  it("keeps shared command-gate invariants across round>=2 clean and findings projections", async () => {
    const calls: string[][] = [];
    let lastDeliveryMessage = "";
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
        id: "msg_20260222_104",
        round: 2
      }),
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
        id: "msg_20260222_105",
        round: 2,
        payload: {
          summary: "handoff findings branch",
          findings: [
            {
              severity: "P2",
              title: "finding"
            }
          ]
        }
      }),
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
    const cleanMessage = reviewerMessages[0]?.[4] ?? "";
    const findingsMessage = reviewerMessages[1]?.[4] ?? "";

    expect(cleanMessage).toContain(REVIEWER_COMMAND_GATE_REQ_C);
    expect(cleanMessage).toContain(REVIEWER_COMMAND_GATE_REQ_D);
    expect(cleanMessage).toContain(REVIEWER_COMMAND_GATE_REQ_B);
    expect(cleanMessage).not.toContain(REVIEWER_COMMAND_GATE_REQ_E);
    expect(findingsMessage).toContain(REVIEWER_COMMAND_GATE_REQ_C);
    expect(findingsMessage).toContain(REVIEWER_COMMAND_GATE_REQ_D);
    expect(findingsMessage).toContain(REVIEWER_COMMAND_GATE_REQ_E);
    expect(findingsMessage).not.toContain(REVIEWER_COMMAND_GATE_REQ_B);
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
      expect(messageCall[4]).toContain(
        "For summary scope claims, do not use branch-range diffs such as `git diff <revA>..<revB>` (including `git diff main..HEAD`)."
      );
      expect(messageCall[4]).toContain(
        "Do not derive summary scope from history/log sources such as `git log --name-status` or `git show --name-status`."
      );
      expect(messageCall[4]).toContain(
        "Establish scope from current worktree changes using `git diff --name-status` + `git diff --cached --name-status` + `git ls-files --others --exclude-standard` (staged, unstaged, and untracked)."
      );
      expect(messageCall[4]).toContain(
        "Do not justify `scope_covered` with branch-range diffs such as `git diff <revA>..<revB>` (including `git diff main..HEAD`)."
      );
      expect(messageCall[4]).toContain(
        "Do not justify `scope_covered` with history/log sources such as `git log --name-status` or `git show --name-status`."
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
    expect(messageCall?.[4]).toContain("Phase 1 reviewer round flow (prompt-level only):");
    expect(messageCall?.[4]).toContain("Required reviewer output contract (machine-checkable)");
    expect(messageCall?.[4]).toContain(
      "same current worktree diff scope (`max_scout_agents=2` hard cap)"
    );
    expect(messageCall?.[4]).toContain(
      "Summary scope guardrail: scope statements must cover only current worktree changes."
    );
    expect(messageCall?.[4]).toContain(
      "For summary scope claims, do not use branch-range diffs such as `git diff <revA>..<revB>` (including `git diff main..HEAD`)."
    );
    expect(messageCall?.[4]).not.toContain(
      "For summary scope claims, do not use `git diff main..HEAD` or any branch-range diff (`<revA>..<revB>`)."
    );
    expect(messageCall?.[4]).toContain(
      "Do not derive summary scope from history/log sources such as `git log --name-status` or `git show --name-status`."
    );
    expect(messageCall?.[4]).toContain(
      "Establish scope from current worktree changes using `git diff --name-status` + `git diff --cached --name-status` + `git ls-files --others --exclude-standard` (staged, unstaged, and untracked)."
    );
    expect(messageCall?.[4]).toContain(
      "If current worktree scope cannot be resolved reliably, avoid numeric file-operation claims."
    );
    expect(messageCall?.[4]).toContain(
      "`Scout Coverage.scope_covered` must describe current worktree changes only"
    );
    expect(messageCall?.[4]).toContain(
      "grounded in `git diff --name-status` + `git diff --cached --name-status` + `git ls-files --others --exclude-standard`."
    );
    expect(messageCall?.[4]).not.toContain(
      "`Scout Coverage.scope_covered` must cover only current worktree changes, grounded in `git diff HEAD --name-status` + `git ls-files --others --exclude-standard` or the combined trio `git diff --name-status` + `git diff --cached --name-status` + `git ls-files --others --exclude-standard`."
    );
    expect(messageCall?.[4]).toContain(
      "Do not justify `scope_covered` with branch-range diffs such as `git diff <revA>..<revB>` (including `git diff main..HEAD`)."
    );
    expect(messageCall?.[4]).toContain(
      "Do not justify `scope_covered` with history/log sources such as `git log --name-status` or `git show --name-status`."
    );
    expectReviewerValidationClaimGuardrails(messageCall?.[4]);
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
    expect(messageCall?.[4]).toContain(REVIEWER_COMMAND_GATE_REQ_D);
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

  it("routes explicit status delivery target to status pane for non-status recipients", async () => {
    const calls: string[][] = [];
    const runner: TmuxRunner = (args): Promise<TmuxRunResult> => {
      calls.push(args);
      if (args[0] === "capture-pane") {
        return Promise.resolve({
          stdout:
            "# [pairflow] r2 APPROVAL_REQUEST orchestrator->codex msg=msg_20260222_206 ref=artifact://approval.md.",
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
      bubbleConfig: createSharedAgentConfig("codex"),
      sessionsPath: "/tmp/repo/.pairflow/runtime/sessions.json",
      envelope: createEnvelope({
        id: "msg_20260222_206",
        sender: "orchestrator",
        recipient: "codex",
        type: "APPROVAL_REQUEST",
        round: 2,
        payload: {
          summary: "Human gate is pending.",
          metadata: {
            [deliveryTargetRoleMetadataKey]: "status"
          }
        },
        refs: ["artifact://approval.md"]
      }),
      runner,
      readSessionsRegistry: () => Promise.resolve(createRegistry())
    });

    expect(result.delivered).toBe(true);
    expect(result.targetPaneIndex).toBe(0);
    expect(
      calls.some((call) => call[0] === "send-keys" && call[2] === "pf-b_delivery_01:0.0")
    ).toBe(true);
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
      "Bubble is READY_FOR_HUMAN_APPROVAL. Stop coding and wait for human decision"
    );
  });

  it("routes rework approval decision to implementer pane with rework instruction", async () => {
    const reworkRef = buildTranscriptFallbackRef(
      "b_delivery_01",
      "/tmp/repo/.pairflow/runtime/sessions.json",
      "msg_20260222_101"
    );
    const calls: string[][] = [];
    const runner: TmuxRunner = (args): Promise<TmuxRunResult> => {
      calls.push(args);
      if (args[0] === "capture-pane") {
        return Promise.resolve({
          stdout: `# [pairflow] r2 APPROVAL_DECISION human->codex msg=msg_20260222_101 ref=${reworkRef}.`,
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
      messageRef: reworkRef,
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

  it("uses docs-only implementer guidance that avoids skip-claim and runtime-log-ref contradiction", async () => {
    async function deliverToImplementer(
      envelope: ProtocolEnvelope
    ): Promise<string | undefined> {
      const calls: string[][] = [];
      const runner: TmuxRunner = (args): Promise<TmuxRunResult> => {
        calls.push(args);
        if (args[0] === "capture-pane") {
          return Promise.resolve({
            stdout: `# [pairflow] r${envelope.round} ${envelope.type} ${envelope.sender}->${envelope.recipient} msg=${envelope.id} ref=artifact://handoff.md.`,
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
        envelope,
        runner,
        readSessionsRegistry: () => Promise.resolve(createRegistry())
      });

      return calls.find(
        (call) =>
          call[0] === "send-keys" &&
          call[2] === "pf-b_delivery_01:0.1" &&
          call[3] === "-l" &&
          call[4]?.includes(`${envelope.type} ${envelope.sender}->${envelope.recipient}`)
      )?.[4];
    }

    const passMessage = await deliverToImplementer(
      createEnvelope({
        sender: "claude",
        recipient: "codex",
        type: "PASS",
        payload: {
          summary: "Fix request from reviewer"
        }
      })
    );
    expect(passMessage).toContain(
      "Docs-only scope: choose one mode and keep it consistent in the same PASS."
    );
    expect(passMessage).toContain(
      "Primary artifact rule (docs-only): when the task references an existing source document/task file, refine that file directly (in-place) as the main output."
    );
    expect(passMessage).toContain(
      "Do not replace primary artifact refinement with a new standalone review/synthesis document unless the task explicitly requests creating a new file path."
    );
    expect(passMessage).toContain(
      "Mode A (skip-claim): summary says runtime checks were intentionally not executed -> attach no `.pairflow/evidence/*.log` refs."
    );
    expect(passMessage).toContain(
      "Mode B (checks executed): attach refs only for commands actually run and do not claim checks were intentionally not executed."
    );
    expect(passMessage).not.toContain(
      "If `.pairflow/evidence/*.log` files exist, include them as `--ref`"
    );

    const humanReplyMessage = await deliverToImplementer(
      createEnvelope({
        sender: "human",
        recipient: "codex",
        type: "HUMAN_REPLY",
        payload: {
          message: "Please clarify section 2."
        }
      })
    );
    expect(humanReplyMessage).toContain(
      "Docs-only scope: keep summary and refs consistent; skip-claim means no `.pairflow/evidence/*.log` refs in that PASS."
    );
    expect(humanReplyMessage).toContain(
      "Primary artifact rule (docs-only): refine the referenced source task/document file directly, not only a new standalone review note."
    );
    expect(humanReplyMessage).not.toContain(
      "Include available `.pairflow/evidence/*.log` refs on PASS."
    );

    const reworkMessage = await deliverToImplementer(
      createEnvelope({
        sender: "human",
        recipient: "codex",
        type: "APPROVAL_DECISION",
        payload: {
          decision: "revise",
          message: "Please revise the docs update."
        }
      })
    );
    expect(reworkMessage).toContain(
      "Docs-only scope: keep summary and refs consistent; skip-claim means no `.pairflow/evidence/*.log` refs in that PASS."
    );
    expect(reworkMessage).toContain(
      "Primary artifact rule (docs-only): apply the rework on the referenced source task/document file directly, not only in a new standalone review note."
    );
    expect(reworkMessage).not.toContain(
      "Include available `.pairflow/evidence/*.log` refs on PASS."
    );
  });

  it("keeps non-document implementer delivery guidance free of docs-only mode text", async () => {
    const calls: string[][] = [];
    const runner: TmuxRunner = (args): Promise<TmuxRunResult> => {
      calls.push(args);
      if (args[0] === "capture-pane") {
        return Promise.resolve({
          stdout:
            "# [pairflow] r1 PASS claude->codex msg=msg_20260222_101 ref=artifact://handoff.md.",
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
      bubbleConfig: {
        ...baseConfig,
        review_artifact_type: "code"
      },
      sessionsPath: "/tmp/repo/.pairflow/runtime/sessions.json",
      envelope: createEnvelope({
        sender: "claude",
        recipient: "codex",
        type: "PASS",
        payload: {
          summary: "Please apply reviewer fixes."
        }
      }),
      runner,
      readSessionsRegistry: () => Promise.resolve(createRegistry())
    });

    expect(result.delivered).toBe(true);
    const passToImplementerCall = calls.find(
      (call) =>
        call[0] === "send-keys" &&
        call[2] === "pf-b_delivery_01:0.1" &&
        call[3] === "-l" &&
        call[4]?.includes("PASS claude->codex")
    );
    expect(passToImplementerCall?.[4]).toContain(
      "If `.pairflow/evidence/*.log` files exist, include them as `--ref` (lint/typecheck/test)."
    );
    expect(passToImplementerCall?.[4]).toContain(
      "Default command profile is `external`; Pairflow commands are resolved from PATH."
    );
    expect(passToImplementerCall?.[4]).toContain(
      "--pairflow-command-profile self_host"
    );
    expect(passToImplementerCall?.[4]).not.toContain(
      "Docs-only scope: choose one mode and keep it consistent in the same PASS."
    );
    expect(passToImplementerCall?.[4]).not.toContain("Mode A (skip-claim)");
  });

  it("uses absolute transcript path fallback ref when envelope has no refs", async () => {
    const fallbackRef = buildTranscriptFallbackRef(
      "b_delivery_01",
      "/tmp/repo/.pairflow/runtime/sessions.json",
      "msg_20260222_101"
    );
    const calls: string[][] = [];
    const runner: TmuxRunner = (args): Promise<TmuxRunResult> => {
      calls.push(args);
      if (args[0] === "capture-pane") {
        return Promise.resolve({
          stdout: `# [pairflow] r1 PASS codex->claude msg=msg_20260222_101 ref=${fallbackRef}.`,
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
        refs: []
      }),
      runner,
      readSessionsRegistry: () => Promise.resolve(createRegistry())
    });

    expect(result.delivered).toBe(true);
    const messageCall = calls.find(
      (call) =>
        call[0] === "send-keys" &&
        call[2] === "pf-b_delivery_01:0.2" &&
        call[3] === "-l" &&
        call[4]?.includes("# [pairflow] r1 PASS codex->claude")
    );
    expect(messageCall?.[4]).toContain(`ref=${fallbackRef}.`);
    expect(messageCall?.[4]).not.toContain("ref=transcript.ndjson#");
  });

  it("uses envelope refs[0] when explicit messageRef is not provided", async () => {
    const calls: string[][] = [];
    const runner: TmuxRunner = (args): Promise<TmuxRunResult> => {
      calls.push(args);
      if (args[0] === "capture-pane") {
        return Promise.resolve({
          stdout:
            "# [pairflow] r1 PASS codex->claude msg=msg_20260222_101 ref=artifact://priority-source.md.",
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
        refs: ["artifact://priority-source.md"]
      }),
      runner,
      readSessionsRegistry: () => Promise.resolve(createRegistry())
    });

    expect(result.delivered).toBe(true);
    const messageCall = calls.find(
      (call) =>
        call[0] === "send-keys" &&
        call[2] === "pf-b_delivery_01:0.2" &&
        call[3] === "-l" &&
        call[4]?.includes("# [pairflow] r1 PASS codex->claude")
    );
    expect(messageCall?.[4]).toContain("ref=artifact://priority-source.md.");
    expect(messageCall?.[4]).not.toContain("/.pairflow/bubbles/b_delivery_01/transcript.ndjson#");
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
      "Bubble is READY_FOR_HUMAN_APPROVAL. Review is complete; wait for human decision"
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

  it("preserves unsupported-recipient behavior when explicit role and legacy recipient routes are both unavailable", async () => {
    const mutablePaneIndices = runtimePaneIndices as {
      metaReviewer: number | undefined;
    };
    const originalMetaReviewerPaneIndex = mutablePaneIndices.metaReviewer;
    mutablePaneIndices.metaReviewer = undefined;
    try {
      const result = await emitTmuxDeliveryNotification({
        bubbleId: "b_delivery_01",
        bubbleConfig: createSharedAgentConfig("claude"),
        sessionsPath: "/tmp/repo/.pairflow/runtime/sessions.json",
        envelope: createEnvelope({
          id: "msg_20260222_401",
          sender: "orchestrator",
          recipient: "codex",
          type: "TASK",
          payload: {
            summary: "Unmapped explicit + unsupported legacy route.",
            metadata: {
              [deliveryTargetRoleMetadataKey]: "meta_reviewer"
            }
          },
          refs: ["artifact://meta-review-task.md"]
        }),
        readSessionsRegistry: () => Promise.resolve(createRegistry())
      });

      expect(result).toMatchObject({
        delivered: false,
        reason: "unsupported_recipient",
        deliveryTargetReasonCode: "DELIVERY_TARGET_ROLE_UNMAPPED"
      });
    } finally {
      mutablePaneIndices.metaReviewer = originalMetaReviewerPaneIndex;
    }
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
      reason: "registry_read_failed",
      deliveryTargetReasonCode: "DELIVERY_TARGET_REGISTRY_READ_FAILED"
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

  it("detects marker stuck when prompt line has pane-border prefix", async () => {
    const calls: string[][] = [];
    let captureCount = 0;
    const runner: TmuxRunner = (args): Promise<TmuxRunResult> => {
      calls.push(args);
      if (args[0] === "capture-pane") {
        captureCount += 1;
        if (captureCount <= 2) {
          return Promise.resolve({
            stdout: [
              "Claude Code is ready.",
              "",
              "│ ❯ # [pairflow] r1 PASS codex->claude msg=msg_20260222_101 ref=artifact://handoff.md."
            ].join("\n"),
            stderr: "",
            exitCode: 0
          });
        }
        return Promise.resolve({
          stdout: [
            "# [pairflow] r1 PASS codex->claude msg=msg_20260222_101 ref=artifact://handoff.md.",
            "",
            "│ ❯"
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
    const enterRetries = calls.filter(
      (call) =>
        call[0] === "send-keys" &&
        call[2] === "pf-b_delivery_01:0.2" &&
        call[3] === "Enter" &&
        call.length === 4
    );
    expect(enterRetries.length).toBeGreaterThanOrEqual(2);
  });

  it("returns delivery_unconfirmed when marker never appears", { timeout: 10_000 }, async () => {
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

describe("resolveDeliveryMessageRef", () => {
  it("applies messageRef -> envelope.ref -> transcript fallback priority in order", () => {
    const envelopeWithRef = createEnvelope({
      refs: ["artifact://primary.md"]
    });
    const envelopeWithoutRef = createEnvelope({
      refs: []
    });
    const sessionsPath = "/tmp/repo/.pairflow/runtime/sessions.json";

    expect(
      resolveDeliveryMessageRef({
        bubbleId: "b_delivery_01",
        sessionsPath,
        envelope: envelopeWithRef,
        messageRef: "manual://override"
      })
    ).toBe("manual://override");

    expect(
      resolveDeliveryMessageRef({
        bubbleId: "b_delivery_01",
        sessionsPath,
        envelope: envelopeWithRef
      })
    ).toBe("artifact://primary.md");

    expect(
      resolveDeliveryMessageRef({
        bubbleId: "b_delivery_01",
        sessionsPath,
        envelope: envelopeWithoutRef
      })
    ).toBe("/tmp/repo/.pairflow/bubbles/b_delivery_01/transcript.ndjson#msg_20260222_101");
  });
});

describe("buildTranscriptFallbackRef", () => {
  it("resolves .pairflow directory via marker lookup, not fixed dirname depth", () => {
    const ref = buildTranscriptFallbackRef(
      "b_delivery_01",
      "/tmp/repo/.pairflow/runtime/nested/sessions.json",
      "msg_20260222_101"
    );

    expect(ref).toBe(
      "/tmp/repo/.pairflow/bubbles/b_delivery_01/transcript.ndjson#msg_20260222_101"
    );
  });

  it("falls back to repo/.pairflow when sessions path lacks explicit .pairflow segment", () => {
    const ref = buildTranscriptFallbackRef(
      "b_delivery_01",
      "/tmp/repo/runtime/sessions.json",
      "msg_20260222_101"
    );

    expect(ref).toBe(
      "/tmp/repo/.pairflow/bubbles/b_delivery_01/transcript.ndjson#msg_20260222_101"
    );
  });

  it("does not mis-detect .pairflow-worktrees as .pairflow root", () => {
    const ref = buildTranscriptFallbackRef(
      "b_delivery_01",
      "/Users/felho/dev/.pairflow-worktrees/pairflow/transcript-ref-resolution-fix-implementation-01/.pairflow/runtime/sessions.json",
      "msg_20260222_101"
    );

    expect(ref).toBe(
      "/Users/felho/dev/.pairflow-worktrees/pairflow/transcript-ref-resolution-fix-implementation-01/.pairflow/bubbles/b_delivery_01/transcript.ndjson#msg_20260222_101"
    );
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

  it("treats pane-border-prefixed prompt as stuck-input prompt marker", async () => {
    const calls: string[][] = [];
    const runner: TmuxRunner = (args): Promise<TmuxRunResult> => {
      calls.push(args);
      if (args[0] === "capture-pane") {
        return Promise.resolve({
          stdout: [
            "Claude Code is ready.",
            "",
            "│ ❯ # [pairflow] r1 PASS codex->claude msg=msg_123 ref=handoff.md."
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
