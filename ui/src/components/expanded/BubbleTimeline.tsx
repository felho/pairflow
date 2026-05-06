import { useEffect, useRef, type ReactNode } from "react";
import type {
  UiTimelineBadge,
  UiTimelineDisplayRole,
  UiTimelineEntry,
  UiTimelineEntryDisplay
} from "../../lib/types";

interface DisplayTag {
  label: string;
  style: string;
}

function badgeToneClass(badge: UiTimelineBadge): string {
  if (badge.tone === "success") {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-500";
  }
  if (badge.tone === "warning") {
    return "border-amber-500/20 bg-amber-500/10 text-amber-500";
  }
  if (badge.tone === "danger") {
    return badge.kind === "finding"
      ? "border-red-500/20 bg-red-500/10 text-red-500"
      : "border-rose-500/20 bg-rose-500/10 text-rose-500";
  }
  if (badge.tone === "info") {
    return "border-blue-500/20 bg-blue-500/10 text-blue-500";
  }
  return "border-slate-500/20 bg-slate-500/10 text-slate-400";
}

function readDisplayBadgeLabel(
  entry: UiTimelineEntry,
  kind: UiTimelineBadge["kind"]
): string | null {
  const badge = entry.display.badges.find((candidate) => candidate.kind === kind);
  return badge?.label ?? null;
}

function hasDisplayGateFailureSplit(entry: UiTimelineEntry): boolean {
  return entry.display.validationFailure !== null && entry.display.syntheticApproval !== null;
}

function createSyntheticDisplayEntry(entry: UiTimelineEntry): UiTimelineEntry {
  const syntheticApproval = entry.display.syntheticApproval;
  if (syntheticApproval === null) {
    return entry;
  }
  const sender =
    entry.display.role === "meta_reviewer" && entry.display.senderLabel === "orchestrator"
      ? "meta-reviewer"
      : entry.display.senderLabel;
  const summaryText = syntheticApproval.label;
  return {
    ...entry,
    id: syntheticApproval.syntheticEntryId,
    type: "APPROVAL_REQUEST",
    sender,
    recipient: "orchestrator",
    display: {
      ...entry.display,
      title: summaryText,
      summaryText,
      summarySource: "summary",
      senderLabel: sender,
      role: "meta_reviewer",
      rowKind: "approval",
      tone: syntheticApproval.tone,
      badges: [
        {
          kind: "recommendation",
          label: "approve",
          tone: "success"
        }
      ],
      progress: null,
      validationFailure: null,
      syntheticApproval: null
    },
    payload: {},
    refs: []
  };
}

function isMetaReviewHandoff(entry: UiTimelineEntry): boolean {
  return entry.type === "TASK" && entry.display.rowKind === "handoff";
}

interface DisplayTimelineItem {
  entry: UiTimelineEntry;
  metaReviewRerunCleanRunCount: number | null;
  gateFailed: boolean;
}

function buildTimelineItems(input: {
  entries: UiTimelineEntry[];
  cleanRunsRequired: number | null | undefined;
}): DisplayTimelineItem[] {
  let cleanRunsRequired =
    input.cleanRunsRequired !== null && input.cleanRunsRequired !== undefined
      ? input.cleanRunsRequired
      : 1;
  const items: DisplayTimelineItem[] = [];
  let metaCleanRuns = 0;
  let metaRunPending = false;

  for (const entry of input.entries) {
    if (hasDisplayGateFailureSplit(entry)) {
      items.push({
        entry: createSyntheticDisplayEntry(entry),
        metaReviewRerunCleanRunCount: null,
        gateFailed: false
      });
      metaCleanRuns += 1;
      metaRunPending = false;

      items.push({
        entry,
        metaReviewRerunCleanRunCount: null,
        gateFailed: true
      });
      metaCleanRuns = 0;
      continue;
    }

    const metaRecommendation = readDisplayBadgeLabel(entry, "recommendation");
    const displayDecision = readDisplayBadgeLabel(entry, "decision");
    const displayCleanRunCount =
      entry.display.progress?.kind === "clean_run"
        ? entry.display.progress.cleanRunCount
        : null;
    const displayCleanRunsRequired =
      entry.display.progress?.kind === "clean_run"
        ? entry.display.progress.cleanRunsRequired
        : null;

    if (isMetaReviewHandoff(entry)) {
      const handoffAttempt =
        entry.display.progress?.kind === "meta_review_handoff"
          ? entry.display.progress.handoffAttempt
          : null;
      if (handoffAttempt === null) {
        continue;
      }
      if (!metaRunPending) {
        if (handoffAttempt > 1) {
          const nextCleanRunCount = Math.max(metaCleanRuns + 1, handoffAttempt - 1);
          if (cleanRunsRequired > 1 && nextCleanRunCount < cleanRunsRequired) {
            metaCleanRuns = nextCleanRunCount;
            metaRunPending = true;
            items.push({
              entry,
              metaReviewRerunCleanRunCount: nextCleanRunCount,
              gateFailed: false
            });
          }
          continue;
        }
        metaRunPending = true;
        continue;
      }

      const nextCleanRunCount = Math.max(
        metaCleanRuns + 1,
        handoffAttempt !== null ? handoffAttempt - 1 : 0
      );
      if (cleanRunsRequired > 1 && nextCleanRunCount < cleanRunsRequired) {
        metaCleanRuns = nextCleanRunCount;
        metaRunPending = true;
        items.push({
          entry,
          metaReviewRerunCleanRunCount: nextCleanRunCount,
          gateFailed: false
        });
      }
      continue;
    }

    if (displayCleanRunCount !== null) {
      metaCleanRuns = displayCleanRunCount;
      if (displayCleanRunsRequired !== null) {
        cleanRunsRequired = displayCleanRunsRequired;
      }
      metaRunPending = false;
    } else if (metaRecommendation === "approve") {
      metaRunPending = false;
    } else if (
      metaRecommendation === "rework"
      || metaRecommendation === "inconclusive"
      || displayDecision === "rework"
    ) {
      metaCleanRuns = 0;
      metaRunPending = false;
    }

    items.push({
      entry,
      metaReviewRerunCleanRunCount: null,
      gateFailed: false
    });
  }

  return items;
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

type RoleKind = "impl" | "review" | "human" | "system" | "meta" | "unknown";

const roleStyles: Record<RoleKind, string> = {
  impl: "border-blue-500/30 bg-blue-500/15 text-blue-500",
  review: "border-purple-500/30 bg-purple-500/15 text-purple-500",
  human: "border-amber-500/30 bg-amber-500/15 text-amber-500",
  system: "border-emerald-500/30 bg-emerald-500/15 text-emerald-500",
  meta: "border-fuchsia-500/30 bg-fuchsia-500/15 text-fuchsia-400",
  unknown: "border-slate-500/30 bg-slate-500/15 text-slate-400"
};

const roleIcons: Record<RoleKind, string> = {
  impl: "\u25B6",
  review: "\u25C6",
  human: "?",
  system: "\u25CB",
  meta: "\u25C9",
  unknown: "?"
};

const roleLabels: Record<RoleKind, string> = {
  impl: "implementer",
  review: "reviewer",
  human: "human",
  system: "system",
  meta: "meta-reviewer",
  unknown: "Unknown"
};

function resolveRole(role: UiTimelineDisplayRole): RoleKind {
  if (role === "implementer") return "impl";
  if (role === "reviewer") return "review";
  if (role === "meta_reviewer") return "meta";
  if (role === "human") return "human";
  if (role === "system") return "system";
  return "unknown";
}

function blockedLabelClass(display: UiTimelineEntryDisplay): string {
  return display.tone === "warning" ? "font-medium text-amber-500" : "font-medium text-[#aaa]";
}

export interface BubbleTimelineProps {
  entries: UiTimelineEntry[] | null;
  isLoading: boolean;
  error: string | null;
  compact: boolean;
  extras?: ReactNode;
  metaReviewCleanRunsRequired?: number | null;
}

export function BubbleTimeline(props: BubbleTimelineProps): JSX.Element {
  const scrollRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);
  const compact = props.compact;
  const showError = props.error !== null;
  const showInitialLoading =
    props.isLoading && !showError && props.entries === null;
  const hasExtras = props.extras !== null && props.extras !== undefined;
  const hasEmptyState =
    !showError && props.entries !== null && props.entries.length === 0;
  const displayItems =
    props.entries === null
      ? null
      : buildTimelineItems({
          entries: props.entries,
          cleanRunsRequired: props.metaReviewCleanRunsRequired
        });

  useEffect(() => {
    const el = scrollRef.current;
    if (el !== null && shouldAutoScrollRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [props.entries, props.extras]);

  const hasEntries =
    !showError && displayItems !== null && displayItems.length > 0;
  const showScrollable = hasEntries || hasEmptyState || hasExtras;
  let metaCleanRunsRequired = props.metaReviewCleanRunsRequired;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {showInitialLoading ? (
        <div className="py-2 text-[10px] text-[#666]">Loading timeline...</div>
      ) : null}

      {showError ? (
        <div className="rounded border border-rose-500/60 bg-rose-950/35 px-2 py-1 text-[10px] text-rose-200">
          Failed to load timeline: {props.error}
        </div>
      ) : null}

      {showScrollable ? (
        <div
          ref={scrollRef}
          data-testid="bubble-timeline-scroll"
          className="flex-1 overflow-y-auto pr-1"
          onScroll={() => {
            const el = scrollRef.current;
            if (el === null) {
              shouldAutoScrollRef.current = true;
              return;
            }
            const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
            shouldAutoScrollRef.current = distanceFromBottom <= 24;
          }}
        >
          {hasEmptyState ? (
            <div className="py-2 text-[10px] text-[#555]">No timeline entries yet.</div>
          ) : null}

          {hasEntries && displayItems !== null ? (
            <>
          {displayItems.map((item) => {
            const entry = item.entry;
            const role = item.gateFailed ? "system" : resolveRole(entry.display.role);
            const displaySender = item.gateFailed
              ? "orchestrator"
              : entry.display.senderLabel;
            const isConvergence = entry.type === "CONVERGENCE";
            const blocked = !item.gateFailed && entry.display.rowKind === "blocked";
            const displayCleanRunProgress =
              !item.gateFailed && entry.display.progress?.kind === "clean_run"
                ? entry.display.progress
                : null;
            const displayCleanRunCount = displayCleanRunProgress?.cleanRunCount ?? null;
            const displayCleanRunsRequired =
              displayCleanRunProgress?.cleanRunsRequired ?? null;
            let cleanRunCount: number | null = null;
            if (item.metaReviewRerunCleanRunCount !== null) {
              cleanRunCount = item.metaReviewRerunCleanRunCount;
            } else if (displayCleanRunCount !== null) {
              if (displayCleanRunsRequired !== null) {
                metaCleanRunsRequired = displayCleanRunsRequired;
              }
              cleanRunCount = displayCleanRunCount;
            }
            const cleanRunsRequired =
              displayCleanRunsRequired ?? metaCleanRunsRequired;
            const replaceApproveWithCleanRun =
              cleanRunCount !== null &&
              cleanRunsRequired !== null &&
              cleanRunsRequired !== undefined &&
              cleanRunCount < cleanRunsRequired;
            const cleanRunTag: DisplayTag | null =
              (
                (item.metaReviewRerunCleanRunCount !== null || replaceApproveWithCleanRun) &&
                cleanRunCount !== null
              )
                ? {
                    label: displayCleanRunProgress?.label ?? `clean ${cleanRunCount}`,
                    style: "border-emerald-500/20 bg-emerald-500/10 text-emerald-500"
                  }
                : null;
            const displayBadges = entry.display.badges.filter((badge) => {
              return !(
                replaceApproveWithCleanRun &&
                badge.kind === "recommendation" &&
                badge.label === "approve"
              );
            });
            return (
              <div
                key={entry.id}
                className="flex items-start border-b border-[#1a1a1a] py-1 text-[10px] last:border-b-0"
              >
                <span className="min-w-[20px] pt-px pr-2 text-right font-mono text-[9px] text-[#555]">
                  R{entry.round}
                </span>
                <span
                  className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border text-[8px] ${roleStyles[role]}`}
                >
                  {roleIcons[role]}
                </span>
                <div className="ml-2 min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    {isConvergence ? (
                      <span className="font-semibold text-emerald-500">CONVERGENCE</span>
                    ) : blocked ? (
                      <span className={blockedLabelClass(entry.display)}>
                        {displaySender} &mdash; blocked
                      </span>
                    ) : role === "system" || role === "human" || role === "unknown" ? (
                      <span className="font-medium text-[#aaa]">
                        {displaySender}
                        {item.gateFailed ? (
                          <span className="text-[#555]"> (gate failed)</span>
                        ) : null}
                      </span>
                    ) : (
                      <span className="font-medium text-[#aaa]">
                        {roleLabels[role]}{" "}
                        <span className="text-[#555]">({displaySender})</span>
                      </span>
                    )}
                    {displayBadges.map((badge, index) => (
                      <span
                        key={`${badge.kind}:${badge.label}:${index}`}
                        className={`inline-block rounded px-1 text-[9px] font-semibold leading-tight border ${badgeToneClass(badge)}`}
                      >
                        {badge.label}
                      </span>
                    ))}
                    {cleanRunTag !== null ? (
                      <span
                        className={`inline-block rounded px-1 text-[9px] font-semibold leading-tight border ${cleanRunTag.style}`}
                      >
                        {cleanRunTag.label}
                      </span>
                    ) : null}
                  </div>
                  {compact ? null : (
                    <div className="leading-relaxed text-[#666]">
                      {entry.display.summaryText}
                    </div>
                  )}
                </div>
                <span className="flex-shrink-0 pt-px font-mono text-[9px] text-[#444]">
                  {formatTime(entry.ts)}
                </span>
              </div>
            );
          })}
            </>
          ) : null}

          {hasExtras ? (
            <div className={hasEntries || hasEmptyState ? "mt-2" : undefined}>
              {props.extras}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
