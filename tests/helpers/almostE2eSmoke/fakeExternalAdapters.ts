import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import type {
  ProcessSpawnChild,
  ProcessSpawnOptions,
  ProcessSpawnPort
} from "../../../src/v11/ports/processSpawn.js";
import type {
  LaunchBubbleSessionAck,
  LaunchBubbleSessionAckPort,
  LaunchBubbleSessionInput,
  TerminateBubbleTmuxSessionInput,
  TerminateBubbleTmuxSessionPort,
  TerminateBubbleTmuxSessionResult
} from "../../../src/v11/ports/tmuxSessions.js";

export interface FakeProcessSpawnCall {
  command: string;
  args: readonly string[];
  options?: ProcessSpawnOptions;
}

export interface FakeLaunchAckCall {
  input: LaunchBubbleSessionInput;
  ack: LaunchBubbleSessionAck;
}

export interface FakeTerminateTmuxCall {
  input: TerminateBubbleTmuxSessionInput;
  result: TerminateBubbleTmuxSessionResult;
}

export interface FakeEditorOpenCall {
  path: string;
  cwd?: string;
}

export interface FakeTerminalOpenCall {
  command: string;
  args: readonly string[];
  cwd?: string;
}

export interface FakeExternalSideEffectsSnapshot {
  processSpawns: FakeProcessSpawnCall[];
  launchAcks: FakeLaunchAckCall[];
  terminateTmux: FakeTerminateTmuxCall[];
  editorOpens: FakeEditorOpenCall[];
  terminalOpens: FakeTerminalOpenCall[];
}

export interface FakeExternalAdaptersOptions {
  sessionName?: string;
  onLaunchAck?: (input: LaunchBubbleSessionInput) => void | Promise<void>;
  processExitCode?: number | null;
}

class FakeProcessChild extends EventEmitter implements ProcessSpawnChild {
  public readonly stdin = new PassThrough();
  public readonly stdout = new PassThrough();
  public readonly stderr = new PassThrough();
  private closed = false;

  public constructor(exitCode: number | null) {
    super();
    queueMicrotask(() => {
      this.closeOnce(exitCode);
    });
  }

  public kill(): boolean {
    this.closeOnce(null);
    return true;
  }

  private closeOnce(exitCode: number | null): void {
    if (this.closed) {
      return;
    }
    this.closed = true;
    this.stdout.end();
    this.stderr.end();
    this.emit("close", exitCode);
  }
}

function cloneLaunchInput(input: LaunchBubbleSessionInput): LaunchBubbleSessionInput {
  return { ...input };
}

function cloneLaunchAck(ack: LaunchBubbleSessionAck): LaunchBubbleSessionAck {
  return { ...ack };
}

function cloneTerminateInput(
  input: TerminateBubbleTmuxSessionInput
): TerminateBubbleTmuxSessionInput {
  return { ...input };
}

function cloneTerminateResult(
  result: TerminateBubbleTmuxSessionResult
): TerminateBubbleTmuxSessionResult {
  return { ...result };
}

function cloneProcessSpawnOptions(
  options: ProcessSpawnOptions | undefined
): ProcessSpawnOptions | undefined {
  if (options === undefined) {
    return undefined;
  }
  return {
    ...(options.cwd !== undefined ? { cwd: options.cwd } : {}),
    ...(options.env !== undefined ? { env: { ...options.env } } : {}),
    ...(options.stdio !== undefined
      ? {
          stdio: Array.isArray(options.stdio)
            ? [...options.stdio] as ProcessSpawnOptions["stdio"]
            : options.stdio
        }
      : {})
  };
}

export class FakeExternalAdapters {
  private readonly processSpawnCalls: FakeProcessSpawnCall[] = [];
  private readonly launchAckCalls: FakeLaunchAckCall[] = [];
  private readonly terminateTmuxCalls: FakeTerminateTmuxCall[] = [];
  private readonly editorOpenCalls: FakeEditorOpenCall[] = [];
  private readonly terminalOpenCalls: FakeTerminalOpenCall[] = [];
  private readonly sessionName: string;
  private readonly onLaunchAck?: FakeExternalAdaptersOptions["onLaunchAck"];
  private readonly processExitCode: number | null;

  public constructor(options: FakeExternalAdaptersOptions = {}) {
    this.sessionName = options.sessionName ?? "pairflow-smoke";
    this.onLaunchAck = options.onLaunchAck;
    this.processExitCode =
      options.processExitCode === undefined ? 0 : options.processExitCode;
  }

  public readonly processSpawn: ProcessSpawnPort = (
    command,
    args,
    options
  ) => {
    const call: FakeProcessSpawnCall = {
      command,
      args: [...args]
    };
    const clonedOptions = cloneProcessSpawnOptions(options);
    if (clonedOptions !== undefined) {
      call.options = clonedOptions;
    }
    this.processSpawnCalls.push(call);
    return new FakeProcessChild(this.processExitCode);
  };

  public readonly launchBubbleSessionAck: LaunchBubbleSessionAckPort = async (
    input
  ) => {
    await this.onLaunchAck?.(input);
    const ack: LaunchBubbleSessionAck = {
      status: "running",
      sessionName: this.sessionName
    };
    this.launchAckCalls.push({
      input: cloneLaunchInput(input),
      ack: cloneLaunchAck(ack)
    });
    return ack;
  };

  public readonly terminateBubbleTmuxSession: TerminateBubbleTmuxSessionPort =
    (input) => {
      const result = {
        sessionName: input.sessionName ?? this.sessionName,
        existed: true
      };
      this.terminateTmuxCalls.push({
        input: cloneTerminateInput(input),
        result: cloneTerminateResult(result)
      });
      return Promise.resolve(result);
    };

  public readonly openEditor = (path: string, cwd?: string): Promise<void> => {
    this.editorOpenCalls.push({
      path,
      ...(cwd !== undefined ? { cwd } : {})
    });
    return Promise.resolve();
  };

  public readonly openTerminal = (
    command: string,
    args: readonly string[] = [],
    cwd?: string
  ): Promise<void> => {
    this.terminalOpenCalls.push({
      command,
      args: [...args],
      ...(cwd !== undefined ? { cwd } : {})
    });
    return Promise.resolve();
  };

  public snapshot(): FakeExternalSideEffectsSnapshot {
    return {
      processSpawns: this.processSpawnCalls.map((call) => {
        const clonedCall: FakeProcessSpawnCall = {
          command: call.command,
          args: [...call.args]
        };
        const clonedOptions = cloneProcessSpawnOptions(call.options);
        if (clonedOptions !== undefined) {
          clonedCall.options = clonedOptions;
        }
        return clonedCall;
      }),
      launchAcks: this.launchAckCalls.map((call) => ({
        input: cloneLaunchInput(call.input),
        ack: cloneLaunchAck(call.ack)
      })),
      terminateTmux: this.terminateTmuxCalls.map((call) => ({
        input: cloneTerminateInput(call.input),
        result: cloneTerminateResult(call.result)
      })),
      editorOpens: this.editorOpenCalls.map((call) => ({ ...call })),
      terminalOpens: this.terminalOpenCalls.map((call) => ({
        ...call,
        args: [...call.args]
      }))
    };
  }
}

export function createFakeExternalAdapters(
  options: FakeExternalAdaptersOptions = {}
): FakeExternalAdapters {
  return new FakeExternalAdapters(options);
}
