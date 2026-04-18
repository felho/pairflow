import type { DeleteBubbleResult } from "../../../../contracts/deleteBubble.js";
import { shellQuote } from "../../../shared/foundation/shellQuote.js";
import type { RemoteBubbleStatusTarget } from "./sshBubbleStatus.js";
import { runCommandDefault } from "./sshBubbleStatus.js";
import {
  assertSingleTokenPairflowCommand,
  buildSshCommandArgs
} from "./sshBubbleStart.js";
import {
  buildCaptureMarker,
  extractMarkerPayload,
  parseArchiveCapture,
  parseDeleteBubbleResult,
  RemoteBubbleDeleteCommandError,
  remoteDeleteExitStatusEndMarker,
  remoteDeleteExitStatusStartMarker,
  remoteDeleteStderrEndMarker,
  remoteDeleteStderrStartMarker,
  remoteDeleteStdoutEndMarker,
  remoteDeleteStdoutStartMarker,
  summarizeTransportOutput,
  toRemoteDeleteCommandFailureError,
  type ArchiveCaptureFileLabel,
  type RemoteDeleteArchiveCapture
} from "./sshBubbleDeleteCommandSupport.js";

const remoteDeleteModeEnvVar = "PAIRFLOW_REMOTE_DELETE_MODE";
const remoteDeleteWorkspaceRootEnvVar =
  "PAIRFLOW_REMOTE_DELETE_WORKSPACE_ROOT";
const remoteDeleteModeInnerRemoteExecution = "inner_remote_execution";
const remoteDeleteReasonCodePattern =
  /^(?:[A-Za-z][A-Za-z0-9]*Error:\s+)?([A-Z][A-Z0-9_]{2,})(?::(?:\s|$)|$)/u;

export interface ExecuteRemoteBubbleDeleteCommandInput {
  bubbleId: string;
  remoteClonePath: string;
  remoteTarget: RemoteBubbleStatusTarget;
  force: boolean;
}

export interface ExecuteRemoteBubbleDeleteCommandResult {
  result: DeleteBubbleResult;
  archiveCapture?: RemoteDeleteArchiveCapture;
}

export interface RemoteBubbleDeleteCommandDependencies {
  runCommand?: (
    command: string,
    args: string[]
  ) => Promise<{
    stdout: string;
    stderr: string;
    exitCode: number;
  }>;
}
export { RemoteBubbleDeleteCommandError };
export type { RemoteDeleteArchiveCapture };

function buildRemoteBubbleDeleteCommandLine(
  input: ExecuteRemoteBubbleDeleteCommandInput
): string {
  const pairflowCommand = assertSingleTokenPairflowCommand(
    input.remoteTarget.pairflowCommand
  );
  const args = [
    pairflowCommand,
    "bubble",
    "delete",
    "--id",
    input.bubbleId,
    "--repo",
    input.remoteClonePath,
    ...(input.force ? ["--force"] : []),
    "--json"
  ];
  return args.map((value) => shellQuote(value)).join(" ");
}

function buildCaptureSnippet(input: {
  label: ArchiveCaptureFileLabel;
  path: string;
}): string {
  const failureMessage =
    `REMOTE_DELETE_CAPTURE_FAILED: Failed to capture ${input.label} from ${input.path}`;
  return [
    `printf '%s\\n' ${shellQuote(buildCaptureMarker(input.label, "start"))}`,
    `if [ -f ${shellQuote(input.path)} ]; then`,
    "  printf '%s\\n' 'present'",
    `  if ! base64 < ${shellQuote(input.path)} | tr -d '\\n'; then`,
    `    printf '%s\\n' ${shellQuote(failureMessage)} >&2`,
    "    exit 91",
    "  fi",
    "  printf '\\n'",
    "else",
    "  printf '%s\\n' 'missing'",
    "fi",
    `printf '\\n%s\\n' ${shellQuote(buildCaptureMarker(input.label, "end"))}`
  ].join("\n");
}

export function buildRemoteBubbleDeleteScript(
  input: ExecuteRemoteBubbleDeleteCommandInput
): string {
  const remoteCommandLine = buildRemoteBubbleDeleteCommandLine(input);
  const remoteBubbleDir =
    `${input.remoteClonePath}/.pairflow/bubbles/${input.bubbleId}`;
  const remoteTaskPath = `${remoteBubbleDir}/artifacts/task.md`;

  return [
    "set -euo pipefail",
    `if [ ! -d ${shellQuote(input.remoteClonePath)} ]; then`,
    `  printf '%s\\n' ${shellQuote(`REMOTE_DELETE_INVALID_TARGET: Missing remote clone path ${input.remoteClonePath}`)} >&2`,
    "  exit 1",
    "fi",
    `cd ${shellQuote(`${input.remoteClonePath}/..`)}`,
    buildCaptureSnippet({
      label: "bubble_toml",
      path: `${remoteBubbleDir}/bubble.toml`
    }),
    buildCaptureSnippet({
      label: "state_json",
      path: `${remoteBubbleDir}/state.json`
    }),
    buildCaptureSnippet({
      label: "transcript_ndjson",
      path: `${remoteBubbleDir}/transcript.ndjson`
    }),
    buildCaptureSnippet({
      label: "inbox_ndjson",
      path: `${remoteBubbleDir}/inbox.ndjson`
    }),
    buildCaptureSnippet({
      label: "task_md",
      path: remoteTaskPath
    }),
    `export PAIRFLOW_WORKTREE_ROOT=${shellQuote(input.remoteClonePath)}`,
    `export ${remoteDeleteModeEnvVar}=${shellQuote(remoteDeleteModeInnerRemoteExecution)}`,
    `export ${remoteDeleteWorkspaceRootEnvVar}=${shellQuote(input.remoteClonePath)}`,
    "stdout_file=$(mktemp)",
    "stderr_file=$(mktemp)",
    "cleanup() { rm -f \"$stdout_file\" \"$stderr_file\"; }",
    "trap cleanup EXIT",
    "command_exit_code=0",
    "set +e",
    `${remoteCommandLine} >"$stdout_file" 2>"$stderr_file"`,
    "command_exit_code=$?",
    "set -e",
    `printf '%s\\n' ${shellQuote(remoteDeleteExitStatusStartMarker)}`,
    "printf '%s\\n' \"$command_exit_code\"",
    `printf '%s\\n' ${shellQuote(remoteDeleteExitStatusEndMarker)}`,
    `printf '%s\\n' ${shellQuote(remoteDeleteStdoutStartMarker)}`,
    "base64 < \"$stdout_file\" | tr -d '\\n'",
    `printf '\\n%s\\n' ${shellQuote(remoteDeleteStdoutEndMarker)}`,
    `printf '%s\\n' ${shellQuote(remoteDeleteStderrStartMarker)}`,
    "base64 < \"$stderr_file\" | tr -d '\\n'",
    `printf '\\n%s\\n' ${shellQuote(remoteDeleteStderrEndMarker)}`
  ].join("\n");
}

function buildRemoteDeleteErrorContext(input: {
  bubbleId: string;
  remoteAlias: string;
  extra?: Readonly<Record<string, unknown>>;
}): Readonly<Record<string, unknown>> {
  return {
    bubbleId: input.bubbleId,
    remoteAlias: input.remoteAlias,
    ...(input.extra ?? {})
  };
}

async function runRemoteDeleteTransport(input: {
  commandInput: ExecuteRemoteBubbleDeleteCommandInput;
  runCommand: NonNullable<RemoteBubbleDeleteCommandDependencies["runCommand"]>;
}): Promise<Awaited<ReturnType<NonNullable<RemoteBubbleDeleteCommandDependencies["runCommand"]>>>> {
  const target =
    input.commandInput.remoteTarget.user !== undefined
      ? `${input.commandInput.remoteTarget.user}@${input.commandInput.remoteTarget.host}`
      : input.commandInput.remoteTarget.host;
  const script = buildRemoteBubbleDeleteScript(input.commandInput);

  try {
    return await input.runCommand("ssh", buildSshCommandArgs({
      target,
      script
    }));
  } catch (error) {
    throw new RemoteBubbleDeleteCommandError({
      code: "REMOTE_DELETE_TRANSPORT_FAILED",
      message:
        `Remote delete transport failed for ${input.commandInput.bubbleId} on ${input.commandInput.remoteTarget.alias}: `
        + summarizeTransportOutput(error instanceof Error ? error.message : String(error)),
      context: buildRemoteDeleteErrorContext({
        bubbleId: input.commandInput.bubbleId,
        remoteAlias: input.commandInput.remoteTarget.alias
      }),
      cause: error
    });
  }
}

function assertSuccessfulRemoteDeleteTransport(input: {
  commandInput: ExecuteRemoteBubbleDeleteCommandInput;
  transportResult: Awaited<ReturnType<NonNullable<RemoteBubbleDeleteCommandDependencies["runCommand"]>>>;
}): void {
  if (input.transportResult.exitCode === 0) {
    return;
  }

  const detailSource =
    input.transportResult.stderr.trim().length > 0
      ? input.transportResult.stderr
      : input.transportResult.stdout;
  const reasonCode = detailSource
    .split(/\r?\n/gu)
    .map((line) => line.trim())
    .find((line) => remoteDeleteReasonCodePattern.test(line))
    ?.match(remoteDeleteReasonCodePattern)?.[1];

  throw new RemoteBubbleDeleteCommandError({
    code: reasonCode ?? "REMOTE_DELETE_TRANSPORT_FAILED",
    message:
      `Remote delete transport failed for ${input.commandInput.bubbleId} on ${input.commandInput.remoteTarget.alias}: `
      + summarizeTransportOutput(detailSource),
    context: buildRemoteDeleteErrorContext({
      bubbleId: input.commandInput.bubbleId,
      remoteAlias: input.commandInput.remoteTarget.alias,
      extra: {
        transportExitCode: input.transportResult.exitCode
      }
    }),
    cause: detailSource
  });
}

function parseRemoteDeleteTransportPayload(input: {
  commandInput: ExecuteRemoteBubbleDeleteCommandInput;
  transportStdout: string;
}): {
  commandExitCode: number;
  stdout: string;
  stderr: string;
} {
  const context = buildRemoteDeleteErrorContext({
    bubbleId: input.commandInput.bubbleId,
    remoteAlias: input.commandInput.remoteTarget.alias
  });
  const commandExitCode = Number.parseInt(
    extractMarkerPayload({
      stdout: input.transportStdout,
      startMarker: remoteDeleteExitStatusStartMarker,
      endMarker: remoteDeleteExitStatusEndMarker,
      label: "delete exit status",
      context
    }).trim(),
    10
  );
  if (!Number.isSafeInteger(commandExitCode) || commandExitCode < 0) {
    throw new RemoteBubbleDeleteCommandError({
      code: "REMOTE_DELETE_PAYLOAD_INVALID",
      message: "Remote delete returned an invalid exit status payload.",
      context
    });
  }

  return {
    commandExitCode,
    stdout: extractMarkerPayload({
      stdout: input.transportStdout,
      startMarker: remoteDeleteStdoutStartMarker,
      endMarker: remoteDeleteStdoutEndMarker,
      label: "delete stdout",
      base64Encoded: true,
      context
    }),
    stderr: extractMarkerPayload({
      stdout: input.transportStdout,
      startMarker: remoteDeleteStderrStartMarker,
      endMarker: remoteDeleteStderrEndMarker,
      label: "delete stderr",
      base64Encoded: true,
      context
    })
  };
}

export async function executeRemoteBubbleDeleteCommand(
  input: ExecuteRemoteBubbleDeleteCommandInput,
  dependencies: RemoteBubbleDeleteCommandDependencies = {}
): Promise<ExecuteRemoteBubbleDeleteCommandResult> {
  const runCommand = dependencies.runCommand ?? runCommandDefault;
  const transportResult = await runRemoteDeleteTransport({
    commandInput: input,
    runCommand
  });
  assertSuccessfulRemoteDeleteTransport({
    commandInput: input,
    transportResult
  });
  const { commandExitCode, stdout, stderr } = parseRemoteDeleteTransportPayload({
    commandInput: input,
    transportStdout: transportResult.stdout
  });

  if (commandExitCode !== 0 && commandExitCode !== 2) {
    throw toRemoteDeleteCommandFailureError({
      stderr,
      stdout,
      bubbleId: input.bubbleId,
      remoteAlias: input.remoteTarget.alias
    });
  }

  const result = parseDeleteBubbleResult({
    raw: stdout,
    bubbleId: input.bubbleId
  });
  if (!input.force && result.deleted) {
    throw new RemoteBubbleDeleteCommandError({
      code: "REMOTE_DELETE_PAYLOAD_INVALID",
      message:
        `Remote delete payload contract invalid for bubble ${input.bubbleId}: non-force remote delete must stay on the confirmation contract and must not report deleted=true.`,
      context: buildRemoteDeleteErrorContext({
        bubbleId: input.bubbleId,
        remoteAlias: input.remoteTarget.alias,
        extra: {
          force: input.force
        }
      })
    });
  }

  if (commandExitCode === 2) {
    return { result };
  }

  return {
    result,
    ...(result.deleted
      ? {
          archiveCapture: parseArchiveCapture({
            stdout: transportResult.stdout,
            bubbleId: input.bubbleId,
            remoteClonePath: input.remoteClonePath
          })
        }
      : {})
  };
}
