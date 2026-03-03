import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type {
  BubbleCardModel,
  BubbleDeleteArtifacts,
  BubbleDeleteResult,
  BubbleLifecycleState,
  BubblePosition
} from "../../lib/types";
import { copyToClipboard } from "../../lib/clipboard";
import {
  bubbleDimensions,
  defaultPosition,
} from "../../lib/canvasLayout";
import { cn } from "../../lib/utils";
import { ConnectedBubbleExpandedCard } from "./ConnectedBubbleExpandedCard";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { stateVisuals } from "./stateVisuals";

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
  onPositionChange: (position: BubblePosition) => void;
  onPositionCommit: () => void;
  onDragStateChange: (dragging: boolean) => void;
  onCopySuccess: (bubbleId: string) => void;
  onCopyError: (message: string) => void;
  onOpen: () => void;
  onDelete: (trigger: HTMLButtonElement) => void;
  deleteDisabled: boolean;
}

function formatStateLabel(state: BubbleLifecycleState): string {
  return state.replaceAll("_", " ");
}

function repoLabel(repoPath: string): string {
  const parts = repoPath.split(/[\\/]/u).filter((part) => part.length > 0);
  return parts[parts.length - 1] ?? repoPath;
}

function asMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isCopyBubbleIdTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }
  return target.closest("[data-copy-bubble-id-target='true']") !== null;
}

function BubbleCard(props: BubbleCardProps): JSX.Element {
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<DragState | null>(null);
  const didDragRef = useRef(false);
  const openTimeoutIdRef = useRef<number | null>(null);
  const onPositionChangeRef = useRef(props.onPositionChange);
  const onPositionCommitRef = useRef(props.onPositionCommit);
  const onDragStateChangeRef = useRef(props.onDragStateChange);
  const onOpenRef = useRef(props.onOpen);
  const collapsedDimensions = bubbleDimensions(false);

  useEffect(() => {
    onPositionChangeRef.current = props.onPositionChange;
    onPositionCommitRef.current = props.onPositionCommit;
    onDragStateChangeRef.current = props.onDragStateChange;
    onOpenRef.current = props.onOpen;
  }, [
    props.onPositionChange,
    props.onPositionCommit,
    props.onDragStateChange,
    props.onOpen
  ]);

  const clearPendingOpen = useCallback(() => {
    if (openTimeoutIdRef.current === null) {
      return;
    }
    window.clearTimeout(openTimeoutIdRef.current);
    openTimeoutIdRef.current = null;
  }, []);

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

  useEffect(() => {
    return () => {
      clearPendingOpen();
    };
  }, [clearPendingOpen]);

  const copyBubbleId = useCallback(async () => {
    clearPendingOpen();
    try {
      await copyToClipboard(props.bubble.bubbleId);
      props.onCopySuccess(props.bubble.bubbleId);
    } catch (error) {
      props.onCopyError(
        `Copy bubble ID failed (${props.bubble.bubbleId}): ${asMessage(error)}`
      );
    }
  }, [
    clearPendingOpen,
    props.bubble.bubbleId,
    props.onCopyError,
    props.onCopySuccess
  ]);

  const visual = stateVisuals[props.bubble.state];

  return (
    <article
      className={cn(
        "absolute rounded-[20px] border bg-gradient-to-b from-[#1a1a1a] to-[#0f0f0f] p-4 transition-shadow",
        visual.border,
        visual.cardTone,
        dragging ? "cursor-grabbing" : "cursor-default"
      )}
      style={{
        left: props.position.x,
        top: props.position.y,
        width: collapsedDimensions.width,
        height: collapsedDimensions.height
      }}
      data-bubble-id={props.bubble.bubbleId}
      onClick={(event) => {
        if (!didDragRef.current) {
          if (isCopyBubbleIdTarget(event.target)) {
            clearPendingOpen();
            if (event.detail <= 1) {
              openTimeoutIdRef.current = window.setTimeout(() => {
                openTimeoutIdRef.current = null;
                onOpenRef.current();
              }, 240);
            }
            return;
          }
          onOpenRef.current();
        }
      }}
    >
      <button
        type="button"
        aria-label={`Bubble ${props.bubble.bubbleId} drag handle`}
        className={cn("mb-2 flex w-full items-center justify-between", dragging ? "cursor-grabbing" : "cursor-grab")}
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
        <span
          className="select-none text-[13px] font-semibold tracking-wide text-white"
          data-copy-bubble-id-target="true"
          onDoubleClick={(event) => {
            event.stopPropagation();
            void copyBubbleId();
          }}
        >
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

      <div className="mt-auto flex items-center gap-2 font-mono text-[9px]">
        <span
          className="max-w-[96px] select-none truncate rounded-[9px] border border-blue-500 bg-[#171717] px-2 py-0.5 text-blue-500"
          title={props.bubble.repoPath}
          data-copy-bubble-id-target="true"
          onDoubleClick={(event) => {
            event.stopPropagation();
            void copyBubbleId();
          }}
        >
          {repoLabel(props.bubble.repoPath)}
        </span>
        <span className="rounded-md border border-[#333] bg-[#1a1a1a] px-1.5 py-px">
          R{props.bubble.round}
        </span>
        {props.bubble.activeAgent !== null ? (
          <span className="flex items-center gap-1 text-[#555]">
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

      <button
        type="button"
        aria-label={`Delete bubble ${props.bubble.bubbleId}`}
        className="absolute bottom-3 right-3 rounded border border-transparent p-1 text-[#555] transition hover:text-rose-400 disabled:cursor-not-allowed disabled:opacity-50"
        onClick={(event) => {
          event.stopPropagation();
          props.onDelete(event.currentTarget);
        }}
        disabled={props.deleteDisabled}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-3.5 w-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="M4 7h16" />
          <path d="M9 7V5h6v2" />
          <path d="M7 7l1 12h8l1-12" />
          <path d="M10 11v5" />
          <path d="M14 11v5" />
        </svg>
      </button>
    </article>
  );
}

export interface BubbleCanvasProps {
  bubbles: BubbleCardModel[];
  positions: Record<string, BubblePosition>;
  expandedBubbleIds: string[];
  onPositionChange: (bubbleId: string, position: BubblePosition) => void;
  onPositionCommit: () => void;
  onToggleExpand: (bubbleId: string) => void;
  onDelete: (
    bubbleId: string,
    force?: boolean,
    repoPath?: string
  ) => Promise<BubbleDeleteResult>;
}

export function BubbleCanvas(props: BubbleCanvasProps): JSX.Element {
  const [draggingIds, setDraggingIds] = useState<Record<string, boolean>>({});
  const [deleteTarget, setDeleteTarget] = useState<{
    bubbleId: string;
    repoPath: string;
    artifacts: BubbleDeleteArtifacts;
  } | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<{
    bubbleId: string;
    message: string;
  } | null>(null);
  const deleteTriggerRef = useRef<HTMLButtonElement | null>(null);
  const deleteInFlightRef = useRef(false);
  const confirmInFlightRef = useRef(false);
  const canvasContentRef = useRef<HTMLDivElement | null>(null);
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
      const dimensions = bubbleDimensions(isExpanded);
      maxBottom = Math.max(maxBottom, entry.position.y + dimensions.height + 24);
      maxRight = Math.max(maxRight, entry.position.x + dimensions.width + 24);
    }
    return { minHeight: maxBottom, minWidth: maxRight };
  }, [positioned, expandedSet]);

  const restoreDeleteTriggerFocus = useCallback(() => {
    const trigger = deleteTriggerRef.current;
    if (trigger === null) {
      return;
    }
    setTimeout(() => {
      if (trigger.isConnected && !trigger.disabled) {
        trigger.focus();
      }
    }, 0);
  }, []);

  const requestDelete = useCallback(
    async (bubbleId: string, repoPath: string, trigger: HTMLButtonElement) => {
      if (deleteInFlightRef.current || deleteTarget !== null) {
        return;
      }
      deleteInFlightRef.current = true;
      deleteTriggerRef.current = trigger;
      setDeleteError(null);
      setDeleteSubmitting(true);
      try {
        const result = await props.onDelete(bubbleId, undefined, repoPath);
        if (result.requiresConfirmation) {
          setDeleteTarget({
            bubbleId,
            repoPath,
            artifacts: result.artifacts
          });
          return;
        }
        if (!result.deleted) {
          setDeleteError("Delete did not complete. Please retry.");
          return;
        }
        setDeleteTarget(null);
      } catch (error) {
        setDeleteError(asMessage(error));
      } finally {
        deleteInFlightRef.current = false;
        setDeleteSubmitting(false);
      }
    },
    [deleteTarget, props.onDelete]
  );

  const confirmDelete = useCallback(async () => {
    const target = deleteTarget;
    if (target === null || confirmInFlightRef.current) {
      return;
    }
    confirmInFlightRef.current = true;
    setDeleteError(null);
    setDeleteSubmitting(true);
    try {
      const result = await props.onDelete(target.bubbleId, true, target.repoPath);
      if (!result.deleted && result.requiresConfirmation) {
        setDeleteTarget({
          bubbleId: target.bubbleId,
          repoPath: target.repoPath,
          artifacts: result.artifacts
        });
        setDeleteError(
          "Force delete still requires confirmation. Please retry or refresh."
        );
        setDeleteSubmitting(false);
        return;
      }
      if (!result.deleted) {
        setDeleteError("Delete did not complete. Please retry.");
        setDeleteSubmitting(false);
        return;
      }
      setDeleteTarget(null);
      setDeleteSubmitting(false);
      restoreDeleteTriggerFocus();
    } catch (error) {
      setDeleteError(asMessage(error));
      setDeleteSubmitting(false);
    } finally {
      confirmInFlightRef.current = false;
    }
  }, [deleteTarget, props.onDelete, restoreDeleteTriggerFocus]);

  useEffect(() => {
    if (deleteTarget === null) {
      return;
    }
    const bubbleStillExists = props.bubbles.some(
      (bubble) => bubble.bubbleId === deleteTarget.bubbleId
    );
    if (bubbleStillExists) {
      return;
    }
    setDeleteTarget(null);
    setDeleteError(null);
  }, [deleteTarget, props.bubbles]);

  useEffect(() => {
    if (copyError === null) {
      return;
    }
    const bubbleStillExists = props.bubbles.some(
      (bubble) => bubble.bubbleId === copyError.bubbleId
    );
    if (bubbleStillExists) {
      return;
    }
    setCopyError(null);
  }, [copyError, props.bubbles]);

  useEffect(() => {
    const content = canvasContentRef.current;
    if (content === null) {
      return;
    }
    content.inert = deleteTarget !== null;
    return () => {
      content.inert = false;
    };
  }, [deleteTarget]);

  return (
    <main className="relative flex-1 overflow-auto px-4 pb-6 pt-4" style={canvasDimensions}>
      <div ref={canvasContentRef} data-testid="canvas-content">
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
              onCopyError={(message) => {
                setCopyError({
                  bubbleId: entry.bubble.bubbleId,
                  message
                });
              }}
              onCopySuccess={(bubbleId) => {
                setCopyError((current) => {
                  if (current === null || current.bubbleId !== bubbleId) {
                    return current;
                  }
                  return null;
                });
              }}
              onOpen={() => {
                props.onToggleExpand(entry.bubble.bubbleId);
              }}
              onDelete={(trigger) => {
                void requestDelete(
                  entry.bubble.bubbleId,
                  entry.bubble.repoPath,
                  trigger
                );
              }}
              deleteDisabled={deleteSubmitting || deleteTarget !== null}
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
        {deleteTarget === null && deleteError !== null ? (
          <div
            role="alert"
            className="absolute left-4 top-4 flex items-center gap-3 rounded border border-rose-500/60 bg-rose-950/40 px-3 py-2 text-xs text-rose-200"
          >
            <span>{deleteError}</span>
            <button
              type="button"
              className="rounded border border-rose-400/60 px-2 py-0.5 font-semibold text-rose-100 hover:border-rose-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
              onClick={() => {
                setDeleteError(null);
              }}
            >
              Dismiss
            </button>
          </div>
        ) : null}
        {copyError !== null ? (
          <div
            role="alert"
            className="absolute left-4 top-16 flex items-center gap-3 rounded border border-amber-500/60 bg-amber-950/40 px-3 py-2 text-xs text-amber-100"
          >
            <span>{copyError.message}</span>
            <button
              type="button"
              className="rounded border border-amber-300/70 px-2 py-0.5 font-semibold text-amber-50 hover:border-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
              onClick={() => {
                setCopyError(null);
              }}
            >
              Dismiss copy error
            </button>
          </div>
        ) : null}
      </div>
      <DeleteConfirmDialog
        open={deleteTarget !== null}
        bubbleId={deleteTarget?.bubbleId ?? null}
        artifacts={deleteTarget?.artifacts ?? null}
        isSubmitting={deleteSubmitting}
        error={deleteError}
        onCancel={() => {
          setDeleteTarget(null);
          setDeleteError(null);
          restoreDeleteTriggerFocus();
        }}
        onConfirm={() => {
          void confirmDelete();
        }}
      />
    </main>
  );
}
