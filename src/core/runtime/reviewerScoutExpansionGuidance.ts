export function buildReviewerScoutExpansionWorkflowGuidance(): string {
  return [
    "Phase 1 reviewer round flow (prompt-level only):",
    "1) `Parallel Scout Scan`: run up to `max_scout_agents=2` scout scans on the same local diff scope with explicit cap `max_scout_candidates_per_agent=8`; include only concrete location-backed findings, exclude style/preference-only notes.",
    "2) `Deduplicate + Classify`: merge scout findings, deduplicate by root cause + overlapping location, then classify each finding as `one_off` or issue class (`race_condition`, `lifecycle_symmetry`, `timeout_cancellation`, `idempotency`, `concurrency_guard`, `other`). If class detection is uncertain, classify as `one_off`.",
    "3) `Issue-Class Expansion` (conditional): run only for issue-class findings, at most one expansion run per class per round, with `max_class_expansions_per_round=2` and explicit cap `max_expansion_siblings_per_class=5`. Expansion scope is limited to changed files + directly related call-sites; repo-wide expansion scans are forbidden.",
    "Stop rules: stop expansion immediately when no new concrete locations are found; also stop when class/round caps are reached.",
    "4) `Final Consolidation`: deduplicate again across primary + expansion findings, calibrate severity, then emit one final reviewer PASS package that follows the deterministic section/field contract below."
  ].join(" ");
}

export function buildReviewerPassOutputContractGuidance(): string {
  return [
    "Required reviewer PASS output contract (machine-checkable): include exactly these sections in this order: `Scout Coverage`, `Deduplicated Findings`, `Issue-Class Expansions`, `Residual Risk / Notes`.",
    "`Scout Coverage` required fields: `scouts_executed`, `scope_covered`, `guardrail_confirmation`, `raw_candidates_count`, `deduplicated_count`.",
    "`Deduplicated Findings` entry fields: `title`, `severity`, `class`, `locations`, `evidence`, `expansion_siblings`.",
    "`Issue-Class Expansions` entry fields: `class`, `source_finding_title`, `scan_scope`, `siblings`, `stop_reason`.",
    "`class` must be `one_off` or one issue class (`race_condition`, `lifecycle_symmetry`, `timeout_cancellation`, `idempotency`, `concurrency_guard`, `other`).",
    "`locations` must contain at least one concrete location.",
    "Explicit empty-case format is mandatory: if no deduplicated findings, render `Deduplicated Findings: []`; if no issue-class expansions, render `Issue-Class Expansions: []`."
  ].join(" ");
}
