import { useEffect, useRef, type ReactNode } from "react";
import type {
  UiTimelineBadge,
  UiTimelineDisplayRole,
  UiTimelineDisplayItem,
  UiTimelineTone
} from "../../lib/types";

function badgeToneClass(badge: UiTimelineBadge): string {
  return toneClass(badge.tone, badge.kind === "finding");
}

function toneClass(tone: UiTimelineTone, finding: boolean = false): string {
  if (tone === "success") {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-500";
  }
  if (tone === "warning") {
    return "border-amber-500/20 bg-amber-500/10 text-amber-500";
  }
  if (tone === "danger") {
    return finding
      ? "border-red-500/20 bg-red-500/10 text-red-500"
      : "border-rose-500/20 bg-rose-500/10 text-rose-500";
  }
  if (tone === "info") {
    return "border-blue-500/20 bg-blue-500/10 text-blue-500";
  }
  return "border-slate-500/20 bg-slate-500/10 text-slate-400";
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

function blockedLabelClass(item: UiTimelineDisplayItem): string {
  return item.tone === "warning" ? "font-medium text-amber-500" : "font-medium text-[#aaa]";
}

export interface BubbleTimelineProps {
  entries: UiTimelineDisplayItem[] | null;
  isLoading: boolean;
  error: string | null;
  compact: boolean;
  extras?: ReactNode;
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
  const displayItems = props.entries;

  useEffect(() => {
    const el = scrollRef.current;
    if (el !== null && shouldAutoScrollRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [props.entries, props.extras]);

  const hasEntries =
    !showError && displayItems !== null && displayItems.length > 0;
  const showScrollable = hasEntries || hasEmptyState || hasExtras;

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
            const role = resolveRole(item.role);
            const displaySender = item.senderLabel;
            return (
              <div
                key={item.id}
                className="flex items-start border-b border-[#1a1a1a] py-1 text-[10px] last:border-b-0"
              >
                <span className="min-w-[20px] pt-px pr-2 text-right font-mono text-[9px] text-[#555]">
                  R{item.round}
                </span>
                <span
                  className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border text-[8px] ${roleStyles[role]}`}
                >
                  {roleIcons[role]}
                </span>
                <div className="ml-2 min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    {item.convergence ? (
                      <span className="font-semibold text-emerald-500">CONVERGENCE</span>
                    ) : item.blocked ? (
                      <span className={blockedLabelClass(item)}>
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
                    {item.badges.map((badge, index) => (
                      <span
                        key={`${badge.kind}:${badge.label}:${index}`}
                        className={`inline-block rounded px-1 text-[9px] font-semibold leading-tight border ${badgeToneClass(badge)}`}
                      >
                        {badge.label}
                      </span>
                    ))}
                    {item.cleanRunTag !== null ? (
                      <span
                        className={`inline-block rounded px-1 text-[9px] font-semibold leading-tight border ${toneClass(item.cleanRunTag.tone)}`}
                      >
                        {item.cleanRunTag.label}
                      </span>
                    ) : null}
                  </div>
                  {compact ? null : (
                    <div className="leading-relaxed text-[#666]">
                      {item.summaryText}
                    </div>
                  )}
                </div>
                <span className="flex-shrink-0 pt-px font-mono text-[9px] text-[#444]">
                  {formatTime(item.ts)}
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
