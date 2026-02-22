#!/usr/bin/env node

import {
  getAskHumanHelpText,
  runAskHumanCommand
} from "./commands/agent/askHuman.js";
import {
  getBubbleCreateHelpText,
  runBubbleCreateCommand
} from "./commands/bubble/create.js";
import {
  getBubbleReplyHelpText,
  runBubbleReplyCommand
} from "./commands/bubble/reply.js";
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

async function handleAskHumanCommand(args: string[]): Promise<number> {
  const result = await runAskHumanCommand(args);
  if (result === null) {
    process.stdout.write(`${getAskHumanHelpText()}\n`);
    return 0;
  }
  process.stdout.write(
    `HUMAN_QUESTION recorded for ${result.bubbleId}: ${result.envelope.id}\n`
  );
  return 0;
}

async function handleBubbleReplyCommand(args: string[]): Promise<number> {
  const result = await runBubbleReplyCommand(args);
  if (result === null) {
    process.stdout.write(`${getBubbleReplyHelpText()}\n`);
    return 0;
  }
  process.stdout.write(
    `HUMAN_REPLY recorded for ${result.bubbleId}: ${result.envelope.id} -> ${result.envelope.recipient}\n`
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

  if (command === "ask-human") {
    return handleAskHumanCommand(
      [subcommand, ...rest].filter((part) => part !== undefined)
    );
  }

  if (command === "agent" && subcommand === "ask-human") {
    return handleAskHumanCommand(rest);
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

  if (command === "bubble" && subcommand === "reply") {
    return handleBubbleReplyCommand(rest);
  }

  process.stderr.write(
    "Unknown command. Supported: bubble create, bubble reply, pass, ask-human, agent pass, agent ask-human\n"
  );
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
