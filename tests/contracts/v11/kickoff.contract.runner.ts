import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createBubble } from "../../../src/core/bubble/createBubble.js";
import { kickoffBubble } from "../../../src/core/bubble/kickoffBubble.js";
import { readTranscriptEnvelopes } from "../../../src/core/protocol/transcriptStore.js";
import { readStateSnapshot, writeStateSnapshot } from "../../../src/core/state/stateStore.js";
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

interface ParsedKickoffCaseInput {
  task: string;
}

function parseKickoffCaseInput(input: ContractCase["input"]): ParsedKickoffCaseInput {
  const taskRaw = input.task;
  if (typeof taskRaw !== "string" || taskRaw.trim().length === 0) {
    throw new Error("kickoff contract input.task must be a non-empty string.");
  }

  return {
    task: taskRaw.trim()
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

async function setupKickoffFixture(repoPath: string, bubbleId: string) {
  const bubble = await createBubble({
    id: bubbleId,
    repoPath,
    baseBranch: "main",
    reviewArtifactType: "code",
    ideation: true,
    cwd: repoPath
  });

  const loaded = await readStateSnapshot(bubble.paths.statePath);
  const startedAt = "2026-03-20T14:00:00.000Z";
  await writeStateSnapshot(
    bubble.paths.statePath,
    {
      ...loaded.state,
      state: "RUNNING",
      round: 0,
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
    const bubble = await setupKickoffFixture(repoPath, `b_contract_${input.caseDef.id}`);
    const parsedInput = parseKickoffCaseInput(input.caseDef.input);

    const result = await input.executor({
      bubbleId: bubble.bubbleId,
      repoPath,
      task: parsedInput.task,
      cwd: repoPath,
      now: new Date("2026-03-20T14:05:00.000Z")
    });

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
