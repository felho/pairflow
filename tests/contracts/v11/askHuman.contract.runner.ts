import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  emitAskHumanFromWorkspace,
  type EmitAskHumanInput,
  type EmitAskHumanResult
} from "../../../src/core/agent/askHuman.js";
import { emitAskHumanFromWorkspaceV11 } from "../../../src/v11/application/askHuman/emitAskHumanV11.js";
import { setupRunningBubbleFixture } from "../../helpers/bubble.js";
import { initGitRepository } from "../../helpers/git.js";
import type { ContractCase, ContractCaseExpected } from "./schema.js";

export interface AskHumanContractOutput {
  status: "ok";
  reasonCode: "ASK_HUMAN_EMITTED";
  envelopeType: string;
  stateSubset: {
    state: string;
  };
}

export interface AskHumanContractRunResult {
  mode: ContractCase["mode"];
  legacy?: AskHumanContractOutput;
  v11?: AskHumanContractOutput;
}

function parseAskHumanCaseInput(
  input: ContractCase["input"]
): Omit<EmitAskHumanInput, "cwd"> {
  const questionRaw = input.question;
  if (typeof questionRaw !== "string" || questionRaw.trim().length === 0) {
    throw new Error("askHuman contract input.question must be a non-empty string.");
  }

  const refsRaw = input.refs;
  if (!Array.isArray(refsRaw) || !refsRaw.every((value) => typeof value === "string")) {
    throw new Error("askHuman contract input.refs must be a string array.");
  }

  return {
    question: questionRaw.trim(),
    refs: refsRaw
  };
}

function normalizeAskHumanResult(
  result: EmitAskHumanResult
): AskHumanContractOutput {
  return {
    status: "ok",
    reasonCode: "ASK_HUMAN_EMITTED",
    envelopeType: result.envelope.type,
    stateSubset: {
      state: result.state.state
    }
  };
}

function assertContractExpectedSubset(input: {
  output: AskHumanContractOutput;
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
  if (
    input.expected.envelopeType !== undefined &&
    input.output.envelopeType !== input.expected.envelopeType
  ) {
    throw new Error(
      `${input.label}: envelopeType mismatch (expected=${input.expected.envelopeType}, actual=${input.output.envelopeType})`
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
  legacy: AskHumanContractOutput;
  v11: AskHumanContractOutput;
  caseId: string;
}): void {
  if (JSON.stringify(input.legacy) !== JSON.stringify(input.v11)) {
    throw new Error(
      `askHuman parity mismatch for case=${input.caseId}: legacy=${JSON.stringify(input.legacy)} v11=${JSON.stringify(input.v11)}`
    );
  }
}

async function executeAskHumanCase(input: {
  caseDef: ContractCase;
  executor: (askHumanInput: EmitAskHumanInput) => Promise<EmitAskHumanResult>;
}): Promise<AskHumanContractOutput> {
  const repoPath = await mkdtemp(join(tmpdir(), "pairflow-ask-human-contract-"));
  try {
    await initGitRepository(repoPath);
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: `b_contract_${input.caseDef.id}`,
      task: input.caseDef.description
    });
    const askHumanInput = parseAskHumanCaseInput(input.caseDef.input);
    const result = await input.executor({
      ...askHumanInput,
      cwd: bubble.paths.worktreePath
    });
    return normalizeAskHumanResult(result);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
}

export async function runAskHumanContractCase(
  caseDef: ContractCase
): Promise<AskHumanContractRunResult> {
  if (caseDef.command !== "askHuman") {
    throw new Error(
      `Unsupported command for askHuman contract runner: ${caseDef.command}`
    );
  }

  if (caseDef.mode === "legacy") {
    const legacy = await executeAskHumanCase({
      caseDef,
      executor: emitAskHumanFromWorkspace
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
    const v11 = await executeAskHumanCase({
      caseDef,
      executor: emitAskHumanFromWorkspaceV11
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

  const legacy = await executeAskHumanCase({
    caseDef,
    executor: emitAskHumanFromWorkspace
  });
  const v11 = await executeAskHumanCase({
    caseDef,
    executor: emitAskHumanFromWorkspaceV11
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
