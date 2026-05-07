import { randomUUID } from "node:crypto";

import {
  deriveQueuedDeferredReworkIntentState,
  type DeriveQueuedDeferredReworkIntentStateInput,
  type QueueDeferredReworkIntentResult
} from "../../domain/state/reworkIntent.js";

export interface QueueDeferredReworkIntentInput
  extends Omit<
    DeriveQueuedDeferredReworkIntentStateInput,
    "intentId" | "requestedAt"
  > {
  now: Date;
}

function createIntentId(): string {
  return `intent_${randomUUID()}`;
}

export function queueDeferredReworkIntent(
  input: QueueDeferredReworkIntentInput
): QueueDeferredReworkIntentResult {
  return deriveQueuedDeferredReworkIntentState({
    state: input.state,
    intentId: createIntentId(),
    message: input.message,
    ...(input.refs !== undefined ? { refs: input.refs } : {}),
    requestedBy: input.requestedBy,
    requestedAt: input.now.toISOString()
  });
}

export type { QueueDeferredReworkIntentResult };
