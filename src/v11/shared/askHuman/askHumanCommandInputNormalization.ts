export interface NormalizeAskHumanCommandInputInput {
  question: string;
  refs?: string[] | undefined;
  cwd?: string | undefined;
  now?: Date | undefined;
}

export interface NormalizedAskHumanCommandInput {
  question: string;
  refs?: string[] | undefined;
  cwd?: string | undefined;
  now: Date;
}

export function normalizeAskHumanCommandInput(
  input: NormalizeAskHumanCommandInputInput
): NormalizedAskHumanCommandInput {
  return {
    question: input.question,
    ...(input.refs !== undefined
      ? { refs: input.refs }
      : {}),
    ...(input.cwd !== undefined
      ? { cwd: input.cwd }
      : {}),
    now: input.now ?? new Date()
  };
}
