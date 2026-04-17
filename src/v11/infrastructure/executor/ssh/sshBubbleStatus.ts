import { spawn } from "node:child_process";

import { PAIRFLOW_REMOTE_CONFIG_INVALID, loadPairflowGlobalConfig } from "../../../../config/pairflowConfig.js";
import {
  isAgentName,
  isAgentRole,
  isBubbleLifecycleState,
  isBubbleExecutionContextAwaitedOutputType,
  isMetaReviewRuntimeDeliveryStatus,
  type BubbleFailingGate,
  type BubbleLifecycleState,
  type BubbleRoundGateState,
  type BubbleSpecLockState,
  type PairflowRemoteHostConfig
} from "../../../../types/bubble.js";
import {
  isFindingLayer,
  isFindingPriority,
  isFindingTiming
} from "../../../../types/findings.js";
import type { StateValidationDiagnostics } from "../../../shared/ports/stateSnapshots.js";
import { shellQuote } from "../../../shared/foundation/shellQuote.js";
import {
  normalizeMetaReviewRuntimeDeliveryCorrelation
} from "../../../shared/metaReview/metaReviewSnapshot.js";
import {
  type ReviewVerificationState,
  reviewVerificationStates
} from "../../../shared/reviewer/reviewVerification.js";
import type {
  StatusExecutionContextView,
  StatusMetaReviewView,
  StatusPaneActivityView
} from "../../../shared/status/statusCommandViewProjection.js";
import type { WatchdogStatus } from "../../../shared/watchdog/watchdogStatus.js";
import {
  isProtocolMessageType,
  type ProtocolMessageType
} from "../../../../types/protocol.js";
import {
  SchemaValidationError,
  isInteger,
  isRecord
} from "../../../shared/validation/primitives.js";

const sshTransportOptions = [
  ["BatchMode", "yes"],
  ["StrictHostKeyChecking", "yes"],
  ["ConnectTimeout", "10"],
  ["ConnectionAttempts", "1"]
] as const;
const remoteStatusCommandTimeoutMsDefault = 15_000;
export const remoteStatusCommandAbortKillGraceMsDefault = 250;

const runtimeExpectedStates = new Set<BubbleLifecycleState>([
  "RUNNING",
  "WAITING_HUMAN",
  "READY_FOR_HUMAN_APPROVAL",
  "APPROVED_FOR_COMMIT",
  "COMMITTED"
]);

export interface RemoteBubbleStatusTarget {
  alias: string;
  host: string;
  user?: string;
  pairflowCommand: string;
}

export interface RemoteBubbleStatusSnapshot {
  bubbleStartedAt: string | null;
  state: BubbleLifecycleState;
  round: number;
  activeAgent: string | null;
  activeRole: string | null;
  activeSince: string | null;
  lastCommandAt: string | null;
  paneActivity: StatusPaneActivityView;
  executionContext: StatusExecutionContextView | null;
  watchdog: WatchdogStatus;
  pendingInboxItems: {
    humanQuestions: number;
    approvalRequests: number;
    total: number;
  };
  transcript: {
    totalMessages: number;
    lastMessageType: ProtocolMessageType | null;
    lastMessageTs: string | null;
    lastMessageId: string | null;
  };
  metaReview: StatusMetaReviewView;
  accuracyCritical: boolean;
  lastReviewVerification: ReviewVerificationState;
  failingGates: BubbleFailingGate[];
  specLockState: BubbleSpecLockState;
  roundGateState: BubbleRoundGateState;
  stateValidation: StateValidationDiagnostics | null;
  runtimeAvailability: "active" | "inactive" | "missing";
  lastCheckedAt: string;
}

export interface ResolveRemoteBubbleStatusTargetInput {
  bubbleId: string;
  remoteAlias: string;
  expectedHost?: string;
}

export interface ExecuteRemoteBubbleStatusInput {
  bubbleId: string;
  remoteClonePath: string;
  remoteTarget: RemoteBubbleStatusTarget;
}

export interface RemoteBubbleStatusDependencies {
  loadPairflowGlobalConfig?: typeof loadPairflowGlobalConfig;
  runCommand?: (
    command: string,
    args: string[],
    options?: {
      signal?: AbortSignal | undefined;
    }
  ) => Promise<{
    stdout: string;
    stderr: string;
    exitCode: number;
  }>;
  now?: () => Date;
  commandTimeoutMs?: number;
}

export class RemoteBubbleStatusError extends Error {
  public readonly code:
    | "REMOTE_STATUS_CONFIG_INVALID"
    | "REMOTE_STATUS_CONFIG_UNAVAILABLE"
    | "REMOTE_STATUS_TRANSPORT_FAILED"
    | "REMOTE_STATUS_PAYLOAD_INVALID";

  public constructor(input: {
    code:
      | "REMOTE_STATUS_CONFIG_INVALID"
      | "REMOTE_STATUS_CONFIG_UNAVAILABLE"
      | "REMOTE_STATUS_TRANSPORT_FAILED"
      | "REMOTE_STATUS_PAYLOAD_INVALID";
    message: string;
    cause?: unknown;
  }) {
    super(input.message, input.cause === undefined ? undefined : { cause: input.cause });
    this.name = "RemoteBubbleStatusError";
    this.code = input.code;
  }
}

function buildSshTarget(input: { host: string; user?: string }): string {
  return input.user !== undefined ? `${input.user}@${input.host}` : input.host;
}

function buildSshTransportArgs(): string[] {
  return sshTransportOptions.flatMap(([key, value]) => ["-o", `${key}=${value}`]);
}

function buildSshCommandArgs(input: {
  target: string;
  script: string;
}): string[] {
  return [
    ...buildSshTransportArgs(),
    input.target,
    "bash",
    "-c",
    input.script
  ];
}

function assertSingleTokenPairflowCommand(command: string): string {
  if (command.trim().length === 0 || /\s/gu.test(command)) {
    throw new RemoteBubbleStatusError({
      code: "REMOTE_STATUS_CONFIG_INVALID",
      message:
        "Remote pairflow_command must be a single executable token without whitespace."
    });
  }
  return command;
}

function createAbortError(): Error {
  const error = new Error("The operation was aborted.");
  error.name = "AbortError";
  return error;
}

export async function runCommandDefault(
  command: string,
  args: string[],
  options: {
    signal?: AbortSignal | undefined;
  } = {}
): Promise<{
  stdout: string;
  stderr: string;
  exitCode: number;
}> {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";
    let settled = false;
    let forceKillTimer: ReturnType<typeof setTimeout> | null = null;
    const clearForceKillTimer = (): void => {
      if (forceKillTimer === null) {
        return;
      }
      clearTimeout(forceKillTimer);
      forceKillTimer = null;
    };
    const clearAbortListener = (): void => {
      if (options.signal === undefined) {
        return;
      }
      options.signal.removeEventListener("abort", handleAbort);
    };
    const cleanup = (): void => {
      clearForceKillTimer();
      clearAbortListener();
    };
    const resolveOnce = (value: {
      stdout: string;
      stderr: string;
      exitCode: number;
    }): void => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      resolvePromise(value);
    };
    const rejectOnce = (error: unknown): void => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      rejectPromise(
        error instanceof Error ? error : new Error(String(error))
      );
    };
    const rejectAborted = (): void => {
      if (settled) {
        return;
      }
      settled = true;
      clearAbortListener();
      rejectPromise(createAbortError());
    };
    const scheduleForceKill = (): void => {
      if (forceKillTimer !== null) {
        return;
      }
      forceKillTimer = setTimeout(() => {
        forceKillTimer = null;
        if (child.exitCode !== null || child.signalCode !== null) {
          return;
        }
        try {
          child.kill("SIGKILL");
        } catch {
          // Best-effort cleanup for transports that ignore SIGTERM.
        }
      }, remoteStatusCommandAbortKillGraceMsDefault);
      forceKillTimer.unref?.();
    };
    const handleAbort = (): void => {
      try {
        child.kill("SIGTERM");
      } catch {
        // Process may have already exited.
      }
      scheduleForceKill();
      rejectAborted();
    };
    if (options.signal?.aborted === true) {
      handleAbort();
      return;
    }
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.on("error", rejectOnce);
    child.on("close", (exitCode) => {
      cleanup();
      resolveOnce({
        stdout,
        stderr,
        exitCode: exitCode ?? 1
      });
    });
    options.signal?.addEventListener("abort", handleAbort, { once: true });
  });
}

function summarizeTransportOutput(output: string): string {
  const normalized = output.replace(/\s+/gu, " ").trim();
  if (normalized.length === 0) {
    return "<empty>";
  }
  return normalized.slice(0, 200);
}

function asNullableString(value: unknown, path: string): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== "string") {
    throw new RemoteBubbleStatusError({
      code: "REMOTE_STATUS_PAYLOAD_INVALID",
      message: `Remote bubble status payload has invalid ${path}; expected string|null.`
    });
  }
  return value;
}

function asRequiredString(value: unknown, path: string): string {
  const normalized = asNullableString(value, path);
  if (normalized === null) {
    throw new RemoteBubbleStatusError({
      code: "REMOTE_STATUS_PAYLOAD_INVALID",
      message: `Remote bubble status payload has invalid ${path}; expected string.`
    });
  }
  return normalized;
}

function asBoolean(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") {
    throw new RemoteBubbleStatusError({
      code: "REMOTE_STATUS_PAYLOAD_INVALID",
      message: `Remote bubble status payload has invalid ${path}; expected boolean.`
    });
  }
  return value;
}

function asNonNegativeInteger(value: unknown, path: string): number {
  if (!isInteger(value) || value < 0) {
    throw new RemoteBubbleStatusError({
      code: "REMOTE_STATUS_PAYLOAD_INVALID",
      message: `Remote bubble status payload has invalid ${path}; expected integer >= 0.`
    });
  }
  return value;
}

function asNullableNonNegativeInteger(
  value: unknown,
  path: string
): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  return asNonNegativeInteger(value, path);
}

function asPositiveInteger(value: unknown, path: string): number {
  if (!isInteger(value) || value <= 0) {
    throw new RemoteBubbleStatusError({
      code: "REMOTE_STATUS_PAYLOAD_INVALID",
      message: `Remote bubble status payload has invalid ${path}; expected positive integer.`
    });
  }
  return value;
}

function asNullablePositiveInteger(
  value: unknown,
  path: string
): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  return asPositiveInteger(value, path);
}

function asNullableAgentName(
  value: unknown,
  path: string
): WatchdogStatus["monitoredAgent"] {
  const normalized = asNullableString(value, path);
  if (normalized !== null && !isAgentName(normalized)) {
    throw new RemoteBubbleStatusError({
      code: "REMOTE_STATUS_PAYLOAD_INVALID",
      message: `Remote bubble status payload has invalid ${path}; expected agent name|null.`
    });
  }
  return normalized;
}

function asNullableProtocolMessageTypeValue(
  value: unknown,
  path: string
): ProtocolMessageType | null {
  const normalized = asNullableString(value, path);
  if (normalized !== null && !isProtocolMessageType(normalized)) {
    throw new RemoteBubbleStatusError({
      code: "REMOTE_STATUS_PAYLOAD_INVALID",
      message:
        `Remote bubble status payload has invalid ${path}; expected protocol message type|null.`
    });
  }
  return normalized;
}

function asBubbleLifecycleStateValue(
  value: unknown,
  path: string
): BubbleLifecycleState {
  if (!isBubbleLifecycleState(value)) {
    throw new RemoteBubbleStatusError({
      code: "REMOTE_STATUS_PAYLOAD_INVALID",
      message: `Remote bubble status payload has invalid ${path}; expected bubble lifecycle state.`
    });
  }
  return value;
}

function asRecordOrThrow(
  value: unknown,
  path: string
): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new RemoteBubbleStatusError({
      code: "REMOTE_STATUS_PAYLOAD_INVALID",
      message: `Remote bubble status payload has invalid ${path}; expected object.`
    });
  }
  return value;
}

function normalizePaneActivity(value: unknown): StatusPaneActivityView {
  const paneActivity = asRecordOrThrow(value, "paneActivity");
  const readStatus = paneActivity.readStatus;
  if (readStatus !== "ok" && readStatus !== "missing" && readStatus !== "invalid") {
    throw new RemoteBubbleStatusError({
      code: "REMOTE_STATUS_PAYLOAD_INVALID",
      message:
        "Remote bubble status payload has invalid paneActivity.readStatus; expected ok|missing|invalid."
    });
  }
  const lastSampleStatus = paneActivity.lastSampleStatus;
  if (
    lastSampleStatus !== null
    && lastSampleStatus !== undefined
    && lastSampleStatus !== "sampled"
    && lastSampleStatus !== "no_session"
    && lastSampleStatus !== "pane_unreadable"
  ) {
    throw new RemoteBubbleStatusError({
      code: "REMOTE_STATUS_PAYLOAD_INVALID",
      message:
        "Remote bubble status payload has invalid paneActivity.lastSampleStatus."
    });
  }
  return {
    readStatus,
    lastChangedAt: asNullableString(paneActivity.lastChangedAt, "paneActivity.lastChangedAt"),
    sampledAt: asNullableString(paneActivity.sampledAt, "paneActivity.sampledAt"),
    sinceLastChangedSeconds: asNullableNonNegativeInteger(
      paneActivity.sinceLastChangedSeconds,
      "paneActivity.sinceLastChangedSeconds"
    ),
    sinceSampledSeconds: asNullableNonNegativeInteger(
      paneActivity.sinceSampledSeconds,
      "paneActivity.sinceSampledSeconds"
    ),
    lastSampleStatus:
      lastSampleStatus === undefined ? null : lastSampleStatus,
    lastSampleError: asNullableString(
      paneActivity.lastSampleError,
      "paneActivity.lastSampleError"
    ),
    sessionName: asNullableString(paneActivity.sessionName, "paneActivity.sessionName"),
    targetPane: asNullableString(paneActivity.targetPane, "paneActivity.targetPane")
  };
}

function normalizeExecutionContext(value: unknown): StatusExecutionContextView | null {
  if (value === null || value === undefined) {
    return null;
  }
  const executionContext = asRecordOrThrow(value, "executionContext");
  const activeRole = asNullableString(
    executionContext.activeRole,
    "executionContext.activeRole"
  );
  if (activeRole === null || !isAgentRole(activeRole)) {
    throw new RemoteBubbleStatusError({
      code: "REMOTE_STATUS_PAYLOAD_INVALID",
      message:
        "Remote bubble status payload has invalid executionContext.activeRole."
    });
  }
  const awaitedOutputType = asNullableString(
    executionContext.awaitedOutputType,
    "executionContext.awaitedOutputType"
  );
  if (
    awaitedOutputType === null
    || !isBubbleExecutionContextAwaitedOutputType(awaitedOutputType)
  ) {
    throw new RemoteBubbleStatusError({
      code: "REMOTE_STATUS_PAYLOAD_INVALID",
      message:
        "Remote bubble status payload has invalid executionContext.awaitedOutputType."
    });
  }
  const handoffId = asNullableString(
    executionContext.handoffId,
    "executionContext.handoffId"
  );
  const executionId = asNullableString(
    executionContext.executionId,
    "executionContext.executionId"
  );
  const startedAt = asNullableString(
    executionContext.startedAt,
    "executionContext.startedAt"
  );
  const deadlineAt = asNullableString(
    executionContext.deadlineAt,
    "executionContext.deadlineAt"
  );
  if (
    handoffId === null
    || executionId === null
    || startedAt === null
    || deadlineAt === null
  ) {
    throw new RemoteBubbleStatusError({
      code: "REMOTE_STATUS_PAYLOAD_INVALID",
      message:
        "Remote bubble status payload has incomplete executionContext authority."
    });
  }
  return {
    activeRole,
    awaitedOutputType,
    handoffId,
    executionId,
    round: asNonNegativeInteger(executionContext.round, "executionContext.round"),
    startedAt,
    deadlineAt,
    attempt: asPositiveInteger(executionContext.attempt, "executionContext.attempt")
  };
}

function normalizeWatchdog(value: unknown): WatchdogStatus {
  const watchdog = asRecordOrThrow(value, "watchdog");
  return {
    monitored: asBoolean(watchdog.monitored, "watchdog.monitored"),
    monitoredAgent: asNullableAgentName(
      watchdog.monitoredAgent,
      "watchdog.monitoredAgent"
    ),
    timeoutMinutes: asPositiveInteger(
      watchdog.timeoutMinutes,
      "watchdog.timeoutMinutes"
    ),
    referenceTimestamp: asNullableString(
      watchdog.referenceTimestamp,
      "watchdog.referenceTimestamp"
    ),
    deadlineTimestamp: asNullableString(
      watchdog.deadlineTimestamp,
      "watchdog.deadlineTimestamp"
    ),
    remainingSeconds: asNullableNonNegativeInteger(
      watchdog.remainingSeconds,
      "watchdog.remainingSeconds"
    ),
    expired: asBoolean(watchdog.expired, "watchdog.expired")
  };
}

function normalizePendingInboxItems(
  value: unknown
): RemoteBubbleStatusSnapshot["pendingInboxItems"] {
  const pendingInboxItems = asRecordOrThrow(value, "pendingInboxItems");
  return {
    humanQuestions: asNonNegativeInteger(
      pendingInboxItems.humanQuestions,
      "pendingInboxItems.humanQuestions"
    ),
    approvalRequests: asNonNegativeInteger(
      pendingInboxItems.approvalRequests,
      "pendingInboxItems.approvalRequests"
    ),
    total: asNonNegativeInteger(pendingInboxItems.total, "pendingInboxItems.total")
  };
}

function normalizeTranscript(
  value: unknown
): RemoteBubbleStatusSnapshot["transcript"] {
  const transcript = asRecordOrThrow(value, "transcript");
  return {
    totalMessages: asNonNegativeInteger(
      transcript.totalMessages,
      "transcript.totalMessages"
    ),
    lastMessageType: asNullableProtocolMessageTypeValue(
      transcript.lastMessageType,
      "transcript.lastMessageType"
    ),
    lastMessageTs: asNullableString(transcript.lastMessageTs, "transcript.lastMessageTs"),
    lastMessageId: asNullableString(transcript.lastMessageId, "transcript.lastMessageId")
  };
}

function normalizeMetaReview(value: unknown): StatusMetaReviewView {
  const metaReview = asRecordOrThrow(value, "metaReview");
  const actor = asNullableString(metaReview.actor, "metaReview.actor");
  if (actor === null) {
    throw new RemoteBubbleStatusError({
      code: "REMOTE_STATUS_PAYLOAD_INVALID",
      message:
        "Remote bubble status payload is missing metaReview.actor; expected \"meta-reviewer\"."
    });
  }
  if (actor !== "meta-reviewer") {
    throw new RemoteBubbleStatusError({
      code: "REMOTE_STATUS_PAYLOAD_INVALID",
      message:
        "Remote bubble status payload has invalid metaReview.actor; expected \"meta-reviewer\"."
    });
  }
  return {
    actor: "meta-reviewer",
    authorityActive: asBoolean(
      metaReview.authorityActive,
      "metaReview.authorityActive"
    ),
    runtimeDelivery: normalizeRuntimeDelivery(metaReview.runtimeDelivery)
  };
}

function normalizeSpecLockState(value: unknown): BubbleSpecLockState {
  const specLockState = asRecordOrThrow(value, "spec_lock_state");
  const state = asNullableString(specLockState.state, "spec_lock_state.state");
  if (state !== "LOCKED" && state !== "IMPLEMENTABLE") {
    throw new RemoteBubbleStatusError({
      code: "REMOTE_STATUS_PAYLOAD_INVALID",
      message: "Remote bubble status payload has invalid spec_lock_state.state."
    });
  }
  return {
    state,
    open_blocker_count: asNonNegativeInteger(
      specLockState.open_blocker_count,
      "spec_lock_state.open_blocker_count"
    ),
    open_required_now_count: asNonNegativeInteger(
      specLockState.open_required_now_count,
      "spec_lock_state.open_required_now_count"
    )
  };
}

function normalizeRoundGateState(value: unknown): BubbleRoundGateState {
  const roundGateState = asRecordOrThrow(value, "round_gate_state");
  const reasonCode = asNullableString(
    roundGateState.reason_code,
    "round_gate_state.reason_code"
  );
  return {
    applies: asBoolean(roundGateState.applies, "round_gate_state.applies"),
    violated: asBoolean(roundGateState.violated, "round_gate_state.violated"),
    round: asNonNegativeInteger(roundGateState.round, "round_gate_state.round"),
    ...(reasonCode !== null ? { reason_code: reasonCode } : {})
  };
}

function normalizeRuntimeDelivery(
  value: unknown
): StatusMetaReviewView["runtimeDelivery"] {
  if (value === null || value === undefined) {
    return null;
  }
  const runtimeDelivery = asRecordOrThrow(value, "metaReview.runtimeDelivery");
  if (!isMetaReviewRuntimeDeliveryStatus(runtimeDelivery.status)) {
    throw new RemoteBubbleStatusError({
      code: "REMOTE_STATUS_PAYLOAD_INVALID",
      message:
        "Remote bubble status payload has invalid metaReview.runtimeDelivery.status."
    });
  }
  const observedForHandoffId = asNullableString(
    runtimeDelivery.observedForHandoffId,
    "metaReview.runtimeDelivery.observedForHandoffId"
  );
  const observedForRound = asNullablePositiveInteger(
    runtimeDelivery.observedForRound,
    "metaReview.runtimeDelivery.observedForRound"
  );
  const correlation = normalizeMetaReviewRuntimeDeliveryCorrelation({
    observedForHandoffId,
    observedForRound
  });
  if (
    correlation.observedForHandoffId !== observedForHandoffId
    || correlation.observedForRound !== observedForRound
  ) {
    throw new RemoteBubbleStatusError({
      code: "REMOTE_STATUS_PAYLOAD_INVALID",
      message:
        "Remote bubble status payload has inconsistent metaReview.runtimeDelivery correlation fields."
    });
  }
  return {
    status: runtimeDelivery.status,
    reasonCode: asNullableString(
      runtimeDelivery.reasonCode,
      "metaReview.runtimeDelivery.reasonCode"
    ),
    message: asRequiredString(
      runtimeDelivery.message,
      "metaReview.runtimeDelivery.message"
    ),
    observedAt: asRequiredString(
      runtimeDelivery.observedAt,
      "metaReview.runtimeDelivery.observedAt"
    ),
    observedForHandoffId: correlation.observedForHandoffId,
    observedForRound: correlation.observedForRound
  };
}

function normalizeStringArray(
  value: unknown,
  path: string
): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!Array.isArray(value)) {
    throw new RemoteBubbleStatusError({
      code: "REMOTE_STATUS_PAYLOAD_INVALID",
      message: `Remote bubble status payload has invalid ${path}; expected string array.`
    });
  }
  return value.map((entry, index) => {
    return asRequiredString(entry, `${path}[${index}]`);
  });
}

function normalizeFailingGates(value: unknown): BubbleFailingGate[] {
  if (!Array.isArray(value)) {
    throw new RemoteBubbleStatusError({
      code: "REMOTE_STATUS_PAYLOAD_INVALID",
      message: "Remote bubble status payload has invalid failing_gates; expected array."
    });
  }
  return value.map((entry, index) => {
    const gate = asRecordOrThrow(entry, `failing_gates[${index}]`);
    const priority = gate.priority;
    if (!isFindingPriority(priority)) {
      throw new RemoteBubbleStatusError({
        code: "REMOTE_STATUS_PAYLOAD_INVALID",
        message:
          `Remote bubble status payload has invalid failing_gates[${index}].priority.`
      });
    }
    const timing = gate.timing;
    if (!isFindingTiming(timing)) {
      throw new RemoteBubbleStatusError({
        code: "REMOTE_STATUS_PAYLOAD_INVALID",
        message:
          `Remote bubble status payload has invalid failing_gates[${index}].timing.`
      });
    }
    const layer = gate.layer;
    const evidenceRefs = normalizeStringArray(
      gate.evidence_refs,
      `failing_gates[${index}].evidence_refs`
    );
    if (layer !== undefined && !isFindingLayer(layer)) {
      throw new RemoteBubbleStatusError({
        code: "REMOTE_STATUS_PAYLOAD_INVALID",
        message:
          `Remote bubble status payload has invalid failing_gates[${index}].layer.`
      });
    }
    const signalLevel = gate.signal_level;
    if (
      signalLevel !== undefined
      && signalLevel !== "warning"
      && signalLevel !== "info"
    ) {
      throw new RemoteBubbleStatusError({
        code: "REMOTE_STATUS_PAYLOAD_INVALID",
        message:
          `Remote bubble status payload has invalid failing_gates[${index}].signal_level.`
      });
    }
    const effectivePriority = gate.effective_priority;
    if (
      effectivePriority !== undefined
      && !isFindingPriority(effectivePriority)
    ) {
      throw new RemoteBubbleStatusError({
        code: "REMOTE_STATUS_PAYLOAD_INVALID",
        message:
          `Remote bubble status payload has invalid failing_gates[${index}].effective_priority.`
      });
    }

    return {
      gate_id: asRequiredString(
        gate.gate_id,
        `failing_gates[${index}].gate_id`
      ),
      reason_code: asRequiredString(
        gate.reason_code,
        `failing_gates[${index}].reason_code`
      ),
      message: asRequiredString(
        gate.message,
        `failing_gates[${index}].message`
      ),
      priority,
      timing,
      ...(layer !== undefined ? { layer } : {}),
      ...(evidenceRefs !== undefined ? { evidence_refs: evidenceRefs } : {}),
      ...(signalLevel !== undefined ? { signal_level: signalLevel } : {}),
      ...(effectivePriority !== undefined
        ? { effective_priority: effectivePriority }
        : {})
    };
  });
}

function normalizeStateValidation(
  value: unknown
): StateValidationDiagnostics | null {
  if (value === null || value === undefined) {
    return null;
  }
  const stateValidation = asRecordOrThrow(value, "stateValidation");
  if (!Array.isArray(stateValidation.errors)) {
    throw new RemoteBubbleStatusError({
      code: "REMOTE_STATUS_PAYLOAD_INVALID",
      message: "Remote bubble status payload has invalid stateValidation.errors."
    });
  }
  return {
    message: asRequiredString(stateValidation.message, "stateValidation.message"),
    errors: stateValidation.errors.map((entry, index) => {
      const error = asRecordOrThrow(entry, `stateValidation.errors[${index}]`);
      return {
        path: asRequiredString(
          error.path,
          `stateValidation.errors[${index}].path`
        ),
        message: asRequiredString(
          error.message,
          `stateValidation.errors[${index}].message`
        )
      };
    })
  };
}

function normalizeReviewVerificationState(
  value: unknown
): ReviewVerificationState {
  const normalized = asNullableString(
    value,
    "last_review_verification"
  );
  if (normalized === null) {
    return "missing";
  }
  if (!isReviewVerificationState(normalized)) {
    throw new RemoteBubbleStatusError({
      code: "REMOTE_STATUS_PAYLOAD_INVALID",
      message:
        "Remote bubble status payload has invalid last_review_verification."
    });
  }
  return normalized;
}

function isReviewVerificationState(value: string): value is ReviewVerificationState {
  return reviewVerificationStates.some((state) => state === value);
}

function inferRuntimeAvailability(input: {
  state: BubbleLifecycleState;
  paneActivity: StatusPaneActivityView;
  watchdog: WatchdogStatus;
}): RemoteBubbleStatusSnapshot["runtimeAvailability"] {
  if (!runtimeExpectedStates.has(input.state)) {
    return "inactive";
  }
  if (
    input.watchdog.expired
    || input.paneActivity.lastSampleStatus !== "sampled"
    || input.paneActivity.sessionName === null
    || input.paneActivity.targetPane === null
    || input.paneActivity.sampledAt === null
    || input.paneActivity.lastChangedAt === null
    || (
      input.watchdog.monitored
      && input.watchdog.monitoredAgent === null
    )
    || input.paneActivity.readStatus !== "ok"
  ) {
    return "missing";
  }
  return "active";
}

function normalizeRemoteBubbleStatusSnapshot(input: {
  payload: unknown;
  lastCheckedAt: string;
}): RemoteBubbleStatusSnapshot {
  const payload = asRecordOrThrow(input.payload, "$");
  const state = asBubbleLifecycleStateValue(payload.state, "state");
  const paneActivity = normalizePaneActivity(payload.paneActivity);
  const watchdog = normalizeWatchdog(payload.watchdog);

  return {
    bubbleStartedAt: asNullableString(payload.bubbleStartedAt, "bubbleStartedAt"),
    state,
    round: asNonNegativeInteger(payload.round, "round"),
    activeAgent: asNullableString(payload.activeAgent, "activeAgent"),
    activeRole: asNullableString(payload.activeRole, "activeRole"),
    activeSince: asNullableString(payload.activeSince, "activeSince"),
    lastCommandAt: asNullableString(payload.lastCommandAt, "lastCommandAt"),
    paneActivity,
    executionContext: normalizeExecutionContext(payload.executionContext),
    watchdog,
    pendingInboxItems: normalizePendingInboxItems(payload.pendingInboxItems),
    transcript: normalizeTranscript(payload.transcript),
    metaReview: normalizeMetaReview(payload.metaReview),
    accuracyCritical: asBoolean(payload.accuracy_critical, "accuracy_critical"),
    lastReviewVerification: normalizeReviewVerificationState(
      payload.last_review_verification
    ),
    failingGates: normalizeFailingGates(payload.failing_gates),
    specLockState: normalizeSpecLockState(payload.spec_lock_state),
    roundGateState: normalizeRoundGateState(payload.round_gate_state),
    stateValidation: normalizeStateValidation(payload.stateValidation),
    runtimeAvailability: inferRuntimeAvailability({
      state,
      paneActivity,
      watchdog
    }),
    lastCheckedAt: input.lastCheckedAt
  };
}

function resolveRemoteHostConfig(input: {
  remoteAlias: string;
  globalConfig: { remotes?: Record<string, PairflowRemoteHostConfig> };
}): PairflowRemoteHostConfig {
  const remoteConfig = input.globalConfig.remotes?.[input.remoteAlias];
  if (remoteConfig === undefined) {
    throw new RemoteBubbleStatusError({
      code: "REMOTE_STATUS_CONFIG_INVALID",
      message:
        `${PAIRFLOW_REMOTE_CONFIG_INVALID}: Remote "${input.remoteAlias}" is not defined in the global [remotes.<name>] config.`
    });
  }
  return remoteConfig;
}

export async function resolveRemoteBubbleStatusTarget(
  input: ResolveRemoteBubbleStatusTargetInput,
  dependencies: Pick<RemoteBubbleStatusDependencies, "loadPairflowGlobalConfig"> = {}
): Promise<RemoteBubbleStatusTarget> {
  const loadGlobalConfig =
    dependencies.loadPairflowGlobalConfig ?? loadPairflowGlobalConfig;

  let globalConfig;
  try {
    globalConfig = await loadGlobalConfig();
  } catch (error) {
    if (error instanceof SchemaValidationError) {
      const message = error.message.startsWith(`${PAIRFLOW_REMOTE_CONFIG_INVALID}:`)
        ? error.message
        : `${PAIRFLOW_REMOTE_CONFIG_INVALID}: ${error.message}`;
      throw new RemoteBubbleStatusError({
        code: "REMOTE_STATUS_CONFIG_INVALID",
        message,
        cause: error
      });
    }
    const reason = error instanceof Error ? error.message : String(error);
    throw new RemoteBubbleStatusError({
      code: "REMOTE_STATUS_CONFIG_UNAVAILABLE",
      message:
        `Failed to load global Pairflow config for remote status of ${input.bubbleId}: ${reason}`,
      cause: error
    });
  }

  const remoteConfig = resolveRemoteHostConfig({
    remoteAlias: input.remoteAlias,
    globalConfig
  });
  if (input.expectedHost !== undefined && remoteConfig.host !== input.expectedHost) {
    throw new RemoteBubbleStatusError({
      code: "REMOTE_STATUS_CONFIG_INVALID",
      message:
        `Remote status for ${input.bubbleId} refused host mismatch: pointer host `
        + `(${input.expectedHost}) does not match configured execution host `
        + `(${remoteConfig.host}).`
    });
  }

  return {
    alias: input.remoteAlias,
    host: remoteConfig.host,
    ...(remoteConfig.user !== undefined ? { user: remoteConfig.user } : {}),
    pairflowCommand: assertSingleTokenPairflowCommand(
      remoteConfig.pairflow_command ?? "pairflow"
    )
  };
}

export async function executeRemoteBubbleStatus(
  input: ExecuteRemoteBubbleStatusInput,
  dependencies: Omit<RemoteBubbleStatusDependencies, "loadPairflowGlobalConfig"> = {}
): Promise<RemoteBubbleStatusSnapshot> {
  const target = buildSshTarget({
    host: input.remoteTarget.host,
    ...(input.remoteTarget.user !== undefined
      ? { user: input.remoteTarget.user }
      : {})
  });
  const runCommand = dependencies.runCommand ?? runCommandDefault;
  const now = dependencies.now ?? (() => new Date());
  const commandTimeoutMs =
    dependencies.commandTimeoutMs ?? remoteStatusCommandTimeoutMsDefault;
  const script = [
    `cd ${shellQuote(input.remoteClonePath)}`,
    `${shellQuote(input.remoteTarget.pairflowCommand)} bubble status --id ${shellQuote(input.bubbleId)} --repo ${shellQuote(input.remoteClonePath)} --json`
  ].join(" && ");

  const abortController = new AbortController();
  let timedOut = false;
  const timeoutHandle = setTimeout(() => {
    timedOut = true;
    abortController.abort();
  }, commandTimeoutMs);

  let result;
  try {
    result = await runCommand(
      "ssh",
      buildSshCommandArgs({
        target,
        script
      }),
      {
        signal: abortController.signal
      }
    );
  } catch (error) {
    if (timedOut) {
      throw new RemoteBubbleStatusError({
        code: "REMOTE_STATUS_TRANSPORT_FAILED",
        message:
          `Remote status transport timed out for ${input.bubbleId} on ${input.remoteTarget.alias} `
          + `after ${commandTimeoutMs}ms.`,
        cause: error
      });
    }
    const reason = error instanceof Error ? error.message : String(error);
    throw new RemoteBubbleStatusError({
      code: "REMOTE_STATUS_TRANSPORT_FAILED",
      message:
        `Remote status transport failed for ${input.bubbleId} on ${input.remoteTarget.alias}: `
        + summarizeTransportOutput(reason),
      cause: error
    });
  } finally {
    clearTimeout(timeoutHandle);
  }

  if (result.exitCode !== 0) {
    throw new RemoteBubbleStatusError({
      code: "REMOTE_STATUS_TRANSPORT_FAILED",
      message:
        `Remote status transport failed for ${input.bubbleId} on ${input.remoteTarget.alias}: `
        + summarizeTransportOutput(result.stderr.trim().length > 0 ? result.stderr : result.stdout)
    });
  }

  const stdout = result.stdout.trim();
  let payload: unknown;
  try {
    payload = JSON.parse(stdout);
  } catch (error) {
    throw new RemoteBubbleStatusError({
      code: "REMOTE_STATUS_PAYLOAD_INVALID",
      message:
        `Remote status for ${input.bubbleId} returned invalid JSON: ${summarizeTransportOutput(stdout)}`,
      cause: error
    });
  }

  return normalizeRemoteBubbleStatusSnapshot({
    payload,
    lastCheckedAt: now().toISOString()
  });
}
