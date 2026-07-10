import { execFile } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import { afterEach, describe, expect, it } from "vitest";

import { openStore } from "../../store/index.js";
import { createControlledClock, createScriptedTailWait } from "../../testkit/index.js";
import type { CliErrorDoc } from "../contract.js";
import { EXIT } from "../contract.js";
import { runCli } from "../main.js";
import type { CliDeps } from "../runtime.js";
import { runDevCli } from "./main.js";

const execFileAsync = promisify(execFile);

const dirs: string[] = [];

function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "v3-cli-dev-"));
  dirs.push(dir);
  return dir;
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

function testDeps(): CliDeps {
  let ids = 0;
  return {
    openStore: (path, time) => openStore(path, time),
    time: createControlledClock(1_000),
    instanceIdSource: () => {
      ids += 1;
      return `inst-${String(ids)}`;
    },
    nonceSource: () => `nonce-${String((ids += 1))}`,
    tailWait: () => createScriptedTailWait([]).wait,
    env: {},
  };
}

async function runDev(argv: readonly string[], deps: CliDeps): Promise<Run> {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const code = await runDevCli(argv, deps, {
    out: (line) => stdout.push(line),
    err: (line) => stderr.push(line),
  });
  return { code, stdout, stderr };
}

function assertError(result: Run, expectedClass: string, expectedCode: number): CliErrorDoc["error"] {
  expect(result.stderr).toHaveLength(1);
  const doc = JSON.parse(result.stderr[0] ?? "") as CliErrorDoc;
  expect(result.code).toBe(expectedCode);
  expect(doc.error.class).toBe(expectedClass);
  return doc.error;
}

const MARKER = "MARKER_DEV_ECHO_7a1";

/** Seeds a file DB with one run + one marker-payload commit via the
 * NORMAL cli (the P4a surface is the fixture tool here). */
async function seedDb(): Promise<{ db: string; id: string }> {
  const db = join(tempDir(), "store.db");
  const deps = testDeps();
  const started: string[] = [];
  const code = await runCli(["start", "--db", db, "--task", "t"], deps, {
    out: (line) => started.push(line),
    err: () => undefined,
  });
  expect(code).toBe(EXIT.ok);
  const id = (JSON.parse(started[0] ?? "") as { instanceId: string }).instanceId;
  const submit = await runCli(
    ["submit", "--db", db, "--instance", id, "--type", "PASS", "--expected-version", "1", "--payload", `{"secret":"${MARKER}"}`],
    deps,
    { out: () => undefined, err: () => undefined },
  );
  expect(submit).toBe(EXIT.ok);
  return { db, id };
}

function writeJson(name: string, value: unknown): string {
  const path = join(tempDir(), name);
  writeFileSync(path, JSON.stringify(value), "utf8");
  return path;
}

describe("dev cli — runtime config matrix (packet ch6-P4b)", () => {
  it("bundle and inject inherit the P4a config contract: missing db → usage 2", async () => {
    assertError(await runDev(["bundle", "x"], testDeps()), "usage", EXIT.usage);
    const file = writeJson("steps.json", { steps: [] });
    assertError(
      await runDev(["inject", "--instance", "x", "--file", file], testDeps()),
      "usage",
      EXIT.usage,
    );
  });

  it("replay is hermetic: --db is not an accepted flag (strict parse → 2)", async () => {
    const file = writeJson("fx.json", { name: "n", steps: [{}], finalTranscript: [], finalState: {} });
    assertError(
      await runDev(["replay", "--file", file, "--db", "x.db"], testDeps()),
      "usage",
      EXIT.usage,
    );
  });

  it("the NORMAL entrypoint does not know the dev verbs", async () => {
    const result: string[] = [];
    const code = await runCli(["inject"], testDeps(), {
      out: (l) => result.push(l),
      err: (l) => result.push(l),
    });
    expect(code).toBe(EXIT.usage);
  });
});

describe("dev cli — bundle --passthrough (REV-BUNDLE-DEFAULT-POLICY closure)", () => {
  it("default dev bundle stays redacted; --passthrough is the explicit opt-in", async () => {
    const { db, id } = await seedDb();

    const redacted = await runDev(["bundle", id, "--db", db], testDeps());
    expect(redacted.code).toBe(EXIT.ok);
    expect(redacted.stdout[0]).not.toContain(MARKER);
    expect((JSON.parse(redacted.stdout[0] ?? "") as { policy: string }).policy).toBe(
      "redact-payloads",
    );

    const passthrough = await runDev(["bundle", id, "--db", db, "--passthrough"], testDeps());
    expect(passthrough.code).toBe(EXIT.ok);
    expect(passthrough.stdout[0]).toContain(MARKER);
    expect((JSON.parse(passthrough.stdout[0] ?? "") as { policy: string }).policy).toBe(
      "dev-passthrough",
    );

    assertError(await runDev(["bundle", "ghost", "--db", db], testDeps()), "not_found", EXIT.notFound);
  });

  it("dev bundle: interim diag wiring (ch7-P3, lane X1) — rejectedInputs = unavailable(open_failed) until P4 wires the store", async () => {
    const { db, id } = await seedDb();
    const bundle = await runDev(["bundle", id, "--db", db], testDeps());
    expect(bundle.code).toBe(EXIT.ok);
    const doc = JSON.parse(bundle.stdout[0] ?? "") as { rejectedInputs: unknown };
    expect(doc.rejectedInputs).toEqual({ status: "unavailable", reason: "open_failed" });
  });
});

describe("dev cli — inject schema + derived/override paths", () => {
  it("derived path: canonicalizable payload + expectedVersion → outcome rows, exit 0", async () => {
    const { db, id } = await seedDb();
    // The run is at version 2, currentStep review.
    const file = writeJson("ok.json", {
      steps: [{ type: "PASS", expectedVersion: 2, payload: { ref: "d2" } }],
    });
    const result = await runDev(["inject", "--instance", id, "--file", file, "--db", db], testDeps());
    expect(result.code).toBe(EXIT.ok);
    expect(result.stdout).toHaveLength(1);
    expect((JSON.parse(result.stdout[0] ?? "") as { kind: string }).kind).toBe("committed");
  });

  it("derived + null payload derives fine (null IS canonicalizable)", async () => {
    const { db, id } = await seedDb();
    const file = writeJson("null.json", {
      steps: [{ type: "PASS", expectedVersion: 2, payload: null }],
    });
    const result = await runDev(["inject", "--instance", id, "--file", file, "--db", db], testDeps());
    expect(result.code).toBe(EXIT.ok);
    expect((JSON.parse(result.stdout[0] ?? "") as { kind: string }).kind).toBe("committed");
  });

  it("derived + absent payload → 2; derived + -0 payload → 2 (the emit-lib contract, pre-ingress)", async () => {
    const { db, id } = await seedDb();
    const absent = writeJson("absent.json", { steps: [{ type: "PASS", expectedVersion: 2 }] });
    assertError(
      await runDev(["inject", "--instance", id, "--file", absent, "--db", db], testDeps()),
      "usage",
      EXIT.usage,
    );
    // RAW text: JSON.stringify would flatten -0 to 0 (the very class
    // under test — JSON.parse("-0") restores it, stringify never emits it).
    const negZero = join(tempDir(), "negzero.json");
    writeFileSync(
      negZero,
      '{"steps":[{"type":"PASS","expectedVersion":2,"payload":-0}]}',
      "utf8",
    );
    assertError(
      await runDev(["inject", "--instance", id, "--file", negZero, "--db", db], testDeps()),
      "usage",
      EXIT.usage,
    );
  });

  it("override path: absent payload AND -0 payload both flow to ingress as outcome DATA, exit 0", async () => {
    const { db, id } = await seedDb();
    // RAW text for the -0 row (stringify would flatten it to 0):
    // step 1 = absent payload + absent expectedVersion (the
    // missing_version lane staged DELIBERATELY); step 2 = -0 payload
    // (the ingress admission rejection as a data row).
    const file = join(tempDir(), "override.json");
    writeFileSync(
      file,
      '{"steps":[{"type":"PASS","opId":"dev-op-1"},{"type":"PASS","expectedVersion":2,"payload":-0,"opId":"dev-op-2"}]}',
      "utf8",
    );
    const result = await runDev(["inject", "--instance", id, "--file", file, "--db", db], testDeps());
    expect(result.code).toBe(EXIT.ok);
    const kinds = result.stdout.map((line) => (JSON.parse(line) as { kind: string }).kind);
    expect(kinds).toEqual(["rejected", "rejected"]);
  });

  it("post-close aftermath F1 — expectedVersion:-0 fails the schema at usage 2, BEFORE any submit", async () => {
    const { db, id } = await seedDb();
    // RAW text: stringify would flatten -0 (the WATCH lesson); the
    // ingress rejects -0 too, but the packet claims PRE-submit
    // validation — the schema must catch it first.
    const file = join(tempDir(), "negzero-version.json");
    writeFileSync(
      file,
      '{"steps":[{"type":"PASS","expectedVersion":-0,"payload":{},"opId":"x1"}]}',
      "utf8",
    );
    const result = await runDev(["inject", "--instance", id, "--file", file, "--db", db], testDeps());
    assertError(result, "usage", EXIT.usage);
    expect(result.stdout).toEqual([]);
  });

  it("schema fail-closed lanes: unknown field / bad version type / malformed / missing file / empty steps", async () => {
    const { db, id } = await seedDb();
    const unknown = writeJson("unknown.json", {
      steps: [{ type: "PASS", expectedVersion: 2, payload: {}, nope: 1 }],
    });
    const error = assertError(
      await runDev(["inject", "--instance", id, "--file", unknown, "--db", db], testDeps()),
      "usage",
      EXIT.usage,
    );
    expect(error.details).toEqual({
      allowedFields: ["type", "expectedVersion", "payload", "actorId", "opId"],
    });

    const badVersion = writeJson("badv.json", {
      steps: [{ type: "PASS", expectedVersion: "2", payload: {}, opId: "x" }],
    });
    assertError(
      await runDev(["inject", "--instance", id, "--file", badVersion, "--db", db], testDeps()),
      "usage",
      EXIT.usage,
    );

    const malformed = join(tempDir(), "bad.json");
    writeFileSync(malformed, "{nope", "utf8");
    assertError(
      await runDev(["inject", "--instance", id, "--file", malformed, "--db", db], testDeps()),
      "usage",
      EXIT.usage,
    );
    assertError(
      await runDev(["inject", "--instance", id, "--file", join(tempDir(), "nope.json"), "--db", db], testDeps()),
      "usage",
      EXIT.usage,
    );

    const empty = writeJson("empty.json", { steps: [] });
    const vacuous = await runDev(["inject", "--instance", id, "--file", empty, "--db", db], testDeps());
    expect(vacuous.code).toBe(EXIT.ok);
    expect(vacuous.stdout).toEqual([]);
  });
});

describe("dev cli — replay (hermetic golden-trace diagnostics)", () => {
  const greenFixture = {
    name: "dev replay green",
    steps: [
      {
        kind: "start",
        instanceId: "r1",
        task: "t",
        expect: { currentStep: "implement", version: 1 },
      },
      {
        kind: "emit",
        opId: "a1",
        type: "PASS",
        actorId: "codex",
        expectedVersion: 1,
        payload: { ref: "d" },
        expect: { kind: "committed", version: 2 },
      },
    ],
    finalTranscript: [[1, "a1"]],
    finalState: { currentStep: "review", round: 1, status: "RUNNING", version: 2 },
  };

  it("a holding trace → ReplayResult on stdout, exit 0", async () => {
    const file = writeJson("green.json", greenFixture);
    const result = await runDev(["replay", "--file", file], testDeps());
    expect(result.code).toBe(EXIT.ok);
    const doc = JSON.parse(result.stdout[0] ?? "") as {
      outcomes: unknown[];
      finalDetail: { instance: { version: number } };
    };
    expect(doc.outcomes).toHaveLength(2);
    expect(doc.finalDetail.instance.version).toBe(2);
  });

  it("a mismatch → exit 1 with the TYPE-discriminated doc (name + lane/stepIndex/expected/actual)", async () => {
    const file = writeJson("mismatch.json", {
      ...greenFixture,
      name: "dev replay mismatch",
      steps: [
        greenFixture.steps[0],
        { ...greenFixture.steps[1], expect: { kind: "committed", version: 3 } },
      ],
    });
    const result = await runDev(["replay", "--file", file], testDeps());
    const error = assertError(result, "internal", EXIT.internal);
    expect(error.name).toBe("TraceMismatchError");
    expect(error.details).toMatchObject({ lane: "outcome", stepIndex: 1, expected: 3, actual: 2 });
  });

  it("a malformed fixture → usage 2 (root keyset + required shapes)", async () => {
    const missing = writeJson("missing.json", { name: "x", steps: [{}] });
    assertError(await runDev(["replay", "--file", missing], testDeps()), "usage", EXIT.usage);
    const extra = writeJson("extra.json", { ...greenFixture, extra: 1 });
    assertError(await runDev(["replay", "--file", extra], testDeps()), "usage", EXIT.usage);
  });

  it("post-close aftermath F2 — STRUCTURAL malformedness is usage 2, never mismatch/internal", async () => {
    // The reported repro: finalState {} slipped the shallow validator
    // and came back as a state MISMATCH (exit 1) — structure vs
    // semantics smeared. Now every structural lane is 2:
    const lanes: unknown[] = [
      { ...greenFixture, finalState: {} },
      { ...greenFixture, finalTranscript: [["1", "a1"]] },
      { ...greenFixture, steps: [{ ...greenFixture.steps[0], kind: "weird" }] },
      {
        ...greenFixture,
        steps: [
          greenFixture.steps[0],
          { ...greenFixture.steps[1], expect: { kind: "committed" } },
        ],
      },
      { ...greenFixture, lift: { expectedVersion: "something-else" } },
    ];
    for (const [index, fixture] of lanes.entries()) {
      const file = writeJson(`structural-${String(index)}.json`, fixture);
      const result = await runDev(["replay", "--file", file], testDeps());
      const error = assertError(result, "usage", EXIT.usage);
      expect(error.name).toBe("InvalidFixture");
    }
    // And the boundary from the other side: a structurally VALID
    // fixture whose content fails is STILL the harness's mismatch
    // (the existing mismatch test pins exit 1 + TraceMismatchError).
  });
});

describe("dev cli — last-mile smoke: the SHIPPED dev entrypoint", () => {
  it("bundle --passthrough through the real cli/dev/main.ts process", { timeout: 30_000 }, async () => {
    const { db, id } = await seedDb();
    const tsxBin = join(process.cwd(), "..", "node_modules", ".bin", "tsx");
    const devMain = join(process.cwd(), "src", "cli", "dev", "main.ts");

    const result = await execFileAsync(tsxBin, [devMain, "bundle", id, "--db", db, "--passthrough"]);
    const bundle = JSON.parse(result.stdout.trim()) as { policy: string };
    expect(bundle.policy).toBe("dev-passthrough");
    expect(result.stdout).toContain(MARKER);
  });
});
