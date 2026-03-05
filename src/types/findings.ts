export const findingPriorities = ["P0", "P1", "P2", "P3"] as const;
export const findingSeverities = findingPriorities;

export type FindingPriority = (typeof findingPriorities)[number];
export type FindingSeverity = FindingPriority;

export const findingTimings = ["required-now", "later-hardening"] as const;
export type FindingTiming = (typeof findingTimings)[number];

export const findingLayers = ["L0", "L1", "L2"] as const;
export type FindingLayer = (typeof findingLayers)[number];

export interface Finding {
  priority?: FindingPriority;
  severity?: FindingSeverity;
  title: string;
  timing?: FindingTiming;
  layer?: FindingLayer;
  evidence?: string | string[];
  detail?: string;
  code?: string;
  refs?: string[];
  effective_priority?: FindingPriority;
}

export function isFindingPriority(value: unknown): value is FindingPriority {
  return (
    typeof value === "string"
    && (findingPriorities as readonly string[]).includes(value)
  );
}

export function isFindingSeverity(value: unknown): value is FindingSeverity {
  return isFindingPriority(value);
}

export function isFindingTiming(value: unknown): value is FindingTiming {
  return (
    typeof value === "string"
    && (findingTimings as readonly string[]).includes(value)
  );
}

export function isFindingLayer(value: unknown): value is FindingLayer {
  return (
    typeof value === "string"
    && (findingLayers as readonly string[]).includes(value)
  );
}

export function resolveFindingPriority(
  finding: {
    priority?: unknown;
    severity?: unknown;
  }
): FindingPriority | undefined {
  if (isFindingPriority(finding.priority)) {
    return finding.priority;
  }
  if (isFindingSeverity(finding.severity)) {
    return finding.severity;
  }
  return undefined;
}
