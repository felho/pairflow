import { parseArgs } from "node:util";

import {
  asPassCommandErrorV11 as asPassCommandError,
  type EmitPassV11Result as EmitPassResult
} from "../../../v11/application/pass/emitPassV11.js";
import { CliFindingParseError, parseCliFinding } from "./shared/findingParser.js";
import { isPassIntent, type PassIntent } from "../../../types/protocol.js";
import {
  type Finding,
  type FindingLayer,
  type FindingTiming
} from "../../../types/findings.js";
import {
  buildLegacyActorCommandRemovedError,
  isLegacyActorCommandHelpRequest
} from "./legacyActorCommandRemoval.js";

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

const shorthandFindingDefaultTiming: FindingTiming = "later-hardening";
const shorthandFindingDefaultLayer: FindingLayer = "L1";
const passOptionsInvalidReasonCode = "PASS_OPTIONS_INVALID";
const passFindingsInvalidReasonCode = "PASS_FINDINGS_INVALID";

const passParseOptions = {
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
} as const;

export function getPassHelpText(): string {
  return [
    "Usage:",
    '  pairflow agent emit --kind pass --repo <path> --bubble-id <id> --handoff-id <id> --execution-id <id> --summary "<text>" [--ref <artifact-path>]... [--intent <task|review|fix_request>] [--finding <P0|P1|P2|P3:Title[|ref1,ref2]>]... [--no-findings]',
    "  Removed legacy alias:",
    "  pairflow pass",
    "",
    "Options:",
    "  --summary <text>      Required handoff summary",
    "  --ref <path>          Optional artifact reference (repeatable; does not satisfy P0/P1 finding evidence binding by itself)",
    "  --intent <value>      Optional intent override: task|review|fix_request",
    "  --finding <value>     Reviewer finding, format: P0|P1|P2|P3:Title[|ref1,ref2] (repeatable)",
    "                        Single ref accepts any non-empty token; multi-ref requires structured path/URI refs.",
    "                        If a single ref contains a comma, escape it as \\,.",
    `                        Shorthand defaults: timing=${shorthandFindingDefaultTiming}, layer=${shorthandFindingDefaultLayer}. CLI --finding cannot encode explicit \`timing\`/\`layer\` values; unqualified P0/P1 remain advisory for post-gate routing.`,
    "  --no-findings         Reviewer explicit clean pass (no open findings)",
    "                        Note: at/after `severity_gate_round`, reviewer PASS requires blocker findings under scope policy.",
    "  -h, --help            Show this help"
  ].join("\n");
}

export function parsePassCommandOptions(args: string[]): ParsedPassCommandOptions {
  const parsed = parsePassArgs(args);

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
    throw new Error(
      `${passOptionsInvalidReasonCode}: Missing required option: --summary`
    );
  }
  const findingsRaw = parsed.values.finding ?? [];
  const findings = findingsRaw.map<Finding>((rawFinding) => {
    try {
      const parsedFinding = parseCliFinding(rawFinding);
      return {
        priority: parsedFinding.severity,
        severity: parsedFinding.severity,
        title: parsedFinding.title,
        timing: shorthandFindingDefaultTiming,
        layer: shorthandFindingDefaultLayer,
        ...(parsedFinding.refs !== undefined ? { refs: parsedFinding.refs } : {})
      };
    } catch (error) {
      if (error instanceof CliFindingParseError) {
        throw new Error(`${passFindingsInvalidReasonCode}: ${error.message}`);
      }
      throw error;
    }
  });
  const noFindings = parsed.values["no-findings"] ?? false;

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
        `${passOptionsInvalidReasonCode}: Invalid --intent value. Use one of: task, review, fix_request.`
      );
    }
    options.intent = parsed.values.intent;
  }

  return options;
}

function parsePassArgs(args: string[]) {
  try {
    return parseArgs({
      args,
      options: passParseOptions,
      strict: true,
      allowPositionals: false
    });
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`${passOptionsInvalidReasonCode}: ${error.message}`);
    }
    throw error;
  }
}

export function runPassCommand(
  args: string[],
  cwd: string = process.cwd()
): Promise<EmitPassResult | null> {
  try {
    void cwd;
    if (isLegacyActorCommandHelpRequest(args)) {
      return Promise.resolve(null);
    }
    throw buildLegacyActorCommandRemovedError({
      command: "pass",
      canonicalCommand:
        "pairflow agent emit --kind pass --repo <repo> --bubble-id <id> --handoff-id <handoff-id> --execution-id <execution-id> --summary <text>"
    });
  } catch (error) {
    asPassCommandError(error);
  }
}
