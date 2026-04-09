export const summaryVerifierConsistencyGateSchemaVersion = 1 as const;

export interface SummaryVerifierConsistencyGateArtifact {
  schema_version: typeof summaryVerifierConsistencyGateSchemaVersion;
  bubble_id: string;
  round: number;
  evaluated_at: string;
  gate_decision: "allow" | "block" | "not_applicable";
  reason_code:
    | "claim_verified"
    | "no_claim_in_docs_only"
    | "summary_verifier_mismatch"
    | "not_applicable_non_docs";
  review_artifact_type: "code" | "document";
  verifier_status: "trusted" | "untrusted";
  claim_classes_detected: string;
  matched_claim_triggers: string[];
  verifier_origin_reason?: string;
}
