import { useEffect, useRef, type ReactNode } from "react";
import type { ProtocolMessageType, UiTimelineEntry } from "../../lib/types";

function payloadSummary(entry: UiTimelineEntry): string {
  const summary = entry.payload.summary;
  if (typeof summary === "string" && summary.trim().length > 0) {
    return summary;
  }

  const question = entry.payload.question;
  if (typeof question === "string" && question.trim().length > 0) {
    return question;
  }

  const message = entry.payload.message;
  if (typeof message === "string" && message.trim().length > 0) {
    return message;
  }

  const decision = entry.payload.decision;
  if (typeof decision === "string" && decision.trim().length > 0) {
    return `decision=${decision}`;
  }

  return "(no summary payload)";
}

interface FindingTag {
  severity: string;
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
      severity,
      style: findingStyles[severity] ?? "border-slate-500/20 bg-slate-500/10 text-slate-400"
    });
  }
  return tags;
}

function isCleanPass(entry: UiTimelineEntry): boolean {
  if (entry.type !== "PASS") {
    return false;
  }
  const passIntent = entry.payload.pass_intent;
  if (passIntent === "no_findings") {
    return true;
  }
  const findings = entry.payload.findings;
  if (Array.isArray(findings) && findings.length === 0) {
    return true;
  }
  return false;
}

function isBlockedEntry(entry: UiTimelineEntry): boolean {
  return entry.type === "HUMAN_QUESTION";
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

type RoleKind = "impl" | "review" | "human" | "system" | "meta";

const roleStyles: Record<RoleKind, string> = {
  impl: "border-blue-500/30 bg-blue-500/15 text-blue-500",
  review: "border-purple-500/30 bg-purple-500/15 text-purple-500",
  human: "border-amber-500/30 bg-amber-500/15 text-amber-500",
  system: "border-emerald-500/30 bg-emerald-500/15 text-emerald-500",
  meta: "border-fuchsia-500/30 bg-fuchsia-500/15 text-fuchsia-400"
};

const roleIcons: Record<RoleKind, string> = {
  impl: "\u25B6",
  review: "\u25C6",
  human: "?",
  system: "\u25CB",
  meta: "\u25C9"
};

function resolveRole(entry: UiTimelineEntry): RoleKind {
  const metadata = entry.payload.metadata;
  const actor =
    typeof metadata === "object" && metadata !== null
      ? (metadata as { actor?: unknown }).actor
      : undefined;
  if (actor === "meta-reviewer") {
    return "meta";
  }
  const type: ProtocolMessageType = entry.type;
  if (type === "HUMAN_QUESTION" || type === "HUMAN_REPLY") {
    return "human";
  }
  if (type === "CONVERGENCE" || type === "DONE_PACKAGE") {
    return "system";
  }
  const sender = entry.sender.toLowerCase();
  if (sender.includes("review") || sender.includes("claude")) {
    return "review";
  }
  return "impl";
}

export interface BubbleTimelineProps {
  entries: UiTimelineEntry[] | null;
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
  const showLoading = props.isLoading && !showError;
  const hasExtras = props.extras !== null && props.extras !== undefined;
  const hasEmptyState =
    !showLoading && !showError && props.entries !== null && props.entries.length === 0;

  useEffect(() => {
    const el = scrollRef.current;
    if (el !== null && shouldAutoScrollRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [props.entries, props.extras]);

  const hasEntries = !showLoading && !showError && props.entries !== null && props.entries.length > 0;
  const showScrollable = hasEntries || hasEmptyState || hasExtras;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {showLoading ? (
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

          {hasEntries && props.entries !== null ? (
            <>
          {props.entries.map((entry) => {
            const role = resolveRole(entry);
            const isConvergence = entry.type === "CONVERGENCE";
            const blocked = isBlockedEntry(entry);
            const findingTags = extractFindingTags(entry);
            const cleanPass = isCleanPass(entry);
            return (
              <div
                key={entry.id}
                className="flex items-start gap-2.5 border-b border-[#1a1a1a] py-1 text-[10px] last:border-b-0"
              >
                <span className="min-w-[20px] pt-px font-mono text-[9px] text-[#555]">
                  R{entry.round}
                </span>
                <span
                  className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border text-[8px] ${roleStyles[role]}`}
                >
                  {roleIcons[role]}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    {isConvergence ? (
                      <span className="font-semibold text-emerald-500">CONVERGENCE</span>
                    ) : blocked ? (
                      <span className="font-medium text-amber-500">
                        {entry.sender} &mdash; blocked
                      </span>
                    ) : (
                      <span className="font-medium text-[#aaa]">
                        {entry.sender}{" "}
                        <span className="text-[#555]">({role === "system" ? "system" : role === "human" ? "human" : role === "review" ? "reviewer" : role === "meta" ? "meta-reviewer" : "implementer"})</span>
                      </span>
                    )}
                    {findingTags.map((tag) => (
                      <span
                        key={tag.severity}
                        className={`inline-block rounded px-1 text-[9px] font-semibold leading-tight border ${tag.style}`}
                      >
                        {tag.severity}
                      </span>
                    ))}
                    {cleanPass ? (
                      <span className="inline-block rounded border border-emerald-500/20 bg-emerald-500/10 px-1 text-[9px] font-semibold leading-tight text-emerald-500">
                        &#x2713; clean
                      </span>
                    ) : null}
                  </div>
                  {compact ? null : (
                    <div className="leading-relaxed text-[#666]">
                      {payloadSummary(entry)}
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
