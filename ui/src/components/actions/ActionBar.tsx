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

const actionLabels: Partial<Record<BubbleActionKind, string>> = {
  start: "Start",
  approve: "Approve",
  "request-rework": "Request Rework",
  reply: "Reply",
  resume: "Resume",
  "update-review-policy": "Review Policy",
  restart: "Restart",
  commit: "Commit",
  merge: "Merge",
  open: "Open",
  attach: "Attach",
  stop: "Stop"
};

type ModalAction = "request-rework" | "reply";

function resolveActionLabel(
  bubble: BubbleCardModel,
  action: BubbleActionKind
): string | undefined {
  if (action === "request-rework" && bubble.state === "WAITING_HUMAN") {
    return "Queue Rework";
  }
  if (action === "update-review-policy") {
    if (bubble.reviewPolicy === null) {
      return "Review Policy Unavailable";
    }
    return bubble.reviewPolicy.requested_loop_mode === "meta_only"
      ? "Full Review"
      : "Meta-Only";
  }
  return actionLabels[action];
}

function buttonTone(action: BubbleActionKind): string {
  switch (action) {
    case "stop":
      return "border-rose-500/70 bg-rose-500/[0.08] text-rose-400";
    case "approve":
      return "border-emerald-500/70 bg-emerald-500/[0.08] text-emerald-500";
    case "commit":
    case "merge":
      return "border-emerald-400/70 bg-emerald-400/[0.08] text-emerald-400";
    case "request-rework":
      return "border-amber-500/70 bg-amber-500/[0.08] text-amber-500";
    case "reply":
      return "border-amber-500/70 bg-amber-500/[0.08] text-amber-500";
    case "restart":
    case "update-review-policy":
      return "border-cyan-500/70 bg-cyan-500/[0.08] text-cyan-400";
    default:
      return "border-[#333] bg-[#1a1a1a] text-[#aaa] hover:border-[#555] hover:text-white";
  }
}

function isIconOnlyAction(action: BubbleActionKind): boolean {
  return action === "restart";
}

function renderActionContent(action: BubbleActionKind, label: string): JSX.Element | string {
  if (action !== "restart") {
    return label;
  }

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 10a6 6 0 1 1-2.1-4.57" />
      <path d="M16 4v3.5h-3.5" />
    </svg>
  );
}

export interface ActionBarProps {
  bubble: BubbleCardModel;
  expectedBubbleToml?: string | null;
  attach: AttachAvailability;
  isSubmitting: boolean;
  actionError: string | null;
  retryHint: string | null;
  actionFailure: BubbleActionKind | null;
  onAction(input: RunBubbleActionInput): Promise<void>;
  onClearFeedback(): void;
}

function hasExpectedBubbleTomlValue(
  expectedBubbleToml: string | null | undefined
): expectedBubbleToml is string {
  return typeof expectedBubbleToml === "string" && expectedBubbleToml.length > 0;
}

export function ActionBar(props: ActionBarProps): JSX.Element {
  const [modalAction, setModalAction] = useState<ModalAction | null>(null);
  const [showCommitForm, setShowCommitForm] = useState(false);
  const [showMergePanel, setShowMergePanel] = useState(false);

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
      if (action === "update-review-policy") {
        const reviewPolicy = props.bubble.reviewPolicy;
        if (reviewPolicy === null) {
          throw new Error("Review policy is unavailable until the latest bubble detail loads.");
        }
        const expectedBubbleToml = props.expectedBubbleToml;
        if (!hasExpectedBubbleTomlValue(expectedBubbleToml)) {
          throw new Error(
            "Review policy update is unavailable until the latest bubble detail revision loads."
          );
        }
        await props.onAction({
          bubbleId: props.bubble.bubbleId,
          action,
          reviewLoopMode:
            reviewPolicy.requested_loop_mode === "meta_only"
              ? "full"
              : "meta_only",
          expectedBubbleToml
        });
        return;
      }
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
    <div>
      <div className="flex flex-wrap gap-1.5">
        {availableActions.map((action) => {
          const openCommit = action === "commit";
          const openMerge = action === "merge";
          const needsModal = action === "request-rework" || action === "reply";
          const label = resolveActionLabel(props.bubble, action);
          if (label === undefined) {
            return null;
          }

          return (
            <button
              key={action}
              type="button"
              className={`rounded-lg border text-[10px] transition hover:brightness-125 disabled:cursor-not-allowed disabled:opacity-60 ${isIconOnlyAction(action) ? "flex h-6 w-6 items-center justify-center p-0" : "px-2.5 py-1"} ${buttonTone(action)}`}
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
              aria-label={label}
              title={label}
              disabled={
                props.isSubmitting
                || (
                  action === "update-review-policy"
                  && (
                    props.bubble.reviewPolicy === null
                    || !hasExpectedBubbleTomlValue(props.expectedBubbleToml)
                  )
                )
              }
            >
              {renderActionContent(action, label)}
            </button>
          );
        })}

        {props.attach.visible ? (
          <button
            type="button"
            className="rounded-lg border border-[#333] bg-[#1a1a1a] px-2.5 py-1 text-[10px] text-[#aaa] transition hover:border-[#555] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!props.attach.enabled || props.isSubmitting}
            onClick={() => {
              props.onClearFeedback();
              void props
                .onAction({
                  bubbleId: props.bubble.bubbleId,
                  action: "attach"
                })
                .catch(() => {
                  // Error is displayed by the generic actionError handler.
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
          title={
            modalAction === "reply"
              ? "Reply to Bubble"
              : props.bubble.state === "WAITING_HUMAN"
              ? "Queue Rework Intent"
              : "Request Rework"
          }
          description={
            modalAction === "reply"
              ? "Reply message is required before submitting. Reply does not guarantee rework."
              : props.bubble.state === "WAITING_HUMAN"
              ? "Rework message is required. This queues deterministic rework for orchestrator consumption; plain reply does not guarantee rework."
              : "Rework message is required before submitting."
          }
          submitLabel={
            modalAction === "reply"
              ? "Send Reply"
              : props.bubble.state === "WAITING_HUMAN"
              ? "Queue Rework"
              : "Send Rework"
          }
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

      {props.attach.visible && props.attach.hint !== null ? (
        <p className="mt-2 text-xs text-amber-300">{props.attach.hint}</p>
      ) : null}


      {props.retryHint !== null ? (
        <div className="mt-2 rounded border border-amber-500/60 bg-amber-950/35 px-2 py-1 text-xs text-amber-200">
          {props.retryHint}
        </div>
      ) : null}

      {/* Delete errors are surfaced from BubbleCanvas (where delete is triggered today).
      Keep delete excluded here to avoid duplicate/conflicting banners. */}
      {props.actionError !== null &&
      props.actionFailure !== "commit" &&
      props.actionFailure !== "merge" &&
      props.actionFailure !== "delete" &&
      props.actionFailure !== modalAction ? (
        <div className="mt-2 rounded border border-rose-500/60 bg-rose-950/35 px-2 py-1 text-xs text-rose-200">
          {props.actionError}
        </div>
      ) : null}
    </div>
  );
}
