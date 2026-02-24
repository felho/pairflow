import { useEffect } from "react";
import { useShallow } from "zustand/react/shallow";

import { BubbleCanvas } from "./components/canvas/BubbleCanvas";
import { BubbleExpandedPanel } from "./components/expanded/BubbleExpandedPanel";
import { HeaderBar } from "./components/header/HeaderBar";
import { copyToClipboard } from "./lib/clipboard";
import {
  selectStateCounts,
  selectVisibleBubbles,
  useBubbleStore,
  useBubbleStoreApi
} from "./state/useBubbleStore";

export default function App(): JSX.Element {
  const store = useBubbleStoreApi();

  const repos = useBubbleStore((state) => state.repos);
  const selectedRepos = useBubbleStore((state) => state.selectedRepos);
  const connectionStatus = useBubbleStore((state) => state.connectionStatus);
  const isLoading = useBubbleStore((state) => state.isLoading);
  const error = useBubbleStore((state) => state.error);
  const bubblesById = useBubbleStore((state) => state.bubblesById);
  const positions = useBubbleStore((state) => state.positions);
  const selectedBubbleId = useBubbleStore((state) => state.selectedBubbleId);
  const bubbleDetails = useBubbleStore((state) => state.bubbleDetails);
  const bubbleTimelines = useBubbleStore((state) => state.bubbleTimelines);
  const detailLoadingById = useBubbleStore((state) => state.detailLoadingById);
  const timelineLoadingById = useBubbleStore((state) => state.timelineLoadingById);
  const detailErrorById = useBubbleStore((state) => state.detailErrorById);
  const timelineErrorById = useBubbleStore((state) => state.timelineErrorById);
  const actionLoadingById = useBubbleStore((state) => state.actionLoadingById);
  const actionErrorById = useBubbleStore((state) => state.actionErrorById);
  const actionRetryHintById = useBubbleStore((state) => state.actionRetryHintById);
  const actionFailureById = useBubbleStore((state) => state.actionFailureById);
  const toggleRepo = useBubbleStore((state) => state.toggleRepo);
  const setPosition = useBubbleStore((state) => state.setPosition);
  const persistPositions = useBubbleStore((state) => state.persistPositions);
  const selectBubble = useBubbleStore((state) => state.selectBubble);
  const refreshExpandedBubble = useBubbleStore((state) => state.refreshExpandedBubble);
  const runBubbleAction = useBubbleStore((state) => state.runBubbleAction);
  const clearActionFeedback = useBubbleStore((state) => state.clearActionFeedback);
  const visibleBubbles = useBubbleStore(selectVisibleBubbles);
  const counts = useBubbleStore(useShallow(selectStateCounts));
  const selectedBubble = selectedBubbleId !== null ? (bubblesById[selectedBubbleId] ?? null) : null;

  useEffect(() => {
    void store.getState().initialize();
    return () => {
      store.getState().stopRealtime();
    };
  }, [store]);

  return (
    <div className="min-h-screen bg-canvas-gradient text-slate-100">
      <HeaderBar
        counts={counts}
        repos={repos}
        selectedRepos={selectedRepos}
        connectionStatus={connectionStatus}
        onToggleRepo={(repoPath) => {
          void toggleRepo(repoPath);
        }}
      />

      {isLoading ? (
        <div className="px-6 py-5 text-sm text-slate-300">Loading repositories and bubbles...</div>
      ) : null}

      {error !== null ? (
        <div className="mx-4 mb-2 rounded-lg border border-rose-500/60 bg-rose-950/40 px-3 py-2 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      <BubbleCanvas
        bubbles={visibleBubbles}
        positions={positions}
        selectedBubbleId={selectedBubbleId}
        onPositionChange={(bubbleId, position) => {
          setPosition(bubbleId, position);
        }}
        onPositionCommit={() => {
          persistPositions();
        }}
        onBubbleSelect={(bubbleId) => {
          void selectBubble(bubbleId);
        }}
      />

      <BubbleExpandedPanel
        bubble={selectedBubble}
        detail={selectedBubbleId !== null ? (bubbleDetails[selectedBubbleId] ?? null) : null}
        timeline={selectedBubbleId !== null ? (bubbleTimelines[selectedBubbleId] ?? null) : null}
        detailLoading={
          selectedBubbleId !== null
            ? detailLoadingById[selectedBubbleId] === true
            : false
        }
        timelineLoading={
          selectedBubbleId !== null
            ? timelineLoadingById[selectedBubbleId] === true
            : false
        }
        detailError={selectedBubbleId !== null ? (detailErrorById[selectedBubbleId] ?? null) : null}
        timelineError={selectedBubbleId !== null ? (timelineErrorById[selectedBubbleId] ?? null) : null}
        actionLoading={
          selectedBubbleId !== null
            ? actionLoadingById[selectedBubbleId] === true
            : false
        }
        actionError={selectedBubbleId !== null ? (actionErrorById[selectedBubbleId] ?? null) : null}
        actionRetryHint={
          selectedBubbleId !== null
            ? (actionRetryHintById[selectedBubbleId] ?? null)
            : null
        }
        actionFailure={
          selectedBubbleId !== null
            ? (actionFailureById[selectedBubbleId] ?? null)
            : null
        }
        onClose={() => {
          void selectBubble(null);
        }}
        onRefresh={async () => {
          if (selectedBubbleId === null) {
            return;
          }
          await refreshExpandedBubble(selectedBubbleId);
        }}
        onAction={async (input) => {
          await runBubbleAction(input);
        }}
        onAttach={async (command) => {
          await copyToClipboard(command);
        }}
        onClearActionFeedback={() => {
          if (selectedBubbleId === null) {
            return;
          }
          clearActionFeedback(selectedBubbleId);
        }}
      />
    </div>
  );
}
