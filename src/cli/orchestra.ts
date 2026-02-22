#!/usr/bin/env node

import { runCli } from "./index.js";

const supportedOrchestraCommands = new Set(["pass", "ask-human", "converged"]);

export function getOrchestraHelpText(): string {
  return [
    "Usage:",
    "  orchestra <command> [options]",
    "",
    "Supported commands (alias to pairflow agent commands):",
    "  pass",
    "  ask-human",
    "  converged",
    "",
    "Examples:",
    "  orchestra pass --summary \"Implemented feature\"",
    "  orchestra ask-human --question \"Need product decision\"",
    "  orchestra converged --summary \"Ready for approval\""
  ].join("\n");
}

export async function runOrchestraCli(argv: string[]): Promise<number> {
  const [command, ...rest] = argv;

  if (
    command === undefined ||
    command === "-h" ||
    command === "--help" ||
    command.trim().length === 0
  ) {
    process.stdout.write(`${getOrchestraHelpText()}\n`);
    return 0;
  }

  if (supportedOrchestraCommands.has(command)) {
    return runCli(["agent", command, ...rest]);
  }

  process.stderr.write(
    "Unknown orchestra command. Supported: pass, ask-human, converged\n"
  );
  return 1;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runOrchestraCli(process.argv.slice(2))
    .then((exitCode) => {
      process.exitCode = exitCode;
    })
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(`${message}\n`);
      process.exitCode = 1;
    });
}
