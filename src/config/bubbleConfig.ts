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
  DEFAULT_LOCAL_OVERLAY_ENABLED,
  DEFAULT_LOCAL_OVERLAY_ENTRIES,
  DEFAULT_LOCAL_OVERLAY_MODE,
  DEFAULT_MAX_ROUNDS,
  DEFAULT_QUALITY_MODE,
  DEFAULT_REVIEW_ARTIFACT_TYPE,
  DEFAULT_REVIEWER_CONTEXT_MODE,
  DEFAULT_WATCHDOG_TIMEOUT_MINUTES,
  DEFAULT_WORK_MODE
} from "./defaults.js";
import {
  isAgentName,
  isLocalOverlayMode,
  isQualityMode,
  isReviewArtifactType,
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

function readStringArray(
  source: Record<string, unknown>,
  key: string,
  path: string,
  errors: ValidationError[],
  required: boolean
): string[] | undefined {
  const value = source[key];
  if (value === undefined) {
    if (required) {
      errors.push({ path, message: "Missing required field" });
    }
    return undefined;
  }

  if (!Array.isArray(value)) {
    errors.push({ path, message: "Must be an array of non-empty strings" });
    return undefined;
  }

  const result: string[] = [];
  value.forEach((item, index) => {
    if (!isNonEmptyString(item)) {
      errors.push({
        path: `${path}[${index}]`,
        message: "Must be a non-empty string"
      });
      return;
    }
    result.push(item.trim());
  });

  return result;
}

function isSafeLocalOverlayEntry(value: string): boolean {
  const normalized = value.replaceAll("\\", "/");
  if (normalized.startsWith("/") || normalized.includes("//")) {
    return false;
  }
  const segments = normalized.split("/");
  return segments.every((segment) => segment.length > 0 && segment !== ".." && segment !== ".");
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

  const reviewArtifactType =
    input.review_artifact_type ?? DEFAULT_REVIEW_ARTIFACT_TYPE;
  if (!isReviewArtifactType(reviewArtifactType)) {
    errors.push({
      path: "review_artifact_type",
      message: "Must be one of: auto, code, document"
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
  const localOverlay = readObject(
    input,
    "local_overlay",
    "local_overlay",
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

  const localOverlayEnabled = localOverlay
    ? (readBoolean(
        localOverlay,
        "enabled",
        "local_overlay.enabled",
        errors,
        false
      ) ?? DEFAULT_LOCAL_OVERLAY_ENABLED)
    : DEFAULT_LOCAL_OVERLAY_ENABLED;
  const localOverlayModeCandidate =
    localOverlay?.mode ?? DEFAULT_LOCAL_OVERLAY_MODE;
  if (!isLocalOverlayMode(localOverlayModeCandidate)) {
    errors.push({
      path: "local_overlay.mode",
      message: "Must be one of: symlink, copy"
    });
  }
  const localOverlayMode = isLocalOverlayMode(localOverlayModeCandidate)
    ? localOverlayModeCandidate
    : DEFAULT_LOCAL_OVERLAY_MODE;

  const localOverlayEntriesInput = localOverlay
    ? readStringArray(
        localOverlay,
        "entries",
        "local_overlay.entries",
        errors,
        false
      )
    : undefined;
  const localOverlayEntries =
    localOverlayEntriesInput === undefined
      ? [...DEFAULT_LOCAL_OVERLAY_ENTRIES]
      : localOverlayEntriesInput;
  for (const entry of localOverlayEntries) {
    if (!isSafeLocalOverlayEntry(entry)) {
      errors.push({
        path: "local_overlay.entries",
        message:
          "Entries must be normalized relative paths without '.'/'..' segments"
      });
    }
  }

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
    review_artifact_type:
      reviewArtifactType as BubbleConfig["review_artifact_type"],
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
    notifications: validatedNotifications,
    local_overlay: {
      enabled: localOverlayEnabled,
      mode: localOverlayMode,
      entries: localOverlayEntries
    }
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

function tomlStringArray(values: string[]): string {
  return `[${values.map((value) => tomlString(value)).join(", ")}]`;
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
  const localOverlay = config.local_overlay ?? {
    enabled: DEFAULT_LOCAL_OVERLAY_ENABLED,
    mode: DEFAULT_LOCAL_OVERLAY_MODE,
    entries: [...DEFAULT_LOCAL_OVERLAY_ENTRIES]
  };
  const lines: Array<string | undefined> = [
    `id = ${tomlString(config.id)}`,
    `repo_path = ${tomlString(config.repo_path)}`,
    `base_branch = ${tomlString(config.base_branch)}`,
    `bubble_branch = ${tomlString(config.bubble_branch)}`,
    `work_mode = ${tomlString(config.work_mode)}`,
    `quality_mode = ${tomlString(config.quality_mode)}`,
    `review_artifact_type = ${tomlString(config.review_artifact_type)}`,
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
      : undefined,
    "",
    "[local_overlay]",
    `enabled = ${localOverlay.enabled}`,
    `mode = ${tomlString(localOverlay.mode)}`,
    `entries = ${tomlStringArray(localOverlay.entries)}`
  ];

  return `${normalizeTomlLines(lines).join("\n")}\n`;
}
