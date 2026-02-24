import { useState } from "react";

import type { MergeActionInput } from "../../lib/types";

export interface MergePanelProps {
  isSubmitting: boolean;
  actionError: string | null;
  onCancel(): void;
  onSubmit(input: MergeActionInput): Promise<void>;
}

export function MergePanel(props: MergePanelProps): JSX.Element {
  const [push, setPush] = useState(false);
  const [deleteRemote, setDeleteRemote] = useState(false);

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-950/70 p-3">
      <h4 className="font-display text-sm font-semibold text-slate-100">Merge Bubble</h4>
      <p className="mt-1 text-xs text-slate-300">Merge includes runtime/worktree cleanup.</p>

      <label className="mt-3 flex items-center gap-2 text-sm text-slate-200">
        <input
          type="checkbox"
          checked={push}
          onChange={(event) => {
            setPush(event.target.checked);
          }}
          disabled={props.isSubmitting}
        />
        Push merged base branch
      </label>

      <label className="mt-2 flex items-center gap-2 text-sm text-slate-200">
        <input
          type="checkbox"
          checked={deleteRemote}
          onChange={(event) => {
            setDeleteRemote(event.target.checked);
          }}
          disabled={props.isSubmitting}
        />
        Delete remote bubble branch
      </label>

      {props.actionError !== null ? <div className="mt-2 text-sm text-rose-300">{props.actionError}</div> : null}

      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
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
          className="rounded-md border border-cyan-300/60 bg-cyan-300/15 px-3 py-1.5 text-sm text-cyan-100 hover:bg-cyan-300/25 disabled:cursor-not-allowed disabled:opacity-60"
          onClick={() => {
            void props.onSubmit({
              push,
              deleteRemote
            });
          }}
          disabled={props.isSubmitting}
        >
          {props.isSubmitting ? "Merging..." : "Submit Merge"}
        </button>
      </div>
    </div>
  );
}
