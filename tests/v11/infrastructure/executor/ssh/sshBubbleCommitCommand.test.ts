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
      auto: true
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
      "'pairflow' 'bubble' 'commit' '--id' 'b_remote_commit_01' '--repo' '/srv/pairflow clones/repo'\\''s bubble' '--message' 'feat: finalize remote bubble' '--auto' '--ref' '.pairflow/evidence/typecheck.log'"
    );
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
        type: "DONE_PACKAGE",
        round: 2,
        payload: {
          summary: "Remote commit completed.",
          metadata: {
            done_package_path: "/srv/pairflow/repo/.pairflow/bubbles/b_remote_commit_01/artifacts/done-package.md",
            staged_files: ["feature-remote.txt"],
            commit_message: "bubble(b_remote_commit_01): finalize",
            commit_sha: "abcdef1234567890"
          }
        },
        refs: []
      }),
      "__PAIRFLOW_REMOTE_COMMIT_TRANSCRIPT_END__",
      "__PAIRFLOW_REMOTE_COMMIT_DONE_PACKAGE_START__",
      "# Done Package",
      "",
      "Remote continuity.",
      "__PAIRFLOW_REMOTE_COMMIT_DONE_PACKAGE_END__",
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
        auto: false
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
    expect(result.envelope.type).toBe("DONE_PACKAGE");
    expect(result.donePackageContent).toContain("Remote continuity.");
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
          auto: false
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
          auto: false
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
        type: "DONE_PACKAGE",
        round: 2,
        payload: {
          summary: "unexpected state",
          metadata: {}
        },
        refs: []
      }),
      "__PAIRFLOW_REMOTE_COMMIT_TRANSCRIPT_END__",
      "__PAIRFLOW_REMOTE_COMMIT_DONE_PACKAGE_START__",
      "# Done Package",
      "__PAIRFLOW_REMOTE_COMMIT_DONE_PACKAGE_END__",
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
          auto: false
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
