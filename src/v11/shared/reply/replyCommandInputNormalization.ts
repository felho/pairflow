import {
  normalizeStringList,
  requireNonEmptyString
} from "../normalization/stringNormalization.js";

export interface NormalizeReplyCommandInputInput {
  message: string;
  refs?: string[] | undefined;
  now?: Date | undefined;
  createError: PairflowCreateCommandError;
}

export interface NormalizedReplyCommandInput {
  now: Date;
  nowIso: string;
  message: string;
  refs: string[];
}

export function normalizeReplyCommandInput(
  input: NormalizeReplyCommandInputInput
): NormalizedReplyCommandInput {
  const now = input.now ?? new Date();
  return {
    now,
    nowIso: now.toISOString(),
    message: requireNonEmptyString(input.message, "Reply message", input.createError),
    refs: normalizeStringList(input.refs ?? [])
  };
}
