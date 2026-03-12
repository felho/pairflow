import { afterEach, describe, expect, it, vi } from "vitest";

import type { EmitConvergedResult } from "../../src/core/agent/converged.js";
import * as convergedCore from "../../src/core/agent/converged.js";
import {
  getConvergedHelpText,
  parseConvergedCommandOptions,
  runConvergedCommand
} from "../../src/cli/commands/agent/converged.js";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("parseConvergedCommandOptions", () => {
  it("parses summary and refs", () => {
    const parsed = parseConvergedCommandOptions([
      "--summary",
      "No blocking findings remain.",
      "--ref",
      "artifact://done-package.md"
    ]);

    expect(parsed.help).toBe(false);
    if (parsed.help) {
      throw new Error("Expected validated converged options");
    }

    expect(parsed.summary).toBe("No blocking findings remain.");
    expect(parsed.refs).toEqual(["artifact://done-package.md"]);
  });

  it("supports help", () => {
    const parsed = parseConvergedCommandOptions(["--help"]);
    expect(parsed.help).toBe(true);
    expect(getConvergedHelpText()).toContain("pairflow converged");
    expect(getConvergedHelpText()).toContain("Doc scope note");
  });

  it("requires --summary", () => {
    expect(() => parseConvergedCommandOptions([])).toThrow(/--summary/u);
  });
});

describe("runConvergedCommand", () => {
  it("returns null on help", async () => {
    const result = await runConvergedCommand(["--help"]);
    expect(result).toBeNull();
  });

  it("returns meta-review-running handoff result from core converged flow", async () => {
    const mocked = {
      bubbleId: "b_cli_converged_meta_01",
      convergenceSequence: 11,
      convergenceEnvelope: {
        id: "env_conv",
        ts: "2026-03-12T08:00:00.000Z",
        bubble_id: "b_cli_converged_meta_01",
        sender: "codex",
        recipient: "orchestrator",
        type: "CONVERGENCE",
        round: 2,
        payload: {
          summary: "converged"
        },
        refs: []
      },
      gateRoute: "meta_review_running",
      approvalRequestSequence: 12,
      approvalRequestEnvelope: {
        id: "env_gate",
        ts: "2026-03-12T08:00:01.000Z",
        bubble_id: "b_cli_converged_meta_01",
        sender: "orchestrator",
        recipient: "codex",
        type: "TASK",
        round: 2,
        payload: {
          summary: "meta review kickoff"
        },
        refs: []
      },
      state: {
        bubble_id: "b_cli_converged_meta_01",
        state: "META_REVIEW_RUNNING",
        round: 2,
        active_agent: "codex",
        active_role: "meta_reviewer",
        active_since: "2026-03-12T08:00:01.000Z",
        last_command_at: "2026-03-12T08:00:01.000Z",
        round_role_history: [],
        meta_review: {
          last_autonomous_run_id: null,
          last_autonomous_status: null,
          last_autonomous_recommendation: null,
          last_autonomous_summary: null,
          last_autonomous_report_ref: null,
          last_autonomous_rework_target_message: null,
          last_autonomous_updated_at: null,
          auto_rework_count: 0,
          auto_rework_limit: 5,
          sticky_human_gate: false
        }
      }
    } satisfies EmitConvergedResult;

    const emitSpy = vi
      .spyOn(convergedCore, "emitConvergedFromWorkspace")
      .mockResolvedValue(mocked);

    const result = await runConvergedCommand(
      ["--summary", "No blocking findings remain."],
      "/tmp/pairflow-repo"
    );

    expect(emitSpy).toHaveBeenCalledWith({
      summary: "No blocking findings remain.",
      refs: [],
      cwd: "/tmp/pairflow-repo"
    });
    expect(result?.gateRoute).toBe("meta_review_running");
    expect(result?.approvalRequestEnvelope.type).toBe("TASK");
    expect(result?.state.state).toBe("META_REVIEW_RUNNING");
  });
});
