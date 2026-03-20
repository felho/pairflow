import { buildAskHumanCommandErrorFactory } from "./askHumanCommandErrorFactory.js";
import type { AskHumanCommandErrorFactory } from "./askHumanCommandErrorFactoryContract.js";

export function createAskHumanCommandErrorCreator(
  createAskHumanCommandError: (message: string) => Error
): AskHumanCommandErrorFactory {
  return buildAskHumanCommandErrorFactory({
    createAskHumanCommandError
  });
}
