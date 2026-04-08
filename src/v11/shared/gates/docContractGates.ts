import type {
  BubbleConfig,
  BubbleFailingGate,
  BubbleRoundGateState,
  BubbleSpecLockState
} from "../../../types/bubble.js";
import {
  type Finding,
  type FindingLayer,
  type FindingPriority,
  type FindingTiming
} from "../../../types/findings.js";
import { isNonEmptyString } from "../validation/primitives.js";
import {
  docContractGateArtifactSchemaVersion,
  type DocContractGateArtifact
} from "./docContractGateArtifactContract.js";
import { normalizeDocContractGateArtifact as normalizeDocContractGateArtifactRecord } from "./docContractGateArtifactNormalization.js";
import {
  evaluateReviewerFinding,
  type GateFindingEvaluation
} from "./docContractReviewerGateEvaluation.js";

export {
  DocContractGateArtifactError,
  docContractGateArtifactSchemaVersion
} from "./docContractGateArtifactContract.js";
export type { DocContractGateArtifact } from "./docContractGateArtifactContract.js";

export interface EvaluateReviewerGateInput {
  round: number;
  findings: Finding[];
  roundGateAppliesAfter: number;
}

export interface EvaluateReviewerGateResult {
  warnings: BubbleFailingGate[];
  findingEvaluations: GateFindingEvaluation[];
  normalizedFindings: Finding[];
  roundGateState: BubbleRoundGateState;
  specLockState: BubbleSpecLockState;
}

export function isDocContractGateScopeActive(input: {
  reviewArtifactType: BubbleConfig["review_artifact_type"];
}): boolean {
  return input.reviewArtifactType === "document";
}

function defaultSpecLockState(): BubbleSpecLockState {
  return {
    state: "IMPLEMENTABLE",
    open_blocker_count: 0,
    open_required_now_count: 0
  };
}

function defaultRoundGateState(round: number): BubbleRoundGateState {
  return {
    applies: false,
    violated: false,
    round
  };
}

function createGateWarning(input: {
  gateId: string;
  reasonCode: BubbleFailingGate["reason_code"];
  message: string;
  priority?: FindingPriority | undefined;
  timing?: FindingTiming | undefined;
  layer?: FindingLayer | undefined;
  evidenceRefs?: string[] | undefined;
  effectivePriority?: FindingPriority | undefined;
}): BubbleFailingGate {
  const warning: BubbleFailingGate = {
    gate_id: input.gateId,
    reason_code: input.reasonCode,
    message: input.message,
    priority: input.priority ?? "P2",
    timing: input.timing ?? "later-hardening",
    signal_level: "warning"
  };
  if (input.layer !== undefined) {
    warning.layer = input.layer;
  }
  if (input.evidenceRefs !== undefined && input.evidenceRefs.length > 0) {
    warning.evidence_refs = input.evidenceRefs;
  }
  if (input.effectivePriority !== undefined) {
    warning.effective_priority = input.effectivePriority;
  }
  return warning;
}

function parseFrontmatter(content: string): {
  fields: Map<string, string>;
  body: string;
} | undefined {
  const lines = content.split(/\r?\n/u);
  const firstContentLineIndex = lines.findIndex((line) => line.trim().length > 0);
  if (firstContentLineIndex === -1) {
    return undefined;
  }
  if (lines[firstContentLineIndex]?.trim() !== "---") {
    return undefined;
  }
  const startIndex = firstContentLineIndex;

  const endOffset = lines.slice(startIndex + 1).findIndex((line) => line.trim() === "---");
  if (endOffset === -1) {
    return undefined;
  }
  const endIndex = startIndex + 1 + endOffset;
  const frontmatterLines = lines.slice(startIndex + 1, endIndex);
  const bodyLines = lines.slice(endIndex + 1);
  const fields = new Map<string, string>();
  for (const line of frontmatterLines) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith("#")) {
      continue;
    }
    const separatorIndex = trimmed.indexOf(":");
    if (separatorIndex <= 0) {
      continue;
    }
    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    if (key.length === 0) {
      continue;
    }
    fields.set(key, value);
  }
  return {
    fields,
    body: bodyLines.join("\n")
  };
}

function hasSectionWithContent(body: string, level: "L0" | "L1"): boolean {
  const lines = body.split(/\r?\n/u);
  const sectionMatcher = new RegExp(`^##\\s+${level}\\b`, "u");
  const anyLMatcher = /^##\s+L[0-9]\b/u;
  const startIndex = lines.findIndex((line) => sectionMatcher.test(line.trim()));
  if (startIndex === -1) {
    return false;
  }

  const contentLines: string[] = [];
  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const trimmed = lines[index]?.trim() ?? "";
    if (anyLMatcher.test(trimmed)) {
      break;
    }
    contentLines.push(trimmed);
  }

  return contentLines.some((line) => line.length > 0);
}

function hasNonEmptyFrontmatterField(
  fields: Map<string, string>,
  key: string
): boolean {
  const value = fields.get(key);
  return value !== undefined && value.trim().length > 0;
}

export function evaluateTaskContractWarnings(taskContent: string): BubbleFailingGate[] {
  const trimmed = taskContent.trim();
  if (trimmed.length === 0) {
    return [];
  }

  const lines = taskContent.split(/\r?\n/u);
  const firstContentLineIndex = lines.findIndex((line) => line.trim().length > 0);
  const startsWithFrontmatter =
    firstContentLineIndex !== -1 && lines[firstContentLineIndex]?.trim() === "---";
  const hasContractCue = /(?:^|\n)(artifact_type|artifact_id|status|prd_ref|phase|plan_ref|system_context_ref|title|target_files|normative_refs|owners)\s*:/u
    .test(trimmed);
  const looksLikeStructuredTask = startsWithFrontmatter && hasContractCue;
  if (!looksLikeStructuredTask) {
    return [];
  }

  const parsed = parseFrontmatter(taskContent);
  if (parsed === undefined) {
    return [
      createGateWarning({
        gateId: "task_contract.minimum_presence",
        reasonCode: "DOC_CONTRACT_PARSE_WARNING",
        message:
          "Task contract frontmatter could not be parsed; Phase 1 gate remains advisory.",
        layer: "L0"
      })
    ];
  }

  const missingRequired = [
    "artifact_type",
    "artifact_id",
    "status",
    "prd_ref",
    "plan_ref",
    "system_context_ref",
    "phase"
  ].filter((key) => !hasNonEmptyFrontmatterField(parsed.fields, key));
  const missingExtension = [
    "title"
  ].filter((key) => !hasNonEmptyFrontmatterField(parsed.fields, key)).concat([
    "target_files",
    "normative_refs",
    "owners"
  ].filter((key) => !parsed.fields.has(key)));
  const missingLevels: string[] = [];
  if (!hasSectionWithContent(parsed.body, "L0")) {
    missingLevels.push("L0");
  }
  if (!hasSectionWithContent(parsed.body, "L1")) {
    missingLevels.push("L1");
  }

  if (
    missingRequired.length === 0
    && missingExtension.length === 0
    && missingLevels.length === 0
  ) {
    return [];
  }

  const parts: string[] = [];
  if (missingRequired.length > 0) {
    parts.push(`missing required frontmatter: ${missingRequired.join(", ")}`);
  }
  if (missingExtension.length > 0) {
    parts.push(`missing phase1 extension fields: ${missingExtension.join(", ")}`);
  }
  if (missingLevels.length > 0) {
    parts.push(`missing level sections with content: ${missingLevels.join(", ")}`);
  }

  return [
    createGateWarning({
      gateId: "task_contract.minimum_presence",
      reasonCode: "DOC_CONTRACT_PARSE_WARNING",
      message: `Task contract advisory gate: ${parts.join("; ")}.`,
      layer: "L0"
    })
  ];
}

function dedupeWarnings(warnings: BubbleFailingGate[]): BubbleFailingGate[] {
  const seen = new Set<string>();
  const deduped: BubbleFailingGate[] = [];
  for (const warning of warnings) {
    const key = `${warning.gate_id}|${warning.reason_code}|${warning.message}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(warning);
  }
  return deduped;
}

function computeSpecLockState(
  findings: GateFindingEvaluation[]
): BubbleSpecLockState {
  let openBlockerCount = 0;
  let openRequiredNowCount = 0;

  for (const finding of findings) {
    if (finding.effective_timing === "required-now") {
      openRequiredNowCount += 1;
    }

    if (
      finding.effective_timing === "required-now"
      && (finding.effective_priority === "P0" || finding.effective_priority === "P1")
      && finding.layer === "L1"
    ) {
      openBlockerCount += 1;
    }
  }

  return {
    state: openBlockerCount > 0 ? "LOCKED" : "IMPLEMENTABLE",
    open_blocker_count: openBlockerCount,
    open_required_now_count: openRequiredNowCount
  };
}

export function evaluateReviewerGateWarnings(
  input: EvaluateReviewerGateInput
): EvaluateReviewerGateResult {
  const warnings: BubbleFailingGate[] = [];
  const findingEvaluations: GateFindingEvaluation[] = [];
  const normalizedFindings: Finding[] = [];
  const roundGateApplies = input.round > input.roundGateAppliesAfter;
  let roundGateViolated = false;

  input.findings.forEach((finding, index) => {
    const evaluated = evaluateReviewerFinding({
      round: input.round,
      finding,
      index,
      roundGateAppliesAfter: input.roundGateAppliesAfter
    });
    warnings.push(...evaluated.warnings);
    findingEvaluations.push(evaluated.findingEvaluation);
    normalizedFindings.push(evaluated.normalizedFinding);
    roundGateViolated = roundGateViolated || evaluated.roundGateViolated;
  });

  if (roundGateApplies && roundGateViolated) {
    warnings.push(
      createGateWarning({
        gateId: "review_round.policy",
        reasonCode: "ROUND_GATE_WARNING",
        message:
          `Round gate policy violated in round ${input.round}; non-blocker required-now findings were auto-demoted.`,
        priority: "P2",
        timing: "later-hardening",
        layer: "L1"
      })
    );
  }

  const roundGateState: BubbleRoundGateState = {
    applies: roundGateApplies,
    violated: roundGateViolated,
    round: input.round,
    ...(roundGateViolated ? { reason_code: "ROUND_GATE_WARNING" } : {})
  };

  const dedupedWarnings = dedupeWarnings(warnings);
  const specLockState = computeSpecLockState(findingEvaluations);

  return {
    warnings: dedupedWarnings,
    findingEvaluations,
    normalizedFindings,
    roundGateState,
    specLockState
  };
}

export function createDocContractGateArtifact(input: {
  now: Date;
  bubbleConfig: BubbleConfig;
  taskContent: string;
}): DocContractGateArtifact {
  const configWarnings: BubbleFailingGate[] = [];
  if (isNonEmptyString(input.bubbleConfig.doc_contract_gates.parse_warning)) {
    configWarnings.push(
      createGateWarning({
        gateId: "config.doc_contract_gates",
        reasonCode: "GATE_CONFIG_PARSE_WARNING",
        message: input.bubbleConfig.doc_contract_gates.parse_warning.trim(),
        layer: "L0"
      })
    );
  }

  return {
    schema_version: docContractGateArtifactSchemaVersion,
    updated_at: input.now.toISOString(),
    task_warnings: evaluateTaskContractWarnings(input.taskContent),
    config_warnings: configWarnings,
    review_warnings: [],
    finding_evaluations: [],
    round_gate_state: defaultRoundGateState(1),
    spec_lock_state: defaultSpecLockState()
  };
}
export function normalizeDocContractGateArtifact(raw: unknown): DocContractGateArtifact {
  return normalizeDocContractGateArtifactRecord(raw);
}

export function mergeArtifactWithReviewerEvaluation(input: {
  now: Date;
  artifact: DocContractGateArtifact;
  reviewerEvaluation: EvaluateReviewerGateResult;
}): DocContractGateArtifact {
  return {
    ...input.artifact,
    updated_at: input.now.toISOString(),
    review_warnings: input.reviewerEvaluation.warnings,
    finding_evaluations: input.reviewerEvaluation.findingEvaluations,
    round_gate_state: input.reviewerEvaluation.roundGateState,
    spec_lock_state: input.reviewerEvaluation.specLockState
  };
}

export function collectFailingGatesFromArtifact(
  artifact: DocContractGateArtifact
): BubbleFailingGate[] {
  return [
    ...artifact.task_warnings,
    ...artifact.config_warnings,
    ...artifact.review_warnings
  ];
}
