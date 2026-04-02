import { parseArgs } from "node:util";

import {
  asAskHumanCommandErrorV11 as asAskHumanCommandError,
  type EmitAskHumanV11Result as EmitAskHumanResult
} from "../../../v11/application/askHuman/emitAskHumanV11.js";
import {
  resolveCompatActorEmitContextFromWorkspace
} from "../../../core/bubble/actorEmitContext.js";
import { emitActorProtocolFromWorkspaceV11 } from "../../../v11/application/actorProtocol/emitActorProtocolV11.js";

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
    "  Compatibility adapter:",
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
    const context = await resolveCompatActorEmitContextFromWorkspace(cwd);
    const result = await emitActorProtocolFromWorkspaceV11({
      input: {
        kind: "human_question",
        repo: context.repo,
        bubble_id: context.bubble_id,
        handoff_id: context.handoff_id,
        refs: options.refs,
        expected_role: context.expected_role,
        expected_round: context.expected_round,
        expected_state_fingerprint: context.expected_state_fingerprint,
        question: options.question
      },
      authoritativeContext: context
    });
    if (result.kind !== "human_question") {
      throw new Error(
        "ACTOR_EMIT_RESULT_KIND_INVALID: expected human_question result."
      );
    }
    return result.human_question;
  } catch (error) {
    asAskHumanCommandError(error);
  }
}
