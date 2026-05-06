import { join } from "node:path";

import type {
  resolveRemoteBubbleStatusTarget,
  runCommandDefault
} from "../../executor/ssh/sshBubbleStatus.js";
import { shellQuote } from "../../../shared/foundation/shellQuote.js";

const remoteTimelineCommandTimeoutMs = 10_000;

const sshTransportOptions = [
  ["BatchMode", "yes"],
  ["StrictHostKeyChecking", "yes"],
  ["ConnectTimeout", "10"],
  ["ConnectionAttempts", "1"]
] as const;

type RemoteTimelineReadErrorCode =
  | "REMOTE_TIMELINE_TRANSPORT_FAILED"
  | "REMOTE_TIMELINE_TIMEOUT";

interface RemoteTimelineReadErrorContext {
  bubble_id: string;
  remote_alias: string;
  remote_host: string;
  remote_clone_path: string;
  operation: "transport" | "timeout";
  exit_code?: number;
}

class RemoteTimelineReadError extends Error {
  public readonly code: RemoteTimelineReadErrorCode;
  public readonly context: RemoteTimelineReadErrorContext;

  public constructor(input: {
    code: RemoteTimelineReadErrorCode;
    message: string;
    context: RemoteTimelineReadErrorContext;
    cause?: unknown;
  }) {
    super(input.message, input.cause === undefined ? undefined : { cause: input.cause });
    this.name = "RemoteTimelineReadError";
    this.code = input.code;
    this.context = input.context;
  }
}

function buildSshTarget(input: { host: string; user?: string }): string {
  return input.user !== undefined ? `${input.user}@${input.host}` : input.host;
}

function buildSshCommandArgs(input: {
  target: string;
  script: string;
}): string[] {
  return [
    ...sshTransportOptions.flatMap(([key, value]) => ["-o", `${key}=${value}`]),
    input.target,
    input.script
  ];
}

function summarizeTransportOutput(output: string): string {
  const normalized = output.replace(/\s+/gu, " ").trim();
  if (normalized.length === 0) {
    return "<empty>";
  }
  return normalized.slice(0, 200);
}

export async function readRemoteTimelineText(input: {
  bubbleId: string;
  remoteClonePath: string;
  remoteAlias: string;
  expectedHost: string;
  resolveRemoteBubbleStatusTargetFn: typeof resolveRemoteBubbleStatusTarget;
  runCommand: typeof runCommandDefault;
}): Promise<string> {
  const remoteTarget = await input.resolveRemoteBubbleStatusTargetFn({
    bubbleId: input.bubbleId,
    remoteAlias: input.remoteAlias,
    expectedHost: input.expectedHost
  });
  const transcriptPath = join(
    input.remoteClonePath,
    ".pairflow",
    "bubbles",
    input.bubbleId,
    "transcript.ndjson"
  );
  const abortController = new AbortController();
  const timeout = setTimeout(() => {
    abortController.abort();
  }, remoteTimelineCommandTimeoutMs);
  timeout.unref?.();

  try {
    const result = await input.runCommand(
      "ssh",
      buildSshCommandArgs({
        target: buildSshTarget({
          host: remoteTarget.host,
          ...(remoteTarget.user !== undefined ? { user: remoteTarget.user } : {})
        }),
        script: `if [ -f ${shellQuote(transcriptPath)} ]; then cat ${shellQuote(transcriptPath)}; fi`
      }),
      {
        signal: abortController.signal
      }
    );
    if (result.exitCode !== 0) {
      const detailSource = result.stderr.trim().length > 0 ? result.stderr : result.stdout;
      throw new RemoteTimelineReadError({
        code: "REMOTE_TIMELINE_TRANSPORT_FAILED",
        message:
          `Remote timeline read transport failed (exit ${result.exitCode}): ${summarizeTransportOutput(detailSource)}`,
        context: {
          bubble_id: input.bubbleId,
          remote_alias: input.remoteAlias,
          remote_host: remoteTarget.host,
          remote_clone_path: input.remoteClonePath,
          operation: "transport",
          exit_code: result.exitCode
        }
      });
    }
    return result.stdout;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new RemoteTimelineReadError({
        code: "REMOTE_TIMELINE_TIMEOUT",
        message:
          `Remote timeline read timed out after ${remoteTimelineCommandTimeoutMs}ms for ${input.bubbleId}.`,
        context: {
          bubble_id: input.bubbleId,
          remote_alias: input.remoteAlias,
          remote_host: remoteTarget.host,
          remote_clone_path: input.remoteClonePath,
          operation: "timeout"
        },
        cause: error
      });
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
