import { describe, expect, it, vi } from "vitest";
import type { RemoteBubbleMergeCommandError } from "../../../../../src/v11/infrastructure/executor/ssh/sshBubbleMergeCommand.js";

import {
  buildRemoteBubbleMergeScript,
  executeRemoteBubbleMergeCommand
} from "../../../../../src/v11/infrastructure/executor/ssh/sshBubbleMergeCommand.js";

describe("sshBubbleMergeCommand", () => {
  it("builds a remote merge script that preserves PATH authority and forwards merge flags", () => {
    const script = buildRemoteBubbleMergeScript({
      bubbleId: "b_remote_merge_01",
      remoteClonePath: "/srv/pairflow clones/repo's bubble",
      remoteTarget: {
        alias: "prod",
        host: "ssh.example.com",
        user: "pairflow",
        pairflowCommand: "pairflow"
      },
      push: true,
      deleteRemote: true
    });

    expect(script).toContain("set -euo pipefail");
    expect(script).toContain(
      "export PAIRFLOW_WORKTREE_ROOT='/srv/pairflow clones/repo'\\''s bubble'"
    );
    expect(script).toContain(
      "export PAIRFLOW_REMOTE_MERGE_MODE='inner_remote_execution'"
    );
    expect(script).toContain(
      "export PAIRFLOW_REMOTE_MERGE_WORKSPACE_ROOT='/srv/pairflow clones/repo'\\''s bubble'"
    );
    expect(script).toContain("set +e");
    expect(script).toContain("command_exit_code=$?");
    expect(script).toContain("set -e");
    expect(script).toContain(
      "'pairflow' 'bubble' 'merge' '--id' 'b_remote_merge_01' '--repo' '/srv/pairflow clones/repo'\\''s bubble' '--push' '--delete-remote' '--json'"
    );
  });

  it("parses a routed remote merge result from structured JSON output", async () => {
    const stdout = [
      "__PAIRFLOW_REMOTE_MERGE_EXIT_STATUS_START__",
      "0",
      "__PAIRFLOW_REMOTE_MERGE_EXIT_STATUS_END__",
      "__PAIRFLOW_REMOTE_MERGE_STDOUT_START__",
      JSON.stringify({
        bubbleId: "b_remote_merge_01",
        baseBranch: "main",
        bubbleBranch: "bubble/b_remote_merge_01",
        mergeCommitSha: "abcdef1234567890",
        pushedBaseBranch: true,
        deletedRemoteBranch: false,
        tmuxSessionName: "pf-b_remote_merge_01",
        tmuxSessionExisted: true,
        runtimeSessionRemoved: true,
        removedWorktree: true,
        removedBubbleBranch: true
      }),
      "__PAIRFLOW_REMOTE_MERGE_STDOUT_END__",
      "__PAIRFLOW_REMOTE_MERGE_STDERR_START__",
      "",
      "__PAIRFLOW_REMOTE_MERGE_STDERR_END__"
    ].join("\n");

    const result = await executeRemoteBubbleMergeCommand(
      {
        bubbleId: "b_remote_merge_01",
        remoteClonePath: "/srv/pairflow/repo--b_remote_merge_01",
        remoteTarget: {
          alias: "prod",
          host: "ssh.example.com",
          user: "pairflow",
          pairflowCommand: "pairflow"
        },
        push: true,
        deleteRemote: false
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
      bubbleId: "b_remote_merge_01",
      pushedBaseBranch: true,
      removedWorktree: true,
      removedBubbleBranch: true
    });
  });

  it("preserves remote merge reason codes from real CLI-style stderr payloads", async () => {
    const stdout = [
      "__PAIRFLOW_REMOTE_MERGE_EXIT_STATUS_START__",
      "1",
      "__PAIRFLOW_REMOTE_MERGE_EXIT_STATUS_END__",
      "__PAIRFLOW_REMOTE_MERGE_STDOUT_START__",
      "",
      "__PAIRFLOW_REMOTE_MERGE_STDOUT_END__",
      "__PAIRFLOW_REMOTE_MERGE_STDERR_START__",
      "BubbleMergeError: MERGE_CONFLICT_REQUIRES_MANUAL_RESOLUTION: remote merge conflict",
      "context={\"command_name\":\"merge\"}",
      "__PAIRFLOW_REMOTE_MERGE_STDERR_END__"
    ].join("\n");

    await expect(
      executeRemoteBubbleMergeCommand(
        {
          bubbleId: "b_remote_merge_conflict_01",
          remoteClonePath: "/srv/pairflow/repo--b_remote_merge_conflict_01",
          remoteTarget: {
            alias: "prod",
            host: "ssh.example.com",
            user: "pairflow",
            pairflowCommand: "pairflow"
          },
          push: true,
          deleteRemote: false
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
      name: "RemoteBubbleMergeCommandError",
      code: "MERGE_CONFLICT_REQUIRES_MANUAL_RESOLUTION"
    } satisfies Partial<RemoteBubbleMergeCommandError>);
  });

  it("preserves remote merge reason codes from compact stderr payloads without trailing message text", async () => {
    const stdout = [
      "__PAIRFLOW_REMOTE_MERGE_EXIT_STATUS_START__",
      "1",
      "__PAIRFLOW_REMOTE_MERGE_EXIT_STATUS_END__",
      "__PAIRFLOW_REMOTE_MERGE_STDOUT_START__",
      "",
      "__PAIRFLOW_REMOTE_MERGE_STDOUT_END__",
      "__PAIRFLOW_REMOTE_MERGE_STDERR_START__",
      "MERGE_REMOTE_DELETE_FAILED:",
      "__PAIRFLOW_REMOTE_MERGE_STDERR_END__"
    ].join("\n");

    await expect(
      executeRemoteBubbleMergeCommand(
        {
          bubbleId: "b_remote_merge_compact_reason_01",
          remoteClonePath: "/srv/pairflow/repo--b_remote_merge_compact_reason_01",
          remoteTarget: {
            alias: "prod",
            host: "ssh.example.com",
            user: "pairflow",
            pairflowCommand: "pairflow"
          },
          push: true,
          deleteRemote: true
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
      name: "RemoteBubbleMergeCommandError",
      code: "MERGE_REMOTE_DELETE_FAILED"
    } satisfies Partial<RemoteBubbleMergeCommandError>);
  });

  it("falls back to REMOTE_MERGE_COMMAND_FAILED when stderr has no recognizable reason code", async () => {
    const stdout = [
      "__PAIRFLOW_REMOTE_MERGE_EXIT_STATUS_START__",
      "1",
      "__PAIRFLOW_REMOTE_MERGE_EXIT_STATUS_END__",
      "__PAIRFLOW_REMOTE_MERGE_STDOUT_START__",
      "",
      "__PAIRFLOW_REMOTE_MERGE_STDOUT_END__",
      "__PAIRFLOW_REMOTE_MERGE_STDERR_START__",
      "remote merge failed without structured taxonomy",
      "__PAIRFLOW_REMOTE_MERGE_STDERR_END__"
    ].join("\n");

    await expect(
      executeRemoteBubbleMergeCommand(
        {
          bubbleId: "b_remote_merge_unclassified_01",
          remoteClonePath: "/srv/pairflow/repo--b_remote_merge_unclassified_01",
          remoteTarget: {
            alias: "prod",
            host: "ssh.example.com",
            user: "pairflow",
            pairflowCommand: "pairflow"
          },
          push: true,
          deleteRemote: false
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
      name: "RemoteBubbleMergeCommandError",
      code: "REMOTE_MERGE_COMMAND_FAILED"
    } satisfies Partial<RemoteBubbleMergeCommandError>);
  });

  it("fails closed when ssh transport returns a non-zero exit code", async () => {
    await expect(
      executeRemoteBubbleMergeCommand(
        {
          bubbleId: "b_remote_merge_transport_exit_01",
          remoteClonePath: "/srv/pairflow/repo--b_remote_merge_transport_exit_01",
          remoteTarget: {
            alias: "prod",
            host: "ssh.example.com",
            user: "pairflow",
            pairflowCommand: "pairflow"
          },
          push: true,
          deleteRemote: false
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
      name: "RemoteBubbleMergeCommandError",
      code: "REMOTE_MERGE_TRANSPORT_FAILED"
    } satisfies Partial<RemoteBubbleMergeCommandError>);
  });

  it("fails closed when remote merge success omits durable publication proof", async () => {
    const stdout = [
      "__PAIRFLOW_REMOTE_MERGE_EXIT_STATUS_START__",
      "0",
      "__PAIRFLOW_REMOTE_MERGE_EXIT_STATUS_END__",
      "__PAIRFLOW_REMOTE_MERGE_STDOUT_START__",
      JSON.stringify({
        bubbleId: "b_remote_merge_publication_01",
        baseBranch: "main",
        bubbleBranch: "bubble/b_remote_merge_publication_01",
        mergeCommitSha: "abcdef1234567890",
        pushedBaseBranch: false,
        deletedRemoteBranch: false,
        tmuxSessionName: "pf-b_remote_merge_publication_01",
        tmuxSessionExisted: true,
        runtimeSessionRemoved: true,
        removedWorktree: true,
        removedBubbleBranch: true
      }),
      "__PAIRFLOW_REMOTE_MERGE_STDOUT_END__",
      "__PAIRFLOW_REMOTE_MERGE_STDERR_START__",
      "",
      "__PAIRFLOW_REMOTE_MERGE_STDERR_END__"
    ].join("\n");

    await expect(
      executeRemoteBubbleMergeCommand(
        {
          bubbleId: "b_remote_merge_publication_01",
          remoteClonePath: "/srv/pairflow/repo--b_remote_merge_publication_01",
          remoteTarget: {
            alias: "prod",
            host: "ssh.example.com",
            user: "pairflow",
            pairflowCommand: "pairflow"
          },
          push: true,
          deleteRemote: false
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
      name: "RemoteBubbleMergeCommandError",
      code: "REMOTE_MERGE_PUBLICATION_REQUIRED"
    } satisfies Partial<RemoteBubbleMergeCommandError>);
  });

  it("fails closed when structured marker envelopes are duplicated", async () => {
    const stdout = [
      "__PAIRFLOW_REMOTE_MERGE_EXIT_STATUS_START__",
      "0",
      "__PAIRFLOW_REMOTE_MERGE_EXIT_STATUS_END__",
      "__PAIRFLOW_REMOTE_MERGE_STDOUT_START__",
      JSON.stringify({
        bubbleId: "b_remote_merge_invalid_payload_01",
        baseBranch: "main",
        bubbleBranch: "bubble/b_remote_merge_invalid_payload_01",
        mergeCommitSha: "abcdef1234567890",
        pushedBaseBranch: true,
        deletedRemoteBranch: false,
        tmuxSessionName: "pf-b_remote_merge_invalid_payload_01",
        tmuxSessionExisted: true,
        runtimeSessionRemoved: true,
        removedWorktree: true,
        removedBubbleBranch: true
      }),
      "__PAIRFLOW_REMOTE_MERGE_STDOUT_END__",
      "__PAIRFLOW_REMOTE_MERGE_STDOUT_START__",
      "{}",
      "__PAIRFLOW_REMOTE_MERGE_STDOUT_END__",
      "__PAIRFLOW_REMOTE_MERGE_STDERR_START__",
      "",
      "__PAIRFLOW_REMOTE_MERGE_STDERR_END__"
    ].join("\n");

    await expect(
      executeRemoteBubbleMergeCommand(
        {
          bubbleId: "b_remote_merge_invalid_payload_01",
          remoteClonePath: "/srv/pairflow/repo--b_remote_merge_invalid_payload_01",
          remoteTarget: {
            alias: "prod",
            host: "ssh.example.com",
            user: "pairflow",
            pairflowCommand: "pairflow"
          },
          push: true,
          deleteRemote: false
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
      name: "RemoteBubbleMergeCommandError",
      code: "REMOTE_MERGE_PAYLOAD_INVALID"
    } satisfies Partial<RemoteBubbleMergeCommandError>);
  });

  it("fails closed when the exit-status envelope contains trailing junk", async () => {
    const stdout = [
      "__PAIRFLOW_REMOTE_MERGE_EXIT_STATUS_START__",
      "0junk",
      "__PAIRFLOW_REMOTE_MERGE_EXIT_STATUS_END__",
      "__PAIRFLOW_REMOTE_MERGE_STDOUT_START__",
      "{}",
      "__PAIRFLOW_REMOTE_MERGE_STDOUT_END__",
      "__PAIRFLOW_REMOTE_MERGE_STDERR_START__",
      "",
      "__PAIRFLOW_REMOTE_MERGE_STDERR_END__"
    ].join("\n");

    await expect(
      executeRemoteBubbleMergeCommand(
        {
          bubbleId: "b_remote_merge_invalid_exit_status_01",
          remoteClonePath: "/srv/pairflow/repo--b_remote_merge_invalid_exit_status_01",
          remoteTarget: {
            alias: "prod",
            host: "ssh.example.com",
            user: "pairflow",
            pairflowCommand: "pairflow"
          },
          push: true,
          deleteRemote: false
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
      name: "RemoteBubbleMergeCommandError",
      code: "REMOTE_MERGE_PAYLOAD_INVALID"
    } satisfies Partial<RemoteBubbleMergeCommandError>);
  });

  it("fails closed when a successful remote merge returns an empty stdout payload", async () => {
    const stdout = [
      "__PAIRFLOW_REMOTE_MERGE_EXIT_STATUS_START__",
      "0",
      "__PAIRFLOW_REMOTE_MERGE_EXIT_STATUS_END__",
      "__PAIRFLOW_REMOTE_MERGE_STDOUT_START__",
      "",
      "__PAIRFLOW_REMOTE_MERGE_STDOUT_END__",
      "__PAIRFLOW_REMOTE_MERGE_STDERR_START__",
      "",
      "__PAIRFLOW_REMOTE_MERGE_STDERR_END__"
    ].join("\n");

    await expect(
      executeRemoteBubbleMergeCommand(
        {
          bubbleId: "b_remote_merge_empty_payload_01",
          remoteClonePath: "/srv/pairflow/repo--b_remote_merge_empty_payload_01",
          remoteTarget: {
            alias: "prod",
            host: "ssh.example.com",
            user: "pairflow",
            pairflowCommand: "pairflow"
          },
          push: true,
          deleteRemote: false
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
      name: "RemoteBubbleMergeCommandError",
      code: "REMOTE_MERGE_PAYLOAD_INVALID"
    } satisfies Partial<RemoteBubbleMergeCommandError>);
  });

  it("fails closed when a successful remote merge omits a required JSON field", async () => {
    const stdout = [
      "__PAIRFLOW_REMOTE_MERGE_EXIT_STATUS_START__",
      "0",
      "__PAIRFLOW_REMOTE_MERGE_EXIT_STATUS_END__",
      "__PAIRFLOW_REMOTE_MERGE_STDOUT_START__",
      JSON.stringify({
        bubbleId: "b_remote_merge_missing_field_01",
        baseBranch: "main",
        bubbleBranch: "bubble/b_remote_merge_missing_field_01",
        pushedBaseBranch: true,
        deletedRemoteBranch: false,
        tmuxSessionName: "pf-b_remote_merge_missing_field_01",
        tmuxSessionExisted: true,
        runtimeSessionRemoved: true,
        removedWorktree: true,
        removedBubbleBranch: true
      }),
      "__PAIRFLOW_REMOTE_MERGE_STDOUT_END__",
      "__PAIRFLOW_REMOTE_MERGE_STDERR_START__",
      "",
      "__PAIRFLOW_REMOTE_MERGE_STDERR_END__"
    ].join("\n");

    await expect(
      executeRemoteBubbleMergeCommand(
        {
          bubbleId: "b_remote_merge_missing_field_01",
          remoteClonePath: "/srv/pairflow/repo--b_remote_merge_missing_field_01",
          remoteTarget: {
            alias: "prod",
            host: "ssh.example.com",
            user: "pairflow",
            pairflowCommand: "pairflow"
          },
          push: true,
          deleteRemote: false
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
      name: "RemoteBubbleMergeCommandError",
      code: "REMOTE_MERGE_PAYLOAD_INVALID"
    } satisfies Partial<RemoteBubbleMergeCommandError>);
  });
});
