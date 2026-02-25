import { useCallback, useEffect } from "react";
import { useShallow } from "zustand/react/shallow";

import { BubbleCanvas } from "./components/canvas/BubbleCanvas";
import { HeaderBar } from "./components/header/HeaderBar";
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
  const positions = useBubbleStore((state) => state.positions);
  const expandedBubbleIds = useBubbleStore((state) => state.expandedBubbleIds);
  const toggleRepo = useBubbleStore((state) => state.toggleRepo);
  const setPosition = useBubbleStore((state) => state.setPosition);
  const persistPositions = useBubbleStore((state) => state.persistPositions);
  const toggleBubbleExpanded = useBubbleStore((state) => state.toggleBubbleExpanded);
  const deleteBubble = useBubbleStore((state) => state.deleteBubble);
  const visibleBubbles = useBubbleStore(useShallow(selectVisibleBubbles));
  const counts = useBubbleStore(useShallow(selectStateCounts));
  const handleDelete = useCallback(
    (bubbleId: string, force?: boolean, repoPath?: string) =>
      deleteBubble(bubbleId, force, repoPath),
    [deleteBubble]
  );

  useEffect(() => {
    void store.getState().initialize();
    return () => {
      store.getState().stopRealtime();
    };
  }, [store]);

  return (
    <div className="flex min-h-screen flex-col text-white">
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
        expandedBubbleIds={expandedBubbleIds}
        onPositionChange={(bubbleId, position) => {
          setPosition(bubbleId, position);
        }}
        onPositionCommit={() => {
          persistPositions();
        }}
        onToggleExpand={(bubbleId) => {
          void toggleBubbleExpanded(bubbleId);
        }}
        onDelete={handleDelete}
      />
    </div>
  );
}
