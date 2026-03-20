import { mkdtemp, rm } from "node:fs/promises";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  DEFAULT_RESUME_MESSAGE,
  resumeBubble
} from "../../../src/core/bubble/resumeBubble.js";
import { resumeBubbleV11 } from "../../../src/v11/application/resume/emitResumeV11.js";
import { setupRunningBubbleFixture } from "../../helpers/bubble.js";
import { initGitRepository } from "../../helpers/git.js";
import { applyStateTransition } from "../../../src/core/state/machine.js";
import {
  readStateSnapshot,
  writeStateSnapshot
} from "../../../src/core/state/stateStore.js";
import type { ContractCase, ContractCaseExpected } from "./schema.js";

export interface ResumeContractSuccessOutput {
  status: "ok";
  reasonCode: "RESUMED";
  envelopeType: string;
  hasMessage: boolean;
  messageMatchesDefault: boolean;
  stateSubset: {
    state: string;
  };
  round: number;
  activeRole: string | null;
}

export interface ResumeContractErrorOutput {
  status: "error";
  reasonCode: string | null;
  stateSubset: {
    state: string;
  };
}

export type ResumeContractOutput =
  | ResumeContractSuccessOutput
  | ResumeContractErrorOutput;

export interface ResumeContractRunResult {
  mode: ContractCase["mode"];
  legacy?: ResumeContractOutput;
  v11?: ResumeContractOutput;
}

type ResumeContractScenario =
  | "basic"
  | "state_not_waiting_human"
  | "waiting_human_round_invalid"
  | "waiting_human_context_incomplete"
  | "default_message_invariant";

interface ParsedResumeCaseInput {
  scenario: ResumeContractScenario;
}

function buildResumeContractBubbleId(caseId: string): string {
  const suffix = createHash("sha1").update(caseId).digest("hex").slice(0, 12);
  return `b_contract_${suffix}`;
}

function parseResumeCaseInput(input: ContractCase["input"]): ParsedResumeCaseInput {
  const fixtureRaw = input.fixture;
  let scenario: ResumeContractScenario = "basic";
  if (fixtureRaw !== undefined) {
    if (typeof fixtureRaw !== "object" || fixtureRaw === null) {
      throw new Error("resume contract input.fixture must be an object when provided.");
    }
    const scenarioRaw = (fixtureRaw as Record<string, unknown>).scenario;
    if (
      scenarioRaw !== undefined &&
      scenarioRaw !== "basic" &&
      scenarioRaw !== "state_not_waiting_human" &&
      scenarioRaw !== "waiting_human_round_invalid" &&
      scenarioRaw !== "waiting_human_context_incomplete" &&
      scenarioRaw !== "default_message_invariant"
    ) {
      throw new Error(
        "resume contract input.fixture.scenario must be one of: basic, state_not_waiting_human, waiting_human_round_invalid, waiting_human_context_incomplete, default_message_invariant."
      );
    }
    scenario = (scenarioRaw as ResumeContractScenario | undefined) ?? "basic";
  }
  return { scenario };
}

function normalizeResumeResult(
  result: Awaited<ReturnType<typeof resumeBubble>>
): ResumeContractSuccessOutput {
  return {
    status: "ok",
    reasonCode: "RESUMED",
    envelopeType: result.envelope.type,
    hasMessage: typeof result.envelope.payload.message === "string",
    messageMatchesDefault: result.envelope.payload.message === DEFAULT_RESUME_MESSAGE,
    stateSubset: {
      state: result.state.state
    },
    round: result.state.round,
    activeRole: result.state.active_role
  };
}

function normalizeResumeErrorResult(input: {
  error: unknown;
  state: string;
}): ResumeContractErrorOutput {
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

function assertResumeScenarioInvariant(input: {
  output: ResumeContractOutput;
  scenario: ResumeContractScenario;
  caseId: string;
}): void {
  if (input.scenario !== "default_message_invariant") {
    return;
  }
  if (input.output.status !== "ok") {
    throw new Error(
      `resume contract case=${input.caseId}: default_message_invariant requires success output.`
    );
  }
  if (!input.output.messageMatchesDefault) {
    throw new Error(
      `resume contract case=${input.caseId}: expected resume message to match DEFAULT_RESUME_MESSAGE.`
    );
  }
}

async function seedWaitingHumanState(input: {
  repoPath: string;
  bubbleId: string;
  scenario: ResumeContractScenario;
}) {
  const bubble = await setupRunningBubbleFixture({
    repoPath: input.repoPath,
    bubbleId: input.bubbleId,
    task: "Resume contract parity fixture"
  });
  if (input.scenario === "state_not_waiting_human") {
    return bubble;
  }
  const loaded = await readStateSnapshot(bubble.paths.statePath);
  let transitioned = applyStateTransition(loaded.state, {
    to: "WAITING_HUMAN",
    lastCommandAt: "2026-03-20T12:20:00.000Z"
  });
  if (input.scenario === "waiting_human_round_invalid") {
    transitioned = {
      ...transitioned,
      round: 0
    };
  }
  if (input.scenario === "waiting_human_context_incomplete") {
    transitioned = {
      ...transitioned,
      active_agent: null,
      active_role: null,
      active_since: null
    };
  }
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
    const parsedInput = parseResumeCaseInput(input.caseDef.input);
    await initGitRepository(repoPath);
    const bubble = await seedWaitingHumanState({
      repoPath,
      bubbleId: buildResumeContractBubbleId(input.caseDef.id),
      scenario: parsedInput.scenario
    });

    try {
      const result = await input.executor({
        bubbleId: bubble.bubbleId,
        cwd: repoPath,
        now: new Date("2026-03-20T12:25:00.000Z")
      });

      const output = normalizeResumeResult(result);
      assertResumeScenarioInvariant({
        output,
        scenario: parsedInput.scenario,
        caseId: input.caseDef.id
      });
      return output;
    } catch (error) {
      const stateSnapshot = await readStateSnapshot(bubble.paths.statePath);
      const output = normalizeResumeErrorResult({
        error,
        state: stateSnapshot.state.state
      });
      assertResumeScenarioInvariant({
        output,
        scenario: parsedInput.scenario,
        caseId: input.caseDef.id
      });
      return output;
    }
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
