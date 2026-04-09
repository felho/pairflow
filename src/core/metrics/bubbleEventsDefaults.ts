import { normalizeRepoPath } from "../../v11/infrastructure/executor/workspace/repoResolution.js";
import { resolveDefaultMetricsEventStorePort } from "./events.js";

export const bubbleEventsDefaults = {
  normalizeRepoPath,
  resolveDefaultMetricsEventStorePort
} as const;
