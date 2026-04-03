import type { BubbleStatusV11View as BubbleStatusView } from "./emitStatusV11.js";
import {
  blue,
  bold,
  dim,
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
  const stateValidationSummary =
    status.stateValidation === null
      ? green("valid")
      : bold(red("invalid"));
  const commandPathSummary = formatCommandPath(status.commandPath);
  const metaReviewRoute = `${status.metaReview.latestRoute ?? "-"}${status.metaReview.latestRouteReasonCode !== null ? `/${status.metaReview.latestRouteReasonCode}` : ""}`;
  const metaReviewSecondLine =
    status.metaReview.runtimeDelivery === null
      ? `route=${metaReviewRoute} | runtime_delivery=-`
      : `route=${metaReviewRoute} | runtime_delivery=${status.metaReview.runtimeDelivery.status}${status.metaReview.runtimeDelivery.reasonCode !== null ? `/${status.metaReview.runtimeDelivery.reasonCode}` : ""} @ ${dim(formatTableTimestamp(status.metaReview.runtimeDelivery.observedAt))}`;
  const rows: Array<readonly [string, string]> = [
    [
      "Bubble",
      `${status.bubbleId} | state: ${stateValidationSummary} | cli path: ${commandPathSummary}`
    ],
    [
      "Lifecycle",
      `${formatStateLabel(status.state)} r${status.round} | active ${formatActiveOwner(status.activeAgent, status.activeRole)} | since ${dim(formatClockTimestamp(status.activeSince))}`
    ],
    [
      "Runtime",
      `last ${dim(formatClockTimestamp(status.paneActivity.lastChangedAt))} | age=${dim(formatElapsedSeconds(status.paneActivity.sinceLastChangedSeconds))} | watchdog ${status.watchdog.monitored ? green("on") : dim("off")} ${status.watchdog.timeoutMinutes}m rem=${formatWatchdogRemaining(status.watchdog)}`
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
      `status=${status.metaReview.latestStatus ?? "-"} | recommendation=${status.metaReview.latestRecommendation ?? "-"}`
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

  return renderKeyValueTable(rows);
}
