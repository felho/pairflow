import { shellQuote } from "../../../shared/foundation/shellQuote.js";
import type { RemoteBubbleStatusTarget } from "./sshBubbleStatus.js";
import { runCommandDefault } from "./sshBubbleStatus.js";
import {
  normalizeDecisionResult,
  normalizeQueuedReworkResult,
  type RemoteBubbleApprovalDecisionResult,
  type RemoteBubbleApprovalQueuedReworkResult
} from "./sshBubbleApprovalParsing.js";
import {
  extractMarkerPayload,
  parseRemoteBubbleState,
  parseTranscriptLineCount,
  type RemoteApprovalPayloadErrorContext
} from "./sshBubbleApprovalParsingSupport.js";
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

export type {
  RemoteBubbleApprovalDecisionResult,
  RemoteBubbleApprovalQueuedReworkResult
};

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
  public readonly reasonCode?: string;
  public readonly context?: RemoteApprovalPayloadErrorContext;

  public constructor(input: {
    code:
      | "REMOTE_APPROVAL_TRANSPORT_FAILED"
      | "REMOTE_APPROVAL_PAYLOAD_INVALID";
    message: string;
    cause?: unknown;
    reasonCode?: string;
    context?: RemoteApprovalPayloadErrorContext;
  }) {
    super(input.message, input.cause === undefined ? undefined : { cause: input.cause });
    this.name = "RemoteBubbleApprovalCommandError";
    this.code = input.code;
    if (input.reasonCode !== undefined) {
      this.reasonCode = input.reasonCode;
    }
    if (input.context !== undefined) {
      this.context = input.context;
    }
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

function createPayloadError(input: {
  message: string;
  cause?: unknown;
  reasonCode: string;
  context: RemoteApprovalPayloadErrorContext;
}): RemoteBubbleApprovalCommandError {
  return new RemoteBubbleApprovalCommandError({
    code: "REMOTE_APPROVAL_PAYLOAD_INVALID",
    message: input.message,
    cause: input.cause,
    reasonCode: input.reasonCode,
    context: input.context
  });
}

function readRemoteApprovalStates(input: {
  result: { stdout: string };
  bubbleId: string;
  action: "approve" | "request-rework";
}) {
  const beforeState = parseRemoteBubbleState({
    raw: extractMarkerPayload({
      stdout: input.result.stdout,
      startMarker: remoteApprovalBeforeStateStartMarker,
      endMarker: remoteApprovalBeforeStateEndMarker,
      label: "before-state",
      bubbleId: input.bubbleId,
      action: input.action,
      createPayloadError
    }),
    bubbleId: input.bubbleId,
    label: "before",
    action: input.action,
    createPayloadError
  });

  const afterState = parseRemoteBubbleState({
    raw: extractMarkerPayload({
      stdout: input.result.stdout,
      startMarker: remoteApprovalAfterStateStartMarker,
      endMarker: remoteApprovalAfterStateEndMarker,
      label: "after-state",
      bubbleId: input.bubbleId,
      action: input.action,
      createPayloadError
    }),
    bubbleId: input.bubbleId,
    label: "after",
    action: input.action,
    createPayloadError
  });

  return { beforeState, afterState };
}

function readRemoteApprovalTranscript(input: {
  result: { stdout: string };
  bubbleId: string;
  action: "approve" | "request-rework";
}) {
  const transcriptLineCount = parseTranscriptLineCount({
    raw: extractMarkerPayload({
      stdout: input.result.stdout,
      startMarker: remoteApprovalTranscriptCountStartMarker,
      endMarker: remoteApprovalTranscriptCountEndMarker,
      label: "transcript-count",
      bubbleId: input.bubbleId,
      action: input.action,
      createPayloadError
    }),
    bubbleId: input.bubbleId,
    action: input.action,
    createPayloadError
  });

  const transcriptLine = extractMarkerPayload({
    stdout: input.result.stdout,
    startMarker: remoteApprovalTranscriptLineStartMarker,
    endMarker: remoteApprovalTranscriptLineEndMarker,
    label: "transcript-line",
    bubbleId: input.bubbleId,
    action: input.action,
    createPayloadError
  });

  return { transcriptLine, transcriptLineCount };
}

function normalizeRemoteApprovalOutcome(input: {
  command: ExecuteRemoteBubbleApprovalCommandInput;
  result: { stdout: string };
}): ExecuteRemoteBubbleApprovalCommandResult {
  const { beforeState, afterState } = readRemoteApprovalStates({
    result: input.result,
    bubbleId: input.command.bubbleId,
    action: input.command.action
  });

  if (
    input.command.action === "request-rework" &&
    beforeState.state === "WAITING_HUMAN"
  ) {
    return normalizeQueuedReworkResult({
      bubbleId: input.command.bubbleId,
      beforeState,
      afterState,
      expectedMessage: input.command.message,
      expectedRefs: input.command.refs,
      createPayloadError
    });
  }

  const transcript = readRemoteApprovalTranscript({
    result: input.result,
    bubbleId: input.command.bubbleId,
    action: input.command.action
  });

  return normalizeDecisionResult({
    bubbleId: input.command.bubbleId,
    action: input.command.action,
    expectedDecision: input.command.action === "approve" ? "approve" : "rework",
    expectedRefs: input.command.refs,
    ...(input.command.action === "request-rework"
      ? { expectedMessage: input.command.message }
      : {}),
    ...(input.command.action === "approve"
      ? {
          expectedOverrideNonApprove: input.command.overrideNonApprove,
          ...(input.command.overrideReason !== undefined
            ? { expectedOverrideReason: input.command.overrideReason }
            : {})
        }
      : {}),
    transcriptLine: transcript.transcriptLine,
    transcriptLineCount: transcript.transcriptLineCount,
    state: afterState,
    createPayloadError
  });
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
      reasonCode: "REMOTE_APPROVAL_TRANSPORT_INVOKE_FAILED",
      cause: error,
      context: {
        bubbleId: input.bubbleId,
        phase: "transport_invoke",
        action: input.action
      }
    });
  }

  if (result.exitCode !== 0) {
    throw new RemoteBubbleApprovalCommandError({
      code: "REMOTE_APPROVAL_TRANSPORT_FAILED",
      message: describeTransportFailure(result),
      reasonCode: "REMOTE_APPROVAL_TRANSPORT_EXIT_FAILED",
      context: {
        bubbleId: input.bubbleId,
        phase: "transport_exit",
        action: input.action,
        exitCode: result.exitCode
      }
    });
  }

  return normalizeRemoteApprovalOutcome({
    command: input,
    result
  });
}
