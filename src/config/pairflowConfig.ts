import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

import {
  SchemaValidationError,
  assertValidation,
  isNonEmptyString,
  isRecord,
  validationFail,
  validationOk,
  type ValidationError,
  type ValidationResult
} from "../core/validation.js";
import { isAttachLauncher, type AttachLauncher } from "../types/bubble.js";

export interface PairflowGlobalConfig {
  attach_launcher?: AttachLauncher;
  open_command?: string;
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

function parsePairflowGlobalToml(input: string): Record<string, unknown> {
  const parsed: Record<string, unknown> = {};
  const lines = input.split(/\r?\n/u);
  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const cleaned = stripInlineComment(line).trim();
    if (cleaned.length === 0) {
      return;
    }
    if (cleaned.startsWith("[")) {
      throw new Error(
        `TOML sections are not supported in global config (line ${lineNumber})`
      );
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
    if (Object.prototype.hasOwnProperty.call(parsed, key)) {
      throw new Error(`Duplicate TOML key "${key}" at line ${lineNumber}`);
    }
    parsed[key] = parseTomlValue(rawValue, lineNumber);
  });

  return parsed;
}

export function resolvePairflowGlobalConfigPath(): string {
  return join(homedir(), ".pairflow", "config.toml");
}

export function validatePairflowGlobalConfig(
  input: unknown
): ValidationResult<PairflowGlobalConfig> {
  const errors: ValidationError[] = [];
  if (!isRecord(input)) {
    return validationFail([
      {
        path: "$",
        message: "Config must be an object"
      }
    ]);
  }

  const attachLauncher = input.attach_launcher;
  const validatedAttachLauncher = isAttachLauncher(attachLauncher)
    ? attachLauncher
    : undefined;

  if (attachLauncher !== undefined && validatedAttachLauncher === undefined) {
    errors.push({
      path: "attach_launcher",
      message: "Must be one of: auto, warp, iterm2, terminal, ghostty, copy"
    });
  }

  const openCommand = input.open_command;
  const validatedOpenCommand = isNonEmptyString(openCommand)
    ? openCommand
    : undefined;

  if (openCommand !== undefined && validatedOpenCommand === undefined) {
    errors.push({
      path: "open_command",
      message: "Must be a non-empty string"
    });
  }

  if (errors.length > 0) {
    return validationFail(errors);
  }

  return validationOk({
    ...(validatedAttachLauncher !== undefined
      ? { attach_launcher: validatedAttachLauncher }
      : {}),
    ...(validatedOpenCommand !== undefined
      ? { open_command: validatedOpenCommand }
      : {})
  });
}

export function assertValidPairflowGlobalConfig(input: unknown): PairflowGlobalConfig {
  return assertValidation(
    validatePairflowGlobalConfig(input),
    "Invalid Pairflow global config"
  );
}

export function parsePairflowGlobalConfigToml(input: string): PairflowGlobalConfig {
  const parsed = (() => {
    try {
      return parsePairflowGlobalToml(input);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new SchemaValidationError("Invalid Pairflow global config", [
        {
          path: "$",
          message: reason
        }
      ]);
    }
  })();
  const validated = validatePairflowGlobalConfig(parsed);
  return assertValidation(validated, "Invalid Pairflow global config");
}

export async function loadPairflowGlobalConfig(
  path: string = resolvePairflowGlobalConfigPath()
): Promise<PairflowGlobalConfig> {
  const raw = await readFile(path, "utf8").catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") {
      return undefined;
    }
    throw error;
  });
  if (raw === undefined) {
    return {};
  }

  return parsePairflowGlobalConfigToml(raw);
}
