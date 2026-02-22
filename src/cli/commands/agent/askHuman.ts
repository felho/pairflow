import { parseArgs } from "node:util";

import {
  asAskHumanCommandError,
  emitAskHumanFromWorkspace,
  type EmitAskHumanResult
} from "../../../core/agent/askHuman.js";

export interface AskHumanCommandOptions {
  question: string;
  refs: string[];
  help: false;
}

export interface AskHumanHelpCommandOptions {
  refs: string[];
  help: true;
}

export type ParsedAskHumanCommandOptions =
  | AskHumanCommandOptions
  | AskHumanHelpCommandOptions;

export function getAskHumanHelpText(): string {
  return [
    "Usage:",
    '  pairflow ask-human --question "<text>" [--ref <artifact-path>]...',
    "",
    "Options:",
    "  --question <text>     Required human question",
    "  --ref <path>          Optional artifact reference (repeatable)",
    "  -h, --help            Show this help"
  ].join("\n");
}

export function parseAskHumanCommandOptions(
  args: string[]
): ParsedAskHumanCommandOptions {
  const parsed = parseArgs({
    args,
    options: {
      question: {
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

  const question = parsed.values.question;
  if (question === undefined) {
    throw new Error("Missing required option: --question");
  }

  return {
    question,
    refs,
    help: false
  };
}

export async function runAskHumanCommand(
  args: string[],
  cwd: string = process.cwd()
): Promise<EmitAskHumanResult | null> {
  const options = parseAskHumanCommandOptions(args);
  if (options.help) {
    return null;
  }

  try {
    return await emitAskHumanFromWorkspace({
      question: options.question,
      refs: options.refs,
      cwd
    });
  } catch (error) {
    asAskHumanCommandError(error);
  }
}
