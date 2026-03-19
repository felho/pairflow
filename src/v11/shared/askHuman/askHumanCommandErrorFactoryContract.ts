export interface BuildAskHumanCommandErrorFactoryInput {
  createAskHumanCommandError: (message: string) => Error;
}

export type AskHumanCommandErrorFactory = (message: string) => Error;
