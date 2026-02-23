import {
  assertValidation,
  isInteger,
  isNonEmptyString,
  isRecord,
  validationFail,
  validationOk,
  type ValidationError,
  type ValidationResult
} from "../core/validation.js";
import {
  DEFAULT_COMMIT_REQUIRES_APPROVAL,
  DEFAULT_MAX_ROUNDS,
  DEFAULT_QUALITY_MODE,
  DEFAULT_REVIEWER_CONTEXT_MODE,
  DEFAULT_WATCHDOG_TIMEOUT_MINUTES,
  DEFAULT_WORK_MODE
} from "./defaults.js";
import {
  isAgentName,
  isQualityMode,
  isReviewerContextMode,
  isWorkMode,
  type BubbleConfig
} from "../types/bubble.js";

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

function readString(
  source: Record<string, unknown>,
  key: string,
  path: string,
  errors: ValidationError[],
  required: boolean
): string | undefined {
  const value = source[key];
  if (value === undefined) {
    if (required) {
      errors.push({ path, message: "Missing required field" });
    }
    return undefined;
  }

  if (!isNonEmptyString(value)) {
    errors.push({ path, message: "Must be a non-empty string" });
    return undefined;
  }

  return value;
}

function readBoolean(
  source: Record<string, unknown>,
  key: string,
  path: string,
  errors: ValidationError[],
  required: boolean
): boolean | undefined {
  const value = source[key];
  if (value === undefined) {
    if (required) {
      errors.push({ path, message: "Missing required field" });
    }
    return undefined;
  }

  if (typeof value !== "boolean") {
    errors.push({ path, message: "Must be a boolean" });
    return undefined;
  }

  return value;
}

function readObject(
  source: Record<string, unknown>,
  key: string,
  path: string,
  errors: ValidationError[],
  required: boolean
): Record<string, unknown> | undefined {
  const value = source[key];
  if (value === undefined) {
    if (required) {
      errors.push({ path, message: "Missing required section" });
    }
    return undefined;
  }

  if (!isRecord(value)) {
    errors.push({ path, message: "Must be an object/section" });
    return undefined;
  }

  return value;
}

export function validateBubbleConfig(input: unknown): ValidationResult<BubbleConfig> {
  const errors: ValidationError[] = [];
  if (!isRecord(input)) {
    return validationFail([{ path: "$", message: "Config must be an object" }]);
  }

  const id = readString(input, "id", "id", errors, true);
  const repoPath = readString(input, "repo_path", "repo_path", errors, true);
  const baseBranch = readString(input, "base_branch", "base_branch", errors, true);
  const bubbleBranch = readString(
    input,
    "bubble_branch",
    "bubble_branch",
    errors,
    true
  );

  const workMode = input.work_mode ?? DEFAULT_WORK_MODE;
  if (!isWorkMode(workMode)) {
    errors.push({
      path: "work_mode",
      message: "Must be one of: worktree, clone"
    });
  }

  const qualityMode = input.quality_mode ?? DEFAULT_QUALITY_MODE;
  if (!isQualityMode(qualityMode)) {
    errors.push({
      path: "quality_mode",
      message: "MVP only supports strict quality mode"
    });
  }

  const reviewerContextMode =
    input.reviewer_context_mode ?? DEFAULT_REVIEWER_CONTEXT_MODE;
  if (!isReviewerContextMode(reviewerContextMode)) {
    errors.push({
      path: "reviewer_context_mode",
      message: "Must be one of: fresh, persistent"
    });
  }

  const watchdogTimeoutMinutes =
    input.watchdog_timeout_minutes ?? DEFAULT_WATCHDOG_TIMEOUT_MINUTES;
  if (!isInteger(watchdogTimeoutMinutes) || watchdogTimeoutMinutes <= 0) {
    errors.push({
      path: "watchdog_timeout_minutes",
      message: "Must be a positive integer"
    });
  }

  const maxRounds = input.max_rounds ?? DEFAULT_MAX_ROUNDS;
  if (!isInteger(maxRounds) || maxRounds <= 0) {
    errors.push({
      path: "max_rounds",
      message: "Must be a positive integer"
    });
  }

  const commitRequiresApproval =
    input.commit_requires_approval ?? DEFAULT_COMMIT_REQUIRES_APPROVAL;
  if (typeof commitRequiresApproval !== "boolean") {
    errors.push({
      path: "commit_requires_approval",
      message: "Must be a boolean"
    });
  }

  const openCommand = readString(input, "open_command", "open_command", errors, false);

  const agents = readObject(input, "agents", "agents", errors, true);
  const commands = readObject(input, "commands", "commands", errors, true);
  const notifications = readObject(
    input,
    "notifications",
    "notifications",
    errors,
    false
  );

  const implementer = agents
    ? readString(agents, "implementer", "agents.implementer", errors, true)
    : undefined;
  if (implementer !== undefined && !isAgentName(implementer)) {
    errors.push({
      path: "agents.implementer",
      message: "Must be one of: codex, claude"
    });
  }

  const reviewer = agents
    ? readString(agents, "reviewer", "agents.reviewer", errors, true)
    : undefined;
  if (reviewer !== undefined && !isAgentName(reviewer)) {
    errors.push({
      path: "agents.reviewer",
      message: "Must be one of: codex, claude"
    });
  }

  if (implementer !== undefined && reviewer !== undefined && implementer === reviewer) {
    errors.push({
      path: "agents",
      message: "implementer and reviewer must be different agents"
    });
  }

  const testCommand = commands
    ? readString(commands, "test", "commands.test", errors, true)
    : undefined;
  const typecheckCommand = commands
    ? readString(commands, "typecheck", "commands.typecheck", errors, true)
    : undefined;

  const notificationsEnabled = notifications
    ? (readBoolean(
        notifications,
        "enabled",
        "notifications.enabled",
        errors,
        false
      ) ?? true)
    : true;
  const waitingHumanSound = notifications
    ? readString(
        notifications,
        "waiting_human_sound",
        "notifications.waiting_human_sound",
        errors,
        false
      )
    : undefined;
  const convergedSound = notifications
    ? readString(
        notifications,
        "converged_sound",
        "notifications.converged_sound",
        errors,
        false
      )
    : undefined;

  if (errors.length > 0) {
    return validationFail(errors);
  }

  const validatedNotifications: BubbleConfig["notifications"] = {
    enabled: notificationsEnabled
  };
  if (waitingHumanSound !== undefined) {
    validatedNotifications.waiting_human_sound = waitingHumanSound;
  }
  if (convergedSound !== undefined) {
    validatedNotifications.converged_sound = convergedSound;
  }

  const validatedConfig: BubbleConfig = {
    id: id as string,
    repo_path: repoPath as string,
    base_branch: baseBranch as string,
    bubble_branch: bubbleBranch as string,
    work_mode: workMode as BubbleConfig["work_mode"],
    quality_mode: qualityMode as BubbleConfig["quality_mode"],
    reviewer_context_mode:
      reviewerContextMode as BubbleConfig["reviewer_context_mode"],
    watchdog_timeout_minutes: watchdogTimeoutMinutes as number,
    max_rounds: maxRounds as number,
    commit_requires_approval: commitRequiresApproval as boolean,
    agents: {
      implementer: implementer as "codex" | "claude",
      reviewer: reviewer as "codex" | "claude"
    },
    commands: {
      test: testCommand as string,
      typecheck: typecheckCommand as string
    },
    notifications: validatedNotifications
  };

  if (openCommand !== undefined) {
    validatedConfig.open_command = openCommand;
  }

  return validationOk(validatedConfig);
}

export function assertValidBubbleConfig(input: unknown): BubbleConfig {
  const result = validateBubbleConfig(input);
  return assertValidation(result, "Invalid bubble config");
}

export function parseBubbleConfigToml(input: string): BubbleConfig {
  const parsed = parseToml(input);
  return assertValidBubbleConfig(parsed);
}

export function parseWatchdogTimeoutMinutes(input: unknown): number {
  if (input === undefined) {
    return DEFAULT_WATCHDOG_TIMEOUT_MINUTES;
  }

  if (!isInteger(input) || input <= 0) {
    throw new Error("watchdog_timeout_minutes must be a positive integer");
  }

  return input;
}

function tomlString(value: string): string {
  return JSON.stringify(value);
}

function normalizeTomlLines(lines: Array<string | undefined>): string[] {
  const normalized: string[] = [];
  for (const line of lines) {
    if (line === undefined) {
      continue;
    }

    if (line.length === 0) {
      if (normalized.length === 0 || normalized[normalized.length - 1] === "") {
        continue;
      }
    }

    normalized.push(line);
  }

  while (normalized.length > 0 && normalized[normalized.length - 1] === "") {
    normalized.pop();
  }

  return normalized;
}

export function renderBubbleConfigToml(config: BubbleConfig): string {
  const lines: Array<string | undefined> = [
    `id = ${tomlString(config.id)}`,
    `repo_path = ${tomlString(config.repo_path)}`,
    `base_branch = ${tomlString(config.base_branch)}`,
    `bubble_branch = ${tomlString(config.bubble_branch)}`,
    `work_mode = ${tomlString(config.work_mode)}`,
    `quality_mode = ${tomlString(config.quality_mode)}`,
    `reviewer_context_mode = ${tomlString(config.reviewer_context_mode)}`,
    `watchdog_timeout_minutes = ${config.watchdog_timeout_minutes}`,
    `max_rounds = ${config.max_rounds}`,
    `commit_requires_approval = ${config.commit_requires_approval}`,
    config.open_command
      ? `open_command = ${tomlString(config.open_command)}`
      : undefined,
    "",
    "[agents]",
    `implementer = ${tomlString(config.agents.implementer)}`,
    `reviewer = ${tomlString(config.agents.reviewer)}`,
    "",
    "[commands]",
    `test = ${tomlString(config.commands.test)}`,
    `typecheck = ${tomlString(config.commands.typecheck)}`,
    "",
    "[notifications]",
    `enabled = ${config.notifications.enabled}`,
    config.notifications.waiting_human_sound
      ? `waiting_human_sound = ${tomlString(config.notifications.waiting_human_sound)}`
      : undefined,
    config.notifications.converged_sound
      ? `converged_sound = ${tomlString(config.notifications.converged_sound)}`
      : undefined
  ];

  return `${normalizeTomlLines(lines).join("\n")}\n`;
}
