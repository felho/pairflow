export interface BuildAskHumanCommandErrorFactoryInput {
  createAskHumanCommandError: (message: string) => Error;
}

export type AskHumanCommandErrorFactory = (message: string) => Error;

export function buildAskHumanCommandErrorFactory(
  input: BuildAskHumanCommandErrorFactoryInput
): AskHumanCommandErrorFactory {
  return (message) => input.createAskHumanCommandError(message);
}
