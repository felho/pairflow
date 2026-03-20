import type { BubbleStatusV11View as BubbleStatusView } from "./emitStatusV11.js";

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
