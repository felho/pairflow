import { describe, expect, it } from "vitest";

import { buildRunningExecutionContext } from "../../../../../src/v11/shared/state/executionContext.js";
import {
  buildRemoteBubbleApprovalScript,
  executeRemoteBubbleApprovalCommand
} from "../../../../../src/v11/infrastructure/executor/ssh/sshBubbleApprovalCommand.js";
import type {
  RemoteBubbleApprovalCommandError
} from "../../../../../src/v11/infrastructure/executor/ssh/sshBubbleApprovalCommand.js";

describe("sshBubbleApprovalCommand", () => {
  it("builds a remote approve script that preserves PATH authority and remote clone routing", () => {
    const script = buildRemoteBubbleApprovalScript({
      action: "approve",
      bubbleId: "b_remote_approval_01",
      remoteClonePath: "/srv/pairflow clones/repo's bubble",
      remoteTarget: {
        alias: "prod",
        host: "ssh.example.com",
        user: "pairflow",
        pairflowCommand: "pairflow"
      },
      refs: ["artifact://done-package.md"],
      overrideNonApprove: true,
      overrideReason: "human override"
    });

    expect(script).toContain("cd '/srv/pairflow clones/repo'\\''s bubble'");
    expect(script).toContain(
      "export PAIRFLOW_WORKTREE_ROOT='/srv/pairflow clones/repo'\\''s bubble'"
    );
    expect(script).toContain(
      "'pairflow' 'bubble' 'approve' '--id' 'b_remote_approval_01' '--repo' '/srv/pairflow clones/repo'\\''s bubble'"
    );
    expect(script).toContain("'--override-non-approve'");
    expect(script).toContain("'--override-reason' 'human override'");
    expect(script).toContain("'--ref' 'artifact://done-package.md'");
  });

  it("parses a routed remote approve result from remote transcript and state artifacts", async () => {
    const result = await executeRemoteBubbleApprovalCommand(
      {
        action: "approve",
        bubbleId: "b_remote_approval_01",
        remoteClonePath: "/srv/pairflow/repo--b_remote_approval_01",
        remoteTarget: {
          alias: "prod",
          host: "ssh.example.com",
          user: "pairflow",
          pairflowCommand: "pairflow"
        },
        refs: [],
        overrideNonApprove: false
      },
      {
        runCommand: async () => ({
          stdout: [
            "APPROVAL_DECISION recorded for b_remote_approval_01: msg_remote_approval_01 -> approve",
            "__PAIRFLOW_REMOTE_APPROVAL_BEFORE_STATE_START__",
            JSON.stringify({
              bubble_id: "b_remote_approval_01",
              state: "READY_FOR_HUMAN_APPROVAL",
              round: 2,
              active_agent: null,
              active_since: null,
              active_role: null,
              execution_context: null,
              round_role_history: [],
              last_command_at: "2026-04-17T09:04:00.000Z",
              pending_rework_intent: null,
              rework_intent_history: []
            }),
            "__PAIRFLOW_REMOTE_APPROVAL_BEFORE_STATE_END__",
            "__PAIRFLOW_REMOTE_APPROVAL_AFTER_STATE_START__",
            JSON.stringify({
              bubble_id: "b_remote_approval_01",
              state: "APPROVED_FOR_COMMIT",
              round: 2,
              active_agent: null,
              active_since: null,
              active_role: null,
              execution_context: null,
              round_role_history: [],
              last_command_at: "2026-04-17T09:05:00.000Z",
              pending_rework_intent: null,
              rework_intent_history: []
            }),
            "__PAIRFLOW_REMOTE_APPROVAL_AFTER_STATE_END__",
            "__PAIRFLOW_REMOTE_APPROVAL_TRANSCRIPT_COUNT_START__",
            "14",
            "__PAIRFLOW_REMOTE_APPROVAL_TRANSCRIPT_COUNT_END__",
            "__PAIRFLOW_REMOTE_APPROVAL_TRANSCRIPT_LINE_START__",
	            JSON.stringify({
	              id: "msg_remote_approval_01",
	              ts: "2026-04-17T09:05:00.000Z",
	              bubble_id: "b_remote_approval_01",
	              sender: "human",
	              recipient: "orchestrator",
	              type: "APPROVAL_DECISION",
	              round: 2,
	              payload: {
	                decision: "approve",
	                metadata: {
	                  delivery_target_role: "status"
	                }
	              },
	              refs: []
	            }),
            "__PAIRFLOW_REMOTE_APPROVAL_TRANSCRIPT_LINE_END__"
          ].join("\n"),
          stderr: "",
          exitCode: 0
        })
      }
    );

    expect(result).toMatchObject({
      kind: "decision",
      bubbleId: "b_remote_approval_01",
      sequence: 14,
      envelope: {
        id: "msg_remote_approval_01",
        type: "APPROVAL_DECISION"
      },
      state: {
        state: "APPROVED_FOR_COMMIT"
      }
    });
  });

  it("fails closed when remote approve returns a non-APPROVED_FOR_COMMIT state", async () => {
    const promise = executeRemoteBubbleApprovalCommand(
      {
        action: "approve",
        bubbleId: "b_remote_approval_invalid_state_01",
        remoteClonePath: "/srv/pairflow/repo--b_remote_approval_invalid_state_01",
        remoteTarget: {
          alias: "prod",
          host: "ssh.example.com",
          user: "pairflow",
          pairflowCommand: "pairflow"
        },
        refs: [],
        overrideNonApprove: false
      },
      {
        runCommand: async () => ({
          stdout: [
            "APPROVAL_DECISION recorded for b_remote_approval_invalid_state_01: msg_remote_approval_invalid_state_01 -> approve",
            "__PAIRFLOW_REMOTE_APPROVAL_BEFORE_STATE_START__",
            JSON.stringify({
              bubble_id: "b_remote_approval_invalid_state_01",
              state: "READY_FOR_HUMAN_APPROVAL",
              round: 2,
              active_agent: null,
              active_since: null,
              active_role: null,
              execution_context: null,
              round_role_history: [],
              last_command_at: "2026-04-17T09:04:00.000Z",
              pending_rework_intent: null,
              rework_intent_history: []
            }),
            "__PAIRFLOW_REMOTE_APPROVAL_BEFORE_STATE_END__",
            "__PAIRFLOW_REMOTE_APPROVAL_AFTER_STATE_START__",
            JSON.stringify({
              bubble_id: "b_remote_approval_invalid_state_01",
              state: "READY_FOR_HUMAN_APPROVAL",
              round: 2,
              active_agent: null,
              active_since: null,
              active_role: null,
              execution_context: null,
              round_role_history: [],
              last_command_at: "2026-04-17T09:05:00.000Z",
              pending_rework_intent: null,
              rework_intent_history: []
            }),
            "__PAIRFLOW_REMOTE_APPROVAL_AFTER_STATE_END__",
            "__PAIRFLOW_REMOTE_APPROVAL_TRANSCRIPT_COUNT_START__",
            "14",
            "__PAIRFLOW_REMOTE_APPROVAL_TRANSCRIPT_COUNT_END__",
            "__PAIRFLOW_REMOTE_APPROVAL_TRANSCRIPT_LINE_START__",
            JSON.stringify({
              id: "msg_remote_approval_invalid_state_01",
              ts: "2026-04-17T09:05:00.000Z",
              bubble_id: "b_remote_approval_invalid_state_01",
              sender: "human",
              recipient: "orchestrator",
	              type: "APPROVAL_DECISION",
	              round: 2,
	              payload: {
	                decision: "approve",
	                metadata: {
	                  delivery_target_role: "status"
	                }
	              },
	              refs: []
	            }),
            "__PAIRFLOW_REMOTE_APPROVAL_TRANSCRIPT_LINE_END__"
          ].join("\n"),
          stderr: "",
          exitCode: 0
        })
      }
    );

    await expect(promise).rejects.toMatchObject({
      code: "REMOTE_APPROVAL_PAYLOAD_INVALID",
    } satisfies Partial<RemoteBubbleApprovalCommandError>);
    await expect(promise).rejects.toThrow(/expected 'APPROVED_FOR_COMMIT'/u);
  });

  it("parses queued request-rework from remote state without relying on local mutation artifacts", async () => {
    const result = await executeRemoteBubbleApprovalCommand(
      {
        action: "request-rework",
        bubbleId: "b_remote_rework_01",
        remoteClonePath: "/srv/pairflow/repo--b_remote_rework_01",
        remoteTarget: {
          alias: "prod",
          host: "ssh.example.com",
          user: "pairflow",
          pairflowCommand: "pairflow"
        },
        refs: ["artifact://review.md"],
        message: "Please rework."
      },
      {
        runCommand: async () => ({
          stdout: [
            "Queued remote rework intent for b_remote_rework_01",
            "__PAIRFLOW_REMOTE_APPROVAL_BEFORE_STATE_START__",
            JSON.stringify({
              bubble_id: "b_remote_rework_01",
              state: "WAITING_HUMAN",
              round: 3,
              active_agent: null,
              active_since: null,
              active_role: null,
              execution_context: null,
              round_role_history: [],
              last_command_at: "2026-04-17T09:08:00.000Z",
              pending_rework_intent: {
                intent_id: "intent_old",
                message: "Old",
                requested_by: "human:request-rework",
                requested_at: "2026-04-17T09:07:00.000Z",
                status: "pending"
              },
              rework_intent_history: []
            }),
            "__PAIRFLOW_REMOTE_APPROVAL_BEFORE_STATE_END__",
            "__PAIRFLOW_REMOTE_APPROVAL_AFTER_STATE_START__",
            JSON.stringify({
              bubble_id: "b_remote_rework_01",
              state: "WAITING_HUMAN",
              round: 3,
              active_agent: null,
              active_since: null,
              active_role: null,
              execution_context: null,
              round_role_history: [],
              last_command_at: "2026-04-17T09:09:00.000Z",
              pending_rework_intent: {
                intent_id: "intent_new",
                message: "Please rework.",
                refs: ["artifact://review.md"],
                requested_by: "human:request-rework",
                requested_at: "2026-04-17T09:09:00.000Z",
                status: "pending"
              },
              rework_intent_history: [
                {
                  intent_id: "intent_old",
                  message: "Old",
                  requested_by: "human:request-rework",
                  requested_at: "2026-04-17T09:07:00.000Z",
                  status: "superseded",
                  superseded_by_intent_id: "intent_new"
                }
              ]
            }),
            "__PAIRFLOW_REMOTE_APPROVAL_AFTER_STATE_END__",
            "__PAIRFLOW_REMOTE_APPROVAL_TRANSCRIPT_COUNT_START__",
            "18",
            "__PAIRFLOW_REMOTE_APPROVAL_TRANSCRIPT_COUNT_END__",
            "__PAIRFLOW_REMOTE_APPROVAL_TRANSCRIPT_LINE_START__",
            "",
            "__PAIRFLOW_REMOTE_APPROVAL_TRANSCRIPT_LINE_END__"
          ].join("\n"),
          stderr: "",
          exitCode: 0
        })
      }
    );

    expect(result).toMatchObject({
      kind: "queued_rework",
      bubbleId: "b_remote_rework_01",
      intentId: "intent_new",
      supersededIntentId: "intent_old",
      state: {
        state: "WAITING_HUMAN"
      }
    });
  });

  it("parses immediate remote request-rework from transcript and remote state", async () => {
    const result = await executeRemoteBubbleApprovalCommand(
      {
        action: "request-rework",
        bubbleId: "b_remote_rework_immediate_01",
        remoteClonePath: "/srv/pairflow/repo--b_remote_rework_immediate_01",
        remoteTarget: {
          alias: "prod",
          host: "ssh.example.com",
          user: "pairflow",
          pairflowCommand: "pairflow"
        },
        refs: ["artifact://review.md"],
        message: "Please rework."
      },
      {
        runCommand: async () => ({
          stdout: [
            "APPROVAL_DECISION recorded for b_remote_rework_immediate_01: msg_remote_rework_immediate_01 -> rework",
            "__PAIRFLOW_REMOTE_APPROVAL_BEFORE_STATE_START__",
            JSON.stringify({
              bubble_id: "b_remote_rework_immediate_01",
              state: "READY_FOR_HUMAN_APPROVAL",
              round: 3,
              active_agent: null,
              active_since: null,
              active_role: null,
              execution_context: null,
              round_role_history: [],
              last_command_at: "2026-04-17T09:08:00.000Z",
              pending_rework_intent: null,
              rework_intent_history: []
            }),
            "__PAIRFLOW_REMOTE_APPROVAL_BEFORE_STATE_END__",
            "__PAIRFLOW_REMOTE_APPROVAL_AFTER_STATE_START__",
            JSON.stringify({
              bubble_id: "b_remote_rework_immediate_01",
              state: "RUNNING",
              round: 4,
              active_agent: "codex",
              active_since: "2026-04-17T09:09:00.000Z",
              active_role: "implementer",
              execution_context: buildRunningExecutionContext({
                bubbleId: "b_remote_rework_immediate_01",
                round: 4,
                activeRole: "implementer",
                startedAt: "2026-04-17T09:09:00.000Z",
                watchdogTimeoutMinutes: 30
              }),
              round_role_history: [],
              last_command_at: "2026-04-17T09:09:00.000Z",
              pending_rework_intent: null,
              rework_intent_history: []
            }),
            "__PAIRFLOW_REMOTE_APPROVAL_AFTER_STATE_END__",
            "__PAIRFLOW_REMOTE_APPROVAL_TRANSCRIPT_COUNT_START__",
            "19",
            "__PAIRFLOW_REMOTE_APPROVAL_TRANSCRIPT_COUNT_END__",
            "__PAIRFLOW_REMOTE_APPROVAL_TRANSCRIPT_LINE_START__",
            JSON.stringify({
              id: "msg_remote_rework_immediate_01",
              ts: "2026-04-17T09:09:00.000Z",
              bubble_id: "b_remote_rework_immediate_01",
              sender: "human",
              recipient: "orchestrator",
	              type: "APPROVAL_DECISION",
	              round: 3,
	              payload: {
	                decision: "rework",
	                message: "Please rework.",
	                metadata: {
	                  delivery_target_role: "status"
	                }
	              },
	              refs: ["artifact://review.md"]
	            }),
            "__PAIRFLOW_REMOTE_APPROVAL_TRANSCRIPT_LINE_END__"
          ].join("\n"),
          stderr: "",
          exitCode: 0
        })
      }
    );

    expect(result).toMatchObject({
      kind: "decision",
      bubbleId: "b_remote_rework_immediate_01",
      sequence: 19,
      envelope: {
        id: "msg_remote_rework_immediate_01",
        type: "APPROVAL_DECISION",
        payload: {
          decision: "rework",
          message: "Please rework."
        }
      },
      state: {
        state: "RUNNING",
        active_role: "implementer"
      }
    });
  });

  it("fails closed when immediate remote request-rework returns a non-RUNNING state", async () => {
    const promise = executeRemoteBubbleApprovalCommand(
      {
        action: "request-rework",
        bubbleId: "b_remote_rework_invalid_state_01",
        remoteClonePath: "/srv/pairflow/repo--b_remote_rework_invalid_state_01",
        remoteTarget: {
          alias: "prod",
          host: "ssh.example.com",
          user: "pairflow",
          pairflowCommand: "pairflow"
        },
        refs: ["artifact://review.md"],
        message: "Please rework."
      },
      {
        runCommand: async () => ({
          stdout: [
            "APPROVAL_DECISION recorded for b_remote_rework_invalid_state_01: msg_remote_rework_invalid_state_01 -> rework",
            "__PAIRFLOW_REMOTE_APPROVAL_BEFORE_STATE_START__",
            JSON.stringify({
              bubble_id: "b_remote_rework_invalid_state_01",
              state: "READY_FOR_HUMAN_APPROVAL",
              round: 3,
              active_agent: null,
              active_since: null,
              active_role: null,
              execution_context: null,
              round_role_history: [],
              last_command_at: "2026-04-17T09:08:00.000Z",
              pending_rework_intent: null,
              rework_intent_history: []
            }),
            "__PAIRFLOW_REMOTE_APPROVAL_BEFORE_STATE_END__",
            "__PAIRFLOW_REMOTE_APPROVAL_AFTER_STATE_START__",
            JSON.stringify({
              bubble_id: "b_remote_rework_invalid_state_01",
              state: "READY_FOR_HUMAN_APPROVAL",
              round: 3,
              active_agent: null,
              active_since: null,
              active_role: null,
              execution_context: null,
              round_role_history: [],
              last_command_at: "2026-04-17T09:09:00.000Z",
              pending_rework_intent: null,
              rework_intent_history: []
            }),
            "__PAIRFLOW_REMOTE_APPROVAL_AFTER_STATE_END__",
            "__PAIRFLOW_REMOTE_APPROVAL_TRANSCRIPT_COUNT_START__",
            "18",
            "__PAIRFLOW_REMOTE_APPROVAL_TRANSCRIPT_COUNT_END__",
            "__PAIRFLOW_REMOTE_APPROVAL_TRANSCRIPT_LINE_START__",
            JSON.stringify({
              id: "msg_remote_rework_invalid_state_01",
              ts: "2026-04-17T09:09:00.000Z",
              bubble_id: "b_remote_rework_invalid_state_01",
              sender: "human",
              recipient: "orchestrator",
	              type: "APPROVAL_DECISION",
	              round: 3,
	              payload: {
	                decision: "rework",
	                message: "Please rework.",
	                metadata: {
	                  delivery_target_role: "status"
	                }
	              },
	              refs: ["artifact://review.md"]
	            }),
            "__PAIRFLOW_REMOTE_APPROVAL_TRANSCRIPT_LINE_END__"
          ].join("\n"),
          stderr: "",
          exitCode: 0
        })
      }
    );

    await expect(promise).rejects.toMatchObject({
      code: "REMOTE_APPROVAL_PAYLOAD_INVALID",
    } satisfies Partial<RemoteBubbleApprovalCommandError>);
    await expect(promise).rejects.toThrow(/expected 'RUNNING'/u);
  });

  it("fails closed when the remote payload markers are incomplete", async () => {
    await expect(() =>
      executeRemoteBubbleApprovalCommand(
        {
          action: "approve",
          bubbleId: "b_remote_invalid_01",
          remoteClonePath: "/srv/pairflow/repo--b_remote_invalid_01",
          remoteTarget: {
            alias: "prod",
            host: "ssh.example.com",
            pairflowCommand: "pairflow"
          },
          refs: [],
          overrideNonApprove: false
        },
        {
          runCommand: async () => ({
            stdout: "__PAIRFLOW_REMOTE_APPROVAL_AFTER_STATE_START__\n{}\n",
            stderr: "",
            exitCode: 0
          })
        }
      )
    ).rejects.toMatchObject({
      code: "REMOTE_APPROVAL_PAYLOAD_INVALID"
    } satisfies Partial<RemoteBubbleApprovalCommandError>);
  });

  it("fails closed when remote approve returns an empty decision transcript line", async () => {
    const promise = executeRemoteBubbleApprovalCommand(
      {
        action: "approve",
        bubbleId: "b_remote_approval_empty_line_01",
        remoteClonePath: "/srv/pairflow/repo--b_remote_approval_empty_line_01",
        remoteTarget: {
          alias: "prod",
          host: "ssh.example.com",
          pairflowCommand: "pairflow"
        },
        refs: [],
        overrideNonApprove: false
      },
      {
        runCommand: async () => ({
          stdout: [
            "APPROVAL_DECISION recorded for b_remote_approval_empty_line_01: msg_remote_approval_empty_line_01 -> approve",
            "__PAIRFLOW_REMOTE_APPROVAL_BEFORE_STATE_START__",
            JSON.stringify({
              bubble_id: "b_remote_approval_empty_line_01",
              state: "READY_FOR_HUMAN_APPROVAL",
              round: 2,
              active_agent: null,
              active_since: null,
              active_role: null,
              execution_context: null,
              round_role_history: [],
              last_command_at: "2026-04-17T09:04:00.000Z",
              pending_rework_intent: null,
              rework_intent_history: []
            }),
            "__PAIRFLOW_REMOTE_APPROVAL_BEFORE_STATE_END__",
            "__PAIRFLOW_REMOTE_APPROVAL_AFTER_STATE_START__",
            JSON.stringify({
              bubble_id: "b_remote_approval_empty_line_01",
              state: "APPROVED_FOR_COMMIT",
              round: 2,
              active_agent: null,
              active_since: null,
              active_role: null,
              execution_context: null,
              round_role_history: [],
              last_command_at: "2026-04-17T09:05:00.000Z",
              pending_rework_intent: null,
              rework_intent_history: []
            }),
            "__PAIRFLOW_REMOTE_APPROVAL_AFTER_STATE_END__",
            "__PAIRFLOW_REMOTE_APPROVAL_TRANSCRIPT_COUNT_START__",
            "14",
            "__PAIRFLOW_REMOTE_APPROVAL_TRANSCRIPT_COUNT_END__",
            "__PAIRFLOW_REMOTE_APPROVAL_TRANSCRIPT_LINE_START__",
            "",
            "__PAIRFLOW_REMOTE_APPROVAL_TRANSCRIPT_LINE_END__"
          ].join("\n"),
          stderr: "",
          exitCode: 0
        })
      }
    );

    await expect(promise).rejects.toMatchObject({
      code: "REMOTE_APPROVAL_PAYLOAD_INVALID",
    } satisfies Partial<RemoteBubbleApprovalCommandError>);
    await expect(promise).rejects.toThrow(/invalid approval decision transcript line/u);
  });

  it("fails closed when duplicate marker envelopes appear in remote stdout", async () => {
    const duplicateBeforeState = JSON.stringify({
      bubble_id: "b_remote_duplicate_markers_01",
      state: "READY_FOR_HUMAN_APPROVAL",
      round: 2,
      active_agent: null,
      active_since: null,
      active_role: null,
      execution_context: null,
      round_role_history: [],
      last_command_at: "2026-04-17T09:04:00.000Z",
      pending_rework_intent: null,
      rework_intent_history: []
    });

    const promise = executeRemoteBubbleApprovalCommand(
      {
        action: "approve",
        bubbleId: "b_remote_duplicate_markers_01",
        remoteClonePath: "/srv/pairflow/repo--b_remote_duplicate_markers_01",
        remoteTarget: {
          alias: "prod",
          host: "ssh.example.com",
          pairflowCommand: "pairflow"
        },
        refs: [],
        overrideNonApprove: false
      },
      {
        runCommand: async () => ({
          stdout: [
            "__PAIRFLOW_REMOTE_APPROVAL_BEFORE_STATE_START__",
            duplicateBeforeState,
            "__PAIRFLOW_REMOTE_APPROVAL_BEFORE_STATE_END__",
            "__PAIRFLOW_REMOTE_APPROVAL_BEFORE_STATE_START__",
            duplicateBeforeState,
            "__PAIRFLOW_REMOTE_APPROVAL_BEFORE_STATE_END__",
            "__PAIRFLOW_REMOTE_APPROVAL_AFTER_STATE_START__",
            JSON.stringify({
              bubble_id: "b_remote_duplicate_markers_01",
              state: "APPROVED_FOR_COMMIT",
              round: 2,
              active_agent: null,
              active_since: null,
              active_role: null,
              execution_context: null,
              round_role_history: [],
              last_command_at: "2026-04-17T09:05:00.000Z",
              pending_rework_intent: null,
              rework_intent_history: []
            }),
            "__PAIRFLOW_REMOTE_APPROVAL_AFTER_STATE_END__",
            "__PAIRFLOW_REMOTE_APPROVAL_TRANSCRIPT_COUNT_START__",
            "14",
            "__PAIRFLOW_REMOTE_APPROVAL_TRANSCRIPT_COUNT_END__",
            "__PAIRFLOW_REMOTE_APPROVAL_TRANSCRIPT_LINE_START__",
            JSON.stringify({
              id: "msg_remote_duplicate_markers_01",
              ts: "2026-04-17T09:05:00.000Z",
              bubble_id: "b_remote_duplicate_markers_01",
              sender: "human",
              recipient: "orchestrator",
	              type: "APPROVAL_DECISION",
	              round: 2,
	              payload: {
	                decision: "approve",
	                metadata: {
	                  delivery_target_role: "status"
	                }
	              },
	              refs: []
	            }),
            "__PAIRFLOW_REMOTE_APPROVAL_TRANSCRIPT_LINE_END__"
          ].join("\n"),
          stderr: "",
          exitCode: 0
        })
      }
    );

    await expect(promise).rejects.toMatchObject({
      code: "REMOTE_APPROVAL_PAYLOAD_INVALID",
    } satisfies Partial<RemoteBubbleApprovalCommandError>);
    await expect(promise).rejects.toThrow(/without exactly one before-state marker envelope/u);
  });

  it("maps ssh non-zero exit to a transport failure", async () => {
    const promise = executeRemoteBubbleApprovalCommand(
      {
        action: "approve",
        bubbleId: "b_remote_transport_01",
        remoteClonePath: "/srv/pairflow/repo--b_remote_transport_01",
        remoteTarget: {
          alias: "prod",
          host: "ssh.example.com",
          pairflowCommand: "pairflow"
        },
        refs: [],
        overrideNonApprove: false
      },
      {
        runCommand: async () => ({
          stdout: "",
          stderr: "ssh: connect to host ssh.example.com port 22: Connection refused",
          exitCode: 255
        })
      }
    );

    await expect(promise).rejects.toMatchObject({
      code: "REMOTE_APPROVAL_TRANSPORT_FAILED",
    } satisfies Partial<RemoteBubbleApprovalCommandError>);
    await expect(promise).rejects.toThrow(/ssh transport failed \(exit 255\)/u);
  });

  it("wraps transport spawn failures into remote approval transport taxonomy", async () => {
    const promise = executeRemoteBubbleApprovalCommand(
      {
        action: "approve",
        bubbleId: "b_remote_transport_throw_01",
        remoteClonePath: "/srv/pairflow/repo--b_remote_transport_throw_01",
        remoteTarget: {
          alias: "prod",
          host: "ssh.example.com",
          pairflowCommand: "pairflow"
        },
        refs: [],
        overrideNonApprove: false
      },
      {
        runCommand: async () => {
          throw new Error("spawn ssh ENOENT");
        }
      }
    );

    await expect(promise).rejects.toMatchObject({
      code: "REMOTE_APPROVAL_TRANSPORT_FAILED",
    } satisfies Partial<RemoteBubbleApprovalCommandError>);
    await expect(promise).rejects.toThrow(/spawn ssh ENOENT/u);
  });

  it("fails closed when queued remote rework returns a non-WAITING_HUMAN state", async () => {
    const promise = executeRemoteBubbleApprovalCommand(
      {
        action: "request-rework",
        bubbleId: "b_remote_rework_invalid_01",
        remoteClonePath: "/srv/pairflow/repo--b_remote_rework_invalid_01",
        remoteTarget: {
          alias: "prod",
          host: "ssh.example.com",
          user: "pairflow",
          pairflowCommand: "pairflow"
        },
        refs: [],
        message: "Please rework."
      },
      {
        runCommand: async () => ({
          stdout: [
            "Queued remote rework intent for b_remote_rework_invalid_01",
            "__PAIRFLOW_REMOTE_APPROVAL_BEFORE_STATE_START__",
            JSON.stringify({
              bubble_id: "b_remote_rework_invalid_01",
              state: "WAITING_HUMAN",
              round: 3,
              active_agent: null,
              active_since: null,
              active_role: null,
              execution_context: null,
              round_role_history: [],
              last_command_at: "2026-04-17T09:08:00.000Z",
              pending_rework_intent: null,
              rework_intent_history: []
            }),
            "__PAIRFLOW_REMOTE_APPROVAL_BEFORE_STATE_END__",
            "__PAIRFLOW_REMOTE_APPROVAL_AFTER_STATE_START__",
            JSON.stringify({
              bubble_id: "b_remote_rework_invalid_01",
              state: "READY_FOR_HUMAN_APPROVAL",
              round: 3,
              active_agent: null,
              active_since: null,
              active_role: null,
              execution_context: null,
              round_role_history: [],
              last_command_at: "2026-04-17T09:09:00.000Z",
              pending_rework_intent: {
                intent_id: "intent_new",
                message: "Please rework.",
                requested_by: "human:request-rework",
                requested_at: "2026-04-17T09:09:00.000Z",
                status: "pending"
              },
              rework_intent_history: []
            }),
            "__PAIRFLOW_REMOTE_APPROVAL_AFTER_STATE_END__",
            "__PAIRFLOW_REMOTE_APPROVAL_TRANSCRIPT_COUNT_START__",
            "18",
            "__PAIRFLOW_REMOTE_APPROVAL_TRANSCRIPT_COUNT_END__",
            "__PAIRFLOW_REMOTE_APPROVAL_TRANSCRIPT_LINE_START__",
            "",
            "__PAIRFLOW_REMOTE_APPROVAL_TRANSCRIPT_LINE_END__"
          ].join("\n"),
          stderr: "",
          exitCode: 0
        })
      }
    );

    await expect(promise).rejects.toMatchObject({
      code: "REMOTE_APPROVAL_PAYLOAD_INVALID",
    } satisfies Partial<RemoteBubbleApprovalCommandError>);
    await expect(promise).rejects.toThrow(/expected 'WAITING_HUMAN'/u);
  });

  it("fails closed when queued remote rework leaves the previous pending intent unchanged", async () => {
    const promise = executeRemoteBubbleApprovalCommand(
      {
        action: "request-rework",
        bubbleId: "b_remote_rework_stale_01",
        remoteClonePath: "/srv/pairflow/repo--b_remote_rework_stale_01",
        remoteTarget: {
          alias: "prod",
          host: "ssh.example.com",
          user: "pairflow",
          pairflowCommand: "pairflow"
        },
        refs: ["artifact://review.md"],
        message: "Please rework."
      },
      {
        runCommand: async () => ({
          stdout: [
            "Queued remote rework intent for b_remote_rework_stale_01",
            "__PAIRFLOW_REMOTE_APPROVAL_BEFORE_STATE_START__",
            JSON.stringify({
              bubble_id: "b_remote_rework_stale_01",
              state: "WAITING_HUMAN",
              round: 3,
              active_agent: null,
              active_since: null,
              active_role: null,
              execution_context: null,
              round_role_history: [],
              last_command_at: "2026-04-17T09:08:00.000Z",
              pending_rework_intent: {
                intent_id: "intent_old",
                message: "Please rework.",
                refs: ["artifact://review.md"],
                requested_by: "human:request-rework",
                requested_at: "2026-04-17T09:07:00.000Z",
                status: "pending"
              },
              rework_intent_history: []
            }),
            "__PAIRFLOW_REMOTE_APPROVAL_BEFORE_STATE_END__",
            "__PAIRFLOW_REMOTE_APPROVAL_AFTER_STATE_START__",
            JSON.stringify({
              bubble_id: "b_remote_rework_stale_01",
              state: "WAITING_HUMAN",
              round: 3,
              active_agent: null,
              active_since: null,
              active_role: null,
              execution_context: null,
              round_role_history: [],
              last_command_at: "2026-04-17T09:09:00.000Z",
              pending_rework_intent: {
                intent_id: "intent_old",
                message: "Please rework.",
                refs: ["artifact://review.md"],
                requested_by: "human:request-rework",
                requested_at: "2026-04-17T09:07:00.000Z",
                status: "pending"
              },
              rework_intent_history: []
            }),
            "__PAIRFLOW_REMOTE_APPROVAL_AFTER_STATE_END__",
            "__PAIRFLOW_REMOTE_APPROVAL_TRANSCRIPT_COUNT_START__",
            "18",
            "__PAIRFLOW_REMOTE_APPROVAL_TRANSCRIPT_COUNT_END__",
            "__PAIRFLOW_REMOTE_APPROVAL_TRANSCRIPT_LINE_START__",
            "",
            "__PAIRFLOW_REMOTE_APPROVAL_TRANSCRIPT_LINE_END__"
          ].join("\n"),
          stderr: "",
          exitCode: 0
        })
      }
    );

    await expect(promise).rejects.toMatchObject({
      code: "REMOTE_APPROVAL_PAYLOAD_INVALID",
    } satisfies Partial<RemoteBubbleApprovalCommandError>);
    await expect(promise).rejects.toThrow(/did not create a new pending intent/u);
  });

  it("fails closed when remote approve transcript refs drift from the routed request", async () => {
    const promise = executeRemoteBubbleApprovalCommand(
      {
        action: "approve",
        bubbleId: "b_remote_approval_refs_mismatch_01",
        remoteClonePath: "/srv/pairflow/repo--b_remote_approval_refs_mismatch_01",
        remoteTarget: {
          alias: "prod",
          host: "ssh.example.com",
          pairflowCommand: "pairflow"
        },
        refs: ["artifact://expected.md"],
        overrideNonApprove: false
      },
      {
        runCommand: async () => ({
          stdout: [
            "__PAIRFLOW_REMOTE_APPROVAL_BEFORE_STATE_START__",
            JSON.stringify({
              bubble_id: "b_remote_approval_refs_mismatch_01",
              state: "READY_FOR_HUMAN_APPROVAL",
              round: 2,
              active_agent: null,
              active_since: null,
              active_role: null,
              execution_context: null,
              round_role_history: [],
              last_command_at: "2026-04-17T09:04:00.000Z",
              pending_rework_intent: null,
              rework_intent_history: []
            }),
            "__PAIRFLOW_REMOTE_APPROVAL_BEFORE_STATE_END__",
            "__PAIRFLOW_REMOTE_APPROVAL_AFTER_STATE_START__",
            JSON.stringify({
              bubble_id: "b_remote_approval_refs_mismatch_01",
              state: "APPROVED_FOR_COMMIT",
              round: 2,
              active_agent: null,
              active_since: null,
              active_role: null,
              execution_context: null,
              round_role_history: [],
              last_command_at: "2026-04-17T09:05:00.000Z",
              pending_rework_intent: null,
              rework_intent_history: []
            }),
            "__PAIRFLOW_REMOTE_APPROVAL_AFTER_STATE_END__",
            "__PAIRFLOW_REMOTE_APPROVAL_TRANSCRIPT_COUNT_START__",
            "14",
            "__PAIRFLOW_REMOTE_APPROVAL_TRANSCRIPT_COUNT_END__",
            "__PAIRFLOW_REMOTE_APPROVAL_TRANSCRIPT_LINE_START__",
            JSON.stringify({
              id: "msg_remote_approval_refs_mismatch_01",
              ts: "2026-04-17T09:05:00.000Z",
              bubble_id: "b_remote_approval_refs_mismatch_01",
              sender: "human",
              recipient: "orchestrator",
              type: "APPROVAL_DECISION",
              round: 2,
              payload: {
                decision: "approve",
                metadata: {
                  delivery_target_role: "status"
                }
              },
              refs: ["artifact://actual.md"]
            }),
            "__PAIRFLOW_REMOTE_APPROVAL_TRANSCRIPT_LINE_END__"
          ].join("\n"),
          stderr: "",
          exitCode: 0
        })
      }
    );

    await expect(promise).rejects.toMatchObject({
      code: "REMOTE_APPROVAL_PAYLOAD_INVALID",
    } satisfies Partial<RemoteBubbleApprovalCommandError>);
    await expect(promise).rejects.toThrow(/unexpected refs/u);
  });

  it("fails closed when immediate remote rework transcript message drifts from the routed request", async () => {
    const promise = executeRemoteBubbleApprovalCommand(
      {
        action: "request-rework",
        bubbleId: "b_remote_rework_message_mismatch_01",
        remoteClonePath: "/srv/pairflow/repo--b_remote_rework_message_mismatch_01",
        remoteTarget: {
          alias: "prod",
          host: "ssh.example.com",
          pairflowCommand: "pairflow"
        },
        refs: [],
        message: "Please rework."
      },
      {
        runCommand: async () => ({
          stdout: [
            "__PAIRFLOW_REMOTE_APPROVAL_BEFORE_STATE_START__",
            JSON.stringify({
              bubble_id: "b_remote_rework_message_mismatch_01",
              state: "READY_FOR_HUMAN_APPROVAL",
              round: 3,
              active_agent: null,
              active_since: null,
              active_role: null,
              execution_context: null,
              round_role_history: [],
              last_command_at: "2026-04-17T09:08:00.000Z",
              pending_rework_intent: null,
              rework_intent_history: []
            }),
            "__PAIRFLOW_REMOTE_APPROVAL_BEFORE_STATE_END__",
            "__PAIRFLOW_REMOTE_APPROVAL_AFTER_STATE_START__",
            JSON.stringify({
              bubble_id: "b_remote_rework_message_mismatch_01",
              state: "RUNNING",
              round: 4,
              active_agent: "codex",
              active_since: "2026-04-17T09:09:00.000Z",
              active_role: "implementer",
              execution_context: buildRunningExecutionContext({
                bubbleId: "b_remote_rework_message_mismatch_01",
                round: 4,
                activeRole: "implementer",
                startedAt: "2026-04-17T09:09:00.000Z",
                watchdogTimeoutMinutes: 30
              }),
              round_role_history: [],
              last_command_at: "2026-04-17T09:09:00.000Z",
              pending_rework_intent: null,
              rework_intent_history: []
            }),
            "__PAIRFLOW_REMOTE_APPROVAL_AFTER_STATE_END__",
            "__PAIRFLOW_REMOTE_APPROVAL_TRANSCRIPT_COUNT_START__",
            "19",
            "__PAIRFLOW_REMOTE_APPROVAL_TRANSCRIPT_COUNT_END__",
            "__PAIRFLOW_REMOTE_APPROVAL_TRANSCRIPT_LINE_START__",
            JSON.stringify({
              id: "msg_remote_rework_message_mismatch_01",
              ts: "2026-04-17T09:09:00.000Z",
              bubble_id: "b_remote_rework_message_mismatch_01",
              sender: "human",
              recipient: "orchestrator",
              type: "APPROVAL_DECISION",
              round: 3,
              payload: {
                decision: "rework",
                message: "Different message",
                metadata: {
                  delivery_target_role: "status"
                }
              },
              refs: []
            }),
            "__PAIRFLOW_REMOTE_APPROVAL_TRANSCRIPT_LINE_END__"
          ].join("\n"),
          stderr: "",
          exitCode: 0
        })
      }
    );

    await expect(promise).rejects.toMatchObject({
      code: "REMOTE_APPROVAL_PAYLOAD_INVALID",
    } satisfies Partial<RemoteBubbleApprovalCommandError>);
    await expect(promise).rejects.toThrow(/unexpected decision message/u);
  });

  it("fails closed when remote approve drops required override metadata", async () => {
    const promise = executeRemoteBubbleApprovalCommand(
      {
        action: "approve",
        bubbleId: "b_remote_approval_override_mismatch_01",
        remoteClonePath: "/srv/pairflow/repo--b_remote_approval_override_mismatch_01",
        remoteTarget: {
          alias: "prod",
          host: "ssh.example.com",
          pairflowCommand: "pairflow"
        },
        refs: [],
        overrideNonApprove: true,
        overrideReason: "Human verified manually."
      },
      {
        runCommand: async () => ({
          stdout: [
            "__PAIRFLOW_REMOTE_APPROVAL_BEFORE_STATE_START__",
            JSON.stringify({
              bubble_id: "b_remote_approval_override_mismatch_01",
              state: "READY_FOR_HUMAN_APPROVAL",
              round: 2,
              active_agent: null,
              active_since: null,
              active_role: null,
              execution_context: null,
              round_role_history: [],
              last_command_at: "2026-04-17T09:04:00.000Z",
              pending_rework_intent: null,
              rework_intent_history: []
            }),
            "__PAIRFLOW_REMOTE_APPROVAL_BEFORE_STATE_END__",
            "__PAIRFLOW_REMOTE_APPROVAL_AFTER_STATE_START__",
            JSON.stringify({
              bubble_id: "b_remote_approval_override_mismatch_01",
              state: "APPROVED_FOR_COMMIT",
              round: 2,
              active_agent: null,
              active_since: null,
              active_role: null,
              execution_context: null,
              round_role_history: [],
              last_command_at: "2026-04-17T09:05:00.000Z",
              pending_rework_intent: null,
              rework_intent_history: []
            }),
            "__PAIRFLOW_REMOTE_APPROVAL_AFTER_STATE_END__",
            "__PAIRFLOW_REMOTE_APPROVAL_TRANSCRIPT_COUNT_START__",
            "14",
            "__PAIRFLOW_REMOTE_APPROVAL_TRANSCRIPT_COUNT_END__",
            "__PAIRFLOW_REMOTE_APPROVAL_TRANSCRIPT_LINE_START__",
            JSON.stringify({
              id: "msg_remote_approval_override_mismatch_01",
              ts: "2026-04-17T09:05:00.000Z",
              bubble_id: "b_remote_approval_override_mismatch_01",
              sender: "human",
              recipient: "orchestrator",
              type: "APPROVAL_DECISION",
              round: 2,
              payload: {
                decision: "approve",
                metadata: {
                  delivery_target_role: "status"
                }
              },
              refs: []
            }),
            "__PAIRFLOW_REMOTE_APPROVAL_TRANSCRIPT_LINE_END__"
          ].join("\n"),
          stderr: "",
          exitCode: 0
        })
      }
    );

    await expect(promise).rejects.toMatchObject({
      code: "REMOTE_APPROVAL_PAYLOAD_INVALID",
    } satisfies Partial<RemoteBubbleApprovalCommandError>);
    await expect(promise).rejects.toThrow(/override_non_approve metadata/u);
  });
});
