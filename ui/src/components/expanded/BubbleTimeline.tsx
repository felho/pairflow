import { useEffect, useRef, type ReactNode } from "react";
import type {
  UiTimelineDisplayRole,
  UiTimelineEntry,
  UiTimelineEntryDisplay
} from "../../lib/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

interface FindingTag {
  label: string;
  style: string;
}

const findingStyles: Record<string, string> = {
  P0: "border-red-500/20 bg-red-500/10 text-red-500",
  P1: "border-red-500/20 bg-red-500/10 text-red-500",
  P2: "border-amber-500/20 bg-amber-500/10 text-amber-500",
  P3: "border-slate-500/20 bg-slate-500/10 text-slate-400"
};

function extractFindingTags(entry: UiTimelineEntry): FindingTag[] {
  const findings = entry.payload.findings;
  if (!Array.isArray(findings)) {
    return [];
  }
  const seen = new Set<string>();
  const tags: FindingTag[] = [];
  for (const finding of findings) {
    if (typeof finding !== "object" || finding === null) {
      continue;
    }
    const severityValue = (finding as { severity?: unknown }).severity;
    if (typeof severityValue !== "string") {
      continue;
    }
    const severity = severityValue;
    if (seen.has(severity)) {
      continue;
    }
    seen.add(severity);
    tags.push({
      label: severity,
      style: findingStyles[severity] ?? "border-slate-500/20 bg-slate-500/10 text-slate-400"
    });
  }
  return tags;
}

function extractMetaRecommendation(entry: UiTimelineEntry): string | null {
  const metadata = entry.payload.metadata;
  if (!isRecord(metadata)) {
    return null;
  }
  const recommendation = metadata.latest_recommendation ?? metadata.recommendation;
  return typeof recommendation === "string" ? recommendation : null;
}

function hasDisplayGateFailureSplit(entry: UiTimelineEntry): boolean {
  return entry.display.validationFailure !== null && entry.display.syntheticApproval !== null;
}

function buildSyntheticMetaApprovalEntry(entry: UiTimelineEntry): UiTimelineEntry {
  const syntheticApproval = entry.display.syntheticApproval;
  if (syntheticApproval === null) {
    return entry;
  }
  const metadata = isRecord(entry.payload.metadata) ? entry.payload.metadata : {};
  const sender =
    typeof metadata.actor_agent === "string" ? metadata.actor_agent : entry.recipient;
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
      badges: [],
      progress: null,
      validationFailure: null,
      syntheticApproval: null
    },
    payload: {
      summary: summaryText,
      metadata: {
        actor: "meta-reviewer",
        ...(typeof metadata.actor_agent === "string"
          ? { actor_agent: metadata.actor_agent }
          : {}),
        recommendation: "approve"
      }
    },
    refs: []
  };
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

function extractMetaReviewHandoffAttempt(entry: UiTimelineEntry): number | null {
  const metadata = entry.payload.metadata;
  if (!isRecord(metadata)) {
    return null;
  }
  const handoffId = metadata.meta_review_handoff_id;
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

function isMetaReviewHandoff(entry: UiTimelineEntry): boolean {
  return entry.type === "TASK" && extractMetaReviewHandoffAttempt(entry) !== null;
}

interface DisplayTimelineItem {
  entry: UiTimelineEntry;
  metaReviewRerunCleanRunCount: number | null;
  gateFailed: boolean;
}

function buildDisplayTimelineItems(input: {
  entries: UiTimelineEntry[];
  cleanRunsRequired: number | null | undefined;
}): DisplayTimelineItem[] {
  const cleanRunsRequired =
    input.cleanRunsRequired !== null && input.cleanRunsRequired !== undefined
      ? input.cleanRunsRequired
      : 1;
  const items: DisplayTimelineItem[] = [];
  let metaCleanRuns = 0;
  let metaRunPending = false;

  for (const entry of input.entries) {
    if (hasDisplayGateFailureSplit(entry)) {
      items.push({
        entry: buildSyntheticMetaApprovalEntry(entry),
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

    const metaRecommendation = extractMetaRecommendation(entry);
    const decisionTag = extractDecisionTag(entry);

    if (isMetaReviewHandoff(entry)) {
      const handoffAttempt = extractMetaReviewHandoffAttempt(entry);
      if (!metaRunPending) {
        if (handoffAttempt !== null && handoffAttempt > 1) {
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

    if (metaRecommendation === "approve") {
      const metadata = isRecord(entry.payload.metadata)
        ? entry.payload.metadata
        : null;
      const explicitCleanRunCount =
        metadata === null
          ? null
          : readMetadataInteger(metadata, [
              "consecutive_clean_runs",
              "consecutiveCleanRuns",
              "meta_review_consecutive_clean_runs"
            ]);
      metaCleanRuns = explicitCleanRunCount ?? metaCleanRuns + 1;
      metaRunPending = false;
    } else if (
      metaRecommendation === "rework"
      || metaRecommendation === "inconclusive"
      || decisionTag?.label === "rework"
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

function extractMetaRecommendationTag(input: {
  entry: UiTimelineEntry;
  cleanRunCount: number | null;
  cleanRunsRequired: number | null | undefined;
}): FindingTag | null {
  const recommendation = extractMetaRecommendation(input.entry);
  if (recommendation === "approve") {
    if (
      input.cleanRunCount !== null
      && input.cleanRunsRequired !== null
      && input.cleanRunsRequired !== undefined
      && input.cleanRunCount < input.cleanRunsRequired
    ) {
      return {
        label: `clean ${input.cleanRunCount}`,
        style: "border-emerald-500/20 bg-emerald-500/10 text-emerald-500"
      };
    }
    return {
      label: "approve",
      style: "border-emerald-500/20 bg-emerald-500/10 text-emerald-500"
    };
  }
  if (recommendation === "rework") {
    return {
      label: "rework",
      style: "border-rose-500/20 bg-rose-500/10 text-rose-500"
    };
  }
  if (recommendation === "inconclusive") {
    return {
      label: "inconclusive",
      style: "border-amber-500/20 bg-amber-500/10 text-amber-500"
    };
  }
  return null;
}

function isCleanPass(entry: UiTimelineEntry): boolean {
  if (entry.type !== "PASS") {
    return false;
  }
  const findings = entry.payload.findings;
  if (Array.isArray(findings) && findings.length === 0) {
    return true;
  }
  return false;
}

function extractDecisionTag(entry: UiTimelineEntry): FindingTag | null {
  if (entry.type !== "APPROVAL_DECISION") {
    return null;
  }
  const decision = entry.payload.decision;
  if (decision === "rework") {
    return {
      label: "rework",
      style: "border-rose-500/20 bg-rose-500/10 text-rose-500"
    };
  }
  if (decision === "approve") {
    return {
      label: "approve",
      style: "border-emerald-500/20 bg-emerald-500/10 text-emerald-500"
    };
  }
  return null;
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
      : buildDisplayTimelineItems({
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
  let metaCleanRuns = 0;

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
            const findingTags = extractFindingTags(entry);
            const metadata = isRecord(entry.payload.metadata)
              ? entry.payload.metadata
              : null;
            const metaRecommendation = item.gateFailed
              ? null
              : extractMetaRecommendation(entry);
            let cleanRunCount: number | null = null;
            if (item.metaReviewRerunCleanRunCount !== null) {
              metaCleanRuns = item.metaReviewRerunCleanRunCount;
              cleanRunCount = item.metaReviewRerunCleanRunCount;
            } else if (metaRecommendation === "approve") {
              const explicitCleanRunCount =
                metadata === null
                  ? null
                  : readMetadataInteger(metadata, [
                      "consecutive_clean_runs",
                      "consecutiveCleanRuns",
                      "meta_review_consecutive_clean_runs"
                    ]);
              metaCleanRuns = explicitCleanRunCount ?? metaCleanRuns + 1;
              cleanRunCount = metaCleanRuns;
            } else if (
              item.gateFailed
              || metaRecommendation === "rework"
              || metaRecommendation === "inconclusive"
            ) {
              metaCleanRuns = 0;
            }
            const metaRecommendationTag = item.gateFailed
              ? null
              : extractMetaRecommendationTag({
                  entry,
                  cleanRunCount,
                  cleanRunsRequired: props.metaReviewCleanRunsRequired
                });
            const decisionTag = extractDecisionTag(entry);
            const effectiveMetaRecommendationTag =
              metaRecommendationTag !== null &&
              decisionTag !== null &&
              metaRecommendationTag.label === decisionTag.label
                ? null
                : metaRecommendationTag;
            const metaReviewRerunTag =
              item.metaReviewRerunCleanRunCount !== null && cleanRunCount !== null
                ? {
                    label: `clean ${cleanRunCount}`,
                    style: "border-emerald-500/20 bg-emerald-500/10 text-emerald-500"
                  }
                : null;
            const cleanPass = isCleanPass(entry);
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
                    {findingTags.map((tag) => (
                      <span
                        key={tag.label}
                        className={`inline-block rounded px-1 text-[9px] font-semibold leading-tight border ${tag.style}`}
                      >
                        {tag.label}
                      </span>
                    ))}
                    {metaReviewRerunTag !== null ? (
                      <span
                        className={`inline-block rounded px-1 text-[9px] font-semibold leading-tight border ${metaReviewRerunTag.style}`}
                      >
                        {metaReviewRerunTag.label}
                      </span>
                    ) : null}
                    {effectiveMetaRecommendationTag !== null ? (
                      <span
                        className={`inline-block rounded px-1 text-[9px] font-semibold leading-tight border ${effectiveMetaRecommendationTag.style}`}
                      >
                        {effectiveMetaRecommendationTag.label}
                      </span>
                    ) : null}
                    {decisionTag !== null ? (
                      <span
                        className={`inline-block rounded px-1 text-[9px] font-semibold leading-tight border ${decisionTag.style}`}
                      >
                        {decisionTag.label}
                      </span>
                    ) : null}
                    {cleanPass ? (
                      <span className="inline-block rounded border border-emerald-500/20 bg-emerald-500/10 px-1 text-[9px] font-semibold leading-tight text-emerald-500">
                        &#x2713; clean
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
