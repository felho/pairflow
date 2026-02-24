import { useEffect, useState } from "react";

export interface MessageModalProps {
  open: boolean;
  title: string;
  description: string;
  submitLabel: string;
  isSubmitting: boolean;
  actionError: string | null;
  onCancel(): void;
  onSubmit(message: string): Promise<void>;
}

export function MessageModal(props: MessageModalProps): JSX.Element | null {
  const [message, setMessage] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!props.open) {
      return;
    }
    setMessage("");
    setValidationError(null);
  }, [props.open]);

  if (!props.open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4">
      <div className="w-full max-w-lg rounded-xl border border-slate-700 bg-slate-900 p-4 shadow-2xl">
        <h3 className="font-display text-lg font-semibold text-slate-50">{props.title}</h3>
        <p className="mt-1 text-sm text-slate-300">{props.description}</p>
        <label className="mt-3 block text-xs uppercase tracking-wide text-slate-400" htmlFor="message-modal-input">
          Message
        </label>
        <textarea
          id="message-modal-input"
          className="mt-1 h-28 w-full rounded-md border border-slate-600 bg-slate-950/80 p-2 font-mono text-sm text-slate-100 outline-none ring-cyan-400/60 placeholder:text-slate-500 focus:ring"
          value={message}
          onChange={(event) => {
            setMessage(event.target.value);
            if (validationError !== null) {
              setValidationError(null);
            }
          }}
          disabled={props.isSubmitting}
          placeholder="Type your message"
        />
        {validationError !== null ? (
          <div className="mt-2 text-sm text-rose-300">{validationError}</div>
        ) : null}
        {props.actionError !== null ? (
          <div className="mt-2 text-sm text-rose-300">{props.actionError}</div>
        ) : null}
        <div className="mt-4 flex justify-end gap-2">
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
              const trimmed = message.trim();
              if (trimmed.length === 0) {
                setValidationError("Message is required.");
                return;
              }
              void props.onSubmit(trimmed);
            }}
            disabled={props.isSubmitting}
          >
            {props.isSubmitting ? "Submitting..." : props.submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
