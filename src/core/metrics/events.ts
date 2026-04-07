// Temporary bridge: canonical metrics event-builder ownership remains in
// `src/v11/shared/metrics/events.ts`, while the file-backed append/store owner
// moved to `src/v11/infrastructure/artifact/metrics/eventsStore.ts`. Remove this
// shim once legacy core imports are migrated.
import type { AppendMetricsEventPort } from "../../v11/shared/metrics/eventsStorePort.js";

let defaultMetricsEventStorePortPromise: Promise<AppendMetricsEventPort> | null =
  null;

export async function resolveDefaultMetricsEventStorePort(): Promise<AppendMetricsEventPort> {
  if (defaultMetricsEventStorePortPromise === null) {
    defaultMetricsEventStorePortPromise = import(
      "../../v11/infrastructure/artifact/metrics/eventsStore.js"
    ).then((module) => module.appendMetricsEvent);
  }

  return defaultMetricsEventStorePortPromise;
}

export * from "../../v11/shared/metrics/events.js";
export * from "../../v11/infrastructure/artifact/metrics/eventsStore.js";
