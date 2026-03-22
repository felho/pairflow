import { buildAskHumanCommandErrorFactory } from "./askHumanCommandErrorFactory.js";
import type { AskHumanCommandErrorFactory } from "./askHumanCommandErrorFactoryContract.js";

export function createAskHumanCommandErrorCreator(
  createAskHumanCommandError: PairflowCreateCommandError
): AskHumanCommandErrorFactory {
  return buildAskHumanCommandErrorFactory({
    createAskHumanCommandError
  });
}
