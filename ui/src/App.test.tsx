import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const initialize = vi.fn(async () => undefined);
const stopRealtime = vi.fn(() => undefined);

vi.mock("./state/useBubbleStore", async () => {
  const fixtures = await import("./test/fixtures");
  const state = {
    repos: ["/repo-a"],
    selectedRepos: ["/repo-a"],
    connectionStatus: "connected",
    isLoading: false,
    error: "Sample error",
    expandedBubbleIds: [],
    positions: {
      "b-1": {
        x: 20,
        y: 24
      }
    },
    bubbleDetails: {},
    bubbleTimelines: {},
    detailLoadingById: {},
    timelineLoadingById: {},
    detailErrorById: {},
    timelineErrorById: {},
    actionLoadingById: {},
    actionErrorById: {},
    actionRetryHintById: {},
    actionFailureById: {},
    toggleRepo: async () => undefined,
    setPosition: () => undefined,
    persistPositions: () => undefined,
    toggleBubbleExpanded: async () => undefined,
    collapseBubble: () => undefined,
    refreshExpandedBubble: async () => undefined,
    runBubbleAction: async () => undefined,
    clearActionFeedback: () => undefined,
    bubblesById: {
      "b-1": fixtures.bubbleCard({
        bubbleId: "b-1",
        repoPath: "/repo-a"
      })
    }
  };

  return {
    useBubbleStore: (selector: (value: typeof state) => unknown) => selector(state),
    useBubbleStoreApi: () => ({
      getState: () => ({
        initialize,
        stopRealtime
      })
    }),
    selectVisibleBubbles: (value: typeof state) => Object.values(value.bubblesById),
    selectStateCounts: () => fixtures.stateCounts({ RUNNING: 1 })
  };
});

import App from "./App";

afterEach(() => {
  vi.clearAllMocks();
});

describe("App", () => {
  it("renders shell from store state", () => {
    const { unmount } = render(<App />);

    expect(screen.getByText("Sample error")).toBeInTheDocument();
    expect(screen.getByText(/RUNNING 1/u)).toBeInTheDocument();
    expect(screen.getByText("b-1")).toBeInTheDocument();

    expect(initialize).toHaveBeenCalledTimes(1);

    unmount();
    expect(stopRealtime).toHaveBeenCalledTimes(1);
  });
});
