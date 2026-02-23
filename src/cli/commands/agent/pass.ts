import { parseArgs } from "node:util";

import {
  asPassCommandError,
  emitPassFromWorkspace,
  type EmitPassResult
} from "../../../core/agent/pass.js";
import { isPassIntent, type PassIntent } from "../../../types/protocol.js";
import { isFindingSeverity, type Finding } from "../../../types/findings.js";

export interface PassCommandOptions {
  summary: string;
  refs: string[];
  intent?: PassIntent;
  findings: Finding[];
  noFindings: boolean;
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
    '  pairflow pass --summary "<text>" [--ref <artifact-path>]... [--intent <task|review|fix_request>] [--finding <P0|P1|P2|P3:Title>]... [--no-findings]',
    "",
    "Options:",
    "  --summary <text>      Required handoff summary",
    "  --ref <path>          Optional artifact reference (repeatable)",
    "  --intent <value>      Optional intent override: task|review|fix_request",
    "  --finding <value>     Reviewer finding, format: P0|P1|P2|P3:Title (repeatable)",
    "  --no-findings         Reviewer explicit clean pass (no open findings)",
    "  -h, --help            Show this help"
  ].join("\n");
}

function parseFinding(raw: string): Finding {
  const trimmed = raw.trim();
  const separatorIndex = trimmed.indexOf(":");
  if (separatorIndex <= 0 || separatorIndex === trimmed.length - 1) {
    throw new Error(
      "Invalid --finding format. Use: <P0|P1|P2|P3:Title>."
    );
  }

  const severity = trimmed.slice(0, separatorIndex).trim();
  const title = trimmed.slice(separatorIndex + 1).trim();
  if (!isFindingSeverity(severity)) {
    throw new Error(
      "Invalid --finding severity. Use one of: P0, P1, P2, P3."
    );
  }
  if (title.length === 0) {
    throw new Error("Invalid --finding title. Title cannot be empty.");
  }

  return {
    severity,
    title
  };
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
      finding: {
        type: "string",
        multiple: true
      },
      "no-findings": {
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

  const refs = parsed.values.ref ?? [];
  const findingsRaw = parsed.values.finding ?? [];
  const findings = findingsRaw.map(parseFinding);
  const noFindings = parsed.values["no-findings"] ?? false;
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
    findings,
    noFindings,
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
      ...(options.findings.length > 0 ? { findings: options.findings } : {}),
      ...(options.noFindings ? { noFindings: true } : {}),
      cwd
    });
  } catch (error) {
    asPassCommandError(error);
  }
}
