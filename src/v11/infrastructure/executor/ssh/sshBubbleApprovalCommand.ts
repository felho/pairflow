import type { BubbleStateSnapshot } from "../../../../types/bubble.js";
import type { ProtocolEnvelope } from "../../../../types/protocol.js";
import { shellQuote } from "../../../shared/foundation/shellQuote.js";
import { parseEnvelopeLine } from "../../../shared/protocol/envelope.js";
import { assertValidBubbleStateSnapshot } from "../../../shared/state/stateSchema.js";
import type { RemoteBubbleStatusTarget } from "./sshBubbleStatus.js";
import { runCommandDefault } from "./sshBubbleStatus.js";
import {
  assertSingleTokenPairflowCommand,
  buildSshCommandArgs
} from "./sshBubbleStart.js";

const remoteApprovalBeforeStateStartMarker =
  "__PAIRFLOW_REMOTE_APPROVAL_BEFORE_STATE_START__";
const remoteApprovalBeforeStateEndMarker =
  "__PAIRFLOW_REMOTE_APPROVAL_BEFORE_STATE_END__";
const remoteApprovalAfterStateStartMarker =
  "__PAIRFLOW_REMOTE_APPROVAL_AFTER_STATE_START__";
const remoteApprovalAfterStateEndMarker =
  "__PAIRFLOW_REMOTE_APPROVAL_AFTER_STATE_END__";
const remoteApprovalTranscriptCountStartMarker =
  "__PAIRFLOW_REMOTE_APPROVAL_TRANSCRIPT_COUNT_START__";
const remoteApprovalTranscriptCountEndMarker =
  "__PAIRFLOW_REMOTE_APPROVAL_TRANSCRIPT_COUNT_END__";
const remoteApprovalTranscriptLineStartMarker =
  "__PAIRFLOW_REMOTE_APPROVAL_TRANSCRIPT_LINE_START__";
const remoteApprovalTranscriptLineEndMarker =
  "__PAIRFLOW_REMOTE_APPROVAL_TRANSCRIPT_LINE_END__";

export type RemoteBubbleApprovalCommandAction = "approve" | "request-rework";

interface RemoteBubbleApprovalCommandBaseInput {
  bubbleId: string;
  remoteClonePath: string;
  remoteTarget: RemoteBubbleStatusTarget;
  refs: string[];
}

export interface ExecuteRemoteBubbleApproveCommandInput
  extends RemoteBubbleApprovalCommandBaseInput {
  action: "approve";
  overrideNonApprove: boolean;
  overrideReason?: string;
}

export interface ExecuteRemoteBubbleRequestReworkCommandInput
  extends RemoteBubbleApprovalCommandBaseInput {
  action: "request-rework";
  message: string;
}

export type ExecuteRemoteBubbleApprovalCommandInput =
  | ExecuteRemoteBubbleApproveCommandInput
  | ExecuteRemoteBubbleRequestReworkCommandInput;

export interface RemoteBubbleApprovalDecisionResult {
  kind: "decision";
  bubbleId: string;
  sequence: number;
  envelope: ProtocolEnvelope;
  state: BubbleStateSnapshot;
}

export interface RemoteBubbleApprovalQueuedReworkResult {
  kind: "queued_rework";
  bubbleId: string;
  intentId: string;
  state: BubbleStateSnapshot;
  supersededIntentId?: string;
}

export type ExecuteRemoteBubbleApprovalCommandResult =
  | RemoteBubbleApprovalDecisionResult
  | RemoteBubbleApprovalQueuedReworkResult;

export interface RemoteBubbleApprovalCommandDependencies {
  runCommand?: (
    command: string,
    args: string[]
  ) => Promise<{
    stdout: string;
    stderr: string;
    exitCode: number;
  }>;
}

export class RemoteBubbleApprovalCommandError extends Error {
  public readonly code:
    | "REMOTE_APPROVAL_TRANSPORT_FAILED"
    | "REMOTE_APPROVAL_PAYLOAD_INVALID";

  public constructor(input: {
    code:
      | "REMOTE_APPROVAL_TRANSPORT_FAILED"
      | "REMOTE_APPROVAL_PAYLOAD_INVALID";
    message: string;
    cause?: unknown;
  }) {
    super(input.message, input.cause === undefined ? undefined : { cause: input.cause });
    this.name = "RemoteBubbleApprovalCommandError";
    this.code = input.code;
  }
}

function buildRemoteBubbleApprovalCommandLine(
  input: ExecuteRemoteBubbleApprovalCommandInput
): string {
  const pairflowCommand = assertSingleTokenPairflowCommand(
    input.remoteTarget.pairflowCommand
  );
  const args =
    input.action === "approve"
      ? [
          pairflowCommand,
          "bubble",
          "approve",
          "--id",
          input.bubbleId,
          "--repo",
          input.remoteClonePath,
          ...(input.overrideNonApprove ? ["--override-non-approve"] : []),
          ...(input.overrideReason !== undefined
            ? ["--override-reason", input.overrideReason]
            : []),
          ...input.refs.flatMap((ref) => ["--ref", ref])
        ]
      : [
          pairflowCommand,
          "bubble",
          "request-rework",
          "--id",
          input.bubbleId,
          "--message",
          input.message,
          "--repo",
          input.remoteClonePath,
          ...input.refs.flatMap((ref) => ["--ref", ref])
        ];

  return args.map((value) => shellQuote(value)).join(" ");
}

export function buildRemoteBubbleApprovalScript(
  input: ExecuteRemoteBubbleApprovalCommandInput
): string {
  const bubbleDir = `${input.remoteClonePath}/.pairflow/bubbles/${input.bubbleId}`;
  const statePath = `${bubbleDir}/state.json`;
  const transcriptPath = `${bubbleDir}/transcript.ndjson`;
  const remoteCommandLine = buildRemoteBubbleApprovalCommandLine(input);

  return [
    "set -euo pipefail",
    `cd ${shellQuote(input.remoteClonePath)}`,
    `export PAIRFLOW_WORKTREE_ROOT=${shellQuote(input.remoteClonePath)}`,
    `printf '%s\\n' ${shellQuote(remoteApprovalBeforeStateStartMarker)}`,
    `cat ${shellQuote(statePath)}`,
    `printf '%s\\n' ${shellQuote(remoteApprovalBeforeStateEndMarker)}`,
    remoteCommandLine,
    `printf '%s\\n' ${shellQuote(remoteApprovalAfterStateStartMarker)}`,
    `cat ${shellQuote(statePath)}`,
    `printf '%s\\n' ${shellQuote(remoteApprovalAfterStateEndMarker)}`,
    `printf '%s\\n' ${shellQuote(remoteApprovalTranscriptCountStartMarker)}`,
    `if [ -f ${shellQuote(transcriptPath)} ]; then wc -l < ${shellQuote(transcriptPath)}; else printf '0\\n'; fi`,
    `printf '%s\\n' ${shellQuote(remoteApprovalTranscriptCountEndMarker)}`,
    `printf '%s\\n' ${shellQuote(remoteApprovalTranscriptLineStartMarker)}`,
    `if [ -f ${shellQuote(transcriptPath)} ]; then tail -n 1 ${shellQuote(transcriptPath)}; fi`,
    `printf '%s\\n' ${shellQuote(remoteApprovalTranscriptLineEndMarker)}`
  ].join("\n");
}

function summarizeTransportOutput(output: string): string {
  const normalized = output.replace(/\s+/gu, " ").trim();
  if (normalized.length === 0) {
    return "<empty>";
  }
  return normalized.slice(0, 200);
}

function describeTransportFailure(input: {
  exitCode: number;
  stdout: string;
  stderr: string;
}): string {
  const detailSource = input.stderr.trim().length > 0 ? input.stderr : input.stdout;
  return `ssh transport failed (exit ${input.exitCode}): ${summarizeTransportOutput(detailSource)}`;
}

function escapeRegExpLiteral(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function extractMarkerPayload(input: {
  stdout: string;
  startMarker: string;
  endMarker: string;
  label: string;
}): string {
  const pattern = new RegExp(
    `${escapeRegExpLiteral(input.startMarker)}\\n([\\s\\S]*?)\\n${escapeRegExpLiteral(input.endMarker)}`,
    "gu"
  );
  const matches = [...input.stdout.matchAll(pattern)];
  if (matches.length !== 1) {
    throw new RemoteBubbleApprovalCommandError({
      code: "REMOTE_APPROVAL_PAYLOAD_INVALID",
      message:
        `Remote approval returned stdout without exactly one ${input.label} marker envelope.`
    });
  }
  return matches[0]?.[1] ?? "";
}

function parseRemoteBubbleState(input: {
  raw: string;
  bubbleId: string;
  label: string;
}): BubbleStateSnapshot {
  let parsed: unknown;
  try {
    parsed = JSON.parse(input.raw) as unknown;
  } catch (error) {
    throw new RemoteBubbleApprovalCommandError({
      code: "REMOTE_APPROVAL_PAYLOAD_INVALID",
      message:
        `Remote approval returned invalid ${input.label} state JSON for bubble ${input.bubbleId}.`,
      cause: error
    });
  }

  try {
    return assertValidBubbleStateSnapshot(parsed);
  } catch (error) {
    throw new RemoteBubbleApprovalCommandError({
      code: "REMOTE_APPROVAL_PAYLOAD_INVALID",
      message:
        `Remote approval returned invalid ${input.label} state payload for bubble ${input.bubbleId}.`,
      cause: error
    });
  }
}

function parseTranscriptLineCount(input: {
  raw: string;
  bubbleId: string;
}): number {
  const trimmed = input.raw.trim();
  if (!/^\d+$/u.test(trimmed)) {
    throw new RemoteBubbleApprovalCommandError({
      code: "REMOTE_APPROVAL_PAYLOAD_INVALID",
      message:
        `Remote approval returned invalid transcript line count for bubble ${input.bubbleId}: ${trimmed || "<empty>"}.`
    });
  }
  return Number.parseInt(trimmed, 10);
}

function normalizeIntentRefs(refs: string[] | undefined): string[] {
  return refs ?? [];
}

function refsMatch(expected: string[], actual: string[]): boolean {
  return (
    expected.length === actual.length
    && expected.every((ref, index) => actual[index] === ref)
  );
}

function expectedDecisionState(
  decision: "approve" | "rework"
): BubbleStateSnapshot["state"] {
  return decision === "approve" ? "APPROVED_FOR_COMMIT" : "RUNNING";
}

function normalizeEnvelopeMetadata(
  envelope: ProtocolEnvelope,
  bubbleId: string
): Record<string, unknown> {
  const metadata = envelope.payload.metadata;
  if (metadata === null || metadata === undefined) {
    return {};
  }
  if (typeof metadata !== "object") {
    throw new RemoteBubbleApprovalCommandError({
      code: "REMOTE_APPROVAL_PAYLOAD_INVALID",
      message:
        `Remote approval returned invalid metadata payload for bubble ${bubbleId}.`
    });
  }
  return metadata;
}

function normalizeDecisionResult(input: {
  bubbleId: string;
  expectedDecision: "approve" | "rework";
  expectedMessage?: string;
  expectedRefs: string[];
  expectedOverrideNonApprove?: boolean;
  expectedOverrideReason?: string;
  transcriptLine: string;
  transcriptLineCount: number;
  state: BubbleStateSnapshot;
}): RemoteBubbleApprovalDecisionResult {
  let envelope: ProtocolEnvelope;
  try {
    envelope = parseEnvelopeLine(input.transcriptLine);
  } catch (error) {
    throw new RemoteBubbleApprovalCommandError({
      code: "REMOTE_APPROVAL_PAYLOAD_INVALID",
      message:
        `Remote approval returned an invalid approval decision transcript line for bubble ${input.bubbleId}.`,
      cause: error
    });
  }

  if (envelope.bubble_id !== input.bubbleId || envelope.type !== "APPROVAL_DECISION") {
    throw new RemoteBubbleApprovalCommandError({
      code: "REMOTE_APPROVAL_PAYLOAD_INVALID",
      message:
        `Remote approval returned a non-approval transcript tail for bubble ${input.bubbleId}.`
    });
  }

  if (envelope.payload.decision !== input.expectedDecision) {
    throw new RemoteBubbleApprovalCommandError({
      code: "REMOTE_APPROVAL_PAYLOAD_INVALID",
      message:
        `Remote approval returned decision '${String(envelope.payload.decision)}' but expected '${input.expectedDecision}' for bubble ${input.bubbleId}.`
    });
  }

  if (!refsMatch(input.expectedRefs, envelope.refs)) {
    throw new RemoteBubbleApprovalCommandError({
      code: "REMOTE_APPROVAL_PAYLOAD_INVALID",
      message:
        `Remote approval returned unexpected refs for bubble ${input.bubbleId}.`
    });
  }

  const actualMessage = envelope.payload.message;
  if (actualMessage !== input.expectedMessage) {
    throw new RemoteBubbleApprovalCommandError({
      code: "REMOTE_APPROVAL_PAYLOAD_INVALID",
      message:
        `Remote approval returned an unexpected decision message for bubble ${input.bubbleId}.`
    });
  }

  const metadata = normalizeEnvelopeMetadata(envelope, input.bubbleId);
  if (metadata.delivery_target_role !== "status") {
    throw new RemoteBubbleApprovalCommandError({
      code: "REMOTE_APPROVAL_PAYLOAD_INVALID",
      message:
        `Remote approval returned invalid delivery_target_role metadata for bubble ${input.bubbleId}.`
    });
  }

  if (input.expectedDecision === "approve") {
    const actualOverrideNonApprove = metadata.override_non_approve;
    if ((input.expectedOverrideNonApprove ?? false) === true) {
      if (actualOverrideNonApprove !== true) {
        throw new RemoteBubbleApprovalCommandError({
          code: "REMOTE_APPROVAL_PAYLOAD_INVALID",
          message:
            `Remote approval did not preserve override_non_approve metadata for bubble ${input.bubbleId}.`
        });
      }
      if (metadata.override_reason !== input.expectedOverrideReason) {
        throw new RemoteBubbleApprovalCommandError({
          code: "REMOTE_APPROVAL_PAYLOAD_INVALID",
          message:
            `Remote approval did not preserve override_reason metadata for bubble ${input.bubbleId}.`
        });
      }
    } else if (
      actualOverrideNonApprove !== undefined
      || metadata.override_reason !== undefined
    ) {
      throw new RemoteBubbleApprovalCommandError({
        code: "REMOTE_APPROVAL_PAYLOAD_INVALID",
        message:
          `Remote approval returned unexpected override metadata for bubble ${input.bubbleId}.`
      });
    }
  }

  const expectedState = expectedDecisionState(input.expectedDecision);
  if (input.state.state !== expectedState) {
    throw new RemoteBubbleApprovalCommandError({
      code: "REMOTE_APPROVAL_PAYLOAD_INVALID",
      message:
        `Remote approval returned state '${input.state.state}' but expected '${expectedState}' after '${input.expectedDecision}' for bubble ${input.bubbleId}.`
    });
  }

  return {
    kind: "decision",
    bubbleId: input.bubbleId,
    sequence: input.transcriptLineCount,
    envelope,
    state: input.state
  };
}

function normalizeQueuedReworkResult(input: {
  bubbleId: string;
  beforeState: BubbleStateSnapshot;
  afterState: BubbleStateSnapshot;
  expectedMessage: string;
  expectedRefs: string[];
}): RemoteBubbleApprovalQueuedReworkResult {
  if (input.afterState.state !== "WAITING_HUMAN") {
    throw new RemoteBubbleApprovalCommandError({
      code: "REMOTE_APPROVAL_PAYLOAD_INVALID",
      message:
        `Remote request-rework returned state '${input.afterState.state}' but expected 'WAITING_HUMAN' for bubble ${input.bubbleId}.`
    });
  }

  const pendingIntent = input.afterState.pending_rework_intent;
  if (pendingIntent === null || pendingIntent === undefined) {
    throw new RemoteBubbleApprovalCommandError({
      code: "REMOTE_APPROVAL_PAYLOAD_INVALID",
      message:
        `Remote request-rework did not leave a pending rework intent for bubble ${input.bubbleId}.`
    });
  }

  if (pendingIntent.status !== "pending") {
    throw new RemoteBubbleApprovalCommandError({
      code: "REMOTE_APPROVAL_PAYLOAD_INVALID",
      message:
        `Remote request-rework left intent '${pendingIntent.intent_id}' in status '${pendingIntent.status}' instead of 'pending' for bubble ${input.bubbleId}.`
    });
  }

  if (pendingIntent.requested_by !== "human:request-rework") {
    throw new RemoteBubbleApprovalCommandError({
      code: "REMOTE_APPROVAL_PAYLOAD_INVALID",
      message:
        `Remote request-rework left intent '${pendingIntent.intent_id}' with unexpected requested_by '${pendingIntent.requested_by}' for bubble ${input.bubbleId}.`
    });
  }

  if (pendingIntent.message !== input.expectedMessage) {
    throw new RemoteBubbleApprovalCommandError({
      code: "REMOTE_APPROVAL_PAYLOAD_INVALID",
      message:
        `Remote request-rework left intent '${pendingIntent.intent_id}' with an unexpected message for bubble ${input.bubbleId}.`
    });
  }

  const pendingRefs = normalizeIntentRefs(pendingIntent.refs);
  if (!refsMatch(input.expectedRefs, pendingRefs)) {
    throw new RemoteBubbleApprovalCommandError({
      code: "REMOTE_APPROVAL_PAYLOAD_INVALID",
      message:
        `Remote request-rework left intent '${pendingIntent.intent_id}' with unexpected refs for bubble ${input.bubbleId}.`
    });
  }

  const previousPendingIntent = input.beforeState.pending_rework_intent ?? null;
  if (previousPendingIntent !== null) {
    if (previousPendingIntent.intent_id === pendingIntent.intent_id) {
      throw new RemoteBubbleApprovalCommandError({
        code: "REMOTE_APPROVAL_PAYLOAD_INVALID",
        message:
          `Remote request-rework did not create a new pending intent for bubble ${input.bubbleId}.`
      });
    }

    const supersededEntry = (input.afterState.rework_intent_history ?? []).find(
      (entry) => entry.intent_id === previousPendingIntent.intent_id
    );
    if (
      supersededEntry?.status !== "superseded"
      || supersededEntry.superseded_by_intent_id !== pendingIntent.intent_id
    ) {
      throw new RemoteBubbleApprovalCommandError({
        code: "REMOTE_APPROVAL_PAYLOAD_INVALID",
        message:
          `Remote request-rework did not record supersession for prior pending intent '${previousPendingIntent.intent_id}' in bubble ${input.bubbleId}.`
      });
    }
  }

  const supersededIntentId =
    previousPendingIntent !== null
    && previousPendingIntent.intent_id !== pendingIntent.intent_id
      ? previousPendingIntent.intent_id
      : undefined;

  return {
    kind: "queued_rework",
    bubbleId: input.bubbleId,
    intentId: pendingIntent.intent_id,
    state: input.afterState,
    ...(supersededIntentId !== undefined ? { supersededIntentId } : {})
  };
}

export async function executeRemoteBubbleApprovalCommand(
  input: ExecuteRemoteBubbleApprovalCommandInput,
  dependencies: RemoteBubbleApprovalCommandDependencies = {}
): Promise<ExecuteRemoteBubbleApprovalCommandResult> {
  const runCommand = dependencies.runCommand ?? runCommandDefault;
  const script = buildRemoteBubbleApprovalScript(input);
  const target =
    input.remoteTarget.user !== undefined
      ? `${input.remoteTarget.user}@${input.remoteTarget.host}`
      : input.remoteTarget.host;
  let result;
  try {
    result = await runCommand("ssh", buildSshCommandArgs({ target, script }));
  } catch (error) {
    if (error instanceof RemoteBubbleApprovalCommandError) {
      throw error;
    }
    const reason = error instanceof Error ? error.message : String(error);
    throw new RemoteBubbleApprovalCommandError({
      code: "REMOTE_APPROVAL_TRANSPORT_FAILED",
      message:
        `ssh transport failed before completion: ${summarizeTransportOutput(reason)}`,
      cause: error
    });
  }

  if (result.exitCode !== 0) {
    throw new RemoteBubbleApprovalCommandError({
      code: "REMOTE_APPROVAL_TRANSPORT_FAILED",
      message: describeTransportFailure({
        exitCode: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr
      })
    });
  }

  const beforeState = parseRemoteBubbleState({
    raw: extractMarkerPayload({
      stdout: result.stdout,
      startMarker: remoteApprovalBeforeStateStartMarker,
      endMarker: remoteApprovalBeforeStateEndMarker,
      label: "before-state"
    }),
    bubbleId: input.bubbleId,
    label: "before"
  });
  const afterState = parseRemoteBubbleState({
    raw: extractMarkerPayload({
      stdout: result.stdout,
      startMarker: remoteApprovalAfterStateStartMarker,
      endMarker: remoteApprovalAfterStateEndMarker,
      label: "after-state"
    }),
    bubbleId: input.bubbleId,
    label: "after"
  });

  if (input.action === "request-rework" && beforeState.state === "WAITING_HUMAN") {
    return normalizeQueuedReworkResult({
      bubbleId: input.bubbleId,
      beforeState,
      afterState,
      expectedMessage: input.message,
      expectedRefs: input.refs
    });
  }

  const transcriptLineCount = parseTranscriptLineCount({
    raw: extractMarkerPayload({
      stdout: result.stdout,
      startMarker: remoteApprovalTranscriptCountStartMarker,
      endMarker: remoteApprovalTranscriptCountEndMarker,
      label: "transcript-count"
    }),
    bubbleId: input.bubbleId
  });
  const transcriptLine = extractMarkerPayload({
    stdout: result.stdout,
    startMarker: remoteApprovalTranscriptLineStartMarker,
    endMarker: remoteApprovalTranscriptLineEndMarker,
    label: "transcript-line"
  });

  return normalizeDecisionResult({
    bubbleId: input.bubbleId,
    expectedDecision: input.action === "approve" ? "approve" : "rework",
    expectedRefs: input.refs,
    ...(input.action === "request-rework"
      ? { expectedMessage: input.message }
      : {}),
    ...(input.action === "approve"
      ? {
          expectedOverrideNonApprove: input.overrideNonApprove,
          ...(input.overrideReason !== undefined
            ? { expectedOverrideReason: input.overrideReason }
            : {})
        }
      : {}),
    transcriptLine,
    transcriptLineCount,
    state: afterState
  });
}
