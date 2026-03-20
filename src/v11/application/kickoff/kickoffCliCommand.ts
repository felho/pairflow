import { parseArgs } from "node:util";

import {
  IDEATION_KICKOFF_NOT_ALLOWED,
  IDEATION_KICKOFF_TASK_INVALID,
  IDEATION_METADATA_PARSE_WARNING,
  IDEATION_REVIEW_ARTIFACT_TYPE_IMMUTABLE,
  IDEATION_TASK_INPUT_CONFLICT,
  hasIdeationMetadataParseWarning
} from "../../../core/bubble/ideation.js";
import type { ResolvedBubbleById } from "../../../core/bubble/bubbleLookup.js";
import {
  kickoffBubbleV11 as kickoffBubble,
  type KickoffBubbleV11Result as KickoffBubbleResult
} from "./emitKickoffV11.js";
import { resolveBubbleById } from "../../../core/bubble/bubbleLookup.js";

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

export interface BubbleKickoffCommandDependencies {
  resolveBubbleById?: (input: {
    bubbleId: string;
    repoPath?: string;
    cwd?: string;
  }) => Promise<ResolvedBubbleById>;
  kickoffBubble?: typeof kickoffBubble;
  writeStderr?: (message: string) => void;
}

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

export async function runBubbleKickoffCommand(
  args: string[],
  cwd: string = process.cwd(),
  dependencies: BubbleKickoffCommandDependencies = {}
): Promise<KickoffBubbleResult | null> {
  const options = parseBubbleKickoffCommandOptions(args);
  if (options.help) {
    return null;
  }

  const resolveBubbleByIdCommand = dependencies.resolveBubbleById ?? resolveBubbleById;
  const kickoffBubbleCommand = dependencies.kickoffBubble ?? kickoffBubble;
  const writeStderr = dependencies.writeStderr ?? ((message: string) => {
    process.stderr.write(message);
  });

  const resolved = await resolveBubbleByIdCommand({
    bubbleId: options.id,
    ...(options.repo !== undefined ? { repoPath: options.repo } : {}),
    cwd
  });
  if (hasIdeationMetadataParseWarning(resolved.bubbleConfig)) {
    writeStderr(
      `${IDEATION_METADATA_PARSE_WARNING}: bubble ${options.id} has invalid ideation metadata; kickoff is disabled.\n`
    );
    throw new Error(
      `${IDEATION_KICKOFF_NOT_ALLOWED}: bubble kickoff rejected for ${options.id}.`
    );
  }

  const result = await kickoffBubbleCommand({
    bubbleId: options.id,
    ...(options.repo !== undefined ? { repoPath: options.repo } : {}),
    ...(options.task !== undefined ? { task: options.task } : {}),
    ...(options.taskFile !== undefined ? { taskFile: options.taskFile } : {}),
    cwd
  });

  if (!result.ok) {
    throw new Error(
      `${result.reason_code ?? IDEATION_KICKOFF_TASK_INVALID}: bubble kickoff rejected for ${result.bubble_id}.`
    );
  }
  return result;
}
