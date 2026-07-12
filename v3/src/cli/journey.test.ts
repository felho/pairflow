import { execFile } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import { afterEach, describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);

/**
 * The repo's first FULL-LIFECYCLE JOURNEY SMOKE (packet ch8-P2, J1/J2;
 * plan §8.9 P2 row, user-ratified 2026-07-11): template file → start →
 * submitted events → terminal → floor reads, through the SHIPPED CLI
 * processes (the root tsx bridge — the last-mile-smoke culture).
 *
 * J2: the SHIPPED configuration surface only — real entrypoint
 * processes, a real store file in a temp dir, the REPO's canonical
 * template file as the operator-authored input (never a temp copy —
 * the artifact's provenance is the repo file; packet note 4). Zero
 * test-side seams: no injected deps, no scripted clocks or sinks.
 */

const dirs: string[] = [];

afterEach(() => {
  for (const dir of dirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

interface TimelineRow {
  seq: number;
  envelope: { opId: string; type: string };
}

describe("cli — the full-lifecycle journey smoke (packet ch8-P2: J1/J2)", () => {
  it(
    "file → start → PASS → CONVERGED → terminal DONE → timeline + tail agree, every stage exit 0",
    { timeout: 30_000 },
    async () => {
      const tsxBin = join(process.cwd(), "..", "node_modules", ".bin", "tsx");
      const mainPath = join(process.cwd(), "src", "cli", "main.ts");
      const templatesDir = join(process.cwd(), "templates");
      const dir = mkdtempSync(join(tmpdir(), "v3-journey-"));
      dirs.push(dir);
      const db = join(dir, "store.db");
      const cli = (...argv: string[]): Promise<{ stdout: string; stderr: string }> =>
        execFileAsync(tsxBin, [mainPath, ...argv]); // rejects on nonzero exit

      // start — the operator-authored repo file, the pinned default ref.
      const started = await cli(
        "start", "--db", db, "--task", "journey",
        "--templates-dir", templatesDir,
      );
      const startDoc = JSON.parse(started.stdout.trim()) as {
        instanceId: string;
        version: number;
      };
      expect(startDoc.version).toBe(1);
      const id = startDoc.instanceId;

      // submitted events driving implement →(PASS)→ review →(CONVERGED)→ done.
      const pass = await cli(
        "submit", "--db", db, "--instance", id, "--type", "PASS",
        "--expected-version", "1", "--expected-role", "implementer", "--templates-dir", templatesDir,
      );
      expect(JSON.parse(pass.stdout.trim())).toMatchObject({ kind: "committed", version: 2 });

      const converged = await cli(
        "submit", "--db", db, "--instance", id, "--type", "CONVERGED",
        "--expected-version", "2", "--expected-role", "reviewer", "--templates-dir", templatesDir,
      );
      expect(JSON.parse(converged.stdout.trim())).toMatchObject({ kind: "committed", version: 3 });

      // terminal verified (detail — a shipped ch6 floor verb).
      const detail = await cli("detail", id, "--db", db);
      const detailDoc = JSON.parse(detail.stdout.trim()) as {
        instance: { status: string; currentStep: string; task: string };
      };
      expect(detailDoc.instance.status).toBe("DONE");
      expect(detailDoc.instance.currentStep).toBe("done");
      expect(detailDoc.instance.task).toBe("journey");

      // floor reads — the ratified row's named pair, both driven:
      // timeline (the cursor read) — exactly the two submitted events
      // (START commits the instance, not a transcript row).
      const timeline = await cli("timeline", id, "--db", db);
      const timelineRows = JSON.parse(timeline.stdout.trim()) as TimelineRow[];
      expect(timelineRows.map((r) => r.envelope.type)).toEqual(["PASS", "CONVERGED"]);

      // …and tail --from 0 (NDJSON; completes on the terminal instance).
      const tail = await cli("tail", id, "--db", db, "--from", "0");
      const tailRows = tail.stdout
        .trim()
        .split("\n")
        .map((line) => JSON.parse(line) as TimelineRow);

      // the two floor reads agree on THE SAME ROWS — full deep
      // equality, not a projected field pair (arm gate 2, aftermath
      // finding 3).
      expect(tailRows).toEqual(timelineRows);
      expect(tailRows.every((r) => typeof r.envelope.opId === "string")).toBe(true);
    },
  );
});
