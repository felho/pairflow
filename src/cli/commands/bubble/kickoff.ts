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
} from "../../../v11/application/kickoff/emitKickoffV11.js";
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
  const parsed = parseArgs({
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

  if (parsed.values.help ?? false) {
    return {
      help: true
    };
  }

  if (parsed.values["review-artifact-type"] !== undefined) {
    throw new Error(
      `${IDEATION_REVIEW_ARTIFACT_TYPE_IMMUTABLE}: --review-artifact-type cannot be overridden by bubble kickoff.`
    );
  }

  const id = parsed.values.id;
  if (id === undefined) {
    throw new Error("Missing required option: --id");
  }

  const task = parsed.values.task;
  const taskFile = parsed.values["task-file"];
  const hasTask = typeof task === "string" && task.trim().length > 0;
  const hasTaskFile = typeof taskFile === "string" && taskFile.trim().length > 0;
  if (hasTask && hasTaskFile) {
    throw new Error(
      `${IDEATION_TASK_INPUT_CONFLICT}: Provide exactly one task input via --task or --task-file.`
    );
  }
  if (!hasTask && !hasTaskFile) {
    throw new Error(
      `${IDEATION_KICKOFF_TASK_INVALID}: Provide exactly one task input via --task or --task-file.`
    );
  }

  return {
    id,
    ...(parsed.values.repo !== undefined ? { repo: parsed.values.repo } : {}),
    ...(task !== undefined ? { task } : {}),
    ...(taskFile !== undefined ? { taskFile } : {}),
    help: false
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
