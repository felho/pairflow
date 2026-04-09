import { createHash } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  restartBubbleV11
} from "../../../src/v11/application/restart/emitRestartV11.js";
import {
  startBubbleV11 as startBubble,
  type StartBubbleV11Result as StartBubbleResult
} from "../../../src/v11/application/start/emitStartV11.js";
import {
  readStateSnapshot,
  writeStateSnapshot
} from "../../../src/v11/infrastructure/state/stateStore.js";
import { setupRunningBubbleFixture } from "../../helpers/bubble.js";
import { initGitRepository } from "../../helpers/git.js";
import type { ContractCase, ContractCaseExpected } from "./schema.js";

export interface RestartContractSuccessOutput {
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

export interface RestartContractErrorOutput {
  status: "error";
  reasonCode: string | null;
  stateSubset: {
    state: string;
  };
}

export type RestartContractOutput =
  | RestartContractSuccessOutput
  | RestartContractErrorOutput;

export interface RestartContractRunResult {
  mode: ContractCase["mode"];
  v11?: RestartContractOutput;
}

type RestartContractScenario = "basic" | "start_state_not_startable";

interface ParsedRestartCaseInput {
  previousTmuxSessionExisted: boolean;
  previousRuntimeSessionRemoved: boolean;
  scenario: RestartContractScenario;
}

function buildRestartContractBubbleId(caseId: string): string {
  const suffix = createHash("sha1").update(caseId).digest("hex").slice(0, 12);
  return `b_contract_${suffix}`;
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

  const fixtureRaw = input.fixture;
  let scenario: RestartContractScenario = "basic";
  if (fixtureRaw !== undefined) {
    if (typeof fixtureRaw !== "object" || fixtureRaw === null) {
      throw new Error("restart contract input.fixture must be an object when provided.");
    }
    const scenarioRaw = (fixtureRaw as Record<string, unknown>).scenario;
    if (
      scenarioRaw !== undefined &&
      scenarioRaw !== "basic" &&
      scenarioRaw !== "start_state_not_startable"
    ) {
      throw new Error(
        "restart contract input.fixture.scenario must be one of: basic, start_state_not_startable."
      );
    }
    scenario = scenarioRaw ?? "basic";
  }

  return {
    previousTmuxSessionExisted: previousTmuxSessionExistedRaw ?? false,
    previousRuntimeSessionRemoved: previousRuntimeSessionRemovedRaw ?? false,
    scenario
  };
}

function normalizeRestartResult(
  result: Awaited<ReturnType<typeof restartBubbleV11>>
): RestartContractSuccessOutput {
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

function normalizeRestartErrorResult(input: {
  error: unknown;
  state: string;
}): RestartContractErrorOutput {
  const message = input.error instanceof Error ? input.error.message : String(input.error);
  const reasonMatch = /^([A-Z0-9_]+):/u.exec(message.trim());
  let reasonCode: string | null = reasonMatch?.[1] ?? null;

  if (
    reasonCode === null &&
    message.includes("bubble start requires state CREATED or resumable runtime state")
  ) {
    reasonCode = "START_STATE_NOT_STARTABLE";
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

async function executeRestartCase(input: {
  caseDef: ContractCase;
  executor: typeof restartBubbleV11;
}): Promise<RestartContractOutput> {
  const repoPath = await mkdtemp(join(tmpdir(), "pairflow-restart-contract-"));
  try {
    await initGitRepository(repoPath);
    const parsedInput = parseRestartCaseInput(input.caseDef.input);
    const bubble = await setupRunningBubbleFixture({
      repoPath,
      bubbleId: buildRestartContractBubbleId(input.caseDef.id),
      task: input.caseDef.description
    });

    if (parsedInput.scenario === "start_state_not_startable") {
      const loaded = await readStateSnapshot(bubble.paths.statePath);
      await writeStateSnapshot(
        bubble.paths.statePath,
        {
          ...loaded.state,
          state: "FAILED",
          execution_context: null,
          active_agent: null,
          active_role: null,
          active_since: null,
          last_command_at: "2026-03-20T11:00:00.000Z"
        },
        {
          expectedFingerprint: loaded.fingerprint,
          expectedState: "RUNNING"
        }
      );
    }

    try {
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
          startBubble:
            parsedInput.scenario === "start_state_not_startable"
              ? startBubble
              : () =>
                Promise.resolve({
                  bubbleId: bubble.bubbleId,
                  state: { state: "RUNNING" },
                  tmuxSessionName: `pf-${bubble.bubbleId}`,
                  worktreePath: bubble.paths.worktreePath
                } as unknown as StartBubbleResult)
        }
      );

      return normalizeRestartResult(result);
    } catch (error) {
      const stateSnapshot = await readStateSnapshot(bubble.paths.statePath);
      return normalizeRestartErrorResult({
        error,
        state: stateSnapshot.state.state
      });
    }
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
