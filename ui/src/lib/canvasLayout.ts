import type { BubblePosition } from "./types";

export const collapsedCardDimensions = {
  width: 260,
  height: 156
} as const;

export const expandedCardDimensions = {
  width: 320,
  height: 320
} as const;

export const cardWidth = collapsedCardDimensions.width;
export const cardHeight = collapsedCardDimensions.height;
export const expandedCardHeight = expandedCardDimensions.height;
export const xGap = 26;
export const yGap = 22;
export const startX = 22;
export const startY = 22;
export const columns = 4;
const horizontalStep = cardWidth + xGap;
const verticalStep = cardHeight + yGap;
const maxSlotX = startX + (columns - 1) * horizontalStep;

export function defaultPosition(index: number): BubblePosition {
  const column = index % columns;
  const row = Math.floor(index / columns);
  return {
    x: startX + column * horizontalStep,
    y: startY + row * verticalStep
  };
}

export interface PositionedBubble {
  position: BubblePosition;
  expanded: boolean;
}

export interface ViewportRectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type PlacementSource = "viewport" | "generated-fallback";

export interface PlacementResult {
  position: BubblePosition;
  source: PlacementSource;
}

export function bubbleDimensions(expanded: boolean): {
  width: number;
  height: number;
} {
  return expanded ? expandedCardDimensions : collapsedCardDimensions;
}

export function resolveViewportAwarePosition(
  fallbackPosition: BubblePosition,
  occupied: PositionedBubble[],
  expanded: boolean,
  viewport?: ViewportRectangle | null
): PlacementResult {
  const fallback = (): PlacementResult => ({
    position: resolveNonOverlappingPosition(fallbackPosition, occupied, expanded),
    source: "generated-fallback"
  });

  if (!isUsableViewport(viewport)) {
    return fallback();
  }

  const dimensions = bubbleDimensions(expanded);
  const candidates = generateViewportCandidates(viewport, dimensions)
    .filter((position) => getBlockingBottoms(position, dimensions, occupied).length === 0)
    .map((position) => ({
      position,
      visibleArea: visibleArea(position, dimensions, viewport),
      fullyVisible: isFullyVisible(position, dimensions, viewport)
    }))
    .filter((candidate) => candidate.visibleArea > 0)
    .sort((a, b) => {
      if (a.fullyVisible !== b.fullyVisible) {
        return a.fullyVisible ? -1 : 1;
      }

      if (!a.fullyVisible && a.visibleArea !== b.visibleArea) {
        return b.visibleArea - a.visibleArea;
      }

      return rowMajorCompare(a.position, b.position);
    });

  const bestCandidate = candidates[0];
  if (!bestCandidate) {
    return fallback();
  }

  return {
    position: bestCandidate.position,
    source: "viewport"
  };
}

export function resolveNonOverlappingPosition(
  desiredPosition: BubblePosition,
  occupied: PositionedBubble[],
  expanded: boolean
): BubblePosition {
  const dimensions = bubbleDimensions(expanded);
  const candidate = { ...desiredPosition };
  const maxIterations = occupied.length + 1;

  for (let nextX = desiredPosition.x; ; nextX += horizontalStep) {
    candidate.x = nextX;
    candidate.y = desiredPosition.y;
    if (getBlockingBottoms(candidate, dimensions, occupied).length === 0) {
      return candidate;
    }

    if (nextX + horizontalStep > maxSlotX) {
      break;
    }
  }

  candidate.x = desiredPosition.x;
  // Candidate Y must strictly increase on every conflicting iteration because
  // we jump to at least one blocker bottom (bottom + gap), which is always > candidate.y
  // while overlap still exists.
  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    const blockingBottoms = getBlockingBottoms(candidate, dimensions, occupied);
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

function isUsableViewport(
  viewport: ViewportRectangle | null | undefined
): viewport is ViewportRectangle {
  return (
    viewport != null &&
    Number.isFinite(viewport.x) &&
    Number.isFinite(viewport.y) &&
    Number.isFinite(viewport.width) &&
    Number.isFinite(viewport.height) &&
    viewport.width > 0 &&
    viewport.height > 0
  );
}

function generateViewportCandidates(
  viewport: ViewportRectangle,
  dimensions: {
    width: number;
    height: number;
  }
): BubblePosition[] {
  const viewportRight = viewport.x + viewport.width;
  const viewportBottom = viewport.y + viewport.height;
  const minColumn = Math.max(
    0,
    Math.floor((viewport.x - startX - dimensions.width) / horizontalStep)
  );
  const maxColumn = Math.max(0, Math.ceil((viewportRight - startX) / horizontalStep));
  const minRow = Math.max(
    0,
    Math.floor((viewport.y - startY - dimensions.height) / verticalStep)
  );
  const maxRow = Math.max(0, Math.ceil((viewportBottom - startY) / verticalStep));
  const candidates: BubblePosition[] = [];

  for (let row = minRow; row <= maxRow; row += 1) {
    for (let column = minColumn; column <= maxColumn; column += 1) {
      candidates.push({
        x: startX + column * horizontalStep,
        y: startY + row * verticalStep
      });
    }
  }

  return candidates;
}

function visibleArea(
  position: BubblePosition,
  dimensions: {
    width: number;
    height: number;
  },
  viewport: ViewportRectangle
): number {
  const overlapWidth = Math.max(
    0,
    Math.min(position.x + dimensions.width, viewport.x + viewport.width) -
      Math.max(position.x, viewport.x)
  );
  const overlapHeight = Math.max(
    0,
    Math.min(position.y + dimensions.height, viewport.y + viewport.height) -
      Math.max(position.y, viewport.y)
  );

  return overlapWidth * overlapHeight;
}

function isFullyVisible(
  position: BubblePosition,
  dimensions: {
    width: number;
    height: number;
  },
  viewport: ViewportRectangle
): boolean {
  return (
    position.x >= viewport.x &&
    position.y >= viewport.y &&
    position.x + dimensions.width <= viewport.x + viewport.width &&
    position.y + dimensions.height <= viewport.y + viewport.height
  );
}

function rowMajorCompare(a: BubblePosition, b: BubblePosition): number {
  if (a.y !== b.y) {
    return a.y - b.y;
  }

  return a.x - b.x;
}

function getBlockingBottoms(
  candidate: BubblePosition,
  dimensions: {
    width: number;
    height: number;
  },
  occupied: PositionedBubble[]
): number[] {
  return occupied
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
}
