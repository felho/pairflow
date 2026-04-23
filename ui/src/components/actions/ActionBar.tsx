import { useEffect, useMemo, useState } from "react";
import {
  FolderOpen,
  OctagonX,
  RefreshCcw,
  SquareTerminal
} from "lucide-react";

import { getAvailableActionsForState } from "../../lib/actionAvailability";
import type { AttachAvailability } from "../../lib/attachAvailability";
import type {
  BubbleActionKind,
  BubbleReviewAutoReworkSeverity,
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
  return actionLabels[action];
}

function buttonTone(action: BubbleActionKind): string {
  switch (action) {
    case "stop":
      return "border-rose-400/45 bg-rose-500/[0.05] text-rose-300";
    case "approve":
      return "border-emerald-400/45 bg-emerald-500/[0.05] text-emerald-300";
    case "commit":
    case "merge":
      return "border-emerald-400/45 bg-emerald-500/[0.05] text-emerald-300";
    case "request-rework":
      return "border-amber-400/45 bg-amber-500/[0.05] text-amber-300";
    case "reply":
      return "border-amber-400/45 bg-amber-500/[0.05] text-amber-300";
    case "restart":
      return "border-sky-400/45 bg-sky-500/[0.05] text-sky-300";
    case "attach":
    case "open":
      return "border-[#4a4a4a] bg-[#202020] text-[#d0d0d0] hover:border-[#666] hover:text-white";
    default:
      return "border-[#333] bg-[#1a1a1a] text-[#aaa] hover:border-[#555] hover:text-white";
  }
}

function isIconOnlyAction(action: BubbleActionKind): boolean {
  return (
    action === "restart"
    || action === "open"
    || action === "stop"
    || action === "attach"
  );
}

function renderActionContent(action: BubbleActionKind, label: string): JSX.Element | string {
  switch (action) {
    case "restart":
      return (
        <RefreshCcw aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={1.8} />
      );
    case "open":
      return (
        <FolderOpen aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={1.8} />
      );
    case "attach":
      return (
        <SquareTerminal aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={1.8} />
      );
    case "stop":
      return (
        <OctagonX aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={1.8} />
      );
    default:
      return label;
  }
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

function resolveRequestedLoopMode(
  bubble: BubbleCardModel
): "full" | "meta_only" {
  return bubble.reviewPolicy?.requested_loop_mode ?? "full";
}

function resolveRequestedSeverity(
  bubble: BubbleCardModel
): BubbleReviewAutoReworkSeverity {
  return bubble.reviewPolicy?.meta_review_auto_rework_min_severity ?? "P1";
}

const trailingIconActionOrder: BubbleActionKind[] = ["stop", "restart", "attach", "open"];

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

  const reviewPolicyAvailable = availableActions.includes("update-review-policy");
  const reviewPolicyWritable =
    props.bubble.reviewPolicy !== null
    && hasExpectedBubbleTomlValue(props.expectedBubbleToml);
  const requestedLoopMode = resolveRequestedLoopMode(props.bubble);
  const requestedSeverity = resolveRequestedSeverity(props.bubble);
  const regularActions = availableActions.filter(
    (action) =>
      action !== "update-review-policy"
      && !trailingIconActionOrder.includes(action)
  );
  const trailingIconActions = trailingIconActionOrder.filter((action) => {
    if (action === "attach") {
      return props.attach.visible;
    }
    return availableActions.includes(action);
  });

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

  const invokeReviewPolicyUpdate = async (input: {
    reviewLoopMode: "full" | "meta_only";
    metaReviewAutoReworkMinSeverity: BubbleReviewAutoReworkSeverity;
  }): Promise<void> => {
    props.onClearFeedback();
    try {
      if (props.bubble.reviewPolicy === null) {
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
        action: "update-review-policy",
        reviewLoopMode: input.reviewLoopMode,
        metaReviewAutoReworkMinSeverity: input.metaReviewAutoReworkMinSeverity,
        expectedBubbleToml
      });
    } catch {
      return;
    }
  };

  const invokeReviewPolicyMode = async (
    reviewLoopMode: "full" | "meta_only"
  ): Promise<void> => {
    await invokeReviewPolicyUpdate({
      reviewLoopMode,
      metaReviewAutoReworkMinSeverity: requestedSeverity
    });
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
      <div className="flex flex-wrap items-center gap-1.5">
        {regularActions.map((action) => {
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
              disabled={props.isSubmitting}
            >
              {renderActionContent(action, label)}
            </button>
          );
        })}

        {trailingIconActions.map((action) => {
          const label = resolveActionLabel(props.bubble, action);
          if (label === undefined) {
            return null;
          }

          const isAttachAction = action === "attach";

          return (
            <button
              key={action}
              type="button"
              className={`flex h-6 w-6 items-center justify-center rounded-lg border p-0 text-[10px] transition hover:brightness-125 disabled:cursor-not-allowed disabled:opacity-60 ${buttonTone(action)}`}
              onClick={() => {
                if (isAttachAction) {
                  props.onClearFeedback();
                  void props
                    .onAction({
                      bubbleId: props.bubble.bubbleId,
                      action: "attach"
                    })
                    .catch(() => {
                      // Error is displayed by the generic actionError handler.
                    });
                  return;
                }
                void invokeAction(action);
              }}
              aria-label={label}
              title={label}
              disabled={props.isSubmitting || (isAttachAction && !props.attach.enabled)}
            >
              {renderActionContent(action, label)}
            </button>
          );
        })}

        {reviewPolicyAvailable ? (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              role="switch"
              aria-checked={requestedLoopMode === "meta_only"}
              aria-label="Meta review only"
              title={
                reviewPolicyWritable
                  ? "Meta review only"
                  : "Review policy update is unavailable until the latest bubble detail revision loads."
              }
              className={`flex h-[18px] w-7 items-center self-center rounded-full border p-0.5 transition ${
                requestedLoopMode === "meta_only"
                  ? "border-cyan-500/70 bg-cyan-500/[0.14]"
                  : "border-[#333] bg-[#1a1a1a] hover:border-[#555]"
              } disabled:cursor-not-allowed disabled:opacity-60`}
              disabled={props.isSubmitting || !reviewPolicyWritable}
              onClick={() => {
                void invokeReviewPolicyMode(
                  requestedLoopMode === "meta_only" ? "full" : "meta_only"
                );
              }}
            >
              <span
                aria-hidden="true"
                className={`h-2.5 w-2.5 rounded-full transition-transform ${
                  requestedLoopMode === "meta_only"
                    ? "translate-x-[10px] bg-cyan-300"
                    : "translate-x-0 bg-[#8a8a8a]"
                }`}
              />
            </button>
            <label className="sr-only" htmlFor={`review-severity-${props.bubble.bubbleId}`}>
              Meta auto-rework severity
            </label>
            <select
              id={`review-severity-${props.bubble.bubbleId}`}
              aria-label="Meta auto-rework severity"
              title={
                reviewPolicyWritable
                  ? "Meta auto-rework severity"
                  : "Review policy update is unavailable until the latest bubble detail revision loads."
              }
              className="h-4 rounded-md border border-[#333] bg-[#1a1a1a] px-1 text-[9px] font-mono text-[#d7dde5] transition hover:border-[#555] disabled:cursor-not-allowed disabled:opacity-60"
              value={requestedSeverity}
              disabled={props.isSubmitting || !reviewPolicyWritable}
              onChange={(event) => {
                void invokeReviewPolicyUpdate({
                  reviewLoopMode: requestedLoopMode,
                  metaReviewAutoReworkMinSeverity:
                    event.currentTarget.value as BubbleReviewAutoReworkSeverity
                });
              }}
            >
              <option value="P1">P1</option>
              <option value="P2">P2</option>
              <option value="P3">P3</option>
            </select>
          </div>
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
