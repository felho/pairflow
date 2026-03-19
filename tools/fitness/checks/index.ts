import { buildBoundaryCheckReport } from "./boundary.js";
import { buildMutationCheckReport } from "./mutation.js";
import { createNotImplementedCheckReport } from "./not-implemented.js";
import { buildTransitionCheckReport } from "./transition.js";

import type { FitnessPolicy, FitnessPolicyCheck, FitnessReportCheck } from "../types.js";

export async function buildCheckReport({
  check,
  repoRoot,
  fallbackMode
}: {
  check: FitnessPolicyCheck;
  repoRoot: string;
  fallbackMode: string;
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
  return createNotImplementedCheckReport(check, fallbackMode);
}

export async function buildReportChecks(
  policy: FitnessPolicy,
  repoRoot: string
): Promise<FitnessReportCheck[]> {
  const fallbackMode = policy.defaults?.mode ?? "report-only";
  const checks = await Promise.all(
    policy.checks.map((check) =>
      buildCheckReport({
        check,
        repoRoot,
        fallbackMode
      })
    )
  );
  return checks;
}
