import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { bubbleCard } from "../../test/fixtures";

const { stateRef, bubbleExpandedCardMock } = vi.hoisted(() => ({
  stateRef: {
    current: {} as Record<string, unknown>
  },
  bubbleExpandedCardMock: vi.fn()
}));

vi.mock("../../state/useBubbleStore", () => ({
  useBubbleStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector(stateRef.current)
}));

vi.mock("./BubbleExpandedCard", () => ({
  BubbleExpandedCard: (props: { position: { x: number; y: number } }) => {
    bubbleExpandedCardMock(props);
    return (
      <div
        data-testid="expanded-card"
        data-left={String(props.position.x)}
        data-top={String(props.position.y)}
      />
    );
  }
}));

import { ConnectedBubbleExpandedCard } from "./ConnectedBubbleExpandedCard";

function setConnectedStoreState(
  position: {
    x: number;
    y: number;
  } | null
): void {
  stateRef.current = {
    bubblesById: {
      "b-1": bubbleCard({
        bubbleId: "b-1",
        repoPath: "/repo-a"
      })
    },
    bubbleDetails: {},
    bubbleTimelines: {},
    positions: position === null ? {} : { "b-1": position },
    detailLoadingById: {},
    timelineLoadingById: {},
    detailErrorById: {},
    timelineErrorById: {},
    actionLoadingById: {},
    actionErrorById: {},
    actionRetryHintById: {},
    actionFailureById: {},
    collapseBubble: () => undefined,
    setPosition: () => undefined,
    persistPositions: () => undefined,
    refreshExpandedBubble: async () => undefined,
    runBubbleAction: async () => undefined,
    clearActionFeedback: () => undefined
  };
}

describe("ConnectedBubbleExpandedCard", () => {
  beforeEach(() => {
    bubbleExpandedCardMock.mockReset();
    setConnectedStoreState(null);
  });

  it("uses fallback canvas position when no persisted position exists", () => {
    render(
      <ConnectedBubbleExpandedCard
        bubbleId="b-1"
        fallbackPosition={{ x: 360, y: 240 }}
      />
    );

    const expandedCard = screen.getByTestId("expanded-card");
    expect(expandedCard).toHaveAttribute("data-left", "360");
    expect(expandedCard).toHaveAttribute("data-top", "240");
  });

  it("prefers persisted position over fallback canvas position", () => {
    setConnectedStoreState({ x: 520, y: 410 });

    render(
      <ConnectedBubbleExpandedCard
        bubbleId="b-1"
        fallbackPosition={{ x: 360, y: 240 }}
      />
    );

    const expandedCard = screen.getByTestId("expanded-card");
    expect(expandedCard).toHaveAttribute("data-left", "520");
    expect(expandedCard).toHaveAttribute("data-top", "410");
  });
});
