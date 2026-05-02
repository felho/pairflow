import {
  normalizeStringList,
  requireNonEmptyString
} from "../../shared/normalization/stringNormalization.js";

export interface NormalizePassCommandInputInput {
  summary: string;
  refs?: string[] | undefined;
  now?: Date | undefined;
  createError: PairflowCreateCommandError;
}

export interface NormalizedPassCommandInput {
  summary: string;
  refs: string[];
  now: Date;
}

export function normalizePassCommandInput(
  input: NormalizePassCommandInputInput
): NormalizedPassCommandInput {
  return {
    summary: requireNonEmptyString(input.summary, "PASS summary", input.createError),
    refs: normalizeStringList(input.refs ?? []),
    now: input.now ?? new Date()
  };
}
