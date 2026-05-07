import { statusCommandDependencyDefaults } from "../../../v11/defaults/status/statusCommandDependencyDefaults.js";
import {
  runBubbleStatusCommand as runApplicationBubbleStatusCommand
} from "../../../v11/application/status/statusCliCommand.js";
import type {
  BubbleStatusV11Dependencies
} from "../../../v11/application/status/emitStatusV11.js";
import type {
  BubbleStatusCommandOptions
} from "../../../v11/application/status/statusCliCommand.js";

export {
  getBubbleStatusHelpText,
  parseBubbleStatusCommandOptions,
  renderBubbleStatusTable,
  renderBubbleStatusText
} from "../../../v11/application/status/statusCliCommand.js";
export type {
  BubbleStatusCommandOptions,
  BubbleStatusHelpCommandOptions,
  ParsedBubbleStatusCommandOptions
} from "../../../v11/application/status/statusCliCommand.js";

export async function runBubbleStatusCommand(
  args: string[] | BubbleStatusCommandOptions,
  cwd: string = process.cwd(),
  dependencies: Partial<BubbleStatusV11Dependencies> = {}
) {
  return runApplicationBubbleStatusCommand(args, cwd, {
    ...statusCommandDependencyDefaults,
    ...dependencies
  });
}
