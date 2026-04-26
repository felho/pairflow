import { describe, expect, it, vi } from "vitest";

import {
  buildTranscriptFallbackRef,
  emitDeliveryNotificationAck as emitDeliveryNotificationAckRuntime,
  resolveDeliveryMessageRef,
  retryStuckAgentInput
} from "../../../src/v11/infrastructure/channel/tmux/tmuxDelivery.js";
import {
  attemptTmuxDelivery,
  createAcceptedDeliveryAck,
  createRejectedDeliveryAck,
} from "../../../src/v11/infrastructure/channel/tmux/tmuxDeliveryRuntime.js";
import {
  resolveEnvelopeTargetPane
} from "../../../src/v11/infrastructure/channel/tmux/tmuxDeliveryTargeting.js";
import {
  buildMetaReviewSubmitApproveParityNote,
  buildMetaReviewSubmitCommandTemplate
} from "../../../src/v11/shared/metaReview/metaReviewSubmitGuidance.js";
import { BubbleWatchdogError } from "../../../src/v11/shared/watchdog/watchdogCommandError.js";
import {
  REVIEWER_COMMAND_GATE_FORBIDDEN,
  REVIEWER_COMMAND_GATE_REQ_A,
  REVIEWER_COMMAND_GATE_REQ_B,
  REVIEWER_COMMAND_GATE_REQ_C,
  REVIEWER_COMMAND_GATE_REQ_D,
  REVIEWER_COMMAND_GATE_REQ_E,
  REVIEWER_COMMAND_GATE_REQ_F
} from "../../../src/v11/shared/reviewer/reviewerCommandGateGuidance.js";
import type {
  RuntimeSessionRecord,
  RuntimeSessionsRegistry
} from "../../../src/v11/shared/ports/runtimeSessions.js";
import {
  runtimePaneIndices,
  type TmuxRunResult,
  type TmuxRunner
} from "../../../src/v11/infrastructure/channel/tmux/tmuxManager.js";
import * as roleDescriptorRegistry from "../../../src/v11/application/actorProtocol/roleDescriptorRegistry.js";
import type { ReviewerTestExecutionDirective } from "../../../src/v11/shared/reviewer/testEvidence.js";
import {
  resolveUniquelyConfiguredRoleForAgent,
  type BubbleConfig
} from "../../../src/types/bubble.js";
import {
  deliveryTargetRoleMetadataKey,
  type LegacyMetaReviewerProtocolRecipient,
  parseDeliveryTargetRoleMetadata,
  type DeliveryTargetRole,
  type ProtocolEnvelope
} from "../../../src/types/protocol.js";

const baseConfig: BubbleConfig = {
  id: "b_delivery_01",
  repo_path: "/tmp/repo",
  base_branch: "main",
  bubble_branch: "pf/b_delivery_01",
  work_mode: "worktree",
  quality_mode: "strict",
  review_artifact_type: "code",
  pairflow_command_profile: "external",
  reviewer_context_mode: "persistent",
  watchdog_timeout_minutes: 5,
  max_rounds: 8,
  severity_gate_round: 4,
  commit_requires_approval: true,
  attach_launcher: "auto",
  agents: {
    implementer: "codex",
    reviewer: "claude",
    meta_reviewer: "codex"
  },
  commands: {
    test: "pnpm test",
    typecheck: "pnpm typecheck"
  },
  notifications: {
    enabled: true
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

type CompatProtocolEnvelope = Omit<ProtocolEnvelope, "recipient"> & {
  recipient: ProtocolEnvelope["recipient"] | LegacyMetaReviewerProtocolRecipient;
};

type RuntimeSessionRecordOverrides = {
  [Key in keyof RuntimeSessionRecord]?: RuntimeSessionRecord[Key] | undefined;
};

function createRegistry(
  overrides: RuntimeSessionRecordOverrides = {}
): RuntimeSessionsRegistry {
  const record = {
    bubbleId: "b_delivery_01",
    repoPath: "/tmp/repo",
    worktreePath: "/tmp/worktree",
    workspacePath: "/tmp/worktree",
    workspaceKind: "worktree" as const,
    tmuxSessionName: "pf-b_delivery_01",
    updatedAt: "2026-02-22T12:00:00.000Z",
    ...overrides
  };
  return {
    b_delivery_01: {
      bubbleId: record.bubbleId ?? "b_delivery_01",
      repoPath: record.repoPath ?? "/tmp/repo",
      worktreePath: record.worktreePath ?? "/tmp/worktree",
      ...(record.workspacePath !== undefined
        ? { workspacePath: record.workspacePath }
        : {}),
      ...(record.workspaceKind !== undefined
        ? { workspaceKind: record.workspaceKind }
        : {}),
      tmuxSessionName: record.tmuxSessionName ?? "pf-b_delivery_01",
      updatedAt: record.updatedAt ?? "2026-02-22T12:00:00.000Z"
    }
  };
}

function mockUnmappedMetaReviewerPane(): {
  restore: () => void;
} {
  const getTopologySlotPaneIndexSpy = vi.spyOn(
    roleDescriptorRegistry,
    "getTopologySlotPaneIndex"
  );
  const getTopologySlotPaneIndexForRoleSpy = vi.spyOn(
    roleDescriptorRegistry,
    "getTopologySlotPaneIndexForRole"
  );

  getTopologySlotPaneIndexSpy.mockImplementation((slotId) => {
    switch (slotId) {
      case "meta_reviewer":
        return undefined as unknown as number;
      case "status":
        return roleDescriptorRegistry.topologySlotCatalog.status.pane_index;
      case "implementer":
        return roleDescriptorRegistry.topologySlotCatalog.implementer.pane_index;
      case "reviewer":
        return roleDescriptorRegistry.topologySlotCatalog.reviewer.pane_index;
    }
  });
  getTopologySlotPaneIndexForRoleSpy.mockImplementation((role) => {
    switch (role) {
      case "meta_reviewer":
        return undefined as unknown as number;
      case "implementer":
        return roleDescriptorRegistry.topologySlotCatalog.implementer.pane_index;
      case "reviewer":
        return roleDescriptorRegistry.topologySlotCatalog.reviewer.pane_index;
    }
  });

  return {
    restore: () => {
      getTopologySlotPaneIndexSpy.mockRestore();
      getTopologySlotPaneIndexForRoleSpy.mockRestore();
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
      reviewer: agent,
      meta_reviewer: "codex"
    }
  };
}

type TestEmitDeliveryNotificationInput =
  Omit<Parameters<typeof emitDeliveryNotificationAckRuntime>[0], "recipientRole"> & {
    recipientRole?: DeliveryTargetRole;
  };

function resolveLegacyRecipientRoleForTest(input: {
  envelope: CompatProtocolEnvelope;
  bubbleConfig: BubbleConfig;
}): DeliveryTargetRole | undefined {
  const parsed = parseDeliveryTargetRoleMetadata(input.envelope.payload.metadata);
  if (parsed.status === "valid") {
    return parsed.role;
  }
  if (input.envelope.recipient === "human" || input.envelope.recipient === "orchestrator") {
    return "status";
  }
  if (input.envelope.recipient === "meta-reviewer") {
    return "meta_reviewer";
  }
  if (input.envelope.recipient === "codex" || input.envelope.recipient === "claude") {
    return resolveUniquelyConfiguredRoleForAgent({
      agents: input.bubbleConfig.agents,
      agent: input.envelope.recipient,
      roles: ["implementer", "reviewer"]
    });
  }
  return undefined;
}

async function emitDeliveryNotificationAck(
  input: TestEmitDeliveryNotificationInput
) {
  return emitDeliveryNotificationAckRuntime({
    ...input,
    ...(input.recipientRole !== undefined
      ? { recipientRole: input.recipientRole }
      : (() => {
          const resolvedRole = resolveLegacyRecipientRoleForTest({
            envelope: input.envelope,
            bubbleConfig: input.bubbleConfig
          });
          return resolvedRole !== undefined ? { recipientRole: resolvedRole } : {};
        })())
  });
}

function expectStringOccurrence(
  text: string | undefined,
  snippet: string,
  expectedCount: number
): void {
  expect(text).toBeDefined();
  const actualCount = (text ?? "").split(snippet).length - 1;
  expect(actualCount).toBe(expectedCount);
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

describe("tmux delivery canonical ack helpers", () => {
  it("creates canonical accepted and rejected acknowledgements", () => {
    const acceptedInput = {
      sessionName: "pf-b_delivery_01",
      targetPaneIndex: 2,
      message: "handoff delivered",
      deliveryTargetReasonCode: "DELIVERY_TARGET_ROLE_INVALID" as const
    };
    const rejectedInput = {
      reason: "unsupported_recipient" as const,
      message: "handoff blocked",
      sessionName: "pf-b_delivery_01",
      targetPaneIndex: 2,
      deliveryTargetReasonCode: "DELIVERY_TARGET_ROLE_UNMAPPED" as const
    };

    expect(createAcceptedDeliveryAck(acceptedInput)).toEqual({
      status: "accepted",
      sessionName: "pf-b_delivery_01",
      targetPaneIndex: 2,
      message: "handoff delivered",
      deliveryTargetReasonCode: "DELIVERY_TARGET_ROLE_INVALID"
    });
    expect(createRejectedDeliveryAck(rejectedInput)).toEqual({
      status: "rejected",
      reason: "unsupported_recipient",
      reason_code: "DELIVERY_ACK_TARGET_UNSUPPORTED",
      sessionName: "pf-b_delivery_01",
      targetPaneIndex: 2,
      message: "handoff blocked",
      deliveryTargetReasonCode: "DELIVERY_TARGET_ROLE_UNMAPPED"
    });
  });

  it("covers every canonical delivery ack union member", () => {
    const canonicalCases = [
      {
        title: "accepted",
        ack: createAcceptedDeliveryAck({
          sessionName: "pf-b_delivery_01",
          targetPaneIndex: 2,
          message: "handoff delivered",
          deliveryTargetReasonCode: "DELIVERY_TARGET_ROLE_INVALID"
        }),
        expectedAck: {
          status: "accepted",
          sessionName: "pf-b_delivery_01",
          targetPaneIndex: 2,
          message: "handoff delivered",
          deliveryTargetReasonCode: "DELIVERY_TARGET_ROLE_INVALID"
        }
      },
      {
        title: "no_runtime_session",
        ack: createRejectedDeliveryAck({
          reason: "no_runtime_session",
          message: "handoff blocked 0",
          sessionName: "pf-b_delivery_01",
          targetPaneIndex: 2
        }),
        expectedAck: {
          status: "rejected",
          reason: "no_runtime_session",
          reason_code: "DELIVERY_ACK_RUNTIME_SESSION_UNAVAILABLE",
          sessionName: "pf-b_delivery_01",
          targetPaneIndex: 2,
          message: "handoff blocked 0"
        }
      },
      {
        title: "registry_read_failed",
        ack: createRejectedDeliveryAck({
          reason: "registry_read_failed",
          message: "handoff blocked 1"
        }),
        expectedAck: {
          status: "rejected",
          reason: "registry_read_failed",
          reason_code: "DELIVERY_ACK_RUNTIME_SESSION_UNAVAILABLE",
          message: "handoff blocked 1"
        }
      },
      {
        title: "unsupported_recipient",
        ack: createRejectedDeliveryAck({
          reason: "unsupported_recipient",
          message: "handoff blocked 2",
          sessionName: "pf-b_delivery_01",
          targetPaneIndex: 2,
          deliveryTargetReasonCode: "DELIVERY_TARGET_ROLE_UNMAPPED"
        }),
        expectedAck: {
          status: "rejected",
          reason: "unsupported_recipient",
          reason_code: "DELIVERY_ACK_TARGET_UNSUPPORTED",
          sessionName: "pf-b_delivery_01",
          targetPaneIndex: 2,
          message: "handoff blocked 2",
          deliveryTargetReasonCode: "DELIVERY_TARGET_ROLE_UNMAPPED"
        }
      },
      {
        title: "delivery_unconfirmed",
        ack: createRejectedDeliveryAck({
          reason: "delivery_unconfirmed",
          message: "handoff blocked 3",
          sessionName: "pf-b_delivery_01",
          targetPaneIndex: 2
        }),
        expectedAck: {
          status: "rejected",
          reason: "delivery_unconfirmed",
          reason_code: "DELIVERY_ACK_REJECTED",
          sessionName: "pf-b_delivery_01",
          targetPaneIndex: 2,
          message: "handoff blocked 3"
        }
      },
      {
        title: "command_failed",
        ack: createRejectedDeliveryAck({
          reason: "command_failed",
          message: "handoff blocked 4",
          sessionName: "pf-b_delivery_01",
          targetPaneIndex: 2
        }),
        expectedAck: {
          status: "rejected",
          reason: "command_failed",
          reason_code: "DELIVERY_ACK_REJECTED",
          sessionName: "pf-b_delivery_01",
          targetPaneIndex: 2,
          message: "handoff blocked 4"
        }
      }
    ] as const;

    for (const canonicalCase of canonicalCases) {
      expect(canonicalCase.ack, canonicalCase.title).toEqual(canonicalCase.expectedAck);
    }
  });
});

describe("tmux delivery explicit recipient-role routing", () => {
  it("keeps bare agent recipients from implicitly resolving meta-review routing", async () => {
    const resolution = resolveEnvelopeTargetPane(
      createEnvelope({
        id: "msg_20260222_100",
        sender: "orchestrator",
        recipient: "codex",
        type: "TASK",
        payload: {
          summary: "Meta-review fallback route."
        },
        refs: ["artifact://meta-review-task.md"]
      }),
      createSharedAgentConfig("claude")
    );

    expect(resolution).toEqual({
      targetPaneIndex: undefined,
      recipientRole: "codex",
      deliveryTargetReasonCode: "DELIVERY_TARGET_ROLE_ABSENT"
    });
  });

  it("routes explicit meta-reviewer delivery input without relying on envelope metadata", async () => {
    const runner: TmuxRunner = vi.fn(async (args: string[]): Promise<TmuxRunResult> => {
      if (args[0] === "capture-pane") {
        return {
          stdout:
            "# [pairflow] r1 PASS codex->claude msg=msg_20260222_101 ref=artifact://handoff.md.",
          stderr: "",
          exitCode: 0
        };
      }
      return { stdout: "", stderr: "", exitCode: 0 };
    });

    const ack = await emitDeliveryNotificationAck({
      bubbleId: "b_delivery_01",
      bubbleConfig: baseConfig,
      sessionsPath: "/tmp/sessions.json",
      envelope: createEnvelope({
        recipient: "claude",
        payload: {
          summary: "handoff"
        }
      }),
      recipientRole: "meta_reviewer",
      readSessionsRegistry: async () =>
        createRegistry({
          tmuxSessionName: "pf-b_delivery_01",
          workspacePath: "/tmp/worktree"
        }),
      runner
    });

    expect(ack).toMatchObject(
      createAcceptedDeliveryAck({
        sessionName: "pf-b_delivery_01",
        targetPaneIndex: runtimePaneIndices.metaReviewer,
        message: ack.message
      })
    );
    expect(runner).toHaveBeenCalledWith(
      [
        "send-keys",
        "-t",
        `pf-b_delivery_01:0.${String(runtimePaneIndices.metaReviewer)}`,
        "-l",
        expect.stringContaining("Meta-review task received.")
      ],
      {
        allowFailure: true
      }
    );
  });

  it("keeps explicit recipient-role authority ahead of conflicting envelope metadata", async () => {
    const runner = vi.fn(async (args: string[]): Promise<TmuxRunResult> => {
      if (args[0] === "capture-pane") {
        return {
          stdout:
            "# [pairflow] r1 PASS codex->claude msg=msg_20260222_102 ref=artifact://handoff.md.",
          stderr: "",
          exitCode: 0
        };
      }
      return { stdout: "", stderr: "", exitCode: 0 };
    });

    const ack = await emitDeliveryNotificationAck({
      bubbleId: "b_delivery_01",
      bubbleConfig: baseConfig,
      sessionsPath: "/tmp/sessions.json",
      envelope: createEnvelope({
        recipient: "claude",
        payload: {
          summary: "handoff",
          metadata: {
            delivery_target_role: "meta_reviewer"
          }
        }
      }),
      recipientRole: "implementer",
      readSessionsRegistry: async () =>
        createRegistry({
          tmuxSessionName: "pf-b_delivery_01",
          workspacePath: "/tmp/worktree"
        }),
      runner
    });

    expect(ack.sessionName).toBe("pf-b_delivery_01");
    expect(ack.targetPaneIndex).toBe(runtimePaneIndices.implementer);
    expect(
      runner.mock.calls.some(
        (call) =>
          call[0][0] === "send-keys"
          && call[0][2] === `pf-b_delivery_01:0.${String(runtimePaneIndices.implementer)}`
      )
    ).toBe(true);
  });
});

describe("emitDeliveryNotificationAck", () => {
  it("returns an accepted canonical acknowledgement from runtime truth", async () => {
    const createRunner = (): TmuxRunner => (args) => {
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
    const sharedInput = {
      bubbleId: "b_delivery_01",
      bubbleConfig: baseConfig,
      sessionsPath: "/tmp/repo/.pairflow/runtime/sessions.json",
      envelope: createEnvelope(),
      readSessionsRegistry: () => Promise.resolve(createRegistry())
    };

    const canonicalAck = await emitDeliveryNotificationAck({
      ...sharedInput,
      runner: createRunner()
    });

    expect(canonicalAck).toMatchObject(
      createAcceptedDeliveryAck({
        sessionName: "pf-b_delivery_01",
        targetPaneIndex: 2,
        message: canonicalAck.message
      })
    );
    expect(canonicalAck.message).toContain(
      "# [pairflow] r1 PASS codex->claude msg=msg_20260222_101 ref=artifact://handoff.md."
    );
  });

  it("fails closed with no_runtime_session before any tmux side effect", async () => {
    const calls: string[][] = [];
    const runner: TmuxRunner = (args): Promise<TmuxRunResult> => {
      calls.push(args);
      return Promise.resolve({
        stdout: "",
        stderr: "",
        exitCode: 0
      });
    };

    const result = await emitDeliveryNotificationAck({
      bubbleId: "b_delivery_01",
      bubbleConfig: baseConfig,
      sessionsPath: "/tmp/repo/.pairflow/runtime/sessions.json",
      envelope: createEnvelope(),
      runner,
      readSessionsRegistry: () => Promise.resolve({})
    });

    expect(result).toMatchObject({
      status: "rejected",
      reason: "no_runtime_session",
      reason_code: "DELIVERY_ACK_RUNTIME_SESSION_UNAVAILABLE"
    });
    expect(calls).toHaveLength(0);
  });

  it("returns unsupported_recipient canonical ack when no pane can be resolved", async () => {
    const metaReviewerPaneMock = mockUnmappedMetaReviewerPane();
    try {
      const calls: string[][] = [];
      const runner: TmuxRunner = (args): Promise<TmuxRunResult> => {
        calls.push(args);
        return Promise.resolve({
          stdout: "",
          stderr: "",
          exitCode: 0
        });
      };
      const result = await emitDeliveryNotificationAck({
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
        runner,
        readSessionsRegistry: () => Promise.resolve(createRegistry())
      });

      expect(result).toMatchObject({
        status: "rejected",
        reason: "unsupported_recipient",
        reason_code: "DELIVERY_ACK_TARGET_UNSUPPORTED",
        sessionName: "pf-b_delivery_01",
        deliveryTargetReasonCode: "DELIVERY_TARGET_ROLE_UNMAPPED"
      });
      expect(calls).toHaveLength(0);
    } finally {
      metaReviewerPaneMock.restore();
    }
  });

  it("returns registry_read_failed canonical ack before any tmux side effect", async () => {
    const calls: string[][] = [];
    const runner: TmuxRunner = (args): Promise<TmuxRunResult> => {
      calls.push(args);
      return Promise.resolve({
        stdout: "",
        stderr: "",
        exitCode: 0
      });
    };

    const result = await emitDeliveryNotificationAck({
      bubbleId: "b_delivery_01",
      bubbleConfig: baseConfig,
      sessionsPath: "/tmp/repo/.pairflow/runtime/sessions.json",
      envelope: createEnvelope(),
      runner,
      readSessionsRegistry: async () => Promise.reject(new Error("invalid json"))
    });

    expect(result).toMatchObject({
      status: "rejected",
      reason: "registry_read_failed",
      reason_code: "DELIVERY_ACK_RUNTIME_SESSION_UNAVAILABLE",
      deliveryTargetReasonCode: "DELIVERY_TARGET_REGISTRY_READ_FAILED"
    });
    expect(calls).toHaveLength(0);
  });

  it("keeps registry_read_failed message on explicit meta-review role even when the pane is unmapped", async () => {
    const metaReviewerPaneMock = mockUnmappedMetaReviewerPane();
    try {
      const calls: string[][] = [];
      const runner: TmuxRunner = (args): Promise<TmuxRunResult> => {
        calls.push(args);
        return Promise.resolve({
          stdout: "",
          stderr: "",
          exitCode: 0
        });
      };

      const result = await emitDeliveryNotificationAck({
        bubbleId: "b_delivery_01",
        bubbleConfig: createSharedAgentConfig("codex"),
        sessionsPath: "/tmp/repo/.pairflow/runtime/sessions.json",
        envelope: createEnvelope({
          id: "msg_20260222_402",
          sender: "orchestrator",
          recipient: "codex",
          type: "TASK",
          payload: {
            summary: "Meta-review task should keep explicit recipient-role guidance.",
            metadata: {
              [deliveryTargetRoleMetadataKey]: "meta_reviewer"
            }
          },
          refs: ["artifact://meta-review-task.md"]
        }),
        runner,
        readSessionsRegistry: async () => Promise.reject(new Error("invalid json"))
      });

      expect(result).toMatchObject({
        status: "rejected",
        reason: "registry_read_failed",
        reason_code: "DELIVERY_ACK_RUNTIME_SESSION_UNAVAILABLE",
        deliveryTargetReasonCode: "DELIVERY_TARGET_REGISTRY_READ_FAILED"
      });
      expect(result.message).toContain("Meta-review task received.");
      expect(calls).toHaveLength(0);
    } finally {
      metaReviewerPaneMock.restore();
    }
  });

  it("returns command_failed canonical ack when the tmux delivery command throws", async () => {
    const runner: TmuxRunner = () => Promise.reject(new Error("tmux unavailable"));

    const result = await emitDeliveryNotificationAck({
      bubbleId: "b_delivery_01",
      bubbleConfig: baseConfig,
      sessionsPath: "/tmp/repo/.pairflow/runtime/sessions.json",
      envelope: createEnvelope(),
      runner,
      readSessionsRegistry: () => Promise.resolve(createRegistry()),
      deliveryAttempts: 2
    });

    expect(result).toMatchObject({
      status: "rejected",
      sessionName: "pf-b_delivery_01",
      targetPaneIndex: 2,
      reason: "command_failed",
      reason_code: "DELIVERY_ACK_REJECTED"
    });
    expect(result.message).toContain(
      "# [pairflow] r1 PASS codex->claude msg=msg_20260222_101 ref=artifact://handoff.md."
    );
  });
});

describe("tmux delivery T6 runtime observability baseline", () => {
  it("keeps pane visibility and marker/session inspection diagnostics-only without an explicit accepted ack", async () => {
    // Helper-level T6 coverage. The facade-level emitDeliveryNotificationAck
    // scenario later in this file proves the same baseline through the public
    // delivery surface so the two tests stay intentionally complementary.
    const calls: string[][] = [];
    const targetPane = "pf-b_delivery_01:0.2";
    const message =
      "# [pairflow] r1 PASS codex->claude msg=msg_20260222_101 ref=artifact://handoff.md.";
    const expectedCapturePaneCall = [
      "capture-pane",
      "-p",
      "-S",
      "-200",
      "-t",
      targetPane
    ];
    const expectedMessageWriteCall = ["send-keys", "-t", targetPane, "-l", message];
    const expectedEnterCall = ["send-keys", "-t", targetPane, "Enter"];
    const runner: TmuxRunner = (args): Promise<TmuxRunResult> => {
      calls.push(args);
      if (args[0] === "capture-pane") {
        return Promise.resolve({
          stdout:
            "accepted=true running=true handoff_id=handoff_advanced_02 actor acknowledged work",
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

    // Fake timers keep the helper's sleep-based confirmation path deterministic.
    vi.useFakeTimers();
    try {
      const resultPromise = attemptTmuxDelivery({
        runner,
        targetPane,
        envelopeId: "msg_20260222_101",
        message,
        sessionName: "pf-b_delivery_01",
        targetPaneIndex: 2,
        // This test isolates the first-attempt fail-closed path; retry behavior
        // is covered separately by the retry-focused scenarios below.
        deliveryAttempts: 1
      });
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      const capturePaneCalls = calls.filter((call) => call[0] === "capture-pane");
      const messageWriteCalls = calls.filter(
        (call) => call[0] === "send-keys" && call[3] === "-l"
      );
      const enterCalls = calls.filter(
        (call) => call[0] === "send-keys" && call[3] === "Enter" && call.length === 4
      );

      expect(messageWriteCalls).toEqual([expectedMessageWriteCall]);
      expect(enterCalls).toEqual([expectedEnterCall]);
      expect(capturePaneCalls.length).toBeGreaterThanOrEqual(1);
      expect(capturePaneCalls).toContainEqual(expectedCapturePaneCall);
      expect(result).toEqual(
        createRejectedDeliveryAck({
          reason: "delivery_unconfirmed",
          message,
          sessionName: "pf-b_delivery_01",
          targetPaneIndex: 2
        })
      );
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("emitDeliveryNotificationAck", () => {
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

    const result = await emitDeliveryNotificationAck({
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

    expect(result.status).toBe("accepted");
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

    const result = await emitDeliveryNotificationAck({
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

    expect(result.status).toBe("accepted");
    expect(result.targetPaneIndex).toBe(3);
    expect(
      calls.some((call) => call[0] === "send-keys" && call[2] === "pf-b_delivery_01:0.3")
    ).toBe(true);
    const metaReviewMessageCall = calls.find(
      (call) =>
        call[0] === "send-keys" &&
        call[2] === "pf-b_delivery_01:0.3" &&
        call[3] === "-l" &&
        call[4]?.includes("Meta-review task received.")
    );
    expect(metaReviewMessageCall?.[4]).toContain("--report-json");
    expect(metaReviewMessageCall?.[4]).toContain(
      buildMetaReviewSubmitCommandTemplate()
    );
    expect(metaReviewMessageCall?.[4]).toContain("findings_claim_state");
    expect(metaReviewMessageCall?.[4]).toContain("findings_claim_source");
    expect(metaReviewMessageCall?.[4]).toContain("findings_count");
    expect(metaReviewMessageCall?.[4]).toContain("findings_claimed_open_total");
    expect(metaReviewMessageCall?.[4]).toContain("findings_blocking_open_total");
    expect(metaReviewMessageCall?.[4]).toContain("findings_advisory_open_total");
    expect(metaReviewMessageCall?.[4]).toContain(
      buildMetaReviewSubmitApproveParityNote()
    );
    expect(metaReviewMessageCall?.[4]).toContain("Clean approve requires zero open findings.");
    expect(metaReviewMessageCall?.[4]).toContain("do not switch to inconclusive");
    expect(metaReviewMessageCall?.[4]).not.toContain("--report-markdown");
  });

  it("falls back to the unique recipient lane when delivery_target_role metadata is invalid", async () => {
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

    const result = await emitDeliveryNotificationAck({
      bubbleId: "b_delivery_01",
      bubbleConfig: baseConfig,
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

    expect(result.status).toBe("accepted");
    expect(result.targetPaneIndex).toBe(1);
    expect(result.deliveryTargetReasonCode).toBeUndefined();
    expect(
      calls.some((call) => call[0] === "send-keys" && call[2] === "pf-b_delivery_01:0.1")
    ).toBe(true);
  });

  it("fail-closes ambiguous shared-agent fallback when delivery_target_role metadata is invalid", async () => {
    const result = await emitDeliveryNotificationAck({
      bubbleId: "b_delivery_01",
      bubbleConfig: createSharedAgentConfig("codex"),
      sessionsPath: "/tmp/repo/.pairflow/runtime/sessions.json",
      envelope: createEnvelope({
        id: "msg_20260222_202_shared",
        sender: "claude",
        recipient: "codex",
        payload: {
          summary: "Ambiguous fallback must fail closed.",
          metadata: {
            [deliveryTargetRoleMetadataKey]: "meta-reviewer"
          }
        }
      }),
      readSessionsRegistry: () => Promise.resolve(createRegistry())
    });

    expect(result).toMatchObject({
      status: "rejected",
      reason: "unsupported_recipient",
      reason_code: "DELIVERY_ACK_TARGET_UNSUPPORTED",
      deliveryTargetReasonCode: "DELIVERY_TARGET_ROLE_INVALID"
    });
  });

  it("fail-closes metadata-derived meta-review routing when the meta-review pane is unmapped", async () => {
    const metaReviewerPaneMock = mockUnmappedMetaReviewerPane();
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

      const result = await emitDeliveryNotificationAck({
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

      expect(result).toEqual({
        status: "rejected",
        reason: "unsupported_recipient",
        reason_code: "DELIVERY_ACK_TARGET_UNSUPPORTED",
        sessionName: "pf-b_delivery_01",
        message: result.message,
        deliveryTargetReasonCode: "DELIVERY_TARGET_ROLE_UNMAPPED"
      });
      expect(calls).toHaveLength(0);
    } finally {
      metaReviewerPaneMock.restore();
    }
  });

  it("fail-closes explicit meta-review routing when the meta-reviewer pane is unmapped", async () => {
    const metaReviewerPaneMock = mockUnmappedMetaReviewerPane();
    try {
      const result = await emitDeliveryNotificationAck({
        bubbleId: "b_delivery_01",
        bubbleConfig: baseConfig,
        sessionsPath: "/tmp/repo/.pairflow/runtime/sessions.json",
        envelope: createEnvelope({
          recipient: "claude",
          payload: {
            summary: "Explicit meta-review route must fail closed."
          }
        }),
        recipientRole: "meta_reviewer",
        readSessionsRegistry: () => Promise.resolve(createRegistry())
      });

      expect(result).toEqual({
        status: "rejected",
        reason: "unsupported_recipient",
        reason_code: "DELIVERY_ACK_TARGET_UNSUPPORTED",
        sessionName: "pf-b_delivery_01",
        message: result.message,
        deliveryTargetReasonCode: "DELIVERY_TARGET_ROLE_UNMAPPED"
      });
    } finally {
      metaReviewerPaneMock.restore();
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

    const result = await emitDeliveryNotificationAck({
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

    expect(result.status).toBe("accepted");
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

    const result = await emitDeliveryNotificationAck({
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

    expect(result.status).toBe("accepted");
    expect(result.targetPaneIndex).toBe(2);
    expect(
      calls.some((call) => call[0] === "send-keys" && call[2] === "pf-b_delivery_01:0.2")
    ).toBe(true);
  });

  it("routes PASS delivery to recipient agent pane with compact policy handoff in fresh mode", async () => {
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

    const result = await emitDeliveryNotificationAck({
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

    expect(result.status).toBe("accepted");
    expect(result.sessionName).toBe("pf-b_delivery_01");
    expect(result.targetPaneIndex).toBe(2);
    expect(result.deliveryTargetReasonCode).toBeUndefined();
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
      "Reviewer policy file: /tmp/repo/.pairflow/bubbles/b_delivery_01/artifacts/reviewer-policy-snapshot.md"
    );
    expect(messageCall?.[4]).toContain("Read this file before first review action.");
    expectStringOccurrence(
      messageCall?.[4],
      "Reviewer policy file: /tmp/repo/.pairflow/bubbles/b_delivery_01/artifacts/reviewer-policy-snapshot.md",
      1
    );
    expect(messageCall?.[4]).not.toContain(
      "Full canonical ontology (embedded from `docs/reviewer-severity-ontology.md`)"
    );
    expect(messageCall?.[4]).toContain("Blocker severities (`P0/P1`) require concrete evidence");
    expect(messageCall?.[4]).toContain("Without blocker-grade evidence (`P0/P1`), downgrade to `P2` by default");
    expect(messageCall?.[4]).toContain("Cosmetic/comment-only findings are `P3`");
    expect(messageCall?.[4]).toContain("Out-of-scope observations should be notes (`P3`)");
    expect(messageCall?.[4]).toContain(
      "Implementer test evidence has been orchestrator-verified. Do not re-run full tests unless a trigger from the decision matrix applies."
    );
    expectStringOccurrence(
      messageCall?.[4],
      "Decision matrix triggers that still require tests:",
      1
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
    expect(messageCall?.[4]).toContain(REVIEWER_COMMAND_GATE_REQ_F);
    expect(messageCall?.[4]).not.toContain(REVIEWER_COMMAND_GATE_REQ_B);
    expect(messageCall?.[4]).not.toContain(REVIEWER_COMMAND_GATE_REQ_C);
    expect(messageCall?.[4]).not.toContain(REVIEWER_COMMAND_GATE_REQ_E);
    expectNoForbiddenReviewerCommandGateTokens(messageCall?.[4]);
    expect(messageCall?.[4]).toContain(
      "Run pairflow commands from workspace root: /tmp/worktree."
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

    const result = await emitDeliveryNotificationAck({
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

    expect(result.status).toBe("accepted");
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

  it("keeps delivery success transport-only even when confirmed pane output contains acceptance-like tokens", async () => {
    const runner: TmuxRunner = (args): Promise<TmuxRunResult> => {
      if (args[0] === "capture-pane") {
        return Promise.resolve({
          stdout:
            "# [pairflow] r1 PASS codex->claude msg=msg_20260222_101 ref=artifact://handoff.md. Action: Implementer handoff received.\naccepted=true running=true handoff_id=handoff_advanced_02 actor acknowledged work",
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

    const result = await emitDeliveryNotificationAck({
      bubbleId: "b_delivery_01",
      bubbleConfig: baseConfig,
      sessionsPath: "/tmp/repo/.pairflow/runtime/sessions.json",
      envelope: createEnvelope({
        payload: {
          summary: "handoff",
          metadata: {
            [deliveryTargetRoleMetadataKey]: "reviewer"
          }
        }
      }),
      runner,
      readSessionsRegistry: () => Promise.resolve(createRegistry())
    });

    expect(result.status).toBe("accepted");
    expect(result.sessionName).toBe("pf-b_delivery_01");
    expect(result.targetPaneIndex).toBe(2);
    expect(result.message).toContain(
      "Implementer handoff received. Run a fresh review now."
    );
    expect(result).not.toHaveProperty("reason");
    expect(result).not.toHaveProperty("reason_code");
    expect(Object.keys(result).sort()).toEqual([
      "message",
      "sessionName",
      "status",
      "targetPaneIndex"
    ]);
  });

  it("does not treat acceptance-like pane output as canonical delivery when the pairflow marker is missing", { timeout: 5_000 }, async () => {
    const runner: TmuxRunner = (args): Promise<TmuxRunResult> => {
      if (args[0] === "capture-pane") {
        return Promise.resolve({
          stdout:
            "accepted=true running=true handoff_id=handoff_advanced_02 actor acknowledged work",
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

    const result = await emitDeliveryNotificationAck({
      bubbleId: "b_delivery_01",
      bubbleConfig: baseConfig,
      sessionsPath: "/tmp/repo/.pairflow/runtime/sessions.json",
      envelope: createEnvelope({
        payload: {
          summary: "handoff",
          metadata: {
            [deliveryTargetRoleMetadataKey]: "reviewer"
          }
        }
      }),
      runner,
      readSessionsRegistry: () => Promise.resolve(createRegistry()),
      deliveryAttempts: 1
    });

    expect(result.status).toBe("rejected");
    expect(result.sessionName).toBe("pf-b_delivery_01");
    expect(result.targetPaneIndex).toBe(2);
    expect(result.message).toContain(
      "Implementer handoff received. Run a fresh review now."
    );
    expect(result.reason).toBe("delivery_unconfirmed");
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

    await emitDeliveryNotificationAck({
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

    await emitDeliveryNotificationAck({
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
    expect(messageCall?.[4]).toContain(
      "Run required checks before final judgment. Reason: reviewer test verification directive was unavailable."
    );
    expect(messageCall?.[4]).not.toContain(
      "Decision matrix triggers that still require tests:"
    );
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

    await emitDeliveryNotificationAck({
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
    expect(messageCall?.[4]).toContain(REVIEWER_COMMAND_GATE_REQ_F);
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

    await emitDeliveryNotificationAck({
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
    expect(messageCall?.[4]).toContain(REVIEWER_COMMAND_GATE_REQ_F);
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

    await emitDeliveryNotificationAck({
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
    await emitDeliveryNotificationAck({
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
    expect(cleanMessage).toContain(REVIEWER_COMMAND_GATE_REQ_F);
    expect(cleanMessage).not.toContain(REVIEWER_COMMAND_GATE_REQ_E);
    expect(findingsMessage).toContain(REVIEWER_COMMAND_GATE_REQ_C);
    expect(findingsMessage).toContain(REVIEWER_COMMAND_GATE_REQ_D);
    expect(findingsMessage).toContain(REVIEWER_COMMAND_GATE_REQ_E);
    expect(findingsMessage).toContain(REVIEWER_COMMAND_GATE_REQ_F);
    expect(findingsMessage).not.toContain(REVIEWER_COMMAND_GATE_REQ_B);
  });

  it("projects non-default reviewer thresholds into tmux reviewer delivery without forbidden drift", async () => {
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

    await emitDeliveryNotificationAck({
      bubbleId: "b_delivery_01",
      bubbleConfig: {
        ...baseConfig,
        reviewer_context_mode: "fresh",
        review_policy: {
          review_loop_mode: "full",
          reviewer_blocking_min_severity: "P2",
          meta_review_auto_rework_min_severity: "P3"
        }
      },
      sessionsPath: "/tmp/repo/.pairflow/runtime/sessions.json",
      envelope: createEnvelope({
        id: "msg_20260222_106",
        round: 2
      }),
      runner,
      readSessionsRegistry: () => Promise.resolve(createRegistry())
    });
    await emitDeliveryNotificationAck({
      bubbleId: "b_delivery_01",
      bubbleConfig: {
        ...baseConfig,
        reviewer_context_mode: "fresh",
        review_policy: {
          review_loop_mode: "full",
          reviewer_blocking_min_severity: "P1",
          meta_review_auto_rework_min_severity: "P3"
        }
      },
      sessionsPath: "/tmp/repo/.pairflow/runtime/sessions.json",
      envelope: createEnvelope({
        id: "msg_20260222_107",
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

    expect(cleanMessage).toContain(
      "If review round is at or above `severity_gate_round` and no findings meet the current post-gate blocking threshold (`review_policy.reviewer_blocking_min_severity=P2`)"
    );
    expect(cleanMessage).toContain(
      "Routing matrix (copy-paste after resolving `executionContext` from `pairflow bubble status --json`)"
    );
    expect(cleanMessage).toContain(
      "review_policy.reviewer_blocking_min_severity=P2"
    );
    expect(cleanMessage).toContain(
      "Findings below that threshold (for example `P3`-only sets) are advisory for routing after `severity_gate_round`"
    );
    expectNoForbiddenReviewerCommandGateTokens(cleanMessage);

    expect(findingsMessage).toContain(
      "If findings meeting the current post-gate blocking threshold remain under current scope policy, keep using `pairflow agent emit --kind pass ... --finding ...`."
    );
    expect(findingsMessage).toContain(
      "Routing matrix (copy-paste after resolving `executionContext` from `pairflow bubble status --json`)"
    );
    expect(findingsMessage).toContain(
      "review_policy.reviewer_blocking_min_severity=P1"
    );
    expect(findingsMessage).toContain(
      "Findings below that threshold (for example `P2/P3`-only sets) are advisory for routing after `severity_gate_round`"
    );
    expectNoForbiddenReviewerCommandGateTokens(findingsMessage);
  });

  it("keeps compact reviewer policy delivery on every fresh-mode reviewer handoff round with directive", async () => {
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

    await emitDeliveryNotificationAck({
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

    await emitDeliveryNotificationAck({
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
        "Reviewer policy file: /tmp/repo/.pairflow/bubbles/b_delivery_01/artifacts/reviewer-policy-snapshot.md"
      );
      expect(messageCall[4]).toContain("Read this file before first review action.");
      expectStringOccurrence(
        messageCall[4],
        "Reviewer policy file: /tmp/repo/.pairflow/bubbles/b_delivery_01/artifacts/reviewer-policy-snapshot.md",
        1
      );
      expect(messageCall[4]).not.toContain(
        "Full canonical ontology (embedded from `docs/reviewer-severity-ontology.md`)"
      );
      expect(messageCall[4]).toContain(
        "Implementer test evidence has been orchestrator-verified. Do not re-run full tests unless a trigger from the decision matrix applies."
      );
      expectStringOccurrence(
        messageCall[4],
        "Decision matrix triggers that still require tests:",
        1
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

    await emitDeliveryNotificationAck({
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
      "Reviewer policy file: /tmp/repo/.pairflow/bubbles/b_delivery_01/artifacts/reviewer-policy-snapshot.md"
    );
    expect(messageCall?.[4]).toContain("Read this file before first review action.");
    expectStringOccurrence(
      messageCall?.[4],
      "Reviewer policy file: /tmp/repo/.pairflow/bubbles/b_delivery_01/artifacts/reviewer-policy-snapshot.md",
      1
    );
    expectStringOccurrence(
      messageCall?.[4],
      "Decision matrix triggers that still require tests:",
      1
    );
    expect(messageCall?.[4]).not.toContain(
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

    await emitDeliveryNotificationAck({
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

    const result = await emitDeliveryNotificationAck({
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

    expect(result.status).toBe("accepted");
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

    const result = await emitDeliveryNotificationAck({
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

    expect(result.status).toBe("accepted");
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

    const result = await emitDeliveryNotificationAck({
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

    expect(result.status).toBe("accepted");
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

  it("uses origin-neutral rework instruction when implementer delivery lacks explicit origin metadata", async () => {
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

    const result = await emitDeliveryNotificationAck({
      bubbleId: "b_delivery_01",
      bubbleConfig: baseConfig,
      sessionsPath: "/tmp/repo/.pairflow/runtime/sessions.json",
      envelope: createEnvelope({
        sender: "human",
        recipient: "codex",
        type: "APPROVAL_DECISION",
        round: 2,
        payload: {
          decision: "rework",
          message: "Please address reviewer findings."
        }
      }),
      messageRef: reworkRef,
      runner,
      readSessionsRegistry: () => Promise.resolve(createRegistry())
    });

    expect(result.status).toBe("accepted");
    expect(result.targetPaneIndex).toBe(1);
    const approvalCall = calls.find(
      (call) =>
        call[0] === "send-keys" &&
        call[2] === "pf-b_delivery_01:0.1" &&
        call[3] === "-l" &&
        call[4]?.includes("APPROVAL_DECISION human->codex")
    );
    expect(approvalCall?.[4]).toContain("Rework received.");
    expect(approvalCall?.[4]).not.toContain("Human requested rework.");
    expect(approvalCall?.[4]).not.toContain("reviewer requested rework");
    expect(approvalCall?.[4]).not.toContain("Meta-review");
    expect(calls).toContainEqual([
      "send-keys",
      "-t",
      "pf-b_delivery_01:0.1",
      "Enter"
    ]);
  });

  it("uses meta-origin-aware implementer rework guidance for meta auto-rework delivery", async () => {
    const calls: string[][] = [];
    const runner: TmuxRunner = (args): Promise<TmuxRunResult> => {
      calls.push(args);
      if (args[0] === "capture-pane") {
        return Promise.resolve({
          stdout:
            "# [pairflow] r2 APPROVAL_DECISION orchestrator->codex msg=msg_20260222_103 ref=artifact://auto-rework.md.",
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

    const result = await emitDeliveryNotificationAck({
      bubbleId: "b_delivery_01",
      bubbleConfig: baseConfig,
      sessionsPath: "/tmp/repo/.pairflow/runtime/sessions.json",
      envelope: createEnvelope({
        id: "msg_20260222_103",
        sender: "orchestrator",
        recipient: "codex",
        type: "APPROVAL_DECISION",
        round: 2,
        payload: {
          decision: "rework",
          message: "Please address meta-review findings.",
          metadata: {
            actor: "meta-reviewer"
          }
        },
        refs: ["artifact://auto-rework.md"]
      }),
      runner,
      readSessionsRegistry: () => Promise.resolve(createRegistry())
    });

    expect(result.status).toBe("accepted");
    const approvalCall = calls.find(
      (call) =>
        call[0] === "send-keys" &&
        call[2] === "pf-b_delivery_01:0.1" &&
        call[3] === "-l" &&
        call[4]?.includes("APPROVAL_DECISION orchestrator->codex")
    );
    expect(approvalCall?.[4]).toContain("Meta-review auto-rework received.");
    expect(approvalCall?.[4]).not.toContain("Rework received.");
    expect(approvalCall?.[4]).not.toContain("Human requested rework.");
  });

  it("uses meta-origin-aware guidance for meta-review-gate actor metadata as well", async () => {
    const calls: string[][] = [];
    const runner: TmuxRunner = (args): Promise<TmuxRunResult> => {
      calls.push(args);
      if (args[0] === "capture-pane") {
        return Promise.resolve({
          stdout:
            "# [pairflow] r2 APPROVAL_DECISION orchestrator->codex msg=msg_20260222_104 ref=artifact://gate-auto-rework.md.",
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

    await emitDeliveryNotificationAck({
      bubbleId: "b_delivery_01",
      bubbleConfig: baseConfig,
      sessionsPath: "/tmp/repo/.pairflow/runtime/sessions.json",
      envelope: createEnvelope({
        id: "msg_20260222_104",
        sender: "orchestrator",
        recipient: "codex",
        type: "APPROVAL_DECISION",
        round: 2,
        payload: {
          decision: "rework",
          message: "Please address gate-routed findings.",
          metadata: {
            actor: "meta-review-gate"
          }
        },
        refs: ["artifact://gate-auto-rework.md"]
      }),
      runner,
      readSessionsRegistry: () => Promise.resolve(createRegistry())
    });

    const approvalCall = calls.find(
      (call) =>
        call[0] === "send-keys" &&
        call[2] === "pf-b_delivery_01:0.1" &&
        call[3] === "-l" &&
        call[4]?.includes("APPROVAL_DECISION orchestrator->codex")
    );
    expect(approvalCall?.[4]).toContain("Meta-review auto-rework received.");
    expect(approvalCall?.[4]).not.toContain("Human requested rework.");
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

      await emitDeliveryNotificationAck({
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
          decision: "rework",
          message: "Please rework the docs update."
        }
      })
    );
    expect(reworkMessage).toContain(
      "Docs-only scope: keep summary and refs consistent; skip-claim means no `.pairflow/evidence/*.log` refs in that PASS."
    );
    expect(reworkMessage).toContain(
      "Primary artifact rule (docs-only): apply the rework on the referenced source task/document file directly, not only in a new standalone review note."
    );
    expect(reworkMessage).toContain("Rework received.");
    expect(reworkMessage).not.toContain("Human requested rework.");
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

    const result = await emitDeliveryNotificationAck({
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

    expect(result.status).toBe("accepted");
    const passToImplementerCall = calls.find(
      (call) =>
        call[0] === "send-keys" &&
        call[2] === "pf-b_delivery_01:0.1" &&
        call[3] === "-l" &&
        call[4]?.includes("PASS claude->codex")
    );
    expect(passToImplementerCall?.[4]).toContain("Reviewer feedback received.");
    expect(passToImplementerCall?.[4]).toContain(
      "Implement fixes, then hand off with canonical actor emit"
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

    const result = await emitDeliveryNotificationAck({
      bubbleId: "b_delivery_01",
      bubbleConfig: baseConfig,
      sessionsPath: "/tmp/repo/.pairflow/runtime/sessions.json",
      envelope: createEnvelope({
        refs: []
      }),
      runner,
      readSessionsRegistry: () => Promise.resolve(createRegistry())
    });

    expect(result.status).toBe("accepted");
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

    const result = await emitDeliveryNotificationAck({
      bubbleId: "b_delivery_01",
      bubbleConfig: baseConfig,
      sessionsPath: "/tmp/repo/.pairflow/runtime/sessions.json",
      envelope: createEnvelope({
        refs: ["artifact://priority-source.md"]
      }),
      runner,
      readSessionsRegistry: () => Promise.resolve(createRegistry())
    });

    expect(result.status).toBe("accepted");
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

    const result = await emitDeliveryNotificationAck({
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

    expect(result.status).toBe("accepted");
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

  it("uses explicit canonical workspace authority for delivery guidance", async () => {
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

    const result = await emitDeliveryNotificationAck({
      bubbleId: "b_delivery_01",
      bubbleConfig: baseConfig,
      sessionsPath: "/tmp/repo/.pairflow/runtime/sessions.json",
      envelope: createEnvelope(),
      runner,
      readSessionsRegistry: () =>
        Promise.resolve(
          createRegistry({
            workspacePath: "/tmp/runtime-workspace",
            workspaceKind: "worktree"
          })
        )
    });

    expect(result.status).toBe("accepted");
    expect(result.message).toContain(
      "Run pairflow commands from workspace root: /tmp/runtime-workspace."
    );
    expect(result.message).not.toContain(
      "Run pairflow commands from workspace root: /tmp/worktree."
    );
  });

  it("fails closed when explicit workspace authority is absent during delivery", async () => {
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

    const result = await emitDeliveryNotificationAck({
      bubbleId: "b_delivery_01",
      bubbleConfig: baseConfig,
      sessionsPath: "/tmp/repo/.pairflow/runtime/sessions.json",
      envelope: createEnvelope(),
      runner,
      readSessionsRegistry: () =>
        Promise.resolve(
          createRegistry({
            workspacePath: undefined,
            workspaceKind: undefined
          })
        )
    });

    expect(result).toMatchObject({
      status: "rejected",
      reason: "no_runtime_session"
    });
    expect(result.message).toContain(
      "Run pairflow commands from the active workspace root."
    );
    expect(calls).toHaveLength(0);
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

    const result = await emitDeliveryNotificationAck({
      bubbleId: "b_delivery_01",
      bubbleConfig: baseConfig,
      sessionsPath: "/tmp/repo/.pairflow/runtime/sessions.json",
      envelope: createEnvelope(),
      runner,
      readSessionsRegistry: () => Promise.resolve({})
    });

    expect(result).toMatchObject({
      status: "rejected",
      reason: "no_runtime_session",
      reason_code: "DELIVERY_ACK_RUNTIME_SESSION_UNAVAILABLE"
    });
    expect(result.message).toContain(
      "# [pairflow] r1 PASS codex->claude msg=msg_20260222_101 ref=artifact://handoff.md."
    );
    expect(result.message).toContain(
      "Run pairflow commands from the active workspace root."
    );
    expect(calls).toHaveLength(0);
  });

  it("fails closed when runtime workspace authority is missing", async () => {
    const calls: string[][] = [];
    const runner: TmuxRunner = (args): Promise<TmuxRunResult> => {
      calls.push(args);
      return Promise.resolve({
        stdout: "",
        stderr: "",
        exitCode: 0
      });
    };

    const result = await emitDeliveryNotificationAck({
      bubbleId: "b_delivery_01",
      bubbleConfig: baseConfig,
      sessionsPath: "/tmp/repo/.pairflow/runtime/sessions.json",
      envelope: createEnvelope(),
      runner,
      readSessionsRegistry: () =>
        Promise.resolve(
          createRegistry({
            worktreePath: "   ",
            workspacePath: undefined,
            workspaceKind: undefined
          })
        )
    });

    expect(result).toMatchObject({
      status: "rejected",
      reason: "no_runtime_session",
      reason_code: "DELIVERY_ACK_RUNTIME_SESSION_UNAVAILABLE"
    });
    expect(result.message).toContain(
      "Run pairflow commands from the active workspace root."
    );
    expect(calls).toHaveLength(0);
  });

  it("fails closed when clone-mode session has no canonical workspace authority during delivery", async () => {
    const calls: string[][] = [];
    const runner: TmuxRunner = (args): Promise<TmuxRunResult> => {
      calls.push(args);
      return Promise.resolve({
        stdout: "",
        stderr: "",
        exitCode: 0
      });
    };

    const result = await emitDeliveryNotificationAck({
      bubbleId: "b_delivery_01",
      bubbleConfig: baseConfig,
      sessionsPath: "/tmp/repo/.pairflow/runtime/sessions.json",
      envelope: createEnvelope(),
      runner,
      readSessionsRegistry: () =>
        Promise.resolve(
          createRegistry({
            workspacePath: undefined,
            workspaceKind: "clone"
          })
        )
    });

    expect(result).toMatchObject({
      status: "rejected",
      reason: "no_runtime_session",
      reason_code: "DELIVERY_ACK_RUNTIME_SESSION_UNAVAILABLE"
    });
    expect(result.message).toContain(
      "Run pairflow commands from the active workspace root."
    );
    expect(calls).toHaveLength(0);
  });

  it("preserves unsupported-recipient behavior when explicit role and legacy recipient routes are both unavailable", async () => {
    const metaReviewerPaneMock = mockUnmappedMetaReviewerPane();
    try {
      const result = await emitDeliveryNotificationAck({
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
        status: "rejected",
        reason: "unsupported_recipient",
        reason_code: "DELIVERY_ACK_TARGET_UNSUPPORTED",
        deliveryTargetReasonCode: "DELIVERY_TARGET_ROLE_UNMAPPED"
      });
    } finally {
      metaReviewerPaneMock.restore();
    }
  });

  it("returns registry_read_failed when session registry load fails", async () => {
    const result = await emitDeliveryNotificationAck({
      bubbleId: "b_delivery_01",
      bubbleConfig: baseConfig,
      sessionsPath: "/tmp/repo/.pairflow/runtime/sessions.json",
      envelope: createEnvelope(),
      readSessionsRegistry: async () => Promise.reject(new Error("invalid json"))
    });

    expect(result).toMatchObject({
      status: "rejected",
      reason: "registry_read_failed",
      reason_code: "DELIVERY_ACK_RUNTIME_SESSION_UNAVAILABLE",
      deliveryTargetReasonCode: "DELIVERY_TARGET_REGISTRY_READ_FAILED"
    });
    expect(result.message).toContain(
      "# [pairflow] r1 PASS codex->claude msg=msg_20260222_101 ref=artifact://handoff.md."
    );
    expect(result.message).toContain(
      "Run pairflow commands from the active workspace root."
    );
  });

  it("returns command_failed when tmux command fails", async () => {
    const runner: TmuxRunner = () => Promise.reject(new Error("tmux unavailable"));

    const result = await emitDeliveryNotificationAck({
      bubbleId: "b_delivery_01",
      bubbleConfig: baseConfig,
      sessionsPath: "/tmp/repo/.pairflow/runtime/sessions.json",
      envelope: createEnvelope(),
      runner,
      readSessionsRegistry: () => Promise.resolve(createRegistry()),
      deliveryAttempts: 2
    });

    expect(result).toMatchObject({
      status: "rejected",
      sessionName: "pf-b_delivery_01",
      targetPaneIndex: 2,
      reason: "command_failed",
      reason_code: "DELIVERY_ACK_REJECTED"
    });
    expect(result.message).toContain(
      "# [pairflow] r1 PASS codex->claude msg=msg_20260222_101 ref=artifact://handoff.md."
    );
    expect(result.message).toContain(
      "Run pairflow commands from workspace root: /tmp/worktree."
    );
  });

  it("returns command_failed when literal pane write exits non-zero", async () => {
    const calls: string[][] = [];
    const runner: TmuxRunner = (args): Promise<TmuxRunResult> => {
      calls.push(args);
      if (
        args[0] === "send-keys" &&
        args[2] === "pf-b_delivery_01:0.2" &&
        args[3] === "-l"
      ) {
        return Promise.resolve({
          stdout: "",
          stderr: "can't find pane",
          exitCode: 1
        });
      }

      return Promise.resolve({
        stdout: "",
        stderr: "",
        exitCode: 0
      });
    };

    const result = await emitDeliveryNotificationAck({
      bubbleId: "b_delivery_01",
      bubbleConfig: baseConfig,
      sessionsPath: "/tmp/repo/.pairflow/runtime/sessions.json",
      envelope: createEnvelope(),
      runner,
      readSessionsRegistry: () => Promise.resolve(createRegistry()),
      deliveryAttempts: 2
    });

    expect(result).toMatchObject({
      status: "rejected",
      sessionName: "pf-b_delivery_01",
      targetPaneIndex: 2,
      reason: "command_failed",
      reason_code: "DELIVERY_ACK_REJECTED"
    });
    expect(
      calls.some(
        (call) =>
          call[0] === "send-keys" &&
          call[2] === "pf-b_delivery_01:0.2" &&
          call[3] === "Enter" &&
          call.length === 4
      )
    ).toBe(false);
    expect(calls.filter((call) => call[0] === "capture-pane")).toHaveLength(1);
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

    const result = await emitDeliveryNotificationAck({
      bubbleId: "b_delivery_01",
      bubbleConfig: baseConfig,
      sessionsPath: "/tmp/repo/.pairflow/runtime/sessions.json",
      envelope: createEnvelope(),
      runner,
      readSessionsRegistry: () => Promise.resolve(createRegistry()),
      deliveryAttempts: 2
    });

    expect(result.status).toBe("accepted");
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

    const result = await emitDeliveryNotificationAck({
      bubbleId: "b_delivery_01",
      bubbleConfig: baseConfig,
      sessionsPath: "/tmp/repo/.pairflow/runtime/sessions.json",
      envelope: createEnvelope(),
      runner,
      readSessionsRegistry: () => Promise.resolve(createRegistry()),
      deliveryAttempts: 3
    });

    expect(result.status).toBe("accepted");
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

    const result = await emitDeliveryNotificationAck({
      bubbleId: "b_delivery_01",
      bubbleConfig: baseConfig,
      sessionsPath: "/tmp/repo/.pairflow/runtime/sessions.json",
      envelope: createEnvelope(),
      runner,
      readSessionsRegistry: () => Promise.resolve(createRegistry()),
      deliveryAttempts: 3
    });

    expect(result.status).toBe("accepted");
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

    const result = await emitDeliveryNotificationAck({
      bubbleId: "b_delivery_01",
      bubbleConfig: baseConfig,
      sessionsPath: "/tmp/repo/.pairflow/runtime/sessions.json",
      envelope: createEnvelope(),
      runner,
      readSessionsRegistry: () => Promise.resolve(createRegistry()),
      deliveryAttempts: 2
    });

    expect(result).toMatchObject({
      status: "rejected",
      reason: "delivery_unconfirmed",
      reason_code: "DELIVERY_ACK_REJECTED",
      sessionName: "pf-b_delivery_01",
      targetPaneIndex: 2
    });
  });

  it("accepts delivery when the pairflow marker is only visible in recent pane scrollback", async () => {
    const calls: string[][] = [];
    const runner: TmuxRunner = (args): Promise<TmuxRunResult> => {
      calls.push(args);
      if (args[0] === "capture-pane") {
        return Promise.resolve({
          stdout: [
            "Earlier output above the current viewport:",
            "# [pairflow] r1 PASS codex->claude msg=msg_20260222_101 ref=artifact://handoff.md.",
            "",
            "Claude Code is ready.",
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

    const result = await emitDeliveryNotificationAck({
      bubbleId: "b_delivery_01",
      bubbleConfig: baseConfig,
      sessionsPath: "/tmp/repo/.pairflow/runtime/sessions.json",
      envelope: createEnvelope(),
      runner,
      readSessionsRegistry: () => Promise.resolve(createRegistry()),
      deliveryAttempts: 1
    });

    expect(result.status).toBe("accepted");
    expect(calls).toContainEqual([
      "capture-pane",
      "-p",
      "-S",
      "-200",
      "-t",
      "pf-b_delivery_01:0.2"
    ]);
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
      activeRole: "reviewer",
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
      activeRole: "reviewer",
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
      activeRole: "reviewer",
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
      activeRole: "reviewer",
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
      activeRole: "reviewer",
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
      activeRole: "implementer",
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

  it("routes shared agent retries from explicit active role instead of agent identity guess", async () => {
    const calls: string[][] = [];
    const runner: TmuxRunner = (args): Promise<TmuxRunResult> => {
      calls.push(args);
      if (args[0] === "capture-pane") {
        return Promise.resolve({
          stdout: [
            "",
            "❯ # [pairflow] r2 HUMAN_REPLY human->codex msg=msg_456 ref=reply.md."
          ].join("\n"),
          stderr: "",
          exitCode: 0
        });
      }
      return Promise.resolve({ stdout: "", stderr: "", exitCode: 0 });
    };

    const result = await retryStuckAgentInput({
      bubbleId: "b_delivery_01",
      bubbleConfig: createSharedAgentConfig("codex"),
      sessionsPath: "/tmp/sessions.json",
      activeRole: "reviewer",
      runner,
      readSessionsRegistry: () => Promise.resolve(createRegistry())
    });

    expect(result.retried).toBe(true);
    expect(calls).toContainEqual([
      "capture-pane",
      "-pt",
      "pf-b_delivery_01:0.2"
    ]);
    expect(calls).toContainEqual([
      "send-keys",
      "-t",
      "pf-b_delivery_01:0.2",
      "Enter"
    ]);
  });

  it("routes meta-reviewer retries from explicit active role to pane 3", async () => {
    const calls: string[][] = [];
    const runner: TmuxRunner = (args): Promise<TmuxRunResult> => {
      calls.push(args);
      if (args[0] === "capture-pane") {
        return Promise.resolve({
          stdout: [
            "",
            "❯ # [pairflow] r2 PASS claude->codex msg=msg_789 ref=meta-review.md."
          ].join("\n"),
          stderr: "",
          exitCode: 0
        });
      }
      return Promise.resolve({ stdout: "", stderr: "", exitCode: 0 });
    };

    const result = await retryStuckAgentInput({
      bubbleId: "b_delivery_01",
      bubbleConfig: createSharedAgentConfig("codex"),
      sessionsPath: "/tmp/sessions.json",
      activeRole: "meta_reviewer",
      runner,
      readSessionsRegistry: () => Promise.resolve(createRegistry())
    });

    expect(result.retried).toBe(true);
    expect(calls).toContainEqual([
      "capture-pane",
      "-pt",
      "pf-b_delivery_01:0.3"
    ]);
    expect(calls).toContainEqual([
      "send-keys",
      "-t",
      "pf-b_delivery_01:0.3",
      "Enter"
    ]);
  });

  it("fails closed with BubbleWatchdogError when retry receives an invalid active role", async () => {
    await expect(
      retryStuckAgentInput({
        bubbleId: "b_delivery_01",
        bubbleConfig: baseConfig,
        sessionsPath: "/tmp/sessions.json",
        activeRole: "human" as never,
        readSessionsRegistry: () => Promise.resolve(createRegistry())
      })
    ).rejects.toBeInstanceOf(BubbleWatchdogError);
  });
});
