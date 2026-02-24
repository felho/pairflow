import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type {
  BubbleCardModel,
  BubbleLifecycleState,
  BubblePosition
} from "../../lib/types";
import { cn } from "../../lib/utils";
import { ConnectedBubbleExpandedCard } from "./ConnectedBubbleExpandedCard";
import { stateVisuals } from "./stateVisuals";

const cardWidth = 248;
const cardHeight = 156;
const xGap = 26;
const yGap = 22;
const startX = 22;
const startY = 22;

interface DragState {
  originX: number;
  originY: number;
  startX: number;
  startY: number;
  onMove: (event: MouseEvent) => void;
  onUp: (event: MouseEvent) => void;
}

interface BubbleCardProps {
  bubble: BubbleCardModel;
  position: BubblePosition;
  onPositionChange(position: BubblePosition): void;
  onPositionCommit(): void;
  onDragStateChange(dragging: boolean): void;
  onOpen(): void;
}

function formatStateLabel(state: BubbleLifecycleState): string {
  return state.replaceAll("_", " ");
}

function repoLabel(repoPath: string): string {
  const parts = repoPath.split(/[\\/]/u).filter((part) => part.length > 0);
  return parts[parts.length - 1] ?? repoPath;
}

function BubbleCard(props: BubbleCardProps): JSX.Element {
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<DragState | null>(null);
  const didDragRef = useRef(false);
  const onPositionChangeRef = useRef(props.onPositionChange);
  const onPositionCommitRef = useRef(props.onPositionCommit);
  const onDragStateChangeRef = useRef(props.onDragStateChange);

  useEffect(() => {
    onPositionChangeRef.current = props.onPositionChange;
    onPositionCommitRef.current = props.onPositionCommit;
    onDragStateChangeRef.current = props.onDragStateChange;
  }, [props.onPositionChange, props.onPositionCommit, props.onDragStateChange]);

  const applyDragPosition = useCallback(
    (clientX: number, clientY: number) => {
      const dragState = dragRef.current;
      if (dragState === null) {
        return;
      }
      didDragRef.current = true;
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
    onDragStateChangeRef.current(false);
    onPositionCommitRef.current();
  }, []);

  useEffect(() => {
    return () => {
      stopDrag();
    };
  }, [stopDrag]);

  const visual = stateVisuals[props.bubble.state];

  return (
    <article
      className={cn(
        "absolute w-[260px] rounded-[20px] border bg-gradient-to-b from-[#1a1a1a] to-[#0f0f0f] p-4 transition-shadow",
        visual.border,
        visual.cardTone,
        dragging ? "cursor-grabbing" : "cursor-grab"
      )}
      style={{
        left: props.position.x,
        top: props.position.y
      }}
      data-bubble-id={props.bubble.bubbleId}
      onClick={() => {
        if (!didDragRef.current) {
          props.onOpen();
        }
      }}
    >
      <button
        type="button"
        aria-label={`Bubble ${props.bubble.bubbleId} drag handle`}
        className="mb-2 flex w-full items-center justify-between"
        onMouseDown={(event) => {
          if (event.button !== 0) {
            return;
          }
          event.preventDefault();
          didDragRef.current = false;
          const nextState: DragState = {
            originX: props.position.x,
            originY: props.position.y,
            startX: event.clientX,
            startY: event.clientY,
            onMove: (pointerEvent) => {
              applyDragPosition(pointerEvent.clientX, pointerEvent.clientY);
            },
            onUp: () => {
              const dragState = dragRef.current;
              if (dragState === null) {
                return;
              }
              stopDrag();
            }
          };
          dragRef.current = nextState;
          if (!dragging) {
            setDragging(true);
            onDragStateChangeRef.current(true);
          }
          document.addEventListener("mousemove", nextState.onMove);
          document.addEventListener("mouseup", nextState.onUp);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onPositionCommitRef.current();
            return;
          }

          const step = event.shiftKey ? 24 : 12;
          let deltaX = 0;
          let deltaY = 0;

          switch (event.key) {
            case "ArrowLeft":
              deltaX = -step;
              break;
            case "ArrowRight":
              deltaX = step;
              break;
            case "ArrowUp":
              deltaY = -step;
              break;
            case "ArrowDown":
              deltaY = step;
              break;
            default:
              return;
          }

          event.preventDefault();
          props.onPositionChange({
            x: Math.max(0, props.position.x + deltaX),
            y: Math.max(0, props.position.y + deltaY)
          });
          props.onPositionCommit();
        }}
      >
        <span className="text-[13px] font-semibold tracking-wide text-white">
          {props.bubble.bubbleId}
        </span>
        <span className="flex items-center gap-1.5">
          <span className={cn("inline-block h-[7px] w-[7px] rounded-full", visual.led)} />
          <span className={cn("text-[10px] font-medium tracking-wide", visual.stateText)}>
            {formatStateLabel(props.bubble.state)}
          </span>
        </span>
      </button>

      <div className="mb-2 text-[11px] leading-relaxed text-[#888]">
        {props.bubble.runtime.stale
          ? "Stale runtime — may need manual intervention."
          : props.bubble.state === "RUNNING"
            ? `${props.bubble.activeRole ?? "agent"} working`
            : props.bubble.state === "READY_FOR_APPROVAL"
              ? "Reviewer found no issues. Ready for approval."
              : props.bubble.state === "WAITING_HUMAN"
                ? "Waiting for human input."
                : props.bubble.state === "DONE"
                  ? "Committed. Ready to merge."
                  : props.bubble.state === "FAILED"
                    ? "Failed — manual intervention needed."
                    : props.bubble.state === "CANCELLED"
                      ? "Stopped by operator before completion."
                      : props.bubble.state === "APPROVED_FOR_COMMIT"
                        ? "Approved by human. Commit step is now unblocked."
                        : props.bubble.state === "COMMITTED"
                          ? "Commit recorded; transitioning toward DONE."
                          : props.bubble.state === "PREPARING_WORKSPACE"
                            ? "Bootstrapping branch/worktree and tmux session."
                            : "Task created. Awaiting start."}
      </div>

      <div className="mt-auto flex items-center gap-2 font-mono text-[9px] text-[#555]">
        <span className="truncate">{repoLabel(props.bubble.repoPath)}</span>
        <span className="rounded-md border border-[#333] bg-[#1a1a1a] px-1.5 py-px">
          R{props.bubble.round}
        </span>
        {props.bubble.activeAgent !== null ? (
          <span className="flex items-center gap-1">
            <span
              className={cn(
                "inline-block h-1 w-1 rounded-full animate-soft-pulse",
                props.bubble.activeAgent === "codex" ? "bg-blue-400" : "bg-purple-400"
              )}
            />
            {props.bubble.activeAgent}
          </span>
        ) : null}
      </div>
    </article>
  );
}

function defaultPosition(index: number): BubblePosition {
  const columns = 4;
  const column = index % columns;
  const row = Math.floor(index / columns);
  return {
    x: startX + column * (cardWidth + xGap),
    y: startY + row * (cardHeight + yGap)
  };
}

const expandedCardWidth = 480;
const expandedCardHeight = 520;

export interface BubbleCanvasProps {
  bubbles: BubbleCardModel[];
  positions: Record<string, BubblePosition>;
  expandedBubbleIds: string[];
  onPositionChange(bubbleId: string, position: BubblePosition): void;
  onPositionCommit(): void;
  onToggleExpand(bubbleId: string): void;
}

export function BubbleCanvas(props: BubbleCanvasProps): JSX.Element {
  const [draggingIds, setDraggingIds] = useState<Record<string, boolean>>({});
  const expandedSet = useMemo(
    () => new Set(props.expandedBubbleIds),
    [props.expandedBubbleIds]
  );

  const positioned = useMemo(() => {
    return props.bubbles.map((bubble, index) => ({
      bubble,
      position: props.positions[bubble.bubbleId] ?? defaultPosition(index)
    }));
  }, [props.bubbles, props.positions]);

  const canvasDimensions = useMemo(() => {
    let maxBottom = 560;
    let maxRight = 0;
    for (const entry of positioned) {
      const isExpanded = expandedSet.has(entry.bubble.bubbleId);
      const width = isExpanded ? expandedCardWidth : cardWidth;
      const height = isExpanded ? expandedCardHeight : cardHeight;
      maxBottom = Math.max(maxBottom, entry.position.y + height + 24);
      maxRight = Math.max(maxRight, entry.position.x + width + 24);
    }
    return { minHeight: maxBottom, minWidth: maxRight };
  }, [positioned, expandedSet]);

  return (
    <main className="relative flex-1 overflow-auto px-4 pb-6 pt-4" style={canvasDimensions}>
      {positioned.map((entry) => {
        const isExpanded = expandedSet.has(entry.bubble.bubbleId);

        if (isExpanded) {
          return (
            <ConnectedBubbleExpandedCard
              key={entry.bubble.bubbleId}
              bubbleId={entry.bubble.bubbleId}
            />
          );
        }

        return (
          <BubbleCard
            key={entry.bubble.bubbleId}
            bubble={entry.bubble}
            position={entry.position}
            onPositionChange={(position) => {
              props.onPositionChange(entry.bubble.bubbleId, position);
            }}
            onPositionCommit={() => {
              props.onPositionCommit();
            }}
            onDragStateChange={(dragging) => {
              setDraggingIds((current) => {
                if (dragging) {
                  return {
                    ...current,
                    [entry.bubble.bubbleId]: true
                  };
                }
                if (current[entry.bubble.bubbleId] === undefined) {
                  return current;
                }
                const next = { ...current };
                delete next[entry.bubble.bubbleId];
                return next;
              });
            }}
            onOpen={() => {
              props.onToggleExpand(entry.bubble.bubbleId);
            }}
          />
        );
      })}
      {positioned.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/50 p-8 text-sm text-slate-400">
          No bubbles in current repo filter.
        </div>
      ) : null}
      <div className="sr-only" aria-live="polite">
        {Object.values(draggingIds).some(Boolean) ? "Dragging bubble" : "Canvas ready"}
      </div>
    </main>
  );
}
