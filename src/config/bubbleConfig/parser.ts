import { isRecord } from "../../v11/shared/validation/primitives.js";

export const TOML_PARSER_LIMITATIONS = [
  "No multiline strings (\"\"\"...\"\"\" / '''...''')",
  "No array-of-tables ([[section]])",
  "No dotted keys (a.b = \"value\")",
  "Double-quoted string escapes follow JSON.parse behavior only"
] as const;

function parseTomlValue(rawValue: string, lineNumber: number): unknown {
  const value = rawValue.trim();

  if (value.startsWith("\"\"\"") || value.startsWith("'''")) {
    throw new Error(
      `Multiline TOML strings are not supported by this parser (line ${lineNumber})`
    );
  }

  if (value.startsWith("\"")) {
    try {
      return JSON.parse(value);
    } catch {
      throw new Error(`Invalid quoted string at line ${lineNumber}`);
    }
  }

  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1);
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  if (/^-?\d+$/.test(value)) {
    return Number.parseInt(value, 10);
  }

  if (/^-?\d+\.\d+$/.test(value)) {
    return Number.parseFloat(value);
  }

  if (value.startsWith("[") && value.endsWith("]")) {
    const inner = value.slice(1, -1).trim();
    if (inner.length === 0) {
      return [];
    }

    const parts = splitTomlList(inner);
    return parts.map((part) => parseTomlValue(part, lineNumber));
  }

  throw new Error(
    `Unsupported TOML value at line ${lineNumber}; strings must be quoted`
  );
}

function splitTomlList(value: string): string[] {
  const result: string[] = [];
  let token = "";
  let inDoubleQuote = false;
  let inSingleQuote = false;

  for (const char of value) {
    if (char === "\"" && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      token += char;
      continue;
    }

    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      token += char;
      continue;
    }

    if (char === "," && !inDoubleQuote && !inSingleQuote) {
      result.push(token.trim());
      token = "";
      continue;
    }

    token += char;
  }

  if (token.trim().length > 0) {
    result.push(token.trim());
  }

  return result;
}

function stripInlineComment(line: string): string {
  let inDoubleQuote = false;
  let inSingleQuote = false;
  let result = "";

  for (const char of line) {
    if (char === "\"" && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      result += char;
      continue;
    }

    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      result += char;
      continue;
    }

    if (char === "#" && !inDoubleQuote && !inSingleQuote) {
      break;
    }

    result += char;
  }

  return result.trim();
}

function findEqualsIndex(line: string): number {
  let inDoubleQuote = false;
  let inSingleQuote = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === "\"" && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      continue;
    }

    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      continue;
    }

    if (char === "=" && !inDoubleQuote && !inSingleQuote) {
      return index;
    }
  }

  return -1;
}

function getOrCreateSection(
  root: Record<string, unknown>,
  path: string[]
): Record<string, unknown> {
  let current = root;

  for (const segment of path) {
    const existing = current[segment];
    if (existing === undefined) {
      current[segment] = {};
    } else if (!isRecord(existing)) {
      throw new Error(`Section path conflict at [${path.join(".")}]`);
    }

    current = current[segment] as Record<string, unknown>;
  }

  return current;
}

export function parseToml(input: string): Record<string, unknown> {
  const root: Record<string, unknown> = {};
  let activeSectionPath: string[] = [];
  const lines = input.split(/\r?\n/u);

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const cleaned = stripInlineComment(line).trim();

    if (cleaned.length === 0) {
      return;
    }

    if (cleaned.startsWith("[")) {
      if (cleaned.startsWith("[[")) {
        throw new Error(
          `Array-of-tables are not supported by this parser (line ${lineNumber})`
        );
      }

      if (!cleaned.endsWith("]")) {
        throw new Error(`Invalid TOML section header at line ${lineNumber}`);
      }

      const sectionName = cleaned.slice(1, -1).trim();
      if (sectionName.length === 0) {
        throw new Error(`Empty TOML section name at line ${lineNumber}`);
      }

      activeSectionPath = sectionName.split(".").map((segment) => segment.trim());
      getOrCreateSection(root, activeSectionPath);
      return;
    }

    const separatorIndex = findEqualsIndex(cleaned);
    if (separatorIndex <= 0) {
      throw new Error(`Invalid TOML key-value line at line ${lineNumber}`);
    }

    const key = cleaned.slice(0, separatorIndex).trim();
    const rawValue = cleaned.slice(separatorIndex + 1).trim();
    if (key.includes(".")) {
      throw new Error(
        `Dotted TOML keys are not supported by this parser (line ${lineNumber})`
      );
    }
    if (!/^[A-Za-z0-9_-]+$/u.test(key)) {
      throw new Error(`Invalid TOML key "${key}" at line ${lineNumber}`);
    }

    const target = getOrCreateSection(root, activeSectionPath);
    if (Object.prototype.hasOwnProperty.call(target, key)) {
      throw new Error(`Duplicate TOML key "${key}" at line ${lineNumber}`);
    }

    target[key] = parseTomlValue(rawValue, lineNumber);
  });

  return root;
}
