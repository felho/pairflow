import { readFile } from "node:fs/promises";

import type { BubbleConfig, BubbleFailingGate } from "../../../types/bubble.js";
import type { Finding } from "../../../types/findings.js";
import {
  createDocContractGateArtifact,
  type DocContractGateArtifact,
  evaluateReviewerGateWarnings,
  isDocContractGateScopeActive,
  mergeArtifactWithReviewerEvaluation,
  readDocContractGateArtifact,
  resolveDocContractGateArtifactPath,
  writeDocContractGateArtifact
} from "../../../core/gates/docContractGates.js";

export interface UpdateReviewerDocGateArtifactInput {
  now: Date;
  bubbleConfig: BubbleConfig;
  artifactsDir: string;
  taskArtifactPath: string;
  round: number;
  findings: Finding[];
  reviewerEvaluation?: ReturnType<typeof evaluateReviewerGateWarnings>;
  createError: (message: string) => Error;
}

export function createDocGateReadFailureWarning(input: {
  artifactPath: string;
  reason: string;
}): BubbleFailingGate {
  return {
    gate_id: "review.serialization",
    reason_code: "STATUS_GATE_SERIALIZATION_WARNING",
    message:
      `Doc gate artifact could not be read during reviewer PASS; preserving advisory fail-open with reset gate baseline. reason=${input.reason}`,
    priority: "P2",
    timing: "later-hardening",
    layer: "L1",
    signal_level: "warning",
    evidence_refs: [input.artifactPath]
  };
}

export function extractTaskContentFromTaskArtifact(taskArtifactContent: string): string {
  const match = /^# Bubble Task\r?\n\r?\nSource: [^\n]*\r?\n\r?\n([\s\S]*)$/u
    .exec(taskArtifactContent);
  if (match?.[1] !== undefined) {
    return match[1].trimEnd();
  }
  return taskArtifactContent;
}

export async function updateReviewerDocGateArtifact(
  input: UpdateReviewerDocGateArtifactInput
): Promise<string | undefined> {
  if (
    !isDocContractGateScopeActive({
      reviewArtifactType: input.bubbleConfig.review_artifact_type
    })
  ) {
    return undefined;
  }

  const gateArtifactPath = resolveDocContractGateArtifactPath(
    input.artifactsDir
  );
  let baseArtifact: DocContractGateArtifact | undefined;
  let gateReadWarning: BubbleFailingGate | undefined;
  try {
    baseArtifact = await readDocContractGateArtifact(gateArtifactPath);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    gateReadWarning = createDocGateReadFailureWarning({
      artifactPath: gateArtifactPath,
      reason
    });
  }
  let fallbackArtifact: DocContractGateArtifact | undefined;
  if (baseArtifact === undefined) {
    fallbackArtifact = createDocContractGateArtifact({
      now: input.now,
      bubbleConfig: input.bubbleConfig,
      taskContent: ""
    });
    const taskArtifactContent = await readFile(
      input.taskArtifactPath,
      "utf8"
    ).catch(() => undefined);
    if (taskArtifactContent !== undefined) {
      fallbackArtifact.task_warnings = createDocContractGateArtifact({
        now: input.now,
        bubbleConfig: input.bubbleConfig,
        taskContent: extractTaskContentFromTaskArtifact(taskArtifactContent)
      }).task_warnings;
    }
    if (gateReadWarning !== undefined) {
      fallbackArtifact.config_warnings = [
        ...fallbackArtifact.config_warnings,
        gateReadWarning
      ];
    }
  }
  const reviewEvaluation =
    input.reviewerEvaluation
    ?? evaluateReviewerGateWarnings({
      round: input.round,
      findings: input.findings,
      roundGateAppliesAfter:
        input.bubbleConfig.doc_contract_gates.round_gate_applies_after
    });
  const artifactForMerge = baseArtifact ?? fallbackArtifact;
  if (artifactForMerge === undefined) {
    // reason_code=DOC_GATE_ARTIFACT_FALLBACK_INVARIANT_VIOLATED context=reviewer_doc_gate_artifact_updater
    throw input.createError(
      "Doc gate artifact fallback invariant violated during reviewer PASS."
    );
  }
  const nextArtifact = mergeArtifactWithReviewerEvaluation({
    now: input.now,
    artifact: artifactForMerge,
    reviewerEvaluation: reviewEvaluation
  });
  try {
    await writeDocContractGateArtifact(gateArtifactPath, nextArtifact);
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }

  return undefined;
}
