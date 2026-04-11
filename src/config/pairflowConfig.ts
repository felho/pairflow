import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

import {
  SchemaValidationError,
  assertValidation,
  isNonEmptyString,
  isRecord,
  validateTcpPortList,
  validationFail,
  validationOk,
  type ValidationError,
  type ValidationResult
} from "../v11/shared/validation/primitives.js";
import {
  isAttachLauncher,
  type AttachLauncher,
  type PairflowRemoteHostConfig
} from "../types/bubble.js";

export interface PairflowGlobalConfig {
  attach_launcher?: AttachLauncher;
  open_command?: string;
  remotes?: Record<string, PairflowRemoteHostConfig>;
}

const PAIRFLOW_REMOTE_CONFIG_INVALID = "PAIRFLOW_REMOTE_CONFIG_INVALID";
const PAIRFLOW_REMOTE_CONFIG_PARSE_ERROR = "PAIRFLOW_REMOTE_CONFIG_PARSE_ERROR";
const REMOTE_CONFIG_KEYS = new Set([
  "host",
  "repo_base",
  "user",
  "pairflow_command",
  "default_port_forwards"
]);
const REMOTE_ALIAS_PATTERN = /^[A-Za-z0-9_-]+$/u;

export function validateRemoteDefaultPortForwards(
  value: unknown,
  path: string,
  errors: ValidationError[]
): number[] | undefined {
  return validateTcpPortList({
    value,
    path,
    errors,
    invalidArrayMessage:
      `${PAIRFLOW_REMOTE_CONFIG_INVALID}: Must be an array of integers in range 1..65535`,
    invalidEntryMessage:
      `${PAIRFLOW_REMOTE_CONFIG_INVALID}: Must be an integer in range 1..65535`
  });
}

class PairflowGlobalConfigParseError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "PairflowGlobalConfigParseError";
  }
}

function buildGlobalConfigParseError(
  message: string
): PairflowGlobalConfigParseError {
  return new PairflowGlobalConfigParseError(message);
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
    throw buildGlobalConfigParseError(
      `Multiline TOML strings are not supported by this parser (line ${lineNumber})`
    );
  }

  if (value.startsWith("\"")) {
    try {
      return JSON.parse(value);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw buildGlobalConfigParseError(
        `Invalid quoted string at line ${lineNumber}: ${reason}`
      );
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

  throw buildGlobalConfigParseError(
    `Unsupported TOML value at line ${lineNumber}; strings must be quoted`
  );
}

function parsePairflowGlobalToml(input: string): Record<string, unknown> {
  const parsed: Record<string, unknown> = {};
  let activeRemoteName: string | undefined;
  const seenRemoteSections = new Set<string>();
  const lines = input.split(/\r?\n/u);
  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const cleaned = stripInlineComment(line).trim();
    if (cleaned.length === 0) {
      return;
    }
    if (cleaned.startsWith("[")) {
      if (cleaned.startsWith("[[")) {
        throw buildGlobalConfigParseError(
          `${PAIRFLOW_REMOTE_CONFIG_PARSE_ERROR}: Array-of-tables are not supported in global config (line ${lineNumber})`
        );
      }
      if (!cleaned.endsWith("]")) {
        throw buildGlobalConfigParseError(
          `${PAIRFLOW_REMOTE_CONFIG_PARSE_ERROR}: Invalid TOML section header at line ${lineNumber}`
        );
      }

      const sectionName = cleaned.slice(1, -1).trim();
      const segments = sectionName.split(".").map((segment) => segment.trim());
      if (
        segments.length !== 2
        || segments[0] !== "remotes"
        || !/^[A-Za-z0-9_-]+$/u.test(segments[1] ?? "")
      ) {
        throw buildGlobalConfigParseError(
          `${PAIRFLOW_REMOTE_CONFIG_PARSE_ERROR}: Unsupported global config section [${sectionName}] at line ${lineNumber}; only [remotes.<name>] is supported`
        );
      }

      const remoteName = segments[1] as string;
      if (seenRemoteSections.has(remoteName)) {
        throw buildGlobalConfigParseError(
          `${PAIRFLOW_REMOTE_CONFIG_PARSE_ERROR}: Duplicate TOML section [remotes.${remoteName}] at line ${lineNumber}`
        );
      }
      seenRemoteSections.add(remoteName);
      const remotes = parsed.remotes;
      if (remotes !== undefined && !isRecord(remotes)) {
        throw buildGlobalConfigParseError(
          `${PAIRFLOW_REMOTE_CONFIG_PARSE_ERROR}: Section path conflict at [remotes.${remoteName}]`
        );
      }

      const remotesRecord =
        remotes === undefined ? {} : remotes;
      const existingRemote = remotesRecord[remoteName];
      if (existingRemote !== undefined && !isRecord(existingRemote)) {
        throw buildGlobalConfigParseError(
          `${PAIRFLOW_REMOTE_CONFIG_PARSE_ERROR}: Section path conflict at [remotes.${remoteName}]`
        );
      }
      remotesRecord[remoteName] = existingRemote ?? {};
      parsed.remotes = remotesRecord;
      activeRemoteName = remoteName;
      return;
    }

    const separatorIndex = findEqualsIndex(cleaned);
    if (separatorIndex <= 0) {
      throw buildGlobalConfigParseError(
        `${PAIRFLOW_REMOTE_CONFIG_PARSE_ERROR}: Invalid TOML key-value line at line ${lineNumber}`
      );
    }
    const key = cleaned.slice(0, separatorIndex).trim();
    const rawValue = cleaned.slice(separatorIndex + 1).trim();
    if (key.includes(".")) {
      throw buildGlobalConfigParseError(
        `${PAIRFLOW_REMOTE_CONFIG_PARSE_ERROR}: Dotted TOML keys are not supported by this parser (line ${lineNumber})`
      );
    }
    if (!/^[A-Za-z0-9_-]+$/u.test(key)) {
      throw buildGlobalConfigParseError(
        `${PAIRFLOW_REMOTE_CONFIG_PARSE_ERROR}: Invalid TOML key "${key}" at line ${lineNumber}`
      );
    }

    const target = (() => {
      if (activeRemoteName === undefined) {
        return parsed;
      }

      // This bounded parser keeps the most recent [remotes.<name>] table active
      // until another section header appears; bare keys do not jump back to root.
      if (!REMOTE_CONFIG_KEYS.has(key)) {
        throw buildGlobalConfigParseError(
          `${PAIRFLOW_REMOTE_CONFIG_PARSE_ERROR}: Key "${key}" at line ${lineNumber} is not valid inside [remotes.${activeRemoteName}]`
        );
      }

      const remotesRecord = parsed.remotes as Record<string, Record<string, unknown>>;
      const remoteTarget = remotesRecord[activeRemoteName];
      if (remoteTarget === undefined) {
        throw buildGlobalConfigParseError(
          `${PAIRFLOW_REMOTE_CONFIG_PARSE_ERROR}: Section path conflict at [remotes.${activeRemoteName}]`
        );
      }

      return remoteTarget;
    })();

    if (Object.prototype.hasOwnProperty.call(target, key)) {
      throw buildGlobalConfigParseError(
        `${PAIRFLOW_REMOTE_CONFIG_PARSE_ERROR}: Duplicate TOML key "${key}" at line ${lineNumber}`
      );
    }

    target[key] = parseTomlValue(rawValue, lineNumber);
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

  const remotesInput = input.remotes;
  const validatedRemotes: Record<string, PairflowRemoteHostConfig> = {};
  if (remotesInput !== undefined) {
    if (!isRecord(remotesInput)) {
      errors.push({
        path: "remotes",
        message: `${PAIRFLOW_REMOTE_CONFIG_INVALID}: Must be an object map of remote definitions`
      });
    } else {
      for (const [remoteName, remoteValue] of Object.entries(remotesInput)) {
        const remotePath = `remotes.${remoteName}`;
        if (!REMOTE_ALIAS_PATTERN.test(remoteName)) {
          errors.push({
            path: remotePath,
            message:
              `${PAIRFLOW_REMOTE_CONFIG_INVALID}: Remote alias must match ^[A-Za-z0-9_-]+$`
          });
        }
        if (!isRecord(remoteValue)) {
          errors.push({
            path: remotePath,
            message: `${PAIRFLOW_REMOTE_CONFIG_INVALID}: Remote definition must be an object`
          });
          continue;
        }

        const allowedKeys = new Set([
          "host",
          "repo_base",
          "user",
          "pairflow_command",
          "default_port_forwards"
        ]);
        for (const key of Object.keys(remoteValue)) {
          if (!allowedKeys.has(key)) {
            errors.push({
              path: `${remotePath}.${key}`,
              message: `${PAIRFLOW_REMOTE_CONFIG_INVALID}: Unknown remote config field "${key}"`
            });
          }
        }

        const host = remoteValue.host;
        const repoBase = remoteValue.repo_base;
        const user = remoteValue.user;
        const pairflowCommand = remoteValue.pairflow_command;
        const defaultPortForwards = remoteValue.default_port_forwards;

        if (!isNonEmptyString(host)) {
          errors.push({
            path: `${remotePath}.host`,
            message: `${PAIRFLOW_REMOTE_CONFIG_INVALID}: Must be a non-empty string`
          });
        }

        if (!isNonEmptyString(repoBase)) {
          errors.push({
            path: `${remotePath}.repo_base`,
            message: `${PAIRFLOW_REMOTE_CONFIG_INVALID}: Must be a non-empty string`
          });
        }

        if (user !== undefined && !isNonEmptyString(user)) {
          errors.push({
            path: `${remotePath}.user`,
            message: `${PAIRFLOW_REMOTE_CONFIG_INVALID}: Must be a non-empty string`
          });
        }

        if (
          pairflowCommand !== undefined
          && !isNonEmptyString(pairflowCommand)
        ) {
          errors.push({
            path: `${remotePath}.pairflow_command`,
            message: `${PAIRFLOW_REMOTE_CONFIG_INVALID}: Must be a non-empty string`
          });
        }

        let validatedDefaultPortForwards: number[] | undefined;
        if (defaultPortForwards !== undefined) {
          validatedDefaultPortForwards = validateRemoteDefaultPortForwards(
            defaultPortForwards,
            `${remotePath}.default_port_forwards`,
            errors
          );
        }

        if (!errors.some((error) => error.path.startsWith(`${remotePath}.`))) {
          validatedRemotes[remoteName] = {
            host: (host as string).trim(),
            repo_base: (repoBase as string).trim(),
            ...(user !== undefined ? { user: (user as string).trim() } : {}),
            ...(pairflowCommand !== undefined
              ? { pairflow_command: (pairflowCommand as string).trim() }
              : {}),
            ...(validatedDefaultPortForwards !== undefined
              ? { default_port_forwards: validatedDefaultPortForwards }
              : {})
          };
        }
      }
    }
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
      : {}),
    ...(Object.keys(validatedRemotes).length > 0
      ? { remotes: validatedRemotes }
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
      if (!(error instanceof PairflowGlobalConfigParseError)) {
        throw error;
      }
      throw new SchemaValidationError("Invalid Pairflow global config", [
        {
          path: "$",
          message: error.message
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
