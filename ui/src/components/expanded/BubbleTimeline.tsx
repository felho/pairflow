import type { UiTimelineEntry } from "../../lib/types";

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

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }
  return date.toLocaleString();
}

export interface BubbleTimelineProps {
  entries: UiTimelineEntry[] | null;
  isLoading: boolean;
  error: string | null;
}

export function BubbleTimeline(props: BubbleTimelineProps): JSX.Element {
  return (
    <section className="rounded-xl border border-slate-700 bg-slate-900/65 p-3">
      <h3 className="font-display text-sm font-semibold text-slate-100">Timeline</h3>

      {props.isLoading ? (
        <div className="mt-2 text-xs text-slate-300">Loading timeline...</div>
      ) : null}

      {props.error !== null ? (
        <div className="mt-2 rounded border border-rose-500/60 bg-rose-950/35 px-2 py-1 text-xs text-rose-200">
          Failed to load timeline: {props.error}
        </div>
      ) : null}

      {!props.isLoading && props.error === null && props.entries !== null && props.entries.length === 0 ? (
        <div className="mt-2 text-xs text-slate-400">No timeline entries yet.</div>
      ) : null}

      {!props.isLoading && props.error === null && props.entries !== null && props.entries.length > 0 ? (
        <ol className="mt-2 max-h-72 space-y-2 overflow-auto pr-1">
          {props.entries.map((entry) => (
            <li key={entry.id} className="rounded-md border border-slate-700/80 bg-slate-950/65 p-2">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-slate-200">{entry.type}</span>
                <span>
                  {entry.sender}
                  {" -> "}
                  {entry.recipient}
                </span>
                <span className="text-slate-500">round {entry.round}</span>
              </div>
              <div className="mt-1 text-xs text-slate-100">{payloadSummary(entry)}</div>
              <div className="mt-1 text-[11px] text-slate-500">{formatTimestamp(entry.ts)}</div>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}
