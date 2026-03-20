import { buildBoundaryCheckReport } from "./boundary.js";
import { buildComplexityCheckReport } from "./complexity.js";
import { buildCriticalSideEffectCheckReport } from "./critical-side-effect.js";
import { buildDependencyCheckReport } from "./dependency.js";
import { buildErrorCheckReport } from "./error.js";
import { buildMutationCheckReport } from "./mutation.js";
import { createNotImplementedCheckReport } from "./not-implemented.js";
import { buildTransitionCheckReport } from "./transition.js";

import type { FitnessPolicy, FitnessPolicyCheck, FitnessReportCheck } from "../types.js";

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
  if (check.id === "boundary") {
    return buildBoundaryCheckReport({
      check,
      repoRoot,
      fallbackMode
    });
  }
  if (check.id === "transition") {
    return buildTransitionCheckReport({
      check,
      repoRoot,
      fallbackMode
    });
  }
  if (check.id === "mutation") {
    return buildMutationCheckReport({
      check,
      repoRoot,
      fallbackMode
    });
  }
  if (check.id === "error") {
    return buildErrorCheckReport({
      check,
      repoRoot,
      fallbackMode
    });
  }
  if (check.id === "complexity") {
    return buildComplexityCheckReport({
      check,
      repoRoot,
      fallbackMode
    });
  }
  if (check.id === "dependency") {
    return buildDependencyCheckReport({
      check,
      repoRoot,
      fallbackMode,
      currentMilestone
    });
  }
  if (check.id === "critical_side_effect") {
    return buildCriticalSideEffectCheckReport({
      check,
      repoRoot,
      fallbackMode
    });
  }
  return createNotImplementedCheckReport(check, fallbackMode);
}

export async function buildReportChecks(
  policy: FitnessPolicy,
  repoRoot: string
): Promise<FitnessReportCheck[]> {
  const fallbackMode = policy.defaults?.mode ?? "report-only";
  const currentMilestone = policy.defaults?.current_milestone;
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
