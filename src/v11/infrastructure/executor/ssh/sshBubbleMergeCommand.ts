import type {
  ExecuteRemoteBubbleMergeCleanupCommandInput,
  ExecuteRemoteBubbleMergeCleanupCommandResult,
  ExecuteRemoteBubbleMergeCommandInput,
  ExecuteRemoteBubbleMergeCommandResult
} from "../../../shared/remote/remoteMergeContract.js";
import { runCommandDefault } from "./sshBubbleStatus.js";
import { buildSshCommandArgs } from "./sshBubbleStart.js";
import {
  extractMarkerPayload,
  parseRemoteExitStatus,
  parseRemoteExitStatusFromMarkers,
  remoteMergeCleanupExitStatusEndMarker,
  remoteMergeCleanupExitStatusStartMarker,
  remoteMergeCleanupStderrEndMarker,
  remoteMergeCleanupStderrStartMarker,
  remoteMergeCleanupStdoutEndMarker,
  remoteMergeCleanupStdoutStartMarker,
  remoteMergeReasonCodePattern,
  remoteMergeStderrEndMarker,
  remoteMergeStderrStartMarker,
  remoteMergeStdoutEndMarker,
  remoteMergeStdoutStartMarker,
  summarizeTransportOutput
} from "./sshBubbleMergeMarkers.js";
import { RemoteBubbleMergeCommandError } from "./sshBubbleMergeCommandError.js";
import {
  parseRemoteMergeCleanupResult,
  parseRemoteMergeResult
} from "./sshBubbleMergeParsers.js";
import {
  buildRemoteBubbleMergeCleanupScript,
  buildRemoteBubbleMergeScript
} from "./sshBubbleMergeScripts.js";

export type { RemoteBubbleMergeCommandErrorContext } from "./sshBubbleMergeCommandError.js";
export { RemoteBubbleMergeCommandError } from "./sshBubbleMergeCommandError.js";
export {
  buildRemoteBubbleMergeCleanupScript,
  buildRemoteBubbleMergeScript
} from "./sshBubbleMergeScripts.js";

export interface RemoteBubbleMergeCommandDependencies {
  runCommand?: (
    command: string,
    args: string[]
  ) => Promise<{
    stdout: string;
    stderr: string;
    exitCode: number;
  }>;
}

function buildSshTarget(input: {
  host: string;
  user?: string;
}): string {
  return input.user !== undefined ? `${input.user}@${input.host}` : input.host;
}

function buildRemoteCommandFailure(input: {
  stderr: string;
  stdout: string;
  bubbleId: string;
}): ConstructorParameters<typeof RemoteBubbleMergeCommandError>[0] {
  const detailSource =
    input.stderr.trim().length > 0 ? input.stderr.trim() : input.stdout.trim();
  const reasonCode = detailSource
    .split(/\r?\n/gu)
    .map((line) => line.trim())
    .find((line) => remoteMergeReasonCodePattern.test(line))
    ?.match(remoteMergeReasonCodePattern)?.[1];
  return {
    code:
      (reasonCode as RemoteBubbleMergeCommandError["code"] | undefined)
      ?? "REMOTE_MERGE_COMMAND_FAILED",
    message:
      detailSource.length > 0
        ? detailSource
        : `Remote merge command failed for bubble ${input.bubbleId}.`,
    context: {
      command_name: "merge",
      bubble_id: input.bubbleId,
      operation: "command",
      ...(reasonCode !== undefined ? { remote_reason_code: reasonCode } : {})
    }
  };
}

async function runRemoteMergeTransport(input: {
  bubbleId: string;
  remoteAlias: string;
  remoteHost: string;
  remoteClonePath: string;
  operation: "transport" | "cleanup_transport";
  runCommand: NonNullable<RemoteBubbleMergeCommandDependencies["runCommand"]>;
  target: string;
  script: string;
  failureLabel: string;
}): Promise<{
  stdout: string;
  stderr: string;
  exitCode: number;
}> {
  try {
    const transportResult = await input.runCommand(
      "ssh",
      buildSshCommandArgs({
        target: input.target,
        script: input.script
      })
    );
    if (transportResult.exitCode === 0) {
      return transportResult;
    }
    const detailSource =
      transportResult.stderr.trim().length > 0
        ? transportResult.stderr
        : transportResult.stdout;
    throw new RemoteBubbleMergeCommandError({
      code: "REMOTE_MERGE_TRANSPORT_FAILED",
      message:
        `${input.failureLabel} for ${input.bubbleId} on ${input.remoteAlias}: `
        + summarizeTransportOutput(detailSource),
      cause: transportResult.stderr,
      context: {
        command_name: "merge",
        bubble_id: input.bubbleId,
        remote_alias: input.remoteAlias,
        remote_host: input.remoteHost,
        remote_clone_path: input.remoteClonePath,
        operation: input.operation
      }
    });
  } catch (error) {
    if (error instanceof RemoteBubbleMergeCommandError) {
      throw error;
    }
    throw new RemoteBubbleMergeCommandError({
      code: "REMOTE_MERGE_TRANSPORT_FAILED",
      message:
        `${input.failureLabel} for ${input.bubbleId} on ${input.remoteAlias}: `
        + summarizeTransportOutput(error instanceof Error ? error.message : String(error)),
      cause: error,
      context: {
        command_name: "merge",
        bubble_id: input.bubbleId,
        remote_alias: input.remoteAlias,
        remote_host: input.remoteHost,
        remote_clone_path: input.remoteClonePath,
        operation: input.operation
      }
    });
  }
}

export async function executeRemoteBubbleMergeCommand(
  input: ExecuteRemoteBubbleMergeCommandInput,
  dependencies: RemoteBubbleMergeCommandDependencies = {}
): Promise<ExecuteRemoteBubbleMergeCommandResult> {
  const runCommand = dependencies.runCommand ?? runCommandDefault;
  const transportResult = await runRemoteMergeTransport({
    bubbleId: input.bubbleId,
    remoteAlias: input.remoteTarget.alias,
    remoteHost: input.remoteTarget.host,
    remoteClonePath: input.remoteClonePath,
    operation: "transport",
    runCommand,
    target: buildSshTarget(input.remoteTarget),
    script: buildRemoteBubbleMergeScript(input),
    failureLabel: "Remote merge transport failed"
  });
  const exitStatus = parseRemoteExitStatus(transportResult.stdout);
  const stdoutPayload = extractMarkerPayload({
    stdout: transportResult.stdout,
    startMarker: remoteMergeStdoutStartMarker,
    endMarker: remoteMergeStdoutEndMarker,
    label: "stdout"
  });
  const stderrPayload = extractMarkerPayload({
    stdout: transportResult.stdout,
    startMarker: remoteMergeStderrStartMarker,
    endMarker: remoteMergeStderrEndMarker,
    label: "stderr"
  }).trim();

  if (exitStatus !== 0) {
    throw new RemoteBubbleMergeCommandError(buildRemoteCommandFailure({
      stderr: stderrPayload,
      stdout: stdoutPayload,
      bubbleId: input.bubbleId
    }));
  }

  return parseRemoteMergeResult(stdoutPayload);
}

export async function executeRemoteBubbleMergeCleanupCommand(
  input: ExecuteRemoteBubbleMergeCleanupCommandInput,
  dependencies: RemoteBubbleMergeCommandDependencies = {}
): Promise<ExecuteRemoteBubbleMergeCleanupCommandResult> {
  const runCommand = dependencies.runCommand ?? runCommandDefault;
  const transportResult = await runRemoteMergeTransport({
    bubbleId: input.bubbleId,
    remoteAlias: input.remoteTarget.alias,
    remoteHost: input.remoteTarget.host,
    remoteClonePath: input.remoteClonePath,
    operation: "cleanup_transport",
    runCommand,
    target: buildSshTarget(input.remoteTarget),
    script: buildRemoteBubbleMergeCleanupScript(input),
    failureLabel: "Remote merge cleanup transport failed"
  });
  const exitStatus = parseRemoteExitStatusFromMarkers({
    stdout: transportResult.stdout,
    startMarker: remoteMergeCleanupExitStatusStartMarker,
    endMarker: remoteMergeCleanupExitStatusEndMarker,
    label: "cleanup exit-status"
  });
  const stdoutPayload = extractMarkerPayload({
    stdout: transportResult.stdout,
    startMarker: remoteMergeCleanupStdoutStartMarker,
    endMarker: remoteMergeCleanupStdoutEndMarker,
    label: "cleanup stdout"
  });
  const stderrPayload = extractMarkerPayload({
    stdout: transportResult.stdout,
    startMarker: remoteMergeCleanupStderrStartMarker,
    endMarker: remoteMergeCleanupStderrEndMarker,
    label: "cleanup stderr"
  }).trim();

  if (exitStatus !== 0) {
    throw new RemoteBubbleMergeCommandError(buildRemoteCommandFailure({
      stderr: stderrPayload,
      stdout: stdoutPayload,
      bubbleId: input.bubbleId
    }));
  }

  return parseRemoteMergeCleanupResult(stdoutPayload);
}
