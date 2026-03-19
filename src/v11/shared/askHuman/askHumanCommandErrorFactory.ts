import type {
  AskHumanCommandErrorFactory,
  BuildAskHumanCommandErrorFactoryInput
} from "./askHumanCommandErrorFactoryContract.js";

export function buildAskHumanCommandErrorFactory(
  input: BuildAskHumanCommandErrorFactoryInput
): AskHumanCommandErrorFactory {
  return (message) => input.createAskHumanCommandError(message);
}
