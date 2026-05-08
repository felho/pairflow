import type { ReviewerFocusExtractionResult } from "../../../../shared/reviewer/reviewerBrief.js";
import { toCreateCommandReasonCodeError } from "../runtime/createCommandErrors.js";

interface FrontmatterParseOutcome {
  frontmatter?: Record<string, unknown>;
  parseFailed: boolean;
}

interface NormalizedFrontmatterFocusListResult {
  kind: "valid" | "invalid_type" | "invalid_empty_item";
  items: string[];
}

export function normalizeReviewerFocusText(raw: string): string {
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

export function extractFocusItemsFromText(text: string): string[] | undefined {
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
    throw toCreateCommandReasonCodeError(
      "Reviewer focus inline list must be wrapped in [ ... ].",
      "CREATE_REVIEWER_FOCUS_INLINE_LIST_WRAPPER_REQUIRED"
    );
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
    throw toCreateCommandReasonCodeError(
      "Reviewer focus inline list has unclosed quote.",
      "CREATE_REVIEWER_FOCUS_INLINE_LIST_UNCLOSED_QUOTE"
    );
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

export function tryExtractReviewerFocusFromFrontmatter(
  taskContent: string,
  frontmatter?: Record<string, unknown>
): ReviewerFocusExtractionResult | undefined {
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

  const hasFrontmatterKey =
    parsedFrontmatter !== undefined
    && Object.prototype.hasOwnProperty.call(parsedFrontmatter, "reviewer_focus");
  if (!hasFrontmatterKey) {
    return undefined;
  }

  const frontmatterValue = parsedFrontmatter?.reviewer_focus;
  try {
    if (typeof frontmatterValue === "string") {
      const normalized = normalizeReviewerFocusText(frontmatterValue);
      if (normalized.length === 0) {
        return {
          status: "invalid",
          source: "frontmatter",
          reason_code: "REVIEWER_FOCUS_EMPTY_FRONTMATTER"
        };
      }
      return {
        status: "present",
        source: "frontmatter",
        focus_text: normalized,
        ...(extractFocusItemsFromText(normalized) !== undefined
          ? { focus_items: extractFocusItemsFromText(normalized) as string[] }
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
      return {
        status: "present",
        source: "frontmatter",
        focus_text: normalizedList.items.map((item) => `- ${item}`).join("\n"),
        focus_items: normalizedList.items
      };
    }

    return {
      status: "invalid",
      source: "frontmatter",
      reason_code: "REVIEWER_FOCUS_INVALID_FRONTMATTER_TYPE"
    };
  } catch {
    return {
      status: "invalid",
      source: "frontmatter",
      reason_code: "REVIEWER_FOCUS_PARSE_WARNING"
    };
  }
}
