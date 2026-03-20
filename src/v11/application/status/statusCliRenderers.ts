import type { BubbleStatusV11View as BubbleStatusView } from "./emitStatusV11.js";
import {
  blue,
  bold,
  cyan,
  dim,
  green,
  padRightVisible,
  red,
  visibleLength,
  white,
  yellow
} from "./statusCliAnsi.js";

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
  if (value === "META_REVIEW_FAILED") {
    return bold(red(value));
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
    return green("worktree_local");
  }
  if (status.status === "external") {
    return green("external");
  }
  if (status.status === "unknown") {
    return bold(yellow(status.reasonCode ?? "PAIRFLOW_COMMAND_PATH_UNRESOLVED"));
  }
  if (status.status === "missing") {
    return bold(red(status.reasonCode ?? "PAIRFLOW_COMMAND_EXTERNAL_UNAVAILABLE"));
  }
  return bold(
    red(
      `${status.reasonCode ?? "PAIRFLOW_COMMAND_PATH_STALE"}`
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

function formatTableTimestamp(value: string | null): string {
  if (value === null) {
    return "-";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  const iso = parsed.toISOString();
  return iso.slice(5, 19) + "Z";
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
      `${formatStateLabel(status.state)} r${status.round} | active ${formatActiveOwner(status.activeAgent, status.activeRole)} | since ${dim(formatTableTimestamp(status.activeSince))}`
    ],
    [
      "Runtime",
      `last ${dim(formatTableTimestamp(status.lastCommandAt))} | watchdog ${status.watchdog.monitored ? green("on") : dim("off")} ${status.watchdog.timeoutMinutes}m rem=${formatWatchdogRemaining(status.watchdog)} exp=${status.watchdog.expired ? bold(red("yes")) : green("no")}`
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
      `messages=${bold(String(status.transcript.totalMessages))} | last=${status.transcript.lastMessageType ?? "-"} @ ${dim(formatTableTimestamp(status.transcript.lastMessageTs))}`
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
        `timeout for ${status.watchdog.monitoredAgent ?? "-"} (deadline ${formatTableTimestamp(status.watchdog.deadlineTimestamp)})`
      )
    ]);
  }

  return renderKeyValueTable(rows);
}

function formatFailingGateSummaryText(status: BubbleStatusView): string {
  return status.failing_gates.length > 0
    ? status.failing_gates.map((gate) => `${gate.reason_code}`).join(", ")
    : "-";
}

function formatStatusWatchdogText(status: BubbleStatusView): string {
  return `Watchdog: ${status.watchdog.monitored ? "on" : "off"} timeout=${status.watchdog.timeoutMinutes}m remaining=${status.watchdog.remainingSeconds ?? "-"}s expired=${status.watchdog.expired ? "yes" : "no"}`;
}

function formatStatusCommandPathText(status: BubbleStatusView): string {
  return `Command path: ${status.commandPath.status} profile=${status.commandPath.profile}${status.commandPath.reasonCode !== undefined ? ` reason=${status.commandPath.reasonCode}` : ""} active=${status.commandPath.activeEntrypoint ?? "-"} expected=${status.commandPath.localEntrypoint} pinned=${status.commandPath.pinnedCommand}`;
}

function formatStatusRoundGateText(status: BubbleStatusView): string {
  return `Round gate: applies=${status.round_gate_state.applies ? "yes" : "no"} violated=${status.round_gate_state.violated ? "yes" : "no"} round=${status.round_gate_state.round}${status.round_gate_state.reason_code ? ` reason=${status.round_gate_state.reason_code}` : ""}`;
}

function formatStatusEscalationText(status: BubbleStatusView): string {
  return `Escalation: watchdog timeout exceeded for active agent ${status.watchdog.monitoredAgent ?? "-"} (deadline ${status.watchdog.deadlineTimestamp ?? "-"})`;
}

export function renderBubbleStatusText(status: BubbleStatusView): string {
  const failingGateSummary = formatFailingGateSummaryText(status);
  const lines: string[] = [
    `Bubble: ${status.bubbleId}`,
    `State: ${status.state} (round ${status.round})`,
    `Active: ${status.activeAgent ?? "-"} (${status.activeRole ?? "-"}) since ${status.activeSince ?? "-"}`,
    `Last command: ${status.lastCommandAt ?? "-"}`,
    formatStatusWatchdogText(status),
    `Inbox pending: questions=${status.pendingInboxItems.humanQuestions}, approvals=${status.pendingInboxItems.approvalRequests}, total=${status.pendingInboxItems.total}`,
    `Transcript: messages=${status.transcript.totalMessages}, last=${status.transcript.lastMessageType ?? "-"} @ ${status.transcript.lastMessageTs ?? "-"}`,
    formatStatusCommandPathText(status),
    `Accuracy critical: ${status.accuracy_critical ? "yes" : "no"}`,
    `Last review verification: ${status.accuracy_critical ? status.last_review_verification : "n/a"}`,
    `Failing gates: ${failingGateSummary}`,
    `Spec lock: ${status.spec_lock_state.state} (blockers=${status.spec_lock_state.open_blocker_count}, required_now=${status.spec_lock_state.open_required_now_count})`,
    formatStatusRoundGateText(status)
  ];

  if (status.watchdog.monitored && status.watchdog.expired) {
    lines.push(formatStatusEscalationText(status));
  }

  return lines.join("\n");
}
