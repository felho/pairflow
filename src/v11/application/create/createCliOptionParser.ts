import { parseArgs } from "node:util";

import type { CreateReviewArtifactType } from "../../../types/bubble.js";
import type { BubbleCreateCommandOptions } from "./createCliOptionTypes.js";
import {
  collectCreateValidationState,
  throwCreateValidationErrors,
  throwMissingCreateOptionsError,
  type BubbleCreateParsedValues,
  validateCreateReviewerBriefInputMode,
  validateCreateTaskInputMode
} from "./createCliOptionValidation.js";

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
