import { parseArgs } from "node:util";

import {
  readRepoRegistry,
  type RepoRegistryEntry
} from "../../../core/repo/registry.js";
import { pathExists } from "../../../core/util/pathExists.js";

export interface RepoListEntry extends RepoRegistryEntry {
  status: "exists" | "missing";
}

export interface RepoListView {
  registryPath: string;
  total: number;
  repos: RepoListEntry[];
}

export interface RepoListCommandOptions {
  json: boolean;
  help: false;
}

export interface RepoListHelpCommandOptions {
  help: true;
}

export type ParsedRepoListCommandOptions =
  | RepoListCommandOptions
  | RepoListHelpCommandOptions;

export interface RunRepoListCommandInput {
  registryPath?: string | undefined;
}

export function getRepoListHelpText(): string {
  return [
    "Usage:",
    "  pairflow repo list [--json]",
    "",
    "Options:",
    "  --json                Print structured JSON output",
    "  -h, --help            Show this help"
  ].join("\n");
}

export function parseRepoListCommandOptions(
  args: string[]
): ParsedRepoListCommandOptions {
  const parsed = parseArgs({
    args,
    options: {
      json: {
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
    return {
      help: true
    };
  }

  return {
    json: parsed.values.json ?? false,
    help: false
  };
}

export function renderRepoListText(view: RepoListView): string {
  const lines: string[] = [
    `Registry: ${view.registryPath}`,
    `Registered repositories: ${view.total}`
  ];

  if (view.repos.length === 0) {
    lines.push("No repositories registered.");
    return lines.join("\n");
  }

  for (const repo of view.repos) {
    lines.push(
      `- ${repo.repoPath}: status=${repo.status}, addedAt=${repo.addedAt}`
    );
  }

  return lines.join("\n");
}

export async function runRepoListCommand(
  args: RepoListCommandOptions,
  input?: RunRepoListCommandInput | undefined
): Promise<RepoListView>;
export async function runRepoListCommand(
  args: RepoListHelpCommandOptions,
  input?: RunRepoListCommandInput | undefined
): Promise<null>;
export async function runRepoListCommand(
  args: string[],
  input?: RunRepoListCommandInput | undefined
): Promise<RepoListView | null>;
export async function runRepoListCommand(
  args: string[] | ParsedRepoListCommandOptions,
  input: RunRepoListCommandInput = {}
): Promise<RepoListView | null> {
  const options = Array.isArray(args) ? parseRepoListCommandOptions(args) : args;
  if (options.help) {
    return null;
  }

  const loaded = await readRepoRegistry({
    allowMissing: true,
    ...(input.registryPath !== undefined
      ? { registryPath: input.registryPath }
      : {})
  });
  const repos: RepoListEntry[] = [];
  for (const entry of loaded.entries) {
    const exists = await pathExists(entry.repoPath);
    repos.push({
      ...entry,
      status: exists ? "exists" : "missing"
    });
  }

  return {
    registryPath: loaded.registryPath,
    total: repos.length,
    repos
  };
}
