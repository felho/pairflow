import {
  normalizeStringList,
  requireNonEmptyString
} from "../../../core/util/normalize.js";
import { isLikelyStructuredRef } from "../../../core/util/structuredRef.js";
import {
  resolveConvergedSummaryFindingsContradiction
} from "../../../core/convergence/policy.js";
import { isFindingSeverity } from "../../../types/findings.js";
import type { ConvergedStructuredFinding } from "./convergedCommandTypes.js";
import { isConvergedStructuredFindingSeverity } from "./convergedCommandTypes.js";
import {
  convergedBlockerFindingsForbiddenReasonCode,
  convergedFindingsInvalidReasonCode,
  convergedSummaryFindingsContradictionReasonCode
} from "./convergedCommandReasonCodes.js";

export interface NormalizeConvergedCommandInputInput {
  summary: string;
  refs?: string[] | undefined;
  findings?: ConvergedStructuredFinding[] | undefined;
  now?: Date | undefined;
  createError: (message: string) => Error;
}

export interface NormalizedConvergedCommandInput {
  summary: string;
  refs: string[];
  findings: ConvergedStructuredFinding[];
  now: Date;
}

function normalizeConvergedFindings(
  findings: ConvergedStructuredFinding[] | undefined,
  createError: (message: string) => Error
): ConvergedStructuredFinding[] {
  if (findings === undefined) {
    return [];
  }
  return findings.map((finding) => {
    if (!isConvergedStructuredFindingSeverity(finding.severity)) {
      // Keep P0/P1 rejection reason-code parity with CLI parse path.
      if (
        isFindingSeverity(finding.severity)
        && (finding.severity === "P0" || finding.severity === "P1")
      ) {
        throw createError(
          `${convergedBlockerFindingsForbiddenReasonCode}: Converged findings reject P0/P1 severities. Use P2 or P3.`
        );
      }
      throw createError(
        `${convergedFindingsInvalidReasonCode}: Unsupported converged finding severity: ${String(finding.severity)}. Use P2 or P3.`
      );
    }
    const title = requireNonEmptyString(
      finding.title,
      "Converged finding title",
      createError
    );
    if (finding.refs?.some((value) => value.trim().length === 0)) {
      throw createError(
        `${convergedFindingsInvalidReasonCode}: Invalid converged finding refs. Empty ref tokens are not allowed.`
      );
    }
    // Keep CLI/programmatic parity by validating multi-ref structure before de-dup.
    const trimmedRefs = (finding.refs ?? []).map((value) => value.trim());
    if (trimmedRefs.length > 1 && trimmedRefs.some((value) => !isLikelyStructuredRef(value))) {
      throw createError(
        `${convergedFindingsInvalidReasonCode}: Invalid converged finding refs. Single ref accepts any non-empty token; multiple refs must each be path-like (\`.../...\`) or URI-like (\`scheme://...\`).`
      );
    }
    const refs = normalizeStringList(finding.refs ?? []);

    return {
      severity: finding.severity,
      title,
      ...(refs.length > 0 ? { refs } : {})
    };
  });
}

function assertConvergedSummaryFindingsConsistency(input: {
  summary: string;
  findings: ConvergedStructuredFinding[];
  createError: (message: string) => Error;
}): void {
  const contradiction = resolveConvergedSummaryFindingsContradiction({
    summary: input.summary,
    hasFindings: input.findings.length > 0
  });
  if (contradiction === "summary_open_without_findings") {
    throw input.createError(
      `${convergedSummaryFindingsContradictionReasonCode}: Summary indicates open findings but no structured findings were provided.`
    );
  }
  if (contradiction === "summary_clean_with_findings") {
    throw input.createError(
      `${convergedSummaryFindingsContradictionReasonCode}: Summary declares clean/no-findings while structured findings are present.`
    );
  }
}

export function normalizeConvergedCommandInput(
  input: NormalizeConvergedCommandInputInput
): NormalizedConvergedCommandInput {
  const summary = requireNonEmptyString(
    input.summary,
    "Convergence summary",
    input.createError
  );
  const findings = normalizeConvergedFindings(input.findings, input.createError);
  assertConvergedSummaryFindingsConsistency({
    summary,
    findings,
    createError: input.createError
  });

  return {
    summary,
    refs: normalizeStringList(input.refs ?? []),
    findings,
    now: input.now ?? new Date()
  };
}
