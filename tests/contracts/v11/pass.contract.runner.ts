import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  emitPassFromWorkspace,
  type EmitPassInput,
  type EmitPassResult
} from "../../../src/core/agent/pass.js";
import { emitPassFromWorkspaceV11 } from "../../../src/v11/application/pass/emitPassV11.js";
import { isPassIntent, type PassIntent } from "../../../src/types/protocol.js";
import { setupRunningBubbleFixture } from "../../helpers/bubble.js";
import { initGitRepository } from "../../helpers/git.js";
import type { ContractCase, ContractCaseExpected } from "./schema.js";

export interface PassContractOutput {
  status: "ok";
  reasonCode: "PASS_ACCEPTED" | "PASS_AUTO_CONVERGED";
  envelopeType: string;
  stateSubset: {
    state: string;
  };
}

export interface PassContractRunResult {
  mode: ContractCase["mode"];
  legacy?: PassContractOutput;
  v11?: PassContractOutput;
}

function parsePassCaseInput(input: ContractCase["input"]): Omit<EmitPassInput, "cwd"> {
  const summaryRaw = input.summary;
  if (typeof summaryRaw !== "string" || summaryRaw.trim().length === 0) {
    throw new Error("PASS contract input.summary must be a non-empty string.");
  }

  const refsRaw = input.refs;
  if (!Array.isArray(refsRaw) || !refsRaw.every((value) => typeof value === "string")) {
    throw new Error("PASS contract input.refs must be a string array.");
  }

  const intentRaw = input.intent;
  let intent: PassIntent | undefined;
  if (intentRaw !== undefined) {
    if (!isPassIntent(intentRaw)) {
      throw new Error(
        "PASS contract input.intent must be one of: task, review, fix_request."
      );
    }
    intent = intentRaw;
  }

  return {
    summary: summaryRaw.trim(),
    refs: refsRaw,
    ...(intent !== undefined ? { intent } : {})
  };
}

function normalizePassResult(result: EmitPassResult): PassContractOutput {
  return {
    status: "ok",
    reasonCode:
      result.transitionDecision === "auto_converge"
        ? "PASS_AUTO_CONVERGED"
        : "PASS_ACCEPTED",
    envelopeType: result.envelope.type,
    stateSubset: {
      state: result.state.state
    }
  };
}

function assertContractExpectedSubset(input: {
  output: PassContractOutput;
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
  legacy: PassContractOutput;
  v11: PassContractOutput;
  caseId: string;
}): void {
  if (JSON.stringify(input.legacy) !== JSON.stringify(input.v11)) {
    throw new Error(
      `PASS parity mismatch for case=${input.caseId}: legacy=${JSON.stringify(input.legacy)} v11=${JSON.stringify(input.v11)}`
    );
  }
}

async function executePassCase(input: {
  caseDef: ContractCase;
  executor: (passInput: EmitPassInput) => Promise<EmitPassResult>;
}): Promise<PassContractOutput> {
  const repoPath = await mkdtemp(join(tmpdir(), "pairflow-pass-contract-"));
  try {
    await initGitRepository(repoPath);
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: `b_contract_${input.caseDef.id}`,
      task: input.caseDef.description
    });
    const passInput = parsePassCaseInput(input.caseDef.input);
    const result = await input.executor({
      ...passInput,
      cwd: bubble.paths.worktreePath
    });
    return normalizePassResult(result);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
}

export async function runPassContractCase(
  caseDef: ContractCase
): Promise<PassContractRunResult> {
  if (caseDef.command !== "pass") {
    throw new Error(`Unsupported command for PASS contract runner: ${caseDef.command}`);
  }

  if (caseDef.mode === "legacy") {
    const legacy = await executePassCase({
      caseDef,
      executor: emitPassFromWorkspace
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
    const v11 = await executePassCase({
      caseDef,
      executor: emitPassFromWorkspaceV11
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

  const legacy = await executePassCase({
    caseDef,
    executor: emitPassFromWorkspace
  });
  const v11 = await executePassCase({
    caseDef,
    executor: emitPassFromWorkspaceV11
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
