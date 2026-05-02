import { access, readFile } from "node:fs/promises";

import type {
  AgentRunnerBridgeDependencies,
  AgentRunnerProcessInvocation,
  AgentRunnerProcessResult
} from "../../application/planWatch/agentRunnerBridgeContract.js";
import {
  prepareCodexRunnerFiles
} from "../../application/planWatch/codexAgentRunnerBridge.js";
import { processSpawnDefault } from "../process/processSpawnDefaults.js";
import type {
  ProcessSpawnPipeChild,
  ProcessSpawnPort
} from "../../shared/ports/processSpawn.js";

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
  invocation: AgentRunnerProcessInvocation,
  processSpawn: ProcessSpawnPort = processSpawnDefault
): Promise<AgentRunnerProcessResult> {
  if (invocation.signal?.aborted) {
    return Promise.resolve(abortedBeforeSpawnResult());
  }
  return new AgentRunnerCommandProcess(invocation, processSpawn).run();
}

class AgentRunnerCommandProcess {
  private stdout: CapturedOutput = { tail: "" };
  private stderr: CapturedOutput = { tail: "" };
  private settled = false;
  private timedOut = false;
  private aborted = false;
  private timeoutTimer: NodeJS.Timeout | undefined;
  private killTimer: NodeJS.Timeout | undefined;
  private finalizationTimer: NodeJS.Immediate | undefined;
  private child: ProcessSpawnPipeChild | undefined;
  private resolve:
    | ((result: AgentRunnerProcessResult) => void)
    | undefined;
  private reject: ((error: Error) => void) | undefined;

  public constructor(
    private readonly invocation: AgentRunnerProcessInvocation,
    private readonly processSpawn: ProcessSpawnPort
  ) {}

  public run(): Promise<AgentRunnerProcessResult> {
    return new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
      const child = this.processSpawn(this.invocation.command, this.invocation.args, {
        cwd: this.invocation.cwd,
        ...(this.invocation.env !== undefined ? { env: this.invocation.env } : {}),
        stdio: ["pipe", "pipe", "pipe"]
      });
      if (child.stdin === null || child.stdout === null || child.stderr === null) {
        reject(new Error("agent runner process did not expose pipe streams"));
        return;
      }
      this.child = child as ProcessSpawnPipeChild;
      this.startTimeoutTimer();
      this.invocation.signal?.addEventListener("abort", this.abortRunner, {
        once: true
      });
      this.attachOutputHandlers(this.child);
      this.attachExitHandlers(this.child);
      this.writeStdin(this.child);
    });
  }

  private startTimeoutTimer(): void {
    this.timeoutTimer = setTimeout(() => {
      this.timedOut = true;
      this.child?.kill("SIGTERM");
      this.startKillTimer(() => this.forceResolve("timeout"));
    }, this.invocation.timeoutMs);
    this.timeoutTimer.unref();
  }

  private startKillTimer(onExpired: () => void): void {
    if (this.killTimer !== undefined) {
      clearTimeout(this.killTimer);
    }
    this.killTimer = setTimeout(() => {
      if (this.settled) {
        return;
      }
      this.child?.kill("SIGKILL");
      onExpired();
    }, TIMEOUT_KILL_GRACE_MS);
    this.killTimer.unref();
  }

  private readonly abortRunner = (): void => {
    if (this.settled) {
      return;
    }
    this.aborted = true;
    this.child?.kill("SIGTERM");
    this.startKillTimer(() => this.forceResolve("abort"));
  };

  private attachOutputHandlers(child: ProcessSpawnPipeChild): void {
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      this.stdout = appendCapturedOutput(this.stdout, chunk);
    });
    child.stderr.on("data", (chunk: string) => {
      this.stderr = appendCapturedOutput(this.stderr, chunk);
    });
    child.stdin.once("error", (error: Error) => {
      if (!this.settled) {
        this.stderr = appendCapturedOutput(
          this.stderr,
          `${capturedOutputToString(this.stderr).length > 0 ? "\n" : ""}${error.message}`
        );
      }
    });
  }

  private attachExitHandlers(child: ProcessSpawnPipeChild): void {
    child.once("error", (error) => {
      if (this.markSettled()) {
        this.reject?.(error);
      }
    });
    child.once("close", (exitCode) => {
      if (this.settled) {
        return;
      }
      this.finalizationTimer = setImmediate(() => {
        if (this.markSettled()) {
          this.resolve?.(this.result(exitCode));
        }
      });
    });
  }

  private writeStdin(child: ProcessSpawnPipeChild): void {
    if (!child.stdin.writable) {
      if (this.markSettled()) {
        child.kill("SIGTERM");
        this.reject?.(new Error("child stdin is not writable"));
      }
      return;
    }
    child.stdin.end(this.invocation.stdin ?? "");
  }

  private forceResolve(reason: "timeout" | "abort"): void {
    if (!this.markSettled()) {
      return;
    }
    this.resolve?.({
      exitCode: null,
      stdout: capturedOutputToString(this.stdout),
      stderr: capturedOutputToString(this.stderr),
      ...(reason === "timeout" ? { timedOut: true } : { aborted: true })
    });
  }

  private markSettled(): boolean {
    if (this.settled) {
      return false;
    }
    this.settled = true;
    this.clearTimers();
    return true;
  }

  private clearTimers(): void {
    if (this.timeoutTimer !== undefined) {
      clearTimeout(this.timeoutTimer);
    }
    this.invocation.signal?.removeEventListener("abort", this.abortRunner);
    if (this.killTimer !== undefined) {
      clearTimeout(this.killTimer);
    }
    if (this.finalizationTimer !== undefined) {
      clearImmediate(this.finalizationTimer);
    }
  }

  private result(exitCode: number | null): AgentRunnerProcessResult {
    return {
      exitCode: this.timedOut || this.aborted ? null : exitCode,
      stdout: capturedOutputToString(this.stdout),
      stderr: capturedOutputToString(this.stderr),
      ...(this.aborted ? { aborted: true } : {}),
      ...(this.timedOut ? { timedOut: true } : {})
    };
  }
}

function abortedBeforeSpawnResult(): AgentRunnerProcessResult {
  return {
    exitCode: null,
    stdout: "",
    stderr: "Agent runner invocation was aborted before spawn.",
    aborted: true
  };
}

export const agentRunnerBridgeDefaults: AgentRunnerBridgeDependencies = {
  pathExists,
  runCommand: runAgentRunnerCommand,
  prepareCodexRunnerFiles,
  readTextFile: (path) => readFile(path, "utf8")
};

function appendCapturedOutput(
  current: CapturedOutput,
  chunk: string
): CapturedOutput {
  const next = `${current.tail}${chunk}`;
  const structuredEnvelope =
    extractLastStructuredEnvelopeCandidate(next) ?? current.structuredEnvelope;
  const retainedStructuredEnvelope =
    structuredEnvelope !== undefined
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
