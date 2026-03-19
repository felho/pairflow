import {
  normalizeStringList,
  requireNonEmptyString
} from "../../../core/util/normalize.js";

export interface NormalizeConvergedCommandInputInput {
  summary: string;
  refs?: string[] | undefined;
  now?: Date | undefined;
  createError: (message: string) => Error;
}

export interface NormalizedConvergedCommandInput {
  summary: string;
  refs: string[];
  now: Date;
}

export function normalizeConvergedCommandInput(
  input: NormalizeConvergedCommandInputInput
): NormalizedConvergedCommandInput {
  return {
    summary: requireNonEmptyString(
      input.summary,
      "Convergence summary",
      input.createError
    ),
    refs: normalizeStringList(input.refs ?? []),
    now: input.now ?? new Date()
  };
}
