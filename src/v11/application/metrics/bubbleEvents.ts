import type {
  EmitBubbleLifecycleEventBestEffortInput,
  EmitBubbleLifecycleEventBestEffortPort,
  EmitBubbleLifecycleEventInput
} from "../../shared/metrics/bubbleEvents.js";
import type { AppendMetricsEventResult } from "../../shared/metrics/eventsStorePort.js";

export interface BubbleLifecycleEventEmitter {
  emitBubbleLifecycleEvent: (
    input: EmitBubbleLifecycleEventInput
  ) => Promise<AppendMetricsEventResult>;
  emitBubbleLifecycleEventBestEffort: EmitBubbleLifecycleEventBestEffortPort;
}

let configuredBubbleLifecycleEventEmitter:
  | BubbleLifecycleEventEmitter
  | undefined;

export function configureBubbleLifecycleEventEmitter(
  emitter: BubbleLifecycleEventEmitter
): void {
  configuredBubbleLifecycleEventEmitter = emitter;
}

export function resetBubbleLifecycleEventEmitterForTests(): void {
  configuredBubbleLifecycleEventEmitter = undefined;
}

export function emitBubbleLifecycleEvent(
  input: EmitBubbleLifecycleEventInput
): Promise<AppendMetricsEventResult> {
  if (configuredBubbleLifecycleEventEmitter === undefined) {
    return Promise.reject(
      new Error(
        `METRICS_EMITTER_UNCONFIGURED: bubble lifecycle metrics emitter was not configured for ${input.bubbleId}.`
      )
    );
  }
  return configuredBubbleLifecycleEventEmitter.emitBubbleLifecycleEvent(input);
}

export function emitBubbleLifecycleEventBestEffort(
  input: EmitBubbleLifecycleEventBestEffortInput
): Promise<void> {
  if (configuredBubbleLifecycleEventEmitter === undefined) {
    input.reportWarning?.(
      `Pairflow warning: bubble lifecycle metrics emitter was not configured for ${input.bubbleId}.`
    );
    return Promise.resolve(undefined);
  }
  return configuredBubbleLifecycleEventEmitter.emitBubbleLifecycleEventBestEffort(input);
}
