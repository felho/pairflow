import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import type {
  BubbleConfig,
  BubbleFailingGate,
  BubbleRoundGateState,
  BubbleSpecLockState
} from "../../types/bubble.js";
import {
  isFindingLayer,
  isFindingPriority,
  isFindingTiming,
  resolveFindingPriority,
  type Finding,
  type FindingLayer,
  type FindingPriority,
  type FindingTiming
} from "../../types/findings.js";
import { isNonEmptyString, isRecord } from "../validation.js";

export const docContractGateArtifactSchemaVersion = 1 as const;

export interface GateFindingEvaluation {
  finding_key: string;
  priority: FindingPriority;
  effective_priority: FindingPriority;
  timing: FindingTiming;
  effective_timing: FindingTiming;
  layer?: FindingLayer;
}

export interface DocContractGateArtifact {
  schema_version: typeof docContractGateArtifactSchemaVersion;
  updated_at: string;
  task_warnings: BubbleFailingGate[];
  config_warnings: BubbleFailingGate[];
  review_warnings: BubbleFailingGate[];
  finding_evaluations: GateFindingEvaluation[];
  round_gate_state: BubbleRoundGateState;
  spec_lock_state: BubbleSpecLockState;
}

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

export class DocContractGateArtifactError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "DocContractGateArtifactError";
  }
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

function normalizeEvidenceRefs(finding: Finding): string[] {
  const refs: string[] = [];
  if (Array.isArray(finding.refs)) {
    for (const ref of finding.refs) {
      if (isNonEmptyString(ref)) {
        refs.push(ref.trim());
      }
    }
  }

  const evidence = finding.evidence;
  if (isNonEmptyString(evidence)) {
    refs.push(evidence.trim());
  } else if (Array.isArray(evidence)) {
    for (const value of evidence) {
      if (isNonEmptyString(value)) {
        refs.push(value.trim());
      }
    }
  }
  return refs;
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
    const findingKey = `r${input.round}:f${index + 1}`;
    const priority = resolveFindingPriority(finding) ?? "P2";
    const timing = isFindingTiming(finding.timing) ? finding.timing : "later-hardening";
    const layer = isFindingLayer(finding.layer) ? finding.layer : undefined;
    const evidenceRefs = normalizeEvidenceRefs(finding);
    const hasPriority = resolveFindingPriority(finding) !== undefined;
    const hasTiming = isFindingTiming(finding.timing);
    const hasLayer = isFindingLayer(finding.layer);
    const hasEvidence = evidenceRefs.length > 0;
    const declaredBlockerPriority = priority === "P0" || priority === "P1";
    const shouldEmitBlockerEvidenceWarning = declaredBlockerPriority && !hasEvidence;
    const shouldDowngradeBlockerLayer =
      declaredBlockerPriority && timing === "required-now" && layer !== "L1";
    let effectivePriority = priority;
    const effectivePriorityReasons: Array<"blocker-evidence" | "blocker-layer"> = [];

    const missingRequiredFields: string[] = [];
    if (!hasPriority) {
      missingRequiredFields.push("priority");
    }
    if (!hasTiming) {
      missingRequiredFields.push("timing");
    }
    if (!hasLayer) {
      missingRequiredFields.push("layer");
    }
    if (!hasEvidence && !shouldEmitBlockerEvidenceWarning) {
      missingRequiredFields.push("evidence");
    }
    if (missingRequiredFields.length > 0) {
      warnings.push(
        createGateWarning({
          gateId: "review_schema.minimum_fields",
          reasonCode: "REVIEW_SCHEMA_WARNING",
          message:
            shouldDowngradeBlockerLayer
              ? `Finding ${findingKey} missing required fields: ${missingRequiredFields.join(", ")}; required-now ${priority} is treated as non-blocking when layer is not L1.`
              : `Finding ${findingKey} missing required fields: ${missingRequiredFields.join(", ")}.`,
          priority,
          timing,
          layer,
          evidenceRefs,
          ...(shouldDowngradeBlockerLayer ? { effectivePriority: "P2" as const } : {})
        })
      );
    }

    if (shouldEmitBlockerEvidenceWarning) {
      effectivePriority = "P2";
      effectivePriorityReasons.push("blocker-evidence");
      warnings.push(
        createGateWarning({
          gateId: "review_schema.blocker_evidence",
          reasonCode: "BLOCKER_EVIDENCE_WARNING",
          message: `Finding ${findingKey} declares ${priority} without blocker-grade evidence; downgraded to effective P2.`,
          priority,
          timing,
          layer,
          effectivePriority: "P2"
        })
      );
    }
    if (shouldDowngradeBlockerLayer) {
      effectivePriority = "P2";
      effectivePriorityReasons.push("blocker-layer");
      if (missingRequiredFields.length === 0) {
        warnings.push(
          createGateWarning({
            gateId: "review_schema.blocker_layer",
            reasonCode: "REVIEW_SCHEMA_WARNING",
            message:
              layer === undefined
                ? `Finding ${findingKey} required-now ${priority} is missing layer L1 and is treated as non-blocking (effective P2).`
                : `Finding ${findingKey} required-now ${priority} uses layer=${layer}; only L1 is blocker-eligible, treated as non-blocking (effective P2).`,
            priority,
            timing,
            layer,
            evidenceRefs,
            effectivePriority: "P2"
          })
        );
      }
    }

    let effectiveTiming = timing;
    if (
      roundGateApplies
      && timing === "required-now"
      && (effectivePriority === "P2" || effectivePriority === "P3")
    ) {
      effectiveTiming = "later-hardening";
      roundGateViolated = true;
      warnings.push(
        createGateWarning({
          gateId: "review_round.autodemote",
          reasonCode: "ROUND_GATE_AUTODEMOTE",
          message:
            effectivePriorityReasons.length === 0
              ? `Finding ${findingKey} auto-demoted from required-now to later-hardening after round ${input.roundGateAppliesAfter}.`
              : `Finding ${findingKey} auto-demoted from required-now to later-hardening after round ${input.roundGateAppliesAfter}; effective non-blocker was already established by ${effectivePriorityReasons.join(" + ")}.`,
          priority,
          timing,
          layer,
          evidenceRefs,
          effectivePriority
        })
      );
    }

    const normalizedFinding: Finding = {
      ...finding,
      priority,
      ...(finding.severity !== undefined ? { severity: priority } : {})
    };
    if (hasTiming || finding.timing !== undefined || effectiveTiming !== timing) {
      normalizedFinding.timing = effectiveTiming;
    }
    if (!hasLayer && finding.layer !== undefined) {
      delete normalizedFinding.layer;
    }
    if (effectivePriority !== priority) {
      normalizedFinding.effective_priority = effectivePriority;
    } else {
      delete normalizedFinding.effective_priority;
    }
    normalizedFindings.push(normalizedFinding);
    findingEvaluations.push({
      finding_key: findingKey,
      priority,
      effective_priority: effectivePriority,
      timing,
      effective_timing: effectiveTiming,
      ...(layer !== undefined ? { layer } : {})
    });
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

function extractRoundFromFindingKey(findingKey: string): number | undefined {
  const match = /^r(?<round>\d+):f\d+$/u.exec(findingKey.trim());
  if (match === null) {
    return undefined;
  }
  const rawRound = match.groups?.["round"];
  if (rawRound === undefined) {
    return undefined;
  }
  const parsedRound = Number.parseInt(rawRound, 10);
  if (!Number.isFinite(parsedRound)) {
    return undefined;
  }
  return Math.max(0, Math.trunc(parsedRound));
}

export function resolveDocContractGateArtifactPath(artifactsDir: string): string {
  return join(artifactsDir, "doc-contract-gates.json");
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

function normalizeWarning(raw: unknown): BubbleFailingGate | undefined {
  if (!isRecord(raw)) {
    return undefined;
  }

  const gateId = raw.gate_id;
  const reasonCode = raw.reason_code;
  const message = raw.message;
  const priority = raw.priority;
  const timing = raw.timing;
  if (
    !isNonEmptyString(gateId)
    || !isNonEmptyString(reasonCode)
    || !isNonEmptyString(message)
    || !isFindingPriority(priority)
    || !isFindingTiming(timing)
  ) {
    return undefined;
  }

  const normalized: BubbleFailingGate = {
    gate_id: gateId.trim(),
    reason_code: reasonCode.trim(),
    message: message.trim(),
    priority,
    timing,
    signal_level: raw.signal_level === "info" ? "info" : "warning"
  };

  if (isFindingLayer(raw.layer)) {
    normalized.layer = raw.layer;
  }
  if (isFindingPriority(raw.effective_priority)) {
    normalized.effective_priority = raw.effective_priority;
  }
  if (Array.isArray(raw.evidence_refs)) {
    const refs = raw.evidence_refs.filter((entry) => isNonEmptyString(entry)).map((entry) => entry.trim());
    if (refs.length > 0) {
      normalized.evidence_refs = refs;
    }
  }

  return normalized;
}

function normalizeFindingEvaluation(raw: unknown): GateFindingEvaluation | undefined {
  if (!isRecord(raw)) {
    return undefined;
  }

  if (
    !isNonEmptyString(raw.finding_key)
    || !isFindingPriority(raw.priority)
    || !isFindingPriority(raw.effective_priority)
    || !isFindingTiming(raw.timing)
    || !isFindingTiming(raw.effective_timing)
  ) {
    return undefined;
  }

  const normalized: GateFindingEvaluation = {
    finding_key: raw.finding_key.trim(),
    priority: raw.priority,
    effective_priority: raw.effective_priority,
    timing: raw.timing,
    effective_timing: raw.effective_timing
  };
  if (isFindingLayer(raw.layer)) {
    normalized.layer = raw.layer;
  }
  return normalized;
}

function normalizeRoundGateState(
  raw: unknown,
  fallbackRound: number
): BubbleRoundGateState {
  if (!isRecord(raw)) {
    return defaultRoundGateState(fallbackRound);
  }

  const round = typeof raw.round === "number" && Number.isFinite(raw.round)
    ? Math.max(0, Math.trunc(raw.round))
    : fallbackRound;
  const applies = raw.applies === true;
  const violated = raw.violated === true;
  const reasonCode = isNonEmptyString(raw.reason_code) ? raw.reason_code.trim() : undefined;
  return {
    applies,
    violated,
    round,
    ...(reasonCode !== undefined ? { reason_code: reasonCode } : {})
  };
}

function normalizeSpecLockState(raw: unknown): BubbleSpecLockState {
  if (!isRecord(raw)) {
    return defaultSpecLockState();
  }

  const openBlockerCount = typeof raw.open_blocker_count === "number" && Number.isFinite(raw.open_blocker_count)
    ? Math.max(0, Math.trunc(raw.open_blocker_count))
    : 0;
  const openRequiredNowCount =
    typeof raw.open_required_now_count === "number" && Number.isFinite(raw.open_required_now_count)
      ? Math.max(0, Math.trunc(raw.open_required_now_count))
      : 0;
  // Enforce LOCKED iff open_blocker_count > 0 when reading persisted artifacts.
  const state = openBlockerCount > 0 ? "LOCKED" : "IMPLEMENTABLE";
  return {
    state,
    open_blocker_count: openBlockerCount,
    open_required_now_count: openRequiredNowCount
  };
}

function normalizeArtifact(raw: unknown): DocContractGateArtifact {
  if (!isRecord(raw)) {
    throw new DocContractGateArtifactError("Doc contract gate artifact must be an object.");
  }

  const taskWarnings = Array.isArray(raw.task_warnings)
    ? raw.task_warnings.map(normalizeWarning).filter((entry): entry is BubbleFailingGate => entry !== undefined)
    : [];
  const configWarnings = Array.isArray(raw.config_warnings)
    ? raw.config_warnings.map(normalizeWarning).filter((entry): entry is BubbleFailingGate => entry !== undefined)
    : [];
  const reviewWarnings = Array.isArray(raw.review_warnings)
    ? raw.review_warnings.map(normalizeWarning).filter((entry): entry is BubbleFailingGate => entry !== undefined)
    : [];
  const findingEvaluations = Array.isArray(raw.finding_evaluations)
    ? raw.finding_evaluations
      .map(normalizeFindingEvaluation)
      .filter((entry): entry is GateFindingEvaluation => entry !== undefined)
    : [];
  const fallbackRound = findingEvaluations.reduce((maxRound, entry) => {
    const round = extractRoundFromFindingKey(entry.finding_key);
    if (round === undefined) {
      return maxRound;
    }
    return Math.max(maxRound, round);
  }, 1);

  const normalizedRoundGate = normalizeRoundGateState(raw.round_gate_state, fallbackRound);
  const normalizedSpecLock = normalizeSpecLockState(raw.spec_lock_state);

  return {
    schema_version: docContractGateArtifactSchemaVersion,
    updated_at: isNonEmptyString(raw.updated_at) ? raw.updated_at : new Date(0).toISOString(),
    task_warnings: taskWarnings,
    config_warnings: configWarnings,
    review_warnings: reviewWarnings,
    finding_evaluations: findingEvaluations,
    round_gate_state: normalizedRoundGate,
    spec_lock_state: normalizedSpecLock
  };
}

export async function readDocContractGateArtifact(
  artifactPath: string
): Promise<DocContractGateArtifact | undefined> {
  const raw = await readFile(artifactPath, "utf8").catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") {
      return undefined;
    }
    throw error;
  });
  if (raw === undefined) {
    return undefined;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new DocContractGateArtifactError(
      `Invalid JSON in doc contract gate artifact: ${error instanceof Error ? error.message : String(error)}`
    );
  }
  return normalizeArtifact(parsed);
}

export async function writeDocContractGateArtifact(
  artifactPath: string,
  artifact: DocContractGateArtifact
): Promise<void> {
  await mkdir(dirname(artifactPath), { recursive: true });
  await writeFile(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
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
