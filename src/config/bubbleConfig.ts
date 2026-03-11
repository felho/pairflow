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
  DEFAULT_ENFORCEMENT_MODE_ALL_GATE,
  DEFAULT_ENFORCEMENT_MODE_DOCS_GATE,
  DEFAULT_DOC_CONTRACT_ROUND_GATE_APPLIES_AFTER,
  DEFAULT_LOCAL_OVERLAY_ENABLED,
  DEFAULT_LOCAL_OVERLAY_ENTRIES,
  DEFAULT_LOCAL_OVERLAY_MODE,
  DEFAULT_MAX_ROUNDS,
  DEFAULT_PAIRFLOW_COMMAND_PROFILE,
  DEFAULT_QUALITY_MODE,
  DEFAULT_REVIEW_ARTIFACT_TYPE,
  DEFAULT_REVIEWER_CONTEXT_MODE,
  DEFAULT_SEVERITY_GATE_ROUND,
  DEFAULT_WATCHDOG_TIMEOUT_MINUTES,
  DEFAULT_WORK_MODE
} from "./defaults.js";
import {
  isCreateReviewArtifactType,
  isAgentName,
  isAttachLauncher,
  isGateEnforcementLevel,
  isLocalOverlayMode,
  isPairflowCommandProfile,
  isQualityMode,
  isReviewArtifactType,
  isReviewerContextMode,
  isWorkMode,
  type AttachLauncher,
  type BubbleConfig,
  type CreateReviewArtifactType,
  type GateEnforcementLevel
} from "../types/bubble.js";

export const TOML_PARSER_LIMITATIONS = [
  "No multiline strings (\"\"\"...\"\"\" / '''...''')",
  "No array-of-tables ([[section]])",
  "No dotted keys (a.b = \"value\")",
  "Double-quoted string escapes follow JSON.parse behavior only"
] as const;

export const MISSING_REVIEW_ARTIFACT_TYPE_OPTION =
  "MISSING_REVIEW_ARTIFACT_TYPE_OPTION" as const;
export const INVALID_REVIEW_ARTIFACT_TYPE_OPTION =
  "INVALID_REVIEW_ARTIFACT_TYPE_OPTION" as const;
export const REVIEW_ARTIFACT_TYPE_AUTO_REMOVED =
  "REVIEW_ARTIFACT_TYPE_AUTO_REMOVED" as const;
export const PAIRFLOW_COMMAND_PROFILE_INVALID =
  "PAIRFLOW_COMMAND_PROFILE_INVALID" as const;
export const DEPENDENCY_FAIL_REPO_REGISTRY_REGISTER =
  "DEPENDENCY_FAIL_REPO_REGISTRY_REGISTER" as const;
export const SEVERITY_GATE_ROUND_INVALID =
  "SEVERITY_GATE_ROUND_INVALID" as const;

function formatCreateReviewArtifactTypeError(
  reasonCode:
    | typeof MISSING_REVIEW_ARTIFACT_TYPE_OPTION
    | typeof INVALID_REVIEW_ARTIFACT_TYPE_OPTION
    | typeof REVIEW_ARTIFACT_TYPE_AUTO_REMOVED,
  message: string
): string {
  return `${reasonCode}: ${message}`;
}

export function assertCreateReviewArtifactType(
  value: unknown
): CreateReviewArtifactType {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(
      formatCreateReviewArtifactTypeError(
        MISSING_REVIEW_ARTIFACT_TYPE_OPTION,
        "Missing required --review-artifact-type=<document|code> option."
      )
    );
  }

  const normalized = value.trim();
  if (normalized === "auto") {
    throw new Error(
      formatCreateReviewArtifactTypeError(
        REVIEW_ARTIFACT_TYPE_AUTO_REMOVED,
        "The --review-artifact-type=auto value is removed. Use --review-artifact-type=<document|code>."
      )
    );
  }

  if (!isCreateReviewArtifactType(normalized)) {
    throw new Error(
      formatCreateReviewArtifactTypeError(
        INVALID_REVIEW_ARTIFACT_TYPE_OPTION,
        `Invalid --review-artifact-type value "${normalized}". Accepted values: document|code.`
      )
    );
  }

  return normalized;
}

export function assertPairflowCommandProfile(value: unknown): "external" | "self_host" {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(
      `${PAIRFLOW_COMMAND_PROFILE_INVALID}: Missing --pairflow-command-profile value. Accepted values: external|self_host.`
    );
  }

  const normalized = value.trim();
  if (!isPairflowCommandProfile(normalized)) {
    throw new Error(
      `${PAIRFLOW_COMMAND_PROFILE_INVALID}: Invalid --pairflow-command-profile value "${normalized}". Accepted values: external|self_host.`
    );
  }

  return normalized;
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

function describeUnknownValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (
    typeof value === "number"
    || typeof value === "boolean"
    || value === null
    || value === undefined
  ) {
    return `${value}`;
  }
  if (Array.isArray(value)) {
    return "[array]";
  }
  if (isRecord(value)) {
    return "[object]";
  }
  return `[${typeof value}]`;
}

export function validateBubbleConfig(input: unknown): ValidationResult<BubbleConfig> {
  const errors: ValidationError[] = [];
  if (!isRecord(input)) {
    return validationFail([{ path: "$", message: "Config must be an object" }]);
  }

  const id = readString(input, "id", "id", errors, true);
  const bubbleInstanceId = readString(
    input,
    "bubble_instance_id",
    "bubble_instance_id",
    errors,
    false
  );
  if (
    bubbleInstanceId !== undefined &&
    !/^[A-Za-z0-9][A-Za-z0-9_-]{9,127}$/u.test(bubbleInstanceId)
  ) {
    errors.push({
      path: "bubble_instance_id",
      message:
        "Must be 10-128 chars and contain only letters, digits, '_' or '-'"
    });
  }
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

  const pairflowCommandProfile =
    input.pairflow_command_profile ?? DEFAULT_PAIRFLOW_COMMAND_PROFILE;
  if (!isPairflowCommandProfile(pairflowCommandProfile)) {
    errors.push({
      path: "pairflow_command_profile",
      message: "Must be one of: external, self_host"
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

  const severityGateRound =
    input.severity_gate_round ?? DEFAULT_SEVERITY_GATE_ROUND;
  if (!isInteger(severityGateRound) || severityGateRound < 4) {
    errors.push({
      path: "severity_gate_round",
      message: `${SEVERITY_GATE_ROUND_INVALID}: Must be an integer >= 4`
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

  const accuracyCritical = input.accuracy_critical ?? false;
  if (typeof accuracyCritical !== "boolean") {
    errors.push({
      path: "accuracy_critical",
      message: "Must be a boolean"
    });
  }

  const attachLauncher = input.attach_launcher;
  if (attachLauncher !== undefined && !isAttachLauncher(attachLauncher)) {
    errors.push({
      path: "attach_launcher",
      message: "Must be one of: auto, warp, iterm2, terminal, ghostty, copy"
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
  const enforcementMode = readObject(
    input,
    "enforcement_mode",
    "enforcement_mode",
    errors,
    false
  );
  const docContractGates = readObject(
    input,
    "doc_contract_gates",
    "doc_contract_gates",
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
  const bootstrapCommand = commands
    ? readString(commands, "bootstrap", "commands.bootstrap", errors, false)
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

  const enforcementConfigWarnings: string[] = [];
  const existingEnforcementParseWarning = enforcementMode
    ? readString(
        enforcementMode,
        "parse_warning",
        "enforcement_mode.parse_warning",
        errors,
        false
      )
    : undefined;
  const allGateCandidate = enforcementMode?.all_gate;
  let allGate: GateEnforcementLevel = DEFAULT_ENFORCEMENT_MODE_ALL_GATE;
  if (allGateCandidate !== undefined) {
    if (isGateEnforcementLevel(allGateCandidate)) {
      allGate = allGateCandidate;
    } else {
      enforcementConfigWarnings.push(
        `enforcement_mode.all_gate must be one of: advisory, required. Received ${describeUnknownValue(allGateCandidate)}.`
      );
    }
  }
  const docsGateCandidate = enforcementMode?.docs_gate;
  let docsGate: GateEnforcementLevel =
    allGate === "required"
      ? "required"
      : DEFAULT_ENFORCEMENT_MODE_DOCS_GATE;
  if (docsGateCandidate !== undefined) {
    if (isGateEnforcementLevel(docsGateCandidate)) {
      docsGate = docsGateCandidate;
    } else {
      enforcementConfigWarnings.push(
        `enforcement_mode.docs_gate must be one of: advisory, required. Received ${describeUnknownValue(docsGateCandidate)}.`
      );
    }
  }
  if (allGate === "required" && docsGate !== "required") {
    enforcementConfigWarnings.push(
      "enforcement_mode.docs_gate cannot be advisory when enforcement_mode.all_gate is required; docs_gate normalized to required."
    );
    docsGate = "required";
  }

  const docContractGateWarnings: string[] = [];
  const existingDocContractGateParseWarning = docContractGates
    ? readString(
        docContractGates,
        "parse_warning",
        "doc_contract_gates.parse_warning",
        errors,
        false
      )
    : undefined;
  const roundGateAppliesAfterCandidate = docContractGates?.round_gate_applies_after;
  let roundGateAppliesAfter = DEFAULT_DOC_CONTRACT_ROUND_GATE_APPLIES_AFTER;
  if (roundGateAppliesAfterCandidate !== undefined) {
    if (isInteger(roundGateAppliesAfterCandidate) && roundGateAppliesAfterCandidate >= 0) {
      roundGateAppliesAfter = roundGateAppliesAfterCandidate;
    } else {
      docContractGateWarnings.push(
        `doc_contract_gates.round_gate_applies_after must be a non-negative integer. Received ${describeUnknownValue(roundGateAppliesAfterCandidate)}.`
      );
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
    ...(bubbleInstanceId !== undefined
      ? { bubble_instance_id: bubbleInstanceId }
      : {}),
    repo_path: repoPath as string,
    base_branch: baseBranch as string,
    bubble_branch: bubbleBranch as string,
    work_mode: workMode as BubbleConfig["work_mode"],
    quality_mode: qualityMode as BubbleConfig["quality_mode"],
    review_artifact_type:
      reviewArtifactType as BubbleConfig["review_artifact_type"],
    pairflow_command_profile:
      pairflowCommandProfile as BubbleConfig["pairflow_command_profile"],
    reviewer_context_mode:
      reviewerContextMode as BubbleConfig["reviewer_context_mode"],
    watchdog_timeout_minutes: watchdogTimeoutMinutes as number,
    max_rounds: maxRounds as number,
    severity_gate_round: severityGateRound as number,
    commit_requires_approval: commitRequiresApproval as boolean,
    accuracy_critical: accuracyCritical as boolean,
    ...(attachLauncher !== undefined
      ? { attach_launcher: attachLauncher as AttachLauncher }
      : {}),
    agents: {
      implementer: implementer as "codex" | "claude",
      reviewer: reviewer as "codex" | "claude"
    },
    commands: {
      ...(bootstrapCommand !== undefined
        ? { bootstrap: bootstrapCommand }
        : {}),
      test: testCommand as string,
      typecheck: typecheckCommand as string
    },
    notifications: validatedNotifications,
    local_overlay: {
      enabled: localOverlayEnabled,
      mode: localOverlayMode,
      entries: localOverlayEntries
    },
    enforcement_mode: {
      all_gate: allGate,
      docs_gate: docsGate,
      ...((existingEnforcementParseWarning !== undefined || enforcementConfigWarnings.length > 0)
        ? {
            parse_warning: [
              existingEnforcementParseWarning,
              ...(enforcementConfigWarnings.length > 0
                ? [enforcementConfigWarnings.join(" ")]
                : [])
            ]
              .filter((entry): entry is string => entry !== undefined)
              .join(" ")
          }
        : {})
    },
    doc_contract_gates: {
      round_gate_applies_after: roundGateAppliesAfter,
      ...((existingDocContractGateParseWarning !== undefined || docContractGateWarnings.length > 0)
        ? {
            parse_warning: [
              existingDocContractGateParseWarning,
              ...(docContractGateWarnings.length > 0
                ? [docContractGateWarnings.join(" ")]
                : [])
            ]
              .filter((entry): entry is string => entry !== undefined)
              .join(" ")
          }
        : {})
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
  const enforcementMode = config.enforcement_mode;
  const docContractGates = config.doc_contract_gates;
  const lines: Array<string | undefined> = [
    `id = ${tomlString(config.id)}`,
    config.bubble_instance_id
      ? `bubble_instance_id = ${tomlString(config.bubble_instance_id)}`
      : undefined,
    `repo_path = ${tomlString(config.repo_path)}`,
    `base_branch = ${tomlString(config.base_branch)}`,
    `bubble_branch = ${tomlString(config.bubble_branch)}`,
    `work_mode = ${tomlString(config.work_mode)}`,
    `quality_mode = ${tomlString(config.quality_mode)}`,
    `review_artifact_type = ${tomlString(config.review_artifact_type)}`,
    `pairflow_command_profile = ${tomlString(config.pairflow_command_profile)}`,
    `reviewer_context_mode = ${tomlString(config.reviewer_context_mode)}`,
    `watchdog_timeout_minutes = ${config.watchdog_timeout_minutes}`,
    `max_rounds = ${config.max_rounds}`,
    `severity_gate_round = ${config.severity_gate_round}`,
    `commit_requires_approval = ${config.commit_requires_approval}`,
    `accuracy_critical = ${config.accuracy_critical === true}`,
    config.attach_launcher !== undefined
      ? `attach_launcher = ${tomlString(config.attach_launcher)}`
      : '# attach_launcher unset; attach uses ~/.pairflow/config.toml, then "auto"',
    config.open_command
      ? `open_command = ${tomlString(config.open_command)}`
      : undefined,
    "",
    "[agents]",
    `implementer = ${tomlString(config.agents.implementer)}`,
    `reviewer = ${tomlString(config.agents.reviewer)}`,
    "",
    "[commands]",
    config.commands.bootstrap
      ? `bootstrap = ${tomlString(config.commands.bootstrap)}`
      : undefined,
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
    `entries = ${tomlStringArray(localOverlay.entries)}`,
    "",
    "[enforcement_mode]",
    `all_gate = ${tomlString(enforcementMode.all_gate)}`,
    `docs_gate = ${tomlString(enforcementMode.docs_gate)}`,
    enforcementMode.parse_warning !== undefined
      ? `parse_warning = ${tomlString(enforcementMode.parse_warning)}`
      : undefined,
    "",
    "[doc_contract_gates]",
    `round_gate_applies_after = ${docContractGates.round_gate_applies_after}`,
    docContractGates.parse_warning !== undefined
      ? `parse_warning = ${tomlString(docContractGates.parse_warning)}`
      : undefined
  ];

  return `${normalizeTomlLines(lines).join("\n")}\n`;
}
