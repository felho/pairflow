import { parseArgs } from "node:util";

import {
  asPassCommandError,
  emitPassFromWorkspace,
  type EmitPassResult
} from "../../../core/agent/pass.js";
import { isPassIntent, type PassIntent } from "../../../types/protocol.js";

export interface PassCommandOptions {
  summary: string;
  refs: string[];
  intent?: PassIntent;
  help: false;
}

export interface PassHelpCommandOptions {
  refs: string[];
  help: true;
}

export type ParsedPassCommandOptions = PassCommandOptions | PassHelpCommandOptions;

export function getPassHelpText(): string {
  return [
    "Usage:",
    '  pairflow pass --summary "<text>" [--ref <artifact-path>]... [--intent <task|review|fix_request>]',
    "",
    "Options:",
    "  --summary <text>      Required handoff summary",
    "  --ref <path>          Optional artifact reference (repeatable)",
    "  --intent <value>      Optional intent override: task|review|fix_request",
    "  -h, --help            Show this help"
  ].join("\n");
}

export function parsePassCommandOptions(args: string[]): ParsedPassCommandOptions {
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
      intent: {
        type: "string"
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

  const options: PassCommandOptions = {
    summary,
    refs,
    help: false
  };

  if (parsed.values.intent !== undefined) {
    if (!isPassIntent(parsed.values.intent)) {
      throw new Error(
        "Invalid --intent value. Use one of: task, review, fix_request."
      );
    }
    options.intent = parsed.values.intent;
  }

  return options;
}

export async function runPassCommand(
  args: string[],
  cwd: string = process.cwd()
): Promise<EmitPassResult | null> {
  const options = parsePassCommandOptions(args);
  if (options.help) {
    return null;
  }

  try {
    return await emitPassFromWorkspace({
      summary: options.summary,
      refs: options.refs,
      ...(options.intent !== undefined ? { intent: options.intent } : {}),
      cwd
    });
  } catch (error) {
    asPassCommandError(error);
  }
}
