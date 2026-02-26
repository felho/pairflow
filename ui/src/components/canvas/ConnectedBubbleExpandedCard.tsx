import { useBubbleStore } from "../../state/useBubbleStore";
import { BubbleExpandedCard } from "./BubbleExpandedCard";

export interface ConnectedBubbleExpandedCardProps {
  bubbleId: string;
}

export function ConnectedBubbleExpandedCard(
  props: ConnectedBubbleExpandedCardProps
): JSX.Element | null {
  const bubble = useBubbleStore(
    (state) => state.bubblesById[props.bubbleId]
  );
  const detail = useBubbleStore(
    (state) => state.bubbleDetails[props.bubbleId] ?? null
  );
  const timeline = useBubbleStore(
    (state) => state.bubbleTimelines[props.bubbleId] ?? null
  );
  const position = useBubbleStore(
    (state) => state.positions[props.bubbleId]
  );
  const detailLoading = useBubbleStore(
    (state) => state.detailLoadingById[props.bubbleId] === true
  );
  const timelineLoading = useBubbleStore(
    (state) => state.timelineLoadingById[props.bubbleId] === true
  );
  const detailError = useBubbleStore(
    (state) => state.detailErrorById[props.bubbleId] ?? null
  );
  const timelineError = useBubbleStore(
    (state) => state.timelineErrorById[props.bubbleId] ?? null
  );
  const actionLoading = useBubbleStore(
    (state) => state.actionLoadingById[props.bubbleId] === true
  );
  const actionError = useBubbleStore(
    (state) => state.actionErrorById[props.bubbleId] ?? null
  );
  const actionRetryHint = useBubbleStore(
    (state) => state.actionRetryHintById[props.bubbleId] ?? null
  );
  const actionFailure = useBubbleStore(
    (state) => state.actionFailureById[props.bubbleId] ?? null
  );
  const collapseBubble = useBubbleStore((state) => state.collapseBubble);
  const setPosition = useBubbleStore((state) => state.setPosition);
  const persistPositions = useBubbleStore((state) => state.persistPositions);
  const refreshExpandedBubble = useBubbleStore(
    (state) => state.refreshExpandedBubble
  );
  const runBubbleAction = useBubbleStore((state) => state.runBubbleAction);
  const clearActionFeedback = useBubbleStore(
    (state) => state.clearActionFeedback
  );

  if (bubble === undefined) {
    return null;
  }

  const resolvedPosition = position ?? { x: 22, y: 22 };

  return (
    <BubbleExpandedCard
      bubble={bubble}
      detail={detail}
      timeline={timeline}
      position={resolvedPosition}
      detailLoading={detailLoading}
      timelineLoading={timelineLoading}
      detailError={detailError}
      timelineError={timelineError}
      actionLoading={actionLoading}
      actionError={actionError}
      actionRetryHint={actionRetryHint}
      actionFailure={actionFailure}
      onPositionChange={(pos) => {
        setPosition(props.bubbleId, pos);
      }}
      onPositionCommit={() => {
        persistPositions();
      }}
      onClose={() => {
        collapseBubble(props.bubbleId);
      }}
      onRefresh={() => {
        void refreshExpandedBubble(props.bubbleId);
      }}
      onAction={async (input) => {
        await runBubbleAction(input);
      }}
      onClearActionFeedback={() => {
        clearActionFeedback(props.bubbleId);
      }}
    />
  );
}
