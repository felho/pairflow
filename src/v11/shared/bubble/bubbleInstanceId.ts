import { randomBytes } from "node:crypto";

const bubbleInstanceIdPattern =
  /^[A-Za-z0-9][A-Za-z0-9_-]{9,127}$/u;

export function isBubbleInstanceId(value: unknown): value is string {
  return typeof value === "string" && bubbleInstanceIdPattern.test(value);
}

export function generateBubbleInstanceId(now: Date = new Date()): string {
  // Time-prefixed opaque identifier for stable cross-lifecycle analytics joins.
  const timestamp = now.getTime().toString(36).padStart(10, "0");
  const entropy = randomBytes(10).toString("hex");
  return `bi_${timestamp}_${entropy}`;
}
