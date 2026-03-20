import { parseArgs } from "node:util";

import type { BubbleCreateResult, createBubble } from "../../../core/bubble/createBubble.js";
import type { registerRepoInRegistry } from "../../../core/repo/registry.js";
import {
  assertCreateReviewArtifactType,
  assertPairflowCommandProfile,
  MISSING_REVIEW_ARTIFACT_TYPE_OPTION
} from "../../../config/bubbleConfig.js";
import {
  IDEATION_TASK_INPUT_CONFLICT,
  IDEATION_TASK_REQUIRED
} from "../../../core/bubble/ideation.js";
import {
  buildCreateBubbleInput,
  registerRepoAfterCreateBestEffort,
  resolveBubbleCreateCommandDependencies
} from "./createCliRunHelpers.js";
import type {
  CreateReviewArtifactType,
  PairflowCommandProfile
} from "../../../types/bubble.js";

export interface BubbleCreateCommandOptions {
  id?: string;
  repo?: string;
  base?: string;
  reviewArtifactType?: CreateReviewArtifactType;
  ideation?: boolean;
  task?: string;
  taskFile?: string;
  reviewerBrief?: string;
  reviewerBriefFile?: string;
  bootstrapCommand?: string;
  pairflowCommandProfile?: PairflowCommandProfile;
  accuracyCritical?: boolean;
  help: boolean;
}

export interface BubbleCreateCommandDependencies {
  createBubble?: typeof createBubble;
  registerRepoInRegistry?: typeof registerRepoInRegistry;
  reportRegistryRegistrationWarning?:
    | ((message: string) => void)
    | undefined;
}

export function getBubbleCreateHelpText(): string {
  return [
    "Usage:",
    "  pairflow bubble create --id <id> --repo <path> --base <branch> --review-artifact-type <document|code> ((--task <text> | --task-file <path>) | --ideation)",
    "",
    "Options:",
    "  --id <id>             Bubble id (max 40 chars, e.g. b_feature_x_01)",
    "  --repo <path>         Repository path",
    "  --base <branch>       Base branch",
    "  --review-artifact-type <document|code>  Required explicit ownership type",
    "  --ideation            Create ideation bubble without task payload (requires explicit kickoff later)",
    "  --task <text>         Inline task text",
    "  --task-file <path>    Task input from file",
    "  --bootstrap-command <cmd>    Optional worktree bootstrap command run by bubble start",
    "  --pairflow-command-profile <external|self_host>  Pairflow CLI command profile (default: external)",
    "  --reviewer-brief <text>      Optional inline reviewer brief",
    "  --reviewer-brief-file <path> Optional reviewer brief from file",
    "  --accuracy-critical          Enforce reviewer verification payload gate",
    "  Repo defaults: if <repo>/pairflow.toml sets [enforcement_mode].all_gate/docs_gate, bubble create inherits it.",
    "  -h, --help            Show this help"
  ].join("\n");
}

interface BubbleCreateParsedValues {
  id?: string;
  repo?: string;
  base?: string;
  task?: string;
  ideation?: boolean;
  help?: boolean;
  "review-artifact-type"?: string;
  "task-file"?: string;
  "reviewer-brief"?: string;
  "reviewer-brief-file"?: string;
  "bootstrap-command"?: string;
  "pairflow-command-profile"?: string;
  "accuracy-critical"?: boolean;
}

interface CreateValidationState {
  missing: string[];
  isReviewArtifactTypeMissing: boolean;
  reviewArtifactTypeValidationError: string | undefined;
  pairflowCommandProfileValidationError: string | undefined;
}

function parseBubbleCreateArgs(args: string[]) {
  return parseArgs({
    args,
    options: {
      id: {
        type: "string"
      },
      repo: {
        type: "string"
      },
      base: {
        type: "string"
      },
      "review-artifact-type": {
        type: "string"
      },
      task: {
        type: "string"
      },
      ideation: {
        type: "boolean"
      },
      "task-file": {
        type: "string"
      },
      "reviewer-brief": {
        type: "string"
      },
      "reviewer-brief-file": {
        type: "string"
      },
      "bootstrap-command": {
        type: "string"
      },
      "pairflow-command-profile": {
        type: "string"
      },
      "accuracy-critical": {
        type: "boolean"
      },
      help: {
        type: "boolean",
        short: "h"
      }
    },
    strict: true,
    allowPositionals: false
  });
}

function assignIfDefined<K extends keyof BubbleCreateCommandOptions>(
  target: BubbleCreateCommandOptions,
  key: K,
  value: BubbleCreateCommandOptions[K] | undefined
): void {
  if (value !== undefined) {
    target[key] = value;
  }
}

function appendMissingOption(
  missing: string[],
  value: string | undefined,
  option: string
): void {
  if (value === undefined) {
    missing.push(option);
  }
}

function toValidationErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function formatCreateError(message: string): string {
  return `${message} context: command_name=create.`;
}

function formatCreateErrorWithReason(message: string, reasonCode: string): string {
  return `${message} context: command_name=create reason_code=${reasonCode}.`;
}

function toCreateCommandError(message: string): Error {
  return new Error(formatCreateError(message));
}

function toCreateCommandReasonCodeError(message: string, reasonCode: string): Error {
  return new Error(formatCreateErrorWithReason(message, reasonCode));
}

function buildCreateOptions(values: BubbleCreateParsedValues): BubbleCreateCommandOptions {
  const options: BubbleCreateCommandOptions = {
    help: values.help ?? false
  };

  assignIfDefined(options, "id", values.id);
  assignIfDefined(options, "repo", values.repo);
  assignIfDefined(options, "base", values.base);
  assignIfDefined(options, "task", values.task);
  assignIfDefined(options, "ideation", values.ideation);
  assignIfDefined(options, "taskFile", values["task-file"]);
  assignIfDefined(options, "reviewerBrief", values["reviewer-brief"]);
  assignIfDefined(
    options,
    "reviewerBriefFile",
    values["reviewer-brief-file"]
  );
  assignIfDefined(
    options,
    "bootstrapCommand",
    values["bootstrap-command"]
  );
  assignIfDefined(
    options,
    "accuracyCritical",
    values["accuracy-critical"]
  );

  return options;
}

function parsePairflowCommandProfile(
  rawPairflowCommandProfile: string | undefined
): {
  pairflowCommandProfile?: PairflowCommandProfile;
  pairflowCommandProfileValidationError?: string;
} {
  if (rawPairflowCommandProfile === undefined) {
    return {};
  }
  try {
    return {
      pairflowCommandProfile: assertPairflowCommandProfile(rawPairflowCommandProfile)
    };
  } catch (error) {
    return {
      pairflowCommandProfileValidationError: toValidationErrorMessage(error)
    };
  }
}

function parseReviewArtifactType(
  rawReviewArtifactType: string | undefined
): {
  isReviewArtifactTypeMissing: boolean;
  reviewArtifactType?: CreateReviewArtifactType;
  reviewArtifactTypeValidationError?: string;
} {
  if (rawReviewArtifactType === undefined) {
    return {
      isReviewArtifactTypeMissing: true
    };
  }
  try {
    return {
      isReviewArtifactTypeMissing: false,
      reviewArtifactType: assertCreateReviewArtifactType(rawReviewArtifactType)
    };
  } catch (error) {
    return {
      isReviewArtifactTypeMissing: false,
      reviewArtifactTypeValidationError: toValidationErrorMessage(error)
    };
  }
}

function collectCreateValidationState(
  options: BubbleCreateCommandOptions,
  values: BubbleCreateParsedValues
): CreateValidationState {
  const missing: string[] = [];
  appendMissingOption(missing, options.id, "--id");
  appendMissingOption(missing, options.repo, "--repo");
  appendMissingOption(missing, options.base, "--base");

  const {
    pairflowCommandProfile,
    pairflowCommandProfileValidationError
  } = parsePairflowCommandProfile(values["pairflow-command-profile"]);
  if (pairflowCommandProfile !== undefined) {
    options.pairflowCommandProfile = pairflowCommandProfile;
  }

  const {
    isReviewArtifactTypeMissing,
    reviewArtifactType,
    reviewArtifactTypeValidationError
  } = parseReviewArtifactType(values["review-artifact-type"]);
  if (isReviewArtifactTypeMissing) {
    missing.push("--review-artifact-type");
  } else if (reviewArtifactType !== undefined) {
    options.reviewArtifactType = reviewArtifactType;
  }

  return {
    missing,
    isReviewArtifactTypeMissing,
    reviewArtifactTypeValidationError,
    pairflowCommandProfileValidationError
  };
}

function validateCreateTaskInputMode(options: BubbleCreateCommandOptions): void {
  const hasTask = options.task !== undefined;
  const hasTaskFile = options.taskFile !== undefined;
  const ideationMode = options.ideation === true;

  if (ideationMode && (hasTask || hasTaskFile)) {
    throw toCreateCommandError(
      `${IDEATION_TASK_INPUT_CONFLICT}: --ideation cannot be combined with --task or --task-file.`
    );
  }
  if (!ideationMode && !hasTask && !hasTaskFile) {
    throw toCreateCommandError(
      `${IDEATION_TASK_REQUIRED}: Missing task input. Use --task, --task-file, or --ideation for taskless ideation bubbles.`
    );
  }
  if (!ideationMode && hasTask && hasTaskFile) {
    throw toCreateCommandError(
      "CREATE_TASK_INPUT_MODE_CONFLICT: Use only one task input: --task or --task-file."
    );
  }
}

function validateCreateReviewerBriefInputMode(options: BubbleCreateCommandOptions): void {
  const hasReviewerBrief = options.reviewerBrief !== undefined;
  const hasReviewerBriefFile = options.reviewerBriefFile !== undefined;
  if (hasReviewerBrief && hasReviewerBriefFile) {
    throw toCreateCommandError(
      "CREATE_REVIEWER_BRIEF_INPUT_CONFLICT: Use only one reviewer brief input: --reviewer-brief or --reviewer-brief-file."
    );
  }
  if ((options.accuracyCritical ?? false) && !hasReviewerBrief && !hasReviewerBriefFile) {
    throw toCreateCommandError(
      "CREATE_ACCURACY_CRITICAL_REVIEWER_BRIEF_REQUIRED: --accuracy-critical requires reviewer brief input via --reviewer-brief or --reviewer-brief-file."
    );
  }
}

function formatAlsoMissingOptions(missingOptions: string[]): string {
  return missingOptions.length > 0 ? ` Also missing: ${missingOptions.join(", ")}.` : "";
}

function throwMissingCreateOptionsError(state: CreateValidationState): never {
  if (state.isReviewArtifactTypeMissing) {
    const otherMissing = state.missing.filter(
      (option) => option !== "--review-artifact-type"
    );
    throw toCreateCommandError(
      `${MISSING_REVIEW_ARTIFACT_TYPE_OPTION}: Missing required --review-artifact-type=<document|code> option.${formatAlsoMissingOptions(otherMissing)}`
    );
  }
  if (state.reviewArtifactTypeValidationError !== undefined) {
    throw toCreateCommandReasonCodeError(
      `${state.reviewArtifactTypeValidationError}${formatAlsoMissingOptions(state.missing)}`,
      "CREATE_REVIEW_ARTIFACT_TYPE_VALIDATION_FAILED"
    );
  }
  if (state.pairflowCommandProfileValidationError !== undefined) {
    throw toCreateCommandReasonCodeError(
      `${state.pairflowCommandProfileValidationError}${formatAlsoMissingOptions(state.missing)}`,
      "PAIRFLOW_COMMAND_PROFILE_INVALID"
    );
  }
  throw toCreateCommandError(
    `CREATE_REQUIRED_OPTIONS_MISSING: Missing required options: ${state.missing.join(", ")}`
  );
}

function throwCreateValidationErrors(state: CreateValidationState): void {
  if (state.reviewArtifactTypeValidationError !== undefined) {
    throw toCreateCommandReasonCodeError(
      state.reviewArtifactTypeValidationError,
      "CREATE_REVIEW_ARTIFACT_TYPE_VALIDATION_FAILED"
    );
  }
  if (state.pairflowCommandProfileValidationError !== undefined) {
    throw toCreateCommandReasonCodeError(
      state.pairflowCommandProfileValidationError,
      "PAIRFLOW_COMMAND_PROFILE_INVALID"
    );
  }
}

function finalizeRequiredCreateOptions(
  options: BubbleCreateCommandOptions
): BubbleCreateCommandOptions {
  return {
    ...options,
    id: options.id as string,
    repo: options.repo as string,
    base: options.base as string,
    reviewArtifactType: options.reviewArtifactType as CreateReviewArtifactType
  };
}

export function parseBubbleCreateCommandOptions(
  args: string[]
): BubbleCreateCommandOptions {
  const parsed = parseBubbleCreateArgs(args);
  const parsedValues = parsed.values as BubbleCreateParsedValues;
  const options = buildCreateOptions(parsedValues);

  if (options.help) {
    return options;
  }

  const validationState = collectCreateValidationState(options, parsedValues);

  validateCreateTaskInputMode(options);
  validateCreateReviewerBriefInputMode(options);

  if (validationState.missing.length > 0) {
    throwMissingCreateOptionsError(validationState);
  }
  throwCreateValidationErrors(validationState);

  return finalizeRequiredCreateOptions(options);
}

export async function runBubbleCreateCommand(
  args: string[],
  cwd: string = process.cwd(),
  dependencies: BubbleCreateCommandDependencies = {}
): Promise<BubbleCreateResult | null> {
  const options = parseBubbleCreateCommandOptions(args);
  if (options.help) {
    return null;
  }

  const resolvedDependencies = resolveBubbleCreateCommandDependencies(dependencies);
  const createInput = buildCreateBubbleInput(options, cwd);
  const created = await resolvedDependencies.create(createInput.input);
  await registerRepoAfterCreateBestEffort({
    repoPath: createInput.repoPath,
    register: resolvedDependencies.register,
    reportWarning: resolvedDependencies.reportWarning
  });
  return created;
}
