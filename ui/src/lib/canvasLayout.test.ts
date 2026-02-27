import { describe, expect, it } from "vitest";

import {
  bubbleDimensions,
  cardHeight,
  defaultPosition,
  expandedCardHeight,
  resolveNonOverlappingPosition,
  startY,
  yGap
} from "./canvasLayout";

describe("resolveNonOverlappingPosition", () => {
  it("keeps the default slot when predecessor is collapsed", () => {
    const desired = defaultPosition(4);

    const position = resolveNonOverlappingPosition(
      desired,
      [{ position: defaultPosition(0), expanded: false }],
      false
    );

    expect(position).toEqual(desired);
  });

  it("prefers the same-row right slot before moving down", () => {
    const desired = defaultPosition(4);

    const position = resolveNonOverlappingPosition(
      desired,
      [{ position: defaultPosition(0), expanded: true }],
      false
    );

    expect(position).toEqual(defaultPosition(6));
  });

  it("treats expanded predecessor width as blocking adjacent columns", () => {
    const desired = defaultPosition(5);

    const collapsedPosition = resolveNonOverlappingPosition(
      desired,
      [{ position: defaultPosition(0), expanded: false }],
      false
    );
    expect(collapsedPosition).toEqual(desired);

    const expandedPosition = resolveNonOverlappingPosition(
      desired,
      [{ position: defaultPosition(0), expanded: true }],
      false
    );

    expect(expandedPosition).toEqual(defaultPosition(6));
  });

  it("moves down only when no right-side slot is available", () => {
    const desired = defaultPosition(7);

    const position = resolveNonOverlappingPosition(
      desired,
      [{ position: defaultPosition(3), expanded: true }],
      false
    );

    expect(position.x).toBe(desired.x);
    expect(position.y).toBe(startY + expandedCardHeight + yGap);
  });

  it("prefers a same-row right slot for expanded new bubble when available", () => {
    const desired = defaultPosition(1);
    const blocker = defaultPosition(2);
    // Boundary arithmetic with current constants:
    // desired collapsed right edge = 308 + 260 = 568
    // blocker padded left edge = (594 - xGap) = 568
    // so collapsed candidate is exactly non-overlapping at the boundary.

    const collapsedNewPosition = resolveNonOverlappingPosition(
      desired,
      [{ position: blocker, expanded: false }],
      false
    );
    expect(collapsedNewPosition).toEqual(desired);

    const expandedNewPosition = resolveNonOverlappingPosition(
      desired,
      [{ position: blocker, expanded: false }],
      true
    );

    expect(expandedNewPosition).toEqual(defaultPosition(3));
  });

  it("places a new bubble outside an expanded blocker footprint", () => {
    const expandedBlocker = {
      position: defaultPosition(0),
      expanded: true
    };
    const desired = defaultPosition(1);

    const resolved = resolveNonOverlappingPosition(
      desired,
      [expandedBlocker],
      false
    );

    expect(resolved).toEqual(defaultPosition(2));
    const blockerBottom =
      expandedBlocker.position.y + bubbleDimensions(expandedBlocker.expanded).height;
    expect(resolved.y + bubbleDimensions(false).height).toBeLessThanOrEqual(blockerBottom + yGap);
  });
});
