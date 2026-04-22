import { randomBytes } from "node:crypto";

const bubbleInstanceIdPattern =
  /^[A-Za-z0-9][A-Za-z0-9_-]{9,127}$/u;

export function isBubbleInstanceId(value: unknown): value is string {
  return typeof value === "string" && bubbleInstanceIdPattern.test(value);
}

export function inferBubbleStartedAtFromInstanceId(
  bubbleInstanceId: string | undefined
): string | null {
  if (bubbleInstanceId === undefined) {
    return null;
  }

  const segments = bubbleInstanceId.split("_");
  if (segments.length < 3 || segments[0] !== "bi") {
    return null;
  }

  const encodedTimestamp = segments[1];
  if (encodedTimestamp === undefined || !/^[0-9a-z]+$/u.test(encodedTimestamp)) {
    return null;
  }

  const timestampMs = Number.parseInt(encodedTimestamp, 36);
  if (!Number.isSafeInteger(timestampMs) || timestampMs < 0) {
    return null;
  }

  const startedAt = new Date(timestampMs);
  if (Number.isNaN(startedAt.getTime())) {
    return null;
  }

  return startedAt.toISOString();
}

export function generateBubbleInstanceId(now: Date = new Date()): string {
  // Time-prefixed opaque identifier for stable cross-lifecycle analytics joins.
  const timestamp = now.getTime().toString(36).padStart(10, "0");
  const entropy = randomBytes(10).toString("hex");
  return `bi_${timestamp}_${entropy}`;
}
