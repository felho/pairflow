import { useEffect, useMemo, useState } from "react";

import { getAvailableActionsForState } from "../../lib/actionAvailability";
import type { AttachAvailability } from "../../lib/attachAvailability";
import type {
  BubbleActionKind,
  BubbleCardModel,
  CommitActionInput,
  MergeActionInput
} from "../../lib/types";
import type { RunBubbleActionInput } from "../../state/useBubbleStore";
import { CommitForm } from "./CommitForm";
import { MergePanel } from "./MergePanel";
import { MessageModal } from "./MessageModal";

const actionLabels: Record<BubbleActionKind, string> = {
  start: "Start",
  approve: "Approve",
  "request-rework": "Request Rework",
  reply: "Reply",
  resume: "Resume",
  commit: "Commit",
  merge: "Merge",
  open: "Open",
  stop: "Stop"
};

type ModalAction = "request-rework" | "reply";

function buttonTone(action: BubbleActionKind): string {
  switch (action) {
    case "stop":
      return "border-rose-500/70 bg-rose-500/15 text-rose-100";
    case "commit":
    case "merge":
      return "border-emerald-400/70 bg-emerald-400/15 text-emerald-100";
    default:
      return "border-cyan-300/70 bg-cyan-300/15 text-cyan-100";
  }
}

export interface ActionBarProps {
  bubble: BubbleCardModel;
  attach: AttachAvailability;
  isSubmitting: boolean;
  actionError: string | null;
  retryHint: string | null;
  actionFailure: BubbleActionKind | null;
  onAction(input: RunBubbleActionInput): Promise<void>;
  onAttach(command: string): Promise<void>;
  onClearFeedback(): void;
}

export function ActionBar(props: ActionBarProps): JSX.Element {
  const [modalAction, setModalAction] = useState<ModalAction | null>(null);
  const [showCommitForm, setShowCommitForm] = useState(false);
  const [showMergePanel, setShowMergePanel] = useState(false);
  const [attachFeedback, setAttachFeedback] = useState<string | null>(null);

  const availableActions = useMemo(
    () => getAvailableActionsForState(props.bubble.state),
    [props.bubble.state]
  );

  useEffect(() => {
    setShowCommitForm(false);
    setShowMergePanel(false);
    setModalAction(null);
  }, [props.bubble.state, props.bubble.bubbleId]);

  const invokeAction = async (action: BubbleActionKind): Promise<void> => {
    props.onClearFeedback();
    try {
      await props.onAction({
        bubbleId: props.bubble.bubbleId,
        action
      });
    } catch {
      return;
    }
  };

  const submitMessageModal = async (message: string): Promise<void> => {
    if (modalAction === null) {
      return;
    }
    props.onClearFeedback();
    try {
      await props.onAction({
        bubbleId: props.bubble.bubbleId,
        action: modalAction,
        message
      });
      setModalAction(null);
    } catch {
      return;
    }
  };

  const submitCommit = async (commitInput: CommitActionInput): Promise<void> => {
    props.onClearFeedback();
    try {
      await props.onAction({
        bubbleId: props.bubble.bubbleId,
        action: "commit",
        auto: commitInput.auto,
        ...(commitInput.message !== undefined ? { message: commitInput.message } : {}),
        ...(commitInput.refs !== undefined ? { refs: commitInput.refs } : {})
      });
      setShowCommitForm(false);
    } catch {
      return;
    }
  };

  const submitMerge = async (mergeInput: MergeActionInput): Promise<void> => {
    props.onClearFeedback();
    try {
      await props.onAction({
        bubbleId: props.bubble.bubbleId,
        action: "merge",
        ...(mergeInput.push !== undefined ? { push: mergeInput.push } : {}),
        ...(mergeInput.deleteRemote !== undefined
          ? { deleteRemote: mergeInput.deleteRemote }
          : {})
      });
      setShowMergePanel(false);
    } catch {
      return;
    }
  };

  return (
    <section className="rounded-xl border border-slate-700 bg-slate-900/65 p-3">
      <h3 className="font-display text-sm font-semibold text-slate-100">Actions</h3>
      <div className="mt-2 flex flex-wrap gap-2">
        {availableActions.map((action) => {
          const openCommit = action === "commit";
          const openMerge = action === "merge";
          const needsModal = action === "request-rework" || action === "reply";

          return (
            <button
              key={action}
              type="button"
              className={`rounded-md border px-2.5 py-1.5 text-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 ${buttonTone(action)}`}
              onClick={() => {
                if (openCommit) {
                  setShowCommitForm((value) => !value);
                  setShowMergePanel(false);
                  return;
                }
                if (openMerge) {
                  setShowMergePanel((value) => !value);
                  setShowCommitForm(false);
                  return;
                }
                if (needsModal) {
                  setModalAction(action);
                  return;
                }
                void invokeAction(action);
              }}
              disabled={props.isSubmitting}
            >
              {actionLabels[action]}
            </button>
          );
        })}

        {props.attach.visible ? (
          <button
            type="button"
            className="rounded-md border border-amber-300/70 bg-amber-300/15 px-2.5 py-1.5 text-sm text-amber-100 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!props.attach.enabled || props.isSubmitting}
            onClick={() => {
              setAttachFeedback(null);
              void props
                .onAttach(props.attach.command)
                .then(() => {
                  setAttachFeedback("Attach command copied to clipboard.");
                })
                .catch((error: unknown) => {
                  setAttachFeedback(
                    error instanceof Error ? error.message : String(error)
                  );
                });
            }}
          >
            Attach
          </button>
        ) : null}
      </div>

      {showCommitForm ? (
        <div className="mt-3">
          <CommitForm
            isSubmitting={props.isSubmitting}
            actionError={props.actionFailure === "commit" ? props.actionError : null}
            onCancel={() => {
              setShowCommitForm(false);
            }}
            onSubmit={submitCommit}
          />
        </div>
      ) : null}

      {showMergePanel ? (
        <div className="mt-3">
          <MergePanel
            isSubmitting={props.isSubmitting}
            actionError={props.actionFailure === "merge" ? props.actionError : null}
            onCancel={() => {
              setShowMergePanel(false);
            }}
            onSubmit={submitMerge}
          />
        </div>
      ) : null}

      {modalAction !== null ? (
        <MessageModal
          open
          title={modalAction === "reply" ? "Reply to Bubble" : "Request Rework"}
          description={
            modalAction === "reply"
              ? "Reply message is required before submitting."
              : "Rework message is required before submitting."
          }
          submitLabel={modalAction === "reply" ? "Send Reply" : "Send Rework"}
          isSubmitting={props.isSubmitting}
          actionError={
            props.actionFailure === modalAction ? props.actionError : null
          }
          onCancel={() => {
            setModalAction(null);
          }}
          onSubmit={submitMessageModal}
        />
      ) : null}

      {props.attach.visible && props.attach.enabled === false && props.attach.hint !== null ? (
        <p className="mt-2 text-xs text-amber-300">{props.attach.hint}</p>
      ) : null}

      {attachFeedback !== null ? (
        <p className="mt-2 text-xs text-cyan-200">{attachFeedback}</p>
      ) : null}

      {props.retryHint !== null ? (
        <div className="mt-2 rounded border border-amber-500/60 bg-amber-950/35 px-2 py-1 text-xs text-amber-200">
          {props.retryHint}
        </div>
      ) : null}

      {props.actionError !== null &&
      props.actionFailure !== "commit" &&
      props.actionFailure !== "merge" &&
      props.actionFailure !== "open" &&
      props.actionFailure !== modalAction ? (
        <div className="mt-2 rounded border border-rose-500/60 bg-rose-950/35 px-2 py-1 text-xs text-rose-200">
          {props.actionError}
        </div>
      ) : null}
    </section>
  );
}
