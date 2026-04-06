import { readFile } from "node:fs/promises";

export const REVIEWER_BRIEF_ARTIFACT_FILENAME = "reviewer-brief.md";
export const REVIEWER_FOCUS_ARTIFACT_FILENAME = "reviewer-focus.json";

export type ReviewerFocusReasonCode =
  | "REVIEWER_FOCUS_ABSENT"
  | "REVIEWER_FOCUS_FRONTMATTER_PRECEDENCE"
  | "REVIEWER_FOCUS_INVALID_FRONTMATTER_TYPE"
  | "REVIEWER_FOCUS_FRONTMATTER_PARSE_WARNING"
  | "REVIEWER_FOCUS_EMPTY_FRONTMATTER"
  | "REVIEWER_FOCUS_WHITESPACE_FRONTMATTER_ITEM"
  | "REVIEWER_FOCUS_EMPTY_SECTION"
  | "REVIEWER_FOCUS_MULTIPLE_SECTIONS"
  | "REVIEWER_FOCUS_PARSE_WARNING";

interface ReviewerFocusPresentResult {
  status: "present";
  focus_text: string;
  focus_items?: string[];
  source: "frontmatter" | "section";
  reason_code?: ReviewerFocusReasonCode;
}

interface ReviewerFocusAbsentResult {
  status: "absent";
  source: "none";
  reason_code: ReviewerFocusReasonCode;
}

interface ReviewerFocusInvalidResult {
  status: "invalid";
  source: "frontmatter" | "section" | "none";
  reason_code: ReviewerFocusReasonCode;
}

export type ReviewerFocusExtractionResult =
  | ReviewerFocusPresentResult
  | ReviewerFocusAbsentResult
  | ReviewerFocusInvalidResult;

const reviewerFocusReasonCodes: ReadonlySet<ReviewerFocusReasonCode> = new Set([
  "REVIEWER_FOCUS_ABSENT",
  "REVIEWER_FOCUS_FRONTMATTER_PRECEDENCE",
  "REVIEWER_FOCUS_INVALID_FRONTMATTER_TYPE",
  "REVIEWER_FOCUS_FRONTMATTER_PARSE_WARNING",
  "REVIEWER_FOCUS_EMPTY_FRONTMATTER",
  "REVIEWER_FOCUS_WHITESPACE_FRONTMATTER_ITEM",
  "REVIEWER_FOCUS_EMPTY_SECTION",
  "REVIEWER_FOCUS_MULTIPLE_SECTIONS",
  "REVIEWER_FOCUS_PARSE_WARNING"
]);
const reviewerFocusPresentReasonCodes: ReadonlySet<ReviewerFocusReasonCode> = new Set([
  "REVIEWER_FOCUS_FRONTMATTER_PRECEDENCE",
  "REVIEWER_FOCUS_MULTIPLE_SECTIONS"
]);
const reviewerFocusAbsentReasonCodes: ReadonlySet<ReviewerFocusReasonCode> = new Set([
  "REVIEWER_FOCUS_ABSENT"
]);
const reviewerFocusInvalidReasonCodes: ReadonlySet<ReviewerFocusReasonCode> = new Set([
  "REVIEWER_FOCUS_INVALID_FRONTMATTER_TYPE",
  "REVIEWER_FOCUS_FRONTMATTER_PARSE_WARNING",
  "REVIEWER_FOCUS_EMPTY_FRONTMATTER",
  "REVIEWER_FOCUS_WHITESPACE_FRONTMATTER_ITEM",
  "REVIEWER_FOCUS_EMPTY_SECTION",
  "REVIEWER_FOCUS_PARSE_WARNING"
]);

export function formatReviewerBriefPrompt(brief: string): string {
  return [
    "Reviewer brief (persisted artifact `reviewer-brief.md`):",
    brief,
    "Treat this reviewer brief as mandatory review context."
  ].join("\n");
}

export function formatReviewerBriefDeliveryReminder(brief: string): string {
  const condensed = brief.replaceAll(/\s+/gu, " ").trim();
  return `Reviewer brief reminder (from reviewer-brief.md): ${condensed}`;
}

function hasValidReviewerFocusSource(
  status: ReviewerFocusExtractionResult["status"],
  source: ReviewerFocusExtractionResult["source"]
): boolean {
  if (status === "present") {
    return source === "frontmatter" || source === "section";
  }
  if (status === "invalid") {
    return source === "frontmatter" || source === "section" || source === "none";
  }
  return source === "none";
}

function hasValidReviewerFocusReasonCode(
  status: ReviewerFocusExtractionResult["status"],
  source: ReviewerFocusExtractionResult["source"],
  reasonCode: unknown
): boolean {
  if (status === "present") {
    if (reasonCode === undefined) {
      return true;
    }
    return (
      typeof reasonCode === "string"
      && reviewerFocusPresentReasonCodes.has(reasonCode as ReviewerFocusReasonCode)
    );
  }
  if (
    typeof reasonCode !== "string"
    || !reviewerFocusReasonCodes.has(reasonCode as ReviewerFocusReasonCode)
  ) {
    return false;
  }
  if (status === "absent") {
    return reviewerFocusAbsentReasonCodes.has(reasonCode as ReviewerFocusReasonCode);
  }
  if (source === "none") {
    return reasonCode === "REVIEWER_FOCUS_PARSE_WARNING";
  }
  return reviewerFocusInvalidReasonCodes.has(reasonCode as ReviewerFocusReasonCode);
}

export function isReviewerFocusExtractionResult(
  value: unknown
): value is ReviewerFocusExtractionResult {
  if (
    typeof value !== "object"
    || value === null
    || !("status" in value)
    || !("source" in value)
  ) {
    return false;
  }
  const typed = value as Record<string, unknown>;
  const status = typed.status;
  const source = typed.source;
  const reasonCode = typed.reason_code;
  if (
    status !== "present"
    && status !== "absent"
    && status !== "invalid"
  ) {
    return false;
  }
  if (
    source !== "frontmatter"
    && source !== "section"
    && source !== "none"
  ) {
    return false;
  }
  if (!hasValidReviewerFocusSource(status, source)) {
    return false;
  }
  if (!hasValidReviewerFocusReasonCode(status, source, reasonCode)) {
    return false;
  }

  if (status === "present") {
    if (
      typeof typed.focus_text !== "string"
      || typed.focus_text.trim().length === 0
    ) {
      return false;
    }
    if (typed.focus_items !== undefined) {
      if (!Array.isArray(typed.focus_items)) {
        return false;
      }
      if (
        typed.focus_items.some(
          (entry) => typeof entry !== "string" || entry.trim().length === 0
        )
      ) {
        return false;
      }
    }
  }
  return true;
}

export function formatReviewerFocusBridgeBlock(
  focus: ReviewerFocusExtractionResult
): string {
  if (focus.status !== "present") {
    return "";
  }
  return [
    "Reviewer Focus (bridged from task artifact `reviewer-focus.json`):",
    focus.focus_text,
    "Treat this reviewer focus as mandatory review context."
  ].join("\n");
}

export function formatReviewerFocusDeliveryReminder(
  focus: ReviewerFocusExtractionResult
): string {
  if (focus.status !== "present") {
    return "";
  }
  const condensed = focus.focus_text.replaceAll(/\s+/gu, " ").trim();
  return `Reviewer focus reminder (bridged from reviewer-focus.json): ${condensed}`;
}

export async function readReviewerBriefArtifact(
  artifactPath: string
): Promise<string | undefined> {
  const raw = await readFile(artifactPath, "utf8").catch(
    (error: NodeJS.ErrnoException) => {
      if (
        error.code === "ENOENT"
        || error.code === "EISDIR"
        || error.code === "ENOTDIR"
      ) {
        return undefined;
      }
      throw error;
    }
  );
  if (raw === undefined) {
    return undefined;
  }

  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return undefined;
  }

  return raw.trimEnd();
}

export async function readReviewerFocusArtifact(
  artifactPath: string
): Promise<ReviewerFocusExtractionResult | undefined> {
  const raw = await readFile(artifactPath, "utf8").catch(
    (error: NodeJS.ErrnoException) => {
      if (
        error.code === "ENOENT"
        || error.code === "EISDIR"
        || error.code === "ENOTDIR"
      ) {
        return undefined;
      }
      throw error;
    }
  );
  if (raw === undefined) {
    return undefined;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return {
      status: "invalid",
      source: "none",
      reason_code: "REVIEWER_FOCUS_PARSE_WARNING"
    };
  }
  if (!isReviewerFocusExtractionResult(parsed)) {
    return undefined;
  }
  return parsed;
}
