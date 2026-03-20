import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { emitConvergedFromWorkspace } from "../../../src/core/agent/converged.js";
import { emitPassFromWorkspace } from "../../../src/core/agent/pass.js";
import { commitBubble } from "../../../src/core/bubble/commitBubble.js";
import { emitApprove } from "../../../src/core/human/approval.js";
import { readStateSnapshot } from "../../../src/core/state/stateStore.js";
import { commitBubbleV11 } from "../../../src/v11/application/commit/emitCommitV11.js";
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
  donePackageSuffix: boolean;
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
  legacy?: CommitContractOutput;
  v11?: CommitContractOutput;
}

type CommitContractScenario = "basic" | "staged_files_empty";
type CommitContractExtendedScenario =
  | CommitContractScenario
  | "state_not_approved"
  | "done_package_invariant";

interface ParsedCommitCaseInput {
  auto: boolean;
  scenario: CommitContractExtendedScenario;
}

function buildCommitContractBubbleId(caseId: string): string {
  const suffix = createHash("sha1").update(caseId).digest("hex").slice(0, 12);
  return `b_contract_${suffix}`;
}

function parseCommitCaseInput(input: ContractCase["input"]): ParsedCommitCaseInput {
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
      scenarioRaw !== "done_package_invariant"
    ) {
      throw new Error(
        "commit contract input.fixture.scenario must be one of: basic, staged_files_empty, state_not_approved, done_package_invariant."
      );
    }
    scenario = scenarioRaw ?? "basic";
  }
  const auto = autoRaw ?? true;
  if (scenario === "staged_files_empty" && auto) {
    throw new Error(
      "commit contract staged_files_empty scenario requires input.auto=false."
    );
  }
  return {
    auto,
    scenario
  };
}

function normalizeCommitResult(
  result: Awaited<ReturnType<typeof commitBubble>>
): CommitContractSuccessOutput {
  return {
    status: "ok",
    reasonCode: "COMMITTED",
    stateSubset: {
      state: result.state.state
    },
    envelopeType: result.envelope.type,
    stagedFiles: [...result.stagedFiles].sort(),
    hasCommitSha: result.commitSha.length > 6,
    donePackageSuffix: result.donePackagePath.endsWith("/artifacts/done-package.md")
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

function assertParityEquivalent(input: {
  legacy: CommitContractOutput;
  v11: CommitContractOutput;
  caseId: string;
}): void {
  if (JSON.stringify(input.legacy) !== JSON.stringify(input.v11)) {
    throw new Error(
      `commit parity mismatch for case=${input.caseId}: legacy=${JSON.stringify(input.legacy)} v11=${JSON.stringify(input.v11)}`
    );
  }
}

function assertCommitScenarioInvariant(input: {
  output: CommitContractOutput;
  scenario: CommitContractExtendedScenario;
  caseId: string;
}): void {
  if (input.scenario !== "done_package_invariant") {
    return;
  }

  if (input.output.status !== "ok") {
    throw new Error(
      `commit contract case=${input.caseId}: done_package_invariant requires success output.`
    );
  }
  if (!input.output.donePackageSuffix) {
    throw new Error(
      `commit contract case=${input.caseId}: expected done-package artifact path suffix for done_package_invariant.`
    );
  }
  if (!input.output.hasCommitSha || input.output.stagedFiles.length < 1) {
    throw new Error(
      `commit contract case=${input.caseId}: expected commit sha and staged file list for done_package_invariant.`
    );
  }
}

async function setupApprovedBubble(repoPath: string, bubbleId: string) {
  const bubble = await setupRunningBubbleFixture({
    repoPath,
    bubbleId,
    task: "Commit contract parity fixture"
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
  await emitConvergedFromWorkspace({
    summary: "Ready for approval",
    cwd: bubble.paths.worktreePath,
    now: new Date("2026-03-20T13:03:00.000Z")
  });
  await emitApprove({
    bubbleId: bubble.bubbleId,
    overrideNonApprove: true,
    overrideReason: "Human override for commit contract fixture setup.",
    cwd: repoPath,
    now: new Date("2026-03-20T13:04:00.000Z")
  });

  return bubble;
}

async function executeCommitCase(input: {
  caseDef: ContractCase;
  executor: typeof commitBubble;
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

    if (parsedInput.scenario === "basic" || parsedInput.scenario === "done_package_invariant") {
      await writeFile(
        join(bubble.paths.worktreePath, "feature-auto.txt"),
        `${input.caseDef.id}\n`,
        "utf8"
      );
    } else {
      await writeFile(
        join(bubble.paths.artifactsDir, "done-package.md"),
        "Seed done package for empty staged-files contract case.\n",
        "utf8"
      );
    }

    let output: CommitContractOutput;
    try {
      const result = await input.executor({
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        auto: parsedInput.auto,
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

  if (caseDef.mode === "legacy") {
    const legacy = await executeCommitCase({
      caseDef,
      executor: commitBubble
    });
    assertContractExpectedSubset({
      output: legacy,
      expected: caseDef.expected,
      label: "legacy"
    });
    return {
      mode: caseDef.mode,
      legacy
    };
  }

  if (caseDef.mode === "v11") {
    const v11 = await executeCommitCase({
      caseDef,
      executor: commitBubbleV11
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

  const legacy = await executeCommitCase({
    caseDef,
    executor: commitBubble
  });
  const v11 = await executeCommitCase({
    caseDef,
    executor: commitBubbleV11
  });
  assertContractExpectedSubset({
    output: legacy,
    expected: caseDef.expected,
    label: "parity/legacy"
  });
  assertContractExpectedSubset({
    output: v11,
    expected: caseDef.expected,
    label: "parity/v11"
  });
  assertParityEquivalent({
    legacy,
    v11,
    caseId: caseDef.id
  });
  return {
    mode: caseDef.mode,
    legacy,
    v11
  };
}
