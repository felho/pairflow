import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  MetricsReportDateRangeError,
  selectMetricsShards
} from "../../../../src/core/metrics/report/selectShards.js";

const tempDirs: string[] = [];

async function createTempRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "pairflow-metrics-report-shards-"));
  tempDirs.push(root);
  return root;
}

async function writeShard(root: string, year: string, month: string): Promise<string> {
  const dir = join(root, year, month);
  await mkdir(dir, { recursive: true });
  const path = join(dir, `events-${year}-${month}.ndjson`);
  await writeFile(path, "", "utf8");
  return path;
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((path) =>
      rm(path, {
        recursive: true,
        force: true
      })
    )
  );
});

describe("selectMetricsShards", () => {
  it("selects only existing monthly shards within range", async () => {
    const root = await createTempRoot();
    const jan = await writeShard(root, "2026", "01");
    const mar = await writeShard(root, "2026", "03");

    const result = await selectMetricsShards({
      from: new Date("2026-01-15T00:00:00.000Z"),
      to: new Date("2026-03-20T23:59:59.999Z"),
      rootPath: root
    });

    expect(result.metricsRootPath).toBe(root);
    expect(result.shardPaths).toEqual([jan, mar]);
  });

  it("throws when from is after to", async () => {
    await expect(
      selectMetricsShards({
        from: new Date("2026-03-01T00:00:00.000Z"),
        to: new Date("2026-02-01T00:00:00.000Z")
      })
    ).rejects.toBeInstanceOf(MetricsReportDateRangeError);
  });
});
