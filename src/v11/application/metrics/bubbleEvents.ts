import type {
  EmitBubbleLifecycleEventBestEffortInput,
  EmitBubbleLifecycleEventInput
} from "../../shared/metrics/bubbleEvents.js";
import type { AppendMetricsEventResult } from "../../shared/metrics/eventsStorePort.js";

interface BubbleEventsDefaultsModule {
  emitBubbleLifecycleEvent: (
    input: EmitBubbleLifecycleEventInput
  ) => Promise<AppendMetricsEventResult>;
  emitBubbleLifecycleEventBestEffort: (
    input: EmitBubbleLifecycleEventBestEffortInput
  ) => Promise<void>;
}

let bubbleEventsDefaultsModulePromise:
  | Promise<BubbleEventsDefaultsModule>
  | undefined;

function getBubbleEventsDefaultsModulePath(): string {
  return "../../defaults/metrics/bubbleEvents.js";
}

async function loadBubbleEventsDefaultsModule():
  Promise<BubbleEventsDefaultsModule> {
  bubbleEventsDefaultsModulePromise ??= import(
    getBubbleEventsDefaultsModulePath()
  ) as Promise<BubbleEventsDefaultsModule>;
  return bubbleEventsDefaultsModulePromise;
}

export async function emitBubbleLifecycleEvent(
  input: EmitBubbleLifecycleEventInput
): Promise<AppendMetricsEventResult> {
  const { emitBubbleLifecycleEvent: emitBubbleLifecycleEventDefault } =
    await loadBubbleEventsDefaultsModule();
  return emitBubbleLifecycleEventDefault(input);
}

export async function emitBubbleLifecycleEventBestEffort(
  input: EmitBubbleLifecycleEventBestEffortInput
): Promise<void> {
  const {
    emitBubbleLifecycleEventBestEffort: emitBubbleLifecycleEventBestEffortDefault
  } = await loadBubbleEventsDefaultsModule();
  return emitBubbleLifecycleEventBestEffortDefault(input);
}
