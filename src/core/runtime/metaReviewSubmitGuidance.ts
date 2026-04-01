const metaReviewSubmitReportJsonParityFields =
  '{"findings_claim_state":"clean|open_findings|unknown","findings_claim_source":"meta_review_artifact","findings_count":<int>,"findings_claimed_open_total":<int>,"findings_blocking_open_total":<int>,"findings_advisory_open_total":<int>,"findings_artifact_ref":"artifacts/<findings>.json","meta_review_run_id":"<run-id>","findings_digest_sha256":"<sha256>","findings_artifact_status":"available"}';

const metaReviewSubmitApproveParityNote =
  "For recommendation=approve, split fields are mandatory, findings_claimed_open_total = findings_blocking_open_total + findings_advisory_open_total, and findings_blocking_open_total must be 0.";

export function buildMetaReviewSubmitUsageLine(): string {
  return "pairflow bubble meta-review submit --id <id> --round <n> --recommendation approve|rework|inconclusive --summary <text> [--rework-target-message <text>] --report-json <json> [--repo <path>] [--json]";
}

export function buildMetaReviewSubmitCommandTemplate(input?: {
  bubbleId?: string;
  round?: number;
}): string {
  const bubbleId = input?.bubbleId ?? "<id>";
  const round = input?.round === undefined ? "<n>" : String(input.round);
  return `pairflow bubble meta-review submit --id ${bubbleId} --round ${round} --recommendation <approve|rework|inconclusive> --summary "<summary>" [--rework-target-message "<message>"] --report-json '${metaReviewSubmitReportJsonParityFields}'`;
}

export function buildMetaReviewSubmitApproveParityNote(): string {
  return metaReviewSubmitApproveParityNote;
}
