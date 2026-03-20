import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  stopBubble,
  type StopBubbleDependencies,
  type StopBubbleInput,
  type StopBubbleResult
} from "../../../src/core/bubble/stopBubble.js";
import {
  readStateSnapshot,
  writeStateSnapshot
} from "../../../src/core/state/stateStore.js";
import { stopBubbleV11 } from "../../../src/v11/application/stop/emitStopV11.js";
import { setupRunningBubbleFixture } from "../../helpers/bubble.js";
import { initGitRepository } from "../../helpers/git.js";
import type { ContractCase, ContractCaseExpected } from "./schema.js";

export interface StopContractSuccessOutput {
  status: "ok";
  reasonCode: "STOPPED";
  stateSubset: {
    state: string;
  };
  tmuxSessionExisted: boolean;
  runtimeSessionRemoved: boolean;
}

export interface StopContractErrorOutput {
  status: "error";
  reasonCode: string | null;
  stateSubset: {
    state: string;
  };
}

export type StopContractOutput =
  | StopContractSuccessOutput
  | StopContractErrorOutput;

export interface StopContractRunResult {
  mode: ContractCase["mode"];
  legacy?: StopContractOutput;
  v11?: StopContractOutput;
}

type StopContractScenario = "basic" | "final_state" | "cleanup_invariant";

interface ParsedStopCaseInput {
  tmuxSessionExisted: boolean;
  runtimeSessionRemoved: boolean;
  scenario: StopContractScenario;
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

  const fixtureRaw = input.fixture;
  let scenario: StopContractScenario = "basic";
  if (fixtureRaw !== undefined) {
    if (typeof fixtureRaw !== "object" || fixtureRaw === null) {
      throw new Error("stop contract input.fixture must be an object when provided.");
    }
    const scenarioRaw = (fixtureRaw as Record<string, unknown>).scenario;
    if (
      scenarioRaw !== undefined &&
      scenarioRaw !== "basic" &&
      scenarioRaw !== "final_state" &&
      scenarioRaw !== "cleanup_invariant"
    ) {
      throw new Error(
        "stop contract input.fixture.scenario must be one of: basic, final_state, cleanup_invariant."
      );
    }
    scenario = scenarioRaw ?? "basic";
  }

  return {
    tmuxSessionExisted: tmuxSessionExistedRaw ?? true,
    runtimeSessionRemoved: runtimeSessionRemovedRaw ?? true,
    scenario
  };
}

function normalizeStopResult(result: StopBubbleResult): StopContractSuccessOutput {
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

function normalizeStopErrorResult(input: {
  error: unknown;
  state: string;
}): StopContractErrorOutput {
  const message = input.error instanceof Error ? input.error.message : String(input.error);
  const reasonMatch = /^([A-Z0-9_]+):/u.exec(message.trim());
  return {
    status: "error",
    reasonCode: reasonMatch?.[1] ?? null,
    stateSubset: {
      state: input.state
    }
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

function assertStopScenarioInvariant(input: {
  output: StopContractOutput;
  scenario: StopContractScenario;
  caseId: string;
}): void {
  if (input.scenario !== "cleanup_invariant") {
    return;
  }

  if (input.output.status !== "ok") {
    throw new Error(
      `stop contract case=${input.caseId}: cleanup_invariant requires success output.`
    );
  }
  if (!input.output.runtimeSessionRemoved) {
    throw new Error(
      `stop contract case=${input.caseId}: expected runtimeSessionRemoved=true for cleanup_invariant.`
    );
  }
  if (input.output.stateSubset.state !== "CANCELLED") {
    throw new Error(
      `stop contract case=${input.caseId}: expected state=CANCELLED for cleanup_invariant (actual=${input.output.stateSubset.state}).`
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
    if (parsedInput.scenario === "final_state") {
      const loaded = await readStateSnapshot(bubble.paths.statePath);
      await writeStateSnapshot(
        bubble.paths.statePath,
        {
          ...loaded.state,
          state: "DONE",
          active_agent: null,
          active_role: null,
          active_since: null,
          last_command_at: "2026-03-20T00:00:00.000Z"
        },
        {
          expectedFingerprint: loaded.fingerprint,
          expectedState: "RUNNING"
        }
      );
    }

    let output: StopContractOutput;
    try {
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

      output = normalizeStopResult(result);
    } catch (error) {
      const stateSnapshot = await readStateSnapshot(bubble.paths.statePath);
      output = normalizeStopErrorResult({
        error,
        state: stateSnapshot.state.state
      });
    }

    assertStopScenarioInvariant({
      output,
      scenario: parsedInput.scenario,
      caseId: input.caseDef.id
    });
    return output;
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
