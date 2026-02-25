import { useEffect, useRef } from "react";

import type { BubbleDeleteArtifacts } from "../../lib/types";

function ArtifactRow(props: {
  exists: boolean;
  label: string;
  detail: string | null;
}): JSX.Element {
  return (
    <div className={props.exists ? "text-rose-300" : "text-slate-600"}>
      <span>{props.exists ? "\u2022 " : "\u2713 "}{props.label}{props.exists ? "" : " (clean)"}</span>
      {props.detail !== null ? (
        <span className="ml-1 text-slate-500">({props.detail})</span>
      ) : null}
    </div>
  );
}

export interface DeleteConfirmDialogProps {
  open: boolean;
  bubbleId: string | null;
  artifacts: BubbleDeleteArtifacts | null;
  isSubmitting: boolean;
  error: string | null;
  onCancel(): void;
  onConfirm(): void;
}

export function DeleteConfirmDialog(
  props: DeleteConfirmDialogProps
): JSX.Element | null {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!props.open) {
      return;
    }
    const fallbackTarget =
      dialogRef.current?.querySelector<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      ) ?? null;
    const initialTarget =
      cancelButtonRef.current !== null && !cancelButtonRef.current.disabled
        ? cancelButtonRef.current
        : fallbackTarget;
    (initialTarget ?? dialogRef.current)?.focus();
  }, [props.open, props.bubbleId]);

  if (!props.open || props.bubbleId === null || props.artifacts === null) {
    return null;
  }

  const headingId = `delete-bubble-heading-${props.bubbleId}`;
  const descriptionId = `delete-bubble-description-${props.bubbleId}`;

  const getFocusableElements = (): HTMLElement[] => {
    const dialog = dialogRef.current;
    if (dialog === null) {
      return [];
    }
    const candidates = Array.from(
      dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    );
    return candidates.filter(
      (element) => element.tabIndex >= 0 && !element.hasAttribute("disabled")
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        ref={dialogRef}
        onKeyDown={(event) => {
          if (event.key === "Escape" && !props.isSubmitting) {
            event.preventDefault();
            props.onCancel();
            return;
          }
          if (event.key !== "Tab") {
            return;
          }

          const focusable = getFocusableElements();
          if (focusable.length === 0) {
            event.preventDefault();
            dialogRef.current?.focus();
            return;
          }

          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (first === undefined || last === undefined) {
            return;
          }

          const activeElement =
            document.activeElement instanceof HTMLElement ? document.activeElement : null;
          if (event.shiftKey) {
            if (activeElement === first || activeElement === dialogRef.current) {
              event.preventDefault();
              last.focus();
            }
            return;
          }

          if (activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }}
        className="w-full max-w-lg rounded-xl border border-rose-500/40 bg-slate-900 p-4 shadow-2xl"
      >
        <h3 id={headingId} className="font-display text-lg font-semibold text-slate-50">
          Delete Bubble {props.bubbleId}?
        </h3>
        <p id={descriptionId} className="mt-1 text-sm text-slate-300">
          Review remaining artifacts. Force delete will remove all highlighted items.
        </p>

        <div className="mt-3 rounded-md border border-slate-700 bg-slate-950/70 p-3 font-mono text-xs leading-relaxed">
          <ArtifactRow
            exists={props.artifacts.worktree.exists}
            label="worktree"
            detail={props.artifacts.worktree.path}
          />
          <ArtifactRow
            exists={props.artifacts.tmux.exists}
            label="tmux session"
            detail={props.artifacts.tmux.sessionName}
          />
          <ArtifactRow
            exists={props.artifacts.branch.exists}
            label="branch"
            detail={props.artifacts.branch.name}
          />
          <ArtifactRow
            exists={props.artifacts.runtimeSession.exists}
            label="runtime session"
            detail={props.artifacts.runtimeSession.sessionName}
          />
        </div>

        {props.error !== null ? (
          <div className="mt-2 text-sm text-rose-300">{props.error}</div>
        ) : null}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            ref={cancelButtonRef}
            className="rounded-md border border-slate-600 px-3 py-1.5 text-sm text-slate-200 hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => {
              props.onCancel();
            }}
            disabled={props.isSubmitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-md border border-rose-500/80 bg-rose-500/20 px-3 py-1.5 text-sm text-rose-100 hover:bg-rose-500/30 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => {
              props.onConfirm();
            }}
            disabled={props.isSubmitting}
          >
            {props.isSubmitting ? "Deleting..." : "Delete with Force"}
          </button>
        </div>
      </div>
    </div>
  );
}
