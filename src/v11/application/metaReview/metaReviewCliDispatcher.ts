import {
  getMetaReviewLastReportV11 as getMetaReviewLastReport,
  getMetaReviewStatusV11 as getMetaReviewStatus
} from "./emitMetaReviewV11.js";
import type {
  BubbleMetaReviewCommandResult,
  BubbleMetaReviewExecutableCommandOptions
} from "./metaReviewCliTypes.js";

function toRepoPathOption(repo: string | undefined): {
  repoPath?: string;
} {
  return repo !== undefined ? { repoPath: repo } : {};
}

async function runMetaReviewStatusProjectionCommand(input: {
  options: Extract<BubbleMetaReviewExecutableCommandOptions, { command: "status" }>;
  cwd: string;
}): Promise<BubbleMetaReviewCommandResult> {
  const status = await getMetaReviewStatus({
    bubbleId: input.options.id,
    ...toRepoPathOption(input.options.repo),
    cwd: input.cwd
  });
  return {
    command: "status",
    status
  };
}

async function runMetaReviewLastReportProjectionCommand(input: {
  options: Extract<BubbleMetaReviewExecutableCommandOptions, { command: "last-report" }>;
  cwd: string;
}): Promise<BubbleMetaReviewCommandResult> {
  const lastReport = await getMetaReviewLastReport({
    bubbleId: input.options.id,
    ...toRepoPathOption(input.options.repo),
    cwd: input.cwd
  });
  return {
    command: "last-report",
    lastReport
  };
}

export async function dispatchMetaReviewCommand(input: {
  options: BubbleMetaReviewExecutableCommandOptions;
  cwd: string;
}): Promise<BubbleMetaReviewCommandResult> {
  if (input.options.command === "status") {
    return runMetaReviewStatusProjectionCommand({
      options: input.options,
      cwd: input.cwd
    });
  }
  if (input.options.command === "last-report") {
    return runMetaReviewLastReportProjectionCommand({
      options: input.options,
      cwd: input.cwd
    });
  }
  throw new Error(
    "META_REVIEW_SUBCOMMAND_UNEXPECTED: Unexpected meta-review subcommand. context: command_name=meta-review."
  );
}
