import { describe, expect, it } from "vitest";

import {
  bubbleDimensions,
  cardHeight,
  cardWidth,
  defaultPosition,
  expandedCardHeight,
  resolveViewportAwarePosition,
  resolveNonOverlappingPosition,
  startX,
  startY,
  xGap,
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

describe("resolveViewportAwarePosition", () => {
  it("selects the empty bottom-right slot in a visible 2x2 area", () => {
    const result = resolveViewportAwarePosition(
      defaultPosition(10),
      [
        { position: defaultPosition(0), expanded: false },
        { position: defaultPosition(1), expanded: false },
        { position: defaultPosition(4), expanded: false }
      ],
      false,
      {
        x: startX,
        y: startY,
        width: defaultPosition(1).x + cardWidth - startX,
        height: defaultPosition(4).y + cardHeight - startY
      }
    );

    expect(result).toEqual({
      position: defaultPosition(5),
      source: "viewport"
    });
  });

  it("uses row-major ordering when multiple candidates are fully visible", () => {
    const result = resolveViewportAwarePosition(defaultPosition(7), [], false, {
      x: startX,
      y: startY,
      width: defaultPosition(1).x + cardWidth - startX,
      height: defaultPosition(4).y + cardHeight - startY
    });

    expect(result).toEqual({
      position: defaultPosition(0),
      source: "viewport"
    });
  });

  it("discovers visible grid candidates beyond the fallback column cap", () => {
    const beyondFallbackColumns = {
      x: startX + 4 * (cardWidth + xGap),
      y: startY
    };

    const result = resolveViewportAwarePosition(defaultPosition(0), [], false, {
      ...beyondFallbackColumns,
      width: cardWidth,
      height: cardHeight
    });

    expect(result).toEqual({
      position: beyondFallbackColumns,
      source: "viewport"
    });
  });

  it("selects the largest visible area when no candidate is fully visible", () => {
    const result = resolveViewportAwarePosition(defaultPosition(8), [], false, {
      x: startX + cardWidth - 100,
      y: startY + cardHeight - 80,
      width: 350,
      height: 180
    });

    expect(result).toEqual({
      position: defaultPosition(1),
      source: "viewport"
    });
  });

  it("uses row-major ordering to break equal partial-visibility ties", () => {
    const result = resolveViewportAwarePosition(
      defaultPosition(8),
      [{ position: defaultPosition(0), expanded: false }],
      false,
      {
        x: startX + cardWidth - 100,
        y: startY + cardHeight - 80,
        width: 226,
        height: 182
      }
    );

    expect(result).toEqual({
      position: defaultPosition(1),
      source: "viewport"
    });
  });

  it("discards candidates blocked by expanded occupied footprints", () => {
    const result = resolveViewportAwarePosition(
      defaultPosition(0),
      [{ position: defaultPosition(0), expanded: true }],
      false,
      {
        x: startX,
        y: startY,
        width: defaultPosition(2).x + cardWidth - startX,
        height: cardHeight
      }
    );

    expect(result).toEqual({
      position: defaultPosition(2),
      source: "viewport"
    });
  });

  it("returns generated fallback when viewport geometry is unavailable or invalid", () => {
    const occupied = [{ position: defaultPosition(0), expanded: true }];

    expect(
      resolveViewportAwarePosition(defaultPosition(4), occupied, false, null)
    ).toEqual({
      position: defaultPosition(6),
      source: "generated-fallback"
    });

    expect(
      resolveViewportAwarePosition(defaultPosition(4), occupied, false, {
        x: startX,
        y: startY,
        width: 0,
        height: cardHeight
      })
    ).toEqual({
      position: defaultPosition(6),
      source: "generated-fallback"
    });
  });

  it("returns generated fallback when no candidate intersects the viewport", () => {
    const result = resolveViewportAwarePosition(defaultPosition(2), [], false, {
      x: -1000,
      y: -1000,
      width: 10,
      height: 10
    });

    expect(result).toEqual({
      position: defaultPosition(2),
      source: "generated-fallback"
    });
  });
});
