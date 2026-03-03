import { parseArgs } from "node:util";
import { resolve } from "node:path";

import { createBubble, type BubbleCreateResult } from "../../../core/bubble/createBubble.js";
import { registerRepoInRegistry } from "../../../core/repo/registry.js";

export interface BubbleCreateCommandOptions {
  id?: string;
  repo?: string;
  base?: string;
  task?: string;
  taskFile?: string;
  reviewerBrief?: string;
  reviewerBriefFile?: string;
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
    "  pairflow bubble create --id <id> --repo <path> --base <branch> (--task <text> | --task-file <path>)",
    "",
    "Options:",
    "  --id <id>             Bubble id (e.g. b_feature_x_01)",
    "  --repo <path>         Repository path",
    "  --base <branch>       Base branch",
    "  --task <text>         Inline task text",
    "  --task-file <path>    Task input from file",
    "  --reviewer-brief <text>      Optional inline reviewer brief",
    "  --reviewer-brief-file <path> Optional reviewer brief from file",
    "  --accuracy-critical          Enforce reviewer verification payload gate",
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
      "reviewer-brief": {
        type: "string"
      },
      "reviewer-brief-file": {
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
  if (parsed.values["task-file"] !== undefined) {
    options.taskFile = parsed.values["task-file"];
  }
  if (parsed.values["reviewer-brief"] !== undefined) {
    options.reviewerBrief = parsed.values["reviewer-brief"];
  }
  if (parsed.values["reviewer-brief-file"] !== undefined) {
    options.reviewerBriefFile = parsed.values["reviewer-brief-file"];
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

  const hasTask = options.task !== undefined;
  const hasTaskFile = options.taskFile !== undefined;
  if (!hasTask && !hasTaskFile) {
    missing.push("--task or --task-file");
  }
  if (hasTask && hasTaskFile) {
    throw new Error("Use only one task input: --task or --task-file.");
  }

  const hasReviewerBrief = options.reviewerBrief !== undefined;
  const hasReviewerBriefFile = options.reviewerBriefFile !== undefined;
  if (hasReviewerBrief && hasReviewerBriefFile) {
    throw new Error(
      "Use only one reviewer brief input: --reviewer-brief or --reviewer-brief-file."
    );
  }
  if ((options.accuracyCritical ?? false) && !hasReviewerBrief && !hasReviewerBriefFile) {
    throw new Error(
      "--accuracy-critical requires reviewer brief input via --reviewer-brief or --reviewer-brief-file."
    );
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
    ...(options.task !== undefined ? { task: options.task } : {}),
    ...(options.taskFile !== undefined ? { taskFile: options.taskFile } : {}),
    ...(options.reviewerBrief !== undefined
      ? { reviewerBrief: options.reviewerBrief }
      : {}),
    ...(options.reviewerBriefFile !== undefined
      ? { reviewerBriefFile: options.reviewerBriefFile }
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
      `Pairflow warning: failed to auto-register repository for bubble create (${repoPath}): ${reason}`
    );
  }
  return created;
}
