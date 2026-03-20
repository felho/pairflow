import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { resumeBubble } from "../../../src/core/bubble/resumeBubble.js";
import { resumeBubbleV11 } from "../../../src/v11/application/resume/emitResumeV11.js";
import { setupRunningBubbleFixture } from "../../helpers/bubble.js";
import { initGitRepository } from "../../helpers/git.js";
import { applyStateTransition } from "../../../src/core/state/machine.js";
import {
  readStateSnapshot,
  writeStateSnapshot
} from "../../../src/core/state/stateStore.js";
import type { ContractCase, ContractCaseExpected } from "./schema.js";

export interface ResumeContractOutput {
  status: "ok";
  reasonCode: "RESUMED";
  envelopeType: string;
  hasMessage: boolean;
  stateSubset: {
    state: string;
  };
  round: number;
  activeRole: string | null;
}

export interface ResumeContractRunResult {
  mode: ContractCase["mode"];
  legacy?: ResumeContractOutput;
  v11?: ResumeContractOutput;
}

function normalizeResumeResult(
  result: Awaited<ReturnType<typeof resumeBubble>>
): ResumeContractOutput {
  return {
    status: "ok",
    reasonCode: "RESUMED",
    envelopeType: result.envelope.type,
    hasMessage: typeof result.envelope.payload.message === "string",
    stateSubset: {
      state: result.state.state
    },
    round: result.state.round,
    activeRole: result.state.active_role
  };
}

function assertContractExpectedSubset(input: {
  output: ResumeContractOutput;
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
  legacy: ResumeContractOutput;
  v11: ResumeContractOutput;
  caseId: string;
}): void {
  if (JSON.stringify(input.legacy) !== JSON.stringify(input.v11)) {
    throw new Error(
      `resume parity mismatch for case=${input.caseId}: legacy=${JSON.stringify(input.legacy)} v11=${JSON.stringify(input.v11)}`
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
    task: "Resume contract parity fixture"
  });
  const loaded = await readStateSnapshot(bubble.paths.statePath);
  const transitioned = applyStateTransition(loaded.state, {
    to: "WAITING_HUMAN",
    lastCommandAt: "2026-03-20T12:20:00.000Z"
  });
  await writeStateSnapshot(bubble.paths.statePath, transitioned, {
    expectedFingerprint: loaded.fingerprint,
    expectedState: "RUNNING"
  });
  return bubble;
}

async function executeResumeCase(input: {
  caseDef: ContractCase;
  executor: typeof resumeBubble;
}): Promise<ResumeContractOutput> {
  const repoPath = await mkdtemp(join(tmpdir(), "pairflow-resume-contract-"));
  try {
    await initGitRepository(repoPath);
    const bubble = await seedWaitingHumanState({
      repoPath,
      bubbleId: `b_contract_${input.caseDef.id}`
    });

    const result = await input.executor({
      bubbleId: bubble.bubbleId,
      cwd: repoPath,
      now: new Date("2026-03-20T12:25:00.000Z")
    });

    return normalizeResumeResult(result);
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
}

export async function runResumeContractCase(
  caseDef: ContractCase
): Promise<ResumeContractRunResult> {
  if (caseDef.command !== "resume") {
    throw new Error(
      `Unsupported command for resume contract runner: ${caseDef.command}`
    );
  }

  if (caseDef.mode === "legacy") {
    const legacy = await executeResumeCase({
      caseDef,
      executor: resumeBubble
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
    const v11 = await executeResumeCase({
      caseDef,
      executor: resumeBubbleV11
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

  const legacy = await executeResumeCase({
    caseDef,
    executor: resumeBubble
  });
  const v11 = await executeResumeCase({
    caseDef,
    executor: resumeBubbleV11
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
