import { normalizeRepoPath } from "../bubble/repoResolution.js";
import { resolveDefaultMetricsEventStorePort } from "./events.js";

export const bubbleEventsDefaults = {
  normalizeRepoPath,
  resolveDefaultMetricsEventStorePort
} as const;
