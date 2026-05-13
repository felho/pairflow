import type { AgentRole } from "../../../src/contracts/kernel/agentIdentity.js";
import {
  isPassIntent,
  type PassIntent
} from "../../../src/contracts/kernel/protocol.js";
import type { Finding } from "../../../src/contracts/kernel/findings.js";
import { isLikelyStructuredRef } from "../../../src/v11/shared/reference/structuredRef.js";
import {
  isMetaReviewRecommendation,
  type MetaReviewRecommendation
} from "../../../src/v11/shared/metaReview/metaReviewTypes.js";

export type SmokeScenarioStepKind =
  | "pass"
  | "human_question"
  | "convergence"
  | "meta_review_result";

export interface SmokeScenarioStepBase {
  kind: SmokeScenarioStepKind;
  label?: string;
  refs?: string[];
  expectedRole?: AgentRole;
  expectedRound?: number;
  expectedStateFingerprint?: string;
}

export interface SmokePassStep extends SmokeScenarioStepBase {
  kind: "pass";
  summary: string;
  intent?: PassIntent;
  findings?: Finding[];
  noFindings?: boolean;
}

export interface SmokeHumanQuestionStep extends SmokeScenarioStepBase {
  kind: "human_question";
  question: string;
}

export interface SmokeConvergenceFinding {
  severity: "P2" | "P3";
  title: string;
  refs?: string[];
}

export interface SmokeConvergenceStep extends SmokeScenarioStepBase {
  kind: "convergence";
  summary: string;
  findings?: SmokeConvergenceFinding[];
}

export interface SmokeMetaReviewResultStep extends SmokeScenarioStepBase {
  kind: "meta_review_result";
  round: number;
  recommendation: MetaReviewRecommendation;
  summary: string;
  reworkTargetMessage?: string | null;
  reportJson: Record<string, unknown>;
}

export type SmokeScenarioStep =
  | SmokePassStep
  | SmokeHumanQuestionStep
  | SmokeConvergenceStep
  | SmokeMetaReviewResultStep;

export interface SmokeScenario {
  id: string;
  steps: SmokeScenarioStep[];
}

const stepKinds = new Set<SmokeScenarioStepKind>([
  "pass",
  "human_question",
  "convergence",
  "meta_review_result"
]);

const commonFields = new Map<string, string>([
  ["kind", "kind"],
  ["label", "label"],
  ["refs", "refs"],
  ["expectedRole", "expectedRole"],
  ["expected_role", "expectedRole"],
  ["expectedRound", "expectedRound"],
  ["expected_round", "expectedRound"],
  ["expectedStateFingerprint", "expectedStateFingerprint"],
  ["expected_state_fingerprint", "expectedStateFingerprint"]
]);

const kindFields: Record<SmokeScenarioStepKind, Map<string, string>> = {
  pass: new Map([
    ["summary", "summary"],
    ["intent", "intent"],
    ["findings", "findings"],
    ["noFindings", "noFindings"],
    ["no_findings", "noFindings"]
  ]),
  human_question: new Map([
    ["question", "question"]
  ]),
  convergence: new Map([
    ["summary", "summary"],
    ["findings", "findings"]
  ]),
  meta_review_result: new Map([
    ["round", "round"],
    ["recommendation", "recommendation"],
    ["summary", "summary"],
    ["reworkTargetMessage", "reworkTargetMessage"],
    ["rework_target_message", "reworkTargetMessage"],
    ["reportJson", "reportJson"],
    ["report_json", "reportJson"]
  ])
};

const findingFields = new Map<string, string>([
  ["title", "title"],
  ["severity", "severity"],
  ["priority", "severity"],
  ["refs", "refs"]
]);

export class SmokeScenarioValidationError extends Error {
  public constructor(message: string) {
    super(`SMOKE_SCENARIO_INVALID: ${message}`);
    this.name = "SmokeScenarioValidationError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertJsonCompatible(
  value: unknown,
  field: string,
  context: string,
  seen: WeakSet<object>
): void {
  if (
    value === null
    || typeof value === "string"
    || typeof value === "boolean"
  ) {
    return;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new SmokeScenarioValidationError(
        `${context}.${field} must not contain non-finite numbers.`
      );
    }
    return;
  }
  if (Array.isArray(value)) {
    if (seen.has(value)) {
      throw new SmokeScenarioValidationError(
        `${context}.${field} must not contain circular references.`
      );
    }
    seen.add(value);
    value.forEach((item, index) => {
      assertJsonCompatible(item, `${field}[${index}]`, context, seen);
    });
    seen.delete(value);
    return;
  }
  if (isRecord(value)) {
    const prototype: unknown = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new SmokeScenarioValidationError(
        `${context}.${field} must contain only JSON object values.`
      );
    }
    if (seen.has(value)) {
      throw new SmokeScenarioValidationError(
        `${context}.${field} must not contain circular references.`
      );
    }
    seen.add(value);
    for (const [key, item] of Object.entries(value)) {
      assertJsonCompatible(item, `${field}.${key}`, context, seen);
    }
    seen.delete(value);
    return;
  }
  throw new SmokeScenarioValidationError(
    `${context}.${field} must not contain values that JSON would drop or rewrite.`
  );
}

function cloneJsonObject(
  value: unknown,
  field: string,
  context: string
): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new SmokeScenarioValidationError(
      `${context}.${field} must be an object.`
    );
  }
  assertJsonCompatible(value, field, context, new WeakSet<object>());
  try {
    const encoded = JSON.stringify(value);
    if (encoded === undefined) {
      throw new Error("JSON.stringify returned undefined");
    }
    const decoded: unknown = JSON.parse(encoded);
    if (!isRecord(decoded)) {
      throw new Error("decoded JSON value is not an object");
    }
    return decoded;
  } catch {
    throw new SmokeScenarioValidationError(
      `${context}.${field} must be a JSON-serializable object.`
    );
  }
}

function normalizeObjectKeys(
  value: Record<string, unknown>,
  fieldMap: Map<string, string>,
  context: string
): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};
  for (const [rawKey, rawValue] of Object.entries(value)) {
    const logicalKey = fieldMap.get(rawKey);
    if (logicalKey === undefined) {
      throw new SmokeScenarioValidationError(
        `${context} has unknown field '${rawKey}'.`
      );
    }
    if (Object.hasOwn(normalized, logicalKey)) {
      throw new SmokeScenarioValidationError(
        `${context} has duplicate logical field '${logicalKey}'.`
      );
    }
    normalized[logicalKey] = rawValue;
  }
  return normalized;
}

function requiredText(value: unknown, field: string, context: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new SmokeScenarioValidationError(
      `${context}.${field} must be a non-empty string.`
    );
  }
  return value.trim();
}

function optionalText(
  value: unknown,
  field: string,
  context: string
): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  return requiredText(value, field, context);
}

function optionalNullableText(
  value: unknown,
  field: string,
  context: string
): string | null | undefined {
  if (value === undefined || value === null) {
    return value;
  }
  return requiredText(value, field, context);
}

function optionalRefs(
  value: unknown,
  field: string,
  context: string
): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!Array.isArray(value)) {
    throw new SmokeScenarioValidationError(
      `${context}.${field} must be an array.`
    );
  }
  if (value.length === 0) {
    throw new SmokeScenarioValidationError(
      `${context}.${field} must contain at least one ref when provided.`
    );
  }
  return value.map((ref, index) =>
    requiredText(ref, `${field}[${index}]`, context)
  );
}

function assertCliFindingToken(value: string, field: string, context: string): void {
  if (value.includes("|")) {
    throw new SmokeScenarioValidationError(
      `${context}.${field} must not contain '|', which is reserved by pairflow agent emit --finding.`
    );
  }
}

function assertCliFindingRefs(refs: string[] | undefined, field: string, context: string): void {
  if (refs === undefined) {
    return;
  }
  for (const [index, ref] of refs.entries()) {
    assertCliFindingToken(ref, `${field}[${index}]`, context);
  }
  if (refs.length > 1 && refs.some((ref) => !isLikelyStructuredRef(ref))) {
    throw new SmokeScenarioValidationError(
      `${context}.${field} must contain only path-like or URI-like refs when multiple finding refs are provided.`
    );
  }
}

function optionalBoolean(
  value: unknown,
  field: string,
  context: string
): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "boolean") {
    throw new SmokeScenarioValidationError(
      `${context}.${field} must be a boolean.`
    );
  }
  return value;
}

function requiredPositiveInteger(
  value: unknown,
  field: string,
  context: string
): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    throw new SmokeScenarioValidationError(
      `${context}.${field} must be a positive integer.`
    );
  }
  return value;
}

function optionalPositiveInteger(
  value: unknown,
  field: string,
  context: string
): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  return requiredPositiveInteger(value, field, context);
}

function optionalAgentRole(
  value: unknown,
  field: string,
  context: string
): AgentRole | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (
    value === "implementer"
    || value === "reviewer"
    || value === "meta_reviewer"
  ) {
    return value;
  }
  throw new SmokeScenarioValidationError(
    `${context}.${field} must be implementer, reviewer, or meta_reviewer.`
  );
}

function optionalFindings(
  value: unknown,
  context: string
): Finding[] | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!Array.isArray(value)) {
    throw new SmokeScenarioValidationError(
      `${context}.findings must be an array.`
    );
  }
  return value.map((finding, index) => {
    if (!isRecord(finding)) {
      throw new SmokeScenarioValidationError(
        `${context}.findings[${index}] must be an object.`
      );
    }
    const normalizedFinding = normalizeObjectKeys(
      finding,
      findingFields,
      `${context}.findings[${index}]`
    );
    const title = requiredText(
      normalizedFinding.title,
      `findings[${index}].title`,
      context
    );
    assertCliFindingToken(title, `findings[${index}].title`, context);
    const severity = normalizedFinding.severity;
    if (
      severity !== "P0"
      && severity !== "P1"
      && severity !== "P2"
      && severity !== "P3"
    ) {
      throw new SmokeScenarioValidationError(
        `${context}.findings[${index}].severity must be P0, P1, P2, or P3.`
      );
    }
    const refs = optionalRefs(
      normalizedFinding.refs,
      `findings[${index}].refs`,
      context
    );
    assertCliFindingRefs(refs, `findings[${index}].refs`, context);
    return {
      title,
      ...(refs !== undefined ? { refs } : {}),
      severity,
      priority: severity
    } as Finding;
  });
}

function optionalConvergenceFindings(
  value: unknown,
  context: string
): SmokeConvergenceFinding[] | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!Array.isArray(value)) {
    throw new SmokeScenarioValidationError(
      `${context}.findings must be an array.`
    );
  }
  return value.map((finding, index) => {
    if (!isRecord(finding)) {
      throw new SmokeScenarioValidationError(
        `${context}.findings[${index}] must be an object.`
      );
    }
    const normalizedFinding = normalizeObjectKeys(
      finding,
      findingFields,
      `${context}.findings[${index}]`
    );
    if (
      normalizedFinding.severity !== "P2"
      && normalizedFinding.severity !== "P3"
    ) {
      throw new SmokeScenarioValidationError(
        `${context}.findings[${index}].severity must be P2 or P3.`
      );
    }
    const normalized: SmokeConvergenceFinding = {
      severity: normalizedFinding.severity,
      title: requiredText(
        normalizedFinding.title,
        `findings[${index}].title`,
        context
      )
    };
    assertCliFindingToken(normalized.title, `findings[${index}].title`, context);
    const refs = optionalRefs(
      normalizedFinding.refs,
      `findings[${index}].refs`,
      context
    );
    assertCliFindingRefs(refs, `findings[${index}].refs`, context);
    if (refs !== undefined) {
      normalized.refs = refs;
    }
    return normalized;
  });
}

function commonStepFields(
  rawStep: Record<string, unknown>,
  context: string
): Omit<SmokeScenarioStepBase, "kind"> {
  const base: Omit<SmokeScenarioStepBase, "kind"> = {};
  const label = optionalText(rawStep.label, "label", context);
  const refs = optionalRefs(rawStep.refs, "refs", context);
  const expectedRole = optionalAgentRole(
    rawStep.expectedRole,
    "expectedRole",
    context
  );
  const expectedRound = optionalPositiveInteger(
    rawStep.expectedRound,
    "expectedRound",
    context
  );
  const expectedStateFingerprint = optionalText(
    rawStep.expectedStateFingerprint,
    "expectedStateFingerprint",
    context
  );
  if (label !== undefined) {
    base.label = label;
  }
  if (refs !== undefined) {
    base.refs = refs;
  }
  if (expectedRole !== undefined) {
    base.expectedRole = expectedRole;
  }
  if (expectedRound !== undefined) {
    base.expectedRound = expectedRound;
  }
  if (expectedStateFingerprint !== undefined) {
    base.expectedStateFingerprint = expectedStateFingerprint;
  }
  return base;
}

function normalizeStep(raw: unknown, index: number): SmokeScenarioStep {
  const context = `steps[${index}]`;
  if (!isRecord(raw)) {
    throw new SmokeScenarioValidationError(`${context} must be an object.`);
  }
  const rawKind = raw.kind;
  if (typeof rawKind !== "string" || !stepKinds.has(rawKind as SmokeScenarioStepKind)) {
    throw new SmokeScenarioValidationError(
      `${context}.kind must be one of: ${Array.from(stepKinds).join(", ")}.`
    );
  }
  const kind = rawKind as SmokeScenarioStepKind;
  const fieldMap = new Map([...commonFields, ...kindFields[kind]]);
  const step = normalizeObjectKeys(raw, fieldMap, context);
  const base = commonStepFields(step, context);

  if (kind === "pass") {
    const intent = step.intent;
    if (intent !== undefined && !isPassIntent(intent)) {
      throw new SmokeScenarioValidationError(
        `${context}.intent must be task, review, or fix_request.`
      );
    }
    const normalized: SmokePassStep = {
      kind,
      ...base,
      summary: requiredText(step.summary, "summary", context)
    };
    const findings = optionalFindings(step.findings, context);
    const noFindings = optionalBoolean(step.noFindings, "noFindings", context);
    if (intent !== undefined) {
      normalized.intent = intent;
    }
    if (findings !== undefined) {
      if (findings.length > 0 && noFindings === true) {
        throw new SmokeScenarioValidationError(
          `${context} cannot combine findings with noFindings.`
        );
      }
      normalized.findings = findings;
    }
    if (noFindings !== undefined) {
      normalized.noFindings = noFindings;
    }
    return normalized;
  }

  if (kind === "human_question") {
    return {
      kind,
      ...base,
      question: requiredText(step.question, "question", context)
    };
  }

  if (kind === "convergence") {
    const normalized: SmokeConvergenceStep = {
      kind,
      ...base,
      summary: requiredText(step.summary, "summary", context)
    };
    const findings = optionalConvergenceFindings(step.findings, context);
    if (findings !== undefined) {
      normalized.findings = findings;
    }
    return normalized;
  }

  const reportJson = cloneJsonObject(step.reportJson, "reportJson", context);
  if (!isMetaReviewRecommendation(step.recommendation)) {
    throw new SmokeScenarioValidationError(
      `${context}.recommendation must be approve, rework, or inconclusive.`
    );
  }
  const normalized: SmokeMetaReviewResultStep = {
    kind,
    ...base,
    round: requiredPositiveInteger(step.round, "round", context),
    recommendation: step.recommendation,
    summary: requiredText(step.summary, "summary", context),
    reportJson
  };
  const reworkTargetMessage = optionalNullableText(
    step.reworkTargetMessage,
    "reworkTargetMessage",
    context
  );
  if (reworkTargetMessage !== undefined && reworkTargetMessage !== null) {
    normalized.reworkTargetMessage = reworkTargetMessage;
  }
  return normalized;
}

export function normalizeSmokeScenario(input: unknown): SmokeScenario {
  if (!isRecord(input)) {
    throw new SmokeScenarioValidationError("scenario must be an object.");
  }
  const scenario = normalizeObjectKeys(
    input,
    new Map([
      ["id", "id"],
      ["steps", "steps"]
    ]),
    "scenario"
  );
  const id = requiredText(scenario.id, "id", "scenario");
  if (!Array.isArray(scenario.steps)) {
    throw new SmokeScenarioValidationError("scenario.steps must be an array.");
  }
  const steps = scenario.steps.map(normalizeStep);
  const labels = new Set<string>();
  for (const [index, step] of steps.entries()) {
    if (step.label === undefined) {
      continue;
    }
    if (labels.has(step.label)) {
      throw new SmokeScenarioValidationError(
        `steps[${index}].label duplicates an earlier scenario step label.`
      );
    }
    labels.add(step.label);
  }
  return {
    id,
    steps
  };
}

export const smokeStep = {
  pass: (input: Omit<SmokePassStep, "kind">): SmokePassStep =>
    normalizeStep({ kind: "pass", ...input }, 0) as SmokePassStep,
  humanQuestion: (
    input: Omit<SmokeHumanQuestionStep, "kind">
  ): SmokeHumanQuestionStep =>
    normalizeStep({ kind: "human_question", ...input }, 0) as SmokeHumanQuestionStep,
  convergence: (
    input: Omit<SmokeConvergenceStep, "kind">
  ): SmokeConvergenceStep =>
    normalizeStep({ kind: "convergence", ...input }, 0) as SmokeConvergenceStep,
  metaReviewResult: (
    input: Omit<SmokeMetaReviewResultStep, "kind">
  ): SmokeMetaReviewResultStep =>
    normalizeStep({ kind: "meta_review_result", ...input }, 0) as SmokeMetaReviewResultStep
};
