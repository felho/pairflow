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
