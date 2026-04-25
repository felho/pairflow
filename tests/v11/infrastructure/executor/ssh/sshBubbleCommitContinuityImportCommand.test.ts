import { describe, expect, it, vi } from "vitest";
import type { RemoteBubbleCommitCommandError } from "../../../../../src/v11/infrastructure/executor/ssh/sshBubbleCommitCommand.js";

import {
  buildRemoteBubbleCommitContinuityImportScript,
  importRemoteBubbleCommitContinuity
} from "../../../../../src/v11/infrastructure/executor/ssh/sshBubbleCommitContinuityImportCommand.js";

function buildImportStdout(input: {
  stateContent: string;
  transcriptContent: string;
  commitSha?: string;
  commitMessage?: string;
  stagedFiles?: string[];
}): string {
  return [
    "__PAIRFLOW_REMOTE_COMMIT_IMPORT_STATE_START__",
    input.stateContent,
    "__PAIRFLOW_REMOTE_COMMIT_IMPORT_STATE_END__",
    "__PAIRFLOW_REMOTE_COMMIT_IMPORT_TRANSCRIPT_START__",
    input.transcriptContent,
    "__PAIRFLOW_REMOTE_COMMIT_IMPORT_TRANSCRIPT_END__",
    "__PAIRFLOW_REMOTE_COMMIT_IMPORT_HEAD_SHA_START__",
    input.commitSha ?? "abcdef1234567890",
    "__PAIRFLOW_REMOTE_COMMIT_IMPORT_HEAD_SHA_END__",
    "__PAIRFLOW_REMOTE_COMMIT_IMPORT_HEAD_MESSAGE_START__",
    input.commitMessage ?? "bubble(b_remote_import_01): finalize",
    "__PAIRFLOW_REMOTE_COMMIT_IMPORT_HEAD_MESSAGE_END__",
    "__PAIRFLOW_REMOTE_COMMIT_IMPORT_STAGED_FILES_START__",
    ...(input.stagedFiles ?? ["feature-remote.txt"]),
    "__PAIRFLOW_REMOTE_COMMIT_IMPORT_STAGED_FILES_END__"
  ].join("\n");
}

describe("sshBubbleCommitContinuityImportCommand", () => {
  it("builds a read-only import script without invoking bubble commit", () => {
    const script = buildRemoteBubbleCommitContinuityImportScript({
      bubbleId: "b_remote_import_01",
      remoteClonePath: "/srv/pairflow/repo--b_remote_import_01",
      remoteTarget: {
        alias: "prod",
        host: "ssh.example.com",
        user: "pairflow",
        pairflowCommand: "pairflow"
      }
    });

    expect(script).toContain("commit_sha_for_facts=$(node -e");
    expect(script).toContain("git rev-parse \"$commit_sha_for_facts^{commit}\"");
    expect(script).toContain("git log -1 --pretty=%s \"$commit_sha_for_facts\"");
    expect(script).toContain("git diff-tree --no-commit-id --name-only -r \"$commit_sha_for_facts\"");
    expect(script).not.toContain("git rev-parse HEAD");
    expect(script).not.toContain("git log -1 --pretty=%s HEAD");
    expect(script).toContain("cat '/srv/pairflow/repo--b_remote_import_01/.pairflow/bubbles/b_remote_import_01/state.json'");
    expect(script).toContain("if [ -e '/srv/pairflow/repo--b_remote_import_01/.pairflow/bubbles/b_remote_import_01/state.json' ]; then cat");
    expect(script).not.toContain("|| true");
    expect(script).not.toContain("bubble' 'commit");
    expect(script).not.toContain("DONE_PACKAGE");
  });

  it("imports only validated remote DONE plus COMMIT_RESULT and matching git facts", async () => {
    const stateContent = JSON.stringify({
      bubble_id: "b_remote_import_01",
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
    });
    const transcriptContent = JSON.stringify({
      id: "msg_done_remote_import_01",
      ts: "2026-04-18T08:05:00.000Z",
      bubble_id: "b_remote_import_01",
      sender: "orchestrator",
      recipient: "human",
      type: "COMMIT_RESULT",
      round: 2,
      payload: {
        metadata: {
          staged_files: ["feature-remote.txt"],
          commit_message: "bubble(b_remote_import_01): finalize",
          commit_sha: "abcdef1234567890"
        }
      },
      refs: []
    });

    const result = await importRemoteBubbleCommitContinuity(
      {
        bubbleId: "b_remote_import_01",
        remoteClonePath: "/srv/pairflow/repo--b_remote_import_01",
        remoteTarget: {
          alias: "prod",
          host: "ssh.example.com",
          user: "pairflow",
          pairflowCommand: "pairflow"
        }
      },
      {
        runCommand: vi.fn(async () => ({
          stdout: buildImportStdout({ stateContent, transcriptContent }),
          stderr: "",
          exitCode: 0
        }))
      }
    );

    expect(result).toMatchObject({
      classification: "imported_remote_completion",
      bubbleId: "b_remote_import_01",
      state: {
        state: "DONE"
      },
      commitSha: "abcdef1234567890"
    });
  });

  it("classifies non-complete remote continuity as no evidence", async () => {
    const result = await importRemoteBubbleCommitContinuity(
      {
        bubbleId: "b_remote_import_02",
        remoteClonePath: "/srv/pairflow/repo--b_remote_import_02",
        remoteTarget: {
          alias: "prod",
          host: "ssh.example.com",
          pairflowCommand: "pairflow"
        }
      },
      {
        runCommand: vi.fn(async () => ({
          stdout: buildImportStdout({
            stateContent: JSON.stringify({
              bubble_id: "b_remote_import_02",
              state: "APPROVED_FOR_COMMIT"
            }),
            transcriptContent: ""
          }),
          stderr: "",
          exitCode: 0
        }))
      }
    );

    expect(result).toMatchObject({
      classification: "no_remote_completion_evidence"
    });
  });

  it("does not require git fact payloads when no remote completion evidence exists", async () => {
    const result = await importRemoteBubbleCommitContinuity(
      {
        bubbleId: "b_remote_import_no_git_facts_01",
        remoteClonePath: "/srv/pairflow/repo--b_remote_import_no_git_facts_01",
        remoteTarget: {
          alias: "prod",
          host: "ssh.example.com",
          pairflowCommand: "pairflow"
        }
      },
      {
        runCommand: vi.fn(async () => ({
          stdout: [
            "__PAIRFLOW_REMOTE_COMMIT_IMPORT_STATE_START__",
            JSON.stringify({
              bubble_id: "b_remote_import_no_git_facts_01",
              state: "APPROVED_FOR_COMMIT"
            }),
            "__PAIRFLOW_REMOTE_COMMIT_IMPORT_STATE_END__",
            "__PAIRFLOW_REMOTE_COMMIT_IMPORT_TRANSCRIPT_START__",
            "__PAIRFLOW_REMOTE_COMMIT_IMPORT_TRANSCRIPT_END__",
            "__PAIRFLOW_REMOTE_COMMIT_IMPORT_HEAD_SHA_START__",
            "__PAIRFLOW_REMOTE_COMMIT_IMPORT_HEAD_SHA_END__",
            "__PAIRFLOW_REMOTE_COMMIT_IMPORT_HEAD_MESSAGE_START__",
            "__PAIRFLOW_REMOTE_COMMIT_IMPORT_HEAD_MESSAGE_END__",
            "__PAIRFLOW_REMOTE_COMMIT_IMPORT_STAGED_FILES_START__",
            "__PAIRFLOW_REMOTE_COMMIT_IMPORT_STAGED_FILES_END__"
          ].join("\n"),
          stderr: "",
          exitCode: 0
        }))
      }
    );

    expect(result).toMatchObject({
      classification: "no_remote_completion_evidence"
    });
  });

  it("does not treat malformed non-DONE transcript tails as completion evidence", async () => {
    const result = await importRemoteBubbleCommitContinuity(
      {
        bubbleId: "b_remote_import_malformed_tail_01",
        remoteClonePath: "/srv/pairflow/repo--b_remote_import_malformed_tail_01",
        remoteTarget: {
          alias: "prod",
          host: "ssh.example.com",
          pairflowCommand: "pairflow"
        }
      },
      {
        runCommand: vi.fn(async () => ({
          stdout: buildImportStdout({
            stateContent: JSON.stringify({
              bubble_id: "b_remote_import_malformed_tail_01",
              state: "APPROVED_FOR_COMMIT"
            }),
            transcriptContent: "{\"type\":\"PASS\""
          }),
          stderr: "",
          exitCode: 0
        }))
      }
    );

    expect(result).toMatchObject({
      classification: "no_remote_completion_evidence"
    });
  });

  it("surfaces remote read failures as transport failures instead of no evidence", async () => {
    const promise = importRemoteBubbleCommitContinuity(
      {
        bubbleId: "b_remote_import_read_error_01",
        remoteClonePath: "/srv/pairflow/repo--b_remote_import_read_error_01",
        remoteTarget: {
          alias: "prod",
          host: "ssh.example.com",
          pairflowCommand: "pairflow"
        }
      },
      {
        runCommand: vi.fn(async () => ({
          stdout: [
            "__PAIRFLOW_REMOTE_COMMIT_IMPORT_STATE_START__",
            "cat: state.json: Permission denied"
          ].join("\n"),
          stderr: "cat: state.json: Permission denied",
          exitCode: 1
        }))
      }
    );

    await expect(promise).rejects.toMatchObject({
      name: "RemoteBubbleCommitCommandError",
      code: "REMOTE_COMMIT_TRANSPORT_FAILED"
    } satisfies Partial<RemoteBubbleCommitCommandError>);
  });

  it("imports remote completion with empty staged files", async () => {
    const stateContent = JSON.stringify({
      bubble_id: "b_remote_import_empty_files_01",
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
    });
    const transcriptContent = JSON.stringify({
      id: "msg_done_remote_import_empty_files_01",
      ts: "2026-04-18T08:05:00.000Z",
      bubble_id: "b_remote_import_empty_files_01",
      sender: "orchestrator",
      recipient: "human",
      type: "COMMIT_RESULT",
      round: 2,
      payload: {
        metadata: {
          staged_files: [],
          commit_message: "bubble(b_remote_import_empty_files_01): finalize",
          commit_sha: "abcdef1234567890"
        }
      },
      refs: []
    });

    const result = await importRemoteBubbleCommitContinuity(
      {
        bubbleId: "b_remote_import_empty_files_01",
        remoteClonePath: "/srv/pairflow/repo--b_remote_import_empty_files_01",
        remoteTarget: {
          alias: "prod",
          host: "ssh.example.com",
          pairflowCommand: "pairflow"
        }
      },
      {
        runCommand: vi.fn(async () => ({
          stdout: buildImportStdout({
            stateContent,
            transcriptContent,
            commitMessage: "bubble(b_remote_import_empty_files_01): finalize",
            stagedFiles: []
          }),
          stderr: "",
          exitCode: 0
        }))
      }
    );

    expect(result).toMatchObject({
      classification: "imported_remote_completion",
      stagedFiles: []
    });
  });

  it("rejects legacy DONE_PACKAGE and metadata mismatches", async () => {
    const promise = importRemoteBubbleCommitContinuity(
      {
        bubbleId: "b_remote_import_03",
        remoteClonePath: "/srv/pairflow/repo--b_remote_import_03",
        remoteTarget: {
          alias: "prod",
          host: "ssh.example.com",
          pairflowCommand: "pairflow"
        }
      },
      {
        runCommand: vi.fn(async () => ({
          stdout: buildImportStdout({
            stateContent: JSON.stringify({
              bubble_id: "b_remote_import_03",
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
            transcriptContent: JSON.stringify({
              id: "msg_done_remote_import_03",
              ts: "2026-04-18T08:05:00.000Z",
              bubble_id: "b_remote_import_03",
              sender: "orchestrator",
              recipient: "human",
              type: "DONE_PACKAGE",
              round: 2,
              payload: {},
              refs: []
            })
          }),
          stderr: "",
          exitCode: 0
        }))
      }
    );

    await expect(promise).rejects.toMatchObject({
      name: "RemoteBubbleCommitCommandError",
      code: "REMOTE_COMMIT_PAYLOAD_INVALID",
      message:
        "Remote commit continuity import found legacy DONE_PACKAGE transcript tail for DONE bubble b_remote_import_03."
    } satisfies Partial<RemoteBubbleCommitCommandError>);
  });
});
