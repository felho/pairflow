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

const remoteCommitStateStartMarker =
  "__PAIRFLOW_REMOTE_COMMIT_STATE_START__";
const remoteCommitStateEndMarker =
  "__PAIRFLOW_REMOTE_COMMIT_STATE_END__";
const remoteCommitTranscriptStartMarker =
  "__PAIRFLOW_REMOTE_COMMIT_TRANSCRIPT_START__";
const remoteCommitTranscriptEndMarker =
  "__PAIRFLOW_REMOTE_COMMIT_TRANSCRIPT_END__";
const remoteCommitDonePackageStartMarker =
  "__PAIRFLOW_REMOTE_COMMIT_DONE_PACKAGE_START__";
const remoteCommitDonePackageEndMarker =
  "__PAIRFLOW_REMOTE_COMMIT_DONE_PACKAGE_END__";
const remoteCommitHeadShaStartMarker =
  "__PAIRFLOW_REMOTE_COMMIT_HEAD_SHA_START__";
const remoteCommitHeadShaEndMarker =
  "__PAIRFLOW_REMOTE_COMMIT_HEAD_SHA_END__";
const remoteCommitHeadMessageStartMarker =
  "__PAIRFLOW_REMOTE_COMMIT_HEAD_MESSAGE_START__";
const remoteCommitHeadMessageEndMarker =
  "__PAIRFLOW_REMOTE_COMMIT_HEAD_MESSAGE_END__";
const remoteCommitStagedFilesStartMarker =
  "__PAIRFLOW_REMOTE_COMMIT_STAGED_FILES_START__";
const remoteCommitStagedFilesEndMarker =
  "__PAIRFLOW_REMOTE_COMMIT_STAGED_FILES_END__";
const remoteCommitModeEnvVar = "PAIRFLOW_REMOTE_COMMIT_MODE";
const remoteCommitWorkspaceRootEnvVar =
  "PAIRFLOW_REMOTE_COMMIT_WORKSPACE_ROOT";
const remoteCommitModeInnerRemoteExecution = "inner_remote_execution";

export interface ExecuteRemoteBubbleCommitCommandInput {
  bubbleId: string;
  remoteClonePath: string;
  remoteTarget: RemoteBubbleStatusTarget;
  refs: string[];
  message?: string;
  auto: boolean;
}

export interface ExecuteRemoteBubbleCommitCommandResult {
  bubbleId: string;
  sequence: number;
  envelope: ProtocolEnvelope;
  state: BubbleStateSnapshot;
  stateContent: string;
  transcriptContent: string;
  donePackageContent: string;
  commitSha: string;
  commitMessage: string;
  stagedFiles: string[];
}

export interface RemoteBubbleCommitCommandDependencies {
  runCommand?: (
    command: string,
    args: string[]
  ) => Promise<{
    stdout: string;
    stderr: string;
    exitCode: number;
  }>;
}

export class RemoteBubbleCommitCommandError extends Error {
  public readonly code:
    | "REMOTE_COMMIT_TRANSPORT_FAILED"
    | "REMOTE_COMMIT_PAYLOAD_INVALID";
  public readonly context?: Record<string, string | number>;

  public constructor(input: {
    code:
      | "REMOTE_COMMIT_TRANSPORT_FAILED"
      | "REMOTE_COMMIT_PAYLOAD_INVALID";
    message: string;
    context?: Record<string, string | number>;
    cause?: unknown;
  }) {
    super(input.message, input.cause === undefined ? undefined : { cause: input.cause });
    this.name = "RemoteBubbleCommitCommandError";
    this.code = input.code;
    if (input.context !== undefined) {
      this.context = input.context;
    }
  }
}

function buildRemoteBubbleCommitCommandLine(
  input: ExecuteRemoteBubbleCommitCommandInput
): string {
  const pairflowCommand = assertSingleTokenPairflowCommand(
    input.remoteTarget.pairflowCommand
  );
  const args = [
    pairflowCommand,
    "bubble",
    "commit",
    "--id",
    input.bubbleId,
    "--repo",
    input.remoteClonePath,
    ...(input.message !== undefined ? ["--message", input.message] : []),
    ...(input.auto ? ["--auto"] : []),
    ...input.refs.flatMap((ref) => ["--ref", ref])
  ];
  return args.map((value) => shellQuote(value)).join(" ");
}

export function buildRemoteBubbleCommitScript(
  input: ExecuteRemoteBubbleCommitCommandInput
): string {
  const bubbleDir = `${input.remoteClonePath}/.pairflow/bubbles/${input.bubbleId}`;
  const statePath = `${bubbleDir}/state.json`;
  const transcriptPath = `${bubbleDir}/transcript.ndjson`;
  const donePackagePath = `${bubbleDir}/artifacts/done-package.md`;
  const remoteCommandLine = buildRemoteBubbleCommitCommandLine(input);

  return [
    "set -euo pipefail",
    `cd ${shellQuote(input.remoteClonePath)}`,
    `export PAIRFLOW_WORKTREE_ROOT=${shellQuote(input.remoteClonePath)}`,
    `export ${remoteCommitModeEnvVar}=${shellQuote(remoteCommitModeInnerRemoteExecution)}`,
    `export ${remoteCommitWorkspaceRootEnvVar}=${shellQuote(input.remoteClonePath)}`,
    remoteCommandLine,
    `printf '%s\\n' ${shellQuote(remoteCommitStateStartMarker)}`,
    `cat ${shellQuote(statePath)}`,
    `printf '%s\\n' ${shellQuote(remoteCommitStateEndMarker)}`,
    `printf '%s\\n' ${shellQuote(remoteCommitTranscriptStartMarker)}`,
    `cat ${shellQuote(transcriptPath)}`,
    `printf '%s\\n' ${shellQuote(remoteCommitTranscriptEndMarker)}`,
    `printf '%s\\n' ${shellQuote(remoteCommitDonePackageStartMarker)}`,
    `cat ${shellQuote(donePackagePath)}`,
    `printf '%s\\n' ${shellQuote(remoteCommitDonePackageEndMarker)}`,
    `printf '%s\\n' ${shellQuote(remoteCommitHeadShaStartMarker)}`,
    "git rev-parse HEAD",
    `printf '%s\\n' ${shellQuote(remoteCommitHeadShaEndMarker)}`,
    `printf '%s\\n' ${shellQuote(remoteCommitHeadMessageStartMarker)}`,
    "git log -1 --pretty=%s HEAD",
    `printf '%s\\n' ${shellQuote(remoteCommitHeadMessageEndMarker)}`,
    `printf '%s\\n' ${shellQuote(remoteCommitStagedFilesStartMarker)}`,
    "git diff-tree --no-commit-id --name-only -r HEAD",
    `printf '%s\\n' ${shellQuote(remoteCommitStagedFilesEndMarker)}`
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
    throw new RemoteBubbleCommitCommandError({
      code: "REMOTE_COMMIT_PAYLOAD_INVALID",
      message:
        `Remote commit returned stdout without exactly one ${input.label} marker envelope.`,
      context: {
        command_name: "commit",
        payload_label: input.label,
        marker_count: matches.length
      }
    });
  }
  return matches[0]?.[1] ?? "";
}

function parseRemoteBubbleState(input: {
  raw: string;
  bubbleId: string;
}): BubbleStateSnapshot {
  let parsed: unknown;
  try {
    parsed = JSON.parse(input.raw) as unknown;
  } catch (error) {
    throw new RemoteBubbleCommitCommandError({
      code: "REMOTE_COMMIT_PAYLOAD_INVALID",
      message:
        `Remote commit returned invalid state JSON for bubble ${input.bubbleId}.`,
      cause: error
    });
  }

  try {
    return assertValidBubbleStateSnapshot(parsed);
  } catch (error) {
    throw new RemoteBubbleCommitCommandError({
      code: "REMOTE_COMMIT_PAYLOAD_INVALID",
      message:
        `Remote commit returned invalid state payload for bubble ${input.bubbleId}.`,
      cause: error
    });
  }
}

function parseTranscript(input: {
  raw: string;
  bubbleId: string;
}): {
  sequence: number;
  envelope: ProtocolEnvelope;
} {
  const lines = input.raw
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    throw new RemoteBubbleCommitCommandError({
      code: "REMOTE_COMMIT_PAYLOAD_INVALID",
      message:
        `Remote commit returned an empty transcript payload for bubble ${input.bubbleId}.`
    });
  }

  const envelopes = lines.map((line, index) => {
    try {
      return parseEnvelopeLine(line);
    } catch (error) {
      throw new RemoteBubbleCommitCommandError({
        code: "REMOTE_COMMIT_PAYLOAD_INVALID",
        message:
          `Remote commit returned invalid transcript line ${index + 1} for bubble ${input.bubbleId}.`,
        cause: error
      });
    }
  });

  const envelope = envelopes.at(-1);
  if (envelope === undefined || envelope.bubble_id !== input.bubbleId) {
    throw new RemoteBubbleCommitCommandError({
      code: "REMOTE_COMMIT_PAYLOAD_INVALID",
      message:
        `Remote commit returned a transcript tail for the wrong bubble: expected ${input.bubbleId}.`
    });
  }
  if (envelope.type !== "DONE_PACKAGE") {
    throw new RemoteBubbleCommitCommandError({
      code: "REMOTE_COMMIT_PAYLOAD_INVALID",
      message:
        `Remote commit did not finish with a DONE_PACKAGE envelope for bubble ${input.bubbleId}.`
    });
  }

  return {
    sequence: envelopes.length,
    envelope
  };
}

function parseRequiredLine(input: {
  raw: string;
  bubbleId: string;
  label: string;
}): string {
  const trimmed = input.raw.trim();
  if (trimmed.length === 0) {
    throw new RemoteBubbleCommitCommandError({
      code: "REMOTE_COMMIT_PAYLOAD_INVALID",
      message:
        `Remote commit returned an empty ${input.label} payload for bubble ${input.bubbleId}.`
    });
  }
  return trimmed;
}

function parseOutputLines(stdout: string): string[] {
  return stdout
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

async function runRemoteBubbleCommitTransport(input: {
  command: ExecuteRemoteBubbleCommitCommandInput;
  runCommand: NonNullable<RemoteBubbleCommitCommandDependencies["runCommand"]>;
  target: string;
  script: string;
}): Promise<{
  stdout: string;
  stderr: string;
  exitCode: number;
}> {
  try {
    return await input.runCommand(
      "ssh",
      buildSshCommandArgs({ target: input.target, script: input.script })
    );
  } catch (error) {
    if (error instanceof RemoteBubbleCommitCommandError) {
      throw error;
    }
    const reason = error instanceof Error ? error.message : String(error);
    throw new RemoteBubbleCommitCommandError({
      code: "REMOTE_COMMIT_TRANSPORT_FAILED",
      message:
        `ssh transport failed before completion: ${summarizeTransportOutput(reason)}`,
      context: {
        bubble_id: input.command.bubbleId,
        command_name: "commit",
        remote_host: input.command.remoteTarget.host
      },
      cause: error
    });
  }
}

export async function executeRemoteBubbleCommitCommand(
  input: ExecuteRemoteBubbleCommitCommandInput,
  dependencies: RemoteBubbleCommitCommandDependencies = {}
): Promise<ExecuteRemoteBubbleCommitCommandResult> {
  const runCommand = dependencies.runCommand ?? runCommandDefault;
  const script = buildRemoteBubbleCommitScript(input);
  const target =
    input.remoteTarget.user !== undefined
      ? `${input.remoteTarget.user}@${input.remoteTarget.host}`
      : input.remoteTarget.host;
  const result = await runRemoteBubbleCommitTransport({
    command: input,
    runCommand,
    target,
    script
  });

  if (result.exitCode !== 0) {
    throw new RemoteBubbleCommitCommandError({
      code: "REMOTE_COMMIT_TRANSPORT_FAILED",
      message: describeTransportFailure({
        exitCode: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr
      }),
      context: {
        bubble_id: input.bubbleId,
        command_name: "commit",
        remote_host: input.remoteTarget.host,
        exit_code: result.exitCode
      }
    });
  }

  const stateContent = extractMarkerPayload({
    stdout: result.stdout,
    startMarker: remoteCommitStateStartMarker,
    endMarker: remoteCommitStateEndMarker,
    label: "state"
  });
  const transcriptContent = extractMarkerPayload({
    stdout: result.stdout,
    startMarker: remoteCommitTranscriptStartMarker,
    endMarker: remoteCommitTranscriptEndMarker,
    label: "transcript"
  });
  const donePackageContent = extractMarkerPayload({
    stdout: result.stdout,
    startMarker: remoteCommitDonePackageStartMarker,
    endMarker: remoteCommitDonePackageEndMarker,
    label: "done-package"
  });
  const commitSha = parseRequiredLine({
    raw: extractMarkerPayload({
      stdout: result.stdout,
      startMarker: remoteCommitHeadShaStartMarker,
      endMarker: remoteCommitHeadShaEndMarker,
      label: "head-sha"
    }),
    bubbleId: input.bubbleId,
    label: "head sha"
  });
  const commitMessage = parseRequiredLine({
    raw: extractMarkerPayload({
      stdout: result.stdout,
      startMarker: remoteCommitHeadMessageStartMarker,
      endMarker: remoteCommitHeadMessageEndMarker,
      label: "head-message"
    }),
    bubbleId: input.bubbleId,
    label: "head message"
  });
  const stagedFiles = parseOutputLines(
    extractMarkerPayload({
      stdout: result.stdout,
      startMarker: remoteCommitStagedFilesStartMarker,
      endMarker: remoteCommitStagedFilesEndMarker,
      label: "staged-files"
    })
  );
  const state = parseRemoteBubbleState({
    raw: stateContent,
    bubbleId: input.bubbleId
  });
  if (state.state !== "DONE") {
    throw new RemoteBubbleCommitCommandError({
      code: "REMOTE_COMMIT_PAYLOAD_INVALID",
      message:
        `Remote commit returned non-DONE state ${state.state} for bubble ${input.bubbleId}.`
    });
  }
  const { sequence, envelope } = parseTranscript({
    raw: transcriptContent,
    bubbleId: input.bubbleId
  });

  return {
    bubbleId: input.bubbleId,
    sequence,
    envelope,
    state,
    stateContent,
    transcriptContent,
    donePackageContent,
    commitSha,
    commitMessage,
    stagedFiles
  };
}
