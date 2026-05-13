import { access, appendFile } from "node:fs/promises";

import type {
  AgentRunnerBridgeDependencies,
  AgentRunnerBridgeInput,
  AgentRunnerBridgeResult,
  AgentRunnerCommandConfig,
  AgentRunnerProcessInvocation,
  AgentRunnerProcessResult
} from "../../shared/planWatchRunner/agentRunnerBridgeContract.js";
import { runExecutePairflowPlanContinuation } from "../../application/planWatch/runner/agentRunnerBridge.js";
import {
  codexPlanWatchRunnerBackendAdapter
} from "../../infrastructure/executor/planWatch/codex/codexAgentRunnerBridge.js";
import { nodeProcessSpawn } from "../../infrastructure/executor/process/nodeProcessSpawn.js";
import type {
  ProcessSpawnPipeChild,
  ProcessSpawnPort
} from "../../ports/processSpawn.js";
import { MAX_NODE_TIMER_DELAY_MS } from "../../shared/timing/nodeTimerDelay.js";

const TIMEOUT_KILL_GRACE_MS = 100;
const MAX_CAPTURED_OUTPUT_CHARS = 64 * 1024;
const MIN_CAPTURED_DIAGNOSTIC_TAIL_CHARS = 8 * 1024;
const STRUCTURED_OUTPUT_STATUS_PATTERN =
  /"status"\s*:\s*"(settled_checkpoint|human_checkpoint|blocked)"/u;
const STRUCTURED_OUTPUT_REASON_PATTERN = /"reason_code"\s*:/u;

interface CapturedOutput {
  tail: string;
  structuredEnvelope?: string | undefined;
}

type StdoutArtifactWriter = (
  path: string,
  data: string,
  encoding: BufferEncoding
) => Promise<void>;

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
  processSpawn: ProcessSpawnPort = nodeProcessSpawn,
  stdoutArtifactWriter: StdoutArtifactWriter = appendFile
): Promise<AgentRunnerProcessResult> {
  if (invocation.signal?.aborted) {
    return Promise.resolve(abortedBeforeSpawnResult());
  }
  return new AgentRunnerCommandProcess(
    invocation,
    processSpawn,
    stdoutArtifactWriter
  ).run();
}

class AgentRunnerCommandProcess {
  private stdout: CapturedOutput = { tail: "" };
  private stderr: CapturedOutput = { tail: "" };
  private settled = false;
  private timedOut = false;
  private aborted = false;
  private idleTimer: NodeJS.Timeout | undefined;
  private killTimer: NodeJS.Timeout | undefined;
  private finalizationTimer: NodeJS.Immediate | undefined;
  private child: ProcessSpawnPipeChild | undefined;
  private stdoutFileWrite: Promise<void> = Promise.resolve();
  private stdoutFileWriteError: string | undefined;
  private resolve:
    | ((result: AgentRunnerProcessResult) => void)
    | undefined;
  private reject: ((error: Error) => void) | undefined;

  public constructor(
    private readonly invocation: AgentRunnerProcessInvocation,
    private readonly processSpawn: ProcessSpawnPort,
    private readonly stdoutArtifactWriter: StdoutArtifactWriter
  ) {}

  public run(): Promise<AgentRunnerProcessResult> {
    return new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
      const idleTimeoutMs = effectiveIdleTimeoutMs(this.invocation);
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
      this.resetIdleTimer(idleTimeoutMs);
      this.invocation.signal?.addEventListener("abort", this.abortRunner, {
        once: true
      });
      this.attachOutputHandlers(this.child);
      this.attachExitHandlers(this.child);
      this.writeStdin(this.child);
    });
  }

  private resetIdleTimer(idleTimeoutMs = effectiveIdleTimeoutMs(this.invocation)): void {
    if (this.settled || this.aborted || this.timedOut) {
      return;
    }
    if (this.idleTimer !== undefined) {
      this.clearIdleTimer();
    }
    this.idleTimer = setTimeout(() => {
      this.timedOut = true;
      this.idleTimer = undefined;
      this.child?.kill("SIGTERM");
      this.startKillTimer(() => {
        void this.forceResolve("timeout");
      });
    }, idleTimeoutMs);
    this.idleTimer.unref();
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
    if (this.settled || this.timedOut) {
      return;
    }
    this.aborted = true;
    this.clearIdleTimer();
    this.child?.kill("SIGTERM");
    this.startKillTimer(() => {
      void this.forceResolve("abort");
    });
  };

  private attachOutputHandlers(child: ProcessSpawnPipeChild): void {
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      if (this.settled) {
        return;
      }
      if (this.invocation.stdoutFilePath !== undefined) {
        this.appendStdoutFileChunk(chunk);
      }
      this.resetIdleTimer();
      this.stdout = appendCapturedOutput(this.stdout, chunk);
    });
    child.stderr.on("data", (chunk: string) => {
      if (this.settled) {
        return;
      }
      this.resetIdleTimer();
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
      if (!this.markSettled()) {
        return;
      }
      this.finalizationTimer = setImmediate(() => {
        void this.resolveSettledAfterStdoutFileWrite(exitCode);
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

  private async forceResolve(reason: "timeout" | "abort"): Promise<void> {
    if (!this.markSettled()) {
      return;
    }
    await this.waitForStdoutFileWrites();
    this.resolve?.({
      exitCode: null,
      stdout: capturedOutputToString(this.stdout),
      stderr: capturedOutputToString(this.stderr),
      ...(this.stdoutFileWriteError !== undefined
        ? { stdoutFileWriteError: this.stdoutFileWriteError }
        : {}),
      ...(reason === "timeout"
        ? { timedOut: true, timeoutKind: "idle" as const }
        : { aborted: true })
    });
  }

  private async resolveAfterStdoutFileWrite(exitCode: number | null): Promise<void> {
    if (!this.markSettled()) {
      return;
    }
    await this.resolveSettledAfterStdoutFileWrite(exitCode);
  }

  private async resolveSettledAfterStdoutFileWrite(exitCode: number | null): Promise<void> {
    await this.waitForStdoutFileWrites();
    this.resolve?.(this.result(exitCode));
  }

  private async waitForStdoutFileWrites(): Promise<void> {
    for (;;) {
      await new Promise<void>((resolve) => {
        setImmediate(resolve);
      });
      const pending = this.stdoutFileWrite;
      await pending;
      if (pending === this.stdoutFileWrite) {
        return;
      }
    }
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
    this.clearIdleTimer();
    this.invocation.signal?.removeEventListener("abort", this.abortRunner);
    if (this.killTimer !== undefined) {
      clearTimeout(this.killTimer);
    }
    if (this.finalizationTimer !== undefined) {
      clearImmediate(this.finalizationTimer);
    }
  }

  private clearIdleTimer(): void {
    if (this.idleTimer !== undefined) {
      clearTimeout(this.idleTimer);
      this.idleTimer = undefined;
    }
  }

  private result(exitCode: number | null): AgentRunnerProcessResult {
    return {
      exitCode: this.timedOut || this.aborted ? null : exitCode,
      stdout: capturedOutputToString(this.stdout),
      stderr: capturedOutputToString(this.stderr),
      ...(this.stdoutFileWriteError !== undefined
        ? { stdoutFileWriteError: this.stdoutFileWriteError }
        : {}),
      ...(this.aborted ? { aborted: true } : {}),
      ...(this.timedOut ? { timedOut: true, timeoutKind: "idle" as const } : {})
    };
  }

  private appendStdoutFileChunk(chunk: string): void {
    if (
      this.invocation.stdoutFilePath === undefined
      || this.settled
      || this.stdoutFileWriteError !== undefined
    ) {
      return;
    }
    const stdoutFilePath = this.invocation.stdoutFilePath;
    this.stdoutFileWrite = this.stdoutFileWrite
      .then(() => {
        if (this.stdoutFileWriteError !== undefined) {
          return;
        }
        return this.stdoutArtifactWriter(stdoutFilePath, chunk, "utf8");
      })
      .catch((error: unknown) => {
        if (this.stdoutFileWriteError === undefined) {
          this.stdoutFileWriteError =
            error instanceof Error ? error.message : String(error);
        }
      });
  }
}

function effectiveIdleTimeoutMs(invocation: AgentRunnerProcessInvocation): number {
  const idleTimeoutMs = invocation.idleTimeoutMs;
  if (
    !Number.isInteger(idleTimeoutMs)
    || idleTimeoutMs <= 0
    || idleTimeoutMs > MAX_NODE_TIMER_DELAY_MS
  ) {
    throw new Error(
      `AGENT_RUNNER_IDLE_TIMEOUT_INVALID: context=agent_runner_process_invocation idle timeout must be a positive integer no greater than ${MAX_NODE_TIMER_DELAY_MS} milliseconds.`
    );
  }
  return idleTimeoutMs;
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
  builtInBackends: [codexPlanWatchRunnerBackendAdapter]
};

export function runExecutePairflowPlanContinuationWithDefaults(
  input: AgentRunnerBridgeInput,
  config: AgentRunnerCommandConfig
): Promise<AgentRunnerBridgeResult> {
  return runExecutePairflowPlanContinuation(
    input,
    config,
    agentRunnerBridgeDefaults
  );
}

function appendCapturedOutput(
  current: CapturedOutput,
  chunk: string
): CapturedOutput {
  const next = `${current.tail}${chunk}`;
  const structuredEnvelope =
    extractLastStructuredEnvelopeCandidate(next) ?? current.structuredEnvelope;
  const prefixLength =
    structuredEnvelope !== undefined ? structuredEnvelope.length + 1 : 0;
  const rawTailBudget = MAX_CAPTURED_OUTPUT_CHARS - prefixLength;
  const tailBudget =
    structuredEnvelope === undefined
      ? MAX_CAPTURED_OUTPUT_CHARS
      : Math.min(
          MAX_CAPTURED_OUTPUT_CHARS,
          Math.max(rawTailBudget, MIN_CAPTURED_DIAGNOSTIC_TAIL_CHARS)
        );
  const tail =
    next.length <= tailBudget
      ? next
      : next.slice(next.length - tailBudget);

  return {
    tail,
    ...(structuredEnvelope !== undefined
      ? { structuredEnvelope }
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
