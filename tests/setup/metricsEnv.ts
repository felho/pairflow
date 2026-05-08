import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { beforeEach } from "vitest";

import "../../src/v11/defaults/converged/convergedDependencyDefaults.js";
import "../../src/v11/defaults/pass/passValidationCommandDefaults.js";
import "../../src/v11/defaults/start/startBubbleDefaults.js";

const previousMetricsRoot = process.env.PAIRFLOW_METRICS_EVENTS_ROOT;
const workerMetricsRoot = mkdtempSync(
  join(tmpdir(), "pairflow-metrics-events-vitest-")
);

process.env.PAIRFLOW_METRICS_EVENTS_ROOT = workerMetricsRoot;

beforeEach(async () => {
  await import("../../src/v11/defaults/converged/convergedDependencyDefaults.js");
  await import("../../src/v11/defaults/pass/passValidationCommandDefaults.js");
  await import("../../src/v11/defaults/start/startBubbleDefaults.js");
});

process.on("exit", () => {
  rmSync(workerMetricsRoot, { recursive: true, force: true });

  if (previousMetricsRoot === undefined) {
    delete process.env.PAIRFLOW_METRICS_EVENTS_ROOT;
    return;
  }

  process.env.PAIRFLOW_METRICS_EVENTS_ROOT = previousMetricsRoot;
});
