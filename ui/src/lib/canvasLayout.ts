import type { BubblePosition } from "./types";

export const collapsedCardDimensions = {
  width: 260,
  height: 156
} as const;

export const expandedCardDimensions = {
  width: 500,
  height: 520
} as const;

export const cardWidth = collapsedCardDimensions.width;
export const cardHeight = collapsedCardDimensions.height;
export const expandedCardHeight = expandedCardDimensions.height;
export const xGap = 26;
export const yGap = 22;
export const startX = 22;
export const startY = 22;
export const columns = 4;

export function defaultPosition(index: number): BubblePosition {
  const column = index % columns;
  const row = Math.floor(index / columns);
  return {
    x: startX + column * (cardWidth + xGap),
    y: startY + row * (cardHeight + yGap)
  };
}

export interface PositionedBubble {
  position: BubblePosition;
  expanded: boolean;
}

export function bubbleDimensions(expanded: boolean): {
  width: number;
  height: number;
} {
  return expanded ? expandedCardDimensions : collapsedCardDimensions;
}

export function resolveNonOverlappingPosition(
  desiredPosition: BubblePosition,
  occupied: PositionedBubble[],
  expanded: boolean
): BubblePosition {
  const dimensions = bubbleDimensions(expanded);
  const candidate = { ...desiredPosition };
  const maxIterations = occupied.length + 1;

  // Candidate Y must strictly increase on every conflicting iteration because
  // we jump to at least one blocker bottom (bottom + gap), which is always > candidate.y
  // while overlap still exists.
  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    const blockingBottoms = occupied
      .filter((bubble) => {
        const occupiedDimensions = bubbleDimensions(bubble.expanded);
        // We pad only the occupied rectangle by the configured gap. This is sufficient
        // because candidates are evaluated in deterministic order and only nudged downward,
        // so we only need to detect whether the new candidate enters another bubble's
        // reserved footprint (bubble bounds + spacing margin).
        const occupiedStartX = bubble.position.x - xGap;
        const occupiedEndX = bubble.position.x + occupiedDimensions.width + xGap;
        const occupiedStartY = bubble.position.y - yGap;
        const occupiedEndY = bubble.position.y + occupiedDimensions.height + yGap;

        const candidateEndX = candidate.x + dimensions.width;
        const candidateEndY = candidate.y + dimensions.height;

        return (
          candidate.x < occupiedEndX &&
          candidateEndX > occupiedStartX &&
          candidate.y < occupiedEndY &&
          candidateEndY > occupiedStartY
        );
      })
      .map((bubble) => bubble.position.y + bubbleDimensions(bubble.expanded).height + yGap);

    if (blockingBottoms.length === 0) {
      return candidate;
    }

    candidate.y = Math.max(candidate.y, Math.max(...blockingBottoms));
  }

  console.error("resolveNonOverlappingPosition reached iteration cap", {
    desiredPosition,
    occupiedCount: occupied.length,
    expanded
  });
  return candidate;
}
