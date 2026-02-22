#!/usr/bin/env node

import {
  getAskHumanHelpText,
  runAskHumanCommand
} from "./commands/agent/askHuman.js";
import {
  getConvergedHelpText,
  runConvergedCommand
} from "./commands/agent/converged.js";
import {
  getBubbleApproveHelpText,
  runBubbleApproveCommand
} from "./commands/bubble/approve.js";
import {
  getBubbleCommitHelpText,
  runBubbleCommitCommand
} from "./commands/bubble/commit.js";
import {
  getBubbleCreateHelpText,
  runBubbleCreateCommand
} from "./commands/bubble/create.js";
import {
  getBubbleReplyHelpText,
  runBubbleReplyCommand
} from "./commands/bubble/reply.js";
import {
  getBubbleReconcileHelpText,
  parseBubbleReconcileCommandOptions,
  renderBubbleReconcileText,
  runBubbleReconcileCommand
} from "./commands/bubble/reconcile.js";
import {
  getBubbleListHelpText,
  parseBubbleListCommandOptions,
  renderBubbleListText,
  runBubbleListCommand
} from "./commands/bubble/list.js";
import {
  getBubbleRequestReworkHelpText,
  runBubbleRequestReworkCommand
} from "./commands/bubble/requestRework.js";
import {
  getBubbleStartHelpText,
  runBubbleStartCommand
} from "./commands/bubble/start.js";
import {
  getBubbleStatusHelpText,
  parseBubbleStatusCommandOptions,
  renderBubbleStatusText,
  runBubbleStatusCommand
} from "./commands/bubble/status.js";
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

async function handleConvergedCommand(args: string[]): Promise<number> {
  const result = await runConvergedCommand(args);
  if (result === null) {
    process.stdout.write(`${getConvergedHelpText()}\n`);
    return 0;
  }
  process.stdout.write(
    `CONVERGENCE recorded for ${result.bubbleId}: ${result.convergenceEnvelope.id}; approval requested: ${result.approvalRequestEnvelope.id}\n`
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

async function handleBubbleApproveCommand(args: string[]): Promise<number> {
  const result = await runBubbleApproveCommand(args);
  if (result === null) {
    process.stdout.write(`${getBubbleApproveHelpText()}\n`);
    return 0;
  }
  process.stdout.write(
    `APPROVAL_DECISION recorded for ${result.bubbleId}: ${result.envelope.id} -> approve\n`
  );
  return 0;
}

async function handleBubbleRequestReworkCommand(args: string[]): Promise<number> {
  const result = await runBubbleRequestReworkCommand(args);
  if (result === null) {
    process.stdout.write(`${getBubbleRequestReworkHelpText()}\n`);
    return 0;
  }
  process.stdout.write(
    `APPROVAL_DECISION recorded for ${result.bubbleId}: ${result.envelope.id} -> revise\n`
  );
  return 0;
}

async function handleBubbleStartCommand(args: string[]): Promise<number> {
  const result = await runBubbleStartCommand(args);
  if (result === null) {
    process.stdout.write(`${getBubbleStartHelpText()}\n`);
    return 0;
  }

  process.stdout.write(
    `Started bubble ${result.bubbleId}: session ${result.tmuxSessionName}, worktree ${result.worktreePath}\n`
  );
  return 0;
}

async function handleBubbleStatusCommand(args: string[]): Promise<number> {
  const parsed = parseBubbleStatusCommandOptions(args);
  if (parsed.help) {
    process.stdout.write(`${getBubbleStatusHelpText()}\n`);
    return 0;
  }

  const result = await runBubbleStatusCommand(parsed);
  if (result === null) {
    process.stdout.write(`${getBubbleStatusHelpText()}\n`);
    return 0;
  }

  if (parsed.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    process.stdout.write(`${renderBubbleStatusText(result)}\n`);
  }
  return 0;
}

async function handleBubbleListCommand(args: string[]): Promise<number> {
  const parsed = parseBubbleListCommandOptions(args);
  if (parsed.help) {
    process.stdout.write(`${getBubbleListHelpText()}\n`);
    return 0;
  }

  const result = await runBubbleListCommand(parsed);
  if (result === null) {
    process.stdout.write(`${getBubbleListHelpText()}\n`);
    return 0;
  }

  if (parsed.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    process.stdout.write(`${renderBubbleListText(result)}\n`);
  }
  return 0;
}

async function handleBubbleReconcileCommand(args: string[]): Promise<number> {
  const parsed = parseBubbleReconcileCommandOptions(args);
  if (parsed.help) {
    process.stdout.write(`${getBubbleReconcileHelpText()}\n`);
    return 0;
  }

  const result = await runBubbleReconcileCommand(parsed);
  if (result === null) {
    process.stdout.write(`${getBubbleReconcileHelpText()}\n`);
    return 0;
  }

  if (parsed.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    process.stdout.write(`${renderBubbleReconcileText(result)}\n`);
  }
  return 0;
}

async function handleBubbleCommitCommand(args: string[]): Promise<number> {
  const result = await runBubbleCommitCommand(args);
  if (result === null) {
    process.stdout.write(`${getBubbleCommitHelpText()}\n`);
    return 0;
  }

  process.stdout.write(
    `Committed bubble ${result.bubbleId}: ${result.commitSha} (${result.stagedFiles.length} files), DONE_PACKAGE ${result.envelope.id}\n`
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

  if (command === "converged") {
    return handleConvergedCommand(
      [subcommand, ...rest].filter((part) => part !== undefined)
    );
  }

  if (command === "agent" && subcommand === "converged") {
    return handleConvergedCommand(rest);
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

  if (command === "bubble" && subcommand === "start") {
    return handleBubbleStartCommand(rest);
  }

  if (command === "bubble" && subcommand === "status") {
    return handleBubbleStatusCommand(rest);
  }

  if (command === "bubble" && subcommand === "list") {
    return handleBubbleListCommand(rest);
  }

  if (command === "bubble" && subcommand === "reconcile") {
    return handleBubbleReconcileCommand(rest);
  }

  if (command === "bubble" && subcommand === "reply") {
    return handleBubbleReplyCommand(rest);
  }

  if (command === "bubble" && subcommand === "commit") {
    return handleBubbleCommitCommand(rest);
  }

  if (command === "bubble" && subcommand === "approve") {
    return handleBubbleApproveCommand(rest);
  }

  if (command === "bubble" && subcommand === "request-rework") {
    return handleBubbleRequestReworkCommand(rest);
  }

  process.stderr.write(
    "Unknown command. Supported: bubble create, bubble start, bubble status, bubble list, bubble reconcile, bubble reply, bubble commit, bubble approve, bubble request-rework, pass, ask-human, converged, agent pass, agent ask-human, agent converged\n"
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
