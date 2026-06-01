import { describe, expect, it, vi } from "vitest";
import type { RemoteBubbleCommitCommandError } from "../../../../../src/v11/infrastructure/executor/ssh/sshBubbleCommitCommand.js";

import {
  buildRemoteBubbleCommitScript,
  executeRemoteBubbleCommitCommand
} from "../../../../../src/v11/infrastructure/executor/ssh/sshBubbleCommitCommand.js";

describe("sshBubbleCommitCommand", () => {
  it("builds a remote commit script that preserves PATH authority and worktree fallback", () => {
    const script = buildRemoteBubbleCommitScript({
      bubbleId: "b_remote_commit_01",
      remoteClonePath: "/srv/pairflow clones/repo's bubble",
      remoteTarget: {
        alias: "prod",
        host: "ssh.example.com",
        user: "pairflow",
        pairflowCommand: "pairflow"
      },
      refs: [".pairflow/evidence/typecheck.log"],
      message: "feat: finalize remote bubble",
      stageAll: true
    });

    expect(script).toContain(
      "export PAIRFLOW_WORKTREE_ROOT='/srv/pairflow clones/repo'\\''s bubble'"
    );
    expect(script).toContain(
      "export PAIRFLOW_REMOTE_COMMIT_MODE='inner_remote_execution'"
    );
    expect(script).toContain(
      "export PAIRFLOW_REMOTE_COMMIT_WORKSPACE_ROOT='/srv/pairflow clones/repo'\\''s bubble'"
    );
    expect(script).toContain(
      "'pairflow' 'bubble' 'commit' '--id' 'b_remote_commit_01' '--repo' '/srv/pairflow clones/repo'\\''s bubble' '--message' 'feat: finalize remote bubble' '--stage-all' '--ref' '.pairflow/evidence/typecheck.log'"
    );
    expect(script).not.toContain("--auto");
    expect(script).not.toContain("DONE_PACKAGE");
    expect(script).not.toContain("done-package.md");
  });

  it("parses a routed remote commit result from remote artifacts", async () => {
    const stdout = [
      "__PAIRFLOW_REMOTE_COMMIT_STATE_START__",
      JSON.stringify({
        bubble_id: "b_remote_commit_01",
        state: "DONE",
        round: 2,
        active_agent: null,
        active_since: null,
        active_role: null,
        execution_context: null,
        round_role_history: [],
        last_command_at: "2026-04-18T08:05:00.000Z",
        pending_rework_intent: null,
        rework_intent_history: []
      }),
      "__PAIRFLOW_REMOTE_COMMIT_STATE_END__",
      "__PAIRFLOW_REMOTE_COMMIT_TRANSCRIPT_START__",
      JSON.stringify({
        id: "msg_done_remote_commit_01",
        ts: "2026-04-18T08:05:00.000Z",
        bubble_id: "b_remote_commit_01",
        sender: "orchestrator",
        recipient: "human",
        type: "COMMIT_RESULT",
        round: 2,
        payload: {
          staged_files: ["feature-remote.txt"],
          commit_message: "bubble(b_remote_commit_01): finalize",
          commit_sha: "abcdef1234567890"
        },
        refs: []
      }),
      "__PAIRFLOW_REMOTE_COMMIT_TRANSCRIPT_END__",
      "__PAIRFLOW_REMOTE_COMMIT_HEAD_SHA_START__",
      "abcdef1234567890",
      "__PAIRFLOW_REMOTE_COMMIT_HEAD_SHA_END__",
      "__PAIRFLOW_REMOTE_COMMIT_HEAD_MESSAGE_START__",
      "bubble(b_remote_commit_01): finalize",
      "__PAIRFLOW_REMOTE_COMMIT_HEAD_MESSAGE_END__",
      "__PAIRFLOW_REMOTE_COMMIT_STAGED_FILES_START__",
      "feature-remote.txt",
      "__PAIRFLOW_REMOTE_COMMIT_STAGED_FILES_END__"
    ].join("\n");

    const result = await executeRemoteBubbleCommitCommand(
      {
        bubbleId: "b_remote_commit_01",
        remoteClonePath: "/srv/pairflow/repo--b_remote_commit_01",
        remoteTarget: {
          alias: "prod",
          host: "ssh.example.com",
          user: "pairflow",
          pairflowCommand: "pairflow"
        },
        refs: [],
        stageAll: false
      },
      {
        runCommand: vi.fn(async () => ({
          stdout,
          stderr: "",
          exitCode: 0
        }))
      }
    );

    expect(result).toMatchObject({
      bubbleId: "b_remote_commit_01",
      sequence: 1,
      state: {
        state: "DONE"
      },
      commitSha: "abcdef1234567890",
      commitMessage: "bubble(b_remote_commit_01): finalize",
      stagedFiles: ["feature-remote.txt"]
    });
    expect(result.envelope.type).toBe("COMMIT_RESULT");
  });

  it("normalizes COMMIT_RESULT commit message metadata before comparing git facts", async () => {
    const stdout = [
      "__PAIRFLOW_REMOTE_COMMIT_STATE_START__",
      JSON.stringify({
        bubble_id: "b_remote_commit_trimmed_message_01",
        state: "DONE",
        round: 2,
        active_agent: null,
        active_since: null,
        active_role: null,
        execution_context: null,
        round_role_history: [],
        last_command_at: "2026-04-18T08:05:30.000Z",
        pending_rework_intent: null,
        rework_intent_history: []
      }),
      "__PAIRFLOW_REMOTE_COMMIT_STATE_END__",
      "__PAIRFLOW_REMOTE_COMMIT_TRANSCRIPT_START__",
      JSON.stringify({
        id: "msg_done_remote_commit_trimmed_message_01",
        ts: "2026-04-18T08:05:30.000Z",
        bubble_id: "b_remote_commit_trimmed_message_01",
        sender: "orchestrator",
        recipient: "human",
        type: "COMMIT_RESULT",
        round: 2,
        payload: {
          staged_files: ["feature-remote.txt"],
          commit_message: "  bubble(b_remote_commit_trimmed_message_01): finalize  ",
          commit_sha: "abcdef1234567890"
        },
        refs: []
      }),
      "__PAIRFLOW_REMOTE_COMMIT_TRANSCRIPT_END__",
      "__PAIRFLOW_REMOTE_COMMIT_HEAD_SHA_START__",
      "abcdef1234567890",
      "__PAIRFLOW_REMOTE_COMMIT_HEAD_SHA_END__",
      "__PAIRFLOW_REMOTE_COMMIT_HEAD_MESSAGE_START__",
      "bubble(b_remote_commit_trimmed_message_01): finalize",
      "__PAIRFLOW_REMOTE_COMMIT_HEAD_MESSAGE_END__",
      "__PAIRFLOW_REMOTE_COMMIT_STAGED_FILES_START__",
      "feature-remote.txt",
      "__PAIRFLOW_REMOTE_COMMIT_STAGED_FILES_END__"
    ].join("\n");

    await expect(
      executeRemoteBubbleCommitCommand(
        {
          bubbleId: "b_remote_commit_trimmed_message_01",
          remoteClonePath: "/srv/pairflow/repo--b_remote_commit_trimmed_message_01",
          remoteTarget: {
            alias: "prod",
            host: "ssh.example.com",
            user: "pairflow",
            pairflowCommand: "pairflow"
          },
          refs: [],
          stageAll: false
        },
        {
          runCommand: vi.fn(async () => ({
            stdout,
            stderr: "",
            exitCode: 0
          }))
        }
      )
    ).resolves.toMatchObject({
      commitMessage: "bubble(b_remote_commit_trimmed_message_01): finalize"
    });
  });

  it("ignores marker-like strings inside payload lines when extracting framed output", async () => {
    const stdout = [
      "__PAIRFLOW_REMOTE_COMMIT_STATE_START__",
      JSON.stringify({
        bubble_id: "b_remote_commit_marker_literal_01",
        state: "DONE",
        round: 2,
        active_agent: null,
        active_since: null,
        active_role: null,
        execution_context: null,
        round_role_history: [],
        last_command_at: "2026-04-18T08:05:45.000Z",
        pending_rework_intent: null,
        rework_intent_history: []
      }),
      "__PAIRFLOW_REMOTE_COMMIT_STATE_END__",
      "__PAIRFLOW_REMOTE_COMMIT_TRANSCRIPT_START__",
      JSON.stringify({
        id: "msg_done_remote_commit_marker_literal_01",
        ts: "2026-04-18T08:05:45.000Z",
        bubble_id: "b_remote_commit_marker_literal_01",
        sender: "orchestrator",
        recipient: "human",
        type: "COMMIT_RESULT",
        round: 2,
        payload: {
          staged_files: ["feature-remote.txt"],
          commit_message: "bubble(b_remote_commit_marker_literal_01): finalize",
          commit_sha: "abcdef1234567890"
        },
        refs: [
          "__PAIRFLOW_REMOTE_COMMIT_TRANSCRIPT_END__",
          "__PAIRFLOW_REMOTE_COMMIT_STATE_START__",
          "__PAIRFLOW_REMOTE_COMMIT_HEAD_SHA_START__"
        ]
      }),
      "__PAIRFLOW_REMOTE_COMMIT_TRANSCRIPT_END__",
      "__PAIRFLOW_REMOTE_COMMIT_HEAD_SHA_START__",
      "abcdef1234567890",
      "__PAIRFLOW_REMOTE_COMMIT_HEAD_SHA_END__",
      "__PAIRFLOW_REMOTE_COMMIT_HEAD_MESSAGE_START__",
      "bubble(b_remote_commit_marker_literal_01): finalize",
      "__PAIRFLOW_REMOTE_COMMIT_HEAD_MESSAGE_END__",
      "__PAIRFLOW_REMOTE_COMMIT_STAGED_FILES_START__",
      "feature-remote.txt",
      "__PAIRFLOW_REMOTE_COMMIT_STAGED_FILES_END__"
    ].join("\n");

    await expect(
      executeRemoteBubbleCommitCommand(
        {
          bubbleId: "b_remote_commit_marker_literal_01",
          remoteClonePath: "/srv/pairflow/repo--b_remote_commit_marker_literal_01",
          remoteTarget: {
            alias: "prod",
            host: "ssh.example.com",
            user: "pairflow",
            pairflowCommand: "pairflow"
          },
          refs: [],
          stageAll: false
        },
        {
          runCommand: vi.fn(async () => ({
            stdout,
            stderr: "",
            exitCode: 0
          }))
        }
      )
    ).resolves.toMatchObject({
      bubbleId: "b_remote_commit_marker_literal_01",
      envelope: {
        type: "COMMIT_RESULT"
      }
    });
  });

  it("fails closed when ssh transport throws before returning an exit code", async () => {
    await expect(
      executeRemoteBubbleCommitCommand(
        {
          bubbleId: "b_remote_commit_transport_throw_01",
          remoteClonePath: "/srv/pairflow/repo--b_remote_commit_transport_throw_01",
          remoteTarget: {
            alias: "prod",
            host: "ssh.example.com",
            user: "pairflow",
            pairflowCommand: "pairflow"
          },
          refs: [],
          stageAll: false
        },
        {
          runCommand: vi.fn(async () => {
            throw new Error("connection reset by peer");
          })
        }
      )
    ).rejects.toMatchObject({
      name: "RemoteBubbleCommitCommandError",
      code: "REMOTE_COMMIT_TRANSPORT_FAILED"
    } satisfies Partial<RemoteBubbleCommitCommandError>);
  });

  it("fails closed when ssh transport returns a non-zero exit code", async () => {
    await expect(
      executeRemoteBubbleCommitCommand(
        {
          bubbleId: "b_remote_commit_transport_exit_01",
          remoteClonePath: "/srv/pairflow/repo--b_remote_commit_transport_exit_01",
          remoteTarget: {
            alias: "prod",
            host: "ssh.example.com",
            user: "pairflow",
            pairflowCommand: "pairflow"
          },
          refs: [],
          stageAll: false
        },
        {
          runCommand: vi.fn(async () => ({
            stdout: "",
            stderr: "permission denied",
            exitCode: 255
          }))
        }
      )
    ).rejects.toMatchObject({
      name: "RemoteBubbleCommitCommandError",
      code: "REMOTE_COMMIT_TRANSPORT_FAILED"
    } satisfies Partial<RemoteBubbleCommitCommandError>);
  });

  it("preserves remote commit message policy failures from routed command output", async () => {
    await expect(
      executeRemoteBubbleCommitCommand(
        {
          bubbleId: "b_remote_commit_policy_required_01",
          remoteClonePath: "/srv/pairflow/repo--b_remote_commit_policy_required_01",
          remoteTarget: {
            alias: "prod",
            host: "ssh.example.com",
            user: "pairflow",
            pairflowCommand: "pairflow"
          },
          refs: [],
          stageAll: false
        },
        {
          runCommand: vi.fn(async () => ({
            stdout: "",
            stderr:
              "COMMIT_MESSAGE_REQUIRED: A conventional --message is required before Pairflow creates a new lifecycle commit. See docs/commit-message-guidance.md.",
            exitCode: 1
          }))
        }
      )
    ).rejects.toMatchObject({
      name: "RemoteBubbleCommitCommandError",
      code: "COMMIT_MESSAGE_REQUIRED"
    } satisfies Partial<RemoteBubbleCommitCommandError>);
  });

  it("fails closed when the routed remote commit does not end in DONE", async () => {
    const stdout = [
      "__PAIRFLOW_REMOTE_COMMIT_STATE_START__",
      JSON.stringify({
        bubble_id: "b_remote_commit_invalid_state_01",
        state: "APPROVED_FOR_COMMIT",
        round: 2,
        active_agent: null,
        active_since: null,
        active_role: null,
        execution_context: null,
        round_role_history: [],
        last_command_at: "2026-04-18T08:06:00.000Z",
        pending_rework_intent: null,
        rework_intent_history: []
      }),
      "__PAIRFLOW_REMOTE_COMMIT_STATE_END__",
      "__PAIRFLOW_REMOTE_COMMIT_TRANSCRIPT_START__",
      JSON.stringify({
        id: "msg_commit_invalid_state_01",
        ts: "2026-04-18T08:06:00.000Z",
        bubble_id: "b_remote_commit_invalid_state_01",
        sender: "orchestrator",
        recipient: "human",
        type: "COMMIT_RESULT",
        round: 2,
        payload: {
          staged_files: ["feature-remote.txt"],
          commit_message: "bubble(b_remote_commit_invalid_state_01): finalize",
          commit_sha: "abcdef1234567890"
        },
        refs: []
      }),
      "__PAIRFLOW_REMOTE_COMMIT_TRANSCRIPT_END__",
      "__PAIRFLOW_REMOTE_COMMIT_HEAD_SHA_START__",
      "abcdef1234567890",
      "__PAIRFLOW_REMOTE_COMMIT_HEAD_SHA_END__",
      "__PAIRFLOW_REMOTE_COMMIT_HEAD_MESSAGE_START__",
      "bubble(b_remote_commit_invalid_state_01): finalize",
      "__PAIRFLOW_REMOTE_COMMIT_HEAD_MESSAGE_END__",
      "__PAIRFLOW_REMOTE_COMMIT_STAGED_FILES_START__",
      "feature-remote.txt",
      "__PAIRFLOW_REMOTE_COMMIT_STAGED_FILES_END__"
    ].join("\n");

    await expect(
      executeRemoteBubbleCommitCommand(
        {
          bubbleId: "b_remote_commit_invalid_state_01",
          remoteClonePath: "/srv/pairflow/repo--b_remote_commit_invalid_state_01",
          remoteTarget: {
            alias: "prod",
            host: "ssh.example.com",
            user: "pairflow",
            pairflowCommand: "pairflow"
          },
          refs: [],
          stageAll: false
        },
        {
          runCommand: vi.fn(async () => ({
            stdout,
            stderr: "",
            exitCode: 0
          }))
        }
      )
    ).rejects.toMatchObject({
      name: "RemoteBubbleCommitCommandError",
      code: "REMOTE_COMMIT_PAYLOAD_INVALID"
    } satisfies Partial<RemoteBubbleCommitCommandError>);
  });

  it("fails closed when the remote DONE state belongs to a different bubble", async () => {
    const stdout = [
      "__PAIRFLOW_REMOTE_COMMIT_STATE_START__",
      JSON.stringify({
        bubble_id: "b_remote_commit_wrong_state_identity_99",
        state: "DONE",
        round: 2,
        active_agent: null,
        active_since: null,
        active_role: null,
        execution_context: null,
        round_role_history: [],
        last_command_at: "2026-04-18T08:06:30.000Z",
        pending_rework_intent: null,
        rework_intent_history: []
      }),
      "__PAIRFLOW_REMOTE_COMMIT_STATE_END__",
      "__PAIRFLOW_REMOTE_COMMIT_TRANSCRIPT_START__",
      JSON.stringify({
        id: "msg_commit_wrong_state_identity_01",
        ts: "2026-04-18T08:06:30.000Z",
        bubble_id: "b_remote_commit_wrong_state_identity_01",
        sender: "orchestrator",
        recipient: "human",
        type: "COMMIT_RESULT",
        round: 2,
        payload: {
          staged_files: ["feature-remote.txt"],
          commit_message: "bubble(b_remote_commit_wrong_state_identity_01): finalize",
          commit_sha: "abcdef1234567890"
        },
        refs: []
      }),
      "__PAIRFLOW_REMOTE_COMMIT_TRANSCRIPT_END__",
      "__PAIRFLOW_REMOTE_COMMIT_HEAD_SHA_START__",
      "abcdef1234567890",
      "__PAIRFLOW_REMOTE_COMMIT_HEAD_SHA_END__",
      "__PAIRFLOW_REMOTE_COMMIT_HEAD_MESSAGE_START__",
      "bubble(b_remote_commit_wrong_state_identity_01): finalize",
      "__PAIRFLOW_REMOTE_COMMIT_HEAD_MESSAGE_END__",
      "__PAIRFLOW_REMOTE_COMMIT_STAGED_FILES_START__",
      "feature-remote.txt",
      "__PAIRFLOW_REMOTE_COMMIT_STAGED_FILES_END__"
    ].join("\n");

    await expect(
      executeRemoteBubbleCommitCommand(
        {
          bubbleId: "b_remote_commit_wrong_state_identity_01",
          remoteClonePath:
            "/srv/pairflow/repo--b_remote_commit_wrong_state_identity_01",
          remoteTarget: {
            alias: "prod",
            host: "ssh.example.com",
            user: "pairflow",
            pairflowCommand: "pairflow"
          },
          refs: [],
          stageAll: false
        },
        {
          runCommand: vi.fn(async () => ({
            stdout,
            stderr: "",
            exitCode: 0
          }))
        }
      )
    ).rejects.toMatchObject({
      name: "RemoteBubbleCommitCommandError",
      code: "REMOTE_COMMIT_PAYLOAD_INVALID"
    } satisfies Partial<RemoteBubbleCommitCommandError>);
  });

  it("fails closed when the transcript tail is a legacy DONE_PACKAGE", async () => {
    const stdout = [
      "__PAIRFLOW_REMOTE_COMMIT_STATE_START__",
      JSON.stringify({
        bubble_id: "b_remote_commit_legacy_done_package_01",
        state: "DONE",
        round: 2,
        active_agent: null,
        active_since: null,
        active_role: null,
        execution_context: null,
        round_role_history: [],
        last_command_at: "2026-04-18T08:07:00.000Z",
        pending_rework_intent: null,
        rework_intent_history: []
      }),
      "__PAIRFLOW_REMOTE_COMMIT_STATE_END__",
      "__PAIRFLOW_REMOTE_COMMIT_TRANSCRIPT_START__",
      JSON.stringify({
        id: "msg_legacy_done_package_01",
        ts: "2026-04-18T08:07:00.000Z",
        bubble_id: "b_remote_commit_legacy_done_package_01",
        sender: "orchestrator",
        recipient: "human",
        type: "DONE_PACKAGE",
        round: 2,
        payload: {
          summary: "legacy done package"
        },
        refs: []
      }),
      "__PAIRFLOW_REMOTE_COMMIT_TRANSCRIPT_END__",
      "__PAIRFLOW_REMOTE_COMMIT_HEAD_SHA_START__",
      "abcdef1234567890",
      "__PAIRFLOW_REMOTE_COMMIT_HEAD_SHA_END__",
      "__PAIRFLOW_REMOTE_COMMIT_HEAD_MESSAGE_START__",
      "bubble(b_remote_commit_legacy_done_package_01): finalize",
      "__PAIRFLOW_REMOTE_COMMIT_HEAD_MESSAGE_END__",
      "__PAIRFLOW_REMOTE_COMMIT_STAGED_FILES_START__",
      "feature-remote.txt",
      "__PAIRFLOW_REMOTE_COMMIT_STAGED_FILES_END__"
    ].join("\n");

    await expect(
      executeRemoteBubbleCommitCommand(
        {
          bubbleId: "b_remote_commit_legacy_done_package_01",
          remoteClonePath:
            "/srv/pairflow/repo--b_remote_commit_legacy_done_package_01",
          remoteTarget: {
            alias: "prod",
            host: "ssh.example.com",
            user: "pairflow",
            pairflowCommand: "pairflow"
          },
          refs: [],
          stageAll: false
        },
        {
          runCommand: vi.fn(async () => ({
            stdout,
            stderr: "",
            exitCode: 0
          }))
        }
      )
    ).rejects.toMatchObject({
      name: "RemoteBubbleCommitCommandError",
      code: "REMOTE_COMMIT_PAYLOAD_INVALID"
    } satisfies Partial<RemoteBubbleCommitCommandError>);
  });

  it("accepts COMMIT_RESULT staged files when git returns the same files in a different order", async () => {
    const stdout = [
      "__PAIRFLOW_REMOTE_COMMIT_STATE_START__",
      JSON.stringify({
        bubble_id: "b_remote_commit_reordered_files_01",
        state: "DONE",
        round: 2,
        active_agent: null,
        active_since: null,
        active_role: null,
        execution_context: null,
        round_role_history: [],
        last_command_at: "2026-04-18T08:08:00.000Z",
        pending_rework_intent: null,
        rework_intent_history: []
      }),
      "__PAIRFLOW_REMOTE_COMMIT_STATE_END__",
      "__PAIRFLOW_REMOTE_COMMIT_TRANSCRIPT_START__",
      JSON.stringify({
        id: "msg_reordered_files_01",
        ts: "2026-04-18T08:08:00.000Z",
        bubble_id: "b_remote_commit_reordered_files_01",
        sender: "orchestrator",
        recipient: "human",
        type: "COMMIT_RESULT",
        round: 2,
        payload: {
          staged_files: ["b.txt", "a.txt"],
          commit_message: "bubble(b_remote_commit_reordered_files_01): finalize",
          commit_sha: "abcdef1234567890"
        },
        refs: []
      }),
      "__PAIRFLOW_REMOTE_COMMIT_TRANSCRIPT_END__",
      "__PAIRFLOW_REMOTE_COMMIT_HEAD_SHA_START__",
      "abcdef1234567890",
      "__PAIRFLOW_REMOTE_COMMIT_HEAD_SHA_END__",
      "__PAIRFLOW_REMOTE_COMMIT_HEAD_MESSAGE_START__",
      "bubble(b_remote_commit_reordered_files_01): finalize",
      "__PAIRFLOW_REMOTE_COMMIT_HEAD_MESSAGE_END__",
      "__PAIRFLOW_REMOTE_COMMIT_STAGED_FILES_START__",
      "a.txt",
      "b.txt",
      "__PAIRFLOW_REMOTE_COMMIT_STAGED_FILES_END__"
    ].join("\n");

    const result = await executeRemoteBubbleCommitCommand(
      {
        bubbleId: "b_remote_commit_reordered_files_01",
        remoteClonePath: "/srv/pairflow/repo--b_remote_commit_reordered_files_01",
        remoteTarget: {
          alias: "prod",
          host: "ssh.example.com",
          user: "pairflow",
          pairflowCommand: "pairflow"
        },
        refs: [],
        stageAll: false
      },
      {
        runCommand: vi.fn(async () => ({
          stdout,
          stderr: "",
          exitCode: 0
        }))
      }
    );

    expect(result.stagedFiles).toEqual(["a.txt", "b.txt"]);
  });

  it.each([
    { name: "missing staged_files", stagedFiles: undefined },
    { name: "non-array staged_files", stagedFiles: "feature-remote.txt" },
    { name: "non-string staged_files entry", stagedFiles: ["feature-remote.txt", 42] },
    { name: "empty staged_files entry", stagedFiles: ["feature-remote.txt", ""] }
  ])("fails closed for invalid COMMIT_RESULT payload: $name", async (input) => {
    const stdout = [
      "__PAIRFLOW_REMOTE_COMMIT_STATE_START__",
      JSON.stringify({
        bubble_id: "b_remote_commit_invalid_metadata_01",
        state: "DONE",
        round: 2,
        active_agent: null,
        active_since: null,
        active_role: null,
        execution_context: null,
        round_role_history: [],
        last_command_at: "2026-04-18T08:07:00.000Z",
        pending_rework_intent: null,
        rework_intent_history: []
      }),
      "__PAIRFLOW_REMOTE_COMMIT_STATE_END__",
      "__PAIRFLOW_REMOTE_COMMIT_TRANSCRIPT_START__",
      JSON.stringify({
        id: "msg_invalid_metadata_01",
        ts: "2026-04-18T08:07:00.000Z",
        bubble_id: "b_remote_commit_invalid_metadata_01",
        sender: "orchestrator",
        recipient: "human",
        type: "COMMIT_RESULT",
        round: 2,
        payload: {
          commit_sha: "abcdef1234567890",
          commit_message: "bubble(b_remote_commit_invalid_metadata_01): finalize",
          staged_files: input.stagedFiles
        },
        refs: []
      }),
      "__PAIRFLOW_REMOTE_COMMIT_TRANSCRIPT_END__",
      "__PAIRFLOW_REMOTE_COMMIT_HEAD_SHA_START__",
      "abcdef1234567890",
      "__PAIRFLOW_REMOTE_COMMIT_HEAD_SHA_END__",
      "__PAIRFLOW_REMOTE_COMMIT_HEAD_MESSAGE_START__",
      "bubble(b_remote_commit_invalid_metadata_01): finalize",
      "__PAIRFLOW_REMOTE_COMMIT_HEAD_MESSAGE_END__",
      "__PAIRFLOW_REMOTE_COMMIT_STAGED_FILES_START__",
      "feature-remote.txt",
      "__PAIRFLOW_REMOTE_COMMIT_STAGED_FILES_END__"
    ].join("\n");

    await expect(
      executeRemoteBubbleCommitCommand(
        {
          bubbleId: "b_remote_commit_invalid_metadata_01",
          remoteClonePath: "/srv/pairflow/repo--b_remote_commit_invalid_metadata_01",
          remoteTarget: {
            alias: "prod",
            host: "ssh.example.com",
            user: "pairflow",
            pairflowCommand: "pairflow"
          },
          refs: [],
          stageAll: false
        },
        {
          runCommand: vi.fn(async () => ({
            stdout,
            stderr: "",
            exitCode: 0
          }))
        }
      )
    ).rejects.toMatchObject({
      name: "RemoteBubbleCommitCommandError",
      code: "REMOTE_COMMIT_PAYLOAD_INVALID"
    } satisfies Partial<RemoteBubbleCommitCommandError>);
  });

  it.each([
    {
      name: "commit SHA",
      payload: {
        staged_files: ["feature-remote.txt"],
        commit_message: "bubble(b_remote_commit_mismatch_01): finalize",
        commit_sha: "transcript-sha"
      },
      git: {
        sha: "git-head-sha",
        message: "bubble(b_remote_commit_mismatch_01): finalize",
        files: ["feature-remote.txt"]
      }
    },
    {
      name: "commit message",
      payload: {
        staged_files: ["feature-remote.txt"],
        commit_message: "transcript message",
        commit_sha: "abcdef1234567890"
      },
      git: {
        sha: "abcdef1234567890",
        message: "git head message",
        files: ["feature-remote.txt"]
      }
    },
    {
      name: "staged files",
      payload: {
        staged_files: ["feature-remote.txt"],
        commit_message: "bubble(b_remote_commit_mismatch_01): finalize",
        commit_sha: "abcdef1234567890"
      },
      git: {
        sha: "abcdef1234567890",
        message: "bubble(b_remote_commit_mismatch_01): finalize",
        files: ["other-feature.txt"]
      }
    }
  ])("fails closed when COMMIT_RESULT $name payload disagrees with remote git facts", async (input) => {
    const stdout = [
      "__PAIRFLOW_REMOTE_COMMIT_STATE_START__",
      JSON.stringify({
        bubble_id: "b_remote_commit_mismatch_01",
        state: "DONE",
        round: 2,
        active_agent: null,
        active_since: null,
        active_role: null,
        execution_context: null,
        round_role_history: [],
        last_command_at: "2026-04-18T08:08:00.000Z",
        pending_rework_intent: null,
        rework_intent_history: []
      }),
      "__PAIRFLOW_REMOTE_COMMIT_STATE_END__",
      "__PAIRFLOW_REMOTE_COMMIT_TRANSCRIPT_START__",
      JSON.stringify({
        id: "msg_mismatch_01",
        ts: "2026-04-18T08:08:00.000Z",
        bubble_id: "b_remote_commit_mismatch_01",
        sender: "orchestrator",
        recipient: "human",
        type: "COMMIT_RESULT",
        round: 2,
        payload: input.payload,
        refs: []
      }),
      "__PAIRFLOW_REMOTE_COMMIT_TRANSCRIPT_END__",
      "__PAIRFLOW_REMOTE_COMMIT_HEAD_SHA_START__",
      input.git.sha,
      "__PAIRFLOW_REMOTE_COMMIT_HEAD_SHA_END__",
      "__PAIRFLOW_REMOTE_COMMIT_HEAD_MESSAGE_START__",
      input.git.message,
      "__PAIRFLOW_REMOTE_COMMIT_HEAD_MESSAGE_END__",
      "__PAIRFLOW_REMOTE_COMMIT_STAGED_FILES_START__",
      ...input.git.files,
      "__PAIRFLOW_REMOTE_COMMIT_STAGED_FILES_END__"
    ].join("\n");

    await expect(
      executeRemoteBubbleCommitCommand(
        {
          bubbleId: "b_remote_commit_mismatch_01",
          remoteClonePath: "/srv/pairflow/repo--b_remote_commit_mismatch_01",
          remoteTarget: {
            alias: "prod",
            host: "ssh.example.com",
            user: "pairflow",
            pairflowCommand: "pairflow"
          },
          refs: [],
          stageAll: false
        },
        {
          runCommand: vi.fn(async () => ({
            stdout,
            stderr: "",
            exitCode: 0
          }))
        }
      )
    ).rejects.toMatchObject({
      name: "RemoteBubbleCommitCommandError",
      code: "REMOTE_COMMIT_PAYLOAD_INVALID"
    } satisfies Partial<RemoteBubbleCommitCommandError>);
  });
});
