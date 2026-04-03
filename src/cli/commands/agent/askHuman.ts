import { parseArgs } from "node:util";

import {
  asAskHumanCommandErrorV11 as asAskHumanCommandError,
  type EmitAskHumanV11Result as EmitAskHumanResult
} from "../../../v11/application/askHuman/emitAskHumanV11.js";
import {
  buildLegacyActorCommandRemovedError,
  isLegacyActorCommandHelpRequest
} from "./legacyActorCommandRemoval.js";

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
    '  pairflow agent emit --kind human_question --repo <path> --bubble-id <id> --handoff-id <id> --question "<text>" [--ref <artifact-path>]...',
    "  Removed legacy alias:",
    "  pairflow ask-human",
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

export function runAskHumanCommand(
  args: string[],
  cwd: string = process.cwd()
): Promise<EmitAskHumanResult | null> {
  try {
    void cwd;
    if (isLegacyActorCommandHelpRequest(args)) {
      return Promise.resolve(null);
    }
    throw buildLegacyActorCommandRemovedError({
      command: "ask-human",
      canonicalCommand:
        "pairflow agent emit --kind human_question --repo <repo> --bubble-id <id> --handoff-id <handoff-id> --question <text>"
    });
  } catch (error) {
    asAskHumanCommandError(error);
  }
}
