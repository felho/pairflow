import { buildBoundaryCheckReport } from "./boundary.js";
import { buildComplexityCheckReport } from "./complexity.js";
import { buildCriticalSideEffectCheckReport } from "./critical-side-effect.js";
import { buildDependencyCheckReport } from "./dependency.js";
import { buildErrorCheckReport } from "./error.js";
import { buildMutationCheckReport } from "./mutation.js";
import { createNotImplementedCheckReport } from "./not-implemented.js";
import { buildTransitionCheckReport } from "./transition.js";

import type { FitnessPolicy, FitnessPolicyCheck, FitnessReportCheck } from "../types.js";

function parseMilestoneOrdinal(raw: string): number | undefined {
  const normalized = raw.trim().toUpperCase();
  const match = normalized.match(/^M([0-9]+)$/u);
  if (match === null) {
    return undefined;
  }
  return Number.parseInt(match[1] ?? "", 10);
}

function normalizeMode(mode: string): string {
  const lowered = mode.trim().toLowerCase();
  if (lowered === "hard-fail") {
    return "hard-fail";
  }
  if (lowered === "soft-fail") {
    return "soft-fail";
  }
  return "report-only";
}

function resolveCheckModeByMilestone(input: {
  check: FitnessPolicyCheck;
  fallbackMode: string;
  currentMilestone: string | undefined;
}): string {
  const baseMode = normalizeMode(input.check.mode ?? input.fallbackMode);
  const overrides = input.check.mode_by_milestone;
  if (overrides === undefined || input.currentMilestone === undefined) {
    return baseMode;
  }
  const currentOrdinal = parseMilestoneOrdinal(input.currentMilestone);
  if (currentOrdinal === undefined) {
    return baseMode;
  }

  let winningMode: string | undefined;
  let winningOrdinal = Number.NEGATIVE_INFINITY;
  for (const [milestone, mode] of Object.entries(overrides)) {
    const milestoneOrdinal = parseMilestoneOrdinal(milestone);
    if (milestoneOrdinal === undefined || milestoneOrdinal > currentOrdinal) {
      continue;
    }
    if (milestoneOrdinal >= winningOrdinal) {
      winningOrdinal = milestoneOrdinal;
      winningMode = normalizeMode(mode);
    }
  }

  return winningMode ?? baseMode;
}

export async function buildCheckReport({
  check,
  repoRoot,
  fallbackMode,
  currentMilestone
}: {
  check: FitnessPolicyCheck;
  repoRoot: string;
  fallbackMode: string;
  currentMilestone: string | undefined;
}): Promise<FitnessReportCheck> {
  const effectiveCheck: FitnessPolicyCheck = {
    ...check,
    mode: resolveCheckModeByMilestone({
      check,
      fallbackMode,
      currentMilestone
    })
  };

  if (effectiveCheck.id === "boundary") {
    return buildBoundaryCheckReport({
      check: effectiveCheck,
      repoRoot,
      fallbackMode
    });
  }
  if (effectiveCheck.id === "transition") {
    return buildTransitionCheckReport({
      check: effectiveCheck,
      repoRoot,
      fallbackMode
    });
  }
  if (effectiveCheck.id === "mutation") {
    return buildMutationCheckReport({
      check: effectiveCheck,
      repoRoot,
      fallbackMode
    });
  }
  if (effectiveCheck.id === "error") {
    return buildErrorCheckReport({
      check: effectiveCheck,
      repoRoot,
      fallbackMode
    });
  }
  if (effectiveCheck.id === "complexity") {
    return buildComplexityCheckReport({
      check: effectiveCheck,
      repoRoot,
      fallbackMode
    });
  }
  if (effectiveCheck.id === "dependency") {
    return buildDependencyCheckReport({
      check: effectiveCheck,
      repoRoot,
      fallbackMode,
      currentMilestone
    });
  }
  if (effectiveCheck.id === "critical_side_effect") {
    return buildCriticalSideEffectCheckReport({
      check: effectiveCheck,
      repoRoot,
      fallbackMode
    });
  }
  return createNotImplementedCheckReport(effectiveCheck, fallbackMode);
}

export async function buildReportChecks(
  policy: FitnessPolicy,
  repoRoot: string,
  options?: {
    currentMilestoneOverride?: string | undefined;
  }
): Promise<FitnessReportCheck[]> {
  const fallbackMode = policy.defaults?.mode ?? "report-only";
  const currentMilestone =
    options?.currentMilestoneOverride ?? policy.defaults?.current_milestone;
  const checks = await Promise.all(
    policy.checks.map((check) =>
      buildCheckReport({
        check,
        repoRoot,
        fallbackMode,
        currentMilestone
      })
    )
  );
  return checks;
}
