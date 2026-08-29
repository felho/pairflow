import { execFile } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import { afterEach, describe, expect, it } from "vitest";

import { openDiagStore } from "../../diag/index.js";
import type { DiagnosticEvent, DiagnosticEventBody } from "../../ports/diagnostics.js";
import { openStore } from "../../store/index.js";
import { loadTemplate } from "../../definition/index.js";
import { createGateRegistry } from "../../gates/index.js";
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

interface DevTestDepsOptions {
  openDiagStore?: CliDeps["openDiagStore"];
}

function testDeps(options: DevTestDepsOptions = {}): CliDeps {
  let ids = 0;
  return {
    openStore: (path, time) => openStore(path, time),
    openDiagStore: options.openDiagStore ?? ((path, time) => openDiagStore(path, time)),
    time: createControlledClock(1_000),
    instanceIdSource: () => {
      ids += 1;
      return `inst-${String(ids)}`;
    },
    nonceSource: () => `nonce-${String((ids += 1))}`,
    tailWait: () => createScriptedTailWait([]).wait,
    // The A4 sweep (packet ch8-P2): start/submit/inject construct the
    // kernel over the FILE store — the default deps ride the env leg
    // on the repo's canonical templates dir.
    env: { PAIRFLOW_V3_TEMPLATES: join(process.cwd(), "templates") },
    // packet ch9-p4b (T1): the additive CliDeps growth rides the dev suite's
    // compile ripple ONLY — the dev entrypoint composes none of the runner
    // plane, so these bindings are never exercised here (assertions unchanged).
    attemptIdSource: () => `attempt-${String((ids += 1))}`,
    workerIdSource: () => `cli-worker-${String((ids += 1))}`,
    runInteractive: () => Promise.resolve(0),
  };
}

/** The derived diag-DB sibling (packet ch7-P4, C1). */
function diagPathOf(db: string): string {
  return `${db}.diag.sqlite`;
}

/** Stages R3-valid bodies into the REAL diag store on the derived path. */
function stageDiagEvents(db: string, bodies: readonly DiagnosticEventBody[]): void {
  const handle = openDiagStore(diagPathOf(db), createControlledClock(2_000));
  for (const body of bodies) {
    handle.sink.emit(body);
  }
  handle.close();
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
 * NORMAL cli (the ch12-P4 create→start surface is the fixture tool
 * here). */
async function seedDb(): Promise<{ db: string; id: string }> {
  const db = join(tempDir(), "store.db");
  const deps = testDeps();
  const created: string[] = [];
  const createCode = await runCli(["create", "--db", db, "--task", "t"], deps, {
    out: (line) => created.push(line),
    err: () => undefined,
  });
  expect(createCode).toBe(EXIT.ok);
  const id = (JSON.parse(created[0] ?? "") as { instanceId: string }).instanceId;
  const startCode = await runCli(["start", id, "--db", db], deps, {
    out: () => undefined,
    err: () => undefined,
  });
  expect(startCode).toBe(EXIT.ok);
  // create (genesis v1) + start (the activation commit) ⇒ version 2, so the
  // first PASS targets v2.
  const submit = await runCli(
    ["submit", "--db", db, "--instance", id, "--type", "PASS", "--expected-version", "2", "--expected-role", "implementer", "--payload", `{"secret":"${MARKER}"}`],
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

  it("dev bundle on the WIRED channel (ch7-P4 V4/C5/M10): known-empty → rejected row → unavailable on corrupt, exit 0 throughout", async () => {
    const { db, id } = await seedDb();

    // C5: the wired channel's empty store is KNOWN-EMPTY (the X1
    // interim unavailable(open_failed) state ceased to exist at P4).
    const fresh = await runDev(["bundle", id, "--db", db], testDeps());
    expect(fresh.code).toBe(EXIT.ok);
    expect((JSON.parse(fresh.stdout[0] ?? "") as { rejectedInputs: unknown }).rejectedInputs).toEqual({
      status: "present",
      rows: [],
    });

    // A real rejected submit through the NORMAL cli lands in the store.
    const reject = await runCli(
      ["submit", "--db", db, "--instance", id, "--type", "NOPE", "--expected-version", "3", "--expected-role", "reviewer"],
      testDeps(),
      { out: () => undefined, err: () => undefined },
    );
    expect(reject).toBe(EXIT.notFound);
    const withRow = await runDev(["bundle", id, "--db", db], testDeps());
    const rows = (JSON.parse(withRow.stdout[0] ?? "") as {
      rejectedInputs: { status: string; rows: { kind: string }[] };
    }).rejectedInputs;
    expect(rows.status).toBe("present");
    expect(rows.rows).toHaveLength(1);
    expect(rows.rows[0]?.kind).toBe("rejected");

    // M10: corrupt diag → stated gap, the bundle itself SUCCEEDS.
    writeFileSync(diagPathOf(db), "garbage-not-a-database", "utf8");
    const corrupt = await runDev(["bundle", id, "--db", db], testDeps());
    expect(corrupt.code).toBe(EXIT.ok);
    expect((JSON.parse(corrupt.stdout[0] ?? "") as { rejectedInputs: unknown }).rejectedInputs).toEqual({
      status: "unavailable",
      reason: "open_failed",
    });
  });
});

describe("dev cli — inject schema + derived/override paths", () => {
  it("derived path: canonicalizable payload + expectedVersion → outcome rows, exit 0", async () => {
    const { db, id } = await seedDb();
    // The run is at version 3, currentStep review (start v2 + one PASS).
    const file = writeJson("ok.json", {
      steps: [{ type: "PASS", expectedVersion: 3, expectedRole: "reviewer", payload: { ref: "d2" } }],
    });
    const result = await runDev(["inject", "--instance", id, "--file", file, "--db", db], testDeps());
    expect(result.code).toBe(EXIT.ok);
    expect(result.stdout).toHaveLength(1);
    expect((JSON.parse(result.stdout[0] ?? "") as { kind: string }).kind).toBe("committed");
  });

  it("derived + null payload derives fine (null IS canonicalizable)", async () => {
    const { db, id } = await seedDb();
    const file = writeJson("null.json", {
      steps: [{ type: "PASS", expectedVersion: 3, expectedRole: "reviewer", payload: null }],
    });
    const result = await runDev(["inject", "--instance", id, "--file", file, "--db", db], testDeps());
    expect(result.code).toBe(EXIT.ok);
    expect((JSON.parse(result.stdout[0] ?? "") as { kind: string }).kind).toBe("committed");
  });

  it("derived + absent payload → 2; derived + -0 payload → 2 (the emit-lib contract, pre-ingress)", async () => {
    const { db, id } = await seedDb();
    const absent = writeJson("absent.json", { steps: [{ type: "PASS", expectedVersion: 3 }] });
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
      '{"steps":[{"type":"PASS","expectedVersion":3,"payload":-0}]}',
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
      '{"steps":[{"type":"PASS","opId":"dev-op-1"},{"type":"PASS","expectedVersion":3,"payload":-0,"opId":"dev-op-2"}]}',
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
      steps: [{ type: "PASS", expectedVersion: 3, payload: {}, nope: 1 }],
    });
    const error = assertError(
      await runDev(["inject", "--instance", id, "--file", unknown, "--db", db], testDeps()),
      "usage",
      EXIT.usage,
    );
    expect(error.details).toEqual({
      allowedFields: ["type", "expectedVersion", "expectedRole", "payload", "actorId", "opId"],
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

// ── packet ch8-P2: validate + the inject/replay templates-lane edges ──

const REPO_CANONICAL = join(process.cwd(), "templates", "local-pair-v0@1.yaml");

describe("dev cli — validate: one file through the load pipeline (packet ch8-P2: D1–D5)", () => {
  it("D1: validate takes EXACTLY one <path> positional — flags rejected by strict parse, an extra positional rejected too", async () => {
    assertError(
      await runDev(["validate", REPO_CANONICAL, "--db", "x.db"], testDeps()),
      "usage",
      EXIT.usage,
    );
    assertError(
      await runDev(["validate", REPO_CANONICAL, "--templates-dir", "t"], testDeps()),
      "usage",
      EXIT.usage,
    );
    // "exactly one file": a silently ignored second positional would
    // blur which file was judged (arm gate 2, aftermath finding 1).
    const extra = await runDev(["validate", REPO_CANONICAL, "extra"], testDeps());
    expect(extra.stdout).toEqual([]);
    expect(assertError(extra, "usage", EXIT.usage).name).toBe("InvalidArguments");
  });

  it("D2: the pre-pipeline input gate — missing positional / OS-unreadable path → usage 2 (a path is operator input)", async () => {
    const missing = await runDev(["validate"], testDeps());
    expect(missing.stdout).toEqual([]);
    expect(assertError(missing, "usage", EXIT.usage).name).toBe("MissingFile");

    const unreadable = await runDev(
      ["validate", join(tempDir(), "nope.yaml")],
      testDeps(),
    );
    expect(unreadable.stdout).toEqual([]);
    expect(assertError(unreadable, "usage", EXIT.usage).name).toBe("UnreadableFile");
  });

  it("D3: a valid file → exit 0, stdout EXACTLY {valid: true, ref}; stderr silent (D5)", async () => {
    const res = await runDev(["validate", REPO_CANONICAL], testDeps());
    expect(res.code).toBe(EXIT.ok);
    expect(res.stderr).toEqual([]);
    expect(res.stdout).toHaveLength(1);
    const doc = JSON.parse(res.stdout[0] ?? "") as Record<string, unknown>;
    expect(Object.keys(doc).sort()).toEqual(["ref", "valid"]);
    expect(doc).toEqual({ valid: true, ref: { id: "local-pair-v0", version: 1 } });
  });

  it("D4: one surfacing per stage class — read/parse/resolve/validate each exit 1, TemplateInvalid, details.stage names the stage", async () => {
    const dir = tempDir();
    // read: invalid UTF-8 BYTES (the strict-decode lane — raw bytes,
    // never a lossy utf8 pre-decode; R-RAW-FIXTURES by construction).
    const readPath = join(dir, "bad-bytes.yaml");
    writeFileSync(readPath, Buffer.from([0xff, 0xfe, 0x00, 0xc3]));
    // parse: duplicate keys.
    const parsePath = join(dir, "dup.yaml");
    writeFileSync(parsePath, "a: 1\na: 2\n");
    // resolve: the alias-amplification bomb (the P1 G8 fixture).
    const resolvePath = join(dir, "bomb.yaml");
    writeFileSync(
      resolvePath,
      [
        "a: &a [x,x,x,x,x,x,x,x,x]",
        "b: &b [*a,*a,*a,*a,*a,*a,*a,*a,*a]",
        "c: &c [*b,*b,*b,*b,*b,*b,*b,*b,*b]",
        "d: &d [*c,*c,*c,*c,*c,*c,*c,*c,*c]",
        "e: &e [*d,*d,*d,*d,*d,*d,*d,*d,*d]",
        "f: &f [*e,*e,*e,*e,*e,*e,*e,*e,*e]",
        "g: &g [*f,*f,*f,*f,*f,*f,*f,*f,*f]",
        "",
      ].join("\n"),
    );
    // validate: an unknown top-level key on the canonical shape.
    const validatePath = join(dir, "unknown.yaml");
    writeFileSync(validatePath, `${readFileSync(REPO_CANONICAL, "utf8")}kind: nope\n`);

    const lanes: ReadonlyArray<readonly [string, string]> = [
      [readPath, "read"],
      [parsePath, "parse"],
      [resolvePath, "resolve"],
      [validatePath, "validate"],
    ];
    for (const [path, stage] of lanes) {
      const res = await runDev(["validate", path], testDeps());
      expect(res.stdout).toEqual([]); // D5: data channel silent on failure
      const err = assertError(res, "internal", EXIT.internal);
      expect(err.name).toBe("TemplateInvalid");
      const details = err.details as { stage: string; findings: unknown[] };
      expect(Object.keys(err.details ?? {}).sort()).toEqual(["findings", "stage"]);
      expect(details.stage).toBe(stage);
      expect(details.findings.length).toBeGreaterThan(0);
      // VERBATIM (D4/W2, aftermath finding 3): the doc's details
      // deep-equal the pipeline's OWN result on the same bytes and
      // path (read-stage findings carry the positional as `path`).
      const direct = loadTemplate(new Uint8Array(readFileSync(path)), { path });
      expect(direct.ok).toBe(false);
      if (!direct.ok) {
        expect(details).toEqual({
          stage: direct.error.stage,
          findings: direct.error.findings,
        });
      }
    }
  });
});

// ── packet ch11-P4 Y7: dev validate over GATED template files (C28: no
// new verbs/flags; the doc shapes ride unchanged, only finding content is
// new). ──────────────────────────────────────────────────────────────

const gatedFile = (defective: boolean): string => `ref:
  id: gated-pair-v0
  version: 1
start: implement
steps:
  implement:
    role: implementer
    instruction: |-
      build it
    transitions:
      PASS: review
  review:
    role: reviewer
    instruction: |-
      review it
    transitions:
      PASS: implement
      CONVERGED: done
    gates:
      CONVERGED:
        - uses: ${defective ? "no.such.gate" : "declarative.threshold"}
          config: { metric: round, op: ">=", value: 2 }
terminal:
  - done
roles:
  implementer:
    defaultActor: codex
  reviewer:
    defaultActor: claude
round:
  advanceOnArrivalAt:
    - implement
`;

describe("dev cli — validate over gated files (packet ch11-P4 Y7)", () => {
  it("a VALID gated file → exit 0, stdout EXACTLY {valid: true, ref}", async () => {
    const dir = tempDir();
    const path = join(dir, "gated.yaml");
    writeFileSync(path, gatedFile(false));
    const res = await runDev(["validate", path], testDeps());
    expect(res.code).toBe(EXIT.ok);
    expect(res.stderr).toEqual([]);
    expect(JSON.parse(res.stdout[0] ?? "")).toEqual({
      valid: true,
      ref: { id: "gated-pair-v0", version: 1 },
    });
  });

  it("a gate-DEFECTIVE file → exit 1, TemplateInvalid, stage validate, the CODED finding visible (path + code)", async () => {
    const dir = tempDir();
    const path = join(dir, "gated-bad.yaml");
    writeFileSync(path, gatedFile(true));
    const res = await runDev(["validate", path], testDeps());
    expect(res.stdout).toEqual([]);
    const err = assertError(res, "internal", EXIT.internal);
    expect(err.name).toBe("TemplateInvalid");
    const details = err.details as { stage: string; findings: { path: string; code?: string }[] };
    expect(details.stage).toBe("validate");
    const coded = details.findings.find((f) => f.code === "gate_evaluator_unavailable");
    expect(coded).toBeDefined();
    expect(coded?.path).toBe("steps.review.gates.CONVERGED[0]");
    // VERBATIM: the doc's details deep-equal the pipeline's OWN result
    // (same bytes, same catalog, same path).
    const direct = loadTemplate(new Uint8Array(readFileSync(path)), {
      path,
      catalog: createGateRegistry(),
    });
    expect(direct.ok).toBe(false);
    if (!direct.ok) {
      expect(details).toEqual({ stage: direct.error.stage, findings: direct.error.findings });
    }
  });
});

// ── packet ch12-P4 V1: dev validate over RUNTIME-KEY template files (the
// activation / runtimeContext spec / defaultAgentConfig source forms ride
// the SAME {stage, findings} carrier — only finding content is new). ──────

const runtimeKeyFile = (mode: string): string => `ref:
  id: rt-pair-v0
  version: 1
start: implement
steps:
  implement:
    role: implementer
    instruction: |-
      build it
    transitions:
      PASS: done
    agentConfig:
      approach: tdd
terminal:
  - done
roles:
  implementer:
    defaultActor: codex
    defaultAgentConfig:
      mode: builder
activation:
  mode: ${mode}
runtimeContext:
  kind: worktree
  provider: pairflow.worktree
`;

describe("dev cli — validate over runtime-key files (packet ch12-P4 V1)", () => {
  it("a VALID runtime-key file (activation + runtimeContext spec + defaultAgentConfig) → exit 0, {valid: true, ref}", async () => {
    const path = join(tempDir(), "rt.yaml");
    writeFileSync(path, runtimeKeyFile("deferredKickoff"));
    const res = await runDev(["validate", path], testDeps());
    expect(res.code).toBe(EXIT.ok);
    expect(res.stderr).toEqual([]);
    expect(JSON.parse(res.stdout[0] ?? "")).toEqual({
      valid: true,
      ref: { id: "rt-pair-v0", version: 1 },
    });
  });

  it("a source-form-defective runtime-key file (bad activation.mode) → exit 1 TemplateInvalid, stage validate, the activation.mode finding", async () => {
    const path = join(tempDir(), "rt-bad.yaml");
    writeFileSync(path, runtimeKeyFile("eager"));
    const res = await runDev(["validate", path], testDeps());
    expect(res.stdout).toEqual([]);
    const err = assertError(res, "internal", EXIT.internal);
    expect(err.name).toBe("TemplateInvalid");
    const details = err.details as { stage: string; findings: { path: string }[] };
    expect(details.stage).toBe("validate");
    expect(details.findings.some((f) => f.path === "activation.mode")).toBe(true);
  });
});

describe("dev cli — inject/replay on the templates lane (packet ch8-P2: W-lane + A3/M4 edges)", () => {
  it("inject W-lane: the in-handle typed load error surfaces at the ingress.submit await → TemplateInvalid 1", async () => {
    const { db, id } = await seedDb();
    const badDir = tempDir();
    writeFileSync(
      join(badDir, "local-pair-v0@1.yaml"),
      `${readFileSync(REPO_CANONICAL, "utf8")}kind: nope\n`,
    );
    const file = writeJson("w-lane-steps.json", {
      steps: [{ type: "PASS", expectedVersion: 3, payload: {} }],
    });
    const res = await runDev(
      ["inject", "--instance", id, "--file", file, "--db", db, "--templates-dir", badDir],
      testDeps(),
    );
    expect(res.stdout).toEqual([]);
    const err = assertError(res, "internal", EXIT.internal);
    expect(err.name).toBe("TemplateInvalid");
    const details = err.details as { stage: string };
    expect(Object.keys(err.details ?? {}).sort()).toEqual(["findings", "stage"]);
    expect(details.stage).toBe("validate");
  });

  it("A3/M4: replay stays OUTSIDE the templates-dir lane — the flag is rejected by strict parse", async () => {
    const file = writeJson("replay-flag.json", { steps: [] });
    assertError(
      await runDev(["replay", "--file", file, "--templates-dir", "t"], testDeps()),
      "usage",
      EXIT.usage,
    );
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
        // W3 (ch12-p1b): the start step carries the START intent's opId and
        // the activation version (genesis v1 + START ⇒ version 2).
        opId: "op-start",
        expect: { currentStep: "implement", version: 2 },
      },
      {
        kind: "emit",
        opId: "a1",
        type: "PASS",
        actorId: "codex",
        expectedVersion: 2,
        expectedRole: "implementer",
        payload: { ref: "d" },
        expect: { kind: "committed", version: 3 },
      },
    ],
    // The STARTED fact rides seq 1; the PASS transition follows at seq 2.
    finalTranscript: [[1, "op-start"], [2, "a1"]],
    finalState: {
      currentStep: "review",
      round: 1,
      kernelStatus: "ACTIVE",
      terminalDisposition: null,
      version: 3,
    },
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
    expect(doc.finalDetail.instance.version).toBe(3);
  });

  it("a mismatch → exit 1 with the TYPE-discriminated doc (name + lane/stepIndex/expected/actual)", async () => {
    const file = writeJson("mismatch.json", {
      ...greenFixture,
      name: "dev replay mismatch",
      steps: [
        greenFixture.steps[0],
        { ...greenFixture.steps[1], expect: { kind: "committed", version: 4 } },
      ],
    });
    const result = await runDev(["replay", "--file", file], testDeps());
    const error = assertError(result, "internal", EXIT.internal);
    expect(error.name).toBe("TraceMismatchError");
    expect(error.details).toMatchObject({ lane: "outcome", stepIndex: 1, expected: 4, actual: 3 });
  });

  it("a malformed fixture → usage 2 (root keyset + required shapes)", async () => {
    const missing = writeJson("missing.json", { name: "x", steps: [{}] });
    assertError(await runDev(["replay", "--file", missing], testDeps()), "usage", EXIT.usage);
    const extra = writeJson("extra.json", { ...greenFixture, extra: 1 });
    assertError(await runDev(["replay", "--file", extra], testDeps()), "usage", EXIT.usage);
  });

  it("W4 (ch12-p3): the retired `runtimeContextRef` start-step key is now an UNKNOWN FIELD — InvalidFixture usage 2, never reaching replay", async () => {
    // The interim window carrier RETIRED with the harness seam (W4): the
    // fixture validator's start keyset no longer carries `runtimeContextRef`,
    // so a fixture supplying it is a structural (usage 2) refusal.
    const file = writeJson("ref-surplus.json", {
      ...greenFixture,
      name: "dev replay ref surplus",
      steps: [{ ...greenFixture.steps[0], runtimeContextRef: "x" }, greenFixture.steps[1]],
    });
    const result = await runDev(["replay", "--file", file], testDeps());
    const error = assertError(result, "usage", EXIT.usage);
    expect(error.name).toBe("InvalidFixture");
    expect(JSON.stringify(error)).toMatch(/runtimeContextRef|unknown field/);
    expect(result.stdout).toEqual([]);
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
      // ch12-p1a (W2): the finalState keyset re-based onto the axis —
      // a fixture still carrying the RETIRED ch-4 `status` key is
      // structurally invalid (exact keyset), never silently accepted.
      {
        ...greenFixture,
        finalState: { currentStep: "review", round: 1, status: "RUNNING", version: 2 },
      },
      // ...and terminalDisposition must be a token or null — absence fails.
      {
        ...greenFixture,
        finalState: { currentStep: "review", round: 1, kernelStatus: "ACTIVE", version: 2 },
      },
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

  it("build-close aftermath (ch12-p1a): finalState axis TOKEN DOMAINS are validated — an out-of-union kernelStatus/terminalDisposition is usage 2, never internal", async () => {
    // The green-but-blind gap: any nonempty string passed the validator,
    // so PAUSED/abandoned fixtures reached the harness as MISMATCH
    // (internal 1). The token sets are the exact l0d unions.
    const lanes: unknown[] = [
      { ...greenFixture, finalState: { ...greenFixture.finalState, kernelStatus: "PAUSED" } },
      // The RETIRED ch-4 spelling maps, never aliases (E1) — not a token.
      { ...greenFixture, finalState: { ...greenFixture.finalState, kernelStatus: "RUNNING" } },
      {
        ...greenFixture,
        finalState: { ...greenFixture.finalState, terminalDisposition: "abandoned" },
      },
    ];
    for (const [index, fixture] of lanes.entries()) {
      const file = writeJson(`token-domain-${String(index)}.json`, fixture);
      const result = await runDev(["replay", "--file", file], testDeps());
      expect(result.stdout).toEqual([]);
      const error = assertError(result, "usage", EXIT.usage);
      expect(error.name).toBe("InvalidFixture");
    }
  });

  it("build-close aftermath (ch12-p1a): every IN-UNION token passes the validator — a content-wrong but token-valid finalState is the harness's mismatch (internal 1)", async () => {
    // The boundary control from the other side: CREATED/WAITING/TERMINAL
    // and done/failed/cancelled all clear the usage gate, so the run
    // ends in TraceMismatchError — proving the token checks accept the
    // full unions, not just the green fixture's ACTIVE/null.
    const lanes: unknown[] = [
      ...(["CREATED", "WAITING", "TERMINAL"] as const).map((kernelStatus) => ({
        ...greenFixture,
        finalState: { ...greenFixture.finalState, kernelStatus },
      })),
      ...(["done", "failed", "cancelled"] as const).map((terminalDisposition) => ({
        ...greenFixture,
        finalState: { ...greenFixture.finalState, terminalDisposition },
      })),
    ];
    for (const [index, fixture] of lanes.entries()) {
      const file = writeJson(`token-valid-${String(index)}.json`, fixture);
      const result = await runDev(["replay", "--file", file], testDeps());
      const error = assertError(result, "internal", EXIT.internal);
      expect(error.name).toBe("TraceMismatchError");
    }
  });
});

describe("dev cli — the diag verb: the global cursor dump (packet ch7-P4: V3/F3/F4/M2/M9)", () => {
  const staged: readonly DiagnosticEventBody[] = [
    {
      source: "kernel",
      kind: "internal_failure",
      instanceId: "inst-a",
      error: { name: "BoomError", message: "boom detail with context" },
    },
    // Unattributed (R3: not_plain_object forbids ALL attribution) — the
    // dump is the ONLY surface where this row is reachable (§7.5).
    { source: "ingress", kind: "rejected", reason: "invalid_shape", detail: "not_plain_object" },
    {
      source: "kernel",
      kind: "rejected",
      reason: "unknown_instance",
      instanceId: "inst-b",
      opId: "op-1",
      actorId: "actor-1",
      type: "PASS",
    },
  ];

  it("V3: one JSON array — FULL events (error.message intact), unattributed VISIBLE, ordinal order; no main store opened (F4)", async () => {
    const db = join(tempDir(), "store.db");
    stageDiagEvents(db, staged);

    const result = await runDev(["diag", "--db", db], testDeps());
    expect(result.code).toBe(EXIT.ok);
    expect(result.stderr).toEqual([]);
    expect(result.stdout).toHaveLength(1);
    const rows = JSON.parse(result.stdout[0] ?? "") as DiagnosticEvent[];
    expect(rows.map((r) => r.ordinal)).toEqual([1, 2, 3]);
    expect(rows[0]?.error).toEqual({ name: "BoomError", message: "boom detail with context" });
    expect(rows[1]?.instanceId).toBeUndefined();
    expect(rows[1]?.detail).toBe("not_plain_object");
    // F4: the MAIN store was never opened — no store.db file appears.
    expect(existsSync(db)).toBe(false);
  });

  it("F3/M7: --after skips delivered ordinals; a bad --after is usage 2 with the keyset doc", async () => {
    const db = join(tempDir(), "store.db");
    stageDiagEvents(db, staged);

    const after = await runDev(["diag", "--db", db, "--after", "1"], testDeps());
    expect(after.code).toBe(EXIT.ok);
    const rows = JSON.parse(after.stdout[0] ?? "") as DiagnosticEvent[];
    expect(rows.map((r) => r.ordinal)).toEqual([2, 3]);

    const bad = await runDev(["diag", "--db", db, "--after", "1.5"], testDeps());
    const error = assertError(bad, "usage", EXIT.usage);
    expect(Object.keys(error).sort()).toEqual(
      expect.arrayContaining(["class", "message", "name"]),
    );
    expect(bad.stdout).toEqual([]);
  });

  it("M9: a fresh derived path is KNOWN-EMPTY — [] at exit 0 (and the O1 open initializes the file, flag 2)", async () => {
    const db = join(tempDir(), "store.db");
    const result = await runDev(["diag", "--db", db], testDeps());
    expect(result.code).toBe(EXIT.ok);
    expect(JSON.parse(result.stdout[0] ?? "")).toEqual([]);
    // Flag 2, stated: the read verb's open CREATED the diag file (O1).
    expect(existsSync(diagPathOf(db))).toBe(true);
  });

  it("M2: a corrupt diag store is LOUD — internal / 1, name + details.reason; missing db stays the inherited usage lane", async () => {
    const db = join(tempDir(), "store.db");
    writeFileSync(diagPathOf(db), "garbage-not-a-database", "utf8");

    const result = await runDev(["diag", "--db", db], testDeps());
    const error = assertError(result, "internal", EXIT.internal);
    expect(result.stdout).toEqual([]);
    expect(error.name).toBe("DiagUnavailableError");
    expect(error.details).toEqual({ reason: "open_failed" });

    assertError(await runDev(["diag"], testDeps()), "usage", EXIT.usage);
  });

  it("dimension 6 recourse (the DUMP face, plan §7.4 literal): a post-close rejected submit is in the dump, NOT in the closed stream", async () => {
    const db = join(tempDir(), "store.db");
    const deps = testDeps();
    const outs: string[] = [];
    const sink = { out: (l: string) => outs.push(l), err: () => undefined };
    expect(await runCli(["create", "--db", db, "--task", "t"], deps, sink)).toBe(EXIT.ok);
    const id = (JSON.parse(outs[0] ?? "") as { instanceId: string }).instanceId;
    expect(await runCli(["start", id, "--db", db], deps, sink)).toBe(EXIT.ok);
    expect(
      await runCli(
        ["submit", "--db", db, "--instance", id, "--type", "PASS", "--expected-version", "2", "--expected-role", "implementer", "--payload", '{"ref":"d"}'],
        deps,
        sink,
      ),
    ).toBe(EXIT.ok);
    expect(
      await runCli(
        ["submit", "--db", db, "--instance", id, "--type", "CONVERGED", "--expected-version", "3", "--expected-role", "reviewer"],
        deps,
        sink,
      ),
    ).toBe(EXIT.ok);

    // ch14-p3b: CONVERGED PARKS at the shipped gate, so the terminal
    // this lane's tail closes on is reached THROUGH the two operator
    // verbs — the same shipped entrypoint, no seam.
    expect(
      await runCli(["submit-decision", id, "--db", db, "--decision", "approve"], deps, sink),
    ).toBe(EXIT.ok);
    expect(await runCli(["resume", id, "--db", db, "--event", "COMMIT"], deps, sink)).toBe(
      EXIT.ok,
    );

    // The tail closes at the committed terminal (already-terminal run).
    const tailOut: string[] = [];
    expect(
      await runCli(["tail", id, "--db", db, "--diag"], testDeps(), {
        out: (l) => tailOut.push(l),
        err: () => undefined,
      }),
    ).toBe(EXIT.ok);
    const closedDiagRows = tailOut.filter(
      (line) => (JSON.parse(line) as { lane: string }).lane === "diag",
    );
    expect(closedDiagRows).toEqual([]);

    // Post-close: a rejected submit against the DONE instance (terminal
    // at v6 — the park, the decision and the resume each committed).
    expect(
      await runCli(
        ["submit", "--db", db, "--instance", id, "--type", "PASS", "--expected-version", "6", "--expected-role", "implementer"],
        testDeps(),
        { out: () => undefined, err: () => undefined },
      ),
    ).toBe(EXIT.notFound);

    // The query surface is the recourse: the dump shows it.
    const dump = await runDev(["diag", "--db", db], testDeps());
    expect(dump.code).toBe(EXIT.ok);
    const rows = JSON.parse(dump.stdout[0] ?? "") as DiagnosticEvent[];
    expect(rows).toHaveLength(1);
    expect(rows[0]?.kind).toBe("rejected");
    expect(rows[0]?.instanceId).toBe(id);
  });
});

describe("dev cli — wiring negatives (packet ch7-P4: C4/M11)", () => {
  it("C4: replay is hermetic — ZERO openDiagStore calls, no diag file", async () => {
    let opens = 0;
    const deps = testDeps({
      openDiagStore: (path, time) => {
        opens += 1;
        return openDiagStore(path, time);
      },
    });
    const file = writeJson("green-c4.json", {
      name: "c4 hermetic",
      steps: [
        { kind: "start", instanceId: "r1", task: "t", opId: "op-start", expect: { currentStep: "implement", version: 2 } },
        {
          kind: "emit",
          opId: "a1",
          type: "PASS",
          actorId: "codex",
          expectedVersion: 2,
          expectedRole: "implementer",
          payload: { ref: "d" },
          expect: { kind: "committed", version: 3 },
        },
      ],
      finalTranscript: [[1, "op-start"], [2, "a1"]],
      finalState: {
      currentStep: "review",
      round: 1,
      kernelStatus: "ACTIVE",
      terminalDisposition: null,
      version: 3,
    },
    });
    const result = await runDev(["replay", "--file", file], deps);
    expect(result.code).toBe(EXIT.ok);
    expect(opens).toBe(0);
    expect(existsSync(":memory:.diag.sqlite")).toBe(false);
  });

  it("M11: inject outcomes are byte-identical under a corrupt diag store (the sink swallows)", async () => {
    const seedTwo = async (): Promise<{ db: string; id: string }> => {
      const { db, id } = await seedDb();
      return { db, id };
    };
    const healthy = await seedTwo();
    const corrupt = await seedTwo();
    rmSync(diagPathOf(corrupt.db), { force: true });
    writeFileSync(diagPathOf(corrupt.db), "garbage-not-a-database", "utf8");

    const file = writeJson("m11-steps.json", {
      steps: [{ type: "PASS", expectedVersion: 3, expectedRole: "reviewer", payload: { ref: "d2" } }],
    });
    const h = await runDev(["inject", "--instance", healthy.id, "--file", file, "--db", healthy.db], testDeps());
    const c = await runDev(["inject", "--instance", corrupt.id, "--file", file, "--db", corrupt.db], testDeps());
    expect(c.code).toBe(h.code);
    expect(c.stdout).toEqual(h.stdout);
    expect(c.stderr).toEqual(h.stderr);
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

  it("diag dump through the real cli/dev/main.ts process (the derived config end-to-end)", { timeout: 30_000 }, async () => {
    const db = join(tempDir(), "store.db");
    stageDiagEvents(db, [
      {
        source: "kernel",
        kind: "internal_failure",
        instanceId: "inst-smoke",
        error: { name: "SmokeError", message: "smoke detail" },
      },
    ]);
    const tsxBin = join(process.cwd(), "..", "node_modules", ".bin", "tsx");
    const devMain = join(process.cwd(), "src", "cli", "dev", "main.ts");

    const result = await execFileAsync(tsxBin, [devMain, "diag", "--db", db]);
    const rows = JSON.parse(result.stdout.trim()) as DiagnosticEvent[];
    expect(rows).toHaveLength(1);
    expect(rows[0]?.error?.name).toBe("SmokeError");
  });
});

// ── packet ch11-P1: the dev CLI role surfaces (X1–X3, X5) ────────────

describe("dev cli — inject expectedRole (X1–X3)", () => {
  it("X2: an empty expectedRole is an InvalidInjectStep usage error", async () => {
    const { db } = await seedDb();
    const file = writeJson("inject-empty-role.json", {
      steps: [{ type: "PASS", expectedVersion: 3, expectedRole: "", payload: { ref: "d" } }],
    });
    assertError(
      await runDev(["inject", "--db", db, "--instance", "inst-1", "--file", file], testDeps()),
      "usage",
      EXIT.usage,
    );
  });

  it("X3: ABSENCE stages a missing_role probe — the rejection is a DATA row, exit 0", async () => {
    const { db, id } = await seedDb();
    const file = writeJson("inject-roleless.json", {
      steps: [{ type: "PASS", expectedVersion: 3, payload: { ref: "probe" } }],
    });
    const result = await runDev(
      ["inject", "--db", db, "--instance", id, "--file", file],
      testDeps(),
    );
    expect(result.code).toBe(EXIT.ok);
    expect(JSON.parse(result.stdout[0] ?? "")).toEqual({
      kind: "rejected",
      reason: "missing_role",
    });
  });
});

describe("dev cli — replay role schema (X5)", () => {
  const roleLiftFixture = {
    name: "x5 role lift round-trip",
    lift: { expectedRole: "supply-current-step-role" },
    steps: [
      { kind: "start", instanceId: "x5a", task: "t", opId: "op-start", expect: { currentStep: "implement", version: 2 } },
      {
        kind: "emit",
        opId: "a1",
        type: "PASS",
        actorId: "codex",
        expectedVersion: 2,
        payload: { ref: "d" },
        expect: { kind: "committed", version: 3 },
      },
    ],
    finalTranscript: [[1, "op-start"], [2, "a1"]],
    finalState: {
      currentStep: "review",
      round: 1,
      kernelStatus: "ACTIVE",
      terminalDisposition: null,
      version: 3,
    },
  };

  it("the role-lift axis round-trips (a liftless-role fixture commits via the current step's role)", async () => {
    const file = writeJson("x5-lift.json", roleLiftFixture);
    const result = await runDev(["replay", "--file", file], testDeps());
    expect(result.code).toBe(EXIT.ok);
  });

  it("an unknown emit-step key is still rejected (the keyset stays fail-closed)", async () => {
    const file = writeJson("x5-unknown.json", {
      ...roleLiftFixture,
      name: "x5 unknown key",
      steps: [
        roleLiftFixture.steps[0],
        { ...roleLiftFixture.steps[1], expectedRoll: "implementer" },
      ],
    });
    assertError(await runDev(["replay", "--file", file], testDeps()), "usage", EXIT.usage);
  });

  it("an unknown lift axis value is a usage error", async () => {
    const file = writeJson("x5-lift-bad.json", {
      ...roleLiftFixture,
      name: "x5 bad lift",
      lift: { expectedRole: "supply-wrong-thing" },
    });
    assertError(await runDev(["replay", "--file", file], testDeps()), "usage", EXIT.usage);
  });

  it("the WRONG-ROLE discriminator: an explicit wrong role must replay to role_not_authorized — a validator that silently dropped the field would let the (absent) lift backfill nothing and land missing_role, failing the lane", async () => {
    const file = writeJson("x5-wrong-role.json", {
      name: "x5 wrong role",
      steps: [
        { kind: "start", instanceId: "x5b", task: "t", opId: "op-start", expect: { currentStep: "implement", version: 2 } },
        {
          kind: "emit",
          opId: "w1",
          type: "PASS",
          actorId: "codex",
          expectedVersion: 2,
          expectedRole: "reviewer",
          payload: { ref: "d" },
          expect: { kind: "rejected", reason: "role_not_authorized" },
        },
      ],
      // The START commits the STARTED fact (seq 1); the wrong-role emit is
      // rejected and commits nothing.
      finalTranscript: [[1, "op-start"]],
      finalState: {
        currentStep: "implement",
        round: 1,
        kernelStatus: "ACTIVE",
        terminalDisposition: null,
        version: 2,
      },
    });
    const result = await runDev(["replay", "--file", file], testDeps());
    expect(result.code).toBe(EXIT.ok);
  });
});

// ── packet ch13-p1a (ch13v2-C18): the context-block surface's ONE issue
// code travels intact to the CLI's machine document, and NO other lane of
// this packet carries a code. Zero verb growth, zero flag growth — the
// lanes ride the standing validate channel as it is. ─────────────────────

/** A ch13-ONLY fixture: gate-free, so the only coded finding any lane can
 * produce is the context-block surface's own. `refs` is authored at the
 * role position (omitted entirely when empty, so no ref-list lane fires);
 * each catalog entry is `id: body` as authored. */
const ctxFile = (refs: readonly string[], catalog: readonly (readonly [string, string])[]): string => `ref:
  id: ctx-pair-v0
  version: 1
start: implement
steps:
  implement:
    role: implementer
    instruction: |-
      build it
    transitions:
      PASS: done
terminal:
  - done
roles:
  implementer:
    defaultActor: codex
${refs.length === 0 ? "" : `    defaultAgentConfig:\n      promptConcernRefs:\n${refs.map((ref) => `        - ${ref}\n`).join("")}`}contextBlocks:
${catalog.map(([id, body]) => `  ${id}:\n    body: ${body}\n`).join("")}`;

describe("dev cli — the ch13 code travel (packet ch13-p1a, ch13v2-C18)", () => {
  it("the CODE ARRIVES INTACT: the finding's `code` field equals unresolved_context_block_ref", async () => {
    const dir = tempDir();
    const path = join(dir, "ctx-bad.yaml");
    // one ref naming no entry, beside one entry that IS named — so the
    // hygiene lane stays silent and this document's only finding is the
    // coded one.
    writeFileSync(path, ctxFile(["alpha", "ghost"], [["alpha", "text"]]));
    const res = await runDev(["validate", path], testDeps());
    expect(res.stdout).toEqual([]);
    const err = assertError(res, "internal", EXIT.internal);
    expect(err.name).toBe("TemplateInvalid");
    const details = err.details as { stage: string; findings: { path: string; code?: string }[] };
    expect(details.stage).toBe("validate");
    // The VALUE of the code field, by equality — never mere presence.
    expect(details.findings).toEqual([
      {
        path: "roles.implementer.defaultAgentConfig.promptConcernRefs[1]",
        message: 'context block ref "ghost" does not resolve to an entry',
        code: "unresolved_context_block_ref",
      },
    ]);
    // VERBATIM: the doc's details deep-equal the pipeline's own result.
    const direct = loadTemplate(new Uint8Array(readFileSync(path)), { path, catalog: createGateRegistry() });
    expect(direct.ok).toBe(false);
    if (!direct.ok) {
      expect(details).toEqual({ stage: direct.error.stage, findings: direct.error.findings });
    }
  });

  it("the NEGATIVE TWIN: no OTHER lane of this surface carries a code", async () => {
    const dir = tempDir();
    // Every ch13 lane this packet owns except the resolution one: a
    // grammar-refused key, a body lane, an entry keyset lane, and the C9
    // hygiene lane. None may carry a `code`.
    const lanes: readonly [string, string][] = [
      ["bad-key", ctxFile([], [["Bad Key", "text"]])],
      ["bad-body", ctxFile([], [["alpha", "7"]])],
      ["unreferenced", ctxFile([], [["alpha", "text"]])],
    ];
    for (const [name, text] of lanes) {
      const path = join(dir, `${name}.yaml`);
      writeFileSync(path, text);
      const res = await runDev(["validate", path], testDeps());
      const err = assertError(res, "internal", EXIT.internal);
      const details = err.details as { stage: string; findings: { path: string; code?: string }[] };
      expect(details.findings.length, name).toBeGreaterThan(0);
      for (const finding of details.findings) {
        expect(Object.keys(finding).sort(), `${name} @ ${finding.path}`).toEqual(["message", "path"]);
      }
    }
  });

  it("the GATE schemas' named lanes keep the codes they always had", async () => {
    const dir = tempDir();
    const path = join(dir, "gated-bad.yaml");
    writeFileSync(path, gatedFile(true));
    const res = await runDev(["validate", path], testDeps());
    const err = assertError(res, "internal", EXIT.internal);
    const details = err.details as { stage: string; findings: { path: string; code?: string }[] };
    expect(details.findings.map((f) => f.code)).toEqual(["gate_evaluator_unavailable"]);
  });
});

// ── The NEGATIVE twin, PARAMETERIZED over family 1's inventory (packet
// row D9 / ch13v2-C18: "no other lane of this chapter may carry any
// code"). One document per lane of the context-block surface, driven
// through the same standing validate channel; a finding carries `code`
// IFF it is the resolution lane's. Sampling three lanes left a code
// added to the duplicate lane undetected — this drives them all. ────────

/** A ch13 document with the catalog, the role refs and the step's own
 * block authored verbatim, so a lane fixture reads as its own YAML. */
const ctxDoc = (parts: { catalog?: string; roleRefs?: string; stepExtra?: string }): string => `ref:
  id: ctx-lane-v0
  version: 1
start: s
steps:
  s:
    role: r
    instruction: |-
      build it
    transitions:
      GO: done
${parts.stepExtra ?? ""}terminal:
  - done
roles:
  r:
${parts.roleRefs === undefined ? "    defaultActor: codex\n" : `    defaultAgentConfig:\n      promptConcernRefs:\n${parts.roleRefs}`}${parts.catalog ?? ""}`;

const REFS = (...ids: readonly string[]): string => ids.map((id) => `        - ${id}\n`).join("");
const CAT = (body: string): string => `contextBlocks:\n${body}`;
const GATE_REFS = (refs: string): string =>
  `    gates:\n      GO:\n        - uses: declarative.threshold\n          config: { metric: round, op: ">=", value: 2 }\n          contextBlockRefs: ${refs}\n`;

/** `coded` is the number of findings that must carry the ch13 issue code;
 * every other finding of the document must carry none. */
const CTX_CLI_LANES: readonly { lane: string; doc: string; coded: number }[] = [
  { lane: "d-ctxblocks container", doc: ctxDoc({ catalog: "contextBlocks: 7\n" }), coded: 0 },
  { lane: "d-block-key grammar", doc: ctxDoc({ catalog: CAT("  Bad Key:\n    body: x\n") }), coded: 0 },
  { lane: "d-block-key nonempty", doc: ctxDoc({ catalog: CAT('  "":\n    body: x\n') }), coded: 0 },
  { lane: "d-block-key type (non-string)", doc: ctxDoc({ catalog: CAT("  true:\n    body: x\n") }), coded: 0 },
  { lane: "d-ctx-entry container", doc: ctxDoc({ catalog: CAT("  alpha: 7\n"), roleRefs: REFS("alpha") }), coded: 1 },
  {
    lane: "d-ctx-entry unknown key",
    doc: ctxDoc({ catalog: CAT("  alpha:\n    body: x\n    extra: 1\n"), roleRefs: REFS("alpha") }),
    coded: 1,
  },
  { lane: "d-ctx-entry missing key", doc: ctxDoc({ catalog: CAT("  alpha: {}\n"), roleRefs: REFS("alpha") }), coded: 1 },
  { lane: "d-ctx-body type", doc: ctxDoc({ catalog: CAT("  alpha:\n    body: 7\n"), roleRefs: REFS("alpha") }), coded: 1 },
  {
    lane: "d-ctx-body nonempty",
    doc: ctxDoc({ catalog: CAT('  alpha:\n    body: ""\n'), roleRefs: REFS("alpha") }),
    coded: 1,
  },
  { lane: "vc-blockidlist container (role)", doc: ctxDoc({ roleRefs: "" }), coded: 0 },
  {
    lane: "vc-blockidlist container (step)",
    doc: ctxDoc({ stepExtra: "    agentConfig:\n      promptConcernRefs: nope\n" }),
    coded: 0,
  },
  { lane: "vc-blockidlist container (gate)", doc: ctxDoc({ stepExtra: GATE_REFS("nope") }), coded: 0 },
  { lane: "vc-block-id member type", doc: ctxDoc({ roleRefs: REFS("7") }), coded: 0 },
  { lane: "vc-block-id member grammar", doc: ctxDoc({ roleRefs: REFS("Bad Ref") }), coded: 0 },
  { lane: "vc-block-id member nonempty", doc: ctxDoc({ roleRefs: REFS('""') }), coded: 0 },
  {
    lane: "vc-blockidlist duplicate",
    doc: ctxDoc({ catalog: CAT("  alpha:\n    body: x\n"), roleRefs: REFS("alpha", "alpha") }),
    coded: 0,
  },
  { lane: "vc-blockidlist resolution (THE coded lane)", doc: ctxDoc({ roleRefs: REFS("ghost") }), coded: 1 },
  { lane: "the C9 hygiene lane", doc: ctxDoc({ catalog: CAT("  alpha:\n    body: x\n") }), coded: 0 },
];

describe("dev cli — the ch13 code EXCLUSIVITY over family 1's whole inventory", () => {
  for (const { lane, doc, coded } of CTX_CLI_LANES) {
    it(`${lane}: exactly ${String(coded)} finding(s) carry a code, and only the ch13 one`, async () => {
      const dir = tempDir();
      const path = join(dir, "lane.yaml");
      writeFileSync(path, doc);
      const res = await runDev(["validate", path], testDeps());
      const err = assertError(res, "internal", EXIT.internal);
      expect(err.name).toBe("TemplateInvalid");
      const details = err.details as { stage: string; findings: { path: string; code?: string }[] };
      expect(details.findings.length, lane).toBeGreaterThan(0);
      const codes = details.findings.flatMap((f) => (f.code === undefined ? [] : [f.code]));
      expect(codes, lane).toStrictEqual(Array.from({ length: coded }, () => "unresolved_context_block_ref"));
    });
  }
});

// ── packet ch14-p1 family 5: the CODE's end-to-end TRAVEL. The carrier
// exists end to end already (`ValidationFinding.code` →
// `TemplateLoadError.toJSON`'s {stage, findings} document → this verb's
// coded-finding lane), so this packet adds lanes and no code. The
// assertion is on the code FIELD by EQUALITY — never presence, and never
// a containment over the serialized text. ────────────────────────────────

const ch14File = (over: { readonly target?: string; readonly kind?: string } = {}): string => `
ref:
  id: ch14-decision-v0
  version: 1
start: implement
steps:
  implement:
    role: implementer
    instruction: |-
      build it
    transitions:
      PASS: approval
  approval:
    type: humanGate
    role: operator
    instruction: |-
      approve or send back
    decisions:
      approve:
        target: ${over.target ?? "commit_pending"}
      request_rework:
        target: implement
        payload:
          instruction:
            required: true
  commit_pending:
    type: wait
    wait:
      kind: ${over.kind ?? "commit_pending"}
      resumeEvents:
        - COMMIT
    onResume:
      COMMIT: done
terminal:
  - done
roles:
  implementer:
    defaultActor: codex
  operator:
    defaultActor: human
`;

describe("dev cli — the ch14 decision codes travel to the far end of the document (packet ch14-p1, family 5)", () => {
  it("POSITIVE: a decision-gate fault's code arrives in the CLI document, asserted by VALUE on the `code` field", async () => {
    const dir = tempDir();
    const path = join(dir, "ch14-bad.yaml");
    writeFileSync(path, ch14File({ target: "ghost" }));
    const res = await runDev(["validate", path], testDeps());
    expect(res.stdout).toEqual([]);
    const err = assertError(res, "internal", EXIT.internal);
    expect(err.name).toBe("TemplateInvalid");
    const details = err.details as { stage: string; findings: { path: string; code?: string }[] };
    expect(details.stage).toBe("validate");
    const coded = details.findings.find((finding) => finding.path === "steps.approval.decisions.approve.target");
    expect(coded?.code).toBe("decision_target_unresolved");
  });

  it("NEGATIVE TWIN: an UNCODED ch14 lane arrives with NO code field at all", async () => {
    const dir = tempDir();
    const path = join(dir, "ch14-reserved.yaml");
    writeFileSync(path, ch14File({ kind: "human_decision" }));
    const res = await runDev(["validate", path], testDeps());
    const err = assertError(res, "internal", EXIT.internal);
    const details = err.details as { stage: string; findings: { path: string; code?: string }[] };
    const finding = details.findings.find((one) => one.path === "steps.commit_pending.wait.kind");
    expect(finding).toBeDefined();
    expect(finding).not.toHaveProperty("code");
  });

  it("DISCRIMINATES: the same file with the fault corrected validates clean", async () => {
    const dir = tempDir();
    const path = join(dir, "ch14-ok.yaml");
    writeFileSync(path, ch14File());
    const res = await runDev(["validate", path], testDeps());
    expect(res.code).toBe(EXIT.ok);
    expect(JSON.parse(res.stdout[0] ?? "")).toEqual({
      valid: true,
      ref: { id: "ch14-decision-v0", version: 1 },
    });
  });
});
