import { parseArgs } from "node:util";

import { createBubble, type BubbleCreateResult } from "../../../core/bubble/createBubble.js";

export interface BubbleCreateCommandOptions {
  id?: string;
  repo?: string;
  base?: string;
  task?: string;
  taskFile?: string;
  help: boolean;
}

export function getBubbleCreateHelpText(): string {
  return [
    "Usage:",
    "  pairflow bubble create --id <id> --repo <path> --base <branch> (--task <text> | --task-file <path>)",
    "",
    "Options:",
    "  --id <id>             Bubble id (e.g. b_feature_x_01)",
    "  --repo <path>         Repository path",
    "  --base <branch>       Base branch",
    "  --task <text>         Inline task text",
    "  --task-file <path>    Task input from file",
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
      task: {
        type: "string"
      },
      "task-file": {
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
  if (parsed.values["task-file"] !== undefined) {
    options.taskFile = parsed.values["task-file"];
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

  const hasTask = options.task !== undefined;
  const hasTaskFile = options.taskFile !== undefined;
  if (!hasTask && !hasTaskFile) {
    missing.push("--task or --task-file");
  }
  if (hasTask && hasTaskFile) {
    throw new Error("Use only one task input: --task or --task-file.");
  }

  if (missing.length > 0) {
    throw new Error(`Missing required options: ${missing.join(", ")}`);
  }

  return {
    ...options,
    id: options.id as string,
    repo: options.repo as string,
    base: options.base as string
  };
}

export async function runBubbleCreateCommand(
  args: string[],
  cwd: string = process.cwd()
): Promise<BubbleCreateResult | null> {
  const options = parseBubbleCreateCommandOptions(args);
  if (options.help) {
    return null;
  }

  return createBubble({
    id: options.id as string,
    repoPath: options.repo as string,
    baseBranch: options.base as string,
    ...(options.task !== undefined ? { task: options.task } : {}),
    ...(options.taskFile !== undefined ? { taskFile: options.taskFile } : {}),
    cwd
  });
}
