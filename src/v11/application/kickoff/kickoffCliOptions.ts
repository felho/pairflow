import { parseArgs } from "node:util";

import {
  IDEATION_KICKOFF_TASK_INVALID,
  IDEATION_REVIEW_ARTIFACT_TYPE_IMMUTABLE,
  IDEATION_TASK_INPUT_CONFLICT
} from "../../../core/bubble/ideation.js";

export interface BubbleKickoffCommandOptions {
  id: string;
  repo?: string;
  task?: string;
  taskFile?: string;
  help: false;
}

export interface BubbleKickoffHelpCommandOptions {
  help: true;
}

export type ParsedBubbleKickoffCommandOptions =
  | BubbleKickoffCommandOptions
  | BubbleKickoffHelpCommandOptions;

export function getBubbleKickoffHelpText(): string {
  return [
    "Usage:",
    "  pairflow bubble kickoff --id <id> (--task <text> | --task-file <path>) [--repo <path>]",
    "",
    "Options:",
    "  --id <id>             Bubble id",
    "  --task <text>         Inline task text",
    "  --task-file <path>    Task input from file",
    "  --repo <path>         Optional repository path (defaults to cwd ancestry lookup)",
    "  -h, --help            Show this help"
  ].join("\n");
}

export function parseBubbleKickoffCommandOptions(
  args: string[]
): ParsedBubbleKickoffCommandOptions {
  const parsed = parseKickoffArgs(args);

  if (parsed.values.help ?? false) {
    return {
      help: true
    };
  }

  assertNoReviewArtifactTypeOverride(parsed.values["review-artifact-type"]);
  const id = parseRequiredKickoffId(parsed.values.id);
  const taskInput = parseKickoffTaskInput({
    task: parsed.values.task,
    taskFile: parsed.values["task-file"]
  });

  return {
    id,
    ...(parsed.values.repo !== undefined ? { repo: parsed.values.repo } : {}),
    ...taskInput,
    help: false
  };
}

function parseKickoffArgs(args: string[]) {
  return parseArgs({
    args,
    options: {
      id: {
        type: "string"
      },
      task: {
        type: "string"
      },
      "task-file": {
        type: "string"
      },
      "review-artifact-type": {
        type: "string"
      },
      repo: {
        type: "string"
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

function assertNoReviewArtifactTypeOverride(
  reviewArtifactType: string | undefined
): void {
  if (reviewArtifactType !== undefined) {
    throw new Error(
      `${IDEATION_REVIEW_ARTIFACT_TYPE_IMMUTABLE}: --review-artifact-type cannot be overridden by bubble kickoff. context: command_name=kickoff.`
    );
  }
}

function parseRequiredKickoffId(id: string | undefined): string {
  if (id === undefined) {
    throw new Error(
      "KICKOFF_ID_REQUIRED: Missing required option: --id. context: command_name=kickoff."
    );
  }
  return id;
}

function parseKickoffTaskInput(input: {
  task: string | undefined;
  taskFile: string | undefined;
}): {
  task?: string;
  taskFile?: string;
} {
  const hasTask = typeof input.task === "string" && input.task.trim().length > 0;
  const hasTaskFile =
    typeof input.taskFile === "string" && input.taskFile.trim().length > 0;
  if (hasTask && hasTaskFile) {
    throw new Error(
      `${IDEATION_TASK_INPUT_CONFLICT}: Provide exactly one task input via --task or --task-file. context: command_name=kickoff.`
    );
  }
  if (!hasTask && !hasTaskFile) {
    throw new Error(
      `${IDEATION_KICKOFF_TASK_INVALID}: Provide exactly one task input via --task or --task-file. context: command_name=kickoff.`
    );
  }
  return {
    ...(input.task !== undefined ? { task: input.task } : {}),
    ...(input.taskFile !== undefined ? { taskFile: input.taskFile } : {})
  };
}
