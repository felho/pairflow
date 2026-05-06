export function buildDocumentBubbleSourceEditGuard(): string {
  return [
    "Document bubble source-code guard:",
    "do not edit product/runtime/source files, tests, UI components, presenter code, contracts, or build/runtime config in `review_artifact_type=document`.",
    "`target_files`, `target_write_files`, L2 implementation sketches, acceptance checks, or reviewer code findings inside the task artifact are planning context only in document scope; they do not authorize code edits.",
    "If the requested outcome or reviewer feedback cannot be satisfied by task/spec/progress/docs refinement only, stop and emit a blocker or route-back/replan request instead of implementing."
  ].join(" ");
}
