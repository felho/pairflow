import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { readStateSnapshot } from "../../../src/v11/infrastructure/state/stateStore.js";
import {
  emitConvergedFromWorkspaceCommandOrchestration
} from "../../../src/v11/application/converged/convergedCommandOrchestration.js";
import { emitPassFromWorkspace } from "../../../src/v11/application/pass/passCommandOrchestration.js";
import { submitMetaReviewResult } from "../../../src/v11/defaults/metaReview/metaReviewApi.js";
import { emitApprove } from "../../../src/v11/application/approval/approvalCommandApi.js";
import { commitBubble } from "../../../src/v11/application/commit/commitCommandApi.js";
import { buildCommitBubbleDependencies } from "../../helpers/commit.js";
import { setupRunningBubbleFixture } from "../../helpers/bubble.js";
import { initGitRepository } from "../../helpers/git.js";
import type { ContractCase, ContractCaseExpected } from "./schema.js";

export interface CommitContractSuccessOutput {
  status: "ok";
  reasonCode: "COMMITTED";
  stateSubset: {
    state: string;
  };
  envelopeType: string;
  stagedFiles: string[];
  hasCommitSha: boolean;
}

export interface CommitContractErrorOutput {
  status: "error";
  reasonCode: string | null;
  stateSubset: {
    state: string;
  };
}

export type CommitContractOutput =
  | CommitContractSuccessOutput
  | CommitContractErrorOutput;

export interface CommitContractRunResult {
  mode: ContractCase["mode"];
  v11?: CommitContractOutput;
}

type CommitContractScenario = "basic" | "staged_files_empty";
type CommitContractExtendedScenario =
  | CommitContractScenario
  | "state_not_approved"
  | "commit_result_invariant";

interface ParsedCommitCaseInput {
  message?: string;
  stageAll?: boolean;
  auto?: boolean;
  scenario: CommitContractExtendedScenario;
}

function buildCommitContractBubbleId(caseId: string): string {
  const suffix = createHash("sha1").update(caseId).digest("hex").slice(0, 12);
  return `b_contract_${suffix}`;
}

function parseCommitCaseInput(input: ContractCase["input"]): ParsedCommitCaseInput {
  const messageRaw = input.message;
  if (messageRaw !== undefined && typeof messageRaw !== "string") {
    throw new Error("commit contract input.message must be a string.");
  }
  const stageAllRaw = input.stageAll;
  if (stageAllRaw !== undefined && typeof stageAllRaw !== "boolean") {
    throw new Error("commit contract input.stageAll must be a boolean.");
  }
  const autoRaw = input.auto;
  if (autoRaw !== undefined && typeof autoRaw !== "boolean") {
    throw new Error("commit contract input.auto must be a boolean.");
  }
  const fixtureRaw = input.fixture;
  let scenario: CommitContractExtendedScenario = "basic";
  if (fixtureRaw !== undefined) {
    if (typeof fixtureRaw !== "object" || fixtureRaw === null) {
      throw new Error("commit contract input.fixture must be an object when provided.");
    }
    const scenarioRaw = (fixtureRaw as Record<string, unknown>).scenario;
    if (
      scenarioRaw !== undefined &&
      scenarioRaw !== "basic" &&
      scenarioRaw !== "staged_files_empty" &&
      scenarioRaw !== "state_not_approved" &&
      scenarioRaw !== "commit_result_invariant"
    ) {
      throw new Error(
        "commit contract input.fixture.scenario must be one of: basic, staged_files_empty, state_not_approved, commit_result_invariant."
      );
    }
    scenario = scenarioRaw ?? "basic";
  }
  const normalizedStageAll = stageAllRaw ?? autoRaw ?? true;
  if (scenario === "staged_files_empty" && normalizedStageAll) {
    throw new Error(
      "commit contract staged_files_empty scenario requires input.stageAll=false."
    );
  }
  return {
    ...(messageRaw !== undefined ? { message: messageRaw } : {}),
    ...(stageAllRaw !== undefined
      ? { stageAll: normalizedStageAll }
      : autoRaw === undefined
        ? { stageAll: normalizedStageAll }
        : {}),
    ...(autoRaw !== undefined ? { auto: autoRaw } : {}),
    scenario
  };
}

function normalizeCommitResult(
  result: Awaited<ReturnType<typeof commitBubbleV11WithDefaults>>
): CommitContractSuccessOutput {
  return {
    status: "ok",
    reasonCode: "COMMITTED",
    stateSubset: {
      state: result.state.state
    },
    envelopeType: result.envelope.type,
    stagedFiles: [...result.stagedFiles].sort(),
    hasCommitSha: result.commitSha.length > 6
  };
}

function normalizeCommitErrorResult(input: {
  error: unknown;
  state: string;
}): CommitContractErrorOutput {
  const message = input.error instanceof Error ? input.error.message : String(input.error);
  const reasonMatch = /^([A-Z0-9_]+):/u.exec(message.trim());
  let reasonCode: string | null = reasonMatch?.[1] ?? null;
  if (
    reasonCode === null &&
    message.includes("bubble commit can only be used while state is APPROVED_FOR_COMMIT")
  ) {
    reasonCode = "COMMIT_STATE_NOT_APPROVED";
  }
  return {
    status: "error",
    reasonCode,
    stateSubset: {
      state: input.state
    }
  };
}

function assertContractExpectedSubset(input: {
  output: CommitContractOutput;
  expected: ContractCaseExpected;
  label: string;
}): void {
  if (input.output.status !== input.expected.status) {
    throw new Error(
      `${input.label}: status mismatch (expected=${input.expected.status}, actual=${input.output.status})`
    );
  }
  if (
    input.expected.reasonCode !== undefined &&
    input.output.reasonCode !== input.expected.reasonCode
  ) {
    throw new Error(
      `${input.label}: reasonCode mismatch (expected=${input.expected.reasonCode}, actual=${input.output.reasonCode})`
    );
  }
  const expectedState = input.expected.stateSubset?.state;
  if (
    typeof expectedState === "string" &&
    input.output.stateSubset.state !== expectedState
  ) {
    throw new Error(
      `${input.label}: stateSubset.state mismatch (expected=${expectedState}, actual=${input.output.stateSubset.state})`
    );
  }
}

function assertCommitScenarioInvariant(input: {
  output: CommitContractOutput;
  scenario: CommitContractExtendedScenario;
  caseId: string;
}): void {
  if (input.scenario !== "commit_result_invariant") {
    return;
  }

  if (input.output.status !== "ok") {
    throw new Error(
      `commit contract case=${input.caseId}: commit_result_invariant requires success output.`
    );
  }
  if (input.output.envelopeType !== "COMMIT_RESULT") {
    throw new Error(
      `commit contract case=${input.caseId}: expected COMMIT_RESULT envelope for commit_result_invariant.`
    );
  }
  if (!input.output.hasCommitSha || input.output.stagedFiles.length < 1) {
    throw new Error(
      `commit contract case=${input.caseId}: expected commit sha and staged file list for commit_result_invariant.`
    );
  }
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
      tmuxSessionName: "pf_commit_contract_fixture",
      updatedAt: "2026-03-20T13:03:00.000Z",
      metaReviewerPane: {
        role: "meta-reviewer" as const,
        paneIndex: 3,
        active: true,
        updatedAt: "2026-03-20T13:03:00.000Z"
      }
    }
  };
}

async function setupApprovedBubble(repoPath: string, bubbleId: string) {
  const bubble = await setupRunningBubbleFixture({
    repoPath,
    bubbleId,
    task: "Commit contract parity fixture",
    reviewPolicy: {
      meta_review_consecutive_clean_runs_required: 1
    }
  });

  await emitPassFromWorkspace({
    summary: "Implementation pass 1",
    cwd: bubble.paths.worktreePath,
    now: new Date("2026-03-20T13:00:00.000Z")
  });
  await emitPassFromWorkspace({
    summary: "Review pass 1 clean",
    noFindings: true,
    cwd: bubble.paths.worktreePath,
    now: new Date("2026-03-20T13:01:00.000Z")
  });
  await emitPassFromWorkspace({
    summary: "Implementation pass 2",
    cwd: bubble.paths.worktreePath,
    now: new Date("2026-03-20T13:02:00.000Z")
  });
  const converged = await emitConvergedFromWorkspaceCommandOrchestration({
    summary: "Ready for approval",
    cwd: bubble.paths.worktreePath,
    now: new Date("2026-03-20T13:03:00.000Z")
  });
  await submitMetaReviewResult(
    {
      bubbleId: bubble.bubbleId,
      repoPath,
      round: converged.state.round,
      recommendation: "approve",
      summary: "No findings remain after this review.",
      report_json: {
        findings_claim_state: "clean",
        findings_claim_source: "meta_review_artifact",
        findings_count: 0
      }
    },
    {
      now: new Date("2026-03-20T13:03:30.000Z"),
      readRuntimeSessionsRegistry: async () => {
        await Promise.resolve();
        return buildActiveMetaReviewerSession({
          bubbleId: bubble.bubbleId,
          repoPath,
          worktreePath: bubble.paths.worktreePath
        });
      }
    }
  );
  await emitApprove({
    bubbleId: bubble.bubbleId,
    cwd: repoPath,
    now: new Date("2026-03-20T13:04:00.000Z")
  });

  return bubble;
}

function commitBubbleV11WithDefaults(
  input: Parameters<typeof commitBubble>[0]
): ReturnType<typeof commitBubble> {
  return commitBubble(input, buildCommitBubbleDependencies());
}

async function executeCommitCase(input: {
  caseDef: ContractCase;
  executor: typeof commitBubbleV11WithDefaults;
}): Promise<CommitContractOutput> {
  const repoPath = await mkdtemp(join(tmpdir(), "pairflow-commit-contract-"));
  try {
    await initGitRepository(repoPath);
    const parsedInput = parseCommitCaseInput(input.caseDef.input);
    const bubble = parsedInput.scenario === "state_not_approved"
      ? await setupRunningBubbleFixture({
          repoPath,
          bubbleId: buildCommitContractBubbleId(input.caseDef.id),
          task: "Commit contract state-not-approved fixture"
        })
      : await setupApprovedBubble(repoPath, buildCommitContractBubbleId(input.caseDef.id));

    if (parsedInput.scenario === "basic" || parsedInput.scenario === "commit_result_invariant") {
      await writeFile(
        join(bubble.paths.worktreePath, "feature-auto.txt"),
        `${input.caseDef.id}\n`,
        "utf8"
      );
    } else {
      await writeFile(
        join(bubble.paths.worktreePath, "unstaged-contract-fixture.txt"),
        "Unstaged fixture for empty staged-files contract case.\n",
        "utf8"
      );
    }

    let output: CommitContractOutput;
    try {
      const result = await input.executor({
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        ...(parsedInput.stageAll !== undefined
          ? { stageAll: parsedInput.stageAll }
          : {}),
        ...(parsedInput.auto !== undefined ? { auto: parsedInput.auto } : {}),
        ...(parsedInput.message !== undefined ? { message: parsedInput.message } : {}),
        now: new Date("2026-03-20T13:10:00.000Z")
      });
      output = normalizeCommitResult(result);
    } catch (error) {
      const stateSnapshot = await readStateSnapshot(bubble.paths.statePath);
      output = normalizeCommitErrorResult({
        error,
        state: stateSnapshot.state.state
      });
    }

    assertCommitScenarioInvariant({
      output,
      scenario: parsedInput.scenario,
      caseId: input.caseDef.id
    });
    return output;
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
}

export async function runCommitContractCase(
  caseDef: ContractCase
): Promise<CommitContractRunResult> {
  if (caseDef.command !== "commit") {
    throw new Error(`Unsupported command for commit contract runner: ${caseDef.command}`);
  }

  const v11 = await executeCommitCase({
    caseDef,
    executor: commitBubbleV11WithDefaults
  });
  assertContractExpectedSubset({
    output: v11,
    expected: caseDef.expected,
    label: "v11"
  });
  return {
    mode: caseDef.mode,
    v11
  };
}
