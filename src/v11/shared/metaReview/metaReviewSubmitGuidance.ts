const metaReviewSubmitReportJsonParityFields =
  '{"findings_claim_state":"clean|open_findings|unknown","findings_claim_source":"meta_review_artifact","findings_count":<int>,"findings_claimed_open_total":<int>,"findings_blocking_open_total":<int>,"findings_advisory_open_total":<int>,"findings_artifact_ref":"artifacts/<findings>.json","meta_review_run_id":"<run-id>","findings_digest_sha256":"<sha256>","findings_artifact_status":"available"}';

const metaReviewSubmitApproveParityNote = [
  "Clean approve requires zero open findings.",
  "For recommendation=approve, split fields are mandatory, findings_claimed_open_total = findings_blocking_open_total + findings_advisory_open_total, and findings_blocking_open_total must be 0.",
  "Advisory-only approve is still recommendation=approve: use findings_claim_state=open_findings, keep findings_blocking_open_total=0, set a positive findings_advisory_open_total, and do not switch to inconclusive when the latest same-round reviewer snapshot is advisory-only."
].join(" ");

const metaReviewSubmitAdvisoryOnlyCorrectionNote =
  "Valid correction for advisory-only reviewer-snapshot conflicts: keep recommendation=approve, do not switch to inconclusive, and re-emit advisory-only approve metadata (findings_claim_state=open_findings; findings_blocking_open_total=0; findings_advisory_open_total>0).";

export function buildMetaReviewSubmitUsageLine(): string {
  return "pairflow agent emit --kind meta_review_result --repo <path> --bubble-id <id> --handoff-id <id> --execution-id <id> --round <n> --recommendation approve|rework|inconclusive --summary <text> [--rework-target-message <text>] --report-json <json> [--ref <artifact-path>]...";
}

export function buildMetaReviewSubmitCommandTemplate(input?: {
  bubbleId?: string;
  round?: number;
}): string {
  const bubbleId = input?.bubbleId ?? "<id>";
  const round = input?.round === undefined ? "<n>" : String(input.round);
  return `pairflow agent emit --kind meta_review_result --repo <repo> --bubble-id ${bubbleId} --handoff-id <handoff-id> --execution-id <execution-id> --round ${round} --recommendation <approve|rework|inconclusive> --summary "<summary>" [--rework-target-message "<message>"] --report-json '${metaReviewSubmitReportJsonParityFields}'`;
}

export function buildMetaReviewSubmitApproveParityNote(): string {
  return metaReviewSubmitApproveParityNote;
}

export function buildMetaReviewSubmitAdvisoryOnlyCorrectionNote(): string {
  return metaReviewSubmitAdvisoryOnlyCorrectionNote;
}
