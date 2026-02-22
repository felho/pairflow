import { parseArgs } from "node:util";

import {
  asStartupReconcilerError,
  reconcileRuntimeSessions,
  type ReconcileRuntimeSessionsReport
} from "../../../core/runtime/startupReconciler.js";

export interface BubbleReconcileCommandOptions {
  repo?: string;
  json: boolean;
  dryRun: boolean;
  help: false;
}

export interface BubbleReconcileHelpCommandOptions {
  help: true;
}

export type ParsedBubbleReconcileCommandOptions =
  | BubbleReconcileCommandOptions
  | BubbleReconcileHelpCommandOptions;

export function getBubbleReconcileHelpText(): string {
  return [
    "Usage:",
    "  pairflow bubble reconcile [--repo <path>] [--dry-run] [--json]",
    "",
    "Options:",
    "  --repo <path>         Optional repository path (defaults to git top-level from cwd)",
    "  --dry-run             Show stale runtime session candidates without removing them",
    "  --json                Print structured JSON output",
    "  -h, --help            Show this help"
  ].join("\n");
}

export function parseBubbleReconcileCommandOptions(
  args: string[]
): ParsedBubbleReconcileCommandOptions {
  const parsed = parseArgs({
    args,
    options: {
      repo: {
        type: "string"
      },
      json: {
        type: "boolean"
      },
      "dry-run": {
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
    dryRun: parsed.values["dry-run"] ?? false,
    help: false
  };
}

export function renderBubbleReconcileText(
  report: ReconcileRuntimeSessionsReport
): string {
  const lines = [
    `Repository: ${report.repoPath}`,
    `Dry run: ${report.dryRun ? "yes" : "no"}`,
    `Runtime sessions: before=${report.sessionsBefore}, after=${report.sessionsAfter}`,
    `Stale candidates: ${report.staleCandidates}`
  ];

  if (report.actions.length === 0) {
    lines.push("No stale runtime sessions found.");
    return lines.join("\n");
  }

  lines.push("Actions:");
  for (const action of report.actions) {
    lines.push(
      `- ${action.bubbleId}: reason=${action.reason}, removed=${action.removed ? "yes" : "no"}`
    );
  }

  return lines.join("\n");
}

export async function runBubbleReconcileCommand(
  args: string[] | BubbleReconcileCommandOptions,
  cwd: string = process.cwd()
): Promise<ReconcileRuntimeSessionsReport | null> {
  const options = Array.isArray(args) ? parseBubbleReconcileCommandOptions(args) : args;
  if (options.help) {
    return null;
  }

  try {
    return await reconcileRuntimeSessions({
      repoPath: options.repo,
      cwd,
      dryRun: options.dryRun
    });
  } catch (error) {
    asStartupReconcilerError(error);
  }
}
