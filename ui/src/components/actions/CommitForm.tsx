import { useMemo, useState } from "react";

import type { CommitActionInput } from "../../lib/types";

function parseRefs(raw: string): string[] {
  return raw
    .split(/[\n,]/u)
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

export interface CommitFormProps {
  isSubmitting: boolean;
  actionError: string | null;
  onCancel(): void;
  onSubmit(input: CommitActionInput): Promise<void>;
}

export function CommitForm(props: CommitFormProps): JSX.Element {
  const [auto, setAuto] = useState(true);
  const [message, setMessage] = useState("");
  const [refsText, setRefsText] = useState("");

  const parsedRefs = useMemo(() => parseRefs(refsText), [refsText]);

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-950/70 p-3">
      <h4 className="font-display text-sm font-semibold text-slate-100">Commit Bubble</h4>
      <label className="mt-2 flex items-center gap-2 text-sm text-slate-200">
        <input
          type="checkbox"
          checked={auto}
          onChange={(event) => {
            setAuto(event.target.checked);
          }}
          disabled={props.isSubmitting}
        />
        Auto stage (`auto=true`)
      </label>

      <label className="mt-3 block text-xs uppercase tracking-wide text-slate-400" htmlFor="commit-message">
        Message (optional)
      </label>
      <textarea
        id="commit-message"
        className="mt-1 h-20 w-full rounded-md border border-slate-600 bg-slate-950/80 p-2 font-mono text-sm text-slate-100 outline-none ring-cyan-400/60 placeholder:text-slate-500 focus:ring"
        value={message}
        onChange={(event) => {
          setMessage(event.target.value);
        }}
        disabled={props.isSubmitting}
        placeholder="bubble(<id>): summary"
      />

      <label className="mt-3 block text-xs uppercase tracking-wide text-slate-400" htmlFor="commit-refs">
        Refs (optional, comma/newline separated)
      </label>
      <textarea
        id="commit-refs"
        className="mt-1 h-16 w-full rounded-md border border-slate-600 bg-slate-950/80 p-2 font-mono text-sm text-slate-100 outline-none ring-cyan-400/60 placeholder:text-slate-500 focus:ring"
        value={refsText}
        onChange={(event) => {
          setRefsText(event.target.value);
        }}
        disabled={props.isSubmitting}
        placeholder="artifacts/done-package.md"
      />
      <p className="mt-1 text-xs text-slate-400">Refs count: {parsedRefs.length}</p>

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
            const trimmedMessage = message.trim();
            const payload: CommitActionInput = {
              auto,
              ...(trimmedMessage.length > 0 ? { message: trimmedMessage } : {}),
              ...(parsedRefs.length > 0 ? { refs: parsedRefs } : {})
            };
            void props.onSubmit(payload);
          }}
          disabled={props.isSubmitting}
        >
          {props.isSubmitting ? "Committing..." : "Submit Commit"}
        </button>
      </div>
    </div>
  );
}
