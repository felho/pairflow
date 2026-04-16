import { describe, expect, it } from "vitest";

import {
  RemoteBubbleStartError,
  assertSingleTokenPairflowCommand,
  buildCloneRemoteRepositoryScript,
  buildReadRemoteHomeDirectoryScript,
  buildRemoteInnerStartScript,
  buildReadRemoteStateSnapshotScript,
  buildScpCommandArgs,
  buildScpUploadDestination,
  buildSshCommandArgs,
  extractRemoteHomeDirectoryPayload,
  extractRemoteStateSnapshotPayload,
  normalizeRemoteStateSnapshotForCache,
  resolveHomeRelativeRemotePath,
  rewriteRemoteBubbleTomlRepoPath
} from "../../../../../src/v11/infrastructure/executor/ssh/sshBubbleStart.js";
import { parseBubbleConfigToml } from "../../../../../src/config/bubbleConfig.js";

describe("sshBubbleStart", () => {
  it("fails closed when the remote snapshot omits a valid lifecycle state", () => {
    expect(() =>
      normalizeRemoteStateSnapshotForCache({
        bubbleId: "b_remote_snapshot_invalid_01",
        snapshot: {
          round: 1,
          max_rounds: 8,
          active_role: "implementer"
        },
        fallbackMaxRounds: 8,
        checkedAt: "2026-04-16T12:00:00.000Z"
      })
    ).toThrow(/missing valid lifecycle state/u);
  });

  it("normalizes a valid remote snapshot into cache shape", () => {
    expect(
      normalizeRemoteStateSnapshotForCache({
        bubbleId: "b_remote_snapshot_valid_01",
        snapshot: {
          state: "RUNNING",
          round: 2,
          max_rounds: 9,
          active_role: "reviewer"
        },
        fallbackMaxRounds: 8,
        checkedAt: "2026-04-16T12:00:00.000Z"
      })
    ).toEqual({
      lastCheckedAt: "2026-04-16T12:00:00.000Z",
      state: "RUNNING",
      round: 2,
      maxRounds: 9,
      implementerStatus: "idle",
      reviewerStatus: "running"
    });
  });

  it("fails closed when the remote snapshot confirms any non-RUNNING lifecycle state", () => {
    try {
      normalizeRemoteStateSnapshotForCache({
        bubbleId: "b_remote_snapshot_failed_01",
        snapshot: {
          state: "FAILED",
          round: 1,
          max_rounds: 8,
          active_role: "implementer"
        },
        fallbackMaxRounds: 8,
        checkedAt: "2026-04-16T12:00:00.000Z"
      });
      throw new Error("Expected normalizeRemoteStateSnapshotForCache to throw.");
    } catch (error) {
      expect(error).toBeInstanceOf(RemoteBubbleStartError);
      expect((error as RemoteBubbleStartError).code).toBe("REMOTE_CONFIRMATION_INVALID");
      expect((error as RemoteBubbleStartError).details).toEqual({
        receivedState: "FAILED",
        receivedRound: 1
      });
      expect((error as Error).message).toMatch(/expected RUNNING but received FAILED/u);
    }
  });

  it("fails closed when the remote snapshot omits a valid round", () => {
    expect(() =>
      normalizeRemoteStateSnapshotForCache({
        bubbleId: "b_remote_snapshot_invalid_round_01",
        snapshot: {
          state: "RUNNING",
          max_rounds: 8,
          active_role: "implementer"
        },
        fallbackMaxRounds: 8,
        checkedAt: "2026-04-16T12:00:00.000Z"
      })
    ).toThrow(/missing valid round/u);
  });

  it("fails closed when the remote snapshot has an invalid active role", () => {
    expect(() =>
      normalizeRemoteStateSnapshotForCache({
        bubbleId: "b_remote_snapshot_invalid_role_01",
        snapshot: {
          state: "RUNNING",
          round: 1,
          max_rounds: 8,
          active_role: "status"
        },
        fallbackMaxRounds: 8,
        checkedAt: "2026-04-16T12:00:00.000Z"
      })
    ).toThrow(/invalid active role/u);
  });

  it("keeps the scp destination as a direct argv remote spec when the path contains spaces", () => {
    expect(
      buildScpUploadDestination({
        target: "dev@homelab",
        remoteClonePath: "/srv/pairflow clones/repo's bubble"
      })
    ).toBe("dev@homelab:/srv/pairflow clones/repo's bubble/");
  });

  it("preserves home expansion in the scp argv destination for home-relative repo bases", () => {
    const remoteClonePath = resolveHomeRelativeRemotePath({
      path: "~/repos with spaces/repo's bubble",
      remoteHomeDirectory: "/home/dev"
    });

    expect(
      buildScpUploadDestination({
        target: "dev@homelab",
        remoteClonePath
      })
    ).toBe("dev@homelab:/home/dev/repos with spaces/repo's bubble/");
  });

  it("adds fail-fast transport options to ssh subprocess argv", () => {
    expect(
      buildSshCommandArgs({
        target: "dev@homelab",
        script: "printf ok"
      })
    ).toEqual([
      "-o",
      "BatchMode=yes",
      "-o",
      "StrictHostKeyChecking=yes",
      "-o",
      "ConnectTimeout=10",
      "-o",
      "ConnectionAttempts=1",
      "dev@homelab",
      "bash",
      "-lc",
      "printf ok"
    ]);
  });

  it("adds fail-fast transport options to scp subprocess argv", () => {
    expect(
      buildScpCommandArgs({
        sourcePath: "/tmp/upload/.",
        destination: "dev@homelab:/srv/repos/bubble/"
      })
    ).toEqual([
      "-rq",
      "-o",
      "BatchMode=yes",
      "-o",
      "StrictHostKeyChecking=yes",
      "-o",
      "ConnectTimeout=10",
      "-o",
      "ConnectionAttempts=1",
      "/tmp/upload/.",
      "dev@homelab:/srv/repos/bubble/"
    ]);
  });

  it("extracts the remote state payload from a marker envelope even when stdout contains shell noise", () => {
    const payload = extractRemoteStateSnapshotPayload(
      [
        "Last login: Thu Apr 16 15:00:00 2026 from 10.0.0.1",
        "__PAIRFLOW_REMOTE_STATE_JSON_START__",
        "{\"state\":\"RUNNING\",\"round\":1}",
        "__PAIRFLOW_REMOTE_STATE_JSON_END__"
      ].join("\n")
    );

    expect(payload).toBe("{\"state\":\"RUNNING\",\"round\":1}");
  });

  it("extracts the remote home directory from a marker envelope even when stdout contains shell noise", () => {
    const payload = extractRemoteHomeDirectoryPayload(
      [
        "Welcome to the remote host",
        "__PAIRFLOW_REMOTE_HOME_START__",
        "/home/dev",
        "__PAIRFLOW_REMOTE_HOME_END__"
      ].join("\n")
    );

    expect(payload).toBe("/home/dev");
  });

  it("fails closed when the remote home resolution stdout is missing the marker envelope", () => {
    expect(() => extractRemoteHomeDirectoryPayload("/home/dev")).toThrow(
      /Remote home directory resolution returned stdout without exactly one marker envelope/u
    );
  });

  it("fails closed when the remote state confirmation stdout is missing the JSON envelope markers", () => {
    expect(() => extractRemoteStateSnapshotPayload("{\"state\":\"RUNNING\"}")).toThrow(
      /without exactly one marker envelope/u
    );
  });

  it("builds the clone script with home-relative path expansion intact", () => {
    const remoteClonePath = resolveHomeRelativeRemotePath({
      path: "~/repos with spaces/repo's bubble",
      remoteHomeDirectory: "/home/dev"
    });
    const script = buildCloneRemoteRepositoryScript({
      originUrl: "ssh://example/repo.git",
      remoteClonePath,
      bubbleBranch: "bubble/test",
      baseBranch: "main"
    });

    expect(script).toContain("mkdir -p '/home/dev/repos with spaces'");
    expect(script).toContain("if [ -e '/home/dev/repos with spaces/repo'\\''s bubble' ]; then");
    expect(script).toContain("git clone 'ssh://example/repo.git' '/home/dev/repos with spaces/repo'\\''s bubble'");
    expect(script).toContain("cd '/home/dev/repos with spaces/repo'\\''s bubble'");
  });

  it("builds the inner remote start script with home-relative path expansion intact", () => {
    const remoteClonePath = resolveHomeRelativeRemotePath({
      path: "~/repos with spaces/repo's bubble",
      remoteHomeDirectory: "/home/dev"
    });
    const script = buildRemoteInnerStartScript({
      pairflowCommand: "pairflow",
      bubbleId: "b_remote_home_relative_01",
      remoteClonePath
    });

    expect(script).toContain("cd '/home/dev/repos with spaces/repo'\\''s bubble'");
    expect(script).toContain("export PAIRFLOW_WORKTREE_ROOT='/home/dev/repos with spaces/repo'\\''s bubble'");
    expect(script).toContain("export PAIRFLOW_REMOTE_START_WORKSPACE_ROOT='/home/dev/repos with spaces/repo'\\''s bubble'");
    expect(script).toContain("'pairflow' bubble start --id 'b_remote_home_relative_01' --repo '/home/dev/repos with spaces/repo'\\''s bubble'");
  });

  it("builds the remote state snapshot read script with an explicit marker envelope", () => {
    const script = buildReadRemoteStateSnapshotScript("/srv/repos/bubble/.pairflow/bubbles/b1/state.json");

    expect(script).toContain("set -euo pipefail");
    expect(script).toContain("printf '%s\\n' '__PAIRFLOW_REMOTE_STATE_JSON_START__'");
    expect(script).toContain("cat '/srv/repos/bubble/.pairflow/bubbles/b1/state.json'");
    expect(script).toContain("printf '\\n%s\\n' '__PAIRFLOW_REMOTE_STATE_JSON_END__'");
  });

  it("builds the remote home directory read script with an explicit marker envelope", () => {
    const script = buildReadRemoteHomeDirectoryScript();

    expect(script).toContain("set -euo pipefail");
    expect(script).toContain("printf '%s\\n' '__PAIRFLOW_REMOTE_HOME_START__'");
    expect(script).toContain("printf '%s\\n' \"$HOME\"");
    expect(script).toContain("printf '%s\\n' '__PAIRFLOW_REMOTE_HOME_END__'");
  });

  it("rewrites the uploaded bubble.toml repo_path to the resolved absolute remote clone path", () => {
    const rendered = `
id = "b_remote_home_relative_01"
repo_path = "~/repos/original"
base_branch = "main"
bubble_branch = "bubble/b_remote_home_relative_01"
work_mode = "worktree"
quality_mode = "strict"
review_artifact_type = "code"
pairflow_command_profile = "external"
reviewer_context_mode = "fresh"
watchdog_timeout_minutes = 30
max_rounds = 8
severity_gate_round = 4
commit_requires_approval = true
accuracy_critical = false

[executor]
type = "ssh"
remote = "homelab"

[agents]
implementer = "codex"
reviewer = "claude"

[commands]
test = "pnpm test"
typecheck = "pnpm typecheck"

[notifications]
enabled = true

[local_overlay]
enabled = true
mode = "symlink"
entries = [".claude"]

[doc_contract_gates]
round_gate_applies_after = 2
`.trim();

    const rewritten = rewriteRemoteBubbleTomlRepoPath({
      bubbleTomlContent: `${rendered}\n`,
      remoteClonePath: "/home/dev/repos with spaces/repo's bubble"
    });
    const parsed = parseBubbleConfigToml(rewritten);

    expect(parsed.repo_path).toBe("/home/dev/repos with spaces/repo's bubble");
  });

  it("rejects multi-word pairflow_command values in the remote inner start path", () => {
    expect(() => assertSingleTokenPairflowCommand("node ./dist/cli/index.js")).toThrow(
      /single executable token without whitespace/u
    );
    expect(() =>
      buildRemoteInnerStartScript({
        pairflowCommand: "node ./dist/cli/index.js",
        bubbleId: "b_remote_home_relative_01",
        remoteClonePath: "/home/dev/repos/bubble"
      })
    ).toThrow(/single executable token without whitespace/u);
  });
});
