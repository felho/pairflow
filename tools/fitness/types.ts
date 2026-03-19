export interface FitnessPolicyException {
  id: string;
  kind: string;
  owner: string;
  reason: string;
  expires_milestone: string;
  from: string | undefined;
  to: string | undefined;
  paths: string[] | undefined;
}

export interface FitnessPolicyCheck {
  id: string;
  metric: string;
  mode: string | undefined;
  owner: string | undefined;
  scope: string[] | undefined;
  exceptions: FitnessPolicyException[] | undefined;
}

export interface FitnessPolicy {
  defaults:
    | {
        mode: string | undefined;
        current_milestone: string | undefined;
      }
    | undefined;
  checks: FitnessPolicyCheck[];
}

export interface FitnessReportCheck {
  id: string;
  owner: string;
  mode: string;
  status: "not_implemented" | "pass" | "warn" | "fail";
  summary: string;
  metric: string;
  details: string[] | undefined;
}

export interface FitnessReport {
  version: number;
  created_at: string;
  policy_path: string;
  checks: FitnessReportCheck[];
}
