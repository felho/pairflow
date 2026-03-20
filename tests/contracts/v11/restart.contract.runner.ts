import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { restartBubble } from "../../../src/core/bubble/restartBubble.js";
import type { StartBubbleResult } from "../../../src/core/bubble/startBubble.js";
import { restartBubbleV11 } from "../../../src/v11/application/restart/emitRestartV11.js";
import { setupRunningBubbleFixture } from "../../helpers/bubble.js";
import { initGitRepository } from "../../helpers/git.js";
import type { ContractCase, ContractCaseExpected } from "./schema.js";

export interface RestartContractOutput {
  status: "ok";
  reasonCode: "RESTARTED";
  stateSubset: {
    state: string;
  };
  previousTmuxSessionExisted: boolean;
  previousRuntimeSessionRemoved: boolean;
  tmuxSessionNamePrefix: boolean;
  hasWorktreePath: boolean;
}

export interface RestartContractRunResult {
  mode: ContractCase["mode"];
  legacy?: RestartContractOutput;
  v11?: RestartContractOutput;
}

interface ParsedRestartCaseInput {
  previousTmuxSessionExisted: boolean;
  previousRuntimeSessionRemoved: boolean;
}

function parseRestartCaseInput(input: ContractCase["input"]): ParsedRestartCaseInput {
  const previousTmuxSessionExistedRaw = input.previousTmuxSessionExisted;
  if (
    previousTmuxSessionExistedRaw !== undefined &&
    typeof previousTmuxSessionExistedRaw !== "boolean"
  ) {
    throw new Error(
      "restart contract input.previousTmuxSessionExisted must be a boolean."
    );
  }

  const previousRuntimeSessionRemovedRaw = input.previousRuntimeSessionRemoved;
  if (
    previousRuntimeSessionRemovedRaw !== undefined &&
    typeof previousRuntimeSessionRemovedRaw !== "boolean"
  ) {
    throw new Error(
      "restart contract input.previousRuntimeSessionRemoved must be a boolean."
    );
  }

  return {
    previousTmuxSessionExisted: previousTmuxSessionExistedRaw ?? false,
    previousRuntimeSessionRemoved: previousRuntimeSessionRemovedRaw ?? false
  };
}

function normalizeRestartResult(
  result: Awaited<ReturnType<typeof restartBubble>>
): RestartContractOutput {
  return {
    status: "ok",
    reasonCode: "RESTARTED",
    stateSubset: {
      state: result.state.state
    },
    previousTmuxSessionExisted: result.previousTmuxSessionExisted,
    previousRuntimeSessionRemoved: result.previousRuntimeSessionRemoved,
    tmuxSessionNamePrefix: result.tmuxSessionName.startsWith("pf-"),
    hasWorktreePath: result.worktreePath.length > 0
  };
}

function assertContractExpectedSubset(input: {
  output: RestartContractOutput;
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
  legacy: RestartContractOutput;
  v11: RestartContractOutput;
  caseId: string;
}): void {
  if (JSON.stringify(input.legacy) !== JSON.stringify(input.v11)) {
    throw new Error(
      `restart parity mismatch for case=${input.caseId}: legacy=${JSON.stringify(input.legacy)} v11=${JSON.stringify(input.v11)}`
    );
  }
}

async function executeRestartCase(input: {
  caseDef: ContractCase;
  executor: typeof restartBubble;
}): Promise<RestartContractOutput> {
  const repoPath = await mkdtemp(join(tmpdir(), "pairflow-restart-contract-"));
  try {
    await initGitRepository(repoPath);
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: `b_contract_${input.caseDef.id}`,
      task: input.caseDef.description
    });
    const parsedInput = parseRestartCaseInput(input.caseDef.input);

    const result = await input.executor(
      {
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        now: new Date("2026-03-20T11:00:00.000Z")
      },
      {
        terminateBubbleTmuxSession: () =>
          Promise.resolve({
            sessionName: `pf-${bubble.bubbleId}`,
            existed: parsedInput.previousTmuxSessionExisted
          }),
        removeRuntimeSession: () =>
          Promise.resolve(parsedInput.previousRuntimeSessionRemoved),
        startBubble: () =>
          Promise.resolve({
            bubbleId: bubble.bubbleId,
            state: { state: "RUNNING" },
            tmuxSessionName: `pf-${bubble.bubbleId}`,
            worktreePath: bubble.paths.worktreePath
          } as unknown as StartBubbleResult)
      }
    );

    return normalizeRestartResult(result);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
}

export async function runRestartContractCase(
  caseDef: ContractCase
): Promise<RestartContractRunResult> {
  if (caseDef.command !== "restart") {
    throw new Error(
      `Unsupported command for restart contract runner: ${caseDef.command}`
    );
  }

  if (caseDef.mode === "legacy") {
    const legacy = await executeRestartCase({
      caseDef,
      executor: restartBubble
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
    const v11 = await executeRestartCase({
      caseDef,
      executor: restartBubbleV11
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

  const legacy = await executeRestartCase({
    caseDef,
    executor: restartBubble
  });
  const v11 = await executeRestartCase({
    caseDef,
    executor: restartBubbleV11
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
