import { buildBoundaryCheckReport } from "./boundary.js";
import { buildComplexityCheckReport } from "./complexity.js";
import { buildContractTimeoutPolicyCheckReport } from "./contract-timeout-policy.js";
import { buildCriticalSideEffectCheckReport } from "./critical-side-effect.js";
import { buildDependencyCheckReport } from "./dependency.js";
import { buildErrorCheckReport } from "./error.js";
import { buildMutationCheckReport } from "./mutation.js";
import { createNotImplementedCheckReport } from "./not-implemented.js";
import { buildTransitionCheckReport } from "./transition.js";
import { buildUiContractBoundaryCheckReport } from "./ui-contract-boundary.js";

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
  const effectiveCheck: FitnessPolicyCheck = {
    ...check,
    mode: check.mode ?? fallbackMode
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
  if (effectiveCheck.id === "contract_timeout_policy") {
    return buildContractTimeoutPolicyCheckReport({
      check: effectiveCheck,
      repoRoot,
      fallbackMode
    });
  }
  if (effectiveCheck.id === "dependency") {
    return buildDependencyCheckReport({
      check: effectiveCheck,
      repoRoot,
      fallbackMode
    });
  }
  if (effectiveCheck.id === "critical_side_effect") {
    return buildCriticalSideEffectCheckReport({
      check: effectiveCheck,
      repoRoot,
      fallbackMode
    });
  }
  if (effectiveCheck.id === "ui_contract_boundary") {
    return buildUiContractBoundaryCheckReport({
      check: effectiveCheck,
      repoRoot,
      fallbackMode
    });
  }
  return createNotImplementedCheckReport(effectiveCheck, fallbackMode);
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
