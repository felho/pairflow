import { parseArgs } from "node:util";
import { resolve } from "node:path";

import { createBubble, type BubbleCreateResult } from "../../../core/bubble/createBubble.js";
import { registerRepoInRegistry } from "../../../core/repo/registry.js";
import {
  assertCreateReviewArtifactType,
  assertPairflowCommandProfile,
  DEPENDENCY_FAIL_REPO_REGISTRY_REGISTER,
  MISSING_REVIEW_ARTIFACT_TYPE_OPTION
} from "../../../config/bubbleConfig.js";
import {
  IDEATION_TASK_INPUT_CONFLICT,
  IDEATION_TASK_REQUIRED
} from "../../../core/bubble/ideation.js";
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

export function parseBubbleCreateCommandOptions(
  args: string[]
): BubbleCreateCommandOptions {
  const parsed = parseArgs({
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

  const options: BubbleCreateCommandOptions = {
    help: parsed.values.help ?? false
  };
  if (parsed.values.id !== undefined) {
    options.id = parsed.values.id;
  }
  if (parsed.values.repo !== undefined) {
    options.repo = parsed.values.repo;
  }
  if (parsed.values.base !== undefined) {
    options.base = parsed.values.base;
  }
  if (parsed.values.task !== undefined) {
    options.task = parsed.values.task;
  }
  if (parsed.values.ideation !== undefined) {
    options.ideation = parsed.values.ideation;
  }
  if (parsed.values["task-file"] !== undefined) {
    options.taskFile = parsed.values["task-file"];
  }
  if (parsed.values["reviewer-brief"] !== undefined) {
    options.reviewerBrief = parsed.values["reviewer-brief"];
  }
  if (parsed.values["reviewer-brief-file"] !== undefined) {
    options.reviewerBriefFile = parsed.values["reviewer-brief-file"];
  }
  if (parsed.values["bootstrap-command"] !== undefined) {
    options.bootstrapCommand = parsed.values["bootstrap-command"];
  }
  if (parsed.values["accuracy-critical"] !== undefined) {
    options.accuracyCritical = parsed.values["accuracy-critical"];
  }

  if (options.help) {
    return options;
  }

  const missing: string[] = [];
  if (options.id === undefined) {
    missing.push("--id");
  }
  if (options.repo === undefined) {
    missing.push("--repo");
  }
  if (options.base === undefined) {
    missing.push("--base");
  }
  const rawPairflowCommandProfile = parsed.values["pairflow-command-profile"];
  let pairflowCommandProfileValidationError: string | undefined;
  if (rawPairflowCommandProfile !== undefined) {
    try {
      options.pairflowCommandProfile = assertPairflowCommandProfile(
        rawPairflowCommandProfile
      );
    } catch (error) {
      pairflowCommandProfileValidationError =
        error instanceof Error ? error.message : String(error);
    }
  }
  const rawReviewArtifactType = parsed.values["review-artifact-type"];
  const isReviewArtifactTypeMissing = rawReviewArtifactType === undefined;
  let reviewArtifactTypeValidationError: string | undefined;
  if (isReviewArtifactTypeMissing) {
    missing.push("--review-artifact-type");
  } else {
    try {
      options.reviewArtifactType = assertCreateReviewArtifactType(
        rawReviewArtifactType
      );
    } catch (error) {
      reviewArtifactTypeValidationError =
        error instanceof Error ? error.message : String(error);
    }
  }

  const hasTask = options.task !== undefined;
  const hasTaskFile = options.taskFile !== undefined;
  const ideationMode = options.ideation === true;
  if (ideationMode && (hasTask || hasTaskFile)) {
    throw new Error(
      `${IDEATION_TASK_INPUT_CONFLICT}: --ideation cannot be combined with --task or --task-file. context: command_name=create.`
    );
  }
  if (!ideationMode && !hasTask && !hasTaskFile) {
    throw new Error(
      `${IDEATION_TASK_REQUIRED}: Missing task input. Use --task, --task-file, or --ideation for taskless ideation bubbles. context: command_name=create.`
    );
  }
  if (!ideationMode && hasTask && hasTaskFile) {
    throw new Error(
      "CREATE_TASK_INPUT_MODE_CONFLICT: Use only one task input: --task or --task-file. context: command_name=create."
    );
  }

  const hasReviewerBrief = options.reviewerBrief !== undefined;
  const hasReviewerBriefFile = options.reviewerBriefFile !== undefined;
  if (hasReviewerBrief && hasReviewerBriefFile) {
    throw new Error(
      "CREATE_REVIEWER_BRIEF_INPUT_CONFLICT: Use only one reviewer brief input: --reviewer-brief or --reviewer-brief-file. context: command_name=create."
    );
  }
  if ((options.accuracyCritical ?? false) && !hasReviewerBrief && !hasReviewerBriefFile) {
    throw new Error(
      "CREATE_ACCURACY_CRITICAL_REVIEWER_BRIEF_REQUIRED: --accuracy-critical requires reviewer brief input via --reviewer-brief or --reviewer-brief-file. context: command_name=create."
    );
  }

  if (missing.length > 0) {
    const formatAlsoMissing = (missingOptions: string[]): string =>
      missingOptions.length > 0
        ? ` Also missing: ${missingOptions.join(", ")}.`
        : "";

    if (isReviewArtifactTypeMissing) {
      const otherMissing = missing.filter(
        (option) => option !== "--review-artifact-type"
      );
      throw new Error(
        `${MISSING_REVIEW_ARTIFACT_TYPE_OPTION}: Missing required --review-artifact-type=<document|code> option.${formatAlsoMissing(otherMissing)} context: command_name=create.`
      );
    }
    if (reviewArtifactTypeValidationError !== undefined) {
      throw new Error(
        `${reviewArtifactTypeValidationError}${formatAlsoMissing(missing)} context: command_name=create reason_code=CREATE_REVIEW_ARTIFACT_TYPE_VALIDATION_FAILED.`
      );
    }
    if (pairflowCommandProfileValidationError !== undefined) {
      throw new Error(
        `${pairflowCommandProfileValidationError}${formatAlsoMissing(missing)} context: command_name=create reason_code=PAIRFLOW_COMMAND_PROFILE_INVALID.`
      );
    }
    throw new Error(
      `CREATE_REQUIRED_OPTIONS_MISSING: Missing required options: ${missing.join(", ")} context: command_name=create.`
    );
  }
  if (reviewArtifactTypeValidationError !== undefined) {
    throw new Error(
      `${reviewArtifactTypeValidationError} context: command_name=create reason_code=CREATE_REVIEW_ARTIFACT_TYPE_VALIDATION_FAILED.`
    );
  }
  if (pairflowCommandProfileValidationError !== undefined) {
    throw new Error(
      `${pairflowCommandProfileValidationError} context: command_name=create reason_code=PAIRFLOW_COMMAND_PROFILE_INVALID.`
    );
  }

  return {
    ...options,
    id: options.id as string,
    repo: options.repo as string,
    base: options.base as string,
    reviewArtifactType: options.reviewArtifactType as CreateReviewArtifactType
  };
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

  const repoPath = resolve(cwd, options.repo as string);
  const register = dependencies.registerRepoInRegistry ?? registerRepoInRegistry;
  const reportWarning =
    dependencies.reportRegistryRegistrationWarning ??
    ((message: string) => {
      process.stderr.write(`${message}\n`);
    });

  const create = dependencies.createBubble ?? createBubble;
  const created = await create({
    id: options.id as string,
    repoPath,
    baseBranch: options.base as string,
    reviewArtifactType: options.reviewArtifactType as CreateReviewArtifactType,
    ...(options.ideation === true ? { ideation: true } : {}),
    ...(options.task !== undefined ? { task: options.task } : {}),
    ...(options.taskFile !== undefined ? { taskFile: options.taskFile } : {}),
    ...(options.reviewerBrief !== undefined
      ? { reviewerBrief: options.reviewerBrief }
      : {}),
    ...(options.reviewerBriefFile !== undefined
      ? { reviewerBriefFile: options.reviewerBriefFile }
      : {}),
    ...(options.bootstrapCommand !== undefined
      ? { bootstrapCommand: options.bootstrapCommand }
      : {}),
    ...(options.pairflowCommandProfile !== undefined
      ? { pairflowCommandProfile: options.pairflowCommandProfile }
      : {}),
    ...(options.accuracyCritical === true ? { accuracyCritical: true } : {}),
    cwd
  });
  try {
    await register({
      repoPath
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    reportWarning(
      `${DEPENDENCY_FAIL_REPO_REGISTRY_REGISTER}: failed to auto-register repository for bubble create (${repoPath}): ${reason}`
    );
  }
  return created;
}
