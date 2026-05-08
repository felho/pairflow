import type { ReviewerFocusExtractionResult } from "../../shared/reviewer/reviewerBrief.js";
import {
  extractFocusItemsFromText,
  normalizeReviewerFocusText,
  tryExtractReviewerFocusFromFrontmatter
} from "./createReviewerFocusFrontmatter.js";

const reviewerFocusHeadingMatch = "reviewer focus";

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

function normalizeHeading(rawHeading: string): string {
  return rawHeading.trim().replaceAll(/\s+/gu, " ").toLowerCase();
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

export function extractReviewerFocus(
  taskContent: string,
  frontmatter?: Record<string, unknown>
): ReviewerFocusExtractionResult {
  try {
    const frontmatterResult = tryExtractReviewerFocusFromFrontmatter(
      taskContent,
      frontmatter
    );
    if (frontmatterResult !== undefined) {
      if (frontmatterResult.status === "present") {
        const section = extractSectionFocus(taskContent);
        if (section.status === "present") {
          return {
            ...frontmatterResult,
            reason_code: "REVIEWER_FOCUS_FRONTMATTER_PRECEDENCE"
          };
        }
      }
      return frontmatterResult;
    }

    const section = extractSectionFocus(taskContent);
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
    const parseWarningSource: ReviewerFocusExtractionResult["source"] =
      frontmatter === undefined
        ? "section"
        : Object.prototype.hasOwnProperty.call(frontmatter, "reviewer_focus")
          ? "frontmatter"
          : "section";
    return {
      status: "invalid",
      source: parseWarningSource,
      reason_code: "REVIEWER_FOCUS_PARSE_WARNING"
    };
  }
}
