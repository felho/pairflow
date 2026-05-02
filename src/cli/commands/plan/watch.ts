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
    "  pairflow plan watch <plan-path> [--repo <path>] [--interval-seconds <n>] [--once] [--dry-run] [--run-now]",
    "",
    "Options:",
    "  --repo <path>                     Repository path (defaults to cwd)",
    "  --interval-seconds <n>            Poll interval in seconds (default 60)",
    "  --once                            Run one iteration and exit",
    "  --dry-run                         Discover and ledger without invoking the runner",
    "  --run-now                         Invoke the runner once even when no linked bubble trigger exists",
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

  return {
    planPath,
    repo: parsed.values.repo ?? cwd,
    intervalSeconds,
    once: parsed.values.once ?? false,
    dryRun: parsed.values["dry-run"] ?? false,
    runNow: parsed.values["run-now"] ?? false,
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
  onEvent?: (event: PlanWatchEvent) => void | Promise<void>
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
  const input: PlanWatchInput = {
    repoPath: options.repo,
    planPath: options.planPath,
    intervalMs: options.intervalSeconds * 1000,
    once: options.once,
    dryRun: options.dryRun,
    runNow: options.runNow,
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
    ...(onEvent !== undefined ? { onEvent } : {})
  };
  try {
    const loop = await runPlanWatchLoop(
      input,
      createDependencies(options.repo)
    );
    return loop.iterations[loop.iterations.length - 1] ?? null;
  } finally {
    stop.cleanup();
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
