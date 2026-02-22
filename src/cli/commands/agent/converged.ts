import { parseArgs } from "node:util";

import {
  asConvergedCommandError,
  emitConvergedFromWorkspace,
  type EmitConvergedResult
} from "../../../core/agent/converged.js";

export interface ConvergedCommandOptions {
  summary: string;
  refs: string[];
  help: false;
}

export interface ConvergedHelpCommandOptions {
  refs: string[];
  help: true;
}

export type ParsedConvergedCommandOptions =
  | ConvergedCommandOptions
  | ConvergedHelpCommandOptions;

export function getConvergedHelpText(): string {
  return [
    "Usage:",
    '  pairflow converged --summary "<text>" [--ref <artifact-path>]...',
    "",
    "Options:",
    "  --summary <text>      Required convergence summary",
    "  --ref <path>          Optional artifact reference (repeatable)",
    "  -h, --help            Show this help"
  ].join("\n");
}

export function parseConvergedCommandOptions(
  args: string[]
): ParsedConvergedCommandOptions {
  const parsed = parseArgs({
    args,
    options: {
      summary: {
        type: "string"
      },
      ref: {
        type: "string",
        multiple: true
      },
      help: {
        type: "boolean",
        short: "h"
      }
    },
    strict: true,
    allowPositionals: false
  });

  const refs = parsed.values.ref ?? [];
  const help = parsed.values.help ?? false;
  if (help) {
    return {
      refs,
      help: true
    };
  }

  const summary = parsed.values.summary;
  if (summary === undefined) {
    throw new Error("Missing required option: --summary");
  }

  return {
    summary,
    refs,
    help: false
  };
}

export async function runConvergedCommand(
  args: string[],
  cwd: string = process.cwd()
): Promise<EmitConvergedResult | null> {
  const options = parseConvergedCommandOptions(args);
  if (options.help) {
    return null;
  }

  try {
    return await emitConvergedFromWorkspace({
      summary: options.summary,
      refs: options.refs,
      cwd
    });
  } catch (error) {
    asConvergedCommandError(error);
  }
}
