import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { runBubbleWatchdog } from "../../../src/core/bubble/watchdogBubble.js";
import { runBubbleWatchdogV11 } from "../../../src/v11/application/watchdog/emitWatchdogV11.js";
import { setupRunningBubbleFixture } from "../../helpers/bubble.js";
import { initGitRepository } from "../../helpers/git.js";
import { applyStateTransition } from "../../../src/core/state/machine.js";
import {
  readStateSnapshot,
  writeStateSnapshot
} from "../../../src/core/state/stateStore.js";
import type { ContractCase, ContractCaseExpected } from "./schema.js";

export interface WatchdogContractOutput {
  status: "ok";
  reasonCode: "WATCHDOG_EVALUATED";
  escalated: boolean;
  reason: string;
  stateSubset: {
    state: string;
  };
  hasEnvelope: boolean;
}

export interface WatchdogContractRunResult {
  mode: ContractCase["mode"];
  legacy?: WatchdogContractOutput;
  v11?: WatchdogContractOutput;
}

function normalizeWatchdogResult(
  result: Awaited<ReturnType<typeof runBubbleWatchdog>>
): WatchdogContractOutput {
  return {
    status: "ok",
    reasonCode: "WATCHDOG_EVALUATED",
    escalated: result.escalated,
    reason: result.reason,
    stateSubset: {
      state: result.state.state
    },
    hasEnvelope: result.envelope !== undefined
  };
}

function assertContractExpectedSubset(input: {
  output: WatchdogContractOutput;
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
  legacy: WatchdogContractOutput;
  v11: WatchdogContractOutput;
  caseId: string;
}): void {
  if (JSON.stringify(input.legacy) !== JSON.stringify(input.v11)) {
    throw new Error(
      `watchdog parity mismatch for case=${input.caseId}: legacy=${JSON.stringify(input.legacy)} v11=${JSON.stringify(input.v11)}`
    );
  }
}

async function seedWaitingHumanState(input: {
  repoPath: string;
  bubbleId: string;
}) {
  const bubble = await setupRunningBubbleFixture({
    repoPath: input.repoPath,
    bubbleId: input.bubbleId,
    task: "Watchdog contract parity fixture"
  });
  const loaded = await readStateSnapshot(bubble.paths.statePath);
  const transitioned = applyStateTransition(loaded.state, {
    to: "WAITING_HUMAN",
    lastCommandAt: "2026-03-20T12:40:00.000Z"
  });
  await writeStateSnapshot(bubble.paths.statePath, transitioned, {
    expectedFingerprint: loaded.fingerprint,
    expectedState: "RUNNING"
  });
  return bubble;
}

async function executeWatchdogCase(input: {
  caseDef: ContractCase;
  executor: typeof runBubbleWatchdog;
}): Promise<WatchdogContractOutput> {
  const repoPath = await mkdtemp(join(tmpdir(), "pairflow-watchdog-contract-"));
  try {
    await initGitRepository(repoPath);
    const bubble = await seedWaitingHumanState({
      repoPath,
      bubbleId: `b_contract_${input.caseDef.id}`
    });

    const result = await input.executor({
      bubbleId: bubble.bubbleId,
      cwd: repoPath,
      now: new Date("2026-03-20T12:45:00.000Z")
    });
    return normalizeWatchdogResult(result);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
}

export async function runWatchdogContractCase(
  caseDef: ContractCase
): Promise<WatchdogContractRunResult> {
  if (caseDef.command !== "watchdog") {
    throw new Error(
      `Unsupported command for watchdog contract runner: ${caseDef.command}`
    );
  }

  if (caseDef.mode === "legacy") {
    const legacy = await executeWatchdogCase({
      caseDef,
      executor: runBubbleWatchdog
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
    const v11 = await executeWatchdogCase({
      caseDef,
      executor: runBubbleWatchdogV11
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

  const legacy = await executeWatchdogCase({
    caseDef,
    executor: runBubbleWatchdog
  });
  const v11 = await executeWatchdogCase({
    caseDef,
    executor: runBubbleWatchdogV11
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
