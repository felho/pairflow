export interface NormalizeAskHumanCommandErrorInput {
  error: unknown;
  isAskHumanCommandError: (candidate: unknown) => boolean;
  createAskHumanCommandError: PairflowCreateCommandError;
}
