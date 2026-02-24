import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type {
  BubbleCardModel,
  BubbleLifecycleState,
  BubblePosition
} from "../../lib/types";
import { cn } from "../../lib/utils";

const cardWidth = 248;
const cardHeight = 156;
const xGap = 26;
const yGap = 22;
const startX = 22;
const startY = 22;

interface StateVisual {
  led: string;
  border: string;
  cardTone: string;
  stateText: string;
}

const stateVisuals: Record<BubbleLifecycleState, StateVisual> = {
  CREATED: {
    led: "bg-sky-300",
    border: "border-slate-500/80",
    cardTone: "bg-slate-900/95",
    stateText: "text-sky-200"
  },
  PREPARING_WORKSPACE: {
    led: "bg-cyan-300 animate-soft-pulse",
    border: "border-cyan-500/80",
    cardTone: "bg-cyan-950/35",
    stateText: "text-cyan-200"
  },
  RUNNING: {
    led: "bg-blue-400 animate-soft-pulse",
    border: "border-blue-500/80",
    cardTone: "bg-blue-950/30",
    stateText: "text-blue-200"
  },
  WAITING_HUMAN: {
    led: "bg-amber-400 animate-attention-pulse",
    border: "border-amber-400/85 shadow-[0_0_0_1px_rgba(251,191,36,.35)]",
    cardTone: "bg-amber-950/30",
    stateText: "text-amber-200"
  },
  READY_FOR_APPROVAL: {
    led: "bg-emerald-400",
    border: "border-emerald-400/90 shadow-[0_0_0_1px_rgba(16,185,129,.35)]",
    cardTone: "bg-emerald-950/30",
    stateText: "text-emerald-200"
  },
  APPROVED_FOR_COMMIT: {
    led: "bg-lime-400",
    border: "border-lime-500/80",
    cardTone: "bg-lime-950/30",
    stateText: "text-lime-200"
  },
  COMMITTED: {
    led: "bg-teal-300 animate-soft-pulse",
    border: "border-teal-500/85",
    cardTone: "bg-teal-950/35",
    stateText: "text-teal-200"
  },
  DONE: {
    led: "bg-slate-500",
    border: "border-slate-700/80",
    cardTone: "bg-slate-900/75 opacity-80",
    stateText: "text-slate-300"
  },
  FAILED: {
    led: "bg-rose-400",
    border: "border-rose-500/90 shadow-[0_0_0_1px_rgba(251,113,133,.4)]",
    cardTone: "bg-rose-950/35",
    stateText: "text-rose-200"
  },
  CANCELLED: {
    led: "bg-slate-400",
    border: "border-slate-500 border-dashed",
    cardTone: "bg-slate-900/70",
    stateText: "text-slate-300"
  }
};

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
}

function formatStateLabel(state: BubbleLifecycleState): string {
  return state.replaceAll("_", " ");
}

function BubbleCard(props: BubbleCardProps): JSX.Element {
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<DragState | null>(null);
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
        "absolute w-[248px] rounded-xl border p-3 shadow-lg transition-shadow",
        visual.border,
        visual.cardTone,
        dragging ? "cursor-grabbing shadow-cyan-300/15" : "cursor-grab"
      )}
      style={{
        left: props.position.x,
        top: props.position.y
      }}
      data-bubble-id={props.bubble.bubbleId}
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
        <span className="font-display text-sm font-semibold tracking-wide text-slate-50">
          {props.bubble.bubbleId}
        </span>
        <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", visual.stateText)}>
          {formatStateLabel(props.bubble.state)}
        </span>
      </button>

      <div className="mb-2 flex items-center justify-between text-xs text-slate-300">
        <span className="truncate" title={props.bubble.repoPath}>
          {props.bubble.repoPath}
        </span>
        <span className={cn("h-2.5 w-2.5 rounded-full", visual.led)} />
      </div>

      <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-300">
        <span>Round {props.bubble.round}</span>
        <span className="truncate text-right">{props.bubble.activeAgent ?? "idle"}</span>
        <span className="truncate text-slate-400">{props.bubble.activeRole ?? "no role"}</span>
        <span className={cn("text-right", props.bubble.runtime.stale ? "text-amber-300" : "text-slate-400")}>
          {props.bubble.runtime.stale
            ? "Stale runtime"
            : props.bubble.hasRuntimeSession
              ? "Runtime active"
              : "No runtime"}
        </span>
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

export interface BubbleCanvasProps {
  bubbles: BubbleCardModel[];
  positions: Record<string, BubblePosition>;
  onPositionChange(bubbleId: string, position: BubblePosition): void;
  onPositionCommit(): void;
}

export function BubbleCanvas(props: BubbleCanvasProps): JSX.Element {
  const [draggingIds, setDraggingIds] = useState<Record<string, boolean>>({});

  const positioned = useMemo(() => {
    return props.bubbles.map((bubble, index) => ({
      bubble,
      position: props.positions[bubble.bubbleId] ?? defaultPosition(index)
    }));
  }, [props.bubbles, props.positions]);

  const canvasHeight = useMemo(() => {
    const maxBottom = positioned.reduce((max, entry) => {
      const bottom = entry.position.y + cardHeight + 24;
      return Math.max(max, bottom);
    }, 560);
    return maxBottom;
  }, [positioned]);

  return (
    <main className="relative overflow-auto px-4 pb-6 pt-4" style={{ minHeight: canvasHeight }}>
      {positioned.map((entry) => (
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
        />
      ))}
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
