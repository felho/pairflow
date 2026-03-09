import { parseArgs, stripVTControlCharacters } from "node:util";

import {
  asBubbleStatusError,
  getBubbleStatus,
  type BubbleStatusView
} from "../../../core/bubble/statusBubble.js";

export interface BubbleStatusCommandOptions {
  id: string;
  repo?: string;
  json: boolean;
  table: boolean;
  help: false;
}

export interface BubbleStatusHelpCommandOptions {
  help: true;
}

export type ParsedBubbleStatusCommandOptions =
  | BubbleStatusCommandOptions
  | BubbleStatusHelpCommandOptions;

export function getBubbleStatusHelpText(): string {
  return [
    "Usage:",
    "  pairflow bubble status --id <id> [--repo <path>] [--json] [--table]",
    "",
    "Options:",
    "  --id <id>             Bubble id",
    "  --repo <path>         Optional repository path (defaults to cwd ancestry lookup)",
    "  --json                Print structured JSON output",
    "  --table               Print compact table output (default)",
    "  -h, --help            Show this help"
  ].join("\n");
}

export function parseBubbleStatusCommandOptions(
  args: string[]
): ParsedBubbleStatusCommandOptions {
  const parsed = parseArgs({
    args,
    options: {
      id: {
        type: "string"
      },
      repo: {
        type: "string"
      },
      json: {
        type: "boolean"
      },
      table: {
        type: "boolean"
      },
      help: {
        type: "boolean",
        short: "h"
      }
    },
    strict: true,
    allowPositionals: false
  });

  if (parsed.values.help ?? false) {
    return { help: true };
  }

  const id = parsed.values.id;
  if (id === undefined) {
    throw new Error("Missing required option: --id");
  }

  return {
    id,
    ...(parsed.values.repo !== undefined ? { repo: parsed.values.repo } : {}),
    json: parsed.values.json ?? false,
    table: parsed.values.table ?? false,
    help: false
  };
}

function style(input: string, ...ansiCodes: number[]): string {
  if (!process.stdout.isTTY) {
    return input;
  }
  if (process.env.NO_COLOR !== undefined) {
    return input;
  }
  return `\u001b[${ansiCodes.join(";")}m${input}\u001b[0m`;
}

function green(input: string): string {
  return style(input, 32);
}

function yellow(input: string): string {
  return style(input, 33);
}

function red(input: string): string {
  return style(input, 31);
}

function cyan(input: string): string {
  return style(input, 36);
}

function blue(input: string): string {
  return style(input, 34);
}

function white(input: string): string {
  return style(input, 37);
}

function bold(input: string): string {
  return style(input, 1);
}

function dim(input: string): string {
  return style(input, 2);
}

function stripAnsi(input: string): string {
  return stripVTControlCharacters(input);
}

function visibleLength(input: string): number {
  return stripAnsi(input).length;
}

function padRightVisible(input: string, targetLength: number): string {
  const missing = targetLength - visibleLength(input);
  if (missing <= 0) {
    return input;
  }
  return `${input}${" ".repeat(missing)}`;
}

function formatStateLabel(value: string): string {
  if (value.includes("RUNNING")) {
    return bold(green(value));
  }
  if (value.includes("WAITING")) {
    return bold(yellow(value));
  }
  if (
    value === "READY_FOR_APPROVAL"
    || value === "READY_FOR_HUMAN_APPROVAL"
    || value === "APPROVED_FOR_COMMIT"
  ) {
    return bold(cyan(value));
  }
  if (value === "DONE" || value === "MERGED") {
    return bold(blue(value));
  }
  if (value === "CANCELLED" || value === "ERROR") {
    return bold(red(value));
  }
  return value;
}

function formatReviewVerification(value: string): string {
  if (value === "verified") {
    return green(value);
  }
  if (value === "missing") {
    return yellow(value);
  }
  return value;
}

function formatDisplayedReviewVerification(status: BubbleStatusView): string {
  if (!status.accuracy_critical) {
    return dim("n/a");
  }
  return formatReviewVerification(status.last_review_verification);
}

function formatFailingGateSummary(reasonCodes: string[]): string {
  if (reasonCodes.length === 0) {
    return dim("-");
  }
  return bold(red(reasonCodes.join(", ")));
}

function formatCommandPath(status: BubbleStatusView["commandPath"]): string {
  if (status.status === "worktree_local") {
    return green(`worktree_local (${status.localEntrypoint})`);
  }
  return bold(
    red(
      `${status.reasonCode ?? "PAIRFLOW_COMMAND_PATH_STALE"} active=${status.activeEntrypoint ?? "unknown"} expected=${status.localEntrypoint}`
    )
  );
}

function formatWatchdogRemaining(status: BubbleStatusView["watchdog"]): string {
  const remaining = status.remainingSeconds;
  if (remaining === null) {
    return "-";
  }
  if (status.expired) {
    return bold(red(`${remaining}s`));
  }
  if (remaining <= 300) {
    return bold(yellow(`${remaining}s`));
  }
  return green(`${remaining}s`);
}

function formatInboxSummary(input: BubbleStatusView["pendingInboxItems"]): string {
  const q = input.humanQuestions;
  const a = input.approvalRequests;
  const t = input.total;
  const qLabel = bold(white("questions"));
  const aLabel = bold(white("approvals"));
  const tLabel = bold(white("total"));
  if (t === 0) {
    return `${qLabel}=${dim(String(q))} ${aLabel}=${dim(String(a))} ${tLabel}=${dim(String(t))}`;
  }
  const qValue = q > 0 ? cyan(String(q)) : dim(String(q));
  const aValue = a > 0 ? bold(yellow(String(a))) : dim(String(a));
  const tValue = bold(yellow(String(t)));
  return `${qLabel}=${qValue} ${aLabel}=${aValue} ${tLabel}=${tValue}`;
}

function formatSpecLock(
  spec: BubbleStatusView["spec_lock_state"]
): string {
  const state =
    spec.state === "IMPLEMENTABLE"
      ? bold(green(spec.state))
      : bold(red(spec.state));
  return `${state} b=${spec.open_blocker_count} rn=${spec.open_required_now_count}`;
}

function formatRoundGate(
  roundGate: BubbleStatusView["round_gate_state"]
): string {
  const applies = roundGate.applies ? bold(yellow("yes")) : dim("no");
  const violated = roundGate.violated ? bold(red("yes")) : green("no");
  return `applies=${applies} violated=${violated} r=${roundGate.round}${roundGate.reason_code ? ` reason=${bold(yellow(roundGate.reason_code))}` : ""}`;
}

function formatActiveOwner(
  activeAgent: string | null,
  activeRole: string | null
): string {
  const agent = activeAgent ?? "-";
  const role = activeRole ?? "-";
  if (agent === "-" && role === "-") {
    return dim("-/-");
  }
  const renderedAgent = agent === "-" ? "-" : bold(green(agent));
  const renderedRole = role === "-" ? "-" : green(role);
  return `${renderedAgent}/${renderedRole}`;
}

function renderKeyValueTable(rows: ReadonlyArray<readonly [string, string]>): string {
  const labelWidth = rows.reduce((max, [label]) => Math.max(max, label.length), 0);
  const valueWidth = rows.reduce(
    (max, [, value]) => Math.max(max, visibleLength(value)),
    0
  );

  const horizontal = dim(
    `+-${"-".repeat(labelWidth)}-+-${"-".repeat(valueWidth)}-+`
  );
  const body = rows.map(([label, value]) => {
    const paddedLabel = padRightVisible(bold(blue(label)), labelWidth);
    const paddedValue = padRightVisible(value, valueWidth);
    return `| ${paddedLabel} | ${paddedValue} |`;
  });

  return [horizontal, ...body, horizontal].join("\n");
}

export function renderBubbleStatusTable(status: BubbleStatusView): string {
  const failingGateReasonCodes = status.failing_gates.map((gate) => gate.reason_code);
  const rows: Array<readonly [string, string]> = [
    ["Bubble", status.bubbleId],
    [
      "Lifecycle",
      `${formatStateLabel(status.state)} r${status.round} | active ${formatActiveOwner(status.activeAgent, status.activeRole)} | since ${dim(status.activeSince ?? "-")}`
    ],
    [
      "Runtime",
      `last ${dim(status.lastCommandAt ?? "-")} | watchdog ${status.watchdog.monitored ? green("on") : dim("off")} ${status.watchdog.timeoutMinutes}m rem=${formatWatchdogRemaining(status.watchdog)} exp=${status.watchdog.expired ? bold(red("yes")) : green("no")}`
    ],
    [
      "Command path",
      formatCommandPath(status.commandPath)
    ],
    [
      "Review",
      `accuracy=${status.accuracy_critical ? bold(red("yes")) : green("no")} | verification=${formatDisplayedReviewVerification(status)} | failing=${formatFailingGateSummary(failingGateReasonCodes)}`
    ],
    [
      "Gates",
      `spec=${formatSpecLock(status.spec_lock_state)} | round ${formatRoundGate(status.round_gate_state)}`
    ],
    [
      "Transcript",
      `messages=${bold(String(status.transcript.totalMessages))} | last=${status.transcript.lastMessageType ?? "-"} @ ${dim(status.transcript.lastMessageTs ?? "-")}`
    ],
    [
      "Inbox",
      formatInboxSummary(status.pendingInboxItems)
    ]
  ];

  if (status.watchdog.monitored && status.watchdog.expired) {
    rows.push([
      "Escalation",
      red(
        `timeout for ${status.watchdog.monitoredAgent ?? "-"} (deadline ${status.watchdog.deadlineTimestamp ?? "-"})`
      )
    ]);
  }

  return renderKeyValueTable(rows);
}

export function renderBubbleStatusText(status: BubbleStatusView): string {
  const failingGateSummary =
    status.failing_gates.length > 0
      ? status.failing_gates
        .map((gate) => `${gate.reason_code}`)
        .join(", ")
      : "-";
  const lines: string[] = [
    `Bubble: ${status.bubbleId}`,
    `State: ${status.state} (round ${status.round})`,
    `Active: ${status.activeAgent ?? "-"} (${status.activeRole ?? "-"}) since ${status.activeSince ?? "-"}`,
    `Last command: ${status.lastCommandAt ?? "-"}`,
    `Watchdog: ${status.watchdog.monitored ? "on" : "off"} timeout=${status.watchdog.timeoutMinutes}m remaining=${status.watchdog.remainingSeconds ?? "-"}s expired=${status.watchdog.expired ? "yes" : "no"}`,
    `Inbox pending: questions=${status.pendingInboxItems.humanQuestions}, approvals=${status.pendingInboxItems.approvalRequests}, total=${status.pendingInboxItems.total}`,
    `Transcript: messages=${status.transcript.totalMessages}, last=${status.transcript.lastMessageType ?? "-"} @ ${status.transcript.lastMessageTs ?? "-"}`,
    `Command path: ${status.commandPath.status}${status.commandPath.status === "stale" ? ` reason=${status.commandPath.reasonCode ?? "PAIRFLOW_COMMAND_PATH_STALE"}` : ""} active=${status.commandPath.activeEntrypoint ?? "-"} expected=${status.commandPath.localEntrypoint}`,
    `Accuracy critical: ${status.accuracy_critical ? "yes" : "no"}`,
    `Last review verification: ${status.accuracy_critical ? status.last_review_verification : "n/a"}`,
    `Failing gates: ${failingGateSummary}`,
    `Spec lock: ${status.spec_lock_state.state} (blockers=${status.spec_lock_state.open_blocker_count}, required_now=${status.spec_lock_state.open_required_now_count})`,
    `Round gate: applies=${status.round_gate_state.applies ? "yes" : "no"} violated=${status.round_gate_state.violated ? "yes" : "no"} round=${status.round_gate_state.round}${status.round_gate_state.reason_code ? ` reason=${status.round_gate_state.reason_code}` : ""}`
  ];

  if (status.watchdog.monitored && status.watchdog.expired) {
    lines.push(
      `Escalation: watchdog timeout exceeded for active agent ${status.watchdog.monitoredAgent ?? "-"} (deadline ${status.watchdog.deadlineTimestamp ?? "-"})`
    );
  }

  return lines.join("\n");
}

export async function runBubbleStatusCommand(
  args: string[] | BubbleStatusCommandOptions,
  cwd: string = process.cwd()
): Promise<BubbleStatusView | null> {
  const options =
    Array.isArray(args) ? parseBubbleStatusCommandOptions(args) : args;
  if (options.help) {
    return null;
  }

  try {
    return await getBubbleStatus({
      bubbleId: options.id,
      repoPath: options.repo,
      cwd
    });
  } catch (error) {
    asBubbleStatusError(error);
  }
}
