import { RemoteBubbleMergeCommandError } from "./sshBubbleMergeCommandError.js";

export const remoteMergeExitStatusStartMarker =
  "__PAIRFLOW_REMOTE_MERGE_EXIT_STATUS_START__";
export const remoteMergeExitStatusEndMarker =
  "__PAIRFLOW_REMOTE_MERGE_EXIT_STATUS_END__";
export const remoteMergeStdoutStartMarker =
  "__PAIRFLOW_REMOTE_MERGE_STDOUT_START__";
export const remoteMergeStdoutEndMarker =
  "__PAIRFLOW_REMOTE_MERGE_STDOUT_END__";
export const remoteMergeStderrStartMarker =
  "__PAIRFLOW_REMOTE_MERGE_STDERR_START__";
export const remoteMergeStderrEndMarker =
  "__PAIRFLOW_REMOTE_MERGE_STDERR_END__";
export const remoteMergeCleanupExitStatusStartMarker =
  "__PAIRFLOW_REMOTE_MERGE_CLEANUP_EXIT_STATUS_START__";
export const remoteMergeCleanupExitStatusEndMarker =
  "__PAIRFLOW_REMOTE_MERGE_CLEANUP_EXIT_STATUS_END__";
export const remoteMergeCleanupStdoutStartMarker =
  "__PAIRFLOW_REMOTE_MERGE_CLEANUP_STDOUT_START__";
export const remoteMergeCleanupStdoutEndMarker =
  "__PAIRFLOW_REMOTE_MERGE_CLEANUP_STDOUT_END__";
export const remoteMergeCleanupStderrStartMarker =
  "__PAIRFLOW_REMOTE_MERGE_CLEANUP_STDERR_START__";
export const remoteMergeCleanupStderrEndMarker =
  "__PAIRFLOW_REMOTE_MERGE_CLEANUP_STDERR_END__";
export const remoteMergeReasonCodePattern =
  /^(?:[A-Za-z][A-Za-z0-9]*Error:\s+)?([A-Z][A-Z0-9_]{2,})(?::(?:\s|$)|$)/u;

export function summarizeTransportOutput(output: string): string {
  const normalized = output.replace(/\s+/gu, " ").trim();
  if (normalized.length === 0) {
    return "<empty>";
  }
  return normalized.slice(0, 200);
}

function escapeRegExpLiteral(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

export function extractMarkerPayload(input: {
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
    throw new RemoteBubbleMergeCommandError({
      code: "REMOTE_MERGE_PAYLOAD_INVALID",
      message:
        `Remote merge returned stdout without exactly one ${input.label} marker envelope.`,
      context: {
        command_name: "merge",
        operation: "payload"
      }
    });
  }
  return matches[0]?.[1] ?? "";
}

export function parseRemoteExitStatusFromMarkers(input: {
  stdout: string;
  startMarker: string;
  endMarker: string;
  label: string;
}): number {
  const rawStatus = extractMarkerPayload({
    stdout: input.stdout,
    startMarker: input.startMarker,
    endMarker: input.endMarker,
    label: input.label
  }).trim();
  if (!/^\d+$/u.test(rawStatus)) {
    throw new RemoteBubbleMergeCommandError({
      code: "REMOTE_MERGE_PAYLOAD_INVALID",
      message: "Remote merge returned an invalid exit status payload.",
      context: {
        command_name: "merge",
        operation: "payload"
      }
    });
  }
  return Number(rawStatus);
}

export function parseRemoteExitStatus(stdout: string): number {
  return parseRemoteExitStatusFromMarkers({
    stdout,
    startMarker: remoteMergeExitStatusStartMarker,
    endMarker: remoteMergeExitStatusEndMarker,
    label: "exit-status"
  });
}
