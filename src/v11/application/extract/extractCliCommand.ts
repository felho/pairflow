import { parseArgs } from "node:util";

import { extractBubbleV11 } from "./emitExtractV11.js";
import type {
  ExtractCommandDependencies,
  ExtractCommandResult
} from "./extractCommandContract.js";

type ExtractCommandDefaultsModule = {
  extractCommandDependencyDefaults: ExtractCommandDependencies;
};

let extractCommandDefaultsModulePromise:
  | Promise<ExtractCommandDefaultsModule>
  | undefined;

function getExtractCommandDefaultsModulePath(): string {
  return [
    "..",
    "..",
    "defaults",
    "extract",
    "extractCommandDefaults.js"
  ].join("/");
}

async function loadExtractCommandDependencyDefaults(): Promise<
  ExtractCommandDependencies
> {
  extractCommandDefaultsModulePromise ??= import(
    getExtractCommandDefaultsModulePath()
  ) as Promise<ExtractCommandDefaultsModule>;
  const module = await extractCommandDefaultsModulePromise;
  return module.extractCommandDependencyDefaults;
}

export interface BubbleExtractCommandOptions {
  id: string;
  paths: string[];
  repo?: string;
  commit: boolean;
  message?: string;
  json: boolean;
  help: false;
}

export interface BubbleExtractHelpCommandOptions {
  help: true;
}

export type ParsedBubbleExtractCommandOptions =
  | BubbleExtractCommandOptions
  | BubbleExtractHelpCommandOptions;

export function getBubbleExtractHelpText(): string {
  return [
    "Usage:",
    '  pairflow bubble extract --id <id> --path <artifact-path> [--path <artifact-path>...] [--repo <path>] [--commit] [--message "<text>"] [--json]',
    "",
    "Options:",
    "  --id <id>             Ideation bubble id",
    "  --path <path>         Explicit selected artifact path (repeatable)",
    "  --repo <path>         Optional target repository path (defaults to cwd ancestry lookup)",
    "  --commit              Stage and commit exactly the selected paths after copying",
    "  --message <text>      Optional commit message intent; requires --commit",
    "  --json                Print structured JSON output",
    "  -h, --help            Show this help",
    "",
    "Notes:",
    "  Requires ideation.mode=true in bubble metadata.",
    "  Requires explicit paths under plans/, docs/, or progress/.",
    "  Existing target-path conflicts fail closed; extract does not close, merge, or delete the source bubble."
  ].join("\n");
}

export function parseBubbleExtractCommandOptions(
  args: string[]
): ParsedBubbleExtractCommandOptions {
  const parsed = parseArgs({
    args,
    options: {
      id: {
        type: "string"
      },
      path: {
        type: "string",
        multiple: true
      },
      repo: {
        type: "string"
      },
      commit: {
        type: "boolean"
      },
      message: {
        type: "string"
      },
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
    return { help: true };
  }

  const id = parsed.values.id;
  if (id === undefined || id.trim().length === 0) {
    throw new Error(
      "EXTRACT_ID_REQUIRED: Missing required option: --id. context: command_name=extract."
    );
  }

  const paths = parsed.values.path ?? [];
  if (paths.length === 0) {
    throw new Error(
      "EXTRACT_PATH_REQUIRED: Missing required option: --path. context: command_name=extract."
    );
  }

  const commit = parsed.values.commit ?? false;
  if (parsed.values.message !== undefined && !commit) {
    throw new Error(
      "EXTRACT_MESSAGE_REQUIRES_COMMIT: --message requires --commit. context: command_name=extract."
    );
  }

  return {
    id,
    paths,
    ...(parsed.values.repo !== undefined ? { repo: parsed.values.repo } : {}),
    commit,
    ...(parsed.values.message !== undefined ? { message: parsed.values.message } : {}),
    json: parsed.values.json ?? false,
    help: false
  };
}

export function renderBubbleExtractText(result: ExtractCommandResult): string {
  if (result.status === "success") {
    const copied = `Extracted ${result.bubbleId}: copied ${result.copiedPaths.length} selected path(s).`;
    if (result.commitSha !== undefined) {
      return [
        copied,
        `Committed ${result.commitSha} with message: ${result.commitMessage ?? ""}`
      ].join(" ");
    }
    return copied;
  }

  const copiedCount = result.diagnostics?.copiedPaths?.length ?? 0;
  const stagedCount = result.diagnostics?.stagedPaths?.length ?? 0;
  const sideEffects: string[] = [];
  if (copiedCount > 0) {
    sideEffects.push(`copied ${copiedCount} selected path(s)`);
  }
  if (stagedCount > 0) {
    sideEffects.push(`staged ${stagedCount} path(s)`);
  }
  if (
    result.diagnostics?.gitStep === "resolve_commit_sha"
    || result.diagnostics?.gitStep === "update_head"
  ) {
    sideEffects.push("a commit may already exist");
  }

  const sideEffectText =
    sideEffects.length === 0
      ? "No files were copied, staged, or committed."
      : `Partial side effects may remain: ${sideEffects.join(", ")}.`;

  return [
    `Extract failed for ${result.bubbleId}: ${result.reasonCode}.`,
    sideEffectText
  ].join(" ");
}

export async function runBubbleExtractCommand(
  args: string[],
  cwd: string = process.cwd(),
  dependencies?: ExtractCommandDependencies
): Promise<ExtractCommandResult | null> {
  const options = parseBubbleExtractCommandOptions(args);
  if (options.help) {
    return null;
  }

  const resolvedDependencies =
    dependencies ?? await loadExtractCommandDependencyDefaults();
  return extractBubbleV11({
    id: options.id,
    paths: options.paths,
    ...(options.repo !== undefined ? { repo: options.repo } : {}),
    commit: options.commit,
    ...(options.message !== undefined ? { message: options.message } : {}),
    json: options.json,
    cwd
  }, resolvedDependencies);
}
