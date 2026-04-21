import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";
import type { RemoteBubbleMergeCommandError } from "../../../../../src/v11/infrastructure/executor/ssh/sshBubbleMergeCommand.js";

import {
  buildRemoteBubbleMergeScript,
  executeRemoteBubbleMergeCommand
} from "../../../../../src/v11/infrastructure/executor/ssh/sshBubbleMergeCommand.js";
import { initGitRepository, runGit } from "../../../../helpers/git.js";

function createMergeCommandInput() {
  return {
    bubbleId: "b_remote_merge_01",
    remoteClonePath: "/srv/pairflow clones/repo's bubble",
    remoteTarget: {
      alias: "prod",
      host: "ssh.example.com",
      user: "pairflow",
      pairflowCommand: "pairflow"
    },
    baseBranch: "main",
    bubbleBranch: "bubble/b_remote_merge_01",
    tmuxSessionName: "pf-b_remote_merge_01"
  } as const;
}

async function runLocalShellScript(script: string) {
  return await new Promise<{
    stdout: string;
    stderr: string;
    exitCode: number;
  }>((resolve, reject) => {
    const child = spawn("bash", ["-lc", script], {
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (exitCode) => {
      resolve({
        stdout,
        stderr,
        exitCode: exitCode ?? 1
      });
    });
  });
}

describe("sshBubbleMergeCommand", () => {
  it("builds a remote merge script that emits a pre-cleanup handoff payload", () => {
    const script = buildRemoteBubbleMergeScript(createMergeCommandInput());

    expect(script).toContain("set -euo pipefail");
    expect(script).toContain(
      "export base_branch bubble_branch import_ref bubble_id tmux_session_name"
    );
    expect(script).toContain("(\n  set -euo pipefail\n  git checkout \"$base_branch\"");
    expect(script).toContain("git checkout \"$base_branch\"");
    expect(script).toContain("git merge --no-ff --no-edit 'bubble/b_remote_merge_01'");
    expect(script).toContain("git update-ref \"$import_ref\" \"$merge_commit_sha\"");
    expect(script).toContain("cleanupPending: true");
    expect(script).toContain("kind: 'git_ref'");
    expect(script).toContain("payload.tmuxSessionName = process.env.tmux_session_name;");
    expect(script).not.toContain("tmuxSessionExisted = true");
    expect(script).toContain(
      "printf '%s\\n' 'MERGE_CONFLICT_REQUIRES_MANUAL_RESOLUTION: remote merge conflict' >>\"$stderr_file\""
    );
    expect(script).not.toContain("'pairflow' 'bubble' 'merge'");
  });

  it("parses a structured pre-cleanup handoff payload", async () => {
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
        importSource: {
          kind: "git_ref",
          ref: "refs/pairflow/import/b_remote_merge_01",
          commitSha: "abcdef1234567890"
        },
        cleanupPending: true,
        tmuxSessionName: "pf-b_remote_merge_01"
      }),
      "__PAIRFLOW_REMOTE_MERGE_STDOUT_END__",
      "__PAIRFLOW_REMOTE_MERGE_STDERR_START__",
      "",
      "__PAIRFLOW_REMOTE_MERGE_STDERR_END__"
    ].join("\n");

    const result = await executeRemoteBubbleMergeCommand(createMergeCommandInput(), {
      runCommand: vi.fn(async () => ({
        stdout,
        stderr: "",
        exitCode: 0
      }))
    });

    expect(result).toMatchObject({
      bubbleId: "b_remote_merge_01",
      importSource: {
        kind: "git_ref",
        ref: "refs/pairflow/import/b_remote_merge_01",
        commitSha: "abcdef1234567890"
      },
      cleanupPending: true,
      tmuxSessionName: "pf-b_remote_merge_01"
    });
  });

  it("keeps successful git merge stdout out of the structured payload at the command layer", async () => {
    const repoPath = await mkdtemp(join(tmpdir(), "pairflow-remote-merge-script-"));

    try {
      await initGitRepository(repoPath);
      await runGit(repoPath, ["checkout", "-b", "bubble/b_remote_merge_01"]);
      await writeFile(join(repoPath, "feature.txt"), "remote-merge\n", "utf8");
      await runGit(repoPath, ["add", "feature.txt"]);
      await runGit(repoPath, ["commit", "-m", "bubble change"]);
      await runGit(repoPath, ["checkout", "main"]);

      const result = await executeRemoteBubbleMergeCommand(
        {
          ...createMergeCommandInput(),
          remoteClonePath: repoPath
        },
        {
          runCommand: vi.fn(async (_command: string, args: string[]) => {
            const script = args.at(-1);
            if (typeof script !== "string") {
              throw new Error("missing ssh script payload");
            }
            return await runLocalShellScript(script);
          })
        }
      );

      expect(result).toMatchObject({
        bubbleId: "b_remote_merge_01",
        baseBranch: "main",
        bubbleBranch: "bubble/b_remote_merge_01",
        cleanupPending: true,
        tmuxSessionName: "pf-b_remote_merge_01",
        importSource: {
          kind: "git_ref",
          ref: "refs/pairflow/import/b_remote_merge_01"
        }
      });
      expect(result.mergeCommitSha).toMatch(/^[0-9a-f]{40}$/u);
      expect(result.importSource.commitSha).toBe(result.mergeCommitSha);

      const importedRef = await runGit(repoPath, [
        "rev-parse",
        "refs/pairflow/import/b_remote_merge_01"
      ]);
      expect(importedRef.stdout.trim()).toBe(result.mergeCommitSha);
    } finally {
      await rm(repoPath, { recursive: true, force: true });
    }
  });

  it("fails closed when helper-sourced tmuxSessionExisted compatibility data is present", async () => {
    const stdout = [
      "__PAIRFLOW_REMOTE_MERGE_EXIT_STATUS_START__",
      "0",
      "__PAIRFLOW_REMOTE_MERGE_EXIT_STATUS_END__",
      "__PAIRFLOW_REMOTE_MERGE_STDOUT_START__",
      JSON.stringify({
        bubbleId: "b_remote_merge_tmux_compat_01",
        baseBranch: "main",
        bubbleBranch: "bubble/b_remote_merge_tmux_compat_01",
        mergeCommitSha: "abcdef1234567890",
        importSource: {
          kind: "git_ref",
          ref: "refs/pairflow/import/b_remote_merge_tmux_compat_01",
          commitSha: "abcdef1234567890"
        },
        cleanupPending: true,
        tmuxSessionName: "pf-b_remote_merge_tmux_compat_01",
        tmuxSessionExisted: true
      }),
      "__PAIRFLOW_REMOTE_MERGE_STDOUT_END__",
      "__PAIRFLOW_REMOTE_MERGE_STDERR_START__",
      "",
      "__PAIRFLOW_REMOTE_MERGE_STDERR_END__"
    ].join("\n");

    await expect(
      executeRemoteBubbleMergeCommand(
        {
          ...createMergeCommandInput(),
          bubbleId: "b_remote_merge_tmux_compat_01",
          bubbleBranch: "bubble/b_remote_merge_tmux_compat_01"
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

  it("accepts and ignores legacy remoteCommitSha when the normative handoff fields are present", async () => {
    const stdout = [
      "__PAIRFLOW_REMOTE_MERGE_EXIT_STATUS_START__",
      "0",
      "__PAIRFLOW_REMOTE_MERGE_EXIT_STATUS_END__",
      "__PAIRFLOW_REMOTE_MERGE_STDOUT_START__",
      JSON.stringify({
        bubbleId: "b_remote_merge_legacy_commit_01",
        baseBranch: "main",
        bubbleBranch: "bubble/b_remote_merge_legacy_commit_01",
        mergeCommitSha: "abcdef1234567890",
        remoteCommitSha: "legacy-remote-sha-ignored",
        importSource: {
          kind: "git_ref",
          ref: "refs/pairflow/import/b_remote_merge_legacy_commit_01",
          commitSha: "abcdef1234567890"
        },
        cleanupPending: true
      }),
      "__PAIRFLOW_REMOTE_MERGE_STDOUT_END__",
      "__PAIRFLOW_REMOTE_MERGE_STDERR_START__",
      "",
      "__PAIRFLOW_REMOTE_MERGE_STDERR_END__"
    ].join("\n");

    const result = await executeRemoteBubbleMergeCommand(
      {
        ...createMergeCommandInput(),
        bubbleId: "b_remote_merge_legacy_commit_01",
        bubbleBranch: "bubble/b_remote_merge_legacy_commit_01"
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
      bubbleId: "b_remote_merge_legacy_commit_01",
      mergeCommitSha: "abcdef1234567890",
      importSource: {
        kind: "git_ref",
        ref: "refs/pairflow/import/b_remote_merge_legacy_commit_01",
        commitSha: "abcdef1234567890"
      },
      cleanupPending: true
    });
  });

  it("preserves remote merge reason codes from stderr payloads", async () => {
    const stdout = [
      "__PAIRFLOW_REMOTE_MERGE_EXIT_STATUS_START__",
      "1",
      "__PAIRFLOW_REMOTE_MERGE_EXIT_STATUS_END__",
      "__PAIRFLOW_REMOTE_MERGE_STDOUT_START__",
      "",
      "__PAIRFLOW_REMOTE_MERGE_STDOUT_END__",
      "__PAIRFLOW_REMOTE_MERGE_STDERR_START__",
      "BubbleMergeError: MERGE_CONFLICT_REQUIRES_MANUAL_RESOLUTION: remote merge conflict",
      "__PAIRFLOW_REMOTE_MERGE_STDERR_END__"
    ].join("\n");

    await expect(
      executeRemoteBubbleMergeCommand(createMergeCommandInput(), {
        runCommand: vi.fn(async () => ({
          stdout,
          stderr: "",
          exitCode: 0
        }))
      })
    ).rejects.toMatchObject({
      name: "RemoteBubbleMergeCommandError",
      code: "MERGE_CONFLICT_REQUIRES_MANUAL_RESOLUTION"
    } satisfies Partial<RemoteBubbleMergeCommandError>);
  });

  it("fails closed when ssh transport returns a non-zero exit code", async () => {
    await expect(
      executeRemoteBubbleMergeCommand(createMergeCommandInput(), {
        runCommand: vi.fn(async () => ({
          stdout: "",
          stderr: "permission denied",
          exitCode: 255
        }))
      })
    ).rejects.toMatchObject({
      name: "RemoteBubbleMergeCommandError",
      code: "REMOTE_MERGE_TRANSPORT_FAILED"
    } satisfies Partial<RemoteBubbleMergeCommandError>);
  });

  it("fails closed when cleanupPending is not true", async () => {
    const stdout = [
      "__PAIRFLOW_REMOTE_MERGE_EXIT_STATUS_START__",
      "0",
      "__PAIRFLOW_REMOTE_MERGE_EXIT_STATUS_END__",
      "__PAIRFLOW_REMOTE_MERGE_STDOUT_START__",
      JSON.stringify({
        bubbleId: "b_remote_merge_pending_01",
        baseBranch: "main",
        bubbleBranch: "bubble/b_remote_merge_pending_01",
        mergeCommitSha: "abcdef1234567890",
        importSource: {
          kind: "git_ref",
          ref: "refs/pairflow/import/b_remote_merge_pending_01",
          commitSha: "abcdef1234567890"
        },
        cleanupPending: false
      }),
      "__PAIRFLOW_REMOTE_MERGE_STDOUT_END__",
      "__PAIRFLOW_REMOTE_MERGE_STDERR_START__",
      "",
      "__PAIRFLOW_REMOTE_MERGE_STDERR_END__"
    ].join("\n");

    await expect(
      executeRemoteBubbleMergeCommand(
        {
          ...createMergeCommandInput(),
          bubbleId: "b_remote_merge_pending_01",
          bubbleBranch: "bubble/b_remote_merge_pending_01"
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

  it("fails closed when forbidden cleanup/publication fields are present", async () => {
    const stdout = [
      "__PAIRFLOW_REMOTE_MERGE_EXIT_STATUS_START__",
      "0",
      "__PAIRFLOW_REMOTE_MERGE_EXIT_STATUS_END__",
      "__PAIRFLOW_REMOTE_MERGE_STDOUT_START__",
      JSON.stringify({
        bubbleId: "b_remote_merge_invalid_fields_01",
        baseBranch: "main",
        bubbleBranch: "bubble/b_remote_merge_invalid_fields_01",
        mergeCommitSha: "abcdef1234567890",
        importSource: {
          kind: "git_ref",
          ref: "refs/pairflow/import/b_remote_merge_invalid_fields_01",
          commitSha: "abcdef1234567890"
        },
        cleanupPending: true,
        pushedBaseBranch: true
      }),
      "__PAIRFLOW_REMOTE_MERGE_STDOUT_END__",
      "__PAIRFLOW_REMOTE_MERGE_STDERR_START__",
      "",
      "__PAIRFLOW_REMOTE_MERGE_STDERR_END__"
    ].join("\n");

    await expect(
      executeRemoteBubbleMergeCommand(
        {
          ...createMergeCommandInput(),
          bubbleId: "b_remote_merge_invalid_fields_01",
          bubbleBranch: "bubble/b_remote_merge_invalid_fields_01"
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

  it("fails closed when a required handoff field is missing", async () => {
    const stdout = [
      "__PAIRFLOW_REMOTE_MERGE_EXIT_STATUS_START__",
      "0",
      "__PAIRFLOW_REMOTE_MERGE_EXIT_STATUS_END__",
      "__PAIRFLOW_REMOTE_MERGE_STDOUT_START__",
      JSON.stringify({
        bubbleId: "b_remote_merge_missing_field_01",
        baseBranch: "main",
        bubbleBranch: "bubble/b_remote_merge_missing_field_01",
        importSource: {
          kind: "git_ref",
          ref: "refs/pairflow/import/b_remote_merge_missing_field_01",
          commitSha: "abcdef1234567890"
        },
        cleanupPending: true
      }),
      "__PAIRFLOW_REMOTE_MERGE_STDOUT_END__",
      "__PAIRFLOW_REMOTE_MERGE_STDERR_START__",
      "",
      "__PAIRFLOW_REMOTE_MERGE_STDERR_END__"
    ].join("\n");

    await expect(
      executeRemoteBubbleMergeCommand(
        {
          ...createMergeCommandInput(),
          bubbleId: "b_remote_merge_missing_field_01",
          bubbleBranch: "bubble/b_remote_merge_missing_field_01"
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

  it("fails closed when the helper returns non-JSON stdout payload", async () => {
    const stdout = [
      "__PAIRFLOW_REMOTE_MERGE_EXIT_STATUS_START__",
      "0",
      "__PAIRFLOW_REMOTE_MERGE_EXIT_STATUS_END__",
      "__PAIRFLOW_REMOTE_MERGE_STDOUT_START__",
      "not-json",
      "__PAIRFLOW_REMOTE_MERGE_STDOUT_END__",
      "__PAIRFLOW_REMOTE_MERGE_STDERR_START__",
      "",
      "__PAIRFLOW_REMOTE_MERGE_STDERR_END__"
    ].join("\n");

    await expect(
      executeRemoteBubbleMergeCommand(createMergeCommandInput(), {
        runCommand: vi.fn(async () => ({
          stdout,
          stderr: "",
          exitCode: 0
        }))
      })
    ).rejects.toMatchObject({
      name: "RemoteBubbleMergeCommandError",
      code: "REMOTE_MERGE_PAYLOAD_INVALID"
    } satisfies Partial<RemoteBubbleMergeCommandError>);
  });
});
