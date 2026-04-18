import { describe, expect, it, vi } from "vitest";

import type { RemoteBubbleDeleteCommandError } from "../../../../../src/v11/infrastructure/executor/ssh/sshBubbleDeleteCommand.js";
import {
  buildRemoteBubbleDeleteScript,
  executeRemoteBubbleDeleteCommand
} from "../../../../../src/v11/infrastructure/executor/ssh/sshBubbleDeleteCommand.js";

function encodeBase64(value: string): string {
  return Buffer.from(value, "utf8").toString("base64");
}

describe("sshBubbleDeleteCommand", () => {
  it("builds a remote delete script that preserves PATH authority and exports inner remote context", () => {
    const script = buildRemoteBubbleDeleteScript({
      bubbleId: "b_remote_delete_01",
      remoteClonePath: "/srv/pairflow clones/repo's bubble",
      remoteTarget: {
        alias: "prod",
        host: "ssh.example.com",
        user: "pairflow",
        pairflowCommand: "pairflow"
      },
      force: true
    });

    expect(script).toContain("set -euo pipefail");
    expect(script).toContain(
      "export PAIRFLOW_WORKTREE_ROOT='/srv/pairflow clones/repo'\\''s bubble'"
    );
    expect(script).toContain(
      "export PAIRFLOW_REMOTE_DELETE_MODE='inner_remote_execution'"
    );
    expect(script).toContain(
      "export PAIRFLOW_REMOTE_DELETE_WORKSPACE_ROOT='/srv/pairflow clones/repo'\\''s bubble'"
    );
    expect(script).toContain(
      "'pairflow' 'bubble' 'delete' '--id' 'b_remote_delete_01' '--repo' '/srv/pairflow clones/repo'\\''s bubble' '--force' '--json'"
    );
    expect(script).toContain("base64 < \"$stdout_file\" | tr -d '\\n'");
  });

  it("keeps archive capture enabled on the non-force script path and omits --force", () => {
    const script = buildRemoteBubbleDeleteScript({
      bubbleId: "b_remote_delete_confirm_script_01",
      remoteClonePath: "/srv/pairflow/repo--b_remote_delete_confirm_script_01",
      remoteTarget: {
        alias: "prod",
        host: "ssh.example.com",
        user: "pairflow",
        pairflowCommand: "pairflow"
      },
      force: false
    });

    expect(script).toContain("__PAIRFLOW_REMOTE_DELETE_CAPTURE_BUBBLE_TOML_START__");
    expect(script).toContain("REMOTE_DELETE_CAPTURE_FAILED:");
    expect(script).not.toContain("'--force'");
    expect(script).toContain(
      "'pairflow' 'bubble' 'delete' '--id' 'b_remote_delete_confirm_script_01' '--repo' '/srv/pairflow/repo--b_remote_delete_confirm_script_01' '--json'"
    );
  });

  it("parses remote delete confirmation without requiring local fallback", async () => {
    const stdout = [
      "__PAIRFLOW_REMOTE_DELETE_EXIT_STATUS_START__",
      "2",
      "__PAIRFLOW_REMOTE_DELETE_EXIT_STATUS_END__",
      "__PAIRFLOW_REMOTE_DELETE_STDOUT_START__",
      encodeBase64(JSON.stringify({
        bubbleId: "b_remote_delete_confirm_01",
        deleted: false,
        requiresConfirmation: true,
        artifacts: {
          worktree: {
            exists: true,
            path: "/srv/pairflow/repo--b_remote_delete_confirm_01"
          },
          tmux: {
            exists: true,
            sessionName: "pf-b_remote_delete_confirm_01"
          },
          runtimeSession: {
            exists: true,
            sessionName: "pf-b_remote_delete_confirm_01"
          },
          branch: {
            exists: true,
            name: "pairflow/bubble/b_remote_delete_confirm_01"
          }
        },
        tmuxSessionTerminated: false,
        runtimeSessionRemoved: false,
        removedWorktree: false,
        removedBubbleBranch: false
      })),
      "__PAIRFLOW_REMOTE_DELETE_STDOUT_END__",
      "__PAIRFLOW_REMOTE_DELETE_STDERR_START__",
      encodeBase64(""),
      "__PAIRFLOW_REMOTE_DELETE_STDERR_END__"
    ].join("\n");

    const result = await executeRemoteBubbleDeleteCommand(
      {
        bubbleId: "b_remote_delete_confirm_01",
        remoteClonePath: "/srv/pairflow/repo--b_remote_delete_confirm_01",
        remoteTarget: {
          alias: "prod",
          host: "ssh.example.com",
          user: "pairflow",
          pairflowCommand: "pairflow"
        },
        force: false
      },
      {
        runCommand: vi.fn(async () => ({
          stdout,
          stderr: "",
          exitCode: 0
        }))
      }
    );

    expect(result.result.requiresConfirmation).toBe(true);
    expect(result.archiveCapture).toBeUndefined();
    expect(result.result.artifacts.worktree.path).toBe(
      "/srv/pairflow/repo--b_remote_delete_confirm_01"
    );
  });

  it("parses remote delete success with archive continuity capture", async () => {
    const stdout = [
      "__PAIRFLOW_REMOTE_DELETE_CAPTURE_BUBBLE_TOML_START__",
      "present",
      encodeBase64("id = 'b_remote_delete_success_01'"),
      "__PAIRFLOW_REMOTE_DELETE_CAPTURE_BUBBLE_TOML_END__",
      "__PAIRFLOW_REMOTE_DELETE_CAPTURE_STATE_JSON_START__",
      "present",
      encodeBase64("{\"bubble_id\":\"b_remote_delete_success_01\",\"state\":\"DONE\"}"),
      "__PAIRFLOW_REMOTE_DELETE_CAPTURE_STATE_JSON_END__",
      "__PAIRFLOW_REMOTE_DELETE_CAPTURE_TRANSCRIPT_NDJSON_START__",
      "present",
      encodeBase64("{\"id\":\"msg_delete_remote_success_01\"}"),
      "__PAIRFLOW_REMOTE_DELETE_CAPTURE_TRANSCRIPT_NDJSON_END__",
      "__PAIRFLOW_REMOTE_DELETE_CAPTURE_INBOX_NDJSON_START__",
      "present",
      encodeBase64("{\"id\":\"msg_delete_remote_inbox_01\"}\n"),
      "__PAIRFLOW_REMOTE_DELETE_CAPTURE_INBOX_NDJSON_END__",
      "__PAIRFLOW_REMOTE_DELETE_CAPTURE_TASK_MD_START__",
      "present",
      encodeBase64("# Task\n\nRemote canonical delete payload."),
      "__PAIRFLOW_REMOTE_DELETE_CAPTURE_TASK_MD_END__",
      "__PAIRFLOW_REMOTE_DELETE_EXIT_STATUS_START__",
      "0",
      "__PAIRFLOW_REMOTE_DELETE_EXIT_STATUS_END__",
      "__PAIRFLOW_REMOTE_DELETE_STDOUT_START__",
      encodeBase64(JSON.stringify({
        bubbleId: "b_remote_delete_success_01",
        deleted: true,
        requiresConfirmation: false,
        artifacts: {
          worktree: {
            exists: true,
            path: "/srv/pairflow/repo--b_remote_delete_success_01"
          },
          tmux: {
            exists: true,
            sessionName: "pf-b_remote_delete_success_01"
          },
          runtimeSession: {
            exists: true,
            sessionName: "pf-b_remote_delete_success_01"
          },
          branch: {
            exists: true,
            name: "pairflow/bubble/b_remote_delete_success_01"
          }
        },
        tmuxSessionTerminated: true,
        runtimeSessionRemoved: true,
        removedWorktree: true,
        removedBubbleBranch: true
      })),
      "__PAIRFLOW_REMOTE_DELETE_STDOUT_END__",
      "__PAIRFLOW_REMOTE_DELETE_STDERR_START__",
      encodeBase64(""),
      "__PAIRFLOW_REMOTE_DELETE_STDERR_END__"
    ].join("\n");

    const result = await executeRemoteBubbleDeleteCommand(
      {
        bubbleId: "b_remote_delete_success_01",
        remoteClonePath: "/srv/pairflow/repo--b_remote_delete_success_01",
        remoteTarget: {
          alias: "prod",
          host: "ssh.example.com",
          user: "pairflow",
          pairflowCommand: "pairflow"
        },
        force: true
      },
      {
        runCommand: vi.fn(async () => ({
          stdout,
          stderr: "",
          exitCode: 0
        }))
      }
    );

    expect(result.result.deleted).toBe(true);
    expect(result.archiveCapture).toMatchObject({
      sourceBubbleDir:
        "/srv/pairflow/repo--b_remote_delete_success_01/.pairflow/bubbles/b_remote_delete_success_01",
      bubbleToml: "id = 'b_remote_delete_success_01'",
      stateJson: "{\"bubble_id\":\"b_remote_delete_success_01\",\"state\":\"DONE\"}",
      transcriptNdjson: "{\"id\":\"msg_delete_remote_success_01\"}",
      inboxNdjson: "{\"id\":\"msg_delete_remote_inbox_01\"}\n",
      taskMarkdown: "# Task\n\nRemote canonical delete payload."
    });
    expect(result.result.tmuxSessionTerminated).toBe(true);
    expect(result.result.runtimeSessionRemoved).toBe(true);
    expect(result.result.removedWorktree).toBe(true);
    expect(result.result.removedBubbleBranch).toBe(true);
  });

  it("fails closed when non-force remote delete reports deleted=true", async () => {
    const stdout = [
      "__PAIRFLOW_REMOTE_DELETE_CAPTURE_BUBBLE_TOML_START__",
      "present",
      encodeBase64("id = 'b_remote_delete_zero_artifact_01'"),
      "__PAIRFLOW_REMOTE_DELETE_CAPTURE_BUBBLE_TOML_END__",
      "__PAIRFLOW_REMOTE_DELETE_CAPTURE_STATE_JSON_START__",
      "present",
      encodeBase64("{\"bubble_id\":\"b_remote_delete_zero_artifact_01\",\"state\":\"DONE\"}"),
      "__PAIRFLOW_REMOTE_DELETE_CAPTURE_STATE_JSON_END__",
      "__PAIRFLOW_REMOTE_DELETE_CAPTURE_TRANSCRIPT_NDJSON_START__",
      "present",
      encodeBase64("{\"id\":\"msg_delete_remote_zero_artifact_01\"}"),
      "__PAIRFLOW_REMOTE_DELETE_CAPTURE_TRANSCRIPT_NDJSON_END__",
      "__PAIRFLOW_REMOTE_DELETE_CAPTURE_INBOX_NDJSON_START__",
      "present",
      encodeBase64(""),
      "__PAIRFLOW_REMOTE_DELETE_CAPTURE_INBOX_NDJSON_END__",
      "__PAIRFLOW_REMOTE_DELETE_CAPTURE_TASK_MD_START__",
      "missing",
      "__PAIRFLOW_REMOTE_DELETE_CAPTURE_TASK_MD_END__",
      "__PAIRFLOW_REMOTE_DELETE_EXIT_STATUS_START__",
      "0",
      "__PAIRFLOW_REMOTE_DELETE_EXIT_STATUS_END__",
      "__PAIRFLOW_REMOTE_DELETE_STDOUT_START__",
      encodeBase64(JSON.stringify({
        bubbleId: "b_remote_delete_zero_artifact_01",
        deleted: true,
        requiresConfirmation: false,
        artifacts: {
          worktree: {
            exists: false,
            path: "/srv/pairflow/repo--b_remote_delete_zero_artifact_01"
          },
          tmux: {
            exists: false,
            sessionName: "pf-b_remote_delete_zero_artifact_01"
          },
          runtimeSession: {
            exists: false,
            sessionName: null
          },
          branch: {
            exists: false,
            name: "pairflow/bubble/b_remote_delete_zero_artifact_01"
          }
        },
        tmuxSessionTerminated: false,
        runtimeSessionRemoved: false,
        removedWorktree: false,
        removedBubbleBranch: false
      })),
      "__PAIRFLOW_REMOTE_DELETE_STDOUT_END__",
      "__PAIRFLOW_REMOTE_DELETE_STDERR_START__",
      encodeBase64(""),
      "__PAIRFLOW_REMOTE_DELETE_STDERR_END__"
    ].join("\n");

    const result = executeRemoteBubbleDeleteCommand(
      {
        bubbleId: "b_remote_delete_zero_artifact_01",
        remoteClonePath: "/srv/pairflow/repo--b_remote_delete_zero_artifact_01",
        remoteTarget: {
          alias: "prod",
          host: "ssh.example.com",
          user: "pairflow",
          pairflowCommand: "pairflow"
        },
        force: false
      },
      {
        runCommand: vi.fn(async () => ({
          stdout,
          stderr: "",
          exitCode: 0
        }))
      }
    );

    await expect(result).rejects.toMatchObject({
      name: "RemoteBubbleDeleteCommandError",
      code: "REMOTE_DELETE_PAYLOAD_INVALID"
    } satisfies Partial<RemoteBubbleDeleteCommandError>);
    await expect(result).rejects.toThrow(
      /non-force remote delete must stay on the confirmation contract/u
    );
  });

  it("rejects a remote delete payload whose bubble identity does not match the request", async () => {
    const stdout = [
      "__PAIRFLOW_REMOTE_DELETE_EXIT_STATUS_START__",
      "2",
      "__PAIRFLOW_REMOTE_DELETE_EXIT_STATUS_END__",
      "__PAIRFLOW_REMOTE_DELETE_STDOUT_START__",
      encodeBase64(JSON.stringify({
        bubbleId: "b_remote_delete_other_01",
        deleted: false,
        requiresConfirmation: true,
        artifacts: {
          worktree: {
            exists: true,
            path: "/srv/pairflow/repo--b_remote_delete_confirm_01"
          },
          tmux: {
            exists: true,
            sessionName: "pf-b_remote_delete_confirm_01"
          },
          runtimeSession: {
            exists: true,
            sessionName: "pf-b_remote_delete_confirm_01"
          },
          branch: {
            exists: true,
            name: "pairflow/bubble/b_remote_delete_confirm_01"
          }
        },
        tmuxSessionTerminated: false,
        runtimeSessionRemoved: false,
        removedWorktree: false,
        removedBubbleBranch: false
      })),
      "__PAIRFLOW_REMOTE_DELETE_STDOUT_END__",
      "__PAIRFLOW_REMOTE_DELETE_STDERR_START__",
      encodeBase64(""),
      "__PAIRFLOW_REMOTE_DELETE_STDERR_END__"
    ].join("\n");

    const result = executeRemoteBubbleDeleteCommand(
      {
        bubbleId: "b_remote_delete_confirm_01",
        remoteClonePath: "/srv/pairflow/repo--b_remote_delete_confirm_01",
        remoteTarget: {
          alias: "prod",
          host: "ssh.example.com",
          user: "pairflow",
          pairflowCommand: "pairflow"
        },
        force: false
      },
      {
        runCommand: vi.fn(async () => ({
          stdout,
          stderr: "",
          exitCode: 0
        }))
      }
    );

    await expect(result).rejects.toMatchObject({
      name: "RemoteBubbleDeleteCommandError",
      code: "REMOTE_DELETE_PAYLOAD_INVALID"
    } satisfies Partial<RemoteBubbleDeleteCommandError>);
    await expect(result).rejects.toThrow(/bubbleId mismatch/u);
  });

  it("preserves remote delete reason codes from compact stderr payloads", async () => {
    const stdout = [
      "__PAIRFLOW_REMOTE_DELETE_EXIT_STATUS_START__",
      "1",
      "__PAIRFLOW_REMOTE_DELETE_EXIT_STATUS_END__",
      "__PAIRFLOW_REMOTE_DELETE_STDOUT_START__",
      encodeBase64(""),
      "__PAIRFLOW_REMOTE_DELETE_STDOUT_END__",
      "__PAIRFLOW_REMOTE_DELETE_STDERR_START__",
      encodeBase64("REMOTE_DELETE_INVALID_TARGET:"),
      "__PAIRFLOW_REMOTE_DELETE_STDERR_END__"
    ].join("\n");

    await expect(
      executeRemoteBubbleDeleteCommand(
        {
          bubbleId: "b_remote_delete_reason_01",
          remoteClonePath: "/srv/pairflow/repo--b_remote_delete_reason_01",
          remoteTarget: {
            alias: "prod",
            host: "ssh.example.com",
            user: "pairflow",
            pairflowCommand: "pairflow"
          },
          force: true
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
      name: "RemoteBubbleDeleteCommandError",
      code: "REMOTE_DELETE_INVALID_TARGET"
    } satisfies Partial<RemoteBubbleDeleteCommandError>);
  });

  it("does not misparse base64-framed payloads that contain marker text", async () => {
    const collisionText = [
      "__PAIRFLOW_REMOTE_DELETE_STDOUT_START__",
      "marker-looking content inside payload",
      "__PAIRFLOW_REMOTE_DELETE_STDOUT_END__"
    ].join("\n");
    const stdout = [
      "__PAIRFLOW_REMOTE_DELETE_CAPTURE_BUBBLE_TOML_START__",
      "present",
      encodeBase64(collisionText),
      "__PAIRFLOW_REMOTE_DELETE_CAPTURE_BUBBLE_TOML_END__",
      "__PAIRFLOW_REMOTE_DELETE_CAPTURE_STATE_JSON_START__",
      "present",
      encodeBase64("{\"bubble_id\":\"b_remote_delete_collision_01\"}"),
      "__PAIRFLOW_REMOTE_DELETE_CAPTURE_STATE_JSON_END__",
      "__PAIRFLOW_REMOTE_DELETE_CAPTURE_TRANSCRIPT_NDJSON_START__",
      "present",
      encodeBase64("{\"id\":\"msg_collision\"}"),
      "__PAIRFLOW_REMOTE_DELETE_CAPTURE_TRANSCRIPT_NDJSON_END__",
      "__PAIRFLOW_REMOTE_DELETE_CAPTURE_INBOX_NDJSON_START__",
      "present",
      encodeBase64(""),
      "__PAIRFLOW_REMOTE_DELETE_CAPTURE_INBOX_NDJSON_END__",
      "__PAIRFLOW_REMOTE_DELETE_CAPTURE_TASK_MD_START__",
      "missing",
      "__PAIRFLOW_REMOTE_DELETE_CAPTURE_TASK_MD_END__",
      "__PAIRFLOW_REMOTE_DELETE_EXIT_STATUS_START__",
      "0",
      "__PAIRFLOW_REMOTE_DELETE_EXIT_STATUS_END__",
      "__PAIRFLOW_REMOTE_DELETE_STDOUT_START__",
      encodeBase64(JSON.stringify({
        bubbleId: "b_remote_delete_collision_01",
        deleted: true,
        requiresConfirmation: false,
        artifacts: {
          worktree: {
            exists: false,
            path: "/srv/pairflow/repo--b_remote_delete_collision_01"
          },
          tmux: {
            exists: false,
            sessionName: "pf-b_remote_delete_collision_01"
          },
          runtimeSession: {
            exists: false,
            sessionName: null
          },
          branch: {
            exists: false,
            name: "pairflow/bubble/b_remote_delete_collision_01"
          }
        },
        tmuxSessionTerminated: false,
        runtimeSessionRemoved: false,
        removedWorktree: false,
        removedBubbleBranch: false
      })),
      "__PAIRFLOW_REMOTE_DELETE_STDOUT_END__",
      "__PAIRFLOW_REMOTE_DELETE_STDERR_START__",
      encodeBase64(""),
      "__PAIRFLOW_REMOTE_DELETE_STDERR_END__"
    ].join("\n");

    const result = await executeRemoteBubbleDeleteCommand(
      {
        bubbleId: "b_remote_delete_collision_01",
        remoteClonePath: "/srv/pairflow/repo--b_remote_delete_collision_01",
        remoteTarget: {
          alias: "prod",
          host: "ssh.example.com",
          user: "pairflow",
          pairflowCommand: "pairflow"
        },
        force: true
      },
      {
        runCommand: vi.fn(async () => ({
          stdout,
          stderr: "",
          exitCode: 0
        }))
      }
    );

    expect(result.archiveCapture?.bubbleToml).toBe(collisionText);
    expect(result.result.artifacts.worktree.exists).toBe(false);
  });

  it("fails closed when ssh transport returns a non-zero exit code", async () => {
    await expect(
      executeRemoteBubbleDeleteCommand(
        {
          bubbleId: "b_remote_delete_transport_01",
          remoteClonePath: "/srv/pairflow/repo--b_remote_delete_transport_01",
          remoteTarget: {
            alias: "prod",
            host: "ssh.example.com",
            user: "pairflow",
            pairflowCommand: "pairflow"
          },
          force: true
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
      name: "RemoteBubbleDeleteCommandError",
      code: "REMOTE_DELETE_TRANSPORT_FAILED"
    } satisfies Partial<RemoteBubbleDeleteCommandError>);
  });

  it("preserves capture-specific reason codes when the ssh wrapper fails before marker framing completes", async () => {
    await expect(
      executeRemoteBubbleDeleteCommand(
        {
          bubbleId: "b_remote_delete_capture_fail_01",
          remoteClonePath: "/srv/pairflow/repo--b_remote_delete_capture_fail_01",
          remoteTarget: {
            alias: "prod",
            host: "ssh.example.com",
            user: "pairflow",
            pairflowCommand: "pairflow"
          },
          force: false
        },
        {
          runCommand: vi.fn(async () => ({
            stdout: "",
            stderr:
              "REMOTE_DELETE_CAPTURE_FAILED: Failed to capture bubble_toml from /srv/pairflow/repo--b_remote_delete_capture_fail_01/.pairflow/bubbles/b_remote_delete_capture_fail_01/bubble.toml",
            exitCode: 91
          }))
        }
      )
    ).rejects.toMatchObject({
      name: "RemoteBubbleDeleteCommandError",
      code: "REMOTE_DELETE_CAPTURE_FAILED"
    } satisfies Partial<RemoteBubbleDeleteCommandError>);
  });

  it("fails closed when ssh transport rejects before returning a result", async () => {
    let error: unknown;
    try {
      await executeRemoteBubbleDeleteCommand(
        {
          bubbleId: "b_remote_delete_transport_reject_01",
          remoteClonePath: "/srv/pairflow/repo--b_remote_delete_transport_reject_01",
          remoteTarget: {
            alias: "prod",
            host: "ssh.example.com",
            user: "pairflow",
            pairflowCommand: "pairflow"
          },
          force: true
        },
        {
          runCommand: vi.fn(async () => {
            throw new Error("ssh binary unavailable");
          })
        }
      );
    } catch (caught) {
      error = caught;
    }

    expect(error).toMatchObject({
      name: "RemoteBubbleDeleteCommandError",
      code: "REMOTE_DELETE_TRANSPORT_FAILED"
    } satisfies Partial<RemoteBubbleDeleteCommandError>);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain("ssh binary unavailable");
  });
});
