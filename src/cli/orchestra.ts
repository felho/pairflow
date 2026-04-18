#!/usr/bin/env node

import { isMainCliEntrypoint } from "./isMainCliEntrypoint.js";
import { buildLegacyActorCommandRemovedError } from "./commands/agent/legacyActorCommandRemoval.js";

export function getOrchestraHelpText(): string {
  return [
    "Usage:",
    "  orchestra <command> [options]",
    "",
    "Phase 5 removal:",
    "  `orchestra` actor aliases were removed.",
    "  Use `pairflow agent emit --kind <pass|human_question|convergence> --repo <repo> --bubble-id <id> --handoff-id <handoff-id> --execution-id <execution-id> ...`."
  ].join("\n");
}

export function runOrchestraCli(argv: string[]): Promise<number> {
  const [command, ...rest] = argv;

  if (
    command === undefined ||
    command === "-h" ||
    command === "--help" ||
    command.trim().length === 0
  ) {
    process.stdout.write(`${getOrchestraHelpText()}\n`);
    return Promise.resolve(0);
  }
  void rest;
  return Promise.reject(
    buildLegacyActorCommandRemovedError({
      command: "orchestra",
      canonicalCommand:
        "pairflow agent emit --kind <pass|human_question|convergence> --repo <repo> --bubble-id <id> --handoff-id <handoff-id> --execution-id <execution-id> ..."
    })
  );
}

if (isMainCliEntrypoint(import.meta.url, process.argv[1])) {
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
