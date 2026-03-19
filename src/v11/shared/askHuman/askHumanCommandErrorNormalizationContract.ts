export interface NormalizeAskHumanCommandErrorInput {
  error: unknown;
  isAskHumanCommandError: (candidate: unknown) => boolean;
  createAskHumanCommandError: (message: string) => Error;
}
