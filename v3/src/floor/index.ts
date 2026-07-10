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
  BundleDiagRow,
  BundleEnvelopeMeta,
  BundleTranscriptRow,
  DebugBundle,
  DebugBundleExporter,
  RejectedInputsSection,
} from "./debugBundle.js";
