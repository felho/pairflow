// Read-only visibility floor (PI-2); never writes. Grown per ch 6:
// getTimeline (P1), the committed floor-tail seed (P2), the debug
// bundle foundation (P3), the CLI-activated surfaces (P4); ch 7-P3
// adds the diag consumers (tail diag layer + bundle three-state flip).
export { createFloor } from "./floor.js";
export type { Floor } from "./floor.js";
export {
  createDiagTail,
  createTail,
  TailIntegrityError,
  TailUnknownInstanceError,
} from "./tail.js";
export type { DiagTail, DiagTailRow, Tail } from "./tail.js";
export { createDebugBundleExporter, redactPayloadsPolicy } from "./debugBundle.js";
export type {
  // ch14-p2a: the bundle's THIRD row shape and the union it joins. The
  // fact arm comes with them — a union export whose arm cannot be named
  // is not usable from outside, and its absence was a standing gap the
  // third arm made visible.
  BundleDecisionRequestRow,
  BundleDiagRow,
  BundleEnvelopeMeta,
  BundleFactRow,
  BundleRow,
  BundleTranscriptRow,
  DebugBundle,
  DebugBundleExporter,
  RejectedInputsSection,
} from "./debugBundle.js";
