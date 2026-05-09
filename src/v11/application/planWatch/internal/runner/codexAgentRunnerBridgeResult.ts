import { readFile, rename, rm, writeFile } from "node:fs/promises";

import type {
  AgentRunnerBridgeFailureReasonCode,
  AgentRunnerBridgeInput,
  AgentRunnerBridgeResult,
  AgentRunnerCommandIdentity,
  AgentRunnerContinuationPayload,
  AgentRunnerProcessResult,
  RequiredAgentRunnerCommandConfig
} from "./agentRunnerBridgeContract.js";
import { parseCodexJsonlStream } from "./codexAgentRunnerStream.js";
import { normalizeCodexTimeline } from "./codexAgentRunnerTimeline.js";

export async function classifyCodexJsonProcessResult(input: {
  input: AgentRunnerBridgeInput;
  processResult: AgentRunnerProcessResult;
  startedAt: string;
  completedAt: string;
  command: AgentRunnerCommandIdentity;
  payload: AgentRunnerContinuationPayload;
  artifactFiles: NonNullable<RequiredAgentRunnerCommandConfig["codexRunnerFiles"]>;
}): Promise<AgentRunnerBridgeResult> {
  const stdoutFileFailure = stdoutFileFailureResult(input);
  if (stdoutFileFailure !== undefined) {
    return stdoutFileFailure;
  }
  const streamOutput = await readCodexEventStreamText(
    input.artifactFiles.eventsFilePath
  ).catch((error: unknown) =>
    fileIoBlocked(input, error instanceof Error ? error.message : String(error))
  );
  if (typeof streamOutput !== "string") {
    return streamOutput;
  }
  const parsed = parseCodexJsonlStream(streamOutput);
  const processFailure = processFailureResult(input);
  const finalOutputForTimeline =
    parsed.malformed
    || processFailure !== undefined
      ? null
      : parsed.finalOutput;
  const timeline = normalizeCodexTimeline({
    events: parsed.events,
    finalOutput: finalOutputForTimeline,
    completedAt: input.completedAt
  });
  try {
    await writeTextAtomic(
      input.artifactFiles.timelineFilePath,
      timeline.length > 0
        ? `${timeline.map((row) => JSON.stringify(row)).join("\n")}\n`
        : ""
    );
  } catch (error) {
    if (processFailure !== undefined) {
      return processFailure;
    }
    return fileIoBlocked(
      input,
      error instanceof Error ? error.message : String(error)
    );
  }
  if (processFailure !== undefined) {
    return processFailure;
  }
  if (
    parsed.rawLines.length === 0
    || parsed.malformed
    || parsed.finalOutput === null
  ) {
    return blocked({
      input,
      reasonCode: "AGENT_RUNNER_OUTPUT_INVALID",
      stderr: input.processResult.stderr
    });
  }
  const structuredOutput = parsed.finalOutput;
  return {
    status: structuredOutput.status,
    invocationId: input.input.invocationId,
    startedAt: input.startedAt,
    completedAt: input.completedAt,
    reasonCode: structuredOutput.reasonCode,
    command: input.command,
    exitCode: input.processResult.exitCode,
    stdout: input.processResult.stdout,
    stderr: input.processResult.stderr,
    artifactDir: input.artifactFiles.artifactDirRef,
    ...(structuredOutput.summary !== undefined
      ? { runnerSummary: structuredOutput.summary }
      : {}),
    ...(structuredOutput.changedArtifacts !== undefined
      ? { changedArtifacts: structuredOutput.changedArtifacts }
      : {}),
    ...(structuredOutput.routeLedgerSummary !== undefined
      ? { routeLedgerSummary: structuredOutput.routeLedgerSummary }
      : {}),
    ...(parsed.codexSessionId !== undefined
      ? { codexSessionId: parsed.codexSessionId }
      : {}),
    payload: input.payload
  };
}

async function readCodexEventStreamText(
  eventsFilePath: string
): Promise<string> {
  return readFile(eventsFilePath, "utf8");
}

async function writeTextAtomic(path: string, content: string): Promise<void> {
  const tempPath = `${path}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tempPath, content, "utf8");
  try {
    await rename(tempPath, path);
  } catch (error) {
    await rm(tempPath, { force: true }).catch(() => undefined);
    throw error;
  }
}

function fileIoBlocked(
  input: Parameters<typeof classifyCodexJsonProcessResult>[0],
  stderr: string
): AgentRunnerBridgeResult {
  return blocked({
    input,
    reasonCode: "PLAN_WATCH_RUNNER_FILE_IO_FAILED",
    stderr: joinStderr(input.processResult.stderr, stderr)
  });
}

function joinStderr(processStderr: string, diagnostic: string): string {
  if (processStderr.length === 0) {
    return diagnostic;
  }
  if (diagnostic.length === 0) {
    return processStderr;
  }
  return `${processStderr}\n${diagnostic}`;
}

function processFailureResult(
  input: Parameters<typeof classifyCodexJsonProcessResult>[0]
): AgentRunnerBridgeResult | undefined {
  if (input.processResult.aborted) {
    return processBlocked(input, "AGENT_RUNNER_ABORTED", "abort");
  }
  if (input.processResult.timedOut) {
    return processBlocked(
      input,
      input.processResult.timeoutKind === "idle"
        ? "AGENT_RUNNER_IDLE_TIMEOUT"
        : "AGENT_RUNNER_TIMEOUT",
      "timeout"
    );
  }
  if (input.processResult.exitCode !== 0) {
    return processBlocked(input, "AGENT_RUNNER_NON_ZERO_EXIT", "exit");
  }
  return undefined;
}

function stdoutFileFailureResult(
  input: Parameters<typeof classifyCodexJsonProcessResult>[0]
): AgentRunnerBridgeResult | undefined {
  if (input.processResult.stdoutFileWriteError === undefined) {
    return undefined;
  }
  return fileIoBlocked(input, input.processResult.stdoutFileWriteError);
}

function processBlocked(
  input: Parameters<typeof classifyCodexJsonProcessResult>[0],
  reasonCode: AgentRunnerBridgeFailureReasonCode,
  failureStage: NonNullable<AgentRunnerBridgeResult["failureStage"]>
): AgentRunnerBridgeResult {
  return {
    status: "blocked",
    invocationId: input.input.invocationId,
    startedAt: input.startedAt,
    completedAt: input.completedAt,
    reasonCode,
    command: input.command,
    failureStage,
    exitCode: input.processResult.exitCode,
    stdout: input.processResult.stdout,
    stderr: input.processResult.stderr,
    payload: input.payload,
    artifactDir: input.artifactFiles.artifactDirRef
  };
}

function blocked(input: {
  input: {
    input: AgentRunnerBridgeInput;
    processResult: AgentRunnerProcessResult;
    startedAt: string;
    completedAt: string;
    command: AgentRunnerCommandIdentity;
    payload: AgentRunnerContinuationPayload;
    artifactFiles: NonNullable<RequiredAgentRunnerCommandConfig["codexRunnerFiles"]>;
  };
  reasonCode: AgentRunnerBridgeFailureReasonCode;
  stderr: string;
}): AgentRunnerBridgeResult {
  return {
    status: "blocked",
    invocationId: input.input.input.invocationId,
    startedAt: input.input.startedAt,
    completedAt: input.input.completedAt,
    reasonCode: input.reasonCode,
    command: input.input.command,
    failureStage: "output",
    exitCode: input.input.processResult.exitCode,
    stdout: input.input.processResult.stdout,
    stderr: input.stderr,
    payload: input.input.payload,
    artifactDir: input.input.artifactFiles.artifactDirRef
  };
}
