export interface BuildAskHumanRoutingInputInput {
  question: string;
  refs: string[] | undefined;
  cwd: string | undefined;
  now: Date;
  createError: PairflowCreateCommandError;
}
