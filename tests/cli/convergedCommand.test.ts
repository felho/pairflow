import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ConvergedCommandErrorV11,
  type EmitConvergedV11Result as EmitConvergedResult
} from "../../src/v11/application/converged/emitConvergedV11.js";
import { buildMetaReviewExecutionContext } from "../../src/core/bubble/metaReviewExecutionContext.js";
import * as actorEmitContextModule from "../../src/core/bubble/actorEmitContext.js";
import * as actorProtocolModule from "../../src/v11/application/actorProtocol/emitActorProtocolV11.js";
import { parsePassCommandOptions } from "../../src/cli/commands/agent/pass.js";
import {
  getConvergedHelpText,
  parseConvergedCommandOptions,
  runConvergedCommand
} from "../../src/cli/commands/agent/converged.js";

afterEach(() => {
  vi.restoreAllMocks();
});

const PARSER_PARITY_FIXTURES = [
  // Intentional policy scope: converged accepts only P2/P3 in structured mode.
  // P0/P1 coverage lives in the dedicated rejection test below.
  "P2:Non-blocking issue",
  "P3:Minor follow-up|artifact://review/notes.md",
  "P2:Escaped comma ref|artifact://review/with\\,comma.log"
] as const;

describe("parseConvergedCommandOptions", () => {
  it("parses summary, refs, and findings", () => {
    const parsed = parseConvergedCommandOptions([
      "--summary",
      "No blocking findings remain.",
      "--ref",
      "artifact://done-package.md",
      "--finding",
      "P2:Non-blocking follow-up|artifact://review/findings.md"
    ]);

    expect(parsed.help).toBe(false);
    if (parsed.help) {
      throw new Error("Expected validated converged options");
    }

    expect(parsed.summary).toBe("No blocking findings remain.");
    expect(parsed.refs).toEqual(["artifact://done-package.md"]);
    expect(parsed.findings).toEqual([
      {
        severity: "P2",
        title: "Non-blocking follow-up",
        refs: ["artifact://review/findings.md"]
      }
    ]);
  });

  it("supports help", () => {
    const parsed = parseConvergedCommandOptions(["--help"]);
    const help = getConvergedHelpText();
    expect(parsed.help).toBe(true);
    expect(help).toContain("pairflow agent emit --kind convergence");
    expect(help).toContain("pairflow converged");
    expect(help).toContain("CONVERGED_BLOCKER_FINDINGS_FORBIDDEN");
    expect(help).toContain(
      "Single ref accepts any non-empty token; multi-ref requires structured path/URI refs."
    );
    expect(help).toContain("P2|P3:Title[|ref1,ref2]");
    expect(help).not.toContain("P0|P1|P2|P3:Title[|ref1,ref2]");
  });

  it("returns help even when malformed finding is present", () => {
    const parsed = parseConvergedCommandOptions([
      "--help",
      "--finding",
      "bad-format"
    ]);

    expect(parsed.help).toBe(true);
  });

  it("requires --summary", () => {
    expect(() => parseConvergedCommandOptions([])).toThrow(
      /CONVERGED_OPTIONS_INVALID/u
    );
    expect(() => parseConvergedCommandOptions([])).toThrow(/--summary/u);
  });

  it("keeps parser parity with pass for P2/P3 fixtures", () => {
    for (const fixture of PARSER_PARITY_FIXTURES) {
      const passParsed = parsePassCommandOptions([
        "--summary",
        "review",
        "--finding",
        fixture
      ]);
      const convergedParsed = parseConvergedCommandOptions([
        "--summary",
        "ready",
        "--finding",
        fixture
      ]);
      if (passParsed.help || convergedParsed.help) {
        throw new Error("Expected non-help parse result.");
      }
      expect(
        passParsed.findings.map((finding) => ({
          severity: finding.severity,
          title: finding.title,
          ...(finding.refs !== undefined ? { refs: finding.refs } : {})
        }))
      ).toEqual(convergedParsed.findings);
    }
  });

  it("rejects invalid finding format with converged reason code", () => {
    expect(() =>
      parseConvergedCommandOptions([
        "--summary",
        "ready",
        "--finding",
        "not-a-finding"
      ])
    ).toThrow(/CONVERGED_FINDINGS_INVALID/u);
  });

  it("rejects empty ref token in finding refs with converged reason code", () => {
    expect(() =>
      parseConvergedCommandOptions([
        "--summary",
        "ready",
        "--finding",
        "P2:Follow-up|artifact://review/a.md,,artifact://review/b.md"
      ])
    ).toThrow(/CONVERGED_FINDINGS_INVALID/u);
  });

  it("rejects ambiguous multi-ref finding refs with converged reason code", () => {
    expect(() =>
      parseConvergedCommandOptions([
        "--summary",
        "ready",
        "--finding",
        "P2:Follow-up|artifact://review/a.md,notes-token"
      ])
    ).toThrow(/CONVERGED_FINDINGS_INVALID/u);
  });

  it("rejects empty title before refs separator with converged reason code", () => {
    expect(() =>
      parseConvergedCommandOptions([
        "--summary",
        "ready",
        "--finding",
        "P2: |artifact://review/a.md"
      ])
    ).toThrow(/CONVERGED_FINDINGS_INVALID/u);
  });

  it("rejects P0 and P1 findings in converged context", () => {
    for (const finding of ["P0:Critical blocker", "P1:Blocker"]) {
      expect(() =>
        parseConvergedCommandOptions([
          "--summary",
          "ready",
          "--finding",
          finding
        ])
      ).toThrow(/CONVERGED_BLOCKER_FINDINGS_FORBIDDEN/u);
    }
  });

  it("rejects when summary asserts open findings but structured findings are missing", () => {
    expect(() =>
      parseConvergedCommandOptions([
        "--summary",
        "P2 findings remain open after checks."
      ])
    ).toThrow(/CONVERGED_SUMMARY_FINDINGS_CONTRADICTION/u);
  });

  it("rejects when summary declares clean state while structured findings are present", () => {
    expect(() =>
      parseConvergedCommandOptions([
        "--summary",
        "No findings remain.",
        "--finding",
        "P2:Still open"
      ])
    ).toThrow(/CONVERGED_SUMMARY_FINDINGS_CONTRADICTION/u);
  });

  it("accepts resolved-count summary phrasing when structured findings are present", () => {
    const parsed = parseConvergedCommandOptions([
      "--summary",
      "2 findings were resolved.",
      "--finding",
      "P2:Follow-up validation remains"
    ]);

    expect(parsed.help).toBe(false);
    if (parsed.help) {
      throw new Error("Expected validated converged options");
    }
    expect(parsed.findings).toEqual([
      {
        severity: "P2",
        title: "Follow-up validation remains"
      }
    ]);
  });

  it("rejects clean severity-scoped summary assertions when structured findings are present", () => {
    expect(() =>
      parseConvergedCommandOptions([
        "--summary",
        "No open P2 or P3 findings remain.",
        "--finding",
        "P2:Still open"
      ])
    ).toThrow(/CONVERGED_SUMMARY_FINDINGS_CONTRADICTION/u);
  });
});

describe("runConvergedCommand", () => {
  it("returns null on help", async () => {
    const result = await runConvergedCommand(["--help"]);
    expect(result).toBeNull();
  });

  it("wraps parse-phase option errors with converged reason-code style", async () => {
    await expect(runConvergedCommand([])).rejects.toBeInstanceOf(
      ConvergedCommandErrorV11
    );
    await expect(runConvergedCommand([])).rejects.toThrow(
      /CONVERGED_OPTIONS_INVALID/u
    );
  });

  it("wraps parse-phase finding errors with converged reason-code style", async () => {
    await expect(
      runConvergedCommand([
        "--summary",
        "ready",
        "--finding",
        "bad-format"
      ])
    ).rejects.toBeInstanceOf(ConvergedCommandErrorV11);
    await expect(
      runConvergedCommand([
        "--summary",
        "ready",
        "--finding",
        "bad-format"
      ])
    ).rejects.toThrow(/CONVERGED_FINDINGS_INVALID/u);
  });

  it("returns meta-review-running handoff result from converged flow", async () => {
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
          execution_context: buildMetaReviewExecutionContext({
            bubbleId: "b_cli_converged_meta_01",
            round: 2,
            startedAt: "2026-03-12T08:00:01.000Z",
            watchdogTimeoutMinutes: 60,
            attempt: 1
          }),
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

    vi.spyOn(
      actorEmitContextModule,
      "resolveCompatActorEmitContextFromWorkspace"
    ).mockResolvedValue({
      repo: "/tmp/pairflow-repo",
      bubble_id: "b_cli_converged_meta_01",
      handoff_id: "reviewer:b_cli_converged_meta_01:round:2:attempt:1",
      expected_role: "reviewer",
      expected_round: 2,
      expected_state_fingerprint: "fp_cli_converged_meta_01",
      worktree_path: "/tmp/pairflow-repo/.pairflow-worktrees/b_cli_converged_meta_01",
      resolved: {} as never,
      loaded_state: {} as never,
      execution_context: {} as never
    });
    const emitSpy = vi
      .spyOn(actorProtocolModule, "emitActorProtocolFromWorkspaceV11")
      .mockResolvedValue({
        kind: "convergence",
        convergence: mocked
      });

    const result = await runConvergedCommand(
      ["--summary", "Ready for approval."],
      "/tmp/pairflow-repo"
    );

    expect(emitSpy).toHaveBeenCalledWith(
      {
        input: {
          kind: "convergence",
          repo: "/tmp/pairflow-repo",
          bubble_id: "b_cli_converged_meta_01",
          handoff_id: "reviewer:b_cli_converged_meta_01:round:2:attempt:1",
          summary: "Ready for approval.",
          refs: [],
          expected_round: 2,
          expected_role: "reviewer",
          expected_state_fingerprint: "fp_cli_converged_meta_01"
        },
        authoritativeContext: {
          repo: "/tmp/pairflow-repo",
          bubble_id: "b_cli_converged_meta_01",
          handoff_id: "reviewer:b_cli_converged_meta_01:round:2:attempt:1",
          expected_role: "reviewer",
          expected_round: 2,
          expected_state_fingerprint: "fp_cli_converged_meta_01",
          worktree_path: "/tmp/pairflow-repo/.pairflow-worktrees/b_cli_converged_meta_01",
          resolved: {} as never,
          loaded_state: {} as never,
          execution_context: {} as never
        }
      }
    );
    expect(result?.gateRoute).toBe("meta_review_running");
    expect(result?.approvalRequestEnvelope.type).toBe("TASK");
    expect(result?.state.state).toBe("META_REVIEW_RUNNING");
  });

  it("forwards parsed findings to converged flow emit path", async () => {
    const mocked = {
      bubbleId: "b_cli_converged_meta_02",
      convergenceSequence: 21,
      convergenceEnvelope: {
        id: "env_conv_2",
        ts: "2026-03-12T09:00:00.000Z",
        bubble_id: "b_cli_converged_meta_02",
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
      approvalRequestSequence: 22,
      approvalRequestEnvelope: {
        id: "env_gate_2",
        ts: "2026-03-12T09:00:01.000Z",
        bubble_id: "b_cli_converged_meta_02",
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
        bubble_id: "b_cli_converged_meta_02",
        state: "META_REVIEW_RUNNING",
        round: 2,
        active_agent: "codex",
        active_role: "meta_reviewer",
        active_since: "2026-03-12T09:00:01.000Z",
        last_command_at: "2026-03-12T09:00:01.000Z",
        round_role_history: [],
        meta_review: {
          execution_context: buildMetaReviewExecutionContext({
            bubbleId: "b_cli_converged_meta_02",
            round: 2,
            startedAt: "2026-03-12T09:00:01.000Z",
            watchdogTimeoutMinutes: 60,
            attempt: 1
          }),
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

    vi.spyOn(
      actorEmitContextModule,
      "resolveCompatActorEmitContextFromWorkspace"
    ).mockResolvedValue({
      repo: "/tmp/pairflow-repo",
      bubble_id: "b_cli_converged_meta_02",
      handoff_id: "reviewer:b_cli_converged_meta_02:round:2:attempt:1",
      expected_role: "reviewer",
      expected_round: 2,
      expected_state_fingerprint: "fp_cli_converged_meta_02",
      worktree_path: "/tmp/pairflow-repo/.pairflow-worktrees/b_cli_converged_meta_02",
      resolved: {} as never,
      loaded_state: {} as never,
      execution_context: {} as never
    });
    const emitSpy = vi
      .spyOn(actorProtocolModule, "emitActorProtocolFromWorkspaceV11")
      .mockResolvedValue({
        kind: "convergence",
        convergence: mocked
      });

    const result = await runConvergedCommand(
      [
        "--summary",
        "P2 findings remain open.",
        "--finding",
        "P2:Follow-up item|artifact://review/findings.md"
      ],
      "/tmp/pairflow-repo"
    );

    expect(emitSpy).toHaveBeenCalledWith(
      {
        input: {
          kind: "convergence",
          repo: "/tmp/pairflow-repo",
          bubble_id: "b_cli_converged_meta_02",
          handoff_id: "reviewer:b_cli_converged_meta_02:round:2:attempt:1",
          summary: "P2 findings remain open.",
          refs: [],
          findings: [
            {
              severity: "P2",
              title: "Follow-up item",
              refs: ["artifact://review/findings.md"]
            }
          ],
          expected_round: 2,
          expected_role: "reviewer",
          expected_state_fingerprint: "fp_cli_converged_meta_02"
        },
        authoritativeContext: {
          repo: "/tmp/pairflow-repo",
          bubble_id: "b_cli_converged_meta_02",
          handoff_id: "reviewer:b_cli_converged_meta_02:round:2:attempt:1",
          expected_role: "reviewer",
          expected_round: 2,
          expected_state_fingerprint: "fp_cli_converged_meta_02",
          worktree_path: "/tmp/pairflow-repo/.pairflow-worktrees/b_cli_converged_meta_02",
          resolved: {} as never,
          loaded_state: {} as never,
          execution_context: {} as never
        }
      }
    );
    expect(result?.gateRoute).toBe("meta_review_running");
    expect(result?.state.state).toBe("META_REVIEW_RUNNING");
    expect(result?.convergenceEnvelope.payload.summary).toBe("converged");
  });
});
