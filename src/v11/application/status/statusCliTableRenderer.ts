import type { BubbleStatusV11View as BubbleStatusView } from "./emitStatusV11.js";
import {
  blue,
  bold,
  dim,
  fitToVisibleWidth,
  green,
  padRightVisible,
  visibleLength,
  red
} from "./statusCliAnsi.js";
import {
  formatActiveOwner,
  formatClockTimestamp,
  formatCommandPath,
  formatDisplayedReviewVerification,
  formatElapsedSeconds,
  formatFailingGateSummary,
  formatInboxSummary,
  formatRoundGate,
  formatSpecLock,
  formatStateLabel,
  formatTableTimestamp,
  formatWatchdogRemaining
} from "./statusCliValueFormatters.js";

export interface RenderBubbleStatusTableOptions {
  maxWidth?: number;
}

function resolveRenderWidth(maxWidth?: number): number | undefined {
  if (
    maxWidth !== undefined &&
    Number.isFinite(maxWidth) &&
    maxWidth > 0
  ) {
    return Math.floor(maxWidth);
  }

  if (
    process.stdout.isTTY &&
    typeof process.stdout.columns === "number" &&
    Number.isFinite(process.stdout.columns) &&
    process.stdout.columns > 0
  ) {
    return Math.floor(process.stdout.columns);
  }

  return undefined;
}

function fitRenderedLines(
  lines: ReadonlyArray<string>,
  maxWidth?: number
): string {
  const renderWidth = resolveRenderWidth(maxWidth);
  if (renderWidth === undefined) {
    return lines.join("\n");
  }

  return lines
    .map((line) => fitToVisibleWidth(line, renderWidth))
    .join("\n");
}

function renderKeyValueTable(
  rows: ReadonlyArray<readonly [string, string]>,
  options: RenderBubbleStatusTableOptions = {}
): string {
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

  return fitRenderedLines([horizontal, ...body, horizontal], options.maxWidth);
}

export function renderBubbleStatusTable(
  status: BubbleStatusView,
  options: RenderBubbleStatusTableOptions = {}
): string {
  const failingGateReasonCodes = status.failing_gates.map((gate) => gate.reason_code);
  const stateValidationSummary =
    status.stateValidation === null
      ? green("valid")
      : bold(red("invalid"));
  const commandPathSummary = formatCommandPath(status.commandPath);
  const metaReviewSecondLine =
    status.metaReview.runtimeDelivery === null
      ? "runtime_delivery=-"
      : `runtime_delivery=${status.metaReview.runtimeDelivery.status}${status.metaReview.runtimeDelivery.reasonCode !== null ? `/${status.metaReview.runtimeDelivery.reasonCode}` : ""} @ ${dim(formatTableTimestamp(status.metaReview.runtimeDelivery.observedAt))}`;
  const runtimeSummary = status.watchdog.monitored
    ? `last ${dim(formatClockTimestamp(status.paneActivity.lastChangedAt))} | age=${dim(formatElapsedSeconds(status.paneActivity.sinceLastChangedSeconds))} | watchdog ${green("on")} ${status.watchdog.timeoutMinutes}m rem=${formatWatchdogRemaining(status.watchdog)}`
    : `inactive | last observed ${dim(formatClockTimestamp(status.paneActivity.lastChangedAt))} | watchdog ${dim("off")} ${status.watchdog.timeoutMinutes}m rem=${formatWatchdogRemaining(status.watchdog)}`;
  const rows: Array<readonly [string, string]> = [
    [
      "Bubble",
      `state: ${stateValidationSummary} | cli path: ${commandPathSummary} | start: ${dim(formatClockTimestamp(status.bubbleStartedAt))}`
    ],
    [
      "Lifecycle",
      `${formatStateLabel(status.state)} r${status.round} | active ${formatActiveOwner(status.activeAgent, status.activeRole)} | since ${dim(formatClockTimestamp(status.activeSince))}`
    ],
    [
      "Runtime",
      runtimeSummary
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
      `messages=${bold(String(status.transcript.totalMessages))} | last=${status.transcript.lastMessageType ?? "-"} @ ${dim(formatClockTimestamp(status.transcript.lastMessageTs))}`
    ],
    [
      "Inbox",
      formatInboxSummary(status.pendingInboxItems)
    ],
    [
      "Meta-review",
      `authority=${status.metaReview.authorityActive ? green("active") : dim("inactive")}`
    ],
    [
      "",
      metaReviewSecondLine
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

  if (status.stateValidation !== null) {
    rows.push([
      "Validation detail",
      red(
        status.stateValidation.errors
          .map((error) => `${error.path}: ${error.message}`)
          .join("; ")
      )
    ]);
  }

  return renderKeyValueTable(rows, options);
}
