#!/usr/bin/env node

import {
  getBubbleCreateHelpText,
  runBubbleCreateCommand
} from "./commands/bubble/create.js";

export async function runCli(argv: string[]): Promise<number> {
  const [command, subcommand, ...rest] = argv;

  if (command === "bubble" && subcommand === "create") {
    const result = await runBubbleCreateCommand(rest);
    if (result === null) {
      process.stdout.write(`${getBubbleCreateHelpText()}\n`);
      return 0;
    }
    process.stdout.write(
      `Created bubble ${result.bubbleId} at ${result.paths.bubbleDir}\n`
    );
    return 0;
  }

  process.stderr.write("Unknown command. Supported: bubble create\n");
  return 1;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runCli(process.argv.slice(2))
    .then((exitCode) => {
      process.exitCode = exitCode;
    })
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(`${message}\n`);
      process.exitCode = 1;
    });
}
