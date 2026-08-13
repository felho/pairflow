import { execFile } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import { afterEach, describe, expect, it } from "vitest";

import { loadTemplate } from "../definition/index.js";
import type { DiagStoreHandle } from "../diag/index.js";
import { DiagUnavailableError, openDiagStore } from "../diag/index.js";
import type { DiagnosticEvent, DiagnosticEventBody } from "../ports/diagnostics.js";
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
  openDiagStore?: CliDeps["openDiagStore"];
}

function testDeps(options: TestDepsOptions = {}): CliDeps {
  let ids = 0;
  return {
    openStore: (path, time) => openStore(path, time),
    openDiagStore: options.openDiagStore ?? ((path, time) => openDiagStore(path, time)),
    time: createControlledClock(1_000),
    instanceIdSource: () => {
      ids += 1;
      return `inst-${String(ids)}`;
    },
    nonceSource: options.nonce ?? (() => `nonce-${String((ids += 1))}`),
    tailWait: () => createScriptedTailWait(options.tailSteps ?? []).wait,
    // The A4 sweep (packet ch8-P2): the builtin store retired — every
    // start/submit needs the templates-dir lane; the default deps ride
    // the ENV leg on the repo's canonical templates dir (A1's env leg,
    // exercised by every seeded test). Tests overriding env re-state it
    // (or deliberately omit it — the A1 missing lane).
    env: options.env ?? { PAIRFLOW_V3_TEMPLATES: join(process.cwd(), "templates") },
    // packet ch9-p4b (T1): the additive CliDeps growth — deterministic in the
    // suite (the runner plane's attempt/worker ids and the attach exec seam;
    // the detail/swap lanes here never reach runInteractive).
    attemptIdSource: () => `attempt-${String((ids += 1))}`,
    workerIdSource: () => `cli-worker-${String((ids += 1))}`,
    runInteractive: () => Promise.resolve(0),
  };
}

/** The derived diag-DB sibling (packet ch7-P4, C1). */
function diagPathOf(db: string): string {
  return `${db}.diag.sqlite`;
}

/** Stages R3-valid bodies into the REAL diag store on the derived path
 * (the P3 direct-sink.emit staging culture). */
function stageDiagEvents(db: string, bodies: readonly DiagnosticEventBody[]): void {
  const handle = openDiagStore(diagPathOf(db), createControlledClock(2_000));
  for (const body of bodies) {
    handle.sink.emit(body);
  }
  handle.close();
}

type TailLine =
  | { lane: "committed"; row: { seq: number } }
  | { lane: "diag"; event: DiagnosticEvent };

function tailLines(result: Run): TailLine[] {
  return result.stdout.map((line) => JSON.parse(line) as TailLine);
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

/**
 * ch13-p1b (ch13v2-C16): the shipped catalog entry's body, TRANSCRIBED
 * from the canonical `v3/templates/local-pair-v0@1.yaml` — the authored
 * source. Never computed through the render under test and never pasted
 * from a failing run: the subject of this growth is ORDER and CONTENT,
 * and a pasted expectation would assert the implementation against
 * itself.
 */
const EMIT_ENVELOPE_BODY = [
  "How to emit an operation.",
  "",
  "Your dispatch packet is a JSON file; its path is in the",
  "PAIRFLOW_PACKET environment variable. It carries your task,",
  "your instruction, and availableOps — the operation types",
  "this step can move on.",
  "",
  "To emit, write ONE JSON object to the path in the",
  "PAIRFLOW_EMIT environment variable, with EXACTLY two keys:",
  "",
  '  { "type": "<one of availableOps>", "payload": <your result> }',
  "",
  "Nothing else is read. Extra keys, a missing payload, or an",
  "unparseable file are taken as producing NO OUTPUT AT ALL —",
  "silently, with nothing to correct. A well-formed emit can",
  "still be rejected — the type may not be in availableOps, or",
  "your role may not be authorized to emit it here — and the",
  "rejection says which.",
].join("\n");

/** ch12-P4: the create→start sequence replaces the retired C25 bridge —
 * `create` is genesis (the Created doc carries the minted instance id),
 * `start` is the real single-op START (the `activated` doc). */
async function startOne(db: string, deps: CliDeps): Promise<string> {
  const created = await run(["create", "--db", db, "--task", "t"], deps);
  expect(created.code).toBe(EXIT.ok);
  const createdDoc = JSON.parse(created.stdout[0] ?? "") as {
    kind: string;
    instanceId: string;
    version: number;
  };
  // `create` emits the Created outcome as data — the minted instance id is
  // surfaced on stdout for scripting the create→start sequence (V2). The
  // EXACT keyset proves creation is genesis: NO `op_id` (creation mints only
  // the instance id — a leaked op_id would fail this assert).
  expect(Object.keys(createdDoc).sort()).toEqual(["instanceId", "kind", "version"]);
  expect(createdDoc.kind).toBe("created");
  expect(typeof createdDoc.instanceId).toBe("string");
  expect(createdDoc.instanceId).not.toBe("");
  expect(createdDoc.version).toBe(1);
  const id = createdDoc.instanceId;

  const started = await run(["start", id, "--db", db], deps);
  expect(started.code).toBe(EXIT.ok);
  // `start` emits the START `activated` outcome — asserted by FULL equality:
  // genesis v1 + the activation commit ⇒ version 2, and the first dispatch's
  // ContextPacket for the implement step (task "t", role implementer, the
  // canonical template's instruction + availableOps).
  const doc = JSON.parse(started.stdout[0] ?? "") as { instanceId: string };
  expect(doc).toEqual({
    kind: "activated",
    instanceId: id,
    version: 2,
    intent: {
      actor: "codex",
      packet: {
        instanceId: id,
        expectedVersion: 2,
        task: "t",
        role: "implementer",
        instruction: "build it",
        availableOps: ["PASS"],
        // ch12-p2 (E1) + ch13-p1b: the resolved run profile. The
        // canonical template's only authored agent config is the role
        // default carrying the catalog ref — and the normalizer's lift
        // COPIES rather than moves, so that authored key survives at its
        // own position and rides the ch12 cascade. The ref therefore
        // lands at BOTH positions: here, and in the rendered blocks below.
        effectiveAgentConfig: { promptConcernRefs: ["emit-envelope"] },
        // ch13-p1b: the rendered blocks — the canonical template's
        // shipped catalog entry, reached from the role config.
        contextBlocks: [
          {
            id: "emit-envelope",
            body: EMIT_ENVELOPE_BODY,
            provenance: { sources: [{ source: "role_config" }] },
          },
        ],
        // ch12-p3 (E1): a context-free run — the explicit `none`.
        runtimeContext: "none",
      },
    },
  });
  return id;
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
      instance: { instanceId: string; kernelStatus: string; terminalDisposition: string | null };
      transcript: { entryKind: string; seq: number; opId: string }[];
    };
    expect(doc.instance.kernelStatus).toBe("ACTIVE");
    expect(doc.instance.terminalDisposition).toBeNull();
    // `start` stamps the STARTED lifecycle fact at seq 1 — every run's
    // transcript begins with it (opId is the start-minted nonce).
    expect(doc.transcript).toHaveLength(1);
    expect(doc.transcript[0]?.entryKind).toBe("STARTED");
    expect(doc.transcript[0]?.seq).toBe(1);
    expect(typeof doc.transcript[0]?.opId).toBe("string");
    expect(doc.transcript[0]?.opId).not.toBe("");
  });

  it("create parse contract: bad template ref → 2; unknown template → 3; bad/unknown override → 2 (+validRoles)", async () => {
    const db = tempDbPath();
    // ch12-P4: template-ref parsing + `--override` binding parsing moved to
    // `create` (the genesis verb pins the ref and binds actors).
    assertErrorContract(
      await run(["create", "--db", db, "--task", "t", "--template", "nope"], testDeps()),
      "usage",
      EXIT.usage,
    );
    assertErrorContract(
      await run(["create", "--db", db, "--task", "t", "--template", "ghost@1"], testDeps()),
      "not_found",
      EXIT.notFound,
    );
    assertErrorContract(
      await run(["create", "--db", db, "--task", "t", "--override", "reviewer"], testDeps()),
      "usage",
      EXIT.usage,
    );
    const unknownRole = await run(
      ["create", "--db", db, "--task", "t", "--override", "ghost=claude"],
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
      ["submit", "--db", db, "--instance", id, "--type", "PASS", "--expected-version", "2", "--expected-role", "implementer", "--payload", '{"ref":"d1"}'],
      deps,
    );
    expect(committed.code).toBe(EXIT.ok);
    expect((JSON.parse(committed.stdout[0] ?? "") as { kind: string }).kind).toBe("committed");
    expect(committed.stderr).toEqual([]);

    const stale = await run(
      ["submit", "--db", db, "--instance", id, "--type", "PASS", "--expected-version", "2", "--expected-role", "implementer", "--payload", '{"ref":"d2"}'],
      deps,
    );
    expect(stale.code).toBe(EXIT.notFound);
    expect((JSON.parse(stale.stdout[0] ?? "") as { kind: string }).kind).toBe("stale");
    expect(stale.stderr).toEqual([]);

    const rejected = await run(
      ["submit", "--db", db, "--instance", id, "--type", "NOPE", "--expected-version", "3", "--expected-role", "reviewer"],
      deps,
    );
    expect(rejected.code).toBe(EXIT.notFound);
    expect((JSON.parse(rejected.stdout[0] ?? "") as { kind: string }).kind).toBe("rejected");
  });

  it("ADR-004 operator nonce: a fixed nonce re-derives the same op_id → duplicate = exit 0", async () => {
    const db = tempDbPath();
    // `start` mints its own op_id from the nonce source too, so seed with a
    // FRESH nonce — the fixed nonce is the artifice that makes the two
    // SUBMITS collide onto one op_id (the lane under test).
    const id = await startOne(db, testDeps());
    const deps = testDeps({ nonce: () => "nonce-fixed" });
    const args = [
      "submit", "--db", db, "--instance", id, "--type", "PASS", "--expected-version", "2", "--expected-role", "implementer", "--payload", '{"ref":"d"}',
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
      ["submit", "--db", db, "--instance", id, "--type", "PASS", "--expected-version", "2", "--expected-role", "implementer"],
      deps,
    );
    expect(noPayload.code).toBe(EXIT.ok);
    const nullPayload = await run(
      ["submit", "--db", db, "--instance", id, "--type", "PASS", "--expected-version", "3", "--expected-role", "reviewer", "--payload", "null"],
      deps,
    );
    expect(nullPayload.code).toBe(EXIT.ok);

    const detail = await run(["detail", id, "--db", db], deps);
    const doc = JSON.parse(detail.stdout[0] ?? "") as {
      transcript: { envelope?: Record<string, unknown> }[];
    };
    // Transcript index 0 is the STARTED fact (no envelope); the two
    // transition rows follow at indices 1 and 2.
    expect("payload" in (doc.transcript[1]?.envelope ?? {})).toBe(false);
    expect(doc.transcript[2]?.envelope?.["payload"]).toBeNull();

    assertErrorContract(
      await run(
        ["submit", "--db", db, "--instance", id, "--type", "PASS", "--expected-version", "4", "--expected-role", "implementer", "--payload", "{bad"],
        deps,
      ),
      "usage",
      EXIT.usage,
    );
    assertErrorContract(
      await run(
        ["submit", "--db", db, "--instance", id, "--type", "PASS", "--expected-version", "1.5", "--expected-role", "implementer"],
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
      ["submit", "--db", db, "--instance", id, "--type", "PASS", "--expected-version", "2", "--expected-role", "implementer", "--payload", '{"ref":"d"}'],
      deps,
    );

    const rows = await run(["timeline", id, "--db", db], deps);
    expect(rows.code).toBe(EXIT.ok);
    // seq 1 is the STARTED fact, seq 2 the PASS transition.
    expect((JSON.parse(rows.stdout[0] ?? "") as { seq: number }[]).map((r) => r.seq)).toEqual([1, 2]);

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

  it("dim8 (ch11-P2b): detail AND timeline rows carry gateDecisions [] on an ungated run", async () => {
    const db = tempDbPath();
    const deps = testDeps();
    const id = await startOne(db, deps);
    await run(
      ["submit", "--db", db, "--instance", id, "--type", "PASS", "--expected-version", "2", "--expected-role", "implementer", "--payload", '{"ref":"d"}'],
      deps,
    );

    // gateDecisions rides the transition rows only — the STARTED fact row
    // carries no gate lane, so filter to the transition class.
    const detail = await run(["detail", id, "--db", db], deps);
    const detailDoc = JSON.parse(detail.stdout[0] ?? "") as {
      transcript: { entryKind: string; gateDecisions?: unknown }[];
    };
    expect(
      detailDoc.transcript.filter((r) => r.entryKind === "transition").map((r) => r.gateDecisions),
    ).toEqual([[]]);

    const timeline = await run(["timeline", id, "--db", db], deps);
    const rows = JSON.parse(timeline.stdout[0] ?? "") as { entryKind: string; gateDecisions?: unknown }[];
    expect(
      rows.filter((r) => r.entryKind === "transition").map((r) => r.gateDecisions),
    ).toEqual([[]]);
  });

  it("bundle: default policy — payload markers appear NOWHERE (REV-BUNDLE-DEFAULT-POLICY)", async () => {
    const db = tempDbPath();
    const deps = testDeps();
    const id = await startOne(db, deps);
    await run(
      ["submit", "--db", db, "--instance", id, "--type", "PASS", "--expected-version", "2", "--expected-role", "implementer", "--payload", '{"secret":"MARKER_CLI_DELTA_4b"}'],
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

  it("bundle on the WIRED channel (ch7-P4 C5/V4/C1): fresh → present []; a real rejected submit → present rows; the sibling file appears", async () => {
    const db = tempDbPath();
    const deps = testDeps();
    const id = await startOne(db, deps);

    // C5: a wired channel's empty store is KNOWN-EMPTY, never the X1
    // interim unavailable(open_failed) — that state ceased to exist here.
    const fresh = await run(["bundle", id, "--db", db], deps);
    expect(fresh.code).toBe(EXIT.ok);
    const freshDoc = JSON.parse(fresh.stdout[0] ?? "") as { rejectedInputs: unknown };
    expect(freshDoc.rejectedInputs).toEqual({ status: "present", rows: [] });
    // C1 sibling placement: the derived diag DB sits beside the main DB.
    expect(existsSync(diagPathOf(db))).toBe(true);

    // V5→V4 pass-through: a REAL rejected submit lands in the diag store
    // and surfaces as an attributed bundle row.
    const rejected = await run(
      ["submit", "--db", db, "--instance", id, "--type", "NOPE", "--expected-version", "2", "--expected-role", "implementer"],
      deps,
    );
    expect(rejected.code).toBe(EXIT.notFound);
    const bundle = await run(["bundle", id, "--db", db], deps);
    expect(bundle.code).toBe(EXIT.ok);
    const doc = JSON.parse(bundle.stdout[0] ?? "") as {
      rejectedInputs: { status: string; rows: { kind: string; reason?: string }[] };
    };
    expect(doc.rejectedInputs.status).toBe("present");
    expect(doc.rejectedInputs.rows).toHaveLength(1);
    expect(doc.rejectedInputs.rows[0]?.kind).toBe("rejected");
    expect(doc.rejectedInputs.rows[0]?.reason).toBe("no_transition");
  });

  it("bundle under a corrupt diag store (M10): section = unavailable(reason), the bundle SUCCEEDS at exit 0", async () => {
    const db = tempDbPath();
    const deps = testDeps();
    const id = await startOne(db, deps);
    writeFileSync(diagPathOf(db), "garbage-not-a-database", "utf8");

    const bundle = await run(["bundle", id, "--db", db], deps);
    expect(bundle.code).toBe(EXIT.ok);
    expect(bundle.stderr).toEqual([]);
    const doc = JSON.parse(bundle.stdout[0] ?? "") as { rejectedInputs: unknown };
    expect(doc.rejectedInputs).toEqual({ status: "unavailable", reason: "open_failed" });
  });

  it("tail: NDJSON rows on stdout, completion on terminal; error lanes → 3 / 2", async () => {
    const db = tempDbPath();
    const setupDeps = testDeps();
    const id = await startOne(db, setupDeps);
    await run(
      ["submit", "--db", db, "--instance", id, "--type", "PASS", "--expected-version", "2", "--expected-role", "implementer", "--payload", '{"ref":"d1"}'],
      setupDeps,
    );

    // The scripted wait's step commits CONVERGED cross-handle (a second
    // runCli on the same WAL file) — then the tail must complete.
    const tailDeps = testDeps({
      tailSteps: [
        async () => {
          const converge = await run(
            ["submit", "--db", db, "--instance", id, "--type", "CONVERGED", "--expected-version", "3", "--expected-role", "reviewer"],
            testDeps(),
          );
          expect(converge.code).toBe(EXIT.ok);
        },
      ],
    });
    const tail = await run(["tail", id, "--db", db], tailDeps);
    expect(tail.code).toBe(EXIT.ok);
    expect(tail.stderr).toEqual([]);
    // seq 1 STARTED, seq 2 PASS, seq 3 CONVERGED.
    const seqs = tail.stdout.map((line) => (JSON.parse(line) as { seq: number }).seq);
    expect(seqs).toEqual([1, 2, 3]);

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
    // ch12-P4: the id is MINTED at `create` (genesis), so the collision
    // surfaces there — a fixed id re-created is the store's creation-
    // uniqueness THROW, internal 1 (never the binding-coverage usage lane).
    const deps: CliDeps = { ...testDeps(), instanceIdSource: () => "inst-fixed" };
    expect((await run(["create", "--db", db, "--task", "t"], deps)).code).toBe(EXIT.ok);
    assertErrorContract(
      await run(["create", "--db", db, "--task", "t"], deps),
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
        ["submit", "--db", db, "--instance", id, "--type", "PASS", "--expected-version", " ", "--expected-role", "implementer"],
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
      ["submit", "--db", db, "--instance", id, "--type", "PASS", "--expected-version", "2", "--expected-role", "implementer", "--payload", '{"ref":"d"}'],
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
    // Both committed rows (STARTED seq 1, PASS seq 2) drain before the
    // wait throws; they stay parseable on stdout.
    expect(result.stdout).toHaveLength(2);
    expect((JSON.parse(result.stdout[0] ?? "") as { seq: number }).seq).toBe(1);
    expect(result.stderr).toHaveLength(1);
    expect((JSON.parse(result.stderr[0] ?? "") as CliErrorDoc).error.class).toBe("internal");
  });
});

describe("cli — tail --diag (packet ch7-P4: V1/M1–M8/F1–F2)", () => {
  /** Drives the builtin template to its terminal: PASS@1 → CONVERGED@2. */
  async function startAndConverge(db: string, deps: CliDeps): Promise<string> {
    const id = await startOne(db, deps);
    expect(
      (await run(["submit", "--db", db, "--instance", id, "--type", "PASS", "--expected-version", "2", "--expected-role", "implementer", "--payload", '{"ref":"d"}'], deps)).code,
    ).toBe(EXIT.ok);
    expect(
      (await run(["submit", "--db", db, "--instance", id, "--type", "CONVERGED", "--expected-version", "3", "--expected-role", "reviewer"], deps)).code,
    ).toBe(EXIT.ok);
    return id;
  }

  it("V1/M1: two-lane NDJSON — history + LIVE diag via the real sink, completion on terminal, exit 0", async () => {
    const db = tempDbPath();
    const setupDeps = testDeps();
    const id = await startOne(db, setupDeps);
    await run(
      ["submit", "--db", db, "--instance", id, "--type", "PASS", "--expected-version", "2", "--expected-role", "implementer", "--payload", '{"ref":"d1"}'],
      setupDeps,
    );
    // Pre-tail diag history: a REAL rejected submit through the wired sink.
    const preReject = await run(
      ["submit", "--db", db, "--instance", id, "--type", "NOPE", "--expected-version", "3", "--expected-role", "reviewer"],
      setupDeps,
    );
    expect(preReject.code).toBe(EXIT.notFound);

    const tailDeps = testDeps({
      tailSteps: [
        async () => {
          // Mid-tail LIVE diag event: another real rejected submit.
          const midReject = await run(
            ["submit", "--db", db, "--instance", id, "--type", "NOPE", "--expected-version", "3", "--expected-role", "reviewer"],
            testDeps(),
          );
          expect(midReject.code).toBe(EXIT.notFound);
        },
        async () => {
          expect(
            (await run(["submit", "--db", db, "--instance", id, "--type", "CONVERGED", "--expected-version", "3", "--expected-role", "reviewer"], testDeps())).code,
          ).toBe(EXIT.ok);
        },
      ],
    });
    const tail = await run(["tail", id, "--db", db, "--diag"], tailDeps);
    expect(tail.code).toBe(EXIT.ok);
    expect(tail.stderr).toEqual([]);
    const lines = tailLines(tail);
    // Every row carries the lane discriminator (V1).
    expect(lines.every((l) => l.lane === "committed" || l.lane === "diag")).toBe(true);
    const committed = lines.filter((l) => l.lane === "committed");
    const diag = lines.filter((l) => l.lane === "diag");
    // seq 1 STARTED, seq 2 PASS, seq 3 CONVERGED.
    expect(committed.map((l) => (l as { row: { seq: number } }).row.seq)).toEqual([1, 2, 3]);
    expect(diag).toHaveLength(2);
    for (const line of diag) {
      const event = (line as { event: DiagnosticEvent }).event;
      expect(event.kind).toBe("rejected");
      expect(event.reason).toBe("no_transition");
      expect(typeof event.ordinal).toBe("number");
      expect(typeof event.at).toBe("number");
    }
  });

  it("dimension 1 tail-side full-event lane: an internal_failure's error.message rides INTACT (local surface)", async () => {
    const db = tempDbPath();
    const deps = testDeps();
    const id = await startAndConverge(db, deps);
    stageDiagEvents(db, [
      {
        source: "kernel",
        kind: "internal_failure",
        instanceId: id,
        error: { name: "BoomError", message: "boom detail with context" },
      },
    ]);

    const tail = await run(["tail", id, "--db", db, "--diag"], testDeps());
    expect(tail.code).toBe(EXIT.ok);
    const diag = tailLines(tail).filter((l) => l.lane === "diag");
    expect(diag).toHaveLength(1);
    const event = (diag[0] as { event: DiagnosticEvent }).event;
    expect(event.error).toEqual({ name: "BoomError", message: "boom detail with context" });
  });

  it("M2 at-start + M4 combination: corrupt diag → DiagUnavailableError doc / 1; unknown id + corrupt diag → 3", async () => {
    const db = tempDbPath();
    const deps = testDeps();
    const id = await startOne(db, deps);
    writeFileSync(diagPathOf(db), "garbage-not-a-database", "utf8");

    const result = await run(["tail", id, "--db", db, "--diag"], testDeps());
    assertErrorContract(result, "internal", EXIT.internal);
    expect(result.stdout).toEqual([]);
    const doc = errorDoc(result);
    expect(doc.name).toBe("DiagUnavailableError");
    expect(doc.details).toEqual({ reason: "open_failed" });

    // M4: the committed fetch runs FIRST (P3 E3) — unknown id wins over
    // the corrupt diag store, and the CLI cannot reorder (one iteration).
    assertErrorContract(
      await run(["tail", "ghost", "--db", db, "--diag"], testDeps()),
      "not_found",
      EXIT.notFound,
    );
  });

  it("M3 mid-stream diag failure: prior rows stay parseable, ONE stderr doc, exit 1", async () => {
    const db = tempDbPath();
    const setupDeps = testDeps();
    const id = await startOne(db, setupDeps);
    await run(
      ["submit", "--db", db, "--instance", id, "--type", "PASS", "--expected-version", "2", "--expected-role", "implementer", "--payload", '{"ref":"d"}'],
      setupDeps,
    );

    let reads = 0;
    const scripted: DiagStoreHandle = {
      sink: { emit: () => undefined },
      reader: {
        getDiagnostics: () => {
          reads += 1;
          return reads === 1
            ? Promise.resolve([])
            : Promise.reject(new DiagUnavailableError("read_failed"));
        },
        getGlobalDiagnostics: () => Promise.resolve([]),
      },
      close: () => undefined,
    };
    const deps = testDeps({ openDiagStore: () => scripted, tailSteps: [() => undefined] });
    const result = await run(["tail", id, "--db", db, "--diag"], deps);
    expect(result.code).toBe(EXIT.internal);
    // Round 1 yields both committed rows (STARTED seq 1, PASS seq 2)
    // before the second diag read rejects.
    expect(result.stdout).toHaveLength(2);
    expect((JSON.parse(result.stdout[0] ?? "") as { lane: string }).lane).toBe("committed");
    expect(result.stderr).toHaveLength(1);
    const doc = (JSON.parse(result.stderr[0] ?? "") as CliErrorDoc).error;
    expect(doc.name).toBe("DiagUnavailableError");
    expect(doc.details).toEqual({ reason: "read_failed" });
  });

  it("M6: a NON-typed reader failure propagates to the catch-all — internal / 1 with the error's OWN name", async () => {
    const db = tempDbPath();
    const setupDeps = testDeps();
    const id = await startOne(db, setupDeps);

    const scripted: DiagStoreHandle = {
      sink: { emit: () => undefined },
      reader: {
        getDiagnostics: () => Promise.reject(new Error("kaboom — not a typed diag error")),
        getGlobalDiagnostics: () => Promise.resolve([]),
      },
      close: () => undefined,
    };
    const result = await run(
      ["tail", id, "--db", db, "--diag"],
      testDeps({ openDiagStore: () => scripted }),
    );
    assertErrorContract(result, "internal", EXIT.internal);
    expect(errorDoc(result).name).toBe("Error");
  });

  it("F2/M7/M8: --from-ordinal parses lexically, skips delivered events, and is REJECTED without --diag", async () => {
    const db = tempDbPath();
    const deps = testDeps();
    const id = await startAndConverge(db, deps);
    stageDiagEvents(db, [
      { source: "kernel", kind: "internal_failure", instanceId: id, error: { name: "E1", message: "first" } },
      { source: "kernel", kind: "internal_failure", instanceId: id, error: { name: "E2", message: "second" } },
    ]);

    // M7: the CLI parse lane (lexical, the shared helper — no new validator).
    assertErrorContract(
      await run(["tail", id, "--db", db, "--diag", "--from-ordinal", "1.5"], testDeps()),
      "usage",
      EXIT.usage,
    );
    // M8: presence-checked coupling — the value 0 is red too.
    assertErrorContract(
      await run(["tail", id, "--db", db, "--from-ordinal", "0"], testDeps()),
      "usage",
      EXIT.usage,
    );

    // The skip lane: ordinal ≤ 1 is excluded (`ordinal > fromOrdinal`).
    const skipped = await run(["tail", id, "--db", db, "--diag", "--from-ordinal", "1"], testDeps());
    expect(skipped.code).toBe(EXIT.ok);
    const diag = tailLines(skipped).filter((l) => l.lane === "diag");
    expect(diag).toHaveLength(1);
    expect((diag[0] as { event: DiagnosticEvent }).event.error?.name).toBe("E2");
  });

  it("dimension 3 RESUME COMBINATION (aftermath): --from + --from-ordinal together — each lane honors ITS cursor", async () => {
    const db = tempDbPath();
    const deps = testDeps();
    const id = await startAndConverge(db, deps); // committed seq 1 STARTED, 2 PASS, 3 CONVERGED
    stageDiagEvents(db, [
      { source: "kernel", kind: "internal_failure", instanceId: id, error: { name: "E1", message: "first" } },
      { source: "kernel", kind: "internal_failure", instanceId: id, error: { name: "E2", message: "second" } },
    ]);

    // A swapped or dropped cursor wiring cannot pass BOTH assertions
    // at once (the combination-lane heuristic — flag 1's "both
    // cursors" resumability ground driven as ONE invocation).
    const resumed = await run(
      ["tail", id, "--db", db, "--diag", "--from", "1", "--from-ordinal", "1"],
      testDeps(),
    );
    expect(resumed.code).toBe(EXIT.ok);
    const lines = tailLines(resumed);
    const committed = lines.filter((l) => l.lane === "committed");
    const diag = lines.filter((l) => l.lane === "diag");
    // --from 1 skips the STARTED fact (seq 1); the PASS/CONVERGED rows follow.
    expect(committed.map((l) => (l as { row: { seq: number } }).row.seq)).toEqual([2, 3]);
    expect(diag).toHaveLength(1);
    expect((diag[0] as { event: DiagnosticEvent }).event.error?.name).toBe("E2");
  });

  it("F1 representative negative (aftermath): --diag on a NON-tail verb → usage 2", async () => {
    const db = tempDbPath();
    assertErrorContract(
      await run(["list", "--db", db, "--diag"], testDeps()),
      "usage",
      EXIT.usage,
    );
  });
});

describe("cli — write-path wiring + separation (packet ch7-P4: V5/M11/C3/dimension 8)", () => {
  it("M11: start/submit outcomes and exits are byte-identical under a corrupt diag store (the sink swallows)", async () => {
    const healthyDb = tempDbPath();
    const corruptDb = tempDbPath();
    writeFileSync(diagPathOf(corruptDb), "garbage-not-a-database", "utf8");

    const runFlow = async (db: string): Promise<{ outs: string[]; codes: number[] }> => {
      const deps = testDeps();
      const outs: string[] = [];
      const codes: number[] = [];
      const record = (r: Run): void => {
        outs.push(...r.stdout);
        codes.push(r.code);
      };
      record(await run(["create", "--db", db, "--task", "t"], deps));
      const id = "inst-1";
      record(await run(["start", id, "--db", db], deps));
      record(
        await run(
          ["submit", "--db", db, "--instance", id, "--type", "PASS", "--expected-version", "2", "--expected-role", "implementer", "--payload", '{"ref":"d"}'],
          deps,
        ),
      );
      record(
        await run(["submit", "--db", db, "--instance", id, "--type", "NOPE", "--expected-version", "3", "--expected-role", "reviewer"], deps),
      );
      return { outs, codes };
    };

    const healthy = await runFlow(healthyDb);
    const corrupt = await runFlow(corruptDb);
    expect(corrupt.outs).toEqual(healthy.outs);
    expect(corrupt.codes).toEqual(healthy.codes);
  });

  it("C3: committed-only verbs NEVER create the diag file", async () => {
    const db = tempDbPath();
    const deps = testDeps();
    const id = await startOne(db, deps);
    await run(
      ["submit", "--db", db, "--instance", id, "--type", "PASS", "--expected-version", "2", "--expected-role", "implementer", "--payload", '{"ref":"d"}'],
      deps,
    );
    await run(["submit", "--db", db, "--instance", id, "--type", "CONVERGED", "--expected-version", "3", "--expected-role", "reviewer"], deps);
    // The write verbs ARE diag verbs — remove their sibling so the
    // committed-only reads run against a diag-free path.
    rmSync(diagPathOf(db), { force: true });

    expect((await run(["list", "--db", db], deps)).code).toBe(EXIT.ok);
    expect((await run(["detail", id, "--db", db], deps)).code).toBe(EXIT.ok);
    expect((await run(["timeline", id, "--db", db], deps)).code).toBe(EXIT.ok);
    // The plain tail (V2) — already-terminal, zero waits, no diag open.
    expect((await run(["tail", id, "--db", db], testDeps())).code).toBe(EXIT.ok);
    expect(existsSync(diagPathOf(db))).toBe(false);
  });

  it("dimension 8: list + plain tail outputs are byte-identical beside a corrupt diag file", async () => {
    const seed = async (db: string): Promise<string> => {
      const deps = testDeps();
      const id = await startOne(db, deps);
      await run(
        ["submit", "--db", db, "--instance", id, "--type", "PASS", "--expected-version", "2", "--expected-role", "implementer", "--payload", '{"ref":"d"}'],
        deps,
      );
      await run(["submit", "--db", db, "--instance", id, "--type", "CONVERGED", "--expected-version", "3", "--expected-role", "reviewer"], deps);
      return id;
    };
    const healthyDb = tempDbPath();
    const corruptDb = tempDbPath();
    const idH = await seed(healthyDb);
    const idC = await seed(corruptDb);
    writeFileSync(diagPathOf(corruptDb), "garbage-not-a-database", "utf8");

    const listH = await run(["list", "--db", healthyDb], testDeps());
    const listC = await run(["list", "--db", corruptDb], testDeps());
    expect(listC.stdout).toEqual(listH.stdout);
    expect(listC.code).toBe(listH.code);

    const tailH = await run(["tail", idH, "--db", healthyDb], testDeps());
    const tailC = await run(["tail", idC, "--db", corruptDb], testDeps());
    expect(tailC.stdout).toEqual(tailH.stdout);
    expect(tailC.code).toBe(tailH.code);
  });
});

// ── packet ch8-P2: the templates-dir lane + write-lane dispositions ──

const REPO_TEMPLATES = join(process.cwd(), "templates");
const CANONICAL_BYTES = (): string =>
  readFileSync(join(REPO_TEMPLATES, "local-pair-v0@1.yaml"), "utf8");

/** Stages RAW yaml text files into a fresh temp templates dir
 * (R-RAW-FIXTURES: hostile values ride raw text, never a serializer). */
function stageTemplates(files: Readonly<Record<string, string>>): string {
  const dir = mkdtempSync(join(tmpdir(), "v3-tpl-"));
  dirs.push(dir);
  for (const [name, body] of Object.entries(files)) {
    writeFileSync(join(dir, name), body);
  }
  return dir;
}

describe("cli — the templates-dir config lane (packet ch8-P2: A1/A2/A3)", () => {
  it("A1: --templates-dir beats env; env-only works; both missing → usage 2 MissingTemplatesDir", async () => {
    // flag beats env: env points at an EMPTY dir (a miss there would be
    // exit 3), the flag at the repo dir → the flag's dir served.
    const emptyDir = stageTemplates({});
    const flagWins = await run(
      ["create", "--db", tempDbPath(), "--task", "t", "--templates-dir", REPO_TEMPLATES],
      testDeps({ env: { PAIRFLOW_V3_TEMPLATES: emptyDir } }),
    );
    expect(flagWins.code).toBe(EXIT.ok);

    // env-only (the leg every seeded test rides via the default deps),
    // explicit here:
    const envOnly = await run(
      ["create", "--db", tempDbPath(), "--task", "t"],
      testDeps({ env: { PAIRFLOW_V3_TEMPLATES: REPO_TEMPLATES } }),
    );
    expect(envOnly.code).toBe(EXIT.ok);

    // both missing → usage 2 with the A1 doc name:
    const missing = await run(
      ["create", "--db", tempDbPath(), "--task", "t"],
      testDeps({ env: {} }),
    );
    const err = errorDoc(missing);
    expect(missing.code).toBe(EXIT.usage);
    expect(err.name).toBe("MissingTemplatesDir");

    // the EMPTY forms (A1's "missing/empty" — both halves driven;
    // aftermath finding 3): an empty flag and an empty env value each
    // take the missing lane.
    const emptyFlag = await run(
      ["create", "--db", tempDbPath(), "--task", "t", "--templates-dir", ""],
      testDeps({ env: {} }),
    );
    expect(errorDoc(emptyFlag).name).toBe("MissingTemplatesDir");
    const emptyEnv = await run(
      ["create", "--db", tempDbPath(), "--task", "t"],
      testDeps({ env: { PAIRFLOW_V3_TEMPLATES: "" } }),
    );
    expect(errorDoc(emptyEnv).name).toBe("MissingTemplatesDir");
  });

  it("A2: unlistable dir (absent / a FILE / unreadable) → usage 2 InvalidTemplatesDir, EAGERLY — no store write, no diag file", async () => {
    const scratch = mkdtempSync(join(tmpdir(), "v3-tpl-a2-"));
    dirs.push(scratch);
    const absent = join(scratch, "nope");
    const fileAtPath = join(scratch, "file-not-dir");
    writeFileSync(fileAtPath, "not a directory");
    const forms = [absent, fileAtPath];
    // The unreadable form is root-guarded (packet note 7): uid 0
    // bypasses permission checks and the lane is unstageable there.
    const canRestrict = typeof process.getuid === "function" && process.getuid() !== 0;
    if (canRestrict) {
      const unreadable = join(scratch, "locked");
      mkdirSync(unreadable);
      chmodSync(unreadable, 0o000);
      forms.push(unreadable);
    }
    for (const form of forms) {
      const db = tempDbPath();
      const res = await run(
        ["create", "--db", db, "--task", "t", "--templates-dir", form],
        testDeps(),
      );
      const err = errorDoc(res);
      expect(res.code).toBe(EXIT.usage);
      expect(err.name).toBe("InvalidTemplatesDir");
      // EAGER (A2): exit 2 fired BEFORE any kernel effect — the run
      // store and the derived diag file were never created.
      expect(existsSync(db)).toBe(false);
      expect(existsSync(diagPathOf(db))).toBe(false);
    }
    if (canRestrict) {
      chmodSync(join(scratch, "locked"), 0o755);
    }
  });

  it("A3: --templates-dir is REJECTED by strict parse on unbound verbs (read verbs take no template config)", async () => {
    const db = tempDbPath();
    assertErrorContract(
      await run(["list", "--db", db, "--templates-dir", REPO_TEMPLATES], testDeps()),
      "usage",
      EXIT.usage,
    );
    assertErrorContract(
      await run(["tail", "x", "--db", db, "--templates-dir", REPO_TEMPLATES], testDeps()),
      "usage",
      EXIT.usage,
    );
  });
});

describe("cli — the pinned --template ref grammar (packet ch8-P2: T1/T2)", () => {
  it("T2 ladder: source-form negatives → usage 2; lexical positives reach the store (miss = 3); id not prevalidated", async () => {
    // Negatives: the version half mirrors C8's source grammar — plus
    // the safe-integer BELT (passes the regex, fails safe-int).
    for (const bad of [
      "x", "@1", "x@", "x@0", "x@-1", "x@+1", "x@01", "x@1.0",
      "x@0x10", "x@1e2", "x@ 1", "x@'1'", "x@9007199254740993",
    ]) {
      const res = await run(
        ["create", "--db", tempDbPath(), "--task", "t", "--template", bad],
        testDeps(),
      );
      const err = errorDoc(res);
      expect(res.code).toBe(EXIT.usage);
      expect(err.name).toBe("InvalidTemplateRef");
    }
    // Positives past the parse (incl. the safe boundary, and an id
    // CONTAINING '@' — the split is at the LAST '@'; an indexOf
    // regression would reject it; aftermath finding 3): the repo dir
    // has no such file → UnknownTemplate 3 proves the parse ACCEPTED.
    for (const good of ["x@10", "x@9007199254740991", "a@b@1"]) {
      const res = await run(
        ["create", "--db", tempDbPath(), "--task", "t", "--template", good],
        testDeps(),
      );
      const err = errorDoc(res);
      expect(res.code).toBe(EXIT.notFound);
      expect(err.name).toBe("UnknownTemplate");
    }
    // The id half is NOT prevalidated (S1 no-prevalidation): an
    // off-grammar id can only MISS — never open outside the dir.
    const trav = await run(
      ["create", "--db", tempDbPath(), "--task", "t", "--template", "../evil@1"],
      testDeps(),
    );
    expect(trav.code).toBe(EXIT.notFound);
  });
});

describe("cli — write-lane dispositions (packet ch8-P2: W1/W2/W3/W4)", () => {
  it("W1/W2 at start: present-but-invalid → TemplateInvalid 1 with the VERBATIM {stage, findings} details; absent → 3", async () => {
    const badBody = `${CANONICAL_BYTES()}kind: nope\n`;
    const dir = stageTemplates({ "local-pair-v0@1.yaml": badBody });
    const res = await run(
      ["create", "--db", tempDbPath(), "--task", "t", "--templates-dir", dir],
      testDeps(),
    );
    const err = errorDoc(res);
    expect(res.code).toBe(EXIT.internal);
    expect(err.class).toBe("internal");
    expect(err.name).toBe("TemplateInvalid");
    const details = err.details as { stage: string; findings: unknown[] };
    expect(Object.keys(err.details ?? {}).sort()).toEqual(["findings", "stage"]);
    expect(details.stage).toBe("validate");
    expect(details.findings.length).toBeGreaterThan(0);
    // VERBATIM (W2, aftermath finding 3): the doc's details deep-equal
    // the pipeline's OWN result on the same bytes — never a
    // re-serialization that changes the shape.
    const direct = loadTemplate(new TextEncoder().encode(badBody));
    expect(direct.ok).toBe(false);
    if (!direct.ok) {
      expect(details).toEqual({ stage: direct.error.stage, findings: direct.error.findings });
    }

    // absent-at-START (invalid ≠ absent, the other half): version 2
    // has no byte-exact listing match in the repo dir.
    const absent = await run(
      ["create", "--db", tempDbPath(), "--task", "t", "--template", "local-pair-v0@2"],
      testDeps(),
    );
    const absentErr = errorDoc(absent);
    expect(absent.code).toBe(EXIT.notFound);
    expect(absentErr.name).toBe("UnknownTemplate");
  });

  it("W2/W4 at submit: the in-handle typed load error surfaces at the ingress.submit await as the SAME TemplateInvalid doc", async () => {
    const db = tempDbPath();
    const id = await startOne(db, testDeps());
    const badBody = `${CANONICAL_BYTES()}kind: nope\n`;
    const badDir = stageTemplates({ "local-pair-v0@1.yaml": badBody });
    const res = await run(
      [
        "submit", "--db", db, "--instance", id, "--type", "PASS",
        "--expected-version", "2", "--expected-role", "implementer", "--templates-dir", badDir,
      ],
      testDeps(),
    );
    const err = errorDoc(res);
    expect(res.code).toBe(EXIT.internal);
    expect(err.name).toBe("TemplateInvalid");
    const details = err.details as { stage: string; findings: unknown[] };
    expect(Object.keys(err.details ?? {}).sort()).toEqual(["findings", "stage"]);
    expect(details.stage).toBe("validate");
    // VERBATIM (W2): the in-handle surfacing carries the pipeline's own
    // findings unchanged.
    const direct = loadTemplate(new TextEncoder().encode(badBody));
    expect(direct.ok).toBe(false);
    if (!direct.ok) {
      expect(details).toEqual({ stage: direct.error.stage, findings: direct.error.findings });
    }
  });

  it("W3: absent at HANDLE → the kernel's pinned-ref integrity error (internal 1; the doc name is literally 'Error', the MESSAGE is the assert target)", async () => {
    // A deletable COPY of the canonical bytes (raw byte copy — the repo
    // file itself is never touched).
    const dir = stageTemplates({ "local-pair-v0@1.yaml": CANONICAL_BYTES() });
    const db = tempDbPath();
    const deps = testDeps();
    const created = await run(
      ["create", "--db", db, "--task", "t", "--templates-dir", dir],
      deps,
    );
    expect(created.code).toBe(EXIT.ok);
    const id = (JSON.parse(created.stdout[0] ?? "") as { instanceId: string }).instanceId;
    expect((await run(["start", id, "--db", db, "--templates-dir", dir], deps)).code).toBe(EXIT.ok);
    rmSync(join(dir, "local-pair-v0@1.yaml"));
    const res = await run(
      [
        "submit", "--db", db, "--instance", id, "--type", "PASS",
        "--expected-version", "2", "--expected-role", "implementer", "--templates-dir", dir,
      ],
      testDeps(),
    );
    const err = errorDoc(res);
    expect(res.code).toBe(EXIT.internal);
    expect(err.name).toBe("Error");
    expect(err.message).toContain("kernel integrity: pinned template");
    expect(err.name).not.toBe("TemplateInvalid");
  });
});

describe("cli — last-mile smoke: the SHIPPED entrypoint (root tsx bridge)", () => {
  it("create → start → detail through the real cli/main.ts process", { timeout: 30_000 }, async () => {
    const db = tempDbPath();
    const tsxBin = join(process.cwd(), "..", "node_modules", ".bin", "tsx");
    const mainPath = join(process.cwd(), "src", "cli", "main.ts");
    const templatesDir = join(process.cwd(), "templates");

    const created = await execFileAsync(tsxBin, [
      mainPath,
      "create",
      "--db",
      db,
      "--task",
      "smoke",
      "--templates-dir",
      templatesDir,
    ]);
    const createdDoc = JSON.parse(created.stdout.trim()) as { instanceId: string; kind: string };
    expect(createdDoc.kind).toBe("created");

    const started = await execFileAsync(tsxBin, [
      mainPath,
      "start",
      createdDoc.instanceId,
      "--db",
      db,
      "--templates-dir",
      templatesDir,
    ]);
    const doc = JSON.parse(started.stdout.trim()) as { instanceId: string; version: number };
    expect(doc.version).toBe(2);

    const detail = await execFileAsync(tsxBin, [mainPath, "detail", doc.instanceId, "--db", db]);
    const parsed = JSON.parse(detail.stdout.trim()) as { instance: { task: string } };
    expect(parsed.instance.task).toBe("smoke");
  });
});

// ── packet ch11-P1: the operator submit role flag (matrix O, dimension 10) ──

describe("submit --expected-role (packet ch11-P1, O1/O2)", () => {
  it("O1: submit WITHOUT --expected-role → MissingSubmitFlags usage error naming the quartet", async () => {
    const db = tempDbPath();
    const deps = testDeps();
    const id = await startOne(db, deps);
    const result = await run(
      ["submit", "--db", db, "--instance", id, "--type", "PASS", "--expected-version", "2"],
      deps,
    );
    const error = errorDoc(result);
    expect(result.code).toBe(EXIT.usage);
    expect(error.name).toBe("MissingSubmitFlags");
    expect(error.message).toBe(
      "--instance, --type, --expected-version and --expected-role are required",
    );
  });

  it("O2: a WRONG role rides stdout as a role_not_authorized outcome data row (kernel authority; exit per the outcome matrix)", async () => {
    const db = tempDbPath();
    const deps = testDeps();
    const id = await startOne(db, deps);
    const wrongRole = await run(
      ["submit", "--db", db, "--instance", id, "--type", "PASS", "--expected-version", "2", "--expected-role", "reviewer", "--payload", '{"ref":"d"}'],
      deps,
    );
    expect(wrongRole.code).toBe(EXIT.notFound);
    expect(JSON.parse(wrongRole.stdout[0] ?? "")).toEqual({
      kind: "rejected",
      reason: "role_not_authorized",
    });
    expect(wrongRole.stderr).toEqual([]);
  });
});

// ── packet ch11-P4: Y6 the eager required-context start pre-check + the
// gate-defective write-lane drive ──────────────────────────────────────

describe("cli — ch12-P4 V6: the spec-declaring-template unstartable lane + the C25 P4-deferral retirement", () => {
  it("a residual `runtimeContext: required` template → the R2 admission migration refusal at CREATE", async () => {
    // A bare `required` string is refused by admission's migration (R2) at
    // template load — CREATE pre-loads the template, so the refusal surfaces
    // as the canonical TemplateInvalid doc.
    const dir = stageTemplates({
      "local-pair-v0@1.yaml": `${CANONICAL_BYTES()}runtimeContext: required\n`,
    });
    const db = tempDbPath();
    const res = await run(
      ["create", "--db", db, "--task", "t", "--templates-dir", dir],
      testDeps(),
    );
    expect(res.code).not.toBe(EXIT.ok);
    expect(JSON.stringify(res)).toMatch(/retired|spec map/);
  });

  it("a FILE-authored spec-map template naming an UNREGISTERED provider → start → Rejected(runtime_context_provider_unavailable) exit 3 (the resolution lane survives; ch9-P2 T1 re-base)", async () => {
    // ch12-P4 Claim 6 item 4 / V6 (the C25 P4-deferral RETIRED): a
    // YAML-authored runtimeContext spec map is MATERIALIZED by F3 and ADMITS.
    // `start` then resolves the provider against the production registry — the
    // ch9-P2 T1 re-base: `pairflow.worktree` is now REGISTERED (it would
    // provision), so this lane names an UNREGISTERED provider to keep the
    // name-resolution-failure lane driven. The premise moved off the
    // production registry's emptiness (registration flipped it).
    const dir = stageTemplates({
      "local-pair-v0@1.yaml": `${CANONICAL_BYTES()}runtimeContext:\n  kind: worktree\n  provider: pairflow.unregistered\n`,
    });
    const db = tempDbPath();
    const deps = testDeps();
    const created = await run(
      ["create", "--db", db, "--task", "t", "--templates-dir", dir],
      deps,
    );
    expect(created.code).toBe(EXIT.ok);
    const id = (JSON.parse(created.stdout[0] ?? "") as { instanceId: string }).instanceId;

    const started = await run(["start", id, "--db", db, "--templates-dir", dir], deps);
    // The kernel-negative rejection rides as a DATA doc on stdout, exit 3.
    expect(started.code).toBe(EXIT.notFound);
    expect(started.stderr).toEqual([]);
    expect(JSON.parse(started.stdout[0] ?? "")).toEqual({
      kind: "rejected",
      reason: "runtime_context_provider_unavailable",
    });
  });

  it("create on a template with an unbound role → usage 2 CreateFailed (the binding-coverage guard, migrated from the retired bridge)", async () => {
    // The reviewer role carries NO defaultActor and no override is passed —
    // CREATE's coverage REQUIRE throws, and `create` maps the "create failed
    // (binding coverage)" prefix to usage 2 (the migrated guard; the 2-vs-1
    // exit split preserved).
    // ch13-p1b: only the `defaultActor` line is removed. The role's
    // catalog ref STAYS — dropping it would leave the shipped entry
    // unreferenced, and the document would fail p1a's hygiene lane
    // instead of reaching the binding-coverage guard under test.
    const dir = stageTemplates({
      "local-pair-v0@1.yaml": CANONICAL_BYTES().replace(
        "  reviewer:\n    defaultActor: claude\n",
        "  reviewer:\n",
      ),
    });
    const db = tempDbPath();
    const res = await run(
      ["create", "--db", db, "--task", "t", "--templates-dir", dir],
      testDeps(),
    );
    const err = errorDoc(res);
    expect(res.code).toBe(EXIT.usage);
    expect(err.name).toBe("CreateFailed");
    expect(err.class).toBe("usage");
    expect(err.message).toMatch(/create failed \(binding coverage\): role 'reviewer'/);
  });

  it("a context-FREE template creates and starts normally (the no-throw baseline)", async () => {
    // The default deps ride the repo canonical template (context-free). A
    // clean create→start reaches ACTIVE with the `activated` outcome.
    const db = tempDbPath();
    const deps = testDeps();
    const created = await run(["create", "--db", db, "--task", "t"], deps);
    expect(created.code).toBe(EXIT.ok);
    const id = (JSON.parse(created.stdout[0] ?? "") as { instanceId: string }).instanceId;
    const started = await run(["start", id, "--db", db], deps);
    expect(started.code).toBe(EXIT.ok);
    expect((JSON.parse(started.stdout[0] ?? "") as { kind: string }).kind).toBe("activated");
  });
});

describe("cli — the gate-defective write-lane drive (packet ch11-P4 → ch12-P4)", () => {
  const gateDefective = `${CANONICAL_BYTES()}`
    .replace(
      "    transitions:\n      PASS: implement\n      CONVERGED: done\n",
      "    transitions:\n      PASS: implement\n      CONVERGED: done\n" +
        "    gates:\n      CONVERGED:\n        - uses: no.such.gate\n",
    );

  it("create on a gate-defective template → TemplateInvalid 1 with the coded finding in the VERBATIM {stage, findings} doc", async () => {
    const dir = stageTemplates({ "local-pair-v0@1.yaml": gateDefective });
    const res = await run(
      ["create", "--db", tempDbPath(), "--task", "t", "--templates-dir", dir],
      testDeps(),
    );
    const err = errorDoc(res);
    expect(res.code).toBe(EXIT.internal);
    expect(err.name).toBe("TemplateInvalid");
    const details = err.details as { stage: string; findings: unknown[] };
    expect(details.stage).toBe("validate");
    // the doc SHAPE is byte-unchanged in kind; only the finding CONTENT is
    // new (a coded gate lane surfacing through the SAME {stage, findings}
    // carrier the ch8 W-lane already tests).
    expect(JSON.stringify(details.findings)).toContain("gate_evaluator_unavailable");
    expect(JSON.stringify(details.findings)).toContain("steps.review.gates.CONVERGED[0]");
  });

  // ── packet ch13-p1b (D11 / family 11): code EXCLUSIVITY over this
  // packet's own surface. THE PREMISE IS NAMED: this packet mints no lane
  // and no finding at all, so a document "failing through its lanes" is
  // unconstructible — the carrier is a validate document failing on the
  // ch13 lane p1a already ships. p1a's own lane discharges the "only the
  // ch13 finding carries a code" direction over its whole lane inventory
  // and is asserted unchanged rather than re-driven; what is owed HERE is
  // the negative over the OPERATOR entrypoint's documents, which are what
  // this packet grows.
  it("ch13-p1b: the operator document gains NO code from anything below the ch13 lane", async () => {
    // One role's ref is redirected at an undeclared id; the other role
    // keeps the shipped ref, so the entry stays referenced and the ONLY
    // coded finding is the resolution lane's.
    const refDefective = CANONICAL_BYTES().replace(
      "  reviewer:\n    defaultActor: claude\n    defaultAgentConfig:\n      promptConcernRefs:\n        - emit-envelope\n",
      "  reviewer:\n    defaultActor: claude\n    defaultAgentConfig:\n      promptConcernRefs:\n        - no-such-block\n",
    );
    expect(refDefective).not.toBe(CANONICAL_BYTES());
    const dir = stageTemplates({ "local-pair-v0@1.yaml": refDefective });
    const result = await run(
      ["create", "--db", tempDbPath(), "--task", "t", "--templates-dir", dir],
      testDeps(),
    );
    const err = errorDoc(result);
    const details = err.details as { stage: string; findings: { code?: string }[] };
    expect(details.stage).toBe("validate");
    const codes = details.findings.map((f) => f.code).filter((c) => c !== undefined);
    // EXACTLY the ratified ch13 code — nothing this packet ships adds a
    // second one, and the render mints none at all. The gate lane above
    // is the DISCRIMINATING positive that keeps this from passing by a
    // tree-wide code famine.
    expect(codes).toEqual(["unresolved_context_block_ref"]);
  });

  it("ch13-p1b: the gate schemas' named lane still carries its code IN THE CODE FIELD", () => {
    // The half that keeps the negative above from passing by a tree-wide
    // code famine — and it is asserted at the MACHINE shape, not by
    // finding the token anywhere in the serialized document: a lane that
    // lost its `code` attribute while keeping the word in its message
    // would satisfy a containment check and prove nothing.
    const dir = stageTemplates({ "local-pair-v0@1.yaml": gateDefective });
    return run(
      ["create", "--db", tempDbPath(), "--task", "t", "--templates-dir", dir],
      testDeps(),
    ).then((res) => {
      const details = errorDoc(res).details as { findings: { code?: string }[] };
      expect(details.findings.map((f) => f.code)).toEqual(["gate_evaluator_unavailable"]);
    });
  });
});

// ── packet ch12-P4: the four lifecycle verbs — the CLI input-precondition
// lanes (V2) + the kernel-outcome exit classes (V3) + the mode/run-overrides
// realizations (V5) ─────────────────────────────────────────────────────

describe("cli — create input-precondition lanes (packet ch12-P4, V2)", () => {
  it("a `--mode` non-member token → usage 2 (refused CLI-side BEFORE the kernel — the sensitivity lane)", async () => {
    const res = await run(["create", "--db", tempDbPath(), "--task", "t", "--mode", "eager"], testDeps());
    const err = errorDoc(res);
    expect(res.code).toBe(EXIT.usage);
    expect(err.name).toBe("InvalidMode");
  });

  for (const [label, value] of [
    ["malformed JSON", "{bad"],
    ["valid JSON that is not a map", "[1,2]"],
    ["a map with a non-map entry", '{"implement":5}'],
    ["a non-canonical-JSON-safe leaf (1e999 → Infinity)", '{"implement":{"budget":1e999}}'],
  ] as const) {
    it(`a \`--run-overrides\` ${label} → usage 2`, async () => {
      const res = await run(
        ["create", "--db", tempDbPath(), "--task", "t", "--run-overrides", value],
        testDeps(),
      );
      const err = errorDoc(res);
      expect(res.code).toBe(EXIT.usage);
      expect(err.name).toBe("InvalidRunOverrides");
    });
  }

  it("a well-formed `--run-overrides` snapshots onto the instance (an unknown step-id is INERT — no rejection lane, the D5 conscious debt)", async () => {
    const db = tempDbPath();
    const deps = testDeps();
    // An unknown step-id `ghost-step` is INERT kernel-side — create still
    // succeeds (no CLI rejection lane; the conscious-debt disposition).
    const res = await run(
      ["create", "--db", db, "--task", "t", "--run-overrides", '{"implement":{"approach":"tdd"},"ghost-step":{"x":1}}'],
      deps,
    );
    expect(res.code).toBe(EXIT.ok);
    const id = (JSON.parse(res.stdout[0] ?? "") as { instanceId: string }).instanceId;
    // The snapshot is frozen on the instance at genesis (C9).
    const detail = await run(["detail", id, "--db", db], deps);
    const doc = JSON.parse(detail.stdout[0] ?? "") as {
      instance: { runOverrides: Record<string, unknown> };
    };
    expect(doc.instance.runOverrides).toEqual({
      implement: { approach: "tdd" },
      "ghost-step": { x: 1 },
    });
  });
});

describe("cli — create kernel-outcome lanes (packet ch12-P4, V3/V5)", () => {
  it("immediate create WITHOUT --task → Rejected(task_required) DATA doc, exit 3", async () => {
    const res = await run(["create", "--db", tempDbPath()], testDeps());
    expect(res.code).toBe(EXIT.notFound);
    expect(res.stderr).toEqual([]);
    expect(JSON.parse(res.stdout[0] ?? "")).toEqual({ kind: "rejected", reason: "task_required" });
  });

  it("--mode deferredKickoff create WITHOUT --task → Created (task-less legal), exit 0", async () => {
    const res = await run(["create", "--db", tempDbPath(), "--mode", "deferredKickoff"], testDeps());
    expect(res.code).toBe(EXIT.ok);
    const doc = JSON.parse(res.stdout[0] ?? "") as { kind: string; instanceId: string };
    expect(doc.kind).toBe("created");
    expect(doc.instanceId).not.toBe("");
  });
});

describe("cli — kickoff / cancel lanes (packet ch12-P4, V3)", () => {
  it("kickoff WITHOUT --task → usage 2 MissingTask", async () => {
    const db = tempDbPath();
    const res = await run(["kickoff", "inst-x", "--db", db], testDeps());
    const err = errorDoc(res);
    expect(res.code).toBe(EXIT.usage);
    expect(err.name).toBe("MissingTask");
  });

  it("kickoff / cancel / start of an UNKNOWN instance → Rejected(unknown_instance) DATA doc, exit 3 (a write-path kernel-negative, NOT a read-side notFound)", async () => {
    const db = tempDbPath();
    const deps = testDeps();
    for (const argv of [
      ["start", "ghost", "--db", db],
      ["kickoff", "ghost", "--db", db, "--task", "t"],
      ["cancel", "ghost", "--db", db],
    ]) {
      const res = await run(argv, deps);
      expect(res.code).toBe(EXIT.notFound);
      expect(res.stderr).toEqual([]);
      expect(JSON.parse(res.stdout[0] ?? "")).toEqual({
        kind: "rejected",
        reason: "unknown_instance",
      });
    }
  });

  it("cancel of a non-terminal run → TERMINAL(cancelled) exit 0; a SECOND cancel of the now-terminal run → state_violation THROW, internal 1", async () => {
    const db = tempDbPath();
    const deps = testDeps();
    const id = await startOne(db, deps);

    const cancelled = await run(["cancel", id, "--db", db], deps);
    expect(cancelled.code).toBe(EXIT.ok);
    expect(JSON.parse(cancelled.stdout[0] ?? "")).toEqual({
      kind: "terminated",
      disposition: "cancelled",
    });

    // The terminal-sink guard: cancel of an already-TERMINAL run is an
    // INTEGRITY THROW (exit-1 internal), NOT an exit-3 business rejection.
    const again = await run(["cancel", id, "--db", db], deps);
    assertErrorContract(again, "internal", EXIT.internal);
    expect(again.stdout).toEqual([]);
  });

  it("a replayed CANCEL op_id → Duplicate idempotent-success, exit 0", async () => {
    const db = tempDbPath();
    // A fixed nonce makes two cancels derive the SAME op_id — the second is a
    // Duplicate (idempotent success), not a fresh commit.
    const id = await startOne(db, testDeps());
    const deps = testDeps({ nonce: () => "nonce-fixed" });
    const first = await run(["cancel", id, "--db", db], deps);
    expect(first.code).toBe(EXIT.ok);
    expect((JSON.parse(first.stdout[0] ?? "") as { kind: string }).kind).toBe("terminated");
    const second = await run(["cancel", id, "--db", db], deps);
    expect(second.code).toBe(EXIT.ok);
    expect((JSON.parse(second.stdout[0] ?? "") as { kind: string }).kind).toBe("duplicate");
  });

  it("a replayed START op_id → Duplicate idempotent-success, exit 0 (the grid's start/replayed-op_id cell)", async () => {
    const db = tempDbPath();
    const deps = testDeps();
    // create with fresh deps; the two STARTs share a FIXED nonce → the same
    // op_id, so the second start is a Duplicate (not a fresh activation).
    const created = await run(["create", "--db", db, "--task", "t"], deps);
    expect(created.code).toBe(EXIT.ok);
    const id = (JSON.parse(created.stdout[0] ?? "") as { instanceId: string }).instanceId;
    const fixed = testDeps({ nonce: () => "nonce-start-fixed" });
    const first = await run(["start", id, "--db", db], fixed);
    expect(first.code).toBe(EXIT.ok);
    expect((JSON.parse(first.stdout[0] ?? "") as { kind: string }).kind).toBe("activated");
    const second = await run(["start", id, "--db", db], fixed);
    expect(second.code).toBe(EXIT.ok);
    expect((JSON.parse(second.stdout[0] ?? "") as { kind: string }).kind).toBe("duplicate");
  });

  it("kickoff of an already-TERMINAL run → state_violation THROW, internal 1 (the terminal-sink guard on kickoff — distinct from cancel-sink)", async () => {
    const db = tempDbPath();
    const deps = testDeps();
    const id = await startOne(db, deps); // create→start (immediate) ⇒ ACTIVE
    const cancelled = await run(["cancel", id, "--db", db], deps);
    expect(cancelled.code).toBe(EXIT.ok); // ⇒ TERMINAL(cancelled)
    // kickoff on a TERMINAL run: not WAITING(kickoff_pending) → the hold-guard
    // state_violation THROW → exit-1 internal (NOT an exit-3 rejection).
    const kicked = await run(["kickoff", id, "--db", db, "--task", "t"], deps);
    assertErrorContract(kicked, "internal", EXIT.internal);
    expect(kicked.stdout).toEqual([]);
  });

  it("NO `stale` lane surfaces from the lifecycle verbs (a CAS conflict retries in-loop — a driven non-occurrence)", async () => {
    const db = tempDbPath();
    const deps = testDeps();
    // Drive the full create→start→kickoff-attempt→cancel surface and collect
    // every lifecycle outcome kind; `stale` (an actor-`Outcome` kind) must
    // NEVER appear — it is absent from the lifecycle unions (retries in-loop).
    const kinds: string[] = [];
    const record = (r: Run): void => {
      if (r.stdout[0] !== undefined) kinds.push((JSON.parse(r.stdout[0]) as { kind: string }).kind);
    };
    const created = await run(["create", "--db", db, "--mode", "deferredKickoff"], deps);
    record(created);
    const id = (JSON.parse(created.stdout[0] ?? "") as { instanceId: string }).instanceId;
    record(await run(["start", id, "--db", db], deps)); // accepted (held)
    record(await run(["kickoff", id, "--db", db, "--task", "t"], deps)); // activated
    record(await run(["cancel", id, "--db", db], deps)); // terminated
    expect(kinds).toEqual(["created", "accepted", "activated", "terminated"]);
    expect(kinds).not.toContain("stale");
  });
});
