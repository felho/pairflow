import { blue, bold, cyan, dim, green, red, white, yellow } from "./statusCliAnsi.js";
import type { BubbleStatusView } from "./statusCommandApi.js";

export interface StatusTimestampFormatOptions {
  timeZone?: string;
}

const clockFormatterCache = new Map<string, Intl.DateTimeFormat>();
const tableFormatterCache = new Map<string, Intl.DateTimeFormat>();

export function formatStateLabel(value: string): string {
  if (value.includes("RUNNING")) {
    return bold(green(value));
  }
  if (value.includes("WAITING")) {
    return bold(yellow(value));
  }
  if (
    value === "READY_FOR_HUMAN_APPROVAL"
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

export function formatDisplayedReviewVerification(status: BubbleStatusView): string {
  if (!status.accuracy_critical) {
    return dim("n/a");
  }
  return formatReviewVerification(status.last_review_verification);
}

export function formatFailingGateSummary(reasonCodes: string[]): string {
  if (reasonCodes.length === 0) {
    return dim("-");
  }
  return bold(red(reasonCodes.join(", ")));
}

export function formatCommandPath(status: BubbleStatusView["commandPath"]): string {
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

export function formatWatchdogRemaining(status: BubbleStatusView["watchdog"]): string {
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

function resolveFormatterTimeZone(
  options: StatusTimestampFormatOptions = {}
): string {
  return options.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC";
}

function readTimestampPart(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string | null {
  return parts.find((part) => part.type === type)?.value ?? null;
}

function getClockFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = clockFormatterCache.get(timeZone);
  if (formatter !== undefined) {
    return formatter;
  }

  formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  });
  clockFormatterCache.set(timeZone, formatter);
  return formatter;
}

function getTableFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = tableFormatterCache.get(timeZone);
  if (formatter !== undefined) {
    return formatter;
  }

  formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    timeZoneName: "shortOffset"
  });
  tableFormatterCache.set(timeZone, formatter);
  return formatter;
}

export function formatTableTimestamp(
  value: string | null,
  options: StatusTimestampFormatOptions = {}
): string {
  if (value === null) {
    return "-";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  const parts = getTableFormatter(resolveFormatterTimeZone(options)).formatToParts(parsed);
  const month = readTimestampPart(parts, "month");
  const day = readTimestampPart(parts, "day");
  const hour = readTimestampPart(parts, "hour");
  const minute = readTimestampPart(parts, "minute");
  const second = readTimestampPart(parts, "second");
  const timeZoneName = readTimestampPart(parts, "timeZoneName");
  if (
    month === null
    || day === null
    || hour === null
    || minute === null
    || second === null
    || timeZoneName === null
  ) {
    return value;
  }
  return `${month}-${day}T${hour}:${minute}:${second} ${timeZoneName}`;
}

export function formatClockTimestamp(
  value: string | null,
  options: StatusTimestampFormatOptions = {}
): string {
  if (value === null) {
    return "-";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  const parts = getClockFormatter(resolveFormatterTimeZone(options)).formatToParts(parsed);
  const hour = readTimestampPart(parts, "hour");
  const minute = readTimestampPart(parts, "minute");
  const second = readTimestampPart(parts, "second");
  if (hour === null || minute === null || second === null) {
    return value;
  }
  return `${hour}:${minute}:${second}`;
}

export function formatElapsedSeconds(value: number | null): string {
  if (value === null) {
    return "-";
  }
  return `${value}s`;
}

export function formatInboxSummary(input: BubbleStatusView["pendingInboxItems"]): string {
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

export function formatSpecLock(
  spec: BubbleStatusView["spec_lock_state"]
): string {
  const state =
    spec.state === "IMPLEMENTABLE"
      ? bold(green(spec.state))
      : bold(red(spec.state));
  return `${state} b=${spec.open_blocker_count} rn=${spec.open_required_now_count}`;
}

export function formatRoundGate(
  roundGate: BubbleStatusView["round_gate_state"]
): string {
  const applies = roundGate.applies ? bold(yellow("yes")) : dim("no");
  const violated = roundGate.violated ? bold(red("yes")) : green("no");
  return `applies=${applies} violated=${violated} r=${roundGate.round}${roundGate.reason_code ? ` reason=${bold(yellow(roundGate.reason_code))}` : ""}`;
}

export function formatActiveOwner(
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
