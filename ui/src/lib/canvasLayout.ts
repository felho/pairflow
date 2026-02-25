import type { BubblePosition } from "./types";

export const cardWidth = 248;
export const cardHeight = 156;
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
