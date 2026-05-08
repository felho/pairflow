export {
  getBubbleDeleteHelpText,
  parseBubbleDeleteCommandOptions
} from "../../../v11/application/delete/deleteCliCommand.js";
export type {
  BubbleDeleteCommandOptions,
  BubbleDeleteHelpCommandOptions,
  ParsedBubbleDeleteCommandOptions
} from "../../../v11/application/delete/deleteCliCommand.js";

import {
  runBubbleDeleteCommand as runBubbleDeleteCommandWithDependencies
} from "../../../v11/application/delete/deleteCliCommand.js";
import { deleteBubbleDependencyDefaults } from "../../../v11/defaults/delete/deleteBubbleDefaults.js";
import type { DeleteBubbleResult } from "../../../contracts/deleteBubble.js";

export async function runBubbleDeleteCommand(
  args: string[],
  cwd: string = process.cwd()
): Promise<DeleteBubbleResult | null> {
  return runBubbleDeleteCommandWithDependencies(
    args,
    deleteBubbleDependencyDefaults,
    cwd
  );
}
