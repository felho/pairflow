import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { emitConvergedFromWorkspace } from "../../../src/core/agent/converged.js";
import { emitPassFromWorkspace } from "../../../src/core/agent/pass.js";
import { commitBubble } from "../../../src/core/bubble/commitBubble.js";
import { emitApprove } from "../../../src/core/human/approval.js";
import { commitBubbleV11 } from "../../../src/v11/application/commit/emitCommitV11.js";
import { setupRunningBubbleFixture } from "../../helpers/bubble.js";
import { initGitRepository } from "../../helpers/git.js";
import type { ContractCase, ContractCaseExpected } from "./schema.js";

export interface CommitContractOutput {
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

export interface CommitContractRunResult {
  mode: ContractCase["mode"];
  legacy?: CommitContractOutput;
  v11?: CommitContractOutput;
}

interface ParsedCommitCaseInput {
  auto: boolean;
}

function parseCommitCaseInput(input: ContractCase["input"]): ParsedCommitCaseInput {
  const autoRaw = input.auto;
  if (autoRaw !== undefined && typeof autoRaw !== "boolean") {
    throw new Error("commit contract input.auto must be a boolean.");
  }
  return {
    auto: autoRaw ?? true
  };
}

function normalizeCommitResult(
  result: Awaited<ReturnType<typeof commitBubble>>
): CommitContractOutput {
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
    const bubble = await setupApprovedBubble(repoPath, `b_contract_${input.caseDef.id}`);
    const parsedInput = parseCommitCaseInput(input.caseDef.input);

    await writeFile(
      join(bubble.paths.worktreePath, "feature-auto.txt"),
      `${input.caseDef.id}\n`,
      "utf8"
    );

    const result = await input.executor({
      bubbleId: bubble.bubbleId,
      cwd: repoPath,
      auto: parsedInput.auto,
      now: new Date("2026-03-20T13:10:00.000Z")
    });
    return normalizeCommitResult(result);
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
