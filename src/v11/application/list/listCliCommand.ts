import { parseArgs } from "node:util";

import {
  asBubbleListError,
  listBubbles
} from "../../shared/read-model/list/listReadModelApi.js";
import type { BubbleListView } from "../../shared/read-model/list/listReadModelContract.js";

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
  lines.push(...view.bubbles.map(renderBubbleListDetailLine));

  return lines.join("\n");
}

function renderBubbleListDetailLine(view: BubbleListView["bubbles"][number]): string {
  const session = view.runtimeSession?.tmuxSessionName ?? "-";
  const validationSuffix =
    view.stateValidation === null ? "" : " state_validation=invalid";
  return (
    `- ${view.bubbleId}: ${renderBubbleLifecycleSummary(view)}, `
    + `active=${view.activeAgent ?? "-"}(${view.activeRole ?? "-"}), `
    + `session=${session}${validationSuffix}${renderBubbleRemoteSuffix(view)}`
  );
}

function renderBubbleLifecycleSummary(view: BubbleListView["bubbles"][number]): string {
  if (view.remoteExecution?.stateSource !== "unavailable_started") {
    return `state=${view.state}, round=${view.round}`;
  }

  const compat = view.remoteExecution.compatLifecyclePlaceholder;
  if (compat === undefined) {
    return "state=unavailable, round=-";
  }

  return (
    `state=unavailable, round=- compat_state=${compat.state}`
    + `${compat.round !== undefined ? ` compat_round=${compat.round}` : ""}`
  );
}

function renderBubbleRemoteSuffix(view: BubbleListView["bubbles"][number]): string {
  const remoteExecution = view.remoteExecution;
  if (remoteExecution === undefined) {
    return "";
  }

  return (
    ` remote=${remoteExecution.pointerKind}@${remoteExecution.host}`
    + ` source=${remoteExecution.stateSource}`
    + `${remoteExecution.runtimeAvailability !== undefined
      ? ` runtime=${remoteExecution.runtimeAvailability}`
      : ""}`
    + ` cache=${remoteExecution.cacheStatus}`
    + `${remoteExecution.lastLiveCheckAt !== undefined
      ? ` live_checked=${remoteExecution.lastLiveCheckAt}`
      : ""}`
    + `${remoteExecution.lastCacheCheckAt !== undefined
      ? ` checked=${remoteExecution.lastCacheCheckAt}`
      : ""}`
    + `${remoteExecution.refreshAttemptedAt !== undefined
      ? ` refresh_attempted=${remoteExecution.refreshAttemptedAt}`
      : ""}`
    + `${remoteExecution.runtimeReasonCode !== undefined
      ? ` runtime_reason=${remoteExecution.runtimeReasonCode}`
      : ""}`
    + `${remoteExecution.reasonCode !== undefined
      ? ` reason=${remoteExecution.reasonCode}`
      : ""}`
    + `${remoteExecution.stateSource === "refresh"
      && remoteExecution.runtimeAvailability === "missing"
      ? " runtime_note=preserved_state_no_live_runtime_fail_closed"
      : ""}`
    + `${remoteExecution.remoteClonePath !== undefined
      ? ` clone=${remoteExecution.remoteClonePath}`
      : ""}`
  );
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
