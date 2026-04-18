import { parseArgs } from "node:util";

import {
  asBubbleListError,
  listBubbles
} from "./listCommandApi.js";
import type { BubbleListView } from "./listCommandContract.js";

export interface BubbleListCommandOptions {
  repo?: string;
  json: boolean;
  refresh: boolean;
  help: false;
}

export interface BubbleListHelpCommandOptions {
  help: true;
}

export type ParsedBubbleListCommandOptions =
  | BubbleListCommandOptions
  | BubbleListHelpCommandOptions;

export function getBubbleListHelpText(): string {
  return [
    "Usage:",
    "  pairflow bubble list [--repo <path>] [--json] [--refresh]",
    "",
    "Options:",
    "  --repo <path>         Optional repository path (defaults to git top-level from cwd)",
    "  --json                Print structured JSON output",
    "  --refresh             Refresh started remote bubbles via remote status read",
    "  -h, --help            Show this help"
  ].join("\n");
}

export function parseBubbleListCommandOptions(
  args: string[]
): ParsedBubbleListCommandOptions {
  const parsed = parseArgs({
    args,
    options: {
      repo: {
        type: "string"
      },
      json: {
        type: "boolean"
      },
      refresh: {
        type: "boolean"
      },
      help: {
        type: "boolean",
        short: "h"
      }
    },
    strict: true,
    allowPositionals: false
  });

  if (parsed.values.help ?? false) {
    return { help: true };
  }

  return {
    ...(parsed.values.repo !== undefined ? { repo: parsed.values.repo } : {}),
    json: parsed.values.json ?? false,
    refresh: parsed.values.refresh ?? false,
    help: false
  };
}

export function renderBubbleListText(view: BubbleListView): string {
  const lines: string[] = [
    `Repository: ${view.repoPath}`,
    `Bubbles: total=${view.total}`,
    `Runtime sessions: registered=${view.runtimeSessions.registered}, stale=${view.runtimeSessions.stale}`,
    `States: CREATED=${view.byState.CREATED}, PREPARING_WORKSPACE=${view.byState.PREPARING_WORKSPACE}, RUNNING=${view.byState.RUNNING}, WAITING_HUMAN=${view.byState.WAITING_HUMAN}, READY_FOR_HUMAN_APPROVAL=${view.byState.READY_FOR_HUMAN_APPROVAL}, APPROVED_FOR_COMMIT=${view.byState.APPROVED_FOR_COMMIT}, COMMITTED=${view.byState.COMMITTED}, DONE=${view.byState.DONE}, FAILED=${view.byState.FAILED}, CANCELLED=${view.byState.CANCELLED}`
  ];
  if (view.remoteExecutionSummary !== undefined) {
    lines.push(
      `Remote summary: created_not_started=${view.remoteExecutionSummary.createdNotStarted}, unavailable_started=${view.remoteExecutionSummary.unavailableStarted}${view.remoteExecutionSummary.refreshedThisRun === true ? ", refreshed_this_run=yes" : ""}`
    );
  }

  if (view.bubbles.length === 0) {
    lines.push("No bubbles found.");
    return lines.join("\n");
  }

  lines.push("Bubble details:");
  for (const bubble of view.bubbles) {
    const session = bubble.runtimeSession?.tmuxSessionName ?? "-";
    const validationSuffix =
      bubble.stateValidation === null ? "" : " state_validation=invalid";
    const lifecycleSummary =
      bubble.remoteExecution?.stateSource === "unavailable_started"
        ? `state=unavailable, round=-${bubble.remoteExecution.compatLifecyclePlaceholder !== undefined
          ? ` compat_state=${bubble.remoteExecution.compatLifecyclePlaceholder.state}${bubble.remoteExecution.compatLifecyclePlaceholder.round !== undefined ? ` compat_round=${bubble.remoteExecution.compatLifecyclePlaceholder.round}` : ""}`
          : ""}`
        : `state=${bubble.state}, round=${bubble.round}`;
    const remoteSuffix =
      bubble.remoteExecution === undefined
        ? ""
        : ` remote=${bubble.remoteExecution.pointerKind}@${bubble.remoteExecution.host} source=${bubble.remoteExecution.stateSource}${bubble.remoteExecution.runtimeAvailability !== undefined ? ` runtime=${bubble.remoteExecution.runtimeAvailability}` : ""} cache=${bubble.remoteExecution.cacheStatus}${bubble.remoteExecution.lastLiveCheckAt !== undefined ? ` live_checked=${bubble.remoteExecution.lastLiveCheckAt}` : ""}${bubble.remoteExecution.lastCacheCheckAt !== undefined ? ` checked=${bubble.remoteExecution.lastCacheCheckAt}` : ""}${bubble.remoteExecution.refreshAttemptedAt !== undefined ? ` refresh_attempted=${bubble.remoteExecution.refreshAttemptedAt}` : ""}${bubble.remoteExecution.runtimeReasonCode !== undefined ? ` runtime_reason=${bubble.remoteExecution.runtimeReasonCode}` : ""}${bubble.remoteExecution.reasonCode !== undefined ? ` reason=${bubble.remoteExecution.reasonCode}` : ""}${bubble.remoteExecution.stateSource === "refresh" && bubble.remoteExecution.runtimeAvailability === "missing" ? " runtime_note=preserved_state_no_live_runtime_fail_closed" : ""}${bubble.remoteExecution.remoteClonePath !== undefined ? ` clone=${bubble.remoteExecution.remoteClonePath}` : ""}`;
    lines.push(
      `- ${bubble.bubbleId}: ${lifecycleSummary}, active=${bubble.activeAgent ?? "-"}(${bubble.activeRole ?? "-"}), session=${session}${validationSuffix}${remoteSuffix}`
    );
  }

  return lines.join("\n");
}

export async function runBubbleListCommand(
  args: string[] | BubbleListCommandOptions,
  cwd: string = process.cwd()
): Promise<BubbleListView | null> {
  const options = Array.isArray(args) ? parseBubbleListCommandOptions(args) : args;
  if (options.help) {
    return null;
  }

  try {
    return await listBubbles({
      repoPath: options.repo,
      cwd,
      refresh: options.refresh
    });
  } catch (error) {
    asBubbleListError(error, {
      repoPathProvided: options.repo !== undefined,
      cwdProvided: cwd.length > 0
    });
  }
}
