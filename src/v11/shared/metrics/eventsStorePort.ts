import type { PairflowMetricsEvent } from "../../../types/metrics.js";

import type { MetricsShardPath } from "./events.js";

export interface AppendMetricsEventInput {
  event: PairflowMetricsEvent;
  rootPath?: string;
  lockTimeoutMs?: number;
  // Metrics-layer name; forwarded to withFileLock's staleAfterMs option.
  staleLockRecoveryAfterMs?: number | null;
}

export interface AppendMetricsEventResult {
  event: PairflowMetricsEvent;
  shardPath: MetricsShardPath;
}

export type AppendMetricsEventPort = (
  input: AppendMetricsEventInput
) => Promise<AppendMetricsEventResult>;
