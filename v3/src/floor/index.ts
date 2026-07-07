// Read-only visibility floor (PI-2); never writes. Grown per ch 6:
// getTimeline (P1), the committed floor-tail seed (P2); the debug
// bundle is P3.
export { createFloor } from "./floor.js";
export type { Floor } from "./floor.js";
export { createTail, TailIntegrityError, TailUnknownInstanceError } from "./tail.js";
export type { Tail } from "./tail.js";
