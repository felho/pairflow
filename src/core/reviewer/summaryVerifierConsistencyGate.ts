import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { isReviewArtifactType, type ReviewArtifactType } from "../../types/bubble.js";

export const summaryVerifierConsistencyGateSchemaVersion = 1 as const;

export type SummaryVerifierGateDecision = "allow" | "block" | "not_applicable";

export type SummaryVerifierGateReasonCode =
  | "claim_verified"
  | "no_claim_in_docs_only"
  | "summary_verifier_mismatch"
  | "not_applicable_non_docs";

export type RuntimeClaimClass = "test" | "typecheck" | "lint";

export interface SummaryVerifierConsistencyGateDecisionRecord {
  gate_decision: SummaryVerifierGateDecision;
  reason_code: SummaryVerifierGateReasonCode;
  review_artifact_type: ReviewArtifactType;
  verifier_status: "trusted" | "untrusted";
  claim_classes_detected: string;
  matched_claim_triggers: string[];
  verifier_origin_reason?: string;
}

export interface SummaryVerifierConsistencyGateDecisionInput {
  summary: string;
  reviewArtifactType?: string | undefined;
  verifierStatus: string | undefined;
  verifierOriginReason?: string | undefined;
}

export interface SummaryVerifierConsistencyGateArtifact
  extends SummaryVerifierConsistencyGateDecisionRecord {
  schema_version: typeof summaryVerifierConsistencyGateSchemaVersion;
  bubble_id: string;
  round: number;
  evaluated_at: string;
}

const claimClassOrder: RuntimeClaimClass[] = ["test", "typecheck", "lint"];

const claimTriggerCatalog: Record<RuntimeClaimClass, readonly string[]> = {
  test: ["tests pass", "test pass", "pnpm test pass", "pnpm test clean"],
  typecheck: ["typecheck clean", "pnpm typecheck pass", "tsc --noemit pass"],
  lint: ["lint clean", "pnpm lint pass", "pnpm lint clean"]
};

const tokenBoundaryClass = "[\\s.,;:!?()\\[\\]{}\"'/\\-]";

function normalizeReviewArtifactType(input: unknown): ReviewArtifactType {
  if (isReviewArtifactType(input)) {
    return input;
  }
  return "auto";
}

function normalizeVerifierStatus(input: unknown): "trusted" | "untrusted" {
  return input === "trusted" ? "trusted" : "untrusted";
}

function normalizeClaimText(input: string): string {
  return input.toLowerCase().replace(/\s+/gu, " ").trim();
}

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function findFirstTriggerIndex(normalizedText: string, trigger: string): number | undefined {
  const escaped = trigger
    .trim()
    .split(/\s+/u)
    .map((token) => escapeRegex(token))
    .join("\\s+");
  const matcher = new RegExp(
    `(^|${tokenBoundaryClass})(${escaped})(?=$|${tokenBoundaryClass})`,
    "iu"
  );
  const match = matcher.exec(normalizedText);
  if (match === null || match.index < 0) {
    return undefined;
  }
  const leftBoundaryLength = (match[1] ?? "").length;
  return match.index + leftBoundaryLength;
}

function detectClaimClasses(summary: string): {
  claimClassesDetected: RuntimeClaimClass[];
  matchedClaimTriggers: string[];
} {
  const normalizedSummary = normalizeClaimText(summary);
  if (normalizedSummary.length === 0) {
    return {
      claimClassesDetected: [],
      matchedClaimTriggers: []
    };
  }

  const claimClassesDetected: RuntimeClaimClass[] = [];
  const matchedClaimTriggers: string[] = [];
  const seenTriggers = new Set<string>();

  for (const claimClass of claimClassOrder) {
    const triggers = claimTriggerCatalog[claimClass];
    const matched = triggers
      .map((trigger, triggerOrder) => ({
        trigger,
        triggerOrder,
        index: findFirstTriggerIndex(normalizedSummary, trigger)
      }))
      .filter((entry): entry is { trigger: string; triggerOrder: number; index: number } =>
        entry.index !== undefined
      )
      .sort((left, right) => {
        if (left.index !== right.index) {
          return left.index - right.index;
        }
        return left.triggerOrder - right.triggerOrder;
      });

    if (matched.length === 0) {
      continue;
    }

    claimClassesDetected.push(claimClass);
    for (const entry of matched) {
      if (seenTriggers.has(entry.trigger)) {
        continue;
      }
      seenTriggers.add(entry.trigger);
      matchedClaimTriggers.push(entry.trigger);
    }
  }

  return {
    claimClassesDetected,
    matchedClaimTriggers
  };
}

function serializeClaimClasses(claimClasses: RuntimeClaimClass[]): string {
  if (claimClasses.length === 0) {
    return "none";
  }
  return claimClasses.join(",");
}

function normalizeVerifierOriginReason(input: string | undefined): string {
  if (typeof input !== "string") {
    return "unknown";
  }
  const trimmed = input.trim();
  return trimmed.length > 0 ? trimmed : "unknown";
}

export function evaluateSummaryVerifierConsistencyGate(
  input: SummaryVerifierConsistencyGateDecisionInput
): SummaryVerifierConsistencyGateDecisionRecord {
  const reviewArtifactType = normalizeReviewArtifactType(input.reviewArtifactType);
  const verifierStatus = normalizeVerifierStatus(input.verifierStatus);

  if (reviewArtifactType !== "document") {
    return {
      gate_decision: "not_applicable",
      reason_code: "not_applicable_non_docs",
      review_artifact_type: reviewArtifactType,
      verifier_status: verifierStatus,
      claim_classes_detected: "none",
      matched_claim_triggers: []
    };
  }

  const detected = detectClaimClasses(input.summary);
  const claimClassesDetected = serializeClaimClasses(detected.claimClassesDetected);

  if (detected.claimClassesDetected.length === 0) {
    return {
      gate_decision: "allow",
      reason_code: "no_claim_in_docs_only",
      review_artifact_type: "document",
      verifier_status: verifierStatus,
      claim_classes_detected: claimClassesDetected,
      matched_claim_triggers: []
    };
  }

  if (verifierStatus === "trusted") {
    return {
      gate_decision: "allow",
      reason_code: "claim_verified",
      review_artifact_type: "document",
      verifier_status: "trusted",
      claim_classes_detected: claimClassesDetected,
      matched_claim_triggers: detected.matchedClaimTriggers
    };
  }

  return {
    gate_decision: "block",
    reason_code: "summary_verifier_mismatch",
    review_artifact_type: "document",
    verifier_status: "untrusted",
    claim_classes_detected: claimClassesDetected,
    matched_claim_triggers: detected.matchedClaimTriggers,
    verifier_origin_reason: normalizeVerifierOriginReason(input.verifierOriginReason)
  };
}

export function resolveSummaryVerifierConsistencyGateArtifactPath(artifactsDir: string): string {
  return join(artifactsDir, "summary-verifier-consistency-gate.json");
}

export async function writeSummaryVerifierConsistencyGateArtifact(
  artifactPath: string,
  artifact: SummaryVerifierConsistencyGateArtifact
): Promise<void> {
  await mkdir(dirname(artifactPath), { recursive: true });
  await writeFile(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
}
