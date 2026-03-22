import { parseArgs } from "node:util";

import {
  asConvergedCommandErrorV11 as asConvergedCommandError,
  emitConvergedFromWorkspaceV11 as emitConvergedFromWorkspace,
  type EmitConvergedV11Result as EmitConvergedResult
} from "../../../v11/application/converged/emitConvergedV11.js";
import type {
  ConvergedStructuredFinding
} from "../../../v11/shared/converged/convergedCommandTypes.js";
import {
  isConvergedStructuredFindingSeverity
} from "../../../v11/shared/converged/convergedCommandTypes.js";
import {
  convergedBlockerFindingsForbiddenReasonCode,
  convergedFindingsInvalidReasonCode,
  convergedOptionsInvalidReasonCode,
  convergedSummaryFindingsContradictionReasonCode
} from "../../../v11/shared/converged/convergedCommandReasonCodes.js";
import {
  CliFindingParseError,
  parseCliFinding
} from "./shared/findingParser.js";
import {
  resolveConvergedSummaryFindingsContradiction
} from "../../../core/convergence/policy.js";

export interface ConvergedCommandOptions {
  summary: string;
  refs: string[];
  findings: ConvergedStructuredFinding[];
  help: false;
}

export interface ConvergedHelpCommandOptions {
  refs: string[];
  help: true;
}

export type ParsedConvergedCommandOptions =
  | ConvergedCommandOptions
  | ConvergedHelpCommandOptions;

const convergedParseOptions = {
  summary: {
    type: "string"
  },
  ref: {
    type: "string",
    multiple: true
  },
  finding: {
    type: "string",
    multiple: true
  },
  help: {
    type: "boolean",
    short: "h"
  }
} as const;

function buildConvergedValidationError(
  reasonCode: string,
  message: string
): Error {
  return new Error(`${reasonCode}: ${message}`);
}

function parseConvergedFindings(rawFindings: string[]): ConvergedStructuredFinding[] {
  return rawFindings.map((rawFinding) => {
    let parsedFinding: ReturnType<typeof parseCliFinding>;
    try {
      parsedFinding = parseCliFinding(rawFinding);
    } catch (error) {
      if (error instanceof CliFindingParseError) {
        throw buildConvergedValidationError(
          convergedFindingsInvalidReasonCode,
          error.message
        );
      }
      throw error;
    }
    if (!isConvergedStructuredFindingSeverity(parsedFinding.severity)) {
      throw buildConvergedValidationError(
        convergedBlockerFindingsForbiddenReasonCode,
        "Converged --finding supports only P2/P3 severities."
      );
    }

    return {
      severity: parsedFinding.severity,
      title: parsedFinding.title,
      ...(parsedFinding.refs !== undefined ? { refs: parsedFinding.refs } : {})
    };
  });
}

function assertConvergedSummaryFindingsConsistency(input: {
  summary: string;
  findings: ConvergedStructuredFinding[];
}): void {
  const contradiction = resolveConvergedSummaryFindingsContradiction({
    summary: input.summary,
    hasFindings: input.findings.length > 0
  });
  if (contradiction === "summary_open_without_findings") {
    throw buildConvergedValidationError(
      convergedSummaryFindingsContradictionReasonCode,
      "Summary indicates open findings but no structured --finding entries were provided."
    );
  }
  if (contradiction === "summary_clean_with_findings") {
    throw buildConvergedValidationError(
      convergedSummaryFindingsContradictionReasonCode,
      "Summary declares clean/no-findings while structured --finding entries are present."
    );
  }
}

export function getConvergedHelpText(): string {
  return [
    "Usage:",
    '  pairflow converged --summary "<text>" [--ref <artifact-path>]... [--finding <P2|P3:Title[|ref1,ref2]>]...',
    "",
    "Options:",
    "  --summary <text>      Required convergence summary",
    "  --ref <path>          Optional artifact reference (repeatable)",
    "  --finding <value>     Structured finding, format: P2|P3:Title[|ref1,ref2] (repeatable)",
    "                        Single ref accepts any non-empty token; multi-ref requires structured path/URI refs.",
    "                        If a single ref contains a comma, escape it as \\,.",
    "                        Reviewer clean/non-blocking outcomes at/after `severity_gate_round` should use this command.",
    "                        Converged rejects P0/P1 findings fail-closed (reason_code=CONVERGED_BLOCKER_FINDINGS_FORBIDDEN).",
    "  -h, --help            Show this help"
  ].join("\n");
}

export function parseConvergedCommandOptions(
  args: string[]
): ParsedConvergedCommandOptions {
  const parsed = parseConvergedArgs(args);
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
    throw buildConvergedValidationError(
      convergedOptionsInvalidReasonCode,
      "Missing required option: --summary"
    );
  }

  const findings = parseConvergedFindings(parsed.values.finding ?? []);
  assertConvergedSummaryFindingsConsistency({
    summary,
    findings
  });

  return {
    summary,
    refs,
    findings,
    help: false
  };
}

function parseConvergedArgs(args: string[]) {
  try {
    return parseArgs({
      args,
      options: convergedParseOptions,
      strict: true,
      allowPositionals: false
    });
  } catch (error) {
    if (error instanceof Error) {
      throw buildConvergedValidationError(
        convergedOptionsInvalidReasonCode,
        error.message
      );
    }
    throw error;
  }
}

export async function runConvergedCommand(
  args: string[],
  cwd: string = process.cwd()
): Promise<EmitConvergedResult | null> {
  try {
    const options = parseConvergedCommandOptions(args);
    if (options.help) {
      return null;
    }

    return await emitConvergedFromWorkspace({
      summary: options.summary,
      refs: options.refs,
      ...(options.findings.length > 0 ? { findings: options.findings } : {}),
      cwd
    });
  } catch (error) {
    asConvergedCommandError(error);
  }
}
