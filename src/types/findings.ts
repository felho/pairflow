export const findingSeverities = ["P0", "P1", "P2", "P3"] as const;

export type FindingSeverity = (typeof findingSeverities)[number];

export interface Finding {
  severity: FindingSeverity;
  title: string;
  detail?: string;
  code?: string;
  refs?: string[];
}

export function isFindingSeverity(value: unknown): value is FindingSeverity {
  return (
    typeof value === "string" &&
    (findingSeverities as readonly string[]).includes(value)
  );
}
