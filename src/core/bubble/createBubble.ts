import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import {
  assertCreateReviewArtifactType,
  assertValidBubbleConfig,
  renderBubbleConfigToml
} from "../../config/bubbleConfig.js";
import {
  DEFAULT_DOC_CONTRACT_GATE_MODE,
  DEFAULT_DOC_CONTRACT_ROUND_GATE_APPLIES_AFTER,
  DEFAULT_MAX_ROUNDS,
  DEFAULT_QUALITY_MODE,
  DEFAULT_REVIEWER_CONTEXT_MODE,
  DEFAULT_SEVERITY_GATE_ROUND,
  DEFAULT_WATCHDOG_TIMEOUT_MINUTES,
  DEFAULT_WORK_MODE
} from "../../config/defaults.js";
import { getBubblePaths, type BubblePaths } from "./paths.js";
import { createInitialBubbleState } from "../state/initialState.js";
import { assertValidBubbleStateSnapshot } from "../state/stateSchema.js";
import { appendProtocolEnvelope } from "../protocol/transcriptStore.js";
import { isNonEmptyString } from "../validation.js";
import { GitRepositoryError, assertGitRepository } from "../workspace/git.js";
import { generateBubbleInstanceId } from "./bubbleInstanceId.js";
import { emitBubbleLifecycleEventBestEffort } from "../metrics/bubbleEvents.js";
import {
  createDocContractGateArtifact,
  isDocContractGateScopeActive,
  resolveDocContractGateArtifactPath,
  writeDocContractGateArtifact
} from "../gates/docContractGates.js";
import {
  type ReviewerFocusExtractionResult
} from "../reviewer/reviewerBrief.js";
import type {
  AgentName,
  BubbleConfig,
  BubbleStateSnapshot,
  CreateReviewArtifactType
} from "../../types/bubble.js";

export interface BubbleCreateInput {
  id: string;
  repoPath: string;
  baseBranch: string;
  reviewArtifactType: CreateReviewArtifactType;
  task?: string;
  taskFile?: string;
  reviewerBrief?: string;
  reviewerBriefFile?: string;
  accuracyCritical?: boolean;
  cwd?: string;
  now?: Date;
  implementer?: AgentName;
  reviewer?: AgentName;
  testCommand?: string;
  typecheckCommand?: string;
  openCommand?: string;
}

export interface ResolvedTaskInput {
  content: string;
  source: "inline" | "file";
  sourcePath?: string;
}

export interface BubbleCreateResult {
  bubbleId: string;
  paths: BubblePaths;
  config: BubbleConfig;
  state: BubbleStateSnapshot;
  task: ResolvedTaskInput;
  reviewerFocus: ReviewerFocusExtractionResult;
  reviewerFocusArtifactPersist: {
    status: "written" | "write_failed";
    artifactPath: string;
    errorCode?: string;
  };
  reviewerBrief?: ResolvedTaskInput;
}

export interface BubbleCreateDependencies {
  writeReviewerFocusArtifact?: typeof writeFile;
}

export class BubbleCreateError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "BubbleCreateError";
  }
}

function validateBubbleId(id: string): void {
  if (!/^[a-z][a-z0-9_-]{2,63}$/u.test(id)) {
    throw new BubbleCreateError(
      "Invalid bubble id. Use 3-64 chars, starting with a lowercase letter, then lowercase letters, digits, '_' or '-'."
    );
  }
}

const reviewerFocusHeadingMatch = "reviewer focus";

interface FrontmatterParseOutcome {
  frontmatter?: Record<string, unknown>;
  parseFailed: boolean;
}

interface ExtractedSectionFocus {
  status: "none" | "present" | "invalid";
  focusText?: string;
  focusItems?: string[];
  hasMultipleValidSections: boolean;
}

interface ReviewerFocusHeadingMatch {
  index: number;
  level: number;
}

interface NormalizedFrontmatterFocusListResult {
  kind: "valid" | "invalid_type" | "invalid_empty_item";
  items: string[];
}

function normalizeReviewerFocusText(raw: string): string {
  const withLf = raw.replaceAll(/\r\n?/gu, "\n");
  const withoutEdges = withLf.trim();
  if (withoutEdges.length === 0) {
    return "";
  }
  const lines = withoutEdges.split("\n");
  const normalizedLines: string[] = [];
  let previousBlank = false;
  for (const line of lines) {
    const trimmedRight = line.replace(/[ \t]+$/gu, "");
    const blank = trimmedRight.trim().length === 0;
    if (blank) {
      if (!previousBlank) {
        normalizedLines.push("");
      }
      previousBlank = true;
      continue;
    }
    normalizedLines.push(trimmedRight);
    previousBlank = false;
  }
  return normalizedLines.join("\n").trim();
}

function stripMatchingQuotes(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length < 2) {
    return trimmed;
  }
  if (
    (trimmed.startsWith("\"") && trimmed.endsWith("\""))
    || (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseInlineFrontmatterList(value: string): string[] {
  const trimmed = value.trim();
  if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) {
    throw new Error("Inline list must be wrapped in [ ... ].");
  }
  const inner = trimmed.slice(1, -1).trim();
  if (inner.length === 0) {
    return [];
  }
  const tokens: string[] = [];
  let current = "";
  let activeQuote: "\"" | "'" | null = null;
  let escaped = false;

  for (const char of inner) {
    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }
    if (char === "\\" && activeQuote !== null) {
      escaped = true;
      continue;
    }
    if ((char === "\"" || char === "'")) {
      if (activeQuote === null) {
        activeQuote = char;
      } else if (activeQuote === char) {
        activeQuote = null;
      }
      current += char;
      continue;
    }
    if (char === "," && activeQuote === null) {
      tokens.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  if (activeQuote !== null) {
    throw new Error("Inline list has unclosed quote.");
  }
  tokens.push(current);

  return tokens.map((entry) => stripMatchingQuotes(entry));
}

function parseFrontmatterReviewerFocusValue(value: string): unknown {
  const trimmed = value.trim();
  if (trimmed.startsWith("[")) {
    return parseInlineFrontmatterList(trimmed);
  }
  return stripMatchingQuotes(trimmed);
}

function parseNestedReviewerFocusLines(lines: string[]): unknown {
  const nonEmpty = lines.filter((line) => line.trim().length > 0);
  if (nonEmpty.length === 0) {
    return "";
  }

  const listPattern = /^\s*-\s*(.*)$/u;
  const allListItems = nonEmpty.every((line) => listPattern.test(line));
  if (allListItems) {
    return nonEmpty.map((line) => {
      const match = listPattern.exec(line);
      return stripMatchingQuotes((match?.[1] ?? "").trim());
    });
  }

  const minIndent = nonEmpty.reduce((min, line) => {
    const indent = line.match(/^\s*/u)?.[0].length ?? 0;
    return Math.min(min, indent);
  }, Number.POSITIVE_INFINITY);
  const dedented = lines.map((line) => line.slice(Math.min(minIndent, line.length)));
  return dedented.join("\n");
}

function isBlockScalarIndicator(value: string): boolean {
  const trimmed = value.trim();
  return /^[|>](?:([1-9]|[1-9][+-]|[+-]|[+-][1-9]))?(?:\s+#.*)?$/u.test(trimmed);
}

function collectNestedFrontmatterLines(
  frontmatterLines: string[],
  startIndex: number
): { nestedLines: string[]; nextIndex: number } {
  const nestedLines: string[] = [];
  let cursor = startIndex;
  while (cursor < frontmatterLines.length) {
    const candidate = frontmatterLines[cursor] ?? "";
    if (candidate.trim().length === 0) {
      nestedLines.push(candidate);
      cursor += 1;
      continue;
    }
    if (!/^\s/u.test(candidate)) {
      break;
    }
    nestedLines.push(candidate);
    cursor += 1;
  }
  return {
    nestedLines,
    nextIndex: cursor
  };
}

function parseTaskFrontmatterForReviewerFocus(taskContent: string): FrontmatterParseOutcome {
  const lines = taskContent.split(/\r?\n/u);
  const firstContentLineIndex = lines.findIndex((line) => line.trim().length > 0);
  if (firstContentLineIndex === -1) {
    return {
      parseFailed: false
    };
  }
  if (lines[firstContentLineIndex]?.trim() !== "---") {
    return {
      parseFailed: false
    };
  }
  const startIndex = firstContentLineIndex;
  const endOffset = lines.slice(startIndex + 1).findIndex((line) => line.trim() === "---");
  if (endOffset === -1) {
    return {
      parseFailed: true
    };
  }
  const endIndex = startIndex + 1 + endOffset;
  const frontmatterLines = lines.slice(startIndex + 1, endIndex);

  const frontmatter: Record<string, unknown> = {};
  for (let index = 0; index < frontmatterLines.length; index += 1) {
    const line = frontmatterLines[index] ?? "";
    if (line.trim().length === 0 || line.trimStart().startsWith("#")) {
      continue;
    }
    if (/^\s/u.test(line)) {
      continue;
    }
    const keyMatch = /^([A-Za-z0-9_-]+)\s*:\s*(.*)$/u.exec(line);
    if (keyMatch === null) {
      continue;
    }
    const key = keyMatch[1];
    const inlineValue = keyMatch[2] ?? "";
    if (key !== "reviewer_focus") {
      continue;
    }

    const inlineValueTrimmed = inlineValue.trim();
    if (
      inlineValueTrimmed.length > 0
      && !isBlockScalarIndicator(inlineValueTrimmed)
    ) {
      frontmatter.reviewer_focus = parseFrontmatterReviewerFocusValue(inlineValue);
      continue;
    }

    const collectedNested = collectNestedFrontmatterLines(
      frontmatterLines,
      index + 1
    );
    frontmatter.reviewer_focus = parseNestedReviewerFocusLines(
      collectedNested.nestedLines
    );
    index = collectedNested.nextIndex - 1;
  }

  return {
    frontmatter,
    parseFailed: false
  };
}

function normalizeHeading(rawHeading: string): string {
  return rawHeading.trim().replaceAll(/\s+/gu, " ").toLowerCase();
}

function extractFocusItemsFromText(text: string): string[] | undefined {
  const nonEmptyLines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (nonEmptyLines.length === 0) {
    return undefined;
  }
  const extractedItems = nonEmptyLines.map((line) => {
    const bulletMatch = /^[-*+]\s+(.+)$/u.exec(line);
    if (bulletMatch !== null) {
      return bulletMatch[1]?.trim() ?? "";
    }
    const numberedMatch = /^\d+[.)]\s+(.+)$/u.exec(line);
    if (numberedMatch !== null) {
      return numberedMatch[1]?.trim() ?? "";
    }
    return null;
  });
  if (extractedItems.some((entry) => entry === null || entry.length === 0)) {
    return undefined;
  }
  return extractedItems as string[];
}

function extractSectionFocus(taskContent: string): ExtractedSectionFocus {
  const lines = taskContent.split(/\r?\n/u);
  const headingMatches: ReviewerFocusHeadingMatch[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    const headingMatch = /^(#{2,3})\s+(.+?)\s*$/u.exec(line);
    if (headingMatch === null) {
      continue;
    }
    const headingText = headingMatch[2] ?? "";
    if (normalizeHeading(headingText) === reviewerFocusHeadingMatch) {
      headingMatches.push({
        index,
        level: (headingMatch[1] ?? "").length
      });
    }
  }

  if (headingMatches.length === 0) {
    return {
      status: "none",
      hasMultipleValidSections: false
    };
  }

  const normalizedBodies = headingMatches.map((headingMatch) => {
    const headingIndex = headingMatch.index;
    const start = headingIndex + 1;
    let end = lines.length;
    for (let cursor = start; cursor < lines.length; cursor += 1) {
      const nextHeadingMatch = /^(#{1,6})\s+(.+?)\s*$/u.exec(lines[cursor] ?? "");
      if (nextHeadingMatch !== null) {
        const nextLevel = (nextHeadingMatch[1] ?? "").length;
        const nextHeadingText = nextHeadingMatch[2] ?? "";
        if (
          nextLevel <= headingMatch.level
          || normalizeHeading(nextHeadingText) === reviewerFocusHeadingMatch
        ) {
          end = cursor;
          break;
        }
      }
    }
    const body = lines.slice(start, end).join("\n");
    return normalizeReviewerFocusText(body);
  });

  const firstBody = normalizedBodies[0] ?? "";
  if (firstBody.length === 0) {
    return {
      status: "invalid",
      hasMultipleValidSections: headingMatches.length > 1
    };
  }

  const validBodies = normalizedBodies.filter((entry) => entry.length > 0);
  const focusItems = extractFocusItemsFromText(firstBody);
  return {
    status: "present",
    focusText: firstBody,
    ...(focusItems !== undefined ? { focusItems } : {}),
    hasMultipleValidSections: validBodies.length > 1
  };
}

function formatFocusItemsAsText(items: string[]): string {
  return items.map((item) => `- ${item}`).join("\n");
}

function normalizeFrontmatterFocusList(
  value: unknown
): NormalizedFrontmatterFocusListResult | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const normalizedItems: string[] = [];
  let hasEmptyItem = false;
  for (const entry of value) {
    if (typeof entry !== "string") {
      return {
        kind: "invalid_type",
        items: []
      };
    }
    const normalized = normalizeReviewerFocusText(stripMatchingQuotes(entry));
    if (normalized.length > 0) {
      normalizedItems.push(normalized);
    } else {
      hasEmptyItem = true;
    }
  }
  return {
    kind: hasEmptyItem ? "invalid_empty_item" : "valid",
    items: normalizedItems
  };
}

export function extractReviewerFocus(
  taskContent: string,
  frontmatter?: Record<string, unknown>
): ReviewerFocusExtractionResult {
  let parsedFrontmatter = frontmatter;
  if (parsedFrontmatter === undefined) {
    let parsed: FrontmatterParseOutcome;
    try {
      parsed = parseTaskFrontmatterForReviewerFocus(taskContent);
    } catch {
      return {
        status: "invalid",
        source: "frontmatter",
        reason_code: "REVIEWER_FOCUS_FRONTMATTER_PARSE_WARNING"
      };
    }
    if (parsed.parseFailed) {
      return {
        status: "invalid",
        source: "frontmatter",
        reason_code: "REVIEWER_FOCUS_FRONTMATTER_PARSE_WARNING"
      };
    }
    parsedFrontmatter = parsed.frontmatter;
  }

  let parseWarningSource: ReviewerFocusExtractionResult["source"] = "none";
  try {
    const hasFrontmatterKey =
      parsedFrontmatter !== undefined
      && Object.prototype.hasOwnProperty.call(parsedFrontmatter, "reviewer_focus");
    parseWarningSource = hasFrontmatterKey ? "frontmatter" : "section";
    const frontmatterValue = hasFrontmatterKey
      ? parsedFrontmatter?.reviewer_focus
      : undefined;

    let sectionFocus: ExtractedSectionFocus | undefined;
    const resolveSectionFocus = (): ExtractedSectionFocus => {
      parseWarningSource = "section";
      if (sectionFocus === undefined) {
        sectionFocus = extractSectionFocus(taskContent);
      }
      return sectionFocus;
    };

    if (hasFrontmatterKey) {
      if (typeof frontmatterValue === "string") {
        const normalized = normalizeReviewerFocusText(frontmatterValue);
        if (normalized.length === 0) {
          return {
            status: "invalid",
            source: "frontmatter",
            reason_code: "REVIEWER_FOCUS_EMPTY_FRONTMATTER"
          };
        }
        const section = resolveSectionFocus();
        const normalizedFocusItems = extractFocusItemsFromText(normalized);
        return {
          status: "present",
          source: "frontmatter",
          focus_text: normalized,
          ...(normalizedFocusItems !== undefined
            ? { focus_items: normalizedFocusItems }
            : {}),
          ...(section.status === "present"
            ? { reason_code: "REVIEWER_FOCUS_FRONTMATTER_PRECEDENCE" }
            : {})
        };
      }

      const normalizedList = normalizeFrontmatterFocusList(frontmatterValue);
      if (normalizedList !== undefined) {
        if (normalizedList.kind === "invalid_type") {
          return {
            status: "invalid",
            source: "frontmatter",
            reason_code: "REVIEWER_FOCUS_INVALID_FRONTMATTER_TYPE"
          };
        }
        if (normalizedList.items.length === 0) {
          return {
            status: "invalid",
            source: "frontmatter",
            reason_code: "REVIEWER_FOCUS_EMPTY_FRONTMATTER"
          };
        }
        if (normalizedList.kind === "invalid_empty_item") {
          return {
            status: "invalid",
            source: "frontmatter",
            reason_code: "REVIEWER_FOCUS_WHITESPACE_FRONTMATTER_ITEM"
          };
        }
        const section = resolveSectionFocus();
        return {
          status: "present",
          source: "frontmatter",
          focus_text: formatFocusItemsAsText(normalizedList.items),
          focus_items: normalizedList.items,
          ...(section.status === "present"
            ? { reason_code: "REVIEWER_FOCUS_FRONTMATTER_PRECEDENCE" }
            : {})
        };
      }

      return {
        status: "invalid",
        source: "frontmatter",
        reason_code: "REVIEWER_FOCUS_INVALID_FRONTMATTER_TYPE"
      };
    }

    const section = resolveSectionFocus();
    if (section.status === "present") {
      return {
        status: "present",
        source: "section",
        focus_text: section.focusText as string,
        ...(section.focusItems !== undefined
          ? { focus_items: section.focusItems }
          : {}),
        ...(section.hasMultipleValidSections
          ? { reason_code: "REVIEWER_FOCUS_MULTIPLE_SECTIONS" }
          : {})
      };
    }
    if (section.status === "invalid") {
      return {
        status: "invalid",
        source: "section",
        reason_code: "REVIEWER_FOCUS_EMPTY_SECTION"
      };
    }

    return {
      status: "absent",
      source: "none",
      reason_code: "REVIEWER_FOCUS_ABSENT"
    };
  } catch {
    return {
      status: "invalid",
      source: parseWarningSource,
      reason_code: "REVIEWER_FOCUS_PARSE_WARNING"
    };
  }
}

async function ensureRepoPathIsGitRepo(repoPath: string): Promise<void> {
  try {
    await assertGitRepository(repoPath);
  } catch (error) {
    const typedError = error as NodeJS.ErrnoException;
    if (typedError.code === "ENOENT") {
      throw new BubbleCreateError(
        `Repository path does not exist: ${repoPath}`
      );
    }
    if (typedError.code === "ENOTDIR") {
      throw new BubbleCreateError(
        `Repository path is not a directory: ${repoPath}`
      );
    }
    if (error instanceof GitRepositoryError) {
      throw new BubbleCreateError(
        `Repository path does not look like a git repository: ${repoPath}`
      );
    }
    throw error;
  }
}

async function resolveTaskInput(input: {
  task?: string;
  taskFile?: string;
  cwd: string;
}): Promise<ResolvedTaskInput> {
  const hasTaskText = isNonEmptyString(input.task);
  const hasTaskFile = isNonEmptyString(input.taskFile);
  if (hasTaskText && hasTaskFile) {
    throw new BubbleCreateError(
      "Provide either task text or task file path, not both."
    );
  }
  if (!hasTaskText && !hasTaskFile) {
    throw new BubbleCreateError(
      "Provide task text or task file path."
    );
  }

  if (hasTaskFile) {
    const candidatePath = resolve(input.cwd, input.taskFile as string);
    const taskStats = await stat(candidatePath).catch((error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") {
        throw new BubbleCreateError(`Task file does not exist: ${candidatePath}`);
      }
      throw error;
    });
    if (!taskStats.isFile()) {
      throw new BubbleCreateError(`Task path is not a file: ${candidatePath}`);
    }

    const content = await readFile(candidatePath, "utf8");
    if (content.trim().length === 0) {
      throw new BubbleCreateError(`Task file is empty: ${candidatePath}`);
    }

    return {
      content: content.trimEnd(),
      source: "file",
      sourcePath: candidatePath
    };
  }

  const taskText = (input.task as string).trim();
  if (taskText.length === 0) {
    throw new BubbleCreateError("Task cannot be empty.");
  }

  return {
    content: taskText,
    source: "inline"
  };
}

async function resolveReviewerBriefInput(input: {
  reviewerBrief?: string;
  reviewerBriefFile?: string;
  accuracyCritical: boolean;
  cwd: string;
}): Promise<ResolvedTaskInput | undefined> {
  const hasReviewerBriefText = isNonEmptyString(input.reviewerBrief);
  const hasReviewerBriefFile = isNonEmptyString(input.reviewerBriefFile);
  if (hasReviewerBriefText && hasReviewerBriefFile) {
    throw new BubbleCreateError(
      "Provide either reviewer brief text or reviewer brief file path, not both."
    );
  }

  if (input.accuracyCritical && !hasReviewerBriefText && !hasReviewerBriefFile) {
    throw new BubbleCreateError(
      "accuracy-critical bubbles require reviewer brief input (--reviewer-brief or --reviewer-brief-file)."
    );
  }

  if (!hasReviewerBriefText && !hasReviewerBriefFile) {
    return undefined;
  }

  if (hasReviewerBriefFile) {
    const candidatePath = resolve(input.cwd, input.reviewerBriefFile as string);
    const briefStats = await stat(candidatePath).catch((error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") {
        throw new BubbleCreateError(
          `Reviewer brief file does not exist: ${candidatePath}`
        );
      }
      throw error;
    });
    if (!briefStats.isFile()) {
      throw new BubbleCreateError(
        `Reviewer brief path is not a file: ${candidatePath}`
      );
    }

    const content = await readFile(candidatePath, "utf8");
    if (content.trim().length === 0) {
      throw new BubbleCreateError(`Reviewer brief file is empty: ${candidatePath}`);
    }

    return {
      content: content.trimEnd(),
      source: "file",
      sourcePath: candidatePath
    };
  }

  const reviewerBriefText = (input.reviewerBrief as string).trim();
  if (reviewerBriefText.length === 0) {
    throw new BubbleCreateError("Reviewer brief cannot be empty.");
  }

  return {
    content: reviewerBriefText,
    source: "inline"
  };
}

function buildBubbleConfig(input: {
  id: string;
  bubbleInstanceId: string;
  repoPath: string;
  baseBranch: string;
  bubbleBranch: string;
  accuracyCritical: boolean;
  reviewArtifactType: CreateReviewArtifactType;
  implementer?: AgentName;
  reviewer?: AgentName;
  testCommand?: string;
  typecheckCommand?: string;
  openCommand?: string;
}): BubbleConfig {
  return assertValidBubbleConfig({
    id: input.id,
    bubble_instance_id: input.bubbleInstanceId,
    repo_path: input.repoPath,
    base_branch: input.baseBranch,
    bubble_branch: input.bubbleBranch,
    work_mode: DEFAULT_WORK_MODE,
    quality_mode: DEFAULT_QUALITY_MODE,
    review_artifact_type: input.reviewArtifactType,
    reviewer_context_mode: DEFAULT_REVIEWER_CONTEXT_MODE,
    watchdog_timeout_minutes: DEFAULT_WATCHDOG_TIMEOUT_MINUTES,
    max_rounds: DEFAULT_MAX_ROUNDS,
    severity_gate_round: DEFAULT_SEVERITY_GATE_ROUND,
    commit_requires_approval: true,
    accuracy_critical: input.accuracyCritical,
    ...(input.openCommand !== undefined
      ? { open_command: input.openCommand }
      : {}),
    agents: {
      implementer: input.implementer ?? "codex",
      reviewer: input.reviewer ?? "claude"
    },
    commands: {
      test: input.testCommand ?? "pnpm test",
      typecheck: input.typecheckCommand ?? "pnpm typecheck"
    },
    notifications: {
      enabled: true
    },
    doc_contract_gates: {
      mode: DEFAULT_DOC_CONTRACT_GATE_MODE,
      round_gate_applies_after: DEFAULT_DOC_CONTRACT_ROUND_GATE_APPLIES_AFTER
    }
  });
}

function resolveCreateReviewArtifactType(
  value: unknown
): CreateReviewArtifactType {
  try {
    return assertCreateReviewArtifactType(value);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new BubbleCreateError(reason);
  }
}

function renderTaskArtifact(task: ResolvedTaskInput): string {
  const sourceLine =
    task.source === "file"
      ? `Source: file (${task.sourcePath})`
      : "Source: inline text";

  return `# Bubble Task\n\n${sourceLine}\n\n${task.content}\n`;
}

async function ensureBubbleDoesNotExist(bubbleDir: string): Promise<void> {
  try {
    await stat(bubbleDir);
    throw new BubbleCreateError(`Bubble already exists: ${bubbleDir}`);
  } catch (error) {
    const typedError = error as NodeJS.ErrnoException;
    if (typedError.code !== "ENOENT") {
      throw error;
    }
  }
}

async function ensureRuntimeSessionFile(sessionsPath: string): Promise<void> {
  try {
    await writeFile(sessionsPath, "{}\n", {
      encoding: "utf8",
      flag: "wx"
    });
  } catch (error) {
    const typedError = error as NodeJS.ErrnoException;
    if (typedError.code !== "EEXIST") {
      throw error;
    }
  }
}

export async function createBubble(
  input: BubbleCreateInput,
  dependencies: BubbleCreateDependencies = {}
): Promise<BubbleCreateResult> {
  validateBubbleId(input.id);
  const createdAt = input.now ?? new Date();
  const reviewArtifactType = resolveCreateReviewArtifactType(input.reviewArtifactType);

  const repoPath = resolve(input.repoPath);
  await ensureRepoPathIsGitRepo(repoPath);

  const baseBranch = input.baseBranch.trim();
  if (baseBranch.length === 0) {
    throw new BubbleCreateError("Base branch cannot be empty.");
  }

  const paths = getBubblePaths(repoPath, input.id);
  await ensureBubbleDoesNotExist(paths.bubbleDir);

  const bubbleBranch = `bubble/${input.id}`;
  const taskResolveInput: { cwd: string; task?: string; taskFile?: string } = {
    cwd: input.cwd ?? process.cwd()
  };
  if (input.task !== undefined) {
    taskResolveInput.task = input.task;
  }
  if (input.taskFile !== undefined) {
    taskResolveInput.taskFile = input.taskFile;
  }
  const task = await resolveTaskInput(taskResolveInput);
  const reviewerFocus = extractReviewerFocus(task.content);
  const accuracyCritical = input.accuracyCritical === true;
  const reviewerBrief = await resolveReviewerBriefInput({
    ...(input.reviewerBrief !== undefined
      ? { reviewerBrief: input.reviewerBrief }
      : {}),
    ...(input.reviewerBriefFile !== undefined
      ? { reviewerBriefFile: input.reviewerBriefFile }
      : {}),
    accuracyCritical,
    cwd: input.cwd ?? process.cwd()
  });

  const bubbleConfigInput: Parameters<typeof buildBubbleConfig>[0] = {
    id: input.id,
    bubbleInstanceId: generateBubbleInstanceId(createdAt),
    repoPath,
    baseBranch,
    bubbleBranch,
    accuracyCritical,
    reviewArtifactType
  };
  if (input.implementer !== undefined) {
    bubbleConfigInput.implementer = input.implementer;
  }
  if (input.reviewer !== undefined) {
    bubbleConfigInput.reviewer = input.reviewer;
  }
  if (input.testCommand !== undefined) {
    bubbleConfigInput.testCommand = input.testCommand;
  }
  if (input.typecheckCommand !== undefined) {
    bubbleConfigInput.typecheckCommand = input.typecheckCommand;
  }
  if (input.openCommand !== undefined) {
    bubbleConfigInput.openCommand = input.openCommand;
  }

  const config = buildBubbleConfig(bubbleConfigInput);

  const state = assertValidBubbleStateSnapshot(createInitialBubbleState(input.id));

  await mkdir(paths.messageArtifactsDir, { recursive: true });
  await mkdir(paths.locksDir, { recursive: true });
  await mkdir(paths.runtimeDir, { recursive: true });

  await writeFile(paths.bubbleTomlPath, renderBubbleConfigToml(config), {
    encoding: "utf8",
    flag: "wx"
  });
  await writeFile(paths.statePath, `${JSON.stringify(state, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx"
  });
  await writeFile(paths.transcriptPath, "", {
    encoding: "utf8",
    flag: "wx"
  });
  await writeFile(paths.inboxPath, "", {
    encoding: "utf8",
    flag: "wx"
  });
  await writeFile(paths.taskArtifactPath, renderTaskArtifact(task), {
    encoding: "utf8",
    flag: "wx"
  });
  let reviewerFocusArtifactWriteStatus: "written" | "write_failed" = "written";
  let reviewerFocusArtifactWriteErrorCode: string | undefined;
  const writeReviewerFocusArtifact =
    dependencies.writeReviewerFocusArtifact ?? writeFile;
  await writeReviewerFocusArtifact(
    paths.reviewerFocusArtifactPath,
    `${JSON.stringify(reviewerFocus, null, 2)}\n`,
    {
      encoding: "utf8",
      flag: "wx"
    }
  ).catch((error: NodeJS.ErrnoException) => {
    reviewerFocusArtifactWriteStatus = "write_failed";
    reviewerFocusArtifactWriteErrorCode =
      error.code ?? error.name ?? "unknown_write_failure";
  });
  if (
    isDocContractGateScopeActive({
      reviewArtifactType: config.review_artifact_type
    })
  ) {
    await writeDocContractGateArtifact(
      resolveDocContractGateArtifactPath(paths.artifactsDir),
      createDocContractGateArtifact({
        now: createdAt,
        bubbleConfig: config,
        taskContent: task.content
      })
    ).catch(() => undefined);
  }
  if (reviewerBrief !== undefined) {
    await writeFile(paths.reviewerBriefArtifactPath, `${reviewerBrief.content}\n`, {
      encoding: "utf8",
      flag: "wx"
    });
  }
  await ensureRuntimeSessionFile(paths.sessionsPath);

  try {
    await appendProtocolEnvelope({
      transcriptPath: paths.transcriptPath,
      lockPath: join(paths.locksDir, `${input.id}.lock`),
      now: createdAt,
      envelope: {
        bubble_id: input.id,
        sender: "orchestrator",
        recipient: config.agents.implementer,
        type: "TASK",
        round: state.round,
        payload: {
          summary: task.content,
          metadata: {
            source: task.source,
            ...(task.sourcePath !== undefined
              ? { source_path: task.sourcePath }
              : {})
          }
        },
        refs: [paths.taskArtifactPath]
      }
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new BubbleCreateError(
      `Failed to append initial TASK envelope for bubble ${input.id}. Root error: ${reason}`
    );
  }

  await emitBubbleLifecycleEventBestEffort({
    repoPath,
    bubbleId: input.id,
    bubbleInstanceId: bubbleConfigInput.bubbleInstanceId,
    eventType: "bubble_created",
    round: null,
    actorRole: "orchestrator",
    metadata: {
      base_branch: config.base_branch,
      bubble_branch: config.bubble_branch,
      review_artifact_type: config.review_artifact_type,
      task_source: task.source,
      reviewer_focus_status: reviewerFocus.status,
      reviewer_focus_artifact_write: reviewerFocusArtifactWriteStatus,
      ...(reviewerFocusArtifactWriteErrorCode !== undefined
        ? { reviewer_focus_artifact_write_error_code: reviewerFocusArtifactWriteErrorCode }
        : {})
    },
    now: createdAt
  });

  return {
    bubbleId: input.id,
    paths,
    config,
    state,
    task,
    reviewerFocus,
    reviewerFocusArtifactPersist: {
      status: reviewerFocusArtifactWriteStatus,
      artifactPath: paths.reviewerFocusArtifactPath,
      ...(reviewerFocusArtifactWriteErrorCode !== undefined
        ? { errorCode: reviewerFocusArtifactWriteErrorCode }
        : {})
    },
    ...(reviewerBrief !== undefined ? { reviewerBrief } : {})
  };
}
