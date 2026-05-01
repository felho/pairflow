import { spawn } from "node:child_process";
import { access } from "node:fs/promises";

import type {
  AgentRunnerBridgeDependencies,
  AgentRunnerProcessInvocation,
  AgentRunnerProcessResult
} from "../../application/planWatch/agentRunnerBridgeContract.js";

const TIMEOUT_KILL_GRACE_MS = 100;
const MAX_CAPTURED_OUTPUT_CHARS = 64 * 1024;
const STRUCTURED_OUTPUT_STATUS_PATTERN =
  /"status"\s*:\s*"(settled_checkpoint|human_checkpoint|blocked)"/u;
const STRUCTURED_OUTPUT_REASON_PATTERN = /"reason_code"\s*:/u;

interface CapturedOutput {
  tail: string;
  structuredEnvelope?: string | undefined;
}

export async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export function runAgentRunnerCommand(
  invocation: AgentRunnerProcessInvocation
): Promise<AgentRunnerProcessResult> {
  return new Promise((resolve, reject) => {
    let stdout: CapturedOutput = { tail: "" };
    let stderr: CapturedOutput = { tail: "" };
    let settled = false;
    let timedOut = false;
    let killTimer: NodeJS.Timeout | undefined;
    let finalizationTimer: NodeJS.Immediate | undefined;

    const child = spawn(invocation.command, invocation.args, {
      cwd: invocation.cwd,
      ...(invocation.env !== undefined ? { env: invocation.env } : {}),
      stdio: ["pipe", "pipe", "pipe"]
    });

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      killTimer = setTimeout(() => {
        if (settled) {
          return;
        }
        child.kill("SIGKILL");
        forceResolveTimedOut();
      }, TIMEOUT_KILL_GRACE_MS);
      killTimer.unref();
    }, invocation.timeoutMs);
    timer.unref();

    function clearTimers(): void {
      clearTimeout(timer);
      if (killTimer !== undefined) {
        clearTimeout(killTimer);
      }
      if (finalizationTimer !== undefined) {
        clearImmediate(finalizationTimer);
      }
    }

    function forceResolveTimedOut(): void {
      if (settled) {
        return;
      }
      settled = true;
      clearTimers();
      resolve({
        exitCode: null,
        stdout: capturedOutputToString(stdout),
        stderr: capturedOutputToString(stderr),
        timedOut: true
      });
    }

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout = appendCapturedOutput(stdout, chunk);
    });
    child.stderr.on("data", (chunk: string) => {
      stderr = appendCapturedOutput(stderr, chunk);
    });

    child.once("error", (error) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimers();
      reject(error);
    });

    child.once("close", (exitCode) => {
      if (settled) {
        return;
      }
      finalizationTimer = setImmediate(() => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimers();
        resolve({
          exitCode,
          stdout: capturedOutputToString(stdout),
          stderr: capturedOutputToString(stderr),
          ...(timedOut ? { timedOut: true } : {})
        });
      });
    });

    child.stdin.once("error", (error) => {
      if (settled) {
        return;
      }
      stderr = appendCapturedOutput(
        stderr,
        `${capturedOutputToString(stderr).length > 0 ? "\n" : ""}${error.message}`
      );
    });

    if (!child.stdin.writable) {
      settled = true;
      clearTimers();
      child.kill("SIGTERM");
      reject(new Error("child stdin is not writable"));
      return;
    }
    child.stdin.end(invocation.stdin ?? "");
  });
}

export const agentRunnerBridgeDefaults: AgentRunnerBridgeDependencies = {
  pathExists,
  runCommand: runAgentRunnerCommand
};

function appendCapturedOutput(
  current: CapturedOutput,
  chunk: string
): CapturedOutput {
  const next = `${current.tail}${chunk}`;
  const structuredEnvelope =
    extractLastStructuredEnvelopeCandidate(next) ?? current.structuredEnvelope;
  const retainedStructuredEnvelope =
    structuredEnvelope !== undefined &&
    structuredEnvelope.length < MAX_CAPTURED_OUTPUT_CHARS
      ? structuredEnvelope
      : undefined;
  const prefixLength =
    retainedStructuredEnvelope !== undefined ? retainedStructuredEnvelope.length + 1 : 0;
  const tailBudget = MAX_CAPTURED_OUTPUT_CHARS - prefixLength;
  const tail =
    next.length <= tailBudget || tailBudget <= 0
      ? next.slice(Math.max(0, next.length - Math.max(0, tailBudget)))
      : next.slice(next.length - tailBudget);

  return {
    tail,
    ...(retainedStructuredEnvelope !== undefined
      ? { structuredEnvelope: retainedStructuredEnvelope }
      : {})
  };
}

function capturedOutputToString(output: CapturedOutput): string {
  if (output.structuredEnvelope === undefined) {
    return output.tail;
  }
  if (output.tail.includes(output.structuredEnvelope)) {
    return output.tail;
  }
  if (output.tail.length === 0) {
    return output.structuredEnvelope;
  }
  return `${output.structuredEnvelope}\n${output.tail}`;
}

function extractLastStructuredEnvelopeCandidate(value: string): string | undefined {
  const starts: number[] = [];
  let latest: string | undefined;
  let inString = false;
  let escaped = false;

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "{") {
      starts.push(index);
    } else if (char === "}") {
      const start = starts.pop();
      if (start !== undefined) {
        const candidate = value.slice(start, index + 1).trim();
        if (looksLikeStructuredEnvelope(candidate)) {
          latest = candidate;
        }
      }
    }
  }

  return latest;
}

function looksLikeStructuredEnvelope(candidate: string): boolean {
  return (
    STRUCTURED_OUTPUT_STATUS_PATTERN.test(candidate) &&
    STRUCTURED_OUTPUT_REASON_PATTERN.test(candidate)
  );
}
