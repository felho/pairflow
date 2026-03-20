import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createBubble } from "../../../src/core/bubble/createBubble.js";
import { startBubble } from "../../../src/core/bubble/startBubble.js";
import { startBubbleV11 } from "../../../src/v11/application/start/emitStartV11.js";
import { initGitRepository } from "../../helpers/git.js";
import type { ContractCase, ContractCaseExpected } from "./schema.js";

export interface StartContractOutput {
  status: "ok";
  reasonCode: "STARTED";
  stateSubset: {
    state: string;
  };
  round: number;
  activeAgent: string | null;
  activeRole: string | null;
  tmuxSessionNamePrefix: boolean;
  hasWorktreePath: boolean;
}

export interface StartContractRunResult {
  mode: ContractCase["mode"];
  legacy?: StartContractOutput;
  v11?: StartContractOutput;
}

function normalizeStartResult(
  result: Awaited<ReturnType<typeof startBubble>>
): StartContractOutput {
  return {
    status: "ok",
    reasonCode: "STARTED",
    stateSubset: {
      state: result.state.state
    },
    round: result.state.round,
    activeAgent: result.state.active_agent,
    activeRole: result.state.active_role,
    tmuxSessionNamePrefix: result.tmuxSessionName.startsWith("pf-"),
    hasWorktreePath: result.worktreePath.length > 0
  };
}

function assertContractExpectedSubset(input: {
  output: StartContractOutput;
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
  legacy: StartContractOutput;
  v11: StartContractOutput;
  caseId: string;
}): void {
  if (JSON.stringify(input.legacy) !== JSON.stringify(input.v11)) {
    throw new Error(
      `start parity mismatch for case=${input.caseId}: legacy=${JSON.stringify(input.legacy)} v11=${JSON.stringify(input.v11)}`
    );
  }
}

async function executeStartCase(input: {
  caseDef: ContractCase;
  executor: typeof startBubble;
}): Promise<StartContractOutput> {
  const repoPath = await mkdtemp(join(tmpdir(), "pairflow-start-contract-"));
  try {
    await initGitRepository(repoPath);
    const bubble = await createBubble({
      id: `b_contract_${input.caseDef.id}`,
      repoPath,
      baseBranch: "main",
      reviewArtifactType: "code",
      task: input.caseDef.description,
      cwd: repoPath
    });

    const result = await input.executor(
      {
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        now: new Date("2026-03-20T12:00:00.000Z")
      },
      {
        bootstrapWorktreeWorkspace: () =>
          Promise.resolve({
            repoPath,
            baseRef: "refs/heads/main",
            bubbleBranch: bubble.config.bubble_branch,
            worktreePath: bubble.paths.worktreePath
          }),
        launchBubbleTmuxSession: () =>
          Promise.resolve({
            sessionName: `pf-${bubble.bubbleId}`
          }),
        claimRuntimeSession: () =>
          Promise.resolve({
            claimed: true,
            record: {
              bubbleId: bubble.bubbleId,
              repoPath,
              worktreePath: bubble.paths.worktreePath,
              tmuxSessionName: `pf-${bubble.bubbleId}`,
              updatedAt: "2026-03-20T12:00:00.000Z"
            }
          })
      }
    );

    return normalizeStartResult(result);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
}

export async function runStartContractCase(
  caseDef: ContractCase
): Promise<StartContractRunResult> {
  if (caseDef.command !== "start") {
    throw new Error(`Unsupported command for start contract runner: ${caseDef.command}`);
  }

  if (caseDef.mode === "legacy") {
    const legacy = await executeStartCase({
      caseDef,
      executor: startBubble
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
    const v11 = await executeStartCase({
      caseDef,
      executor: startBubbleV11
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

  const legacy = await executeStartCase({
    caseDef,
    executor: startBubble
  });
  const v11 = await executeStartCase({
    caseDef,
    executor: startBubbleV11
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
