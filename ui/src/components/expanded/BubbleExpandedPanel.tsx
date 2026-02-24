import { getAttachAvailability } from "../../lib/attachAvailability";
import { cn } from "../../lib/utils";
import type { BubbleActionKind, BubbleCardModel, UiBubbleDetail, UiTimelineEntry } from "../../lib/types";
import type { RunBubbleActionInput } from "../../state/useBubbleStore";
import { ActionBar } from "../actions/ActionBar";
import { BubbleTimeline } from "./BubbleTimeline";

function formatStateLabel(state: string): string {
  return state.replaceAll("_", " ");
}

export interface BubbleExpandedPanelProps {
  bubble: BubbleCardModel | null;
  detail: UiBubbleDetail | null;
  timeline: UiTimelineEntry[] | null;
  detailLoading: boolean;
  timelineLoading: boolean;
  detailError: string | null;
  timelineError: string | null;
  actionLoading: boolean;
  actionError: string | null;
  actionRetryHint: string | null;
  actionFailure: BubbleActionKind | null;
  onClose(): void;
  onRefresh(): Promise<void>;
  onAction(input: RunBubbleActionInput): Promise<void>;
  onAttach(command: string): Promise<void>;
  onClearActionFeedback(): void;
}

export function BubbleExpandedPanel(props: BubbleExpandedPanelProps): JSX.Element | null {
  if (props.bubble === null) {
    return null;
  }

  const attach = getAttachAvailability({
    bubbleId: props.bubble.bubbleId,
    state: props.bubble.state,
    hasRuntimeSession: props.bubble.hasRuntimeSession,
    runtime: props.bubble.runtime
  });

  return (
    <aside className="fixed inset-y-0 right-0 z-40 w-full max-w-2xl overflow-auto border-l border-slate-700/90 bg-slate-950/97 p-4 shadow-2xl">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="font-display text-xl font-semibold text-slate-50">{props.bubble.bubbleId}</div>
          <div className="mt-1 text-xs text-slate-300">{props.bubble.repoPath}</div>
          <div className="mt-2 inline-flex items-center rounded-full border border-slate-700 bg-slate-900/80 px-2 py-0.5 text-xs text-slate-200">
            {formatStateLabel(props.bubble.state)}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-md border border-slate-600 px-3 py-1.5 text-sm text-slate-200 hover:border-slate-400"
            onClick={() => {
              void props.onRefresh();
            }}
            disabled={props.detailLoading || props.timelineLoading}
          >
            Refresh
          </button>
          <button
            type="button"
            className="rounded-md border border-slate-600 px-3 py-1.5 text-sm text-slate-200 hover:border-slate-400"
            onClick={() => {
              props.onClose();
            }}
          >
            Close
          </button>
        </div>
      </div>

      <section className="mb-3 rounded-xl border border-slate-700 bg-slate-900/65 p-3">
        <h3 className="font-display text-sm font-semibold text-slate-100">Latest Status</h3>
        <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-300">
          <div>Round: {props.bubble.round}</div>
          <div className="text-right">Active role: {props.bubble.activeRole ?? "none"}</div>
          <div className="truncate">Agent: {props.bubble.activeAgent ?? "idle"}</div>
          <div className={cn("text-right", props.bubble.runtime.stale ? "text-amber-300" : "text-slate-300")}>{props.bubble.runtime.stale ? "Runtime stale" : props.bubble.runtime.present ? "Runtime present" : "Runtime missing"}</div>
        </div>

        {props.detailLoading ? <div className="mt-2 text-xs text-slate-400">Loading bubble detail...</div> : null}
        {props.detailError !== null ? (
          <div className="mt-2 rounded border border-rose-500/60 bg-rose-950/35 px-2 py-1 text-xs text-rose-200">
            Failed to load bubble detail: {props.detailError}
          </div>
        ) : null}

        {props.detail !== null ? (
          <>
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-300">
              <div>
                Inbox total: <span className="text-slate-100">{props.detail.pendingInboxItems.total}</span>
              </div>
              <div>
                Questions: <span className="text-slate-100">{props.detail.pendingInboxItems.humanQuestions}</span>
              </div>
              <div>
                Approvals: <span className="text-slate-100">{props.detail.pendingInboxItems.approvalRequests}</span>
              </div>
            </div>
            <div className="mt-2 text-xs text-slate-400">
              Watchdog: {props.detail.watchdog.monitored ? `tracking ${props.detail.watchdog.monitoredAgent ?? "agent"}` : "not active"}
            </div>

            {props.detail.inbox.items.length > 0 ? (
              <ul className="mt-2 space-y-1">
                {props.detail.inbox.items.slice(0, 3).map((item) => (
                  <li key={item.envelopeId} className="rounded border border-slate-700 bg-slate-950/60 px-2 py-1 text-xs text-slate-200">
                    <span className="mr-1 rounded bg-slate-800 px-1 py-0.5 text-[11px]">{item.type}</span>
                    {item.summary}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-2 text-xs text-slate-400">No pending inbox highlights.</div>
            )}
          </>
        ) : null}
      </section>

      {props.actionError !== null && (props.actionFailure === "open" || props.actionFailure === "merge") ? (
        <div className="mb-3 rounded-xl border border-rose-500/70 bg-rose-950/40 px-3 py-2 text-sm text-rose-100">
          <div className="font-medium">{props.actionFailure === "open" ? "Open failed" : "Merge failed"}</div>
          <div className="mt-1">{props.actionError}</div>
        </div>
      ) : null}

      <div className="mb-3">
        <ActionBar
          bubble={props.bubble}
          attach={attach}
          isSubmitting={props.actionLoading}
          actionError={props.actionError}
          retryHint={props.actionRetryHint}
          actionFailure={props.actionFailure}
          onAction={props.onAction}
          onAttach={props.onAttach}
          onClearFeedback={props.onClearActionFeedback}
        />
      </div>

      <BubbleTimeline
        entries={props.timeline}
        isLoading={props.timelineLoading}
        error={props.timelineError}
      />
    </aside>
  );
}
