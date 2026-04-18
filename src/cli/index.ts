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
  getAgentEmitHelpText,
  runAgentEmitCommand
} from "./commands/agent/emit.js";
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
  getBubbleKickoffHelpText,
  runBubbleKickoffCommand
} from "./commands/bubble/kickoff.js";
import {
  getBubbleReplyHelpText,
  runBubbleReplyCommand
} from "./commands/bubble/reply.js";
import {
  getBubbleOpenHelpText,
  runBubbleOpenCommand
} from "./commands/bubble/open.js";
import {
  getBubbleAttachHelpText,
  runBubbleAttachCommand
} from "./commands/bubble/attach.js";
import {
  getBubbleResumeHelpText,
  runBubbleResumeCommand
} from "./commands/bubble/resume.js";
import {
  getBubbleRestartHelpText,
  runBubbleRestartCommand
} from "../v11/application/restart/restartCliCommand.js";
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
  parseBubbleMergeCommandOptions,
  runBubbleMergeCommand
} from "./commands/bubble/merge.js";
import { renderMetaReviewSubmitText } from "../v11/application/metaReview/metaReviewSubmitRenderers.js";
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
  getBubbleDeleteHelpText,
  runBubbleDeleteCommand
} from "./commands/bubble/delete.js";
import {
  getBubbleStatusHelpText,
  parseBubbleStatusCommandOptions,
  renderBubbleStatusTable,
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
import {
  getUiServerHelpText,
  runUiServerCommand
} from "./commands/ui/server.js";
import {
  getRepoAddHelpText,
  runRepoAddCommand
} from "./commands/repo/add.js";
import {
  getRepoListHelpText,
  parseRepoListCommandOptions,
  renderRepoListText,
  runRepoListCommand
} from "./commands/repo/list.js";
import {
  getRepoRemoveHelpText,
  runRepoRemoveCommand
} from "./commands/repo/remove.js";
import {
  getMetricsReportHelpText,
  runMetricsReportCommand
} from "./commands/metrics/report.js";
import { isMainCliEntrypoint } from "./isMainCliEntrypoint.js";
import type { ActorEmitResultV11 } from "../v11/application/actorProtocol/emitActorProtocolV11.js";

async function handlePassCommand(args: string[]): Promise<number> {
  const result = await runPassCommand(args);
  if (result === null) {
    process.stdout.write(`${getPassHelpText()}\n`);
    return 0;
  }
  writePassResult(result);
  return 0;
}

function writePassResult(
  result: NonNullable<Awaited<ReturnType<typeof runPassCommand>>>
): void {
  let outputLine: string;
  if (result.transitionDecision === "auto_converge") {
    if (result.autoConverged === undefined) {
      throw new Error(
        "PASS command returned auto_converge transition without autoConverged payload."
      );
    }
    const handoffDescription =
      result.autoConverged.approvalRequestEnvelope.type === "APPROVAL_REQUEST"
        ? `human gate requested: ${result.autoConverged.approvalRequestEnvelope.id}`
        : `auto rework dispatched: ${result.autoConverged.approvalRequestEnvelope.id}`;
    outputLine =
      `AUTO-CONVERGENCE recorded for ${result.bubbleId}: ${result.autoConverged.convergenceEnvelope.id}; ${handoffDescription} (reason=${result.repeatCleanReasonCode})\n`;
  } else {
    outputLine =
      `PASS recorded for ${result.bubbleId}: ${result.envelope.id} -> ${result.envelope.recipient} (reason=${result.repeatCleanReasonCode})\n`;
  }
  process.stdout.write(outputLine);
  if (result.delivery !== undefined && !result.delivery.delivered) {
    const guidance =
      result.transitionDecision === "auto_converge"
        ? `Use \`pairflow bubble status --id ${result.bubbleId}\` to inspect approval state, then \`pairflow bubble approve --id ${result.bubbleId}\`, \`pairflow bubble request-rework --id ${result.bubbleId}\`, or \`pairflow bubble reply --id ${result.bubbleId}\` as appropriate.`
        : `Use \`pairflow bubble status --id ${result.bubbleId}\` and \`pairflow bubble resume --id ${result.bubbleId}\` if the next agent did not start.`;
    process.stderr.write(
      `Warning: handoff delivery to active pane was not confirmed (reason: ${result.delivery.reason ?? "unknown"}${result.delivery.retried ? ", retried" : ""}). ${guidance}\n`
    );
  }
  if (result.docGateArtifactWriteFailureReason !== undefined) {
    process.stderr.write(
      `Warning: reviewer doc-gate artifact update failed during PASS handling (reason: ${result.docGateArtifactWriteFailureReason}).\n`
    );
  }
  if (
    result.transitionDecision === "normal_pass"
    && result.passValidationCompatibilityArtifactWriteFailureReason !== undefined
  ) {
    process.stderr.write(
      `Warning: PASS validation compatibility artifact update failed during PASS handling (reason: ${result.passValidationCompatibilityArtifactWriteFailureReason}).\n`
    );
  }
}

async function handleAskHumanCommand(args: string[]): Promise<number> {
  const result = await runAskHumanCommand(args);
  if (result === null) {
    process.stdout.write(`${getAskHumanHelpText()}\n`);
    return 0;
  }
  writeAskHumanResult(result);
  return 0;
}

function writeAskHumanResult(
  result: NonNullable<Awaited<ReturnType<typeof runAskHumanCommand>>>
): void {
  process.stdout.write(
    `HUMAN_QUESTION recorded for ${result.bubbleId}: ${result.envelope.id}\n`
  );
}

async function handleConvergedCommand(args: string[]): Promise<number> {
  const result = await runConvergedCommand(args);
  if (result === null) {
    process.stdout.write(`${getConvergedHelpText()}\n`);
    return 0;
  }
  writeConvergedResult(result);
  return 0;
}

function writeConvergedResult(
  result: NonNullable<Awaited<ReturnType<typeof runConvergedCommand>>>
): void {
  const handoffDescription =
    result.approvalRequestEnvelope.type === "APPROVAL_REQUEST"
      ? `human gate requested: ${result.approvalRequestEnvelope.id}`
      : `auto rework dispatched: ${result.approvalRequestEnvelope.id}`;
  process.stdout.write(
    `CONVERGENCE recorded for ${result.bubbleId}: ${result.convergenceEnvelope.id}; ${handoffDescription}\n`
  );
  if (result.delivery !== undefined && !result.delivery.delivered) {
    const guidance =
      result.approvalRequestEnvelope.type === "APPROVAL_REQUEST"
        ? `Use \`pairflow bubble status --id ${result.bubbleId}\` to inspect approval state, then \`pairflow bubble approve --id ${result.bubbleId}\`, \`pairflow bubble request-rework --id ${result.bubbleId}\`, or \`pairflow bubble reply --id ${result.bubbleId}\` as appropriate.`
        : `Use \`pairflow bubble status --id ${result.bubbleId}\` and \`pairflow bubble resume --id ${result.bubbleId}\` if the implementer did not start after auto rework dispatch.`;
    process.stderr.write(
      `Warning: handoff delivery to active pane was not confirmed (reason: ${result.delivery.reason ?? "unknown"}${result.delivery.retried ? ", retried" : ""}). ${guidance}\n`
    );
  }
}

async function handleAgentEmitCommand(args: string[]): Promise<number> {
  const result = await runAgentEmitCommand(args);
  if (result === null) {
    process.stdout.write(`${getAgentEmitHelpText()}\n`);
    return 0;
  }

  writeAgentEmitResult(result);
  return 0;
}

function writeAgentEmitResult(result: Awaited<ActorEmitResultV11>): void {
  if (result.kind === "pass") {
    writePassResult(result.pass);
    return;
  }
  if (result.kind === "human_question") {
    writeAskHumanResult(result.human_question);
    return;
  }
  if (result.kind === "convergence") {
    writeConvergedResult(result.convergence);
    return;
  }

  process.stdout.write(
    `${renderMetaReviewSubmitText(result.meta_review_result)}\n`
  );
}

function waitForShutdownSignal(closeServer: () => Promise<void>): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    let closing = false;

    const cleanup = (): void => {
      process.off("SIGINT", onSignal);
      process.off("SIGTERM", onSignal);
    };

    const onSignal = (): void => {
      if (closing) {
        return;
      }
      closing = true;
      cleanup();
      void closeServer().then(resolve, reject);
    };

    process.on("SIGINT", onSignal);
    process.on("SIGTERM", onSignal);
  });
}

async function handleUiCommand(args: string[]): Promise<number> {
  const result = await runUiServerCommand(args);
  if (result === null) {
    process.stdout.write(`${getUiServerHelpText()}\n`);
    return 0;
  }

  process.stdout.write(`Pairflow UI server listening on ${result.url}\n`);
  process.stdout.write(`Scoped repositories: ${result.repoScope.repos.join(", ")}\n`);
  await waitForShutdownSignal(async () => {
    await result.close();
  });
  return 0;
}

async function handleRepoAddCommand(args: string[]): Promise<number> {
  const result = await runRepoAddCommand(args);
  if (result === null) {
    process.stdout.write(`${getRepoAddHelpText()}\n`);
    return 0;
  }
  if (result.added) {
    process.stdout.write(`Registered repository: ${result.entry.repoPath}\n`);
  } else {
    process.stdout.write(
      `Repository already registered: ${result.entry.repoPath}\n`
    );
  }
  return 0;
}

async function handleRepoRemoveCommand(args: string[]): Promise<number> {
  const result = await runRepoRemoveCommand(args);
  if (result === null) {
    process.stdout.write(`${getRepoRemoveHelpText()}\n`);
    return 0;
  }
  if (result.removed) {
    process.stdout.write(`Removed repository: ${result.repoPath}\n`);
  } else {
    process.stdout.write(`Repository was not registered: ${result.repoPath}\n`);
  }
  return 0;
}

async function handleRepoListCommand(args: string[]): Promise<number> {
  const parsed = parseRepoListCommandOptions(args);
  if (parsed.help) {
    process.stdout.write(`${getRepoListHelpText()}\n`);
    return 0;
  }

  const result = await runRepoListCommand(parsed);

  if (parsed.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    process.stdout.write(`${renderRepoListText(result)}\n`);
  }
  return 0;
}

async function handleMetricsReportCommand(args: string[]): Promise<number> {
  try {
    const result = await runMetricsReportCommand(args);
    if (result === null) {
      process.stdout.write(`${getMetricsReportHelpText()}\n`);
      return 0;
    }

    process.stdout.write(`${result.output}\n`);
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    return 1;
  }
}

type AgentCommandName = "pass" | "ask-human" | "converged" | "emit";

function resolveAgentCommandArgs(
  command: string | undefined,
  subcommand: string | undefined,
  rest: string[],
  expected: AgentCommandName
): string[] | null {
  if (expected !== "emit" && command === expected) {
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

async function handleBubbleKickoffCommand(args: string[]): Promise<number> {
  const result = await runBubbleKickoffCommand(args);
  if (result === null) {
    process.stdout.write(`${getBubbleKickoffHelpText()}\n`);
    return 0;
  }
  process.stdout.write(
    `KICKOFF activated for ${result.bubble_id}: round 0 -> 1\n`
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
  if (result.mode === "immediate") {
    process.stdout.write(
      `APPROVAL_DECISION recorded for ${result.bubbleId}: ${result.envelope.id} -> rework\n`
    );
    if (result.delivery?.implementerDelivery !== undefined && !result.delivery.implementerDelivery.delivered) {
      process.stderr.write(
        `Warning: rework delivery to implementer pane was not confirmed (reason: ${result.delivery.implementerDelivery.reason ?? "unknown"}). Use \`pairflow bubble status --id ${result.bubbleId}\` and \`pairflow bubble restart --id ${result.bubbleId}\` if the implementer did not resume.\n`
      );
    }
    return 0;
  }

  const supersededPart =
    result.supersededIntentId === undefined
      ? ""
      : ` superseded_intent_id=${result.supersededIntentId}.`;
  process.stdout.write(
    `Rework intent queued for ${result.bubbleId}: intent_id=${result.intentId}.${supersededPart} Execution is deferred; orchestrator will consume this intent and route the next actionable handoff to the implementer.\n`
  );
  return 0;
}

async function handleBubbleStartCommand(args: string[]): Promise<number> {
  const result = await runBubbleStartCommand(args);
  if (result === null) {
    process.stdout.write(`${getBubbleStartHelpText()}\n`);
    return 0;
  }

  const workspaceLabel =
    result.executionTarget === "remote" ? "remoteClone" : "worktree";
  const workspacePath =
    result.executionTarget === "remote"
      ? result.runtimeWorkspacePath
      : result.worktreePath;
  if (result.executionTarget === "remote") {
    process.stdout.write(
      `Started bubble ${result.bubbleId}: ${workspaceLabel} ${workspacePath}\n`
    );
    return 0;
  }
  process.stdout.write(
    `Started bubble ${result.bubbleId}: session ${result.tmuxSessionName}, ${workspaceLabel} ${workspacePath}\n`
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

async function handleBubbleAttachCommand(args: string[]): Promise<number> {
  const result = await runBubbleAttachCommand(args);
  if (result === null) {
    process.stdout.write(`${getBubbleAttachHelpText()}\n`);
    return 0;
  }

  const suffix =
    result.attachCommand !== undefined
      ? `, command=${result.attachCommand}`
      : "";
  process.stdout.write(
    `Attach prepared for ${result.bubbleId}: launcher=${result.launcherUsed}, session=${result.tmuxSessionName}${suffix}\n`
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

async function handleBubbleRestartCommand(args: string[]): Promise<number> {
  const result = await runBubbleRestartCommand(args);
  if (result === null) {
    process.stdout.write(`${getBubbleRestartHelpText()}\n`);
    return 0;
  }

  process.stdout.write(
    `Restarted bubble ${result.bubbleId}: state=${result.state.state}, session=${result.tmuxSessionName}, previousTmuxExisted=${result.previousTmuxSessionExisted ? "yes" : "no"}, previousRuntimeSessionRemoved=${result.previousRuntimeSessionRemoved ? "yes" : "no"}\n`
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

function formatDeleteArtifactsText(input: {
  worktreeExists: boolean;
  worktreePath: string;
  tmuxSessionExists: boolean;
  tmuxSessionName: string;
  runtimeSessionExists: boolean;
  branchExists: boolean;
  branchName: string;
}): string {
  const lines: string[] = [];
  if (input.worktreeExists) {
    lines.push(`  worktree: ${input.worktreePath}`);
  }
  if (input.tmuxSessionExists) {
    lines.push(`  tmux session: ${input.tmuxSessionName}`);
  }
  if (input.runtimeSessionExists) {
    lines.push("  runtime session entry: present");
  }
  if (input.branchExists) {
    lines.push(`  branch: ${input.branchName}`);
  }
  return lines.join("\n");
}

async function handleBubbleDeleteCommand(args: string[]): Promise<number> {
  try {
    const result = await runBubbleDeleteCommand(args);
    if (result === null) {
      process.stdout.write(`${getBubbleDeleteHelpText()}\n`);
      return 0;
    }

    if (result.requiresConfirmation) {
      process.stdout.write(
        `Delete confirmation required for ${result.bubbleId}.\n${formatDeleteArtifactsText({
          worktreeExists: result.artifacts.worktree.exists,
          worktreePath: result.artifacts.worktree.path,
          tmuxSessionExists: result.artifacts.tmux.exists,
          tmuxSessionName: result.artifacts.tmux.sessionName,
          runtimeSessionExists: result.artifacts.runtimeSession.exists,
          branchExists: result.artifacts.branch.exists,
          branchName: result.artifacts.branch.name
        })}\nRe-run with --force to remove external artifacts and delete bubble.\n`
      );
      return 2;
    }

    process.stdout.write(
      `Deleted bubble ${result.bubbleId}: tmuxTerminated=${result.tmuxSessionTerminated ? "yes" : "no"}, runtimeSessionRemoved=${result.runtimeSessionRemoved ? "yes" : "no"}, worktreeRemoved=${result.removedWorktree ? "yes" : "no"}, branchRemoved=${result.removedBubbleBranch ? "yes" : "no"}\n`
    );
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    return 1;
  }
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
    process.stdout.write(`${renderBubbleStatusTable(result)}\n`);
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
  const parsed = parseBubbleMergeCommandOptions(args);
  if (parsed.help) {
    process.stdout.write(`${getBubbleMergeHelpText()}\n`);
    return 0;
  }
  const result = await runBubbleMergeCommand(args);
  if (result === null) {
    process.stdout.write(`${getBubbleMergeHelpText()}\n`);
    return 0;
  }

  if (parsed.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
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
  kickoff: handleBubbleKickoffCommand,
  start: handleBubbleStartCommand,
  attach: handleBubbleAttachCommand,
  open: handleBubbleOpenCommand,
  stop: handleBubbleStopCommand,
  delete: handleBubbleDeleteCommand,
  resume: handleBubbleResumeCommand,
  restart: handleBubbleRestartCommand,
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

const repoSubcommandHandlers: Readonly<
  Record<string, (args: string[]) => Promise<number>>
> = {
  add: handleRepoAddCommand,
  remove: handleRepoRemoveCommand,
  list: handleRepoListCommand
};

const metricsSubcommandHandlers: Readonly<
  Record<string, (args: string[]) => Promise<number>>
> = {
  report: handleMetricsReportCommand
};

function buildSupportedCommandsText(): string {
  const bubbleCommands = Object.keys(bubbleSubcommandHandlers).map(
    (subcommand) => `bubble ${subcommand}`
  );
  const repoCommands = Object.keys(repoSubcommandHandlers).map(
    (subcommand) => `repo ${subcommand}`
  );
  const metricsCommands = Object.keys(metricsSubcommandHandlers).map(
    (subcommand) => `metrics ${subcommand}`
  );
  return [
    "ui",
    ...bubbleCommands,
    ...repoCommands,
    ...metricsCommands,
    "agent emit"
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

  const emitArgs = resolveAgentCommandArgs(command, subcommand, rest, "emit");
  if (emitArgs !== null) {
    return handleAgentEmitCommand(emitArgs);
  }

  if (command === "ui") {
    return handleUiCommand([subcommand, ...rest].filter((part) => part !== undefined));
  }

  if (command === "bubble" && subcommand !== undefined) {
    const bubbleHandler = bubbleSubcommandHandlers[subcommand];
    if (bubbleHandler !== undefined) {
      return bubbleHandler(rest);
    }
  }

  if (command === "repo" && subcommand !== undefined) {
    const repoHandler = repoSubcommandHandlers[subcommand];
    if (repoHandler !== undefined) {
      return repoHandler(rest);
    }
  }

  if (command === "metrics" && subcommand !== undefined) {
    const metricsHandler = metricsSubcommandHandlers[subcommand];
    if (metricsHandler !== undefined) {
      return metricsHandler(rest);
    }
  }

  process.stderr.write(
    `Unknown command. Supported: ${buildSupportedCommandsText()}\n`
  );
  return 1;
}

if (isMainCliEntrypoint(import.meta.url, process.argv[1])) {
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
