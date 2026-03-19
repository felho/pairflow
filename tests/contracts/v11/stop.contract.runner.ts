import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  stopBubble,
  type StopBubbleDependencies,
  type StopBubbleInput,
  type StopBubbleResult
} from "../../../src/core/bubble/stopBubble.js";
import { stopBubbleV11 } from "../../../src/v11/application/stop/emitStopV11.js";
import { setupRunningBubbleFixture } from "../../helpers/bubble.js";
import { initGitRepository } from "../../helpers/git.js";
import type { ContractCase, ContractCaseExpected } from "./schema.js";

export interface StopContractOutput {
  status: "ok";
  reasonCode: "STOPPED";
  stateSubset: {
    state: string;
  };
  tmuxSessionExisted: boolean;
  runtimeSessionRemoved: boolean;
}

export interface StopContractRunResult {
  mode: ContractCase["mode"];
  legacy?: StopContractOutput;
  v11?: StopContractOutput;
}

interface ParsedStopCaseInput {
  tmuxSessionExisted: boolean;
  runtimeSessionRemoved: boolean;
}

function parseStopCaseInput(input: ContractCase["input"]): ParsedStopCaseInput {
  const tmuxSessionExistedRaw = input.tmuxSessionExisted;
  if (
    tmuxSessionExistedRaw !== undefined &&
    typeof tmuxSessionExistedRaw !== "boolean"
  ) {
    throw new Error("stop contract input.tmuxSessionExisted must be a boolean.");
  }

  const runtimeSessionRemovedRaw = input.runtimeSessionRemoved;
  if (
    runtimeSessionRemovedRaw !== undefined &&
    typeof runtimeSessionRemovedRaw !== "boolean"
  ) {
    throw new Error("stop contract input.runtimeSessionRemoved must be a boolean.");
  }

  return {
    tmuxSessionExisted: tmuxSessionExistedRaw ?? true,
    runtimeSessionRemoved: runtimeSessionRemovedRaw ?? true
  };
}

function normalizeStopResult(result: StopBubbleResult): StopContractOutput {
  return {
    status: "ok",
    reasonCode: "STOPPED",
    stateSubset: {
      state: result.state.state
    },
    tmuxSessionExisted: result.tmuxSessionExisted,
    runtimeSessionRemoved: result.runtimeSessionRemoved
  };
}

function assertContractExpectedSubset(input: {
  output: StopContractOutput;
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
  legacy: StopContractOutput;
  v11: StopContractOutput;
  caseId: string;
}): void {
  if (JSON.stringify(input.legacy) !== JSON.stringify(input.v11)) {
    throw new Error(
      `stop parity mismatch for case=${input.caseId}: legacy=${JSON.stringify(input.legacy)} v11=${JSON.stringify(input.v11)}`
    );
  }
}

async function executeStopCase(input: {
  caseDef: ContractCase;
  executor: (
    stopInput: StopBubbleInput,
    dependencies?: StopBubbleDependencies
  ) => Promise<StopBubbleResult>;
}): Promise<StopContractOutput> {
  const repoPath = await mkdtemp(join(tmpdir(), "pairflow-stop-contract-"));
  try {
    await initGitRepository(repoPath);
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: `b_contract_${input.caseDef.id}`,
      task: input.caseDef.description
    });

    const parsedInput = parseStopCaseInput(input.caseDef.input);
    const result = await input.executor(
      {
        bubbleId: bubble.bubbleId,
        repoPath,
        now: new Date("2026-03-19T23:00:00.000Z")
      },
      {
        terminateBubbleTmuxSession: () =>
          Promise.resolve({
            sessionName: `pf-${bubble.bubbleId}`,
            existed: parsedInput.tmuxSessionExisted
          }),
        removeRuntimeSession: () => Promise.resolve(parsedInput.runtimeSessionRemoved)
      }
    );

    return normalizeStopResult(result);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
}

export async function runStopContractCase(
  caseDef: ContractCase
): Promise<StopContractRunResult> {
  if (caseDef.command !== "stop") {
    throw new Error(`Unsupported command for stop contract runner: ${caseDef.command}`);
  }

  if (caseDef.mode === "legacy") {
    const legacy = await executeStopCase({
      caseDef,
      executor: stopBubble
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
    const v11 = await executeStopCase({
      caseDef,
      executor: stopBubbleV11
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

  const legacy = await executeStopCase({
    caseDef,
    executor: stopBubble
  });
  const v11 = await executeStopCase({
    caseDef,
    executor: stopBubbleV11
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
