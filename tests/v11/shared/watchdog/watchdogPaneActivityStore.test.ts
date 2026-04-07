import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  getWatchdogPaneActivityPath,
  readWatchdogPaneActivity,
  writeWatchdogPaneActivity
} from "../../../../src/v11/infrastructure/artifact/watchdog/watchdogPaneActivityStore.js";

const tempDirs: string[] = [];

async function createRuntimeDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "pairflow-watchdog-store-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((path) =>
      rm(path, { recursive: true, force: true })
    )
  );
});

describe("watchdogPaneActivityStore", () => {
  it("returns missing when no pane-activity file exists yet", async () => {
    const runtimeDir = await createRuntimeDir();

    await expect(
      readWatchdogPaneActivity({
        runtimeDir,
        bubbleId: "b_watchdog_store_missing"
      })
    ).resolves.toEqual({
      status: "missing"
    });
  });

  it("writes and reads a valid pane-activity record", async () => {
    const runtimeDir = await createRuntimeDir();

    const path = await writeWatchdogPaneActivity({
      runtimeDir,
      bubbleId: "b_watchdog_store_01",
      record: {
        bubble_id: "b_watchdog_store_01",
        sampled_at: "2026-03-27T19:00:00.000Z",
        pane_hash: "pane-hash-01",
        last_changed_at: "2026-03-27T18:55:00.000Z",
        session_name: "pf-watchdog-store",
        target_pane: "pf-watchdog-store:0.1",
        last_sample_status: "sampled"
      }
    });

    expect(path).toBe(
      getWatchdogPaneActivityPath(runtimeDir, "b_watchdog_store_01")
    );
    const raw = await readFile(path, "utf8");
    expect(raw).toContain("\"pane_hash\": \"pane-hash-01\"");

    const result = await readWatchdogPaneActivity({
      runtimeDir,
      bubbleId: "b_watchdog_store_01"
    });

    expect(result).toEqual({
      status: "ok",
      record: {
        bubble_id: "b_watchdog_store_01",
        sampled_at: "2026-03-27T19:00:00.000Z",
        pane_hash: "pane-hash-01",
        last_changed_at: "2026-03-27T18:55:00.000Z",
        session_name: "pf-watchdog-store",
        target_pane: "pf-watchdog-store:0.1",
        last_sample_status: "sampled"
      }
    });
  });

  it("returns invalid when JSON schema fields are malformed", async () => {
    const runtimeDir = await createRuntimeDir();
    const path = getWatchdogPaneActivityPath(runtimeDir, "b_watchdog_store_02");
    await mkdir(dirname(path), { recursive: true });
    await writeFile(
      path,
      `${JSON.stringify(
        {
          bubble_id: "b_watchdog_store_02",
          sampled_at: "2026-03-27T19:00:00.000Z",
          pane_hash: "pane-hash-02",
          last_changed_at: "2026-03-27T18:55:00.000Z",
          last_sample_status: "invalid-status"
        },
        null,
        2
      )}\n`,
      "utf8"
    );

    const result = await readWatchdogPaneActivity({
      runtimeDir,
      bubbleId: "b_watchdog_store_02"
    });

    expect(result.status).toBe("invalid");
    if (result.status !== "invalid") {
      return;
    }
    expect(result.error).toContain("last_sample_status");
  });

  it("returns invalid when the stored bubble_id does not match the requested bubble", async () => {
    const runtimeDir = await createRuntimeDir();
    const path = getWatchdogPaneActivityPath(runtimeDir, "b_watchdog_store_03");
    await mkdir(dirname(path), { recursive: true });
    await writeFile(
      path,
      `${JSON.stringify(
        {
          bubble_id: "b_watchdog_store_other",
          sampled_at: "2026-03-27T19:00:00.000Z",
          pane_hash: "pane-hash-03",
          last_changed_at: "2026-03-27T18:55:00.000Z",
          last_sample_status: "sampled"
        },
        null,
        2
      )}\n`,
      "utf8"
    );

    const result = await readWatchdogPaneActivity({
      runtimeDir,
      bubbleId: "b_watchdog_store_03"
    });

    expect(result).toEqual({
      status: "invalid",
      error:
        "Watchdog pane activity bubble_id mismatch: expected b_watchdog_store_03, found b_watchdog_store_other."
    });
  });

  it("throws when writing a record with a mismatched bubble_id", async () => {
    const runtimeDir = await createRuntimeDir();

    await expect(
      writeWatchdogPaneActivity({
        runtimeDir,
        bubbleId: "b_watchdog_store_04",
        record: {
          bubble_id: "b_watchdog_store_other",
          sampled_at: "2026-03-27T19:00:00.000Z",
          pane_hash: "pane-hash-04",
          last_changed_at: "2026-03-27T18:55:00.000Z",
          last_sample_status: "sampled"
        }
      })
    ).rejects.toThrow(
      "Watchdog pane activity bubble_id mismatch: expected b_watchdog_store_04, found b_watchdog_store_other."
    );
  });
});
