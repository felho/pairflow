import { useCallback, useEffect, useRef, useState } from "react";

import { getAttachAvailability } from "../../lib/attachAvailability";
import { copyToClipboard } from "../../lib/clipboard";
import type {
  BubbleActionKind,
  BubbleCardModel,
  BubbleLifecycleState,
  BubblePosition,
  UiBubbleDetail,
  UiTimelineEntry
} from "../../lib/types";
import { cn } from "../../lib/utils";
import type { RunBubbleActionInput } from "../../state/useBubbleStore";
import { ActionBar } from "../actions/ActionBar";
import { BubbleTimeline } from "../expanded/BubbleTimeline";
import { stateVisuals } from "./stateVisuals";

interface DragState {
  originX: number;
  originY: number;
  startX: number;
  startY: number;
  onMove: (event: MouseEvent) => void;
  onUp: (event: MouseEvent) => void;
}

function formatStateLabel(state: BubbleLifecycleState): string {
  return state.replaceAll("_", " ");
}

function repoLabel(repoPath: string): string {
  const parts = repoPath.split(/[\\/]/u).filter((part) => part.length > 0);
  return parts[parts.length - 1] ?? repoPath;
}

export interface BubbleExpandedCardProps {
  bubble: BubbleCardModel;
  detail: UiBubbleDetail | null;
  timeline: UiTimelineEntry[] | null;
  position: BubblePosition;
  detailLoading: boolean;
  timelineLoading: boolean;
  detailError: string | null;
  timelineError: string | null;
  actionLoading: boolean;
  actionError: string | null;
  actionRetryHint: string | null;
  actionFailure: BubbleActionKind | null;
  onPositionChange(position: BubblePosition): void;
  onPositionCommit(): void;
  onClose(): void;
  onRefresh(): void;
  onAction(input: RunBubbleActionInput): Promise<void>;
  onClearActionFeedback(): void;
}

export function BubbleExpandedCard(props: BubbleExpandedCardProps): JSX.Element {
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<DragState | null>(null);
  const onPositionChangeRef = useRef(props.onPositionChange);
  const onPositionCommitRef = useRef(props.onPositionCommit);

  useEffect(() => {
    onPositionChangeRef.current = props.onPositionChange;
    onPositionCommitRef.current = props.onPositionCommit;
  }, [props.onPositionChange, props.onPositionCommit]);

  const applyDragPosition = useCallback(
    (clientX: number, clientY: number) => {
      const dragState = dragRef.current;
      if (dragState === null) {
        return;
      }
      onPositionChangeRef.current({
        x: Math.max(0, dragState.originX + (clientX - dragState.startX)),
        y: Math.max(0, dragState.originY + (clientY - dragState.startY))
      });
    },
    []
  );

  const stopDrag = useCallback(() => {
    const dragState = dragRef.current;
    if (dragState === null) {
      return;
    }
    document.removeEventListener("mousemove", dragState.onMove);
    document.removeEventListener("mouseup", dragState.onUp);
    dragRef.current = null;
    setDragging(false);
    onPositionCommitRef.current();
  }, []);

  useEffect(() => {
    return () => {
      stopDrag();
    };
  }, [stopDrag]);

  const visual = stateVisuals[props.bubble.state];
  const attach = getAttachAvailability({
    bubbleId: props.bubble.bubbleId,
    state: props.bubble.state,
    hasRuntimeSession: props.bubble.hasRuntimeSession,
    runtime: props.bubble.runtime
  });

  const pendingQuestion =
    props.bubble.state === "WAITING_HUMAN" && props.detail !== null
      ? props.detail.inbox.items.find((item) => item.type === "HUMAN_QUESTION") ?? null
      : null;

  return (
    <article
      className={cn(
        "absolute w-[480px] rounded-[20px] border bg-gradient-to-b from-[#1a1a1a] to-[#0f0f0f] p-4 transition-shadow",
        visual.border,
        visual.cardTone,
        dragging ? "z-40 cursor-grabbing" : "z-30"
      )}
      style={{
        left: props.position.x,
        top: props.position.y
      }}
      data-bubble-id={props.bubble.bubbleId}
      data-expanded
    >
      {/* Header — drag handle */}
      <div
        className={cn("mb-3 flex items-center justify-between", dragging ? "cursor-grabbing" : "cursor-grab")}
        onMouseDown={(event) => {
          if (event.button !== 0) {
            return;
          }
          event.preventDefault();
          const nextState: DragState = {
            originX: props.position.x,
            originY: props.position.y,
            startX: event.clientX,
            startY: event.clientY,
            onMove: (pointerEvent) => {
              applyDragPosition(pointerEvent.clientX, pointerEvent.clientY);
            },
            onUp: () => {
              stopDrag();
            }
          };
          dragRef.current = nextState;
          if (!dragging) {
            setDragging(true);
          }
          document.addEventListener("mousemove", nextState.onMove);
          document.addEventListener("mouseup", nextState.onUp);
        }}
      >
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-semibold tracking-wide text-white">
            {props.bubble.bubbleId}
          </span>
          <span className="font-mono text-[10px] text-[#666]">
            {repoLabel(props.bubble.repoPath)} · R{props.bubble.round}
          </span>
          <span className="flex items-center gap-1.5">
            <span className={cn("inline-block h-[7px] w-[7px] rounded-full", visual.led)} />
            <span className={cn("text-[10px] font-medium tracking-wide", visual.stateText)}>
              {formatStateLabel(props.bubble.state)}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="rounded-md px-1.5 py-0.5 text-[11px] text-[#888] hover:bg-[#333] hover:text-white"
            onClick={(event) => {
              event.stopPropagation();
              props.onRefresh();
            }}
          >
            Refresh
          </button>
          <button
            type="button"
            className="rounded-md px-1.5 py-0.5 text-[11px] text-[#888] hover:bg-[#333] hover:text-white"
            onClick={(event) => {
              event.stopPropagation();
              props.onClose();
            }}
            aria-label="Close expanded card"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Question card (WAITING_HUMAN only) */}
      {pendingQuestion !== null ? (
        <div className="mb-3 rounded-lg border border-amber-500/60 bg-amber-950/25 px-3 py-2">
          <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-amber-400">
            Question from {pendingQuestion.sender}
          </div>
          <div className="text-xs leading-relaxed text-amber-100">
            {pendingQuestion.summary}
          </div>
        </div>
      ) : null}

      {/* Approval package (READY_FOR_APPROVAL only) */}
      {props.bubble.state === "READY_FOR_APPROVAL" && props.detail !== null ? (
        <div className="mb-3 rounded-lg border border-emerald-500/60 bg-emerald-950/25 px-3 py-2">
          <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-emerald-400">
            Ready for Approval
          </div>
          <div className="text-xs leading-relaxed text-emerald-100">
            Reviewer found no issues. Review and approve to proceed.
          </div>
        </div>
      ) : null}

      {/* Action buttons */}
      <div className="mb-3">
        <ActionBar
          bubble={props.bubble}
          attach={attach}
          isSubmitting={props.actionLoading}
          actionError={props.actionError}
          retryHint={props.actionRetryHint}
          actionFailure={props.actionFailure}
          onAction={props.onAction}
          onAttach={async (command) => {
            await copyToClipboard(command);
          }}
          onClearFeedback={props.onClearActionFeedback}
        />
      </div>

      {/* Timeline */}
      <BubbleTimeline
        entries={props.timeline}
        isLoading={props.timelineLoading}
        error={props.timelineError}
      />
    </article>
  );
}
