import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const previousMetricsRoot = process.env.PAIRFLOW_METRICS_EVENTS_ROOT;
const workerMetricsRoot = mkdtempSync(
  join(tmpdir(), "pairflow-metrics-events-vitest-")
);

process.env.PAIRFLOW_METRICS_EVENTS_ROOT = workerMetricsRoot;

process.on("exit", () => {
  rmSync(workerMetricsRoot, { recursive: true, force: true });

  if (previousMetricsRoot === undefined) {
    delete process.env.PAIRFLOW_METRICS_EVENTS_ROOT;
    return;
  }

  process.env.PAIRFLOW_METRICS_EVENTS_ROOT = previousMetricsRoot;
});
