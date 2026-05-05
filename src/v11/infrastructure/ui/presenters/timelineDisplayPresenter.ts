import type {
  UiTimelineBadge,
  UiTimelineEntry,
  UiTimelineEntryDisplay,
  UiTimelineProgress,
  UiTimelineTone
} from "../../../../contracts/ui/uiReadModel.js";
import {
  isNonEmptyString,
  isRecord
} from "../../../shared/validation/primitives.js";

export type TimelineEntryWithoutDisplay = Omit<UiTimelineEntry, "display">;

function sanitizeLabel(value: string): string {
  const normalized = value.trim().replace(/\s+/gu, " ");
  return normalized.length > 0 ? normalized : "unknown";
}

function readSummaryDisplay(entry: TimelineEntryWithoutDisplay): Pick<
  UiTimelineEntryDisplay,
  "title" | "summaryText" | "summarySource"
> {
  const candidates = [
    ["summary", entry.payload.summary],
    ["question", entry.payload.question],
    ["message", entry.payload.message]
  ] as const;
  for (const [source, value] of candidates) {
    if (isNonEmptyString(value)) {
      return {
        title: value,
        summaryText: value,
        summarySource: source
      };
    }
  }
  if (isNonEmptyString(entry.payload.decision)) {
    const text = `decision=${entry.payload.decision}`;
    return {
      title: text,
      summaryText: text,
      summarySource: "decision"
    };
  }
  return {
    title: "(no summary payload)",
    summaryText: "(no summary payload)",
    summarySource: "neutral"
  };
}

function metadataOf(entry: TimelineEntryWithoutDisplay): Record<string, unknown> | null {
  return isRecord(entry.payload.metadata) ? entry.payload.metadata : null;
}

function resolveDisplaySender(entry: TimelineEntryWithoutDisplay): string {
  const metadata = metadataOf(entry);
  if (
    metadata !== null
    && typeof metadata.meta_review_handoff_id === "string"
    && metadata.delivery_target_role === "meta_reviewer"
  ) {
    return entry.recipient;
  }
  if (metadata !== null && isNonEmptyString(metadata.actor_agent)) {
    return metadata.actor_agent;
  }
  return entry.sender;
}

function resolveDisplayRole(
  entry: TimelineEntryWithoutDisplay
): UiTimelineEntryDisplay["role"] {
  const metadata = metadataOf(entry);
  const actor = metadata?.actor;
  const deliveryTargetRole = metadata?.delivery_target_role;
  const metaReviewHandoffId = metadata?.meta_review_handoff_id;

  if (actor === "meta-reviewer" || typeof metaReviewHandoffId === "string") {
    return "meta_reviewer";
  }
  if (
    deliveryTargetRole !== undefined
    && (
      typeof deliveryTargetRole !== "string" ||
      !["implementer", "reviewer", "meta_reviewer", "status"].includes(deliveryTargetRole)
    )
  ) {
    return "unknown";
  }
  if (entry.type === "HUMAN_QUESTION" || entry.type === "HUMAN_REPLY") {
    return "human";
  }
  if (entry.type === "CONVERGENCE") {
    return "system";
  }
  if (entry.type === "PASS") {
    if (deliveryTargetRole === "implementer") {
      return "reviewer";
    }
    if (deliveryTargetRole === "reviewer" || deliveryTargetRole === "meta_reviewer") {
      return "implementer";
    }
  }
  const sender = entry.sender.toLowerCase();
  if (sender === "human") {
    return "human";
  }
  if (sender === "orchestrator") {
    return "system";
  }
  if (sender.includes("review") || sender.includes("claude")) {
    return "reviewer";
  }
  if (entry.sender.trim().length === 0) {
    return "unknown";
  }
  return "implementer";
}

function roleLabel(role: UiTimelineEntryDisplay["role"], sender: string): string {
  if (role === "meta_reviewer") return "meta-reviewer";
  if (role === "unknown") return "Unknown";
  return sender;
}

function badgeToneForSeverity(severity: string): UiTimelineTone {
  if (severity === "P0" || severity === "P1") return "danger";
  if (severity === "P2") return "warning";
  if (severity === "P3") return "neutral";
  return "neutral";
}

function recommendationTone(label: string): UiTimelineTone {
  if (label === "approve") return "success";
  if (label === "rework") return "danger";
  if (label === "inconclusive") return "warning";
  return "neutral";
}

function decisionTone(label: string): UiTimelineTone {
  if (label === "approve") return "success";
  if (label === "rework") return "danger";
  return "neutral";
}

function extractMetaRecommendation(entry: TimelineEntryWithoutDisplay): string | null {
  const metadata = metadataOf(entry);
  if (metadata === null) {
    return null;
  }
  const recommendation = metadata.latest_recommendation ?? metadata.recommendation;
  return isNonEmptyString(recommendation) ? sanitizeLabel(recommendation) : null;
}

function buildBadges(
  entry: TimelineEntryWithoutDisplay,
  options: { suppressRecommendation?: boolean } = {}
): UiTimelineBadge[] {
  const badges: UiTimelineBadge[] = [];
  const seen = new Set<string>();
  const add = (badge: UiTimelineBadge): void => {
    const key = `${badge.kind}:${badge.label}`;
    if (!seen.has(key)) {
      seen.add(key);
      badges.push(badge);
    }
  };

  const findings = entry.payload.findings;
  if (Array.isArray(findings)) {
    const seenFindings = new Set<string>();
    for (const finding of findings) {
      if (!isRecord(finding) || !isNonEmptyString(finding.severity)) {
        continue;
      }
      const label = sanitizeLabel(finding.severity);
      if (seenFindings.has(label)) {
        continue;
      }
      seenFindings.add(label);
      add({
        kind: "finding",
        label,
        tone: badgeToneForSeverity(label)
      });
    }
  }

  const recommendation = options.suppressRecommendation
    ? null
    : extractMetaRecommendation(entry);
  if (recommendation !== null) {
    add({
      kind: "recommendation",
      label: recommendation,
      tone: recommendationTone(recommendation)
    });
  }

  if (entry.type === "APPROVAL_DECISION" && isNonEmptyString(entry.payload.decision)) {
    add({
      kind: "decision",
      label: entry.payload.decision,
      tone: decisionTone(entry.payload.decision)
    });
  }

  return badges;
}

function readMetadataInteger(
  metadata: Record<string, unknown>,
  keys: string[]
): number | null {
  for (const key of keys) {
    const value = metadata[key];
    if (Number.isInteger(value) && (value as number) >= 0) {
      return value as number;
    }
  }
  return null;
}

function extractMetaReviewHandoffAttempt(entry: TimelineEntryWithoutDisplay): number | null {
  const metadata = metadataOf(entry);
  const handoffId = metadata?.meta_review_handoff_id;
  if (typeof handoffId !== "string") {
    return null;
  }
  const match = /:attempt:(\d+)$/u.exec(handoffId);
  if (match === null) {
    return null;
  }
  const attempt = Number.parseInt(match[1] ?? "", 10);
  return Number.isInteger(attempt) && attempt > 0 ? attempt : null;
}

function logicalProgressKey(entry: TimelineEntryWithoutDisplay): string | null {
  const metadata = metadataOf(entry);
  const cleanRunSourceId = metadata?.clean_run_source_id;
  if (typeof cleanRunSourceId === "string" || typeof cleanRunSourceId === "number") {
    return `clean:${cleanRunSourceId}`;
  }
  const handoffId = metadata?.meta_review_handoff_id;
  if (typeof handoffId === "string") {
    return `handoff:${handoffId.replace(/:attempt:\d+$/u, "")}`;
  }
  const progressSourceId = metadata?.progress_source_id;
  if (typeof progressSourceId === "string" || typeof progressSourceId === "number") {
    return `progress:${progressSourceId}`;
  }
  return null;
}

function isApproveValidationGateFailure(entry: TimelineEntryWithoutDisplay): boolean {
  if (entry.type !== "APPROVAL_DECISION" || entry.payload.decision !== "rework") {
    return false;
  }
  if (extractMetaRecommendation(entry) !== "approve") {
    return false;
  }
  const text = [entry.payload.summary, entry.payload.message]
    .filter((value): value is string => typeof value === "string")
    .join("\n");
  return text.includes("approve-gate validation failed");
}

function logicalValidationFailureKey(entry: TimelineEntryWithoutDisplay): string {
  const metadata = metadataOf(entry);
  const configured =
    metadata?.validation_failure_id ??
    metadata?.approve_gate_failure_id ??
    metadata?.gate_failure_id;
  return typeof configured === "string" || typeof configured === "number"
    ? `configured:${configured}`
    : entry.id;
}

function baseProgressForEntry(input: {
  entry: TimelineEntryWithoutDisplay;
  cleanRunCount: number | null;
  cleanRunsRequired: number | null;
}): UiTimelineProgress | null {
  const handoffAttempt = extractMetaReviewHandoffAttempt(input.entry);
  if (handoffAttempt !== null) {
    return {
      kind: "meta_review_handoff",
      label: `handoff ${handoffAttempt}`,
      handoffAttempt
    };
  }
  if (input.cleanRunCount !== null) {
    return {
      kind: "clean_run",
      label: `clean ${input.cleanRunCount}`,
      cleanRunCount: input.cleanRunCount,
      cleanRunsRequired: input.cleanRunsRequired
    };
  }
  return null;
}

function resolveBaseState(input: {
  entry: TimelineEntryWithoutDisplay;
  progress: UiTimelineProgress | null;
  gateFailure: boolean;
}): Pick<UiTimelineEntryDisplay, "rowKind" | "tone"> {
  if (input.gateFailure) {
    return { rowKind: "gate_failure", tone: "danger" };
  }
  if (input.progress?.kind === "meta_review_handoff") {
    return { rowKind: "handoff", tone: "info" };
  }
  if (
    input.entry.type === "APPROVAL_REQUEST" ||
    input.entry.type === "APPROVAL_DECISION"
  ) {
    return {
      rowKind: "approval",
      tone: input.entry.payload.decision === "rework" ? "warning" : "neutral"
    };
  }
  return { rowKind: "normal", tone: "neutral" };
}

type TimelineMarkerIndexes = {
  progressKeys: Map<string, number>;
  gateFailureKeys: Map<string, number>;
};

function collectLatestMarkerIndexes(
  entries: TimelineEntryWithoutDisplay[]
): TimelineMarkerIndexes {
  const progressKeys = new Map<string, number>();
  const gateFailureKeys = new Map<string, number>();

  entries.forEach((entry, index) => {
    const progressKey = logicalProgressKey(entry);
    if (progressKey !== null) {
      progressKeys.set(progressKey, index);
    }
    if (isApproveValidationGateFailure(entry)) {
      gateFailureKeys.set(logicalValidationFailureKey(entry), index);
    }
  });

  return { progressKeys, gateFailureKeys };
}

function isProgressSuperseded(input: {
  entry: TimelineEntryWithoutDisplay;
  index: number;
  progressKeys: Map<string, number>;
}): boolean {
  const progressKey = logicalProgressKey(input.entry);
  return progressKey !== null && input.progressKeys.get(progressKey) !== input.index;
}

function isGateFailureSuperseded(input: {
  entry: TimelineEntryWithoutDisplay;
  index: number;
  gateFailureKeys: Map<string, number>;
}): boolean {
  return (
    isApproveValidationGateFailure(input.entry)
    && input.gateFailureKeys.get(logicalValidationFailureKey(input.entry)) !== input.index
  );
}

function readExplicitCleanRuns(entry: TimelineEntryWithoutDisplay): number | null {
  const metadata = metadataOf(entry);
  return metadata === null
    ? null
    : readMetadataInteger(metadata, [
        "consecutive_clean_runs",
        "consecutiveCleanRuns",
        "meta_review_consecutive_clean_runs"
      ]);
}

function calculateCleanRunCounts(
  entries: TimelineEntryWithoutDisplay[],
  markerIndexes: TimelineMarkerIndexes
): Map<number, number> {
  const cleanRunCounts = new Map<number, number>();
  let cleanRuns = 0;

  entries.forEach((entry, index) => {
    const gateFailure = isApproveValidationGateFailure(entry);

    if (
      isProgressSuperseded({ entry, index, progressKeys: markerIndexes.progressKeys })
      || isGateFailureSuperseded({ entry, index, gateFailureKeys: markerIndexes.gateFailureKeys })
    ) {
      return;
    }

    if (gateFailure) {
      cleanRuns = 0;
      return;
    }

    const recommendation = extractMetaRecommendation(entry);
    if (recommendation === "approve") {
      const explicitCleanRuns = readExplicitCleanRuns(entry);
      cleanRuns = explicitCleanRuns ?? cleanRuns + 1;
      cleanRunCounts.set(index, cleanRuns);
    } else if (
      recommendation === "rework" ||
      recommendation === "inconclusive" ||
      entry.payload.decision === "rework"
    ) {
      cleanRuns = 0;
    }
  });

  return cleanRunCounts;
}

export function attachTimelineDisplay(
  entries: TimelineEntryWithoutDisplay[]
): UiTimelineEntry[] {
  const markerIndexes = collectLatestMarkerIndexes(entries);
  const cleanRunCounts = calculateCleanRunCounts(entries, markerIndexes);

  return entries.map((entry, index) => {
    const summary = readSummaryDisplay(entry);
    const sender = resolveDisplaySender(entry);
    const role = resolveDisplayRole(entry);
    const gateFailure = isApproveValidationGateFailure(entry);
    const gateFailureSuperseded = isGateFailureSuperseded({
      entry,
      index,
      gateFailureKeys: markerIndexes.gateFailureKeys
    });
    const baseProgress = isProgressSuperseded({
      entry,
      index,
      progressKeys: markerIndexes.progressKeys
    })
      || (gateFailure && !gateFailureSuperseded)
      ? null
      : baseProgressForEntry({
          entry,
          cleanRunCount: cleanRunCounts.get(index) ?? null,
          cleanRunsRequired: null
        });
    const baseState = resolveBaseState({
      entry,
      progress: baseProgress,
      gateFailure: gateFailure && !gateFailureSuperseded
    });

    return {
      ...entry,
      display: {
        ...summary,
        senderLabel: roleLabel(role, sender),
        role,
        ...baseState,
        badges: buildBadges(entry, {
          suppressRecommendation: gateFailure
        }),
        progress: baseProgress,
        validationFailure:
          gateFailure && !gateFailureSuperseded
            ? {
                summaryText: summary.summaryText,
                tone: "danger"
              }
            : null,
        syntheticApproval:
          gateFailure && !gateFailureSuperseded
            ? {
                kind: "meta_review_approval",
                sourceEntryId: entry.id,
                syntheticEntryId: `${entry.id}:meta-review-approve`,
                label: "Meta-review approved the current change.",
                tone: "success"
              }
            : null
      }
    };
  });
}
