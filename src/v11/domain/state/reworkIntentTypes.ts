export const reworkIntentStatuses = [
  "pending",
  "applied",
  "superseded"
] as const;

export type ReworkIntentStatus = (typeof reworkIntentStatuses)[number];

export interface BubbleReworkIntentRecord {
  intent_id: string;
  message: string;
  refs?: string[];
  requested_by: string;
  requested_at: string;
  status: ReworkIntentStatus;
  superseded_by_intent_id?: string;
}

export function isReworkIntentStatus(
  value: unknown
): value is ReworkIntentStatus {
  return (
    typeof value === "string" &&
    (reworkIntentStatuses as readonly string[]).includes(value)
  );
}
