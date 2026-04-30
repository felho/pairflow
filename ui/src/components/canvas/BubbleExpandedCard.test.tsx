import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { copyToClipboardMock } = vi.hoisted(() => ({
  copyToClipboardMock: vi.fn<(text: string) => Promise<void>>()
}));

vi.mock("../../lib/clipboard", () => ({
  copyToClipboard: copyToClipboardMock
}));

import { bubbleDimensions } from "../../lib/canvasLayout";
import { bubbleCard, bubbleDetail } from "../../test/fixtures";
import { BubbleExpandedCard } from "./BubbleExpandedCard";

interface RenderExpandedCardOverrides {
  onPositionChange?: (position: { x: number; y: number }) => void;
  onPositionCommit?: () => void;
  onClose?: () => void;
  bubble?: ReturnType<typeof bubbleCard>;
  detail?: ReturnType<typeof bubbleDetail> | null;
  bubbleState?: "READY_FOR_HUMAN_APPROVAL";
}

function renderExpandedCard(overrides: RenderExpandedCardOverrides = {}): void {
  render(
    <BubbleExpandedCard
      bubble={
        overrides.bubble ??
        bubbleCard({
          bubbleId: "b-expanded-1",
          repoPath: "/repo-a",
          ...(overrides.bubbleState !== undefined
            ? { state: overrides.bubbleState }
            : {})
        })
      }
      detail={overrides.detail ?? null}
      timeline={null}
      position={{
        x: 72,
        y: 96
      }}
      detailLoading={false}
      timelineLoading={false}
      detailError={null}
      timelineError={null}
      actionLoading={false}
      actionError={null}
      actionRetryHint={null}
      actionFailure={null}
      onPositionChange={overrides.onPositionChange ?? (() => undefined)}
      onPositionCommit={overrides.onPositionCommit ?? (() => undefined)}
      onClose={overrides.onClose ?? (() => undefined)}
      onRefresh={() => undefined}
      onAction={vi.fn(() => Promise.resolve())}
      onClearActionFeedback={() => undefined}
    />
  );
}

describe("BubbleExpandedCard", () => {
  const bubbleReviewPrompt =
    "b-expanded-1: review the bubble, deep mode, be very verbose";

  beforeEach(() => {
    copyToClipboardMock.mockReset();
    copyToClipboardMock.mockResolvedValue(undefined);
  });

  it("renders with expanded layout dimensions", () => {
    const expandedDimensions = bubbleDimensions(true);

    renderExpandedCard();

    expect(screen.getByRole("article")).toHaveStyle({
      left: "72px",
      top: "96px",
      width: `${expandedDimensions.width}px`,
      height: `${expandedDimensions.height}px`
    });
  });

  it("renders the generic approval package card in ready-for-human-approval", () => {
    renderExpandedCard({
      bubbleState: "READY_FOR_HUMAN_APPROVAL",
      detail: bubbleDetail({
        bubbleId: "b-expanded-1",
        repoPath: "/repo-a",
        state: "READY_FOR_HUMAN_APPROVAL"
      })
    });

    expect(screen.getByText("Approval Package")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Meta-review is complete. Review the approval package, then choose Approve or Request Rework to continue."
      )
    ).toBeInTheDocument();
  });

  it("renders budget-exhausted approval copy when the approval route context matches", () => {
    renderExpandedCard({
      bubbleState: "READY_FOR_HUMAN_APPROVAL",
      detail: bubbleDetail({
        bubbleId: "b-expanded-1",
        repoPath: "/repo-a",
        state: "READY_FOR_HUMAN_APPROVAL",
        inboxItems: [
          {
            envelopeId: "env-approval-1",
            type: "APPROVAL_REQUEST",
            ts: "2026-02-24T12:01:00.000Z",
            round: 3,
            sender: "orchestrator",
            summary: "Approval package ready for human decision.",
            refs: [],
            latestRecommendation: "rework",
            gateRoute: "human_gate_budget_exhausted"
          }
        ]
      })
    });

    expect(
      screen.getByText(
        "Meta-review recommended rework, but the auto-rework budget is exhausted. Human decision is required to approve or request rework."
      )
    ).toBeInTheDocument();
  });

  it("falls back to generic approval package copy for unsupported routes", () => {
    renderExpandedCard({
      bubbleState: "READY_FOR_HUMAN_APPROVAL",
      detail: bubbleDetail({
        bubbleId: "b-expanded-1",
        repoPath: "/repo-a",
        state: "READY_FOR_HUMAN_APPROVAL",
        inboxItems: [
          {
            envelopeId: "env-approval-1",
            type: "APPROVAL_REQUEST",
            ts: "2026-02-24T12:01:00.000Z",
            round: 3,
            sender: "orchestrator",
            summary: "Approval package ready for human decision.",
            refs: [],
            latestRecommendation: "rework",
            gateRoute: "human_gate_approve"
          }
        ]
      })
    });

    expect(
      screen.getByText(
        "Meta-review is complete. Review the approval package, then choose Approve or Request Rework to continue."
      )
    ).toBeInTheDocument();
  });

  it("falls back to generic approval package copy when recommendation mismatches the route", () => {
    renderExpandedCard({
      bubbleState: "READY_FOR_HUMAN_APPROVAL",
      detail: bubbleDetail({
        bubbleId: "b-expanded-1",
        repoPath: "/repo-a",
        state: "READY_FOR_HUMAN_APPROVAL",
        inboxItems: [
          {
            envelopeId: "env-approval-1",
            type: "APPROVAL_REQUEST",
            ts: "2026-02-24T12:01:00.000Z",
            round: 3,
            sender: "orchestrator",
            summary: "Approval package ready for human decision.",
            refs: [],
            latestRecommendation: "approve",
            gateRoute: "human_gate_budget_exhausted"
          }
        ]
      })
    });

    expect(
      screen.getByText(
        "Meta-review is complete. Review the approval package, then choose Approve or Request Rework to continue."
      )
    ).toBeInTheDocument();
  });

  it("falls back to generic approval package copy for budget-exhausted plus inconclusive", () => {
    renderExpandedCard({
      bubbleState: "READY_FOR_HUMAN_APPROVAL",
      detail: bubbleDetail({
        bubbleId: "b-expanded-1",
        repoPath: "/repo-a",
        state: "READY_FOR_HUMAN_APPROVAL",
        inboxItems: [
          {
            envelopeId: "env-approval-1",
            type: "APPROVAL_REQUEST",
            ts: "2026-02-24T12:01:00.000Z",
            round: 3,
            sender: "orchestrator",
            summary: "Approval package ready for human decision.",
            refs: [],
            latestRecommendation: "inconclusive",
            gateRoute: "human_gate_budget_exhausted"
          }
        ]
      })
    });

    expect(
      screen.getByText(
        "Meta-review is complete. Review the approval package, then choose Approve or Request Rework to continue."
      )
    ).toBeInTheDocument();
  });

  it("prefers detail state and round for header rendering", () => {
    renderExpandedCard({
      bubble: bubbleCard({
        bubbleId: "b-expanded-1",
        repoPath: "/repo-a",
        state: "RUNNING",
        round: 2
      }),
      detail: {
        ...bubbleDetail({
          bubbleId: "b-expanded-1",
          repoPath: "/repo-a",
          state: "READY_FOR_HUMAN_APPROVAL"
        }),
        round: 6
      }
    });

    expect(screen.getByText("R6")).toBeInTheDocument();
    expect(screen.queryByText("R2")).not.toBeInTheDocument();
  });

  it("renders meta-review clean-run streak and requirement in the expanded status summary", () => {
    renderExpandedCard({
      bubble: bubbleCard({
        bubbleId: "b-expanded-1",
        repoPath: "/repo-a",
        reviewPolicy: {
          requested_loop_mode: "meta_only",
          effective_loop_mode: "full",
          support_status: "guarded",
          reviewer_blocking_min_severity: "P3",
          meta_review_auto_rework_min_severity: "P3",
          meta_review_consecutive_clean_runs_required: 2
        },
        metaReview: {
          consecutiveCleanRuns: 1
        }
      })
    });

    expect(screen.getByTestId("expanded-review-quality-summary")).toHaveTextContent(
      "Quality P3+2"
    );
    expect(screen.getByTestId("expanded-review-quality-summary")).toHaveTextContent(
      "Clean 1/2"
    );
  });

  it("renders unsupported meta-review quality pairs as raw custom truth", () => {
    renderExpandedCard({
      bubble: bubbleCard({
        bubbleId: "b-expanded-1",
        repoPath: "/repo-a",
        reviewPolicy: {
          requested_loop_mode: "meta_only",
          effective_loop_mode: "full",
          support_status: "guarded",
          reviewer_blocking_min_severity: "P2",
          meta_review_auto_rework_min_severity: "P2",
          meta_review_consecutive_clean_runs_required: 2
        },
        metaReview: {
          consecutiveCleanRuns: 1
        }
      })
    });

    expect(screen.getByTestId("expanded-review-quality-summary")).toHaveTextContent(
      "Custom P2/2 clean"
    );
    expect(screen.getByTestId("expanded-review-quality-summary")).toHaveTextContent(
      "Clean 1/2"
    );
  });

  it("renders retained clean-run streak when closed status omits live review policy", () => {
    renderExpandedCard({
      bubble: {
        ...bubbleCard({
          bubbleId: "b-expanded-1",
          repoPath: "/repo-a",
          state: "READY_FOR_HUMAN_APPROVAL",
          metaReview: {
            consecutiveCleanRuns: 2
          }
        }),
        reviewPolicy: null
      }
    });

    expect(screen.getByTestId("expanded-review-quality-summary")).toHaveTextContent(
      "Quality unavailable"
    );
    expect(screen.getByTestId("expanded-review-quality-summary")).toHaveTextContent(
      "Clean 2/-"
    );
  });

  it("prefers detail state when deciding whether to show the pending human question", () => {
    renderExpandedCard({
      bubble: bubbleCard({
        bubbleId: "b-expanded-1",
        repoPath: "/repo-a",
        state: "RUNNING"
      }),
      detail: bubbleDetail({
        bubbleId: "b-expanded-1",
        repoPath: "/repo-a",
        state: "WAITING_HUMAN"
      })
    });

    expect(screen.getByText(/Question from human/u)).toBeInTheDocument();
    expect(screen.getByText("Need confirmation")).toBeInTheDocument();
  });

  it("adds meta-review running border while bubble remains in running state", () => {
    renderExpandedCard({
      bubble: bubbleCard({
        bubbleId: "b-expanded-1",
        repoPath: "/repo-a",
        state: "RUNNING",
        activeRole: "meta_reviewer"
      })
    });

    expect(screen.getByRole("article")).toHaveClass("border-fuchsia-500");
  });

  it("renders attention message and border when an issue is present", () => {
    renderExpandedCard({
      bubble: bubbleCard({
        bubbleId: "b-expanded-1",
        repoPath: "/repo-a",
        attention: {
          code: "runtime_missing",
          severity: "critical",
          label: "No session",
          detail: "Runtime session is expected for the current lifecycle state, but none is registered."
        }
      })
    });

    expect(screen.getByRole("article")).toHaveClass("border-rose-500");
    expect(
      screen.getByText(
        "Runtime session is expected for the current lifecycle state, but none is registered."
      )
    ).toBeInTheDocument();
  });

  it("prefers fresh detail runtime health over stale summary for attach hint", () => {
    renderExpandedCard({
      bubble: bubbleCard({
        bubbleId: "b-expanded-1",
        repoPath: "/repo-a",
        runtimeSession: null,
        stale: true
      }),
      detail: bubbleDetail({
        bubbleId: "b-expanded-1",
        repoPath: "/repo-a",
        stale: false
      })
    });

    expect(screen.queryByText(/Runtime session unavailable/u)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Attach" })).toBeInTheDocument();
  });

  it("shows enabled attach for active remote bubbles from summary data", () => {
    renderExpandedCard({
      bubble: bubbleCard({
        bubbleId: "b-expanded-remote-summary",
        repoPath: "/repo-a",
        state: "READY_FOR_HUMAN_APPROVAL",
        runtimeSession: null,
        stale: true,
        remoteExecution: {
          alias: "lab",
          host: "ssh.example.com",
          pointerKind: "started",
          viewKind: "status",
          statusSource: "live",
          cacheStatus: "present",
          runtimeAvailability: "active"
        }
      })
    });

    expect(screen.getByRole("button", { name: "Attach" })).toBeEnabled();
    expect(
      screen.getByLabelText("Remote bubble on lab (ssh.example.com)")
    ).toBeInTheDocument();
    expect(screen.queryByText(/restart runtime automatically/u)).not.toBeInTheDocument();
  });

  it("shows remote indicator from expanded detail data", () => {
    renderExpandedCard({
      bubble: bubbleCard({
        bubbleId: "b-expanded-remote-detail-indicator",
        repoPath: "/repo-a",
        state: "READY_FOR_HUMAN_APPROVAL"
      }),
      detail: bubbleDetail({
        bubbleId: "b-expanded-remote-detail-indicator",
        repoPath: "/repo-a",
        state: "READY_FOR_HUMAN_APPROVAL",
        remoteExecution: {
          alias: "edge",
          host: "remote.example.com",
          pointerKind: "started",
          viewKind: "status",
          statusSource: "live",
          cacheStatus: "present",
          runtimeAvailability: "active"
        }
      })
    });

    expect(
      screen.getByLabelText("Remote bubble on edge (remote.example.com)")
    ).toBeInTheDocument();
  });

  it("keeps attach enabled for watchdog-expired remote detail when runtime proof stays active", () => {
    renderExpandedCard({
      bubble: bubbleCard({
        bubbleId: "b-expanded-remote-watchdog",
        repoPath: "/repo-a",
        state: "WAITING_HUMAN",
        runtimeSession: null,
        stale: false,
        attention: {
          code: "watchdog_expired",
          severity: "critical",
          label: "Watchdog expired",
          detail: "The watchdog deadline passed without observed protocol activity."
        }
      }),
      detail: bubbleDetail({
        bubbleId: "b-expanded-remote-watchdog",
        repoPath: "/repo-a",
        state: "WAITING_HUMAN",
        runtimeSession: null,
        stale: false,
        attention: {
          code: "watchdog_expired",
          severity: "critical",
          label: "Watchdog expired",
          detail: "The watchdog deadline passed without observed protocol activity."
        },
        watchdog: {
          expired: true,
          remainingSeconds: 0
        },
        remoteExecution: {
          alias: "lab",
          host: "ssh.example.com",
          pointerKind: "started",
          viewKind: "status",
          statusSource: "live",
          cacheStatus: "present",
          runtimeAvailability: "active",
          lastLiveCheckAt: "2026-04-16T10:00:00.000Z",
          lastCacheCheckAt: "2026-04-16T10:00:00.000Z"
        }
      })
    });

    expect(screen.getByRole("button", { name: "Attach" })).toBeEnabled();
    expect(screen.getByText(/watchdog deadline passed/u)).toBeInTheDocument();
    expect(screen.getByRole("article")).toHaveClass("border-rose-500");
    expect(screen.queryByText(/fail-closed/u)).not.toBeInTheDocument();
  });

  it("shows disabled attach with fail-closed hint for unavailable remote detail data", () => {
    renderExpandedCard({
      bubble: bubbleCard({
        bubbleId: "b-expanded-remote-detail",
        repoPath: "/repo-a",
        state: "READY_FOR_HUMAN_APPROVAL",
        runtimeSession: null,
        stale: true
      }),
      detail: bubbleDetail({
        bubbleId: "b-expanded-remote-detail",
        repoPath: "/repo-a",
        state: "READY_FOR_HUMAN_APPROVAL",
        runtimeSession: null,
        stale: true,
        remoteExecution: {
          alias: "lab",
          host: "ssh.example.com",
          pointerKind: "started",
          viewKind: "status",
          statusSource: "live",
          cacheStatus: "missing",
          runtimeAvailability: "missing",
          reasonCode: "STATUS_REMOTE_RUNTIME_MISSING"
        }
      })
    });

    expect(screen.getByRole("button", { name: "Attach" })).toBeDisabled();
    expect(screen.getByText(/fail-closed/u)).toBeInTheDocument();
    expect(screen.queryByText(/restart runtime automatically/u)).not.toBeInTheDocument();
  });

  it("shows disabled attach with fail-closed hint for refreshed remote summary data", () => {
    renderExpandedCard({
      bubble: bubbleCard({
        bubbleId: "b-expanded-remote-summary-missing",
        repoPath: "/repo-a",
        state: "READY_FOR_HUMAN_APPROVAL",
        runtimeSession: null,
        stale: false,
        remoteExecution: {
          alias: "lab",
          host: "ssh.example.com",
          pointerKind: "started",
          viewKind: "list",
          stateSource: "refresh",
          cacheStatus: "present",
          runtimeAvailability: "missing",
          runtimeReasonCode: "STATUS_REMOTE_RUNTIME_MISSING",
          lastLiveCheckAt: "2026-04-16T10:00:00.000Z",
          lastCacheCheckAt: "2026-04-16T10:00:00.000Z"
        }
      })
    });

    expect(screen.getByRole("button", { name: "Attach" })).toBeDisabled();
    expect(screen.getByText(/fail-closed/u)).toBeInTheDocument();
    expect(screen.queryByText(/restart runtime automatically/u)).not.toBeInTheDocument();
  });

  it("shows disabled attach with start-first hint for created remote detail data", () => {
    renderExpandedCard({
      bubble: bubbleCard({
        bubbleId: "b-expanded-remote-created",
        repoPath: "/repo-a",
        state: "RUNNING",
        runtimeSession: null,
        stale: false
      }),
      detail: bubbleDetail({
        bubbleId: "b-expanded-remote-created",
        repoPath: "/repo-a",
        state: "RUNNING",
        runtimeSession: null,
        stale: false,
        remoteExecution: {
          alias: "lab",
          host: "ssh.example.com",
          pointerKind: "created",
          viewKind: "list",
          stateSource: "created_not_started",
          cacheStatus: "missing"
        }
      })
    });

    expect(screen.getByRole("button", { name: "Attach" })).toBeDisabled();
    expect(screen.getByText(/Start it first, then attach/u)).toBeInTheDocument();
  });

  it("copies bubble review prompt on double click of expanded bubble id label", async () => {
    renderExpandedCard();

    fireEvent.doubleClick(screen.getByText("b-expanded-1"));

    await waitFor(() => {
      expect(copyToClipboardMock).toHaveBeenCalledTimes(1);
      expect(copyToClipboardMock).toHaveBeenCalledWith(bubbleReviewPrompt);
    });
  });

  it("copies bubble review prompt on double click of expanded repo label", async () => {
    renderExpandedCard();

    fireEvent.doubleClick(screen.getByText("repo-a"));

    await waitFor(() => {
      expect(copyToClipboardMock).toHaveBeenCalledTimes(1);
      expect(copyToClipboardMock).toHaveBeenCalledWith(bubbleReviewPrompt);
    });
  });

  it("shows and dismisses copy error feedback when clipboard write fails", async () => {
    copyToClipboardMock.mockRejectedValueOnce(
      new Error("Clipboard permission denied")
    );
    renderExpandedCard();

    fireEvent.doubleClick(screen.getByText("b-expanded-1"));

    await waitFor(() => {
      expect(
        screen.getByText(
          "Copy bubble ID failed (b-expanded-1): Clipboard permission denied"
        )
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Dismiss copy error" }));
    expect(
      screen.queryByText(
        "Copy bubble ID failed (b-expanded-1): Clipboard permission denied"
      )
    ).not.toBeInTheDocument();
  });

  it("does not start drag from close button mousedown", () => {
    const onPositionChange = vi.fn();
    const onPositionCommit = vi.fn();
    const onClose = vi.fn();
    renderExpandedCard({
      onPositionChange,
      onPositionCommit,
      onClose
    });

    const closeButton = screen.getByRole("button", { name: "Close expanded card" });
    fireEvent.mouseDown(closeButton, { button: 0, clientX: 150, clientY: 150 });
    fireEvent.mouseMove(document, { clientX: 4, clientY: 4 });
    fireEvent.mouseUp(document);
    fireEvent.click(closeButton);

    expect(onPositionChange).not.toHaveBeenCalled();
    expect(onPositionCommit).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not start drag from bubble id double-click target", async () => {
    const onPositionChange = vi.fn();
    const onPositionCommit = vi.fn();
    renderExpandedCard({
      onPositionChange,
      onPositionCommit
    });

    const idLabel = screen.getByText("b-expanded-1");
    fireEvent.mouseDown(idLabel, { button: 0, clientX: 140, clientY: 140 });
    fireEvent.mouseMove(document, { clientX: 8, clientY: 8 });
    fireEvent.mouseUp(document);
    fireEvent.doubleClick(idLabel);

    await waitFor(() => {
      expect(copyToClipboardMock).toHaveBeenCalledTimes(1);
    });
    expect(onPositionChange).not.toHaveBeenCalled();
    expect(onPositionCommit).not.toHaveBeenCalled();
  });

  it("ignores mousemove drag updates when primary button is no longer pressed", () => {
    const onPositionChange = vi.fn();
    renderExpandedCard({
      onPositionChange
    });

    const article = screen.getByRole("article");
    const header = article.firstElementChild;
    if (!(header instanceof HTMLDivElement)) {
      throw new Error("Expanded card header not found");
    }

    fireEvent.mouseDown(header, { button: 0, clientX: 140, clientY: 140 });
    fireEvent.mouseMove(document, { buttons: 0, clientX: 0, clientY: 0 });
    fireEvent.mouseUp(document);

    expect(onPositionChange).not.toHaveBeenCalled();
  });
});
