import { describe, expect, it } from "vitest";

import { refreshReviewerContext } from "../../../src/v11/infrastructure/channel/tmux/reviewerContext.js";
import type { BubbleConfig } from "../../../src/types/bubble.js";
import {
  getTopologySlotPaneIndexForRole
} from "../../../src/v11/application/actorProtocol/roleDescriptorRegistry.js";
import type { RuntimeSessionRecord } from "../../../src/v11/shared/ports/runtimeSessions.js";
import type { TmuxRunResult, TmuxRunner } from "../../../src/v11/shared/ports/tmuxSessions.js";
import { shellQuote } from "../../../src/v11/shared/foundation/shellQuote.js";

const baseConfig: BubbleConfig = {
  id: "b_reviewer_ctx_01",
  repo_path: "/tmp/repo",
  base_branch: "main",
  bubble_branch: "bubble/b_reviewer_ctx_01",
  work_mode: "worktree",
  quality_mode: "strict",
  review_artifact_type: "code",
  pairflow_command_profile: "external",
  reviewer_context_mode: "fresh",
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

function extractBashLcScript(command: string): string {
  const prefix = "bash -lc ";
  expect(command.startsWith(prefix)).toBe(true);
  const quotedScript = command.slice(prefix.length);
  expect(quotedScript.startsWith("'")).toBe(true);
  expect(quotedScript.endsWith("'")).toBe(true);
  return quotedScript.slice(1, -1).replace(/'\\''/gu, "'");
}

function createRuntimeSessionRecord(
  overrides: Partial<RuntimeSessionRecord> = {}
): RuntimeSessionRecord {
  return {
    bubbleId: "b_reviewer_ctx_01",
    repoPath: "/tmp/repo",
    worktreePath: "/tmp/worktree",
    tmuxSessionName: "pf-b_reviewer_ctx_01",
    updatedAt: "2026-02-23T10:00:00.000Z",
    ...overrides
  };
}

describe("refreshReviewerContext", () => {
  it("respawns reviewer pane using explicit canonical workspace authority", async () => {
    const calls: string[][] = [];
    const runner: TmuxRunner = (args): Promise<TmuxRunResult> => {
      calls.push(args);
      return Promise.resolve({
        stdout: "",
        stderr: "",
        exitCode: 0
      });
    };

    const result = await refreshReviewerContext({
      bubbleId: "b_reviewer_ctx_01",
      bubbleConfig: baseConfig,
      sessionsPath: "/tmp/repo/.pairflow/runtime/sessions.json",
      reviewerStartupPrompt: "Reviewer brief (persisted artifact `reviewer-brief.md`): Verify each claim.",
      runner,
      readSessionsRegistry: () =>
        Promise.resolve({
          b_reviewer_ctx_01: createRuntimeSessionRecord({
            workspacePath: "/tmp/runtime-workspace",
            workspaceKind: "worktree"
          })
        })
    });

    expect(result).toEqual({
      refreshed: true
    });
    expect(calls[0]?.[0]).toBe("respawn-pane");
    expect(calls[0]?.[3]).toBe(
      `pf-b_reviewer_ctx_01:0.${String(getTopologySlotPaneIndexForRole("reviewer"))}`
    );
    expect(calls[0]?.[5]).toBe("/tmp/runtime-workspace");
    expect(calls[0]?.join(" ")).toContain(
      "Reviewer brief (persisted artifact `reviewer-brief.md`): Verify each claim."
    );
    const reviewerCommand = calls[0]?.[6];
    expect(typeof reviewerCommand).toBe("string");
    const script = extractBashLcScript(reviewerCommand as string);
    expect(script).toContain(`if ! cd ${shellQuote("/tmp/runtime-workspace")}; then`);
  });

  it("fails closed when explicit workspace authority is absent", async () => {
    const calls: string[][] = [];
    const runner: TmuxRunner = (args): Promise<TmuxRunResult> => {
      calls.push(args);
      return Promise.resolve({
        stdout: "",
        stderr: "",
        exitCode: 0
      });
    };

    const result = await refreshReviewerContext({
      bubbleId: "b_reviewer_ctx_01",
      bubbleConfig: baseConfig,
      sessionsPath: "/tmp/repo/.pairflow/runtime/sessions.json",
      runner,
      readSessionsRegistry: () =>
        Promise.resolve({
          b_reviewer_ctx_01: createRuntimeSessionRecord()
        })
    });

    expect(result).toEqual({
      refreshed: false,
      reason: "no_runtime_session"
    });
    expect(calls).toHaveLength(0);
  });

  it("returns no_runtime_session when runtime session is missing", async () => {
    const result = await refreshReviewerContext({
      bubbleId: "b_reviewer_ctx_01",
      bubbleConfig: baseConfig,
      sessionsPath: "/tmp/repo/.pairflow/runtime/sessions.json",
      readSessionsRegistry: () => Promise.resolve({})
    });

    expect(result).toEqual({
      refreshed: false,
      reason: "no_runtime_session"
    });
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

    const result = await refreshReviewerContext({
      bubbleId: "b_reviewer_ctx_01",
      bubbleConfig: baseConfig,
      sessionsPath: "/tmp/repo/.pairflow/runtime/sessions.json",
      runner,
      readSessionsRegistry: () =>
        Promise.resolve({
          b_reviewer_ctx_01: createRuntimeSessionRecord({
            worktreePath: "   "
          })
        })
    });

    expect(result).toEqual({
      refreshed: false,
      reason: "no_runtime_session"
    });
    expect(calls).toHaveLength(0);
  });

  it("fails closed when clone-mode session has no canonical workspace authority", async () => {
    const calls: string[][] = [];
    const runner: TmuxRunner = (args): Promise<TmuxRunResult> => {
      calls.push(args);
      return Promise.resolve({
        stdout: "",
        stderr: "",
        exitCode: 0
      });
    };

    const result = await refreshReviewerContext({
      bubbleId: "b_reviewer_ctx_01",
      bubbleConfig: baseConfig,
      sessionsPath: "/tmp/repo/.pairflow/runtime/sessions.json",
      runner,
      readSessionsRegistry: () =>
        Promise.resolve({
          b_reviewer_ctx_01: createRuntimeSessionRecord({
            workspaceKind: "clone"
          })
        })
    });

    expect(result).toEqual({
      refreshed: false,
      reason: "no_runtime_session"
    });
    expect(calls).toHaveLength(0);
  });

  it("uses self_host bootstrap wrapper when reviewer context refresh runs under self_host profile", async () => {
    const calls: string[][] = [];
    const runner: TmuxRunner = (args): Promise<TmuxRunResult> => {
      calls.push(args);
      return Promise.resolve({
        stdout: "",
        stderr: "",
        exitCode: 0
      });
    };

    const result = await refreshReviewerContext({
      bubbleId: "b_reviewer_ctx_01",
      bubbleConfig: {
        ...baseConfig,
        pairflow_command_profile: "self_host"
      },
      sessionsPath: "/tmp/repo/.pairflow/runtime/sessions.json",
      runner,
      readSessionsRegistry: () =>
        Promise.resolve({
          b_reviewer_ctx_01: createRuntimeSessionRecord({
            workspacePath: "/tmp/runtime-workspace",
            workspaceKind: "worktree"
          })
        })
    });

    expect(result).toEqual({
      refreshed: true
    });
    const reviewerCommand = calls[0]?.[6];
    expect(typeof reviewerCommand).toBe("string");
    const script = extractBashLcScript(reviewerCommand as string);
    expect(script).toContain("PAIRFLOW_LOCAL_ENTRYPOINT");
    expect(script).toContain("PAIRFLOW_COMMAND_PATH_STALE");
    expect(script).not.toContain("PAIRFLOW_EXTERNAL_COMMAND");
  });

  it("exports remote workspace authority when refreshing reviewer for ssh executor bubbles", async () => {
    const calls: string[][] = [];
    const runner: TmuxRunner = (args): Promise<TmuxRunResult> => {
      calls.push(args);
      return Promise.resolve({
        stdout: "",
        stderr: "",
        exitCode: 0
      });
    };

    const result = await refreshReviewerContext({
      bubbleId: "b_reviewer_ctx_01",
      bubbleConfig: {
        ...baseConfig,
        executor: {
          type: "ssh",
          remote: "spark1"
        }
      },
      sessionsPath: "/tmp/repo/.pairflow/runtime/sessions.json",
      runner,
      readSessionsRegistry: () =>
        Promise.resolve({
          b_reviewer_ctx_01: createRuntimeSessionRecord({
            workspacePath: "/remote/repos/pairflow--bubble-01",
            workspaceKind: "clone"
          })
        })
    });

    expect(result).toEqual({
      refreshed: true
    });
    const reviewerCommand = calls[0]?.[6];
    expect(typeof reviewerCommand).toBe("string");
    const script = extractBashLcScript(reviewerCommand as string);
    expect(script).toContain(
      "export PAIRFLOW_REMOTE_START_MODE='inner_remote_activation'"
    );
    expect(script).toContain(
      "export PAIRFLOW_REMOTE_START_WORKSPACE_ROOT='/remote/repos/pairflow--bubble-01'"
    );
  });
});
