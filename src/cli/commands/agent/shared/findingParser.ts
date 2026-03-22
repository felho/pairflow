import { isFindingSeverity, type FindingSeverity } from "../../../../types/findings.js";
import { isLikelyStructuredRef } from "../../../../core/util/structuredRef.js";

export interface ParsedCliFinding {
  severity: FindingSeverity;
  title: string;
  refs?: string[];
}

export class CliFindingParseError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "CliFindingParseError";
  }
}

function createCliFindingParseError(message: string): CliFindingParseError {
  return new CliFindingParseError(message);
}

export function parseCliFinding(raw: string): ParsedCliFinding {
  const trimmed = raw.trim();
  const separatorIndex = trimmed.indexOf(":");
  if (separatorIndex <= 0 || separatorIndex === trimmed.length - 1) {
    throw createCliFindingParseError(
      "Invalid --finding format. Use: <P0|P1|P2|P3:Title[|ref1,ref2]>. Note: `|` is reserved as the finding refs separator."
    );
  }

  const severity = trimmed.slice(0, separatorIndex).trim();
  const findingBody = trimmed.slice(separatorIndex + 1).trim();
  const refsSeparatorIndex = findingBody.indexOf("|");
  const title =
    refsSeparatorIndex === -1
      ? findingBody
      : findingBody.slice(0, refsSeparatorIndex).trim();
  if (!isFindingSeverity(severity)) {
    throw createCliFindingParseError(
      "Invalid --finding severity. Use one of: P0, P1, P2, P3."
    );
  }
  if (title.length === 0) {
    throw createCliFindingParseError(
      "Invalid --finding title. Title cannot be empty."
    );
  }

  if (refsSeparatorIndex === -1) {
    return {
      severity,
      title
    };
  }

  const rawRefs = findingBody.slice(refsSeparatorIndex + 1).trim();
  if (rawRefs.length === 0) {
    throw createCliFindingParseError(
      "Invalid --finding refs: trailing `|` without refs. Provide at least one ref after `|` or remove it. Format: <P0|P1|P2|P3:Title|ref1,ref2>."
    );
  }

  const refs = splitFindingRefs(rawRefs);
  if (refs.some((value) => value.length === 0)) {
    throw createCliFindingParseError(
      "Invalid --finding refs. Refs must be non-empty comma-separated values. Note: `|` is reserved as the finding refs separator."
    );
  }
  if (refs.length > 1 && refs.some((value) => !isLikelyStructuredRef(value))) {
    throw createCliFindingParseError(
      "Invalid --finding refs. Single ref accepts any non-empty token; multiple refs must each be path-like (`.../...`) or URI-like (`scheme://...`). If a single ref contains a comma, escape it as `\\,`."
    );
  }

  return {
    severity,
    title,
    refs
  };
}

function splitFindingRefs(rawRefs: string): string[] {
  const refs: string[] = [];
  let buffer = "";
  let escapeNext = false;

  for (const char of rawRefs) {
    if (escapeNext) {
      if (char === "," || char === "\\") {
        buffer += char;
      } else {
        buffer += `\\${char}`;
      }
      escapeNext = false;
      continue;
    }

    if (char === "\\") {
      escapeNext = true;
      continue;
    }
    if (char === ",") {
      refs.push(buffer.trim());
      buffer = "";
      continue;
    }

    buffer += char;
  }

  if (escapeNext) {
    buffer += "\\";
  }
  refs.push(buffer.trim());
  return refs;
}
