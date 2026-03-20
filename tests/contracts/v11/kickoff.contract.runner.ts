import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { parseBubbleConfigToml, renderBubbleConfigToml } from "../../../src/config/bubbleConfig.js";
import { createBubble } from "../../../src/core/bubble/createBubble.js";
import { kickoffBubble } from "../../../src/core/bubble/kickoffBubble.js";
import { readTranscriptEnvelopes } from "../../../src/core/protocol/transcriptStore.js";
import {
  readStateSnapshot,
  StateStoreConflictError,
  writeStateSnapshot
} from "../../../src/core/state/stateStore.js";
import { kickoffBubbleV11 } from "../../../src/v11/application/kickoff/emitKickoffV11.js";
import { initGitRepository } from "../../helpers/git.js";
import type { ContractCase, ContractCaseExpected } from "./schema.js";

export interface KickoffContractOutput {
  status: "ok" | "error";
  reasonCode: string | null;
  stateChanged: boolean;
  stateSubset: {
    state: string;
    round: number;
    activeRole: string | null;
  };
  taskEnvelopeAppended: boolean;
  markersBefore: {
    ideation_mode: boolean;
    ideation_task_pending: boolean;
  };
  markersAfter: {
    ideation_mode: boolean;
    ideation_task_pending: boolean;
  };
  taskEnvelopeCount: number;
  taskArtifactContainsTask: boolean;
}

export interface KickoffContractRunResult {
  mode: ContractCase["mode"];
  legacy?: KickoffContractOutput;
  v11?: KickoffContractOutput;
}

interface ParsedKickoffFixtureInput {
  ideation: boolean;
  running: boolean;
  round: number;
  taskPending: boolean;
  stateConflict: boolean;
  appendFailure: boolean;
  taskViaFile: boolean;
  taskFileMissing: boolean;
  bubbleTask: string;
}

interface ParsedKickoffCaseInput {
  task: string;
  fixture: ParsedKickoffFixtureInput;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseKickoffFixtureInput(
  input: ContractCase["input"]
): ParsedKickoffFixtureInput {
  const fixtureRaw = input.fixture;
  if (fixtureRaw === undefined) {
    return {
      ideation: true,
      running: true,
      round: 0,
      taskPending: true,
      stateConflict: false,
      appendFailure: false,
      taskViaFile: false,
      taskFileMissing: false,
      bubbleTask: "Legacy kickoff fixture task"
    };
  }
  if (!isRecord(fixtureRaw)) {
    throw new Error("kickoff contract input.fixture must be an object when provided.");
  }

  const ideationRaw = fixtureRaw.ideation;
  if (ideationRaw !== undefined && typeof ideationRaw !== "boolean") {
    throw new Error("kickoff contract input.fixture.ideation must be a boolean.");
  }

  const runningRaw = fixtureRaw.running;
  if (runningRaw !== undefined && typeof runningRaw !== "boolean") {
    throw new Error("kickoff contract input.fixture.running must be a boolean.");
  }

  const roundRaw = fixtureRaw.round;
  if (
    roundRaw !== undefined
    && (typeof roundRaw !== "number" || !Number.isInteger(roundRaw) || roundRaw < 0)
  ) {
    throw new Error(
      "kickoff contract input.fixture.round must be a non-negative integer."
    );
  }

  const taskPendingRaw = fixtureRaw.taskPending;
  if (taskPendingRaw !== undefined && typeof taskPendingRaw !== "boolean") {
    throw new Error("kickoff contract input.fixture.taskPending must be a boolean.");
  }

  const stateConflictRaw = fixtureRaw.stateConflict;
  if (stateConflictRaw !== undefined && typeof stateConflictRaw !== "boolean") {
    throw new Error("kickoff contract input.fixture.stateConflict must be a boolean.");
  }

  const appendFailureRaw = fixtureRaw.appendFailure;
  if (appendFailureRaw !== undefined && typeof appendFailureRaw !== "boolean") {
    throw new Error("kickoff contract input.fixture.appendFailure must be a boolean.");
  }

  const taskViaFileRaw = fixtureRaw.taskViaFile;
  if (taskViaFileRaw !== undefined && typeof taskViaFileRaw !== "boolean") {
    throw new Error("kickoff contract input.fixture.taskViaFile must be a boolean.");
  }

  const taskFileMissingRaw = fixtureRaw.taskFileMissing;
  if (
    taskFileMissingRaw !== undefined &&
    typeof taskFileMissingRaw !== "boolean"
  ) {
    throw new Error(
      "kickoff contract input.fixture.taskFileMissing must be a boolean."
    );
  }

  const bubbleTaskRaw = fixtureRaw.bubbleTask;
  if (
    bubbleTaskRaw !== undefined &&
    (typeof bubbleTaskRaw !== "string" || bubbleTaskRaw.trim().length === 0)
  ) {
    throw new Error(
      "kickoff contract input.fixture.bubbleTask must be a non-empty string."
    );
  }

  return {
    ideation: ideationRaw ?? true,
    running: runningRaw ?? true,
    round: roundRaw ?? 0,
    taskPending: taskPendingRaw ?? true,
    stateConflict: stateConflictRaw ?? false,
    appendFailure: appendFailureRaw ?? false,
    taskViaFile: taskViaFileRaw ?? false,
    taskFileMissing: taskFileMissingRaw ?? false,
    bubbleTask: bubbleTaskRaw?.trim() ?? "Legacy kickoff fixture task"
  };
}

function parseKickoffCaseInput(input: ContractCase["input"]): ParsedKickoffCaseInput {
  const taskRaw = input.task;
  if (typeof taskRaw !== "string" || taskRaw.trim().length === 0) {
    throw new Error("kickoff contract input.task must be a non-empty string.");
  }

  return {
    task: taskRaw.trim(),
    fixture: parseKickoffFixtureInput(input)
  };
}

function normalizeKickoffResult(input: {
  result: Awaited<ReturnType<typeof kickoffBubble>>;
  taskEnvelopeCount: number;
  taskArtifactContainsTask: boolean;
}): KickoffContractOutput {
  const state = input.result.state_after ?? input.result.state_before;
  return {
    status: input.result.ok ? "ok" : "error",
    reasonCode: input.result.reason_code,
    stateChanged: input.result.state_changed,
    stateSubset: {
      state: state?.state ?? "UNKNOWN",
      round: state?.round ?? -1,
      activeRole: state?.active_role ?? null
    },
    taskEnvelopeAppended: input.result.protocol.task_envelope_appended,
    markersBefore: input.result.markers_before,
    markersAfter: input.result.markers_after,
    taskEnvelopeCount: input.taskEnvelopeCount,
    taskArtifactContainsTask: input.taskArtifactContainsTask
  };
}

function assertContractExpectedSubset(input: {
  output: KickoffContractOutput;
  expected: ContractCaseExpected;
  label: string;
}): void {
  if (input.output.status !== input.expected.status) {
    throw new Error(
      `${input.label}: status mismatch (expected=${input.expected.status}, actual=${input.output.status})`
    );
  }
  if (
    input.expected.reasonCode !== undefined
    && input.output.reasonCode !== input.expected.reasonCode
  ) {
    throw new Error(
      `${input.label}: reasonCode mismatch (expected=${input.expected.reasonCode}, actual=${input.output.reasonCode})`
    );
  }
  const expectedState = input.expected.stateSubset?.state;
  if (
    typeof expectedState === "string"
    && input.output.stateSubset.state !== expectedState
  ) {
    throw new Error(
      `${input.label}: stateSubset.state mismatch (expected=${expectedState}, actual=${input.output.stateSubset.state})`
    );
  }
}

function assertParityEquivalent(input: {
  legacy: KickoffContractOutput;
  v11: KickoffContractOutput;
  caseId: string;
}): void {
  if (JSON.stringify(input.legacy) !== JSON.stringify(input.v11)) {
    throw new Error(
      `kickoff parity mismatch for case=${input.caseId}: legacy=${JSON.stringify(input.legacy)} v11=${JSON.stringify(input.v11)}`
    );
  }
}

function normalizeTestBubbleId(id: string): string {
  const trimmed = id.trim();
  if (/^[a-z][a-z0-9_-]{2,39}$/u.test(trimmed)) {
    return trimmed;
  }

  const hashSuffix = createHash("sha1")
    .update(trimmed)
    .digest("hex")
    .slice(0, 10);
  const prefixMaxLength = 40 - 1 - hashSuffix.length;
  const normalizedPrefix = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9_-]/gu, "-")
    .replace(/^[^a-z]+/u, "")
    .slice(0, prefixMaxLength)
    .replace(/[-_]+$/u, "");

  const safePrefix = normalizedPrefix.length >= 3 ? normalizedPrefix : "bubble";
  const candidate = `${safePrefix}-${hashSuffix}`.slice(0, 40);

  if (/^[a-z][a-z0-9_-]{2,39}$/u.test(candidate)) {
    return candidate;
  }

  return `bubble-${hashSuffix}`.slice(0, 40);
}

async function setupKickoffFixture(
  repoPath: string,
  bubbleId: string,
  fixture: ParsedKickoffFixtureInput
) {
  const bubble = await createBubble({
    id: normalizeTestBubbleId(bubbleId),
    repoPath,
    baseBranch: "main",
    reviewArtifactType: "code",
    ...(fixture.ideation
      ? { ideation: true }
      : { task: fixture.bubbleTask }),
    cwd: repoPath
  });

  if (fixture.ideation) {
    const config = parseBubbleConfigToml(
      await readFile(bubble.paths.bubbleTomlPath, "utf8")
    );
    const normalizedConfig = {
      ...config,
      ideation: {
        mode: true,
        task_pending: fixture.taskPending
      }
    };
    await writeFile(
      bubble.paths.bubbleTomlPath,
      renderBubbleConfigToml(normalizedConfig),
      "utf8"
    );
  }

  if (!fixture.ideation || !fixture.running) {
    return bubble;
  }

  const loaded = await readStateSnapshot(bubble.paths.statePath);
  const startedAt = "2026-03-20T14:00:00.000Z";
  await writeStateSnapshot(
    bubble.paths.statePath,
    {
      ...loaded.state,
      state: "RUNNING",
      round: fixture.round,
      active_agent: "codex",
      active_role: "implementer",
      active_since: startedAt,
      last_command_at: startedAt,
      round_role_history: []
    },
    {
      expectedFingerprint: loaded.fingerprint,
      expectedState: "CREATED"
    }
  );

  return bubble;
}

async function executeKickoffCase(input: {
  caseDef: ContractCase;
  executor: typeof kickoffBubble;
}): Promise<KickoffContractOutput> {
  const repoPath = await mkdtemp(join(tmpdir(), "pairflow-kickoff-contract-"));
  try {
    await initGitRepository(repoPath);
    const parsedInput = parseKickoffCaseInput(input.caseDef.input);
    const bubble = await setupKickoffFixture(
      repoPath,
      `b_contract_${input.caseDef.id}`,
      parsedInput.fixture
    );

    const dependencyOverrides: Parameters<typeof input.executor>[1] = {};
    if (parsedInput.fixture.stateConflict) {
      dependencyOverrides.writeStateSnapshot = () =>
        Promise.reject(new StateStoreConflictError("Injected kickoff state conflict."));
    }
    if (parsedInput.fixture.appendFailure) {
      dependencyOverrides.appendProtocolEnvelope = () =>
        Promise.reject(new Error("Injected kickoff append failure."));
    }

    const kickoffInput: Parameters<typeof input.executor>[0] = {
      bubbleId: bubble.bubbleId,
      repoPath,
      cwd: repoPath,
      now: new Date("2026-03-20T14:05:00.000Z")
    };
    if (parsedInput.fixture.taskViaFile) {
      const taskFileName = "kickoff-task-input.md";
      if (!parsedInput.fixture.taskFileMissing) {
        await writeFile(
          join(repoPath, taskFileName),
          `${parsedInput.task}\n`,
          "utf8"
        );
      }
      kickoffInput.taskFile = taskFileName;
    } else {
      kickoffInput.task = parsedInput.task;
    }

    const result = await input.executor(kickoffInput, dependencyOverrides);

    const transcript = await readTranscriptEnvelopes(bubble.paths.transcriptPath);
    const taskEnvelopeCount = transcript.reduce(
      (count, envelope) => (envelope.type === "TASK" ? count + 1 : count),
      0
    );
    const taskArtifact = await readFile(bubble.paths.taskArtifactPath, "utf8");

    return normalizeKickoffResult({
      result,
      taskEnvelopeCount,
      taskArtifactContainsTask: taskArtifact.includes(parsedInput.task)
    });
  } finally {
    await rm(repoPath, { recursive: true, force: true });
  }
}

export async function runKickoffContractCase(
  caseDef: ContractCase
): Promise<KickoffContractRunResult> {
  if (caseDef.command !== "kickoff") {
    throw new Error(`Unsupported command for kickoff contract runner: ${caseDef.command}`);
  }

  if (caseDef.mode === "legacy") {
    const legacy = await executeKickoffCase({
      caseDef,
      executor: kickoffBubble
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
    const v11 = await executeKickoffCase({
      caseDef,
      executor: kickoffBubbleV11
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

  const legacy = await executeKickoffCase({
    caseDef,
    executor: kickoffBubble
  });
  const v11 = await executeKickoffCase({
    caseDef,
    executor: kickoffBubbleV11
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
