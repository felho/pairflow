import { execFile } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import { afterEach, describe, expect, it } from "vitest";

import { openStore } from "../store/index.js";
import { createControlledClock, createScriptedTailWait } from "../testkit/index.js";
import type { CliErrorDoc } from "./contract.js";
import { EXIT } from "./contract.js";
import type { CliSinks } from "./main.js";
import { runCli } from "./main.js";
import type { CliDeps } from "./runtime.js";

const execFileAsync = promisify(execFile);

const dirs: string[] = [];

function tempDbPath(): string {
  const dir = mkdtempSync(join(tmpdir(), "v3-cli-"));
  dirs.push(dir);
  return join(dir, "store.db");
}

afterEach(() => {
  for (const dir of dirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

interface Run {
  code: number;
  stdout: string[];
  stderr: string[];
}

interface TestDepsOptions {
  nonce?: () => string;
  tailSteps?: ReadonlyArray<() => void | Promise<void>>;
  env?: Readonly<Record<string, string | undefined>>;
}

function testDeps(options: TestDepsOptions = {}): CliDeps {
  let ids = 0;
  return {
    openStore: (path, time) => openStore(path, time),
    time: createControlledClock(1_000),
    instanceIdSource: () => {
      ids += 1;
      return `inst-${String(ids)}`;
    },
    nonceSource: options.nonce ?? (() => `nonce-${String((ids += 1))}`),
    tailWait: () => createScriptedTailWait(options.tailSteps ?? []).wait,
    env: options.env ?? {},
  };
}

async function run(argv: readonly string[], deps: CliDeps): Promise<Run> {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const sinks: CliSinks = {
    out: (line) => stdout.push(line),
    err: (line) => stderr.push(line),
  };
  const code = await runCli(argv, deps, sinks);
  return { code, stdout, stderr };
}

function errorDoc(result: Run): CliErrorDoc["error"] {
  expect(result.stdout).toEqual([]);
  expect(result.stderr).toHaveLength(1);
  const doc = JSON.parse(result.stderr[0] ?? "") as CliErrorDoc;
  return doc.error;
}

/** F1 keyset rule: exactly {class, name, message} (+ optional details),
 * and the class ↔ exit-code correspondence holds. */
function assertErrorContract(result: Run, expectedClass: string, expectedCode: number): void {
  const error = errorDoc(result);
  expect(result.code).toBe(expectedCode);
  expect(error.class).toBe(expectedClass);
  const keys = Object.keys(error).sort();
  const allowed = ["class", "details", "message", "name"];
  for (const key of keys) {
    expect(allowed).toContain(key);
  }
  for (const required of ["class", "message", "name"]) {
    expect(keys).toContain(required);
  }
}

async function startOne(db: string, deps: CliDeps): Promise<string> {
  const started = await run(["start", "--db", db, "--task", "t"], deps);
  expect(started.code).toBe(EXIT.ok);
  const doc = JSON.parse(started.stdout[0] ?? "") as { instanceId: string; version: number };
  expect(doc.version).toBe(1);
  return doc.instanceId;
}

describe("cli — runtime config matrix (packet ch6-P4a)", () => {
  it("missing --db and env → usage (2); env fallback works", async () => {
    assertErrorContract(await run(["list"], testDeps()), "usage", EXIT.usage);

    const db = tempDbPath();
    const withEnv = testDeps({ env: { PAIRFLOW_V3_DB: db } });
    const result = await run(["list"], withEnv);
    expect(result.code).toBe(EXIT.ok);
    expect(JSON.parse(result.stdout[0] ?? "")).toEqual([]);
  });

  it("store-open fail-closed → internal (1), NOT usage — ADR-003 stays loud", async () => {
    const db = tempDbPath();
    // Poison: tables exist, no schema marker → openStore refuses.
    const { DatabaseSync } = await import("node:sqlite");
    const raw = new DatabaseSync(db);
    raw.exec("CREATE TABLE something (a INTEGER)");
    raw.close();

    assertErrorContract(
      await run(["list", "--db", db], testDeps()),
      "internal",
      EXIT.internal,
    );
  });

  it("unknown verb / unknown flag → usage (2)", async () => {
    assertErrorContract(await run(["frobnicate"], testDeps()), "usage", EXIT.usage);
    assertErrorContract(
      await run(["list", "--db", tempDbPath(), "--nope"], testDeps()),
      "usage",
      EXIT.usage,
    );
  });
});

describe("cli — start / submit (write verbs through the sanctioned entrypoints)", () => {
  it("start → started doc on stdout, exit 0; detail sees the run", async () => {
    const db = tempDbPath();
    const deps = testDeps();
    const id = await startOne(db, deps);
    expect(id).toBe("inst-1");

    const detail = await run(["detail", id, "--db", db], deps);
    expect(detail.code).toBe(EXIT.ok);
    const doc = JSON.parse(detail.stdout[0] ?? "") as {
      instance: { instanceId: string; status: string };
      transcript: unknown[];
    };
    expect(doc.instance.status).toBe("RUNNING");
    expect(doc.transcript).toEqual([]);
  });

  it("start parse contract: bad template ref → 2; unknown template → 3; bad/unknown override → 2 (+validRoles)", async () => {
    const db = tempDbPath();
    assertErrorContract(
      await run(["start", "--db", db, "--task", "t", "--template", "nope"], testDeps()),
      "usage",
      EXIT.usage,
    );
    assertErrorContract(
      await run(["start", "--db", db, "--task", "t", "--template", "ghost@1"], testDeps()),
      "not_found",
      EXIT.notFound,
    );
    assertErrorContract(
      await run(["start", "--db", db, "--task", "t", "--override", "reviewer"], testDeps()),
      "usage",
      EXIT.usage,
    );
    const unknownRole = await run(
      ["start", "--db", db, "--task", "t", "--override", "ghost=claude"],
      testDeps(),
    );
    const error = errorDoc(unknownRole);
    expect(unknownRole.code).toBe(EXIT.usage);
    expect(error.details).toEqual({ validRoles: ["implementer", "reviewer"] });
  });

  it("submit → outcome is DATA on stdout for ALL protocol answers; exit classifies", async () => {
    const db = tempDbPath();
    const deps = testDeps();
    const id = await startOne(db, deps);

    const committed = await run(
      ["submit", "--db", db, "--instance", id, "--type", "PASS", "--expected-version", "1", "--payload", '{"ref":"d1"}'],
      deps,
    );
    expect(committed.code).toBe(EXIT.ok);
    expect((JSON.parse(committed.stdout[0] ?? "") as { kind: string }).kind).toBe("committed");
    expect(committed.stderr).toEqual([]);

    const stale = await run(
      ["submit", "--db", db, "--instance", id, "--type", "PASS", "--expected-version", "1", "--payload", '{"ref":"d2"}'],
      deps,
    );
    expect(stale.code).toBe(EXIT.notFound);
    expect((JSON.parse(stale.stdout[0] ?? "") as { kind: string }).kind).toBe("stale");
    expect(stale.stderr).toEqual([]);

    const rejected = await run(
      ["submit", "--db", db, "--instance", id, "--type", "NOPE", "--expected-version", "2"],
      deps,
    );
    expect(rejected.code).toBe(EXIT.notFound);
    expect((JSON.parse(rejected.stdout[0] ?? "") as { kind: string }).kind).toBe("rejected");
  });

  it("ADR-004 operator nonce: a fixed nonce re-derives the same op_id → duplicate = exit 0", async () => {
    const db = tempDbPath();
    const deps = testDeps({ nonce: () => "nonce-fixed" });
    const id = await startOne(db, deps);
    const args = [
      "submit", "--db", db, "--instance", id, "--type", "PASS", "--expected-version", "1", "--payload", '{"ref":"d"}',
    ];
    expect((await run(args, deps)).code).toBe(EXIT.ok);
    const second = await run(args, deps);
    expect(second.code).toBe(EXIT.ok);
    expect((JSON.parse(second.stdout[0] ?? "") as { kind: string }).kind).toBe("duplicate");
  });

  it("submit payload rules: absent → NO payload key; 'null' → JSON null; bad JSON → 2; bad version → 2", async () => {
    const db = tempDbPath();
    const deps = testDeps();
    const id = await startOne(db, deps);

    const noPayload = await run(
      ["submit", "--db", db, "--instance", id, "--type", "PASS", "--expected-version", "1"],
      deps,
    );
    expect(noPayload.code).toBe(EXIT.ok);
    const nullPayload = await run(
      ["submit", "--db", db, "--instance", id, "--type", "PASS", "--expected-version", "2", "--payload", "null"],
      deps,
    );
    expect(nullPayload.code).toBe(EXIT.ok);

    const detail = await run(["detail", id, "--db", db], deps);
    const doc = JSON.parse(detail.stdout[0] ?? "") as {
      transcript: { envelope: Record<string, unknown> }[];
    };
    expect("payload" in (doc.transcript[0]?.envelope ?? {})).toBe(false);
    expect(doc.transcript[1]?.envelope["payload"]).toBeNull();

    assertErrorContract(
      await run(
        ["submit", "--db", db, "--instance", id, "--type", "PASS", "--expected-version", "3", "--payload", "{bad"],
        deps,
      ),
      "usage",
      EXIT.usage,
    );
    assertErrorContract(
      await run(
        ["submit", "--db", db, "--instance", id, "--type", "PASS", "--expected-version", "1.5"],
        deps,
      ),
      "usage",
      EXIT.usage,
    );
  });
});

describe("cli — read verbs (the floor activated)", () => {
  it("timeline: rows / --after suffix / unknown → 3 / invalid cursor → 2", async () => {
    const db = tempDbPath();
    const deps = testDeps();
    const id = await startOne(db, deps);
    await run(
      ["submit", "--db", db, "--instance", id, "--type", "PASS", "--expected-version", "1", "--payload", '{"ref":"d"}'],
      deps,
    );

    const rows = await run(["timeline", id, "--db", db], deps);
    expect(rows.code).toBe(EXIT.ok);
    expect((JSON.parse(rows.stdout[0] ?? "") as { seq: number }[]).map((r) => r.seq)).toEqual([1]);

    const beyond = await run(["timeline", id, "--db", db, "--after", "99"], deps);
    expect(JSON.parse(beyond.stdout[0] ?? "")).toEqual([]);

    assertErrorContract(
      await run(["timeline", "ghost", "--db", db], deps),
      "not_found",
      EXIT.notFound,
    );
    assertErrorContract(
      await run(["timeline", id, "--db", db, "--after", "-1"], deps),
      "usage",
      EXIT.usage,
    );
  });

  it("bundle: default policy — payload markers appear NOWHERE (REV-BUNDLE-DEFAULT-POLICY)", async () => {
    const db = tempDbPath();
    const deps = testDeps();
    const id = await startOne(db, deps);
    await run(
      ["submit", "--db", db, "--instance", id, "--type", "PASS", "--expected-version", "1", "--payload", '{"secret":"MARKER_CLI_DELTA_4b"}'],
      deps,
    );

    const bundle = await run(["bundle", id, "--db", db], deps);
    expect(bundle.code).toBe(EXIT.ok);
    expect(bundle.stdout[0]).not.toContain("MARKER_CLI_DELTA_4b");
    expect((JSON.parse(bundle.stdout[0] ?? "") as { policy: string }).policy).toBe(
      "redact-payloads",
    );
    assertErrorContract(
      await run(["bundle", "ghost", "--db", db], deps),
      "not_found",
      EXIT.notFound,
    );
  });

  it("bundle: interim diag wiring (ch7-P3, lane X1) — rejectedInputs = unavailable(open_failed) until P4 wires the store", async () => {
    const db = tempDbPath();
    const deps = testDeps();
    const id = await startOne(db, deps);

    // Pass-through CONTENT only: exit code, channel rule, and the rest
    // of the bundle contract are untouched (dimension 14).
    const bundle = await run(["bundle", id, "--db", db], deps);
    expect(bundle.code).toBe(EXIT.ok);
    const doc = JSON.parse(bundle.stdout[0] ?? "") as { rejectedInputs: unknown };
    expect(doc.rejectedInputs).toEqual({ status: "unavailable", reason: "open_failed" });
  });

  it("tail: NDJSON rows on stdout, completion on terminal; error lanes → 3 / 2", async () => {
    const db = tempDbPath();
    const setupDeps = testDeps();
    const id = await startOne(db, setupDeps);
    await run(
      ["submit", "--db", db, "--instance", id, "--type", "PASS", "--expected-version", "1", "--payload", '{"ref":"d1"}'],
      setupDeps,
    );

    // The scripted wait's step commits CONVERGED cross-handle (a second
    // runCli on the same WAL file) — then the tail must complete.
    const tailDeps = testDeps({
      tailSteps: [
        async () => {
          const converge = await run(
            ["submit", "--db", db, "--instance", id, "--type", "CONVERGED", "--expected-version", "2"],
            testDeps(),
          );
          expect(converge.code).toBe(EXIT.ok);
        },
      ],
    });
    const tail = await run(["tail", id, "--db", db], tailDeps);
    expect(tail.code).toBe(EXIT.ok);
    expect(tail.stderr).toEqual([]);
    const seqs = tail.stdout.map((line) => (JSON.parse(line) as { seq: number }).seq);
    expect(seqs).toEqual([1, 2]);

    assertErrorContract(await run(["tail", "ghost", "--db", db], testDeps()), "not_found", EXIT.notFound);
    assertErrorContract(
      await run(["tail", id, "--db", db, "--from", "1.5"], testDeps()),
      "usage",
      EXIT.usage,
    );
    assertErrorContract(
      await run(["tail", id, "--db", db, "--poll-ms", "-5"], testDeps()),
      "usage",
      EXIT.usage,
    );
  });
});

describe("cli — P4a aftermath (post-commit review, 2026-07-08)", () => {
  it("F1 — a colliding minted id is INTERNAL (1), never usage: the 2-vs-1 split holds", async () => {
    const db = tempDbPath();
    const deps: CliDeps = { ...testDeps(), instanceIdSource: () => "inst-fixed" };
    expect((await run(["start", "--db", db, "--task", "t"], deps)).code).toBe(EXIT.ok);
    assertErrorContract(
      await run(["start", "--db", db, "--task", "t"], deps),
      "internal",
      EXIT.internal,
    );
  });

  it("F2 — numeric flags are LEXICAL decimal integers: coercion lanes → 2", async () => {
    const db = tempDbPath();
    const deps = testDeps();
    const id = await startOne(db, deps);
    for (const bad of ["", " ", "1e2", "0x10", "+1"]) {
      assertErrorContract(
        await run(["timeline", id, "--db", db, "--after", bad], deps),
        "usage",
        EXIT.usage,
      );
    }
    assertErrorContract(
      await run(
        ["submit", "--db", db, "--instance", id, "--type", "PASS", "--expected-version", " "],
        deps,
      ),
      "usage",
      EXIT.usage,
    );
  });

  it("test gap — tail mid-stream failure: emitted rows stay parseable, ONE stderr doc, exit 1", async () => {
    const db = tempDbPath();
    const setupDeps = testDeps();
    const id = await startOne(db, setupDeps);
    await run(
      ["submit", "--db", db, "--instance", id, "--type", "PASS", "--expected-version", "1", "--payload", '{"ref":"d"}'],
      setupDeps,
    );

    const deps = testDeps({
      tailSteps: [
        () => {
          throw new Error("boom mid-tail");
        },
      ],
    });
    const result = await run(["tail", id, "--db", db], deps);
    expect(result.code).toBe(EXIT.internal);
    expect(result.stdout).toHaveLength(1);
    expect((JSON.parse(result.stdout[0] ?? "") as { seq: number }).seq).toBe(1);
    expect(result.stderr).toHaveLength(1);
    expect((JSON.parse(result.stderr[0] ?? "") as CliErrorDoc).error.class).toBe("internal");
  });
});

describe("cli — last-mile smoke: the SHIPPED entrypoint (root tsx bridge)", () => {
  it("start → detail through the real cli/main.ts process", { timeout: 30_000 }, async () => {
    const db = tempDbPath();
    const tsxBin = join(process.cwd(), "..", "node_modules", ".bin", "tsx");
    const mainPath = join(process.cwd(), "src", "cli", "main.ts");

    const started = await execFileAsync(tsxBin, [mainPath, "start", "--db", db, "--task", "smoke"]);
    const doc = JSON.parse(started.stdout.trim()) as { instanceId: string; version: number };
    expect(doc.version).toBe(1);

    const detail = await execFileAsync(tsxBin, [mainPath, "detail", doc.instanceId, "--db", db]);
    const parsed = JSON.parse(detail.stdout.trim()) as { instance: { task: string } };
    expect(parsed.instance.task).toBe("smoke");
  });
});
