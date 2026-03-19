import type { FitnessPolicyCheck, FitnessReportCheck } from "../types.js";

export function createNotImplementedCheckReport(
  check: FitnessPolicyCheck,
  fallbackMode: string
): FitnessReportCheck {
  return {
    id: check.id,
    owner: check.owner ?? "unknown",
    mode: check.mode ?? fallbackMode,
    status: "not_implemented",
    summary: "Skeleton report item; metric runner is not wired yet.",
    metric: check.metric,
    details: undefined
  };
}
