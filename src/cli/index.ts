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
  getBubbleInboxHelpText,
  parseBubbleInboxCommandOptions,
  renderBubbleInboxText,
  runBubbleInboxCommand
} from "./commands/bubble/inbox.js";
import {
  getBubbleCreateHelpText,
  runBubbleCreateCommand
} from "./commands/bubble/create.js";
import {
  getBubbleReplyHelpText,
  runBubbleReplyCommand
} from "./commands/bubble/reply.js";
import {
  getBubbleOpenHelpText,
  runBubbleOpenCommand
} from "./commands/bubble/open.js";
import {
  getBubbleResumeHelpText,
  runBubbleResumeCommand
} from "./commands/bubble/resume.js";
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
  getBubbleMergeHelpText,
  runBubbleMergeCommand
} from "./commands/bubble/merge.js";
import {
  getBubbleRequestReworkHelpText,
  runBubbleRequestReworkCommand
} from "./commands/bubble/requestRework.js";
import {
  getBubbleStartHelpText,
  runBubbleStartCommand
} from "./commands/bubble/start.js";
import {
  getBubbleStopHelpText,
  runBubbleStopCommand
} from "./commands/bubble/stop.js";
import {
  getBubbleStatusHelpText,
  parseBubbleStatusCommandOptions,
  renderBubbleStatusText,
  runBubbleStatusCommand
} from "./commands/bubble/status.js";
import {
  getBubbleWatchdogHelpText,
  parseBubbleWatchdogCommandOptions,
  renderBubbleWatchdogText,
  runBubbleWatchdogCommand
} from "./commands/bubble/watchdog.js";
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

type AgentCommandName = "pass" | "ask-human" | "converged";
const agentCommandNames = ["pass", "ask-human", "converged"] as const;

function resolveAgentCommandArgs(
  command: string | undefined,
  subcommand: string | undefined,
  rest: string[],
  expected: AgentCommandName
): string[] | null {
  if (command === expected) {
    return [subcommand, ...rest].filter((part) => part !== undefined);
  }
  if (command === "agent" && subcommand === expected) {
    return rest;
  }
  return null;
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

async function handleBubbleCreateCommand(args: string[]): Promise<number> {
  const result = await runBubbleCreateCommand(args);
  if (result === null) {
    process.stdout.write(`${getBubbleCreateHelpText()}\n`);
    return 0;
  }
  process.stdout.write(
    `Created bubble ${result.bubbleId} at ${result.paths.bubbleDir}\n`
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

async function handleBubbleOpenCommand(args: string[]): Promise<number> {
  const result = await runBubbleOpenCommand(args);
  if (result === null) {
    process.stdout.write(`${getBubbleOpenHelpText()}\n`);
    return 0;
  }

  process.stdout.write(
    `Opened bubble ${result.bubbleId}: worktree ${result.worktreePath}\n`
  );
  return 0;
}

async function handleBubbleResumeCommand(args: string[]): Promise<number> {
  const result = await runBubbleResumeCommand(args);
  if (result === null) {
    process.stdout.write(`${getBubbleResumeHelpText()}\n`);
    return 0;
  }

  process.stdout.write(
    `Resumed bubble ${result.bubbleId}: ${result.envelope.id} -> ${result.envelope.recipient}\n`
  );
  return 0;
}

async function handleBubbleStopCommand(args: string[]): Promise<number> {
  const result = await runBubbleStopCommand(args);
  if (result === null) {
    process.stdout.write(`${getBubbleStopHelpText()}\n`);
    return 0;
  }

  process.stdout.write(
    `Stopped bubble ${result.bubbleId}: state=${result.state.state}, session=${result.tmuxSessionName}, tmuxExisted=${result.tmuxSessionExisted ? "yes" : "no"}, runtimeSessionRemoved=${result.runtimeSessionRemoved ? "yes" : "no"}\n`
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

async function handleBubbleWatchdogCommand(args: string[]): Promise<number> {
  const parsed = parseBubbleWatchdogCommandOptions(args);
  if (parsed.help) {
    process.stdout.write(`${getBubbleWatchdogHelpText()}\n`);
    return 0;
  }

  const result = await runBubbleWatchdogCommand(parsed);
  if (result === null) {
    process.stdout.write(`${getBubbleWatchdogHelpText()}\n`);
    return 0;
  }

  if (parsed.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    process.stdout.write(`${renderBubbleWatchdogText(result)}\n`);
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

async function handleBubbleMergeCommand(args: string[]): Promise<number> {
  const result = await runBubbleMergeCommand(args);
  if (result === null) {
    process.stdout.write(`${getBubbleMergeHelpText()}\n`);
    return 0;
  }

  process.stdout.write(
    `Merged bubble ${result.bubbleId}: ${result.bubbleBranch} -> ${result.baseBranch} @ ${result.mergeCommitSha}; pushed=${result.pushedBaseBranch ? "yes" : "no"}, remoteDeleted=${result.deletedRemoteBranch ? "yes" : "no"}, tmuxExisted=${result.tmuxSessionExisted ? "yes" : "no"}, runtimeSessionRemoved=${result.runtimeSessionRemoved ? "yes" : "no"}, worktreeRemoved=${result.removedWorktree ? "yes" : "no"}, branchRemoved=${result.removedBubbleBranch ? "yes" : "no"}\n`
  );
  return 0;
}

async function handleBubbleInboxCommand(args: string[]): Promise<number> {
  const parsed = parseBubbleInboxCommandOptions(args);
  if (parsed.help) {
    process.stdout.write(`${getBubbleInboxHelpText()}\n`);
    return 0;
  }

  const result = await runBubbleInboxCommand(parsed);
  if (result === null) {
    process.stdout.write(`${getBubbleInboxHelpText()}\n`);
    return 0;
  }

  if (parsed.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    process.stdout.write(`${renderBubbleInboxText(result)}\n`);
  }

  return 0;
}

const bubbleSubcommandHandlers: Readonly<
  Record<string, (args: string[]) => Promise<number>>
> = {
  create: handleBubbleCreateCommand,
  start: handleBubbleStartCommand,
  open: handleBubbleOpenCommand,
  stop: handleBubbleStopCommand,
  resume: handleBubbleResumeCommand,
  status: handleBubbleStatusCommand,
  watchdog: handleBubbleWatchdogCommand,
  inbox: handleBubbleInboxCommand,
  list: handleBubbleListCommand,
  reconcile: handleBubbleReconcileCommand,
  reply: handleBubbleReplyCommand,
  commit: handleBubbleCommitCommand,
  merge: handleBubbleMergeCommand,
  approve: handleBubbleApproveCommand,
  "request-rework": handleBubbleRequestReworkCommand
};

function buildSupportedCommandsText(): string {
  const bubbleCommands = Object.keys(bubbleSubcommandHandlers).map(
    (subcommand) => `bubble ${subcommand}`
  );
  const topLevelAgentCommands = [...agentCommandNames];
  const namespacedAgentCommands = agentCommandNames.map(
    (commandName) => `agent ${commandName}`
  );
  return [
    ...bubbleCommands,
    ...topLevelAgentCommands,
    ...namespacedAgentCommands
  ].join(", ");
}

export async function runCli(argv: string[]): Promise<number> {
  const [command, subcommand, ...rest] = argv;

  const passArgs = resolveAgentCommandArgs(command, subcommand, rest, "pass");
  if (passArgs !== null) {
    return handlePassCommand(passArgs);
  }

  const askHumanArgs = resolveAgentCommandArgs(
    command,
    subcommand,
    rest,
    "ask-human"
  );
  if (askHumanArgs !== null) {
    return handleAskHumanCommand(askHumanArgs);
  }

  const convergedArgs = resolveAgentCommandArgs(
    command,
    subcommand,
    rest,
    "converged"
  );
  if (convergedArgs !== null) {
    return handleConvergedCommand(convergedArgs);
  }

  if (command === "bubble" && subcommand !== undefined) {
    const bubbleHandler = bubbleSubcommandHandlers[subcommand];
    if (bubbleHandler !== undefined) {
      return bubbleHandler(rest);
    }
  }

  process.stderr.write(
    `Unknown command. Supported: ${buildSupportedCommandsText()}\n`
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
