import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";

import { afterEach, describe, expect, it } from "vitest";

import { parseBubbleMetaReviewCommandOptions } from "../../../src/cli/commands/bubble/metaReview.js";
import { submitMetaReviewResultV11 as submitMetaReviewResult } from "../../../src/v11/application/metaReview/emitMetaReviewV11.js";
import { buildMetaReviewExecutionContext } from "../../../src/v11/shared/metaReview/metaReviewExecutionContext.js";
import { MetaReviewError } from "../../../src/v11/shared/metaReview/metaReviewError.js";
import {
  appendProtocolEnvelope,
  readTranscriptEnvelopes
} from "../../../src/v11/infrastructure/artifact/transcript/transcriptStore.js";
import { metaReviewExecutionContextToRunningContext } from "../../../src/v11/shared/state/executionContext.js";
import { readStateSnapshot, writeStateSnapshot } from "../../../src/v11/infrastructure/state/stateStore.js";
import { parseRequiredSubmitReportJson } from "../../../src/v11/application/metaReview/metaReviewCliOptionValueReader.js";
import type { Finding } from "../../../src/types/findings.js";
import { setupRunningBubbleFixture } from "../../helpers/bubble.js";
import { initGitRepository } from "../../helpers/git.js";

const tempDirs: string[] = [];

async function createTempRepo(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-contract-meta-submit-"));
  tempDirs.push(root);
  await initGitRepository(root);
  return root;
}

async function writeMetaReviewRunningState(input: {
  statePath: string;
  activeAgent: "codex" | "claude";
  activeRole: "meta_reviewer";
  round?: number;
  nowIso: string;
}): Promise<void> {
  const loaded = await readStateSnapshot(input.statePath);
  await writeStateSnapshot(
    input.statePath,
    {
      ...loaded.state,
      state: "RUNNING",
      round: input.round ?? loaded.state.round,
      active_agent: input.activeAgent,
      active_role: input.activeRole,
      active_since: input.nowIso,
      last_command_at: input.nowIso,
      execution_context: metaReviewExecutionContextToRunningContext(
        buildMetaReviewExecutionContext({
          bubbleId: loaded.state.bubble_id,
          round: input.round ?? loaded.state.round,
          startedAt: input.nowIso,
          watchdogTimeoutMinutes: 60 * 24 * 30,
          attempt: 1
        })
      ),
      meta_review: {
        ...loaded.state.meta_review!,
        execution_context: buildMetaReviewExecutionContext({
          bubbleId: loaded.state.bubble_id,
          round: input.round ?? loaded.state.round,
          startedAt: input.nowIso,
          watchdogTimeoutMinutes: 60 * 24 * 30,
          attempt: 1
        })
      }
    },
    {
      expectedFingerprint: loaded.fingerprint,
      expectedState: "RUNNING"
    }
  );
}

function buildActiveMetaReviewerSession(input: {
  bubbleId: string;
  repoPath: string;
  worktreePath: string;
}) {
  return {
    [input.bubbleId]: {
      bubbleId: input.bubbleId,
      repoPath: input.repoPath,
      worktreePath: input.worktreePath,
      tmuxSessionName: "pf_meta_submit_contract",
      updatedAt: "2026-03-24T10:30:00.000Z",
      metaReviewerPane: {
        role: "meta-reviewer" as const,
        paneIndex: 3,
        active: true,
        updatedAt: "2026-03-24T10:30:00.000Z"
      }
    }
  };
}

async function appendReviewerSnapshot(input: {
  bubble: Awaited<ReturnType<typeof setupRunningBubbleFixture>>;
  nowIso: string;
  findings?: Finding[];
  advisoryFindingsOpenTotal?: number;
  round?: number;
}): Promise<void> {
  await appendProtocolEnvelope({
    transcriptPath: input.bubble.paths.transcriptPath,
    lockPath: join(
      input.bubble.paths.locksDir,
      `${input.bubble.bubbleId}.lock`
    ),
    now: new Date(input.nowIso),
    envelope: {
      bubble_id: input.bubble.bubbleId,
      sender: "claude",
      recipient: "orchestrator",
      type: "CONVERGENCE",
      round: input.round ?? 1,
      payload: {
        summary: "Reviewer converged snapshot.",
        ...(input.findings !== undefined ? { findings: input.findings } : {}),
        ...(input.advisoryFindingsOpenTotal !== undefined
          ? {
              metadata: {
                advisory_findings_open_total: input.advisoryFindingsOpenTotal
              }
            }
          : {})
      },
      refs: []
    }
  });
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((path) =>
      rm(path, { recursive: true, force: true })
    )
  );
});

describe("v11 meta-review submit contract", () => {
  it("enforces required --report-json at option-reader boundary via parseRequiredSubmitReportJson", () => {
    let thrown: unknown;
    try {
      parseRequiredSubmitReportJson(undefined);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(MetaReviewError);
    if (!(thrown instanceof MetaReviewError)) {
      throw new Error("Expected MetaReviewError for missing required report_json.");
    }
    expect(thrown.reasonCode).toBe("META_REVIEW_SCHEMA_INVALID");
    expect(thrown.message).toContain("Missing required option: --report-json");
  });

  it("rejects submit command when --report-json is missing", () => {
    let thrown: unknown;
    try {
      parseBubbleMetaReviewCommandOptions([
        "submit",
        "--id",
        "b_meta_contract_missing_report_json_01",
        "--round",
        "1",
        "--recommendation",
        "approve",
        "--summary",
        "Contract submit payload without report_json"
      ]);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(MetaReviewError);
    if (!(thrown instanceof MetaReviewError)) {
      throw new Error("Expected MetaReviewError for missing --report-json.");
    }
    expect(thrown.message).toContain("was removed");
    expect(thrown.message).toContain("pairflow agent emit --kind meta_review_result");
  });

  it("rejects submit command when --report-json is not a JSON object", () => {
    let thrown: unknown;
    try {
      parseBubbleMetaReviewCommandOptions([
        "submit",
        "--id",
        "b_meta_contract_invalid_report_json_01",
        "--round",
        "1",
        "--recommendation",
        "approve",
        "--summary",
        "Contract submit payload with invalid report_json shape",
        "--report-json",
        "[]"
      ]);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(MetaReviewError);
    if (!(thrown instanceof MetaReviewError)) {
      throw new Error("Expected MetaReviewError for invalid --report-json shape.");
    }
    expect(thrown.message).toContain("was removed");
    expect(thrown.message).toContain("pairflow agent emit --kind meta_review_result");
  });

  it("rejects summary/structured mismatch on submit", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_contract_submit_parity_01",
      task: "Contract: summary vs structured parity reject"
    });
    await writeMetaReviewRunningState({
      statePath: bubble.paths.statePath,
      activeAgent: "codex",
      activeRole: "meta_reviewer",
      nowIso: "2026-03-24T10:31:00.000Z"
    });

    await expect(
      submitMetaReviewResult(
        {
          bubbleId: bubble.bubbleId,
          repoPath,
          round: 1,
          recommendation: "approve",
          summary: "1 open finding remains in this run.",
          report_json: {
            findings_claim_state: "clean",
            findings_claim_source: "meta_review_artifact",
            findings_count: 0
          }
        },
        {
          readRuntimeSessionsRegistry: async () =>
            buildActiveMetaReviewerSession({
              bubbleId: bubble.bubbleId,
              repoPath,
              worktreePath: bubble.paths.worktreePath
            })
        }
      )
    ).rejects.toMatchObject({
      reasonCode: "META_REVIEW_SUMMARY_STRUCTURED_MISMATCH"
    });
  });

  it("accepts valid submit contract with explicit required structured fields", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_contract_submit_accept_01",
      task: "Contract: successful structured submit"
    });
    await writeMetaReviewRunningState({
      statePath: bubble.paths.statePath,
      activeAgent: "codex",
      activeRole: "meta_reviewer",
      nowIso: "2026-03-24T10:32:00.000Z"
    });

    await expect(
      submitMetaReviewResult(
        {
          bubbleId: bubble.bubbleId,
          repoPath,
          round: 1,
          recommendation: "approve",
          summary: "No findings remain after this review.",
          report_json: {
            findings_claim_state: "clean",
            findings_claim_source: "meta_review_artifact",
            findings_count: 0
          }
        },
        {
          readRuntimeSessionsRegistry: async () =>
            buildActiveMetaReviewerSession({
              bubbleId: bubble.bubbleId,
              repoPath,
              worktreePath: bubble.paths.worktreePath
            })
        }
      )
    ).resolves.toMatchObject({
      status: "success",
      recommendation: "approve",
      gate_route: "human_gate_approve",
      lifecycle_state: "READY_FOR_HUMAN_APPROVAL"
    });
  });

  it("accepts advisory-only approve submit contract against same-round reviewer snapshot and preserves split metadata end-to-end", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_contract_submit_approve_advisory_01",
      task: "Contract: advisory-only approve submit"
    });
    await writeMetaReviewRunningState({
      statePath: bubble.paths.statePath,
      activeAgent: "codex",
      activeRole: "meta_reviewer",
      nowIso: "2026-03-24T10:32:05.000Z"
    });
    await appendReviewerSnapshot({
      bubble,
      nowIso: "2026-03-24T10:32:05.050Z",
      findings: [
        {
          severity: "P2",
          title: "Operator wording could be clearer"
        },
        {
          severity: "P3",
          title: "Runbook example can be tightened"
        }
      ],
      advisoryFindingsOpenTotal: 2
    });

    const result = await submitMetaReviewResult(
      {
        bubbleId: bubble.bubbleId,
        repoPath,
        round: 1,
        recommendation: "approve",
        summary: "2 advisory findings remain open.",
        report_json: {
          findings_claim_state: "open_findings",
          findings_claim_source: "meta_review_artifact",
          findings_count: 2,
          findings_claimed_open_total: 2,
          findings_blocking_open_total: 0,
          findings_advisory_open_total: 2
        }
      },
      {
        randomUUID: () => "run_meta_contract_submit_approve_advisory_01",
        readRuntimeSessionsRegistry: async () =>
          buildActiveMetaReviewerSession({
            bubbleId: bubble.bubbleId,
            repoPath,
            worktreePath: bubble.paths.worktreePath
          })
      }
    );

    expect(result).toMatchObject({
      run_id: "run_meta_contract_submit_approve_advisory_01",
      status: "success",
      recommendation: "approve",
      gate_route: "human_gate_approve",
      gate_envelope_type: "APPROVAL_REQUEST",
      lifecycle_state: "READY_FOR_HUMAN_APPROVAL"
    });
    expect(result.report_json).toMatchObject({
      findings_claim_state: "open_findings",
      findings_count: 2,
      findings_claimed_open_total: 2,
      findings_blocking_open_total: 0,
      findings_advisory_open_total: 2,
      findings_artifact_open_total: null,
      findings_parity_status: null
    });

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    expect(loaded.state.state).toBe("READY_FOR_HUMAN_APPROVAL");
    expect(loaded.state.meta_review).toMatchObject({
      last_autonomous_run_id: "run_meta_contract_submit_approve_advisory_01",
      last_autonomous_status: "success",
      last_autonomous_recommendation: "approve",
      last_autonomous_summary: "2 advisory findings remain open."
    });

    const transcript = await readTranscriptEnvelopes(
      bubble.paths.transcriptPath,
      { allowMissing: false }
    );
    const last = transcript.at(-1);
    expect(last?.type).toBe("APPROVAL_REQUEST");
    expect(last?.payload.metadata).toMatchObject({
      actor: "meta-reviewer",
      actor_agent: "codex",
      delivery_target_role: "status",
      latest_recommendation: "approve",
      meta_review_gate_route: "human_gate_approve",
      meta_review_run_id: "run_meta_contract_submit_approve_advisory_01",
      findings_claimed_open_total: 2,
      findings_blocking_open_total: 0,
      findings_advisory_open_total: 2,
      findings_artifact_open_total: null,
      findings_parity_status: null
    });
  });

  it("accepts inconclusive submit contract as routed human-gate success", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_contract_submit_inconclusive_accept_01",
      task: "Contract: successful inconclusive submit"
    });
    await writeMetaReviewRunningState({
      statePath: bubble.paths.statePath,
      activeAgent: "codex",
      activeRole: "meta_reviewer",
      nowIso: "2026-03-24T10:32:15.000Z"
    });

    const result = await submitMetaReviewResult(
      {
        bubbleId: bubble.bubbleId,
        repoPath,
        round: 1,
        recommendation: "inconclusive",
        summary: "Needs human interpretation before approval.",
        report_json: {
          findings_claim_state: "unknown",
          findings_claim_source: "meta_review_artifact",
          findings_count: 2
        }
      },
      {
        randomUUID: () => "run_meta_contract_submit_inconclusive_01",
        readRuntimeSessionsRegistry: async () =>
          buildActiveMetaReviewerSession({
            bubbleId: bubble.bubbleId,
            repoPath,
            worktreePath: bubble.paths.worktreePath
          })
      }
    );

    expect(result).toMatchObject({
      run_id: "run_meta_contract_submit_inconclusive_01",
      status: "success",
      recommendation: "inconclusive",
      gate_route: "human_gate_inconclusive",
      gate_envelope_type: "APPROVAL_REQUEST",
      lifecycle_state: "READY_FOR_HUMAN_APPROVAL"
    });

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    expect(loaded.state.state).toBe("READY_FOR_HUMAN_APPROVAL");
    expect(loaded.state.meta_review).toMatchObject({
      last_autonomous_run_id: "run_meta_contract_submit_inconclusive_01",
      last_autonomous_status: "success",
      last_autonomous_recommendation: "inconclusive",
      last_autonomous_summary: "Needs human interpretation before approval."
    });
    expect(loaded.state.meta_review?.last_autonomous_rework_target_message).toBeNull();

    const transcript = await readTranscriptEnvelopes(
      bubble.paths.transcriptPath,
      { allowMissing: false }
    );
    const last = transcript.at(-1);
    expect(last?.type).toBe("APPROVAL_REQUEST");
    expect(last?.payload.metadata).toStrictEqual({
      actor: "meta-reviewer",
      actor_agent: "codex",
      delivery_target_role: "status",
      findings_advisory_open_total: null,
      findings_artifact_open_total: null,
      findings_artifact_status: null,
      findings_blocking_open_total: null,
      findings_claimed_open_total: 2,
      findings_digest_sha256: null,
      findings_parity_status: null,
      latest_recommendation: "inconclusive",
      meta_review_gate_route: "human_gate_inconclusive",
      meta_review_run_id: "run_meta_contract_submit_inconclusive_01"
    });
  });

  it("rejects rework submit when findings_artifact_ref is not a JSON artifact", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_contract_submit_rework_markdown_ref_01",
      task: "Contract: rework findings artifact must be json"
    });
    await writeMetaReviewRunningState({
      statePath: bubble.paths.statePath,
      activeAgent: "codex",
      activeRole: "meta_reviewer",
      nowIso: "2026-03-24T10:32:30.000Z"
    });

    const markdownDigest = createHash("sha256")
      .update("# Meta Review Report\n", "utf8")
      .digest("hex");

    await expect(
      submitMetaReviewResult(
        {
          bubbleId: bubble.bubbleId,
          repoPath,
          round: 1,
          recommendation: "rework",
          summary: "Blocking findings remain in this run.",
          rework_target_message: "Fix the blocking issues.",
          report_json: {
            findings_claim_state: "open_findings",
            findings_claim_source: "meta_review_artifact",
            findings_count: 1,
            findings_artifact_ref: "artifacts/meta-review-round-1.md",
            meta_review_run_id: "b_meta_contract_submit_rework_markdown_ref_01",
            findings_digest_sha256: markdownDigest,
            findings_artifact_status: "available"
          }
        },
        {
          randomUUID: () => "b_meta_contract_submit_rework_markdown_ref_01",
          readRuntimeSessionsRegistry: async () =>
            buildActiveMetaReviewerSession({
              bubbleId: bubble.bubbleId,
              repoPath,
              worktreePath: bubble.paths.worktreePath
            })
        }
      )
    ).rejects.toMatchObject({
      reasonCode: "META_REVIEW_SCHEMA_INVALID"
    });
  });

  it("accepts valid submit contract without restored runtime pane binding when execution_context is still current", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_contract_submit_restart_accept_01",
      task: "Contract: restart-recovered submit without pane binding"
    });
    await writeMetaReviewRunningState({
      statePath: bubble.paths.statePath,
      activeAgent: "codex",
      activeRole: "meta_reviewer",
      nowIso: "2026-03-24T10:33:00.000Z"
    });

    await expect(
      submitMetaReviewResult(
        {
          bubbleId: bubble.bubbleId,
          repoPath,
          round: 1,
          recommendation: "approve",
          summary: "Canonical submit remains allowed after restart recovery.",
          report_json: {
            findings_claim_state: "clean",
            findings_claim_source: "meta_review_artifact",
            findings_count: 0
          }
        },
        {
          readRuntimeSessionsRegistry: async () => ({})
        }
      )
    ).resolves.toMatchObject({
      status: "success",
      recommendation: "approve",
      gate_route: "human_gate_approve",
      lifecycle_state: "READY_FOR_HUMAN_APPROVAL"
    });
  });

  it("accepts valid submit contract when live ownership is absent in recovery state", async () => {
    const repoPath = await createTempRepo();
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: "b_meta_contract_submit_recovery_ownership_01",
      task: "Contract: recovery submit without live ownership"
    });

    const loaded = await readStateSnapshot(bubble.paths.statePath);
    await writeStateSnapshot(
      bubble.paths.statePath,
      {
        ...loaded.state,
        state: "RUNNING",
        round: loaded.state.round,
        active_agent: null,
        active_role: null,
        active_since: null,
        last_command_at: "2026-03-24T10:34:30.000Z",
        execution_context: metaReviewExecutionContextToRunningContext(
          buildMetaReviewExecutionContext({
            bubbleId: loaded.state.bubble_id,
            round: loaded.state.round,
            startedAt: "2026-03-24T10:34:00.000Z",
            watchdogTimeoutMinutes: 60 * 24 * 30,
            attempt: 1
          })
        ),
        meta_review: {
          ...loaded.state.meta_review!,
          execution_context: buildMetaReviewExecutionContext({
            bubbleId: loaded.state.bubble_id,
            round: loaded.state.round,
            startedAt: "2026-03-24T10:34:00.000Z",
            watchdogTimeoutMinutes: 60 * 24 * 30,
            attempt: 1
          }),
          runtime_delivery: {
            status: "failed",
            reason_code: "META_REVIEWER_PANE_EXITED",
            message: "meta-reviewer pane exited after durable kickoff",
            observed_at: "2026-03-24T10:34:10.000Z",
            observed_for_handoff_id:
              `meta_review:${loaded.state.bubble_id}:round:${loaded.state.round}:attempt:1`,
            observed_for_round: loaded.state.round
          },
          last_autonomous_run_id: "run_meta_contract_prev_recovery_01",
          last_autonomous_status: "error",
          last_autonomous_recommendation: "inconclusive",
          last_autonomous_summary: "Previous recovery snapshot.",
          last_autonomous_report_ref: "artifacts/meta-review-last.json",
          last_autonomous_rework_target_message: null,
          last_autonomous_updated_at: "2026-03-24T10:33:00.000Z"
        }
      },
      {
        expectedFingerprint: loaded.fingerprint,
        expectedState: "RUNNING"
      }
    );

    await expect(
      submitMetaReviewResult(
        {
          bubbleId: bubble.bubbleId,
          repoPath,
          round: loaded.state.round,
          recommendation: "approve",
          summary: "Canonical submit remains allowed in recovery state.",
          report_json: {
            findings_claim_state: "clean",
            findings_claim_source: "meta_review_artifact",
            findings_count: 0
          }
        },
        {
          readRuntimeSessionsRegistry: async () => ({})
        }
      )
    ).resolves.toMatchObject({
      status: "success",
      recommendation: "approve",
      gate_route: "human_gate_approve",
      lifecycle_state: "READY_FOR_HUMAN_APPROVAL"
    });
  });
});
