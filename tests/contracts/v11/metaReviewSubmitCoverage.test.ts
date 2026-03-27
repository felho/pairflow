import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { parseBubbleMetaReviewCommandOptions } from "../../../src/cli/commands/bubble/metaReview.js";
import { MetaReviewError, submitMetaReviewResult } from "../../../src/core/bubble/metaReview.js";
import { readStateSnapshot, writeStateSnapshot } from "../../../src/core/state/stateStore.js";
import { parseRequiredSubmitReportJson } from "../../../src/v11/application/metaReview/metaReviewCliOptionValueReader.js";
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
      state: "META_REVIEW_RUNNING",
      round: input.round ?? loaded.state.round,
      active_agent: input.activeAgent,
      active_role: input.activeRole,
      active_since: input.nowIso,
      last_command_at: input.nowIso
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
    expect(thrown.reasonCode).toBe("META_REVIEW_SCHEMA_INVALID");
    expect(thrown.message).toContain("Missing required option: --report-json");
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
    expect(thrown.reasonCode).toBe("META_REVIEW_SCHEMA_INVALID");
    expect(thrown.message).toContain("Must be a JSON object");
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
      recommendation: "approve"
    });
  });
});
