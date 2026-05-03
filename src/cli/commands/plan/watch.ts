import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";

import {
  loadPairflowRepoConfig
} from "../../../config/repoConfig.js";
import {
  runPlanWatchLoop
} from "../../../v11/application/planWatch/planWatchLoop.js";
import {
  DEFAULT_PLAN_WATCH_INTERVAL_MS,
  type PlanWatchEvent,
  type PlanWatchInput,
  type PlanWatchIterationResult,
  type PlanWatchLoopDependencies
} from "../../../v11/application/planWatch/planWatchLoopContract.js";
import {
  createDefaultPlanWatchLoopDependencies
} from "../../../v11/defaults/planWatch/planWatchLoopDefaults.js";
import {
  normalizeCodexTimeline
} from "../../../v11/application/planWatch/codexAgentRunnerTimeline.js";
import type {
  AgentRunnerBridgeInputMode
} from "../../../v11/application/planWatch/agentRunnerBridgeContract.js";

export interface PlanWatchCommandOptions {
  planPath: string;
  repo: string;
  intervalSeconds: number;
  once: boolean;
  dryRun: boolean;
  runNow: boolean;
  forceRun: boolean;
  followRunner: boolean;
  runnerCommand?: string | undefined;
  runnerArgs: readonly string[];
  runnerInputMode: AgentRunnerBridgeInputMode;
  runnerInputModeSpecified?: boolean | undefined;
  help: false;
}

export interface PlanWatchHelpCommandOptions {
  help: true;
}

export type ParsedPlanWatchCommandOptions =
  | PlanWatchCommandOptions
  | PlanWatchHelpCommandOptions;

export function getPlanWatchHelpText(): string {
  return [
    "Usage:",
    "  pairflow plan watch <plan-path> [--repo <path>] [--interval-seconds <n>] [--once] [--dry-run] [--run-now] [--force-run] [--follow-runner]",
    "",
    "Options:",
    "  --repo <path>                     Repository path (defaults to cwd)",
    "  --interval-seconds <n>            Poll interval in seconds (default 60)",
    "  --once                            Run one iteration and exit",
    "  --dry-run                         Discover and ledger without invoking the runner",
    "  --run-now                         Invoke the runner once even when no linked bubble trigger exists",
    "  --force-run                       Re-run an explicit --run-now invocation even if the ledger has prior run evidence",
    "  --follow-runner                   Print normalized runner timeline rows while the runner is active",
    "  --runner-command <cmd>            Legacy/internal runner command override",
    "  --runner-arg <arg>                Legacy runner argument; may be repeated",
    "  --runner-input-mode <mode>        Legacy stdin_json or arg_json (default stdin_json)",
    "  -h, --help                        Show this help"
  ].join("\n");
}

export function parsePlanWatchCommandOptions(
  args: string[],
  cwd: string = process.cwd()
): ParsedPlanWatchCommandOptions {
  const parsed = parseArgs({
    args,
    options: {
      repo: { type: "string" },
      "interval-seconds": { type: "string" },
      once: { type: "boolean" },
      "dry-run": { type: "boolean" },
      "run-now": { type: "boolean" },
      "force-run": { type: "boolean" },
      "follow-runner": { type: "boolean" },
      "runner-command": { type: "string" },
      "runner-arg": { type: "string", multiple: true },
      "runner-input-mode": { type: "string" },
      help: { type: "boolean", short: "h" }
    },
    strict: true,
    allowPositionals: true
  });

  if (parsed.values.help ?? false) {
    return { help: true };
  }

  const planPath = parsed.positionals[0];
  if (planPath === undefined) {
    throw new Error("PLAN_WATCH_PLAN_PATH_REQUIRED: Missing required plan path.");
  }

  const intervalSeconds = parseIntervalSeconds(parsed.values["interval-seconds"]);
  const runnerInputMode = parseRunnerInputMode(parsed.values["runner-input-mode"]);
  const runNow = parsed.values["run-now"] ?? false;
  const forceRun = parsed.values["force-run"] ?? false;
  if (forceRun && !runNow) {
    throw new Error("PLAN_WATCH_FORCE_RUN_REQUIRES_RUN_NOW: --force-run requires --run-now.");
  }

  return {
    planPath,
    repo: parsed.values.repo ?? cwd,
    intervalSeconds,
    once: parsed.values.once ?? false,
    dryRun: parsed.values["dry-run"] ?? false,
    runNow,
    forceRun,
    followRunner: parsed.values["follow-runner"] ?? false,
    ...(parsed.values["runner-command"] !== undefined
      ? { runnerCommand: parsed.values["runner-command"] }
      : {}),
    runnerArgs: parsed.values["runner-arg"] ?? [],
    runnerInputMode,
    runnerInputModeSpecified: parsed.values["runner-input-mode"] !== undefined,
    help: false
  };
}

export async function runPlanWatchCommand(
  args: string[] | PlanWatchCommandOptions,
  cwd: string = process.cwd(),
  createDependencies: (repo: string) => PlanWatchLoopDependencies =
    createDefaultPlanWatchLoopDependencies,
  onEvent?: (event: PlanWatchEvent) => void | Promise<void>,
  onRunnerTimelineLine?: (line: string) => void | Promise<void>
): Promise<PlanWatchIterationResult | null> {
  const options = Array.isArray(args) ? parsePlanWatchCommandOptions(args, cwd) : args;
  if (options.help) {
    return null;
  }

  const repoConfig = await loadPairflowRepoConfig(options.repo);
  const configuredRunnerBackend = repoConfig.plan_watch?.runner?.backend;
  if (configuredRunnerBackend !== undefined && options.runnerCommand !== undefined) {
    throw new Error(
      "PLAN_WATCH_RUNNER_COMMAND_UNSUPPORTED: --runner-command cannot be combined with [plan_watch.runner] backend."
    );
  }
  if (
    configuredRunnerBackend !== undefined
    && options.runnerArgs.length > 0
  ) {
    throw new Error(
      "PLAN_WATCH_RUNNER_ARG_UNSUPPORTED: --runner-arg cannot be combined with [plan_watch.runner] backend."
    );
  }
  if (
    configuredRunnerBackend !== undefined
    && options.runnerInputModeSpecified === true
  ) {
    throw new Error(
      "PLAN_WATCH_RUNNER_INPUT_MODE_UNSUPPORTED: --runner-input-mode cannot be combined with [plan_watch.runner] backend."
    );
  }
  const stop = createPlanWatchStopSignal();
  const follower =
    options.followRunner && onRunnerTimelineLine !== undefined
      ? new PlanWatchRunnerTimelineFollower(onRunnerTimelineLine)
      : undefined;
  const onEventWithFollower = async (event: PlanWatchEvent): Promise<void> => {
    if (event.kind === "runner_artifact_ready") {
      follower?.start(event.artifactFiles.eventsFilePath);
    }
    if (event.kind === "runner_completed") {
      await follower?.stop();
    }
    await onEvent?.(event);
  };
  const input: PlanWatchInput = {
    repoPath: options.repo,
    planPath: options.planPath,
    intervalMs: options.intervalSeconds * 1000,
    once: options.once,
    dryRun: options.dryRun,
    runNow: options.runNow,
    forceRun: options.forceRun,
    runnerConfig: {
      ...(options.runnerCommand === undefined && configuredRunnerBackend !== undefined
        ? { backend: configuredRunnerBackend }
        : {}),
      ...(options.runnerCommand !== undefined
        ? { command: options.runnerCommand }
        : {}),
      args: options.runnerArgs,
      inputMode: options.runnerInputMode,
      cwd: options.repo
    },
    ...(stop.signal !== undefined ? { stopSignal: stop.signal } : {}),
    onEvent: onEventWithFollower
  };
  try {
    const loop = await runPlanWatchLoop(
      input,
      createDependencies(options.repo)
    );
    return loop.iterations[loop.iterations.length - 1] ?? null;
  } finally {
    await follower?.stop();
    stop.cleanup();
  }
}

class PlanWatchRunnerTimelineFollower {
  private eventsFilePath: string | undefined;
  private emittedLineCount = 0;
  private timer: NodeJS.Timeout | undefined;
  private flushing: Promise<void> = Promise.resolve();

  public constructor(
    private readonly onLine: (line: string) => void | Promise<void>
  ) {}

  public start(eventsFilePath: string): void {
    this.eventsFilePath = eventsFilePath;
    this.emittedLineCount = 0;
    this.flushSoon();
    this.timer = setInterval(() => {
      this.flushSoon();
    }, 250);
    this.timer.unref();
  }

  public async stop(): Promise<void> {
    if (this.timer !== undefined) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
    await this.flush();
    await this.flushing;
  }

  private flushSoon(): void {
    this.flushing = this.flushing.then(() => this.flush());
  }

  private async flush(): Promise<void> {
    if (this.eventsFilePath === undefined) {
      return;
    }
    let text: string;
    try {
      text = await readFile(this.eventsFilePath, "utf8");
    } catch {
      return;
    }
    const lines = text.split(/\r?\n/u).filter((line) => line.length > 0);
    const freshLines = lines.slice(this.emittedLineCount);
    this.emittedLineCount = lines.length;
    for (const line of freshLines) {
      const rendered = renderPlanWatchRunnerEventLine(line);
      if (rendered !== null) {
        await this.onLine(rendered);
      }
    }
  }
}

function createPlanWatchStopSignal(): {
  signal?: AbortSignal | undefined;
  cleanup: () => void;
} {
  if (typeof process.once !== "function") {
    return { cleanup: () => undefined };
  }
  const controller = new AbortController();
  const abort = (): void => {
    controller.abort();
  };
  const cleanup = (): void => {
    process.off("SIGINT", abort);
    process.off("SIGTERM", abort);
  };
  process.once("SIGINT", abort);
  process.once("SIGTERM", abort);
  controller.signal.addEventListener("abort", cleanup, { once: true });
  return {
    signal: controller.signal,
    cleanup
  };
}

export function renderPlanWatchText(result: PlanWatchIterationResult): string {
  const parts = [
    `plan watch: ${result.status}`,
    `candidates=${result.scannedCandidateCount}`,
    `deferred=${result.deferredCandidateCount}`
  ];
  if (result.selectedCandidate !== undefined) {
    parts.push(
      `task=${result.selectedCandidate.taskId}`,
      `bubble=${result.selectedCandidate.bubbleId}`
    );
  }
  if (result.blockedReasonKind !== undefined) {
    parts.push(`blocked_reason=${result.blockedReasonKind}`);
  }
  if (result.runnerResult !== undefined) {
    parts.push(`runner_reason=${result.runnerResult.reasonCode}`);
  }
  return parts.join(" ");
}

export function renderPlanWatchEventText(event: PlanWatchEvent): string {
  if (event.kind === "loop_started") {
    return [
      "plan watch: started",
      `plan=${event.planPath}`,
      `repo=${event.repoPath}`,
      `interval=${event.intervalMs / 1000}s`,
      `once=${event.once ? "yes" : "no"}`
    ].join(" ");
  }
  if (event.kind === "candidate_selected") {
    return [
      "plan watch: candidate",
      `task=${event.candidate.taskId}`,
      `bubble=${event.candidate.bubbleId}`,
      `state=${event.candidate.observedState}`,
      `candidate=${event.candidateIndex + 1}/${event.candidateCount}`
    ].join(" ");
  }
  if (event.kind === "runner_started") {
    return [
      "plan watch: runner started",
      `invocation=${event.invocationId}`,
      `task=${event.candidate.taskId}`,
      `bubble=${event.candidate.bubbleId}`
    ].join(" ");
  }
  if (event.kind === "runner_artifact_ready") {
    return [
      "plan watch: runner artifacts",
      `invocation=${event.invocationId}`,
      `dir=${event.artifactFiles.artifactDirRef}`
    ].join(" ");
  }
  if (event.kind === "runner_completed") {
    return [
      "plan watch: runner completed",
      `invocation=${event.invocationId}`,
      `status=${event.runnerResult.status}`,
      `reason=${event.runnerResult.reasonCode}`
    ].join(" ");
  }
  if (event.kind === "iteration_completed") {
    return [
      `plan watch: iteration ${event.iterationIndex + 1}`,
      renderPlanWatchText(event.result)
    ].join(" ");
  }
  return [
    "plan watch: stopped",
    `status=${event.status}`,
    `iterations=${event.iterationCount}`,
    `reason=${event.stopReason}`
  ].join(" ");
}

export function renderPlanWatchRunnerTimelineLine(line: string): string | null {
  let row: unknown;
  try {
    row = JSON.parse(line);
  } catch {
    return null;
  }
  if (!isRecord(row) || typeof row.type !== "string") {
    return null;
  }
  if (row.type === "command_started" || row.type === "command_completed") {
    return null;
  }
  if (row.type === "runner_status") {
    const output = parseRunnerStatusSummary(asString(row.summary));
    if (output !== undefined) {
      return renderRunnerMessage({
        label: "runner",
        reason: output.reason_code,
        summary: output.summary,
        status: output.status
      });
    }
    return renderRunnerMessage({
      label: "runner",
      summary: asString(row.summary)
    });
  }
  if (row.type === "runner_completed") {
    return renderRunnerMessage({
      label: "runner",
      reason: `completed ${asString(row.reasonCode) ?? "unknown"}`,
      summary: asString(row.summary),
      status: asString(row.status)
    });
  }
  if (row.type === "runner_event_malformed") {
    return "runner: malformed event";
  }
  return null;
}

export function renderPlanWatchRunnerEventLine(line: string): string | null {
  let event: unknown;
  try {
    event = JSON.parse(line);
  } catch {
    return "runner: malformed event";
  }
  if (!isRecord(event)) {
    return "runner: malformed event";
  }
  const rows = normalizeCodexTimeline({
    events: [{ line, value: event }],
    finalOutput: null,
    completedAt: new Date().toISOString()
  });
  for (const row of rows) {
    const rendered = renderPlanWatchRunnerTimelineLine(JSON.stringify(row));
    if (rendered !== null) {
      return rendered;
    }
  }
  return null;
}

export class PlanWatchTerminalRenderer {
  private intervalMs = DEFAULT_PLAN_WATCH_INTERVAL_MS;
  private idleLineActive = false;

  public constructor(
    private readonly input: {
      write: (text: string) => void;
      isTty: boolean;
      color?: boolean | undefined;
    }
  ) {}

  public writeEvent(event: PlanWatchEvent): void {
    if (event.kind === "loop_started") {
      this.intervalMs = event.intervalMs;
    }
    if (
      this.input.isTty
      && event.kind === "iteration_completed"
      && event.result.status === "idle"
    ) {
      this.writeIdle(event);
      return;
    }
    this.flushIdleLine();
    this.writeLine(colorizePlanWatchLine(renderPlanWatchEventText(event), this.useColor()));
  }

  public writeRunnerLine(line: string): void {
    this.flushIdleLine();
    this.writeLine(colorizeRunnerLine(line, this.useColor()));
  }

  public flushIdleLine(): void {
    if (!this.idleLineActive) {
      return;
    }
    this.input.write("\n");
    this.idleLineActive = false;
  }

  private writeIdle(event: Extract<PlanWatchEvent, { kind: "iteration_completed" }>): void {
    const iterations = event.iterationIndex + 1;
    const text = [
      "plan watch: idle",
      `iterations=${iterations}`,
      `elapsed=${formatElapsed(iterations * this.intervalMs)}`,
      `candidates=${event.result.scannedCandidateCount}`
    ].join(" ");
    this.input.write(`\r\u001b[2K${colorizePlanWatchLine(text, this.useColor())}`);
    this.idleLineActive = true;
  }

  private writeLine(line: string): void {
    this.input.write(`${line}\n`);
  }

  private useColor(): boolean {
    return this.input.isTty && this.input.color !== false;
  }
}

function colorizePlanWatchLine(line: string, color: boolean): string {
  if (!color || !line.startsWith("plan watch:")) {
    return line;
  }
  return `${ansi.cyan}plan watch:${ansi.reset}${line.slice("plan watch:".length)}`;
}

function colorizeRunnerLine(line: string, color: boolean): string {
  if (!color || !line.startsWith("runner:")) {
    return line;
  }
  const rest = line.slice("runner:".length);
  const separatorIndex = rest.indexOf(" - ");
  if (separatorIndex < 0) {
    return `${ansi.magenta}runner:${ansi.reset}${ansi.yellow}${rest}${ansi.reset}`;
  }
  const tag = rest.slice(0, separatorIndex + 3);
  const summary = rest.slice(separatorIndex + 3);
  return `${ansi.magenta}runner:${ansi.reset}${ansi.yellow}${tag}${ansi.reset}${summary}`;
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }
  const totalMinutes = Math.round(totalSeconds / 60);
  if (totalMinutes < 60) {
    return `${totalMinutes}m`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes === 0 ? `${hours}h` : `${hours}h${minutes}m`;
}

const ansi = {
  cyan: "\u001b[36m",
  magenta: "\u001b[35m",
  yellow: "\u001b[33m",
  reset: "\u001b[0m"
} as const;

function parseRunnerStatusSummary(value: string | undefined):
  | { status?: string | undefined; reason_code?: string | undefined; summary?: string | undefined }
  | undefined {
  if (value === undefined) {
    return undefined;
  }
  try {
    const parsed: unknown = JSON.parse(value);
    if (!isRecord(parsed)) {
      return undefined;
    }
    return {
      ...(asString(parsed.status) !== undefined ? { status: asString(parsed.status) } : {}),
      ...(asString(parsed.reason_code) !== undefined
        ? { reason_code: asString(parsed.reason_code) }
        : {}),
      ...(asString(parsed.summary) !== undefined ? { summary: asString(parsed.summary) } : {})
    };
  } catch {
    return undefined;
  }
}

function renderRunnerMessage(input: {
  label: string;
  reason?: string | undefined;
  summary?: string | undefined;
  status?: string | undefined;
}): string {
  const headline = input.reason ?? input.status ?? "update";
  const summary = input.summary?.trim();
  if (summary === undefined || summary.length === 0) {
    return `${input.label}: ${headline}`;
  }
  return `${input.label}: ${headline} - ${normalizeInline(summary)}`;
}

function normalizeInline(value: string): string {
  return value.replace(/\s+/gu, " ");
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseIntervalSeconds(value: string | undefined): number {
  if (value === undefined) {
    return DEFAULT_PLAN_WATCH_INTERVAL_MS / 1000;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(
      "PLAN_WATCH_INTERVAL_INVALID: --interval-seconds must be a positive number."
    );
  }
  return parsed;
}

function parseRunnerInputMode(value: string | undefined): AgentRunnerBridgeInputMode {
  if (value === undefined) {
    return "stdin_json";
  }
  if (value === "stdin_json" || value === "arg_json") {
    return value;
  }
  throw new Error(
    "PLAN_WATCH_RUNNER_INPUT_MODE_INVALID: --runner-input-mode must be stdin_json or arg_json."
  );
}
