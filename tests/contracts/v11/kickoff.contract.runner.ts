import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { parseBubbleConfigToml, renderBubbleConfigToml } from "../../../src/config/bubbleConfig.js";
import { createBubble } from "../../../src/v11/defaults/create/createBubbleApi.js";
import { readTranscriptEnvelopes } from "../../../src/v11/infrastructure/artifact/transcript/transcriptStore.js";
import { buildRunningExecutionContext } from "../../../src/v11/shared/state/executionContext.js";
import type { DeliveryAck } from "../../../src/v11/ports/tmuxDelivery.js";
import {
  readStateSnapshot,
  StateStoreConflictError,
  writeStateSnapshot
} from "../../../src/v11/infrastructure/state/stateStore.js";
import { kickoffBubbleV11 } from "../../../src/v11/application/kickoff/emitKickoffV11.js";
import { deliveryTargetRoleMetadataKey } from "../../../src/types/protocol.js";
import { initGitRepository } from "../../helpers/git.js";
import type { ContractCase, ContractCaseExpected } from "./schema.js";

type DeliveryRefKind = "external" | "none" | "transcript";
type KickoffDependencyOverrideMap = NonNullable<
  Parameters<typeof kickoffBubbleV11>[1]
>;

interface CapturedKickoffDelivery {
  recipient: string;
  targetRole: string | null;
  refKind: DeliveryRefKind;
}

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
  deliveryCount: number;
  deliveryRecipients: string[];
  deliveryTargetRoles: string[];
  deliveryRefKinds: DeliveryRefKind[];
}

export interface KickoffContractRunResult {
  mode: ContractCase["mode"];
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
  taskFileEmpty: boolean;
  taskFileDirectory: boolean;
  taskInputConflict: boolean;
  taskInputMissing: boolean;
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
      taskFileEmpty: false,
      taskFileDirectory: false,
      taskInputConflict: false,
      taskInputMissing: false,
      bubbleTask: "Baseline kickoff fixture task"
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

  const taskFileEmptyRaw = fixtureRaw.taskFileEmpty;
  if (
    taskFileEmptyRaw !== undefined &&
    typeof taskFileEmptyRaw !== "boolean"
  ) {
    throw new Error(
      "kickoff contract input.fixture.taskFileEmpty must be a boolean."
    );
  }

  const taskFileDirectoryRaw = fixtureRaw.taskFileDirectory;
  if (
    taskFileDirectoryRaw !== undefined &&
    typeof taskFileDirectoryRaw !== "boolean"
  ) {
    throw new Error(
      "kickoff contract input.fixture.taskFileDirectory must be a boolean."
    );
  }

  const taskInputConflictRaw = fixtureRaw.taskInputConflict;
  if (
    taskInputConflictRaw !== undefined &&
    typeof taskInputConflictRaw !== "boolean"
  ) {
    throw new Error(
      "kickoff contract input.fixture.taskInputConflict must be a boolean."
    );
  }

  const taskInputMissingRaw = fixtureRaw.taskInputMissing;
  if (
    taskInputMissingRaw !== undefined &&
    typeof taskInputMissingRaw !== "boolean"
  ) {
    throw new Error(
      "kickoff contract input.fixture.taskInputMissing must be a boolean."
    );
  }

  if (taskInputConflictRaw === true && taskInputMissingRaw === true) {
    throw new Error(
      "kickoff contract fixture cannot set both taskInputConflict and taskInputMissing."
    );
  }

  const taskFileVariantCount = [taskFileMissingRaw, taskFileEmptyRaw, taskFileDirectoryRaw]
    .filter((value) => value === true)
    .length;
  if (taskFileVariantCount > 1) {
    throw new Error(
      "kickoff contract fixture cannot combine multiple task-file variants."
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
    taskFileEmpty: taskFileEmptyRaw ?? false,
    taskFileDirectory: taskFileDirectoryRaw ?? false,
    taskInputConflict: taskInputConflictRaw ?? false,
    taskInputMissing: taskInputMissingRaw ?? false,
    bubbleTask: bubbleTaskRaw?.trim() ?? "Baseline kickoff fixture task"
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
  result: Awaited<ReturnType<typeof kickoffBubbleV11>>;
  taskEnvelopeCount: number;
  taskArtifactContainsTask: boolean;
  deliveries: CapturedKickoffDelivery[];
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
    taskArtifactContainsTask: input.taskArtifactContainsTask,
    deliveryCount: input.deliveries.length,
    deliveryRecipients: input.deliveries.map((delivery) => delivery.recipient),
    deliveryTargetRoles: input.deliveries
      .map((delivery) => delivery.targetRole)
      .filter((role): role is string => role !== null),
    deliveryRefKinds: input.deliveries.map((delivery) => delivery.refKind)
  };
}

function classifyDeliveryRefKind(messageRef: string | undefined): DeliveryRefKind {
  if (messageRef === undefined) {
    return "none";
  }
  return messageRef.includes("transcript.ndjson#") ? "transcript" : "external";
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
  if (
    input.expected.deliveryCount !== undefined &&
    input.output.deliveryCount !== input.expected.deliveryCount
  ) {
    throw new Error(
      `${input.label}: deliveryCount mismatch (expected=${input.expected.deliveryCount}, actual=${input.output.deliveryCount})`
    );
  }
  if (
    input.expected.deliveryRecipients !== undefined &&
    JSON.stringify(input.output.deliveryRecipients)
      !== JSON.stringify(input.expected.deliveryRecipients)
  ) {
    throw new Error(
      `${input.label}: deliveryRecipients mismatch (expected=${JSON.stringify(input.expected.deliveryRecipients)}, actual=${JSON.stringify(input.output.deliveryRecipients)})`
    );
  }
  if (
    input.expected.deliveryTargetRoles !== undefined &&
    JSON.stringify(input.output.deliveryTargetRoles)
      !== JSON.stringify(input.expected.deliveryTargetRoles)
  ) {
    throw new Error(
      `${input.label}: deliveryTargetRoles mismatch (expected=${JSON.stringify(input.expected.deliveryTargetRoles)}, actual=${JSON.stringify(input.output.deliveryTargetRoles)})`
    );
  }
  if (
    input.expected.deliveryRefKinds !== undefined &&
    JSON.stringify(input.output.deliveryRefKinds)
      !== JSON.stringify(input.expected.deliveryRefKinds)
  ) {
    throw new Error(
      `${input.label}: deliveryRefKinds mismatch (expected=${JSON.stringify(input.expected.deliveryRefKinds)}, actual=${JSON.stringify(input.output.deliveryRefKinds)})`
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
      execution_context:
        fixture.round === 0
          ? null
          : buildRunningExecutionContext({
              bubbleId: bubble.bubbleId,
              round: fixture.round,
              activeRole: "implementer",
              startedAt,
              watchdogTimeoutMinutes: 60,
              attempt: 1
            }),
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
  executor: typeof kickoffBubbleV11;
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

    const deliveries: CapturedKickoffDelivery[] = [];
    const emitDelivery: NonNullable<
      KickoffDependencyOverrideMap["emitDeliveryNotificationAck"]
    > = (deliveryInput) => {
      const targetRoleRaw =
        deliveryInput.envelope.payload.metadata?.[deliveryTargetRoleMetadataKey];
      deliveries.push({
        recipient: deliveryInput.envelope.recipient,
        targetRole: typeof targetRoleRaw === "string" ? targetRoleRaw : null,
        refKind: classifyDeliveryRefKind(deliveryInput.messageRef)
      });
      return Promise.resolve<DeliveryAck>({
        status: "accepted",
        message: "ok",
        sessionName: "pf_kickoff_contract",
        targetPaneIndex: 1
      });
    };

    const dependencyOverrides: KickoffDependencyOverrideMap = {
      emitDeliveryNotificationAck: emitDelivery
    };
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
    if (parsedInput.fixture.taskInputMissing) {
      // Intentionally provide neither task nor taskFile to cover validation branch.
    } else if (parsedInput.fixture.taskInputConflict) {
      const taskFileName = "kickoff-task-input.md";
      await writeFile(join(repoPath, taskFileName), `${parsedInput.task}\n`, "utf8");
      kickoffInput.task = parsedInput.task;
      kickoffInput.taskFile = taskFileName;
    } else if (parsedInput.fixture.taskViaFile) {
      const taskFileName = "kickoff-task-input.md";
      const taskFilePath = join(repoPath, taskFileName);
      if (parsedInput.fixture.taskFileDirectory) {
        await mkdir(taskFilePath, { recursive: true });
      } else if (!parsedInput.fixture.taskFileMissing) {
        await writeFile(
          taskFilePath,
          parsedInput.fixture.taskFileEmpty ? "" : `${parsedInput.task}\n`,
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
      taskArtifactContainsTask: taskArtifact.includes(parsedInput.task),
      deliveries
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
