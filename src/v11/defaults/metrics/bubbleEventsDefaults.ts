import { normalizeRepoPath } from "../../infrastructure/executor/workspace/repoResolution.js";
import type { AppendMetricsEventPort } from "../../shared/metrics/eventsStorePort.js";

let defaultMetricsEventStorePortPromise: Promise<AppendMetricsEventPort> | null =
  null;

export async function resolveDefaultMetricsEventStorePort(): Promise<AppendMetricsEventPort> {
  if (defaultMetricsEventStorePortPromise === null) {
    defaultMetricsEventStorePortPromise = import(
      "../../infrastructure/artifact/metrics/eventsStore.js"
    ).then((module) => module.appendMetricsEvent);
  }

  return defaultMetricsEventStorePortPromise;
}

export const bubbleEventsDefaults = {
  normalizeRepoPath,
  resolveDefaultMetricsEventStorePort
} as const;
