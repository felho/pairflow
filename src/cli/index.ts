#!/usr/bin/env node

import {
  getBubbleCreateHelpText,
  runBubbleCreateCommand
} from "./commands/bubble/create.js";
import {
  getPassHelpText,
  runPassCommand
} from "./commands/agent/pass.js";

async function handlePassCommand(args: string[]): Promise<number> {
  const result = await runPassCommand(args);
  if (result === null) {
    process.stdout.write(`${getPassHelpText()}\n`);
    return 0;
  }
  process.stdout.write(
    `PASS recorded for ${result.bubbleId}: ${result.envelope.id} -> ${result.envelope.recipient}\n`
  );
  return 0;
}

export async function runCli(argv: string[]): Promise<number> {
  const [command, subcommand, ...rest] = argv;

  if (command === "pass") {
    return handlePassCommand(
      [subcommand, ...rest].filter((part) => part !== undefined)
    );
  }

  if (command === "agent" && subcommand === "pass") {
    return handlePassCommand(rest);
  }

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

  process.stderr.write("Unknown command. Supported: bubble create, pass, agent pass\n");
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
