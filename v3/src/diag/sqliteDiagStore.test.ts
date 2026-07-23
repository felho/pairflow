import { createStaticProviderRegistry } from "../ports/index.js";
import { createScriptedProcessGateRunner } from "../testkit/index.js";
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { afterEach, describe, expect, it } from "vitest";

import { deriveEmitDigest } from "../emit/index.js";
import { createIngress } from "../ingress/index.js";
import { createKernel } from "../kernel/index.js";
import type { DiagnosticEvent, DiagnosticEventBody, DiagnosticsSink } from "../ports/diagnostics.js";
import type { TimeSource } from "../ports/time.js";
import { openStore } from "../store/index.js";
import {
  createControlledClock,
  fixtureDefinitionStore,
  fixtureTemplate,
} from "../testkit/index.js";
import type { AdmittedTemplate, WorkflowTemplate } from "../domain/index.js";
import { admitTemplate } from "../definition/index.js";
import { createGateRegistry } from "../gates/index.js";

const gateCatalog = createGateRegistry();
function admit(template: WorkflowTemplate): AdmittedTemplate {
  const result = admitTemplate(template, gateCatalog);
  if (!result.ok) {
    throw new Error(`test fixture admission failed: ${JSON.stringify(result.findings)}`);
  }
  return result.template;
}
import { noopDiagnosticsSink } from "./index.js";
import { DiagUnavailableError, openDiagStore } from "./sqliteDiagStore.js";

// Packet ch7-P2: the diag store — fail-open write half, fail-loud read
// half, physically separate SQLite file (ADR-010). Every open-outcome ×
// availability lane driven; the R3 shape gate driven by the canonical
// table's minimum counterexample set; the fail-open PRODUCT proof runs
// real kernel + ingress against a corrupt diag DB.

const dirs: string[] = [];
function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "v3-diag-"));
  dirs.push(dir);
  return dir;
}
function tempDbPath(): string {
  return join(tempDir(), "diag.sqlite");
}
afterEach(() => {
  for (const dir of dirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Canonical representative bodies (dimension 5).
// ---------------------------------------------------------------------------
const B_DUP: DiagnosticEventBody = {
  source: "kernel",
  kind: "duplicate",
  instanceId: "inst-1",
  opId: "op-1",
  actorId: "codex",
  type: "PASS",
  payloadDigest: "digest-abc",
};
const B_IF: DiagnosticEventBody = {
  source: "kernel",
  kind: "internal_failure",
  instanceId: "inst-1",
  opId: "op-1",
  actorId: "codex",
  type: "PASS",
  error: { name: "Error", message: 'hostile "quote" éü {payload:"secret-marker"}' },
};
const B_ING: DiagnosticEventBody = {
  source: "ingress",
  kind: "rejected",
  reason: "invalid_shape",
  detail: "not_plain_object",
};

// ---------------------------------------------------------------------------
// Helpers.
// ---------------------------------------------------------------------------
/** The reason of a rejected read, or a sentinel — keeps assertions terse. */
async function reasonOf(p: Promise<unknown>): Promise<string> {
  try {
    await p;
    return "NO_THROW";
  } catch (error) {
    return error instanceof DiagUnavailableError ? error.reason : `OTHER:${String(error)}`;
  }
}

/** Build a NON-WAL (delete-mode) diag DB via raw SQL, optionally partial. */
function buildRawDiag(
  path: string,
  opts: {
    schemaVersion?: string | null;
    prototype?: string | null;
    metaTable?: boolean;
    rows?: readonly { body: string; instanceId?: string | null; at?: number }[];
  } = {},
): void {
  const { schemaVersion = "1", prototype = "true", metaTable = true, rows = [] } = opts;
  const raw = new DatabaseSync(path);
  if (metaTable) {
    raw.exec("CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL) STRICT");
  }
  raw.exec(
    "CREATE TABLE diagnostics (ordinal INTEGER PRIMARY KEY AUTOINCREMENT, at INTEGER NOT NULL, instance_id TEXT, body TEXT NOT NULL) STRICT",
  );
  if (metaTable) {
    const ins = raw.prepare("INSERT INTO meta (key, value) VALUES (?, ?)");
    if (schemaVersion !== null) ins.run("schema_version", schemaVersion);
    if (prototype !== null) ins.run("prototype", prototype);
  }
  const rowIns = raw.prepare(
    "INSERT INTO diagnostics (at, instance_id, body) VALUES (?, ?, ?)",
  );
  for (const r of rows) rowIns.run(r.at ?? 0, r.instanceId ?? null, r.body);
  raw.close();
}

/** Insert one raw row into an existing diag file (a second connection). */
function insertRaw(path: string, body: string, instanceId: string | null = null): void {
  const raw = new DatabaseSync(path);
  raw.prepare("INSERT INTO diagnostics (at, instance_id, body) VALUES (?, ?, ?)").run(
    0,
    instanceId,
    body,
  );
  raw.close();
}

/** Read the schema_version marker of a file directly (readonly is fine). */
function markerVersion(path: string): string | undefined {
  const raw = new DatabaseSync(path);
  try {
    const row = raw.prepare("SELECT value FROM meta WHERE key = 'schema_version'").get() as
      | { value: string }
      | undefined;
    return row?.value;
  } finally {
    raw.close();
  }
}

/** flag 5: assert the environment enforces POSIX readonly (non-root). A
 * throwaway 444 file — a write must be refused, else we are root and the
 * readonly lanes cannot be trusted (fail loud, never pass vacuously). */
function readonlyEnforced(): boolean {
  const f = join(tempDir(), "probe.db");
  const raw = new DatabaseSync(f);
  raw.exec("CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL) STRICT");
  raw.close();
  chmodSync(f, 0o444);
  let db: DatabaseSync | undefined;
  let refused = false;
  try {
    db = new DatabaseSync(f);
    db.exec("CREATE TABLE __probe__ (x INTEGER)");
  } catch {
    refused = true;
  } finally {
    try {
      db?.close();
    } catch {
      /* ignore */
    }
  }
  return refused;
}

async function assertUnavailable(
  handle: { sink: DiagnosticsSink; reader: { getGlobalDiagnostics(n: number): Promise<unknown>; getDiagnostics(id: string, n: number): Promise<unknown> } },
  reason: string,
): Promise<void> {
  expect(() => handle.sink.emit(B_ING)).not.toThrow();
  expect(await reasonOf(handle.reader.getGlobalDiagnostics(0))).toBe(reason);
  expect(await reasonOf(handle.reader.getDiagnostics("inst-1", 0))).toBe(reason);
}

// ===========================================================================
// Open-outcome × availability matrix (O1–O10).
// ===========================================================================
describe("open-outcome × availability matrix", () => {
  it("O1 — fresh writable file: init schema, sink + reader work", async () => {
    const clock = createControlledClock(1000);
    const handle = openDiagStore(tempDbPath(), clock);
    handle.sink.emit(B_DUP);
    const events = await handle.reader.getGlobalDiagnostics(0);
    expect(events).toEqual([{ ...B_DUP, at: 1000, ordinal: 1 }]);
    handle.close();
  });

  it("O2 — prototype marker '1' (writable): reopen preserves data, works", async () => {
    const path = tempDbPath();
    const first = openDiagStore(path, createControlledClock(0));
    first.sink.emit(B_DUP);
    first.close();

    const second = openDiagStore(path, createControlledClock(0));
    const events = await second.reader.getGlobalDiagnostics(0);
    expect(events.map((e) => e.kind)).toEqual(["duplicate"]);
    second.close();
  });

  it("O3 — prototype marker, moved version (writable): fenced wipe, prior rows GONE", async () => {
    const path = tempDbPath();
    buildRawDiag(path, { schemaVersion: "0", rows: [{ body: JSON.stringify(B_ING) }] });

    const handle = openDiagStore(path, createControlledClock(7));
    // Prior rows gone; a new stream starts (ordinal restarts at 1).
    handle.sink.emit(B_DUP);
    const events = await handle.reader.getGlobalDiagnostics(0);
    expect(events).toEqual([{ ...B_DUP, at: 7, ordinal: 1 }]);
    expect(markerVersion(path)).toBe("1");
    handle.close();
  });

  it("O4 — tables present, meta missing → refused_marker, file INTACT", async () => {
    const path = tempDbPath();
    buildRawDiag(path, { metaTable: false });
    const handle = openDiagStore(path, createControlledClock(0));
    await assertUnavailable(handle, "refused_marker");
    // Intact: still no meta table.
    const raw = new DatabaseSync(path);
    const n = raw
      .prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type='table' AND name='meta'")
      .get() as { n: number };
    raw.close();
    expect(n.n).toBe(0);
    handle.close();
  });

  it("O5 — marker incomplete (prototype absent) → refused_marker, INTACT", async () => {
    const path = tempDbPath();
    buildRawDiag(path, { prototype: null });
    const handle = openDiagStore(path, createControlledClock(0));
    await assertUnavailable(handle, "refused_marker");
    handle.close();
  });

  it("O6 — prototype marker != 'true' → refused_marker, INTACT", async () => {
    const path = tempDbPath();
    buildRawDiag(path, { prototype: "false" });
    const handle = openDiagStore(path, createControlledClock(0));
    await assertUnavailable(handle, "refused_marker");
    handle.close();
  });

  it("O7 — garbage bytes → open_failed (probe throw)", async () => {
    const path = tempDbPath();
    writeFileSync(path, "this is not a sqlite database, just some garbage bytes");
    const handle = openDiagStore(path, createControlledClock(0));
    await assertUnavailable(handle, "open_failed");
    handle.close();
  });

  it("O7 — path is a DIRECTORY → open_failed (constructor throw)", async () => {
    const handle = openDiagStore(tempDir(), createControlledClock(0));
    await assertUnavailable(handle, "open_failed");
    handle.close();
  });

  it("O8 — readonly NON-WAL + moved version: wipe DROP throws → open_failed, INTACT", async () => {
    expect(readonlyEnforced()).toBe(true);
    const path = tempDbPath();
    buildRawDiag(path, { schemaVersion: "0" });
    chmodSync(path, 0o444);
    const handle = openDiagStore(path, createControlledClock(0));
    await assertUnavailable(handle, "open_failed");
    // The DROP failed before mutation — marker still the moved version.
    expect(markerVersion(path)).toBe("0");
    handle.close();
  });

  it("O9 — readonly NON-WAL + current marker: WAL PRAGMA throws → open_failed, INTACT", async () => {
    expect(readonlyEnforced()).toBe(true);
    const path = tempDbPath();
    buildRawDiag(path, { schemaVersion: "1" });
    chmodSync(path, 0o444);
    const handle = openDiagStore(path, createControlledClock(0));
    await assertUnavailable(handle, "open_failed");
    expect(markerVersion(path)).toBe("1");
    handle.close();
  });

  it("O10 — readonly EMPTY file: init CREATE throws → open_failed, INTACT", async () => {
    expect(readonlyEnforced()).toBe(true);
    const path = tempDbPath();
    writeFileSync(path, "");
    chmodSync(path, 0o444);
    const handle = openDiagStore(path, createControlledClock(0));
    await assertUnavailable(handle, "open_failed");
    handle.close();
  });
});

// ===========================================================================
// Reader failure lanes R1 / R2 / C1 / W1 + precedence.
// ===========================================================================
describe("reader + write failure lanes", () => {
  it("R2 — a non-JSON body fails the WHOLE read as read_failed", async () => {
    const path = tempDbPath();
    const handle = openDiagStore(path, createControlledClock(0));
    insertRaw(path, "not-json-at-all");
    expect(await reasonOf(handle.reader.getGlobalDiagnostics(0))).toBe("read_failed");
    handle.close();
  });

  it("R1 — a post-open SQL failure (closed handle) surfaces as read_failed", async () => {
    const handle = openDiagStore(tempDbPath(), createControlledClock(0));
    handle.close();
    // The catch that owns the SELECT throw also owns disk-level errors.
    expect(await reasonOf(handle.reader.getGlobalDiagnostics(0))).toBe("read_failed");
  });

  it("C1 — a read AFTER close() is read_failed (not the born-unavailable reason)", async () => {
    const handle = openDiagStore(tempDbPath(), createControlledClock(0));
    handle.sink.emit(B_DUP);
    handle.close();
    expect(await reasonOf(handle.reader.getDiagnostics("inst-1", 0))).toBe("read_failed");
  });

  it("W1 — emit AFTER close() swallows (never throws)", () => {
    const handle = openDiagStore(tempDbPath(), createControlledClock(0));
    handle.close();
    expect(() => handle.sink.emit(B_DUP)).not.toThrow();
  });

  it("V8 (ch7-P4 aftermath) — close() is FAIL-OPEN: a second close() never throws", () => {
    // The channel swallows its OWN release failure (packet ch7-p4 V8:
    // a close throw escaping a verb's finally would flip a successful
    // outcome — Claim 5/M10 forbid it). The second close is the known
    // drivable throw instance (the W1 pattern: the same catch owns
    // OS-level close failures); double-close stays UNCLAIMED as an
    // affordance — this drives failure containment, not idempotency.
    const handle = openDiagStore(tempDbPath(), createControlledClock(0));
    handle.sink.emit(B_DUP);
    handle.close();
    expect(() => {
      handle.close();
    }).not.toThrow();
  });

  it("precedence — an invalid cursor beats unavailability (RangeError, not the reason)", async () => {
    const path = tempDbPath();
    writeFileSync(path, "garbage — the store is unavailable");
    const handle = openDiagStore(path, createControlledClock(0));
    await expect(handle.reader.getGlobalDiagnostics(-1)).rejects.toThrow(RangeError);
    await expect(handle.reader.getDiagnostics("inst-1", -1)).rejects.toThrow(RangeError);
    handle.close();
  });
});

// ===========================================================================
// R3 — the shape gate's minimum counterexample set (canonical table).
// ===========================================================================
const KDUP = { source: "kernel", kind: "duplicate", instanceId: "i", opId: "o", actorId: "a", type: "t", payloadDigest: "d" };
const KIF = { source: "kernel", kind: "internal_failure", instanceId: "i", opId: "o", actorId: "a", type: "t", error: { name: "E", message: "m" } };

const R3_FIXTURES: readonly { name: string; body: string }[] = [
  // common
  { name: "common: {} (no source/kind)", body: "{}" },
  { name: "common: unknown kind", body: JSON.stringify({ source: "kernel", kind: "bogus" }) },
  { name: "common: unknown detail token", body: JSON.stringify({ source: "ingress", kind: "rejected", reason: "invalid_shape", detail: "bogus" }) },
  { name: "common: unknown reason name", body: JSON.stringify({ ...KDUP, kind: "rejected", reason: "not_a_real_reason" }) },
  { name: "common: extra non-allowlisted key", body: JSON.stringify({ ...KDUP, extra: "x" }) },
  { name: "common: lied type (instanceId a number)", body: JSON.stringify({ ...KDUP, instanceId: 123 }) },
  { name: "common: -0 version (JSON-encoded literal)", body: '{"source":"kernel","kind":"stale","instanceId":"i","opId":"o","actorId":"a","type":"t","payloadDigest":"d","expectedVersion":-0,"currentVersion":2}' },
  // presence iffs
  { name: "presence: duplicate + reason", body: JSON.stringify({ ...KDUP, reason: "unknown_instance" }) },
  { name: "presence: rejected w/o reason", body: JSON.stringify({ ...KDUP, kind: "rejected" }) },
  { name: "presence: stale w/o versions", body: JSON.stringify({ ...KDUP, kind: "stale" }) },
  { name: "presence: stale with ONE version", body: JSON.stringify({ ...KDUP, kind: "stale", expectedVersion: 1 }) },
  { name: "presence: kernel + detail", body: JSON.stringify({ ...KDUP, detail: "unknown_key" }) },
  { name: "presence: ingress + non-rejected kind", body: JSON.stringify({ source: "ingress", kind: "duplicate", detail: "unknown_key" }) },
  // source / domain
  { name: "source/domain: ingress + payloadDigest", body: JSON.stringify({ source: "ingress", kind: "rejected", reason: "invalid_shape", detail: "unknown_key", payloadDigest: "d" }) },
  { name: "source/domain: kernel rejected + invalid_shape", body: JSON.stringify({ ...KDUP, kind: "rejected", reason: "invalid_shape" }) },
  // digest-point
  { name: "digest-point: duplicate w/o digest", body: JSON.stringify({ source: "kernel", kind: "duplicate", instanceId: "i", opId: "o", actorId: "a", type: "t" }) },
  { name: "digest-point: stale w/o digest", body: JSON.stringify({ source: "kernel", kind: "stale", instanceId: "i", opId: "o", actorId: "a", type: "t", expectedVersion: 1, currentVersion: 2 }) },
  { name: "digest-point: cas_restart w/o digest", body: JSON.stringify({ source: "kernel", kind: "cas_restart", instanceId: "i", opId: "o", actorId: "a", type: "t" }) },
  { name: "digest-point: post-digest rejected (missing_version) w/o digest", body: JSON.stringify({ source: "kernel", kind: "rejected", reason: "missing_version", instanceId: "i", opId: "o", actorId: "a", type: "t" }) },
  { name: "digest-point: unknown_instance WITH digest", body: JSON.stringify({ source: "kernel", kind: "rejected", reason: "unknown_instance", instanceId: "i", opId: "o", actorId: "a", type: "t", payloadDigest: "d" }) },
  // kernel attribution (no full envelope)
  { name: "attribution: duplicate w/o full envelope", body: JSON.stringify({ source: "kernel", kind: "duplicate", payloadDigest: "d" }) },
  { name: "attribution: stale w/o full envelope", body: JSON.stringify({ source: "kernel", kind: "stale", payloadDigest: "d", expectedVersion: 1, currentVersion: 2 }) },
  { name: "attribution: cas_restart w/o full envelope", body: JSON.stringify({ source: "kernel", kind: "cas_restart", payloadDigest: "d" }) },
  { name: "attribution: rejected w/o full envelope", body: JSON.stringify({ source: "kernel", kind: "rejected", reason: "missing_version", payloadDigest: "d" }) },
  // internal_failure
  { name: "internal_failure: w/o instanceId", body: JSON.stringify({ source: "kernel", kind: "internal_failure", error: { name: "E", message: "m" } }) },
  { name: "internal_failure: PARTIAL opId/actorId/type", body: JSON.stringify({ source: "kernel", kind: "internal_failure", instanceId: "i", opId: "o", error: { name: "E", message: "m" } }) },
  { name: "internal_failure: payloadDigest w/o full envelope", body: JSON.stringify({ source: "kernel", kind: "internal_failure", instanceId: "i", payloadDigest: "d", error: { name: "E", message: "m" } }) },
  // ingress
  { name: "ingress: not_plain_object + attribution", body: JSON.stringify({ source: "ingress", kind: "rejected", reason: "invalid_shape", detail: "not_plain_object", instanceId: "i" }) },
  { name: "ingress: other detail + EMPTY attribution string", body: JSON.stringify({ source: "ingress", kind: "rejected", reason: "invalid_shape", detail: "unknown_key", instanceId: "" }) },
];

describe("R3 shape gate — every counterexample fails the WHOLE read as read_failed", () => {
  it.each(R3_FIXTURES)("$name", async ({ body }) => {
    const path = tempDbPath();
    const handle = openDiagStore(path, createControlledClock(0));
    insertRaw(path, body);
    expect(await reasonOf(handle.reader.getGlobalDiagnostics(0))).toBe("read_failed");
    handle.close();
  });

  it("KIF is a VALID projection — the gate accepts a well-formed internal_failure", async () => {
    const path = tempDbPath();
    const handle = openDiagStore(path, createControlledClock(0));
    insertRaw(path, JSON.stringify(KIF), "i");
    const events = await handle.reader.getGlobalDiagnostics(0);
    expect(events.map((e) => e.kind)).toEqual(["internal_failure"]);
    handle.close();
  });
});

// ===========================================================================
// packet ch9-p2, DG3 — the runner-plane provisioning rows: emit/read parity,
// every new presence iff violated in BOTH directions → read_failed.
// ===========================================================================
const B_RUN_READY: DiagnosticEventBody = {
  source: "runner",
  kind: "provision_ready",
  instanceId: "inst-1",
  requestId: "req-1000-1",
};
const B_RUN_FAILED: DiagnosticEventBody = {
  source: "runner",
  kind: "provision_failed",
  instanceId: "inst-1",
  requestId: "req-1000-1",
  providerReason: "sys:provision_rejected",
  providerDetail: 'fatal: not a git repository éü {payload:"x"}',
};
const B_RUN_FAILED_NODETAIL: DiagnosticEventBody = {
  source: "runner",
  kind: "provision_failed",
  instanceId: "inst-1",
  requestId: "req-1000-1",
  providerReason: "sys:provision_failed",
};

describe("runner rows — emit/read round-trip + confinement (DG3)", () => {
  it("the store ROUND-TRIPS runner rows (ready, failed+detail, failed w/o detail) with exact keysets", async () => {
    const handle = openDiagStore(":memory:", createControlledClock(9));
    handle.sink.emit(B_RUN_READY);
    handle.sink.emit(B_RUN_FAILED);
    handle.sink.emit(B_RUN_FAILED_NODETAIL);
    const events = await handle.reader.getGlobalDiagnostics(0);
    expect(events).toEqual([
      { ...B_RUN_READY, at: 9, ordinal: 1 },
      { ...B_RUN_FAILED, at: 9, ordinal: 2 },
      { ...B_RUN_FAILED_NODETAIL, at: 9, ordinal: 3 },
    ]);
    handle.close();
  });

  it("an UNKNOWN providerReason token round-trips VERBATIM — membership is NOT read-gated (the untrusted-report rule)", async () => {
    const handle = openDiagStore(":memory:", createControlledClock(0));
    // A hostile/unknown token the kernel's transport gate would reject: the
    // event still emits and reads it verbatim (the event precedes the verdict).
    handle.sink.emit({ ...B_RUN_FAILED_NODETAIL, providerReason: "totally-made-up-token" });
    const events = await handle.reader.getGlobalDiagnostics(0);
    expect((events[0] as DiagnosticEvent).providerReason).toBe("totally-made-up-token");
    handle.close();
  });

  it("attributed runner rows read back on the instance surface", async () => {
    const handle = openDiagStore(":memory:", createControlledClock(0));
    handle.sink.emit(B_RUN_READY);
    const events = await handle.reader.getDiagnostics("inst-1", 0);
    expect(events.map((e) => e.kind)).toEqual(["provision_ready"]);
    handle.close();
  });

  it("FAIL-OPEN: emitting a runner row AFTER close() is swallowed (never throws) — the delivery outcome is unchanged", () => {
    const handle = openDiagStore(tempDbPath(), createControlledClock(0));
    handle.close();
    expect(() => handle.sink.emit(B_RUN_FAILED)).not.toThrow();
  });
});

const RUNNER_R3_FIXTURES: readonly { name: string; body: string }[] = [
  // runner kinds ⇔ runner source (both directions).
  { name: "runner kind with source kernel", body: JSON.stringify({ source: "kernel", kind: "provision_ready", instanceId: "i", requestId: "r" }) },
  { name: "runner kind with source ingress", body: JSON.stringify({ source: "ingress", kind: "provision_failed", requestId: "r", providerReason: "x" }) },
  { name: "runner source with a kernel kind (duplicate)", body: JSON.stringify({ source: "runner", kind: "duplicate", instanceId: "i", requestId: "r" }) },
  // requestId iff source runner (both directions).
  { name: "kernel row carrying requestId", body: JSON.stringify({ ...KDUP, requestId: "r" }) },
  { name: "runner row MISSING requestId", body: JSON.stringify({ source: "runner", kind: "provision_ready", instanceId: "i" }) },
  { name: "requestId not a string", body: JSON.stringify({ source: "runner", kind: "provision_ready", instanceId: "i", requestId: 5 }) },
  // providerReason iff kind provision_failed (both directions).
  { name: "provision_ready carrying providerReason", body: JSON.stringify({ source: "runner", kind: "provision_ready", instanceId: "i", requestId: "r", providerReason: "x" }) },
  { name: "provision_failed MISSING providerReason", body: JSON.stringify({ source: "runner", kind: "provision_failed", instanceId: "i", requestId: "r" }) },
  { name: "kernel duplicate carrying providerReason", body: JSON.stringify({ ...KDUP, providerReason: "x" }) },
  // providerDetail ⇒ provision_failed; string-typed.
  { name: "provision_ready carrying providerDetail", body: JSON.stringify({ source: "runner", kind: "provision_ready", instanceId: "i", requestId: "r", providerDetail: "d" }) },
  { name: "providerDetail not a string", body: JSON.stringify({ source: "runner", kind: "provision_failed", instanceId: "i", requestId: "r", providerReason: "x", providerDetail: 5 }) },
  // runner attribution exclusions.
  { name: "runner row MISSING instanceId", body: JSON.stringify({ source: "runner", kind: "provision_ready", requestId: "r" }) },
  { name: "runner row carrying opId", body: JSON.stringify({ source: "runner", kind: "provision_ready", instanceId: "i", requestId: "r", opId: "o" }) },
  { name: "runner row carrying type", body: JSON.stringify({ source: "runner", kind: "provision_ready", instanceId: "i", requestId: "r", type: "PASS" }) },
  { name: "runner row carrying payloadDigest", body: JSON.stringify({ source: "runner", kind: "provision_ready", instanceId: "i", requestId: "r", payloadDigest: "d" }) },
];

describe("runner rows — every new presence iff violated (both directions) → read_failed", () => {
  it.each(RUNNER_R3_FIXTURES)("$name", async ({ body }) => {
    const path = tempDbPath();
    const handle = openDiagStore(path, createControlledClock(0));
    insertRaw(path, body, "i");
    expect(await reasonOf(handle.reader.getGlobalDiagnostics(0))).toBe("read_failed");
    handle.close();
  });
});

// ===========================================================================
// Stamping, ordering, fidelity, projection (dimensions 4, 5).
// ===========================================================================
describe("stamping + ordering + fidelity", () => {
  it("dim 4 — the sink stamps `at` from its injected clock (advance between emits)", async () => {
    const clock = createControlledClock(1000);
    const handle = openDiagStore(":memory:", clock);
    handle.sink.emit(B_DUP);
    clock.advance(500);
    handle.sink.emit(B_DUP);
    const events = await handle.reader.getGlobalDiagnostics(0);
    expect(events.map((e) => e.at)).toEqual([1000, 1500]);
    handle.close();
  });

  it("dim 4 — ordinal is strictly increasing; identical bodies are DISTINCT rows (no CAS)", async () => {
    const handle = openDiagStore(":memory:", createControlledClock(0));
    handle.sink.emit(B_DUP);
    handle.sink.emit(B_DUP);
    handle.sink.emit(B_DUP);
    const events = await handle.reader.getGlobalDiagnostics(0);
    expect(events.map((e) => e.ordinal)).toEqual([1, 2, 3]);
    handle.close();
  });

  it("dim 5 — round-trip keyset fidelity on the three representative bodies", async () => {
    const handle = openDiagStore(":memory:", createControlledClock(42));
    handle.sink.emit(B_DUP);
    handle.sink.emit(B_IF);
    handle.sink.emit(B_ING);
    const events = await handle.reader.getGlobalDiagnostics(0);
    expect(events).toEqual([
      { ...B_DUP, at: 42, ordinal: 1 },
      { ...B_IF, at: 42, ordinal: 2 },
      { ...B_ING, at: 42, ordinal: 3 },
    ]);
    // Exact keysets — nothing added, dropped, or mutated (incl. hostile message).
    expect(Object.keys(events[1] ?? {}).sort()).toEqual(
      ["actorId", "at", "error", "instanceId", "kind", "opId", "ordinal", "source", "type"].sort(),
    );
    expect((events[1] as DiagnosticEvent).error?.message).toBe(B_IF.error?.message);
    handle.close();
  });

  it("projection — extra enumerable keys are DROPPED", async () => {
    const handle = openDiagStore(":memory:", createControlledClock(0));
    handle.sink.emit({ ...B_DUP, extra: "leak", another: 1 } as unknown as DiagnosticEventBody);
    const events = await handle.reader.getGlobalDiagnostics(0);
    expect(events).toEqual([{ ...B_DUP, at: 0, ordinal: 1 }]);
    handle.close();
  });

  it("projection — a carrier `toJSON` is NEVER consulted", async () => {
    const handle = openDiagStore(":memory:", createControlledClock(0));
    const hostile = {
      ...B_DUP,
      toJSON() {
        return { source: "kernel", kind: "internal_failure" };
      },
    } as unknown as DiagnosticEventBody;
    handle.sink.emit(hostile);
    const events = await handle.reader.getGlobalDiagnostics(0);
    // The projection wins: a duplicate, not the toJSON's internal_failure.
    expect(events[0]?.kind).toBe("duplicate");
    handle.close();
  });
});

// ===========================================================================
// Emit-path fallible-site inventory — every member swallows.
// ===========================================================================
describe("emit-path fallible sites all swallow (REV-DIAG-FAILOPEN)", () => {
  it("a HOSTILE getter on the body is swallowed; nothing lands", async () => {
    const handle = openDiagStore(":memory:", createControlledClock(0));
    const hostile = {
      source: "kernel",
      kind: "duplicate",
      opId: "o",
      actorId: "a",
      type: "t",
      payloadDigest: "d",
      get instanceId(): string {
        throw new Error("hostile getter");
      },
    } as unknown as DiagnosticEventBody;
    expect(() => handle.sink.emit(hostile)).not.toThrow();
    expect(await handle.reader.getGlobalDiagnostics(0)).toEqual([]);
    handle.close();
  });

  it("a BigInt-lied value (JSON.stringify throws) is swallowed", async () => {
    const handle = openDiagStore(":memory:", createControlledClock(0));
    const lied = {
      source: "kernel",
      kind: "stale",
      instanceId: "i",
      opId: "o",
      actorId: "a",
      type: "t",
      payloadDigest: "d",
      expectedVersion: 1n,
      currentVersion: 2,
    } as unknown as DiagnosticEventBody;
    expect(() => handle.sink.emit(lied)).not.toThrow();
    expect(await handle.reader.getGlobalDiagnostics(0)).toEqual([]);
    handle.close();
  });

  it("a throwing TimeSource is swallowed", async () => {
    const throwingClock: TimeSource = {
      now() {
        throw new Error("clock boom");
      },
    };
    const handle = openDiagStore(":memory:", throwingClock);
    expect(() => handle.sink.emit(B_DUP)).not.toThrow();
    expect(await handle.reader.getGlobalDiagnostics(0)).toEqual([]);
    handle.close();
  });

  it("a NON-throwing type-lied body is lost to the swallow fence — never a self-poisoning row", async () => {
    const handle = openDiagStore(":memory:", createControlledClock(0));
    // instanceId: 123 is a number where a string is declared — JSON-
    // serializable (JSON.stringify does NOT throw), so the OLD emit wrote
    // it, and every later read then failed read_failed (self-poison). The
    // emit-side shape gate now loses it to the swallow fence instead.
    const lied = { ...B_DUP, instanceId: 123 } as unknown as DiagnosticEventBody;
    expect(() => handle.sink.emit(lied)).not.toThrow();
    // A VALID body after the lie still lands, at ordinal 1 (the lie never
    // reached the INSERT, so it consumed no AUTOINCREMENT ordinal), and the
    // read is CLEAN — [] would-be-poison is now a real, readable event.
    handle.sink.emit(B_DUP);
    const events = await handle.reader.getGlobalDiagnostics(0);
    expect(events).toEqual([{ ...B_DUP, at: 0, ordinal: 1 }]);
    handle.close();
  });
});

// ===========================================================================
// Cursor ladder (dimension 6) — on BOTH reads.
// ===========================================================================
describe("cursor ladder — both reads", () => {
  async function seeded(): Promise<ReturnType<typeof openDiagStore>> {
    const handle = openDiagStore(":memory:", createControlledClock(0));
    for (let i = 0; i < 3; i++) handle.sink.emit(B_DUP);
    return handle;
  }

  const BAD_CURSORS: readonly number[] = [
    -1,
    1.5,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    Number.MAX_SAFE_INTEGER + 1,
    -0,
  ];

  it("global — 0 = full replay, mid-cursor suffix, beyond-end = []", async () => {
    const handle = await seeded();
    expect((await handle.reader.getGlobalDiagnostics(0)).map((e) => e.ordinal)).toEqual([1, 2, 3]);
    expect((await handle.reader.getGlobalDiagnostics(2)).map((e) => e.ordinal)).toEqual([3]);
    expect(await handle.reader.getGlobalDiagnostics(3)).toEqual([]);
    expect(await handle.reader.getGlobalDiagnostics(999)).toEqual([]);
    handle.close();
  });

  it("per-instance — 0 = full replay, mid-cursor suffix, beyond-end = []", async () => {
    const handle = await seeded();
    expect((await handle.reader.getDiagnostics("inst-1", 0)).map((e) => e.ordinal)).toEqual([1, 2, 3]);
    expect((await handle.reader.getDiagnostics("inst-1", 2)).map((e) => e.ordinal)).toEqual([3]);
    expect(await handle.reader.getDiagnostics("inst-1", 3)).toEqual([]);
    handle.close();
  });

  it("global — every invalid cursor is a RangeError (incl. -0)", async () => {
    const handle = await seeded();
    for (const bad of BAD_CURSORS) {
      await expect(handle.reader.getGlobalDiagnostics(bad)).rejects.toThrow(RangeError);
    }
    handle.close();
  });

  it("per-instance — every invalid cursor is a RangeError (incl. -0)", async () => {
    const handle = await seeded();
    for (const bad of BAD_CURSORS) {
      await expect(handle.reader.getDiagnostics("inst-1", bad)).rejects.toThrow(RangeError);
    }
    handle.close();
  });
});

// ===========================================================================
// Attribution routing + known-empty (dimensions 2, 7).
// ===========================================================================
describe("attribution routing + known-empty", () => {
  it("dim 7 — per-instance serves attributed only; global serves all (incl. unattributed)", async () => {
    const handle = openDiagStore(":memory:", createControlledClock(0));
    handle.sink.emit(B_DUP); // attributed to inst-1
    handle.sink.emit(B_ING); // unattributed (no instanceId)

    const perInstance = await handle.reader.getDiagnostics("inst-1", 0);
    expect(perInstance.map((e) => e.kind)).toEqual(["duplicate"]);
    const global = await handle.reader.getGlobalDiagnostics(0);
    expect(global.map((e) => e.kind)).toEqual(["duplicate", "rejected"]);
    handle.close();
  });

  it("dim 2 — known-empty is [] (per-instance AND global), never null/error", async () => {
    const handle = openDiagStore(":memory:", createControlledClock(0));
    expect(await handle.reader.getGlobalDiagnostics(0)).toEqual([]);
    expect(await handle.reader.getDiagnostics("ghost", 0)).toEqual([]);
    handle.close();
  });

  it("dim 4 — the fenced wipe starts a NEW stream (ordinal restarts)", async () => {
    const path = tempDbPath();
    const first = openDiagStore(path, createControlledClock(0));
    first.sink.emit(B_DUP);
    expect((await first.reader.getGlobalDiagnostics(0)).map((e) => e.ordinal)).toEqual([1]);
    first.close();
    // Move the marker so the next open wipes.
    const raw = new DatabaseSync(path);
    raw.prepare("UPDATE meta SET value = '0' WHERE key = 'schema_version'").run();
    raw.close();
    const second = openDiagStore(path, createControlledClock(0));
    second.sink.emit(B_DUP);
    expect((await second.reader.getGlobalDiagnostics(0)).map((e) => e.ordinal)).toEqual([1]);
    second.close();
  });
});

// ===========================================================================
// WAL + separation + fail-open PRODUCT (dimensions 1, 8, 9).
// ===========================================================================
const template = fixtureTemplate();
const definitions = fixtureDefinitionStore(admit(template));

function validEnvelope(opId: string, type: string, expectedVersion: number) {
  return { instanceId: "inst-1", opId, type, actorId: "codex", expectedVersion, expectedRole: "implementer", payload: { ref: "d1" } };
}

interface FlowResult {
  readonly storeHandle: ReturnType<typeof openStore>;
  readonly outcomes: unknown;
}

/** Real kernel + ingress + main store over the given diag sink: a
 * start, a committed PASS (emits nothing), and an invalid_shape
 * rejection (emits one ingress event). Deterministic (minted ids +
 * controlled clock). */
async function runFlow(diag: DiagnosticsSink, mainPath: string, clock: ReturnType<typeof createControlledClock>): Promise<FlowResult> {
  const storeHandle = openStore(mainPath, clock);
  const kernel = createKernel({
      providerRegistry: createStaticProviderRegistry({}),
      processRunner: createScriptedProcessGateRunner([]),
    store: storeHandle.store,
    definitions,
    time: clock,
    digest: deriveEmitDigest,

    gates: gateCatalog,    diag,
  });
  const ingress = createIngress({ kernel, diag });
  // ch12-p1b: startInstance is retired — CREATE (genesis) then START
  // (activate) compose the old one-shot. Deterministic opId "op-start".
  const created = await kernel.create({
    instanceId: "inst-1",
    templateRef: { id: "local-pair-v0", version: 1 },
    task: "build it",
  });
  const started = await kernel.start({ instanceId: "inst-1", opId: "op-start" });
  // +1: CREATE (v1) then START (v2) advance the version twice before the
  // first actor transition — the PASS now expects version 2 (was 1).
  const committed = await ingress.submit(validEnvelope("op-1", "PASS", 2));
  const rejected = await ingress.submit(42); // not an object → not_plain_object
  return { storeHandle, outcomes: { created, started, committed, rejected } };
}

describe("WAL + separation + fail-open product", () => {
  it("dim 8 — `journal_mode = wal` on a file-backed store (skipped for :memory:)", () => {
    const path = tempDbPath();
    const handle = openDiagStore(path, createControlledClock(0));
    const raw = new DatabaseSync(path);
    const mode = raw.prepare("PRAGMA journal_mode").get() as { journal_mode: string };
    raw.close();
    expect(mode.journal_mode).toBe("wal");
    handle.close();
  });

  it("dim 1 — fail-open: a CORRUPT diag DB leaves every Outcome deep-equal to the noop twin", async () => {
    const corruptPath = tempDbPath();
    writeFileSync(corruptPath, "not a database — the sink is born unavailable");
    const corrupt = openDiagStore(corruptPath, createControlledClock(0));

    const run1 = await runFlow(corrupt.sink, ":memory:", createControlledClock(0));
    const run2 = await runFlow(noopDiagnosticsSink, ":memory:", createControlledClock(0));
    expect(run1.outcomes).toEqual(run2.outcomes);
    // The corrupt store still reads loud (never masks as []).
    expect(await reasonOf(corrupt.reader.getGlobalDiagnostics(0))).toBe("open_failed");
    run1.storeHandle.close();
    run2.storeHandle.close();
    corrupt.close();
  });

  it("dim 8 — separation: main store byte-identical to the twin; diag table set = meta+diagnostics", async () => {
    const diagPath = tempDbPath();
    const mainA = tempDbPath();
    const mainB = tempDbPath();
    const diag = openDiagStore(diagPath, createControlledClock(0));

    const runA = await runFlow(diag.sink, mainA, createControlledClock(0));
    const runB = await runFlow(noopDiagnosticsSink, mainB, createControlledClock(0));

    // (a) every committed read surface deep-equal to the noop twin.
    expect(await runA.storeHandle.store.listInstances()).toEqual(
      await runB.storeHandle.store.listInstances(),
    );
    expect(await runA.storeHandle.store.getInstanceDetail("inst-1")).toEqual(
      await runB.storeHandle.store.getInstanceDetail("inst-1"),
    );
    expect(await runA.storeHandle.store.getTimeline("inst-1", 0)).toEqual(
      await runB.storeHandle.store.getTimeline("inst-1", 0),
    );

    // The diag file holds exactly the expected event sequence (one ingress rejection).
    const events = await diag.reader.getGlobalDiagnostics(0);
    expect(events).toEqual([
      { source: "ingress", kind: "rejected", reason: "invalid_shape", detail: "not_plain_object", at: 0, ordinal: 1 },
    ]);

    runA.storeHandle.close();
    runB.storeHandle.close();
    diag.close();

    const appTables = (path: string): string[] => {
      const raw = new DatabaseSync(path);
      const names = (
        raw.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all() as {
          name: string;
        }[]
      ).map((r) => r.name);
      raw.close();
      return names;
    };
    // (a) main schema unchanged by the presence of the diag sink.
    expect(appTables(mainA)).toEqual(appTables(mainB));
    // (b) diag APPLICATION table set = meta + diagnostics (sqlite_sequence excluded BY NAME).
    expect(appTables(diagPath).filter((n) => n !== "sqlite_sequence")).toEqual([
      "diagnostics",
      "meta",
    ]);
  });
});

// ── packet ch11-P1: the L1 allowlist growth (D1/D2) — load-bearing:
// before the extension these rows were DROPPED by the closed-set
// check + the fail-open swallow. ──

describe("L1 allowlist growth — the four kernel reasons persist (D1)", () => {
  it.each(["not_active", "missing_role", "role_not_authorized", "not_authorized"] as const)(
    "kernel rejected '%s' with payloadDigest persists and reads back",
    async (reason) => {
      const path = tempDbPath();
      const handle = openDiagStore(path, createControlledClock(5_000));
      handle.sink.emit({
        source: "kernel",
        kind: "rejected",
        reason,
        instanceId: "inst-1",
        opId: "op-1",
        actorId: "codex",
        type: "PASS",
        payloadDigest: "dg-1",
      });
      const events = await handle.reader.getGlobalDiagnostics(0);
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({ source: "kernel", kind: "rejected", reason });
      handle.close();
    },
  );
});

describe("L1 allowlist growth — the ingress token (D2)", () => {
  it("invalid_expected_role persists as an ingress detail token", async () => {
    const path = tempDbPath();
    const handle = openDiagStore(path, createControlledClock(5_000));
    handle.sink.emit({
      source: "ingress",
      kind: "rejected",
      reason: "invalid_shape",
      detail: "invalid_expected_role",
      instanceId: "inst-1",
    });
    const events = await handle.reader.getGlobalDiagnostics(0);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ detail: "invalid_expected_role" });
    handle.close();
  });
});
