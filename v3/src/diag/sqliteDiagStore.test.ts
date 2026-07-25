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
import { createDebugBundleExporter, redactPayloadsPolicy } from "../floor/index.js";
import { openStore } from "../store/index.js";
import {
  createControlledClock,
  fixtureDefinitionStore,
  fixtureTemplate,
} from "../testkit/index.js";
import type { AdmittedTemplate, WorkflowInstance, WorkflowTemplate } from "../domain/index.js";
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
  { name: "runner row carrying actorId", body: JSON.stringify({ source: "runner", kind: "provision_ready", instanceId: "i", requestId: "r", actorId: "a" }) },
  { name: "runner row carrying type", body: JSON.stringify({ source: "runner", kind: "provision_ready", instanceId: "i", requestId: "r", type: "PASS" }) },
  { name: "runner row carrying payloadDigest", body: JSON.stringify({ source: "runner", kind: "provision_ready", instanceId: "i", requestId: "r", payloadDigest: "d" }) },
  // runner row carrying an INGRESS detail token — detail is source=ingress only.
  { name: "runner row carrying (ingress) detail", body: JSON.stringify({ source: "runner", kind: "provision_failed", instanceId: "i", requestId: "r", providerReason: "x", detail: "unknown_key" }) },
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

// The debug-bundle exclusion over a STORED runner row (DG3): the closed
// BundleDiagRow projection structurally excludes the runner fields —
// providerDetail (untrusted) can never enter the redacted bundle.
const BUNDLE_INSTANCE: WorkflowInstance = {
  instanceId: "inst-1",
  templateRef: { id: "local-pair-v0", version: 1 },
  task: "t",
  binding: { implementer: "codex", reviewer: "claude" },
  currentStep: "implement",
  round: 1,
  kernelStatus: "ACTIVE",
  terminalDisposition: null,
  activationMode: "immediate",
  wait: null,
  runtimeContext: { state: "ready", ref: null },
  failureReason: null,
  runOverrides: {},
  version: 1,
};

describe("runner rows — the debug-bundle projection EXCLUDES the runner fields (DG3)", () => {
  it("a STORED provision_failed runner row projects to a BundleDiagRow WITHOUT providerReason/providerDetail/requestId", async () => {
    // A real diag file carrying an attributed runner failure row (providerDetail
    // present — the untrusted tail that must never reach the redacted bundle).
    const diagPath = tempDbPath();
    buildRawDiag(diagPath, {
      rows: [
        {
          instanceId: "inst-1",
          body: JSON.stringify({
            source: "runner",
            kind: "provision_failed",
            instanceId: "inst-1",
            requestId: "req-1000-1",
            providerReason: "sys:provision_rejected",
            providerDetail: "fatal: not a git repository (secret-marker)",
          }),
        },
      ],
    });
    const diag = openDiagStore(diagPath, createControlledClock(0));
    const main = openStore(":memory:", createControlledClock(0));
    try {
      await main.store.createInstance(BUNDLE_INSTANCE);
      const bundle = await createDebugBundleExporter(
        main.store,
        redactPayloadsPolicy,
        diag.reader,
      ).exportDebugBundle("inst-1");
      expect(bundle).not.toBeNull();
      const section = bundle?.rejectedInputs;
      expect(section?.status).toBe("present");
      if (section?.status !== "present") return;
      expect(section.rows).toHaveLength(1);
      const row = section.rows[0];
      expect(row?.kind).toBe("provision_failed");
      expect(row?.source).toBe("runner");
      // The closed projection carries kind/source/at/ordinal only — the runner
      // report fields are structurally absent (providerDetail never leaks).
      const keys = Object.keys(row ?? {});
      expect(keys).not.toContain("providerReason");
      expect(keys).not.toContain("providerDetail");
      expect(keys).not.toContain("requestId");
      // The untrusted detail marker is nowhere in the serialized bundle.
      expect(JSON.stringify(bundle)).not.toContain("secret-marker");
    } finally {
      diag.close();
      main.close();
    }
  });

  it("a STORED spawn_outcome/name_collision runner row: the closed projection EXCLUDES the spawn fields — the token never leaks into the bundle surface (packet ch9-p4a DG; the exclusion set unchanged)", async () => {
    const diagPath = tempDbPath();
    buildRawDiag(diagPath, {
      rows: [
        {
          instanceId: "inst-1",
          body: JSON.stringify({
            source: "runner",
            kind: "spawn_outcome",
            instanceId: "inst-1",
            contextPacketId: "inst-1@v2",
            attemptId: "att-1",
            spawnOutcome: "name_collision",
            spawnDetail: "tmux stderr tail (secret-marker)",
          }),
        },
      ],
    });
    const diag = openDiagStore(diagPath, createControlledClock(0));
    const main = openStore(":memory:", createControlledClock(0));
    try {
      await main.store.createInstance(BUNDLE_INSTANCE);
      const bundle = await createDebugBundleExporter(
        main.store,
        redactPayloadsPolicy,
        diag.reader,
      ).exportDebugBundle("inst-1");
      expect(bundle).not.toBeNull();
      const section = bundle?.rejectedInputs;
      expect(section?.status).toBe("present");
      if (section?.status !== "present") return;
      expect(section.rows).toHaveLength(1);
      const row = section.rows[0];
      // The row itself appears under the closed kind/source/at/ordinal
      // projection — every spawn-specific field structurally absent.
      expect(row?.kind).toBe("spawn_outcome");
      expect(row?.source).toBe("runner");
      const keys = Object.keys(row ?? {});
      expect(keys).not.toContain("spawnOutcome");
      expect(keys).not.toContain("spawnDetail");
      expect(keys).not.toContain("attemptId");
      expect(keys).not.toContain("contextPacketId");
      // Neither the collision token nor the untrusted tail leaks anywhere
      // into the serialized bundle.
      const serialized = JSON.stringify(bundle);
      expect(serialized).not.toContain("name_collision");
      expect(serialized).not.toContain("secret-marker");
    } finally {
      diag.close();
      main.close();
    }
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

// ===========================================================================
// packet ch9-p3a, DG3 — the errand_transition rows: emit/read parity, every
// new presence iff violated in BOTH directions → read_failed; the requestId
// re-scope's both-direction pair; the bundle exclusion unchanged.
// ===========================================================================
const B_ERR_CREATE: DiagnosticEventBody = {
  source: "runner",
  kind: "errand_transition",
  instanceId: "inst-1",
  contextPacketId: "inst-1@v2",
  errandEdge: "create",
  errandTo: "pending",
};
const B_ERR_ATTEMPT: DiagnosticEventBody = {
  source: "runner",
  kind: "errand_transition",
  instanceId: "inst-1",
  contextPacketId: "inst-1@v2",
  errandEdge: "attempt-start",
  errandFrom: "claimed",
  errandTo: "attempting",
  attemptId: "att-1",
};
const B_ERR_MOOT: DiagnosticEventBody = {
  source: "runner",
  kind: "errand_transition",
  instanceId: "inst-1",
  contextPacketId: "inst-1@v2",
  errandEdge: "moot",
  errandFrom: "pending",
  errandTo: "mooted",
};
const B_ERR_PROMO: DiagnosticEventBody = {
  source: "runner",
  kind: "errand_transition",
  instanceId: "inst-1",
  contextPacketId: "inst-1@v2",
  errandEdge: "evidence-promotion",
  errandFrom: "unconfirmed",
  errandTo: "confirmed",
};

describe("errand_transition rows — emit/read round-trip with exact keysets (DG3)", () => {
  it("ROUND-TRIPS a birth edge, an attempt-scoped edge, a moot, and a promotion", async () => {
    const handle = openDiagStore(":memory:", createControlledClock(7));
    handle.sink.emit(B_ERR_CREATE);
    handle.sink.emit(B_ERR_ATTEMPT);
    handle.sink.emit(B_ERR_MOOT);
    handle.sink.emit(B_ERR_PROMO);
    const events = await handle.reader.getGlobalDiagnostics(0);
    expect(events).toEqual([
      { ...B_ERR_CREATE, at: 7, ordinal: 1 },
      { ...B_ERR_ATTEMPT, at: 7, ordinal: 2 },
      { ...B_ERR_MOOT, at: 7, ordinal: 3 },
      { ...B_ERR_PROMO, at: 7, ordinal: 4 },
    ]);
    handle.close();
  });

  it("attributed errand rows read back on the instance surface", async () => {
    const handle = openDiagStore(":memory:", createControlledClock(0));
    handle.sink.emit(B_ERR_ATTEMPT);
    const events = await handle.reader.getDiagnostics("inst-1", 0);
    expect(events.map((e) => e.kind)).toEqual(["errand_transition"]);
    handle.close();
  });
});

const ERRAND_R3_FIXTURES: readonly { name: string; body: string }[] = [
  // errand kind ⇔ runner source.
  { name: "errand_transition with source kernel", body: JSON.stringify({ source: "kernel", kind: "errand_transition", instanceId: "i", contextPacketId: "i@v2", errandEdge: "create", errandTo: "pending" }) },
  // contextPacketId/errandEdge/errandTo iff errand_transition (both directions).
  { name: "errand row MISSING contextPacketId", body: JSON.stringify({ source: "runner", kind: "errand_transition", instanceId: "i", errandEdge: "create", errandTo: "pending" }) },
  { name: "errand row MISSING errandEdge", body: JSON.stringify({ source: "runner", kind: "errand_transition", instanceId: "i", contextPacketId: "i@v2", errandTo: "pending" }) },
  { name: "errand row MISSING errandTo", body: JSON.stringify({ source: "runner", kind: "errand_transition", instanceId: "i", contextPacketId: "i@v2", errandEdge: "create" }) },
  { name: "provisioning kind carrying contextPacketId", body: JSON.stringify({ source: "runner", kind: "provision_ready", instanceId: "i", requestId: "r", contextPacketId: "i@v2" }) },
  { name: "kernel kind carrying errandEdge", body: JSON.stringify({ ...KDUP, errandEdge: "create" }) },
  // errandEdge / errandTo / errandFrom domain membership.
  { name: "errandEdge not in the edge domain", body: JSON.stringify({ source: "runner", kind: "errand_transition", instanceId: "i", contextPacketId: "i@v2", errandEdge: "teleport", errandTo: "pending" }) },
  { name: "errandTo not an ErrandState", body: JSON.stringify({ source: "runner", kind: "errand_transition", instanceId: "i", contextPacketId: "i@v2", errandEdge: "create", errandTo: "levitating" }) },
  { name: "errandFrom not an ErrandState", body: JSON.stringify({ source: "runner", kind: "errand_transition", instanceId: "i", contextPacketId: "i@v2", errandEdge: "claim", errandFrom: "levitating", errandTo: "claimed" }) },
  // errandFrom iff a NON-birth edge (both directions).
  { name: "a BIRTH edge (create) carrying errandFrom", body: JSON.stringify({ source: "runner", kind: "errand_transition", instanceId: "i", contextPacketId: "i@v2", errandEdge: "create", errandFrom: "pending", errandTo: "pending" }) },
  { name: "a NON-birth edge (claim) MISSING errandFrom", body: JSON.stringify({ source: "runner", kind: "errand_transition", instanceId: "i", contextPacketId: "i@v2", errandEdge: "claim", errandTo: "claimed" }) },
  { name: "reconcile-backfill (birth) carrying errandFrom", body: JSON.stringify({ source: "runner", kind: "errand_transition", instanceId: "i", contextPacketId: "i@v2", errandEdge: "reconcile-backfill", errandFrom: "pending", errandTo: "confirmed" }) },
  // attemptId iff an attempt-scoped edge (both directions).
  { name: "an attempt-scoped edge (attempt-start) MISSING attemptId", body: JSON.stringify({ source: "runner", kind: "errand_transition", instanceId: "i", contextPacketId: "i@v2", errandEdge: "attempt-start", errandFrom: "claimed", errandTo: "attempting" }) },
  { name: "a NON-attempt-scoped edge (moot) carrying attemptId", body: JSON.stringify({ source: "runner", kind: "errand_transition", instanceId: "i", contextPacketId: "i@v2", errandEdge: "moot", errandFrom: "pending", errandTo: "mooted", attemptId: "a" }) },
  { name: "a birth edge (create) carrying attemptId", body: JSON.stringify({ source: "runner", kind: "errand_transition", instanceId: "i", contextPacketId: "i@v2", errandEdge: "create", errandTo: "pending", attemptId: "a" }) },
  { name: "attemptId not a string", body: JSON.stringify({ source: "runner", kind: "errand_transition", instanceId: "i", contextPacketId: "i@v2", errandEdge: "confirm", errandFrom: "attempting", errandTo: "confirmed", attemptId: 5 }) },
  // the requestId re-scope's both-direction pair.
  { name: "errand_transition carrying requestId (the re-scope)", body: JSON.stringify({ source: "runner", kind: "errand_transition", instanceId: "i", contextPacketId: "i@v2", errandEdge: "create", errandTo: "pending", requestId: "r" }) },
  { name: "provision_ready MISSING requestId (re-scope unchanged)", body: JSON.stringify({ source: "runner", kind: "provision_ready", instanceId: "i" }) },
  // runner attribution exclusions carry to errand rows too.
  { name: "errand row MISSING instanceId", body: JSON.stringify({ source: "runner", kind: "errand_transition", contextPacketId: "i@v2", errandEdge: "create", errandTo: "pending" }) },
  { name: "errand row carrying opId", body: JSON.stringify({ source: "runner", kind: "errand_transition", instanceId: "i", contextPacketId: "i@v2", errandEdge: "create", errandTo: "pending", opId: "o" }) },
  { name: "errand row carrying payloadDigest", body: JSON.stringify({ source: "runner", kind: "errand_transition", instanceId: "i", contextPacketId: "i@v2", errandEdge: "create", errandTo: "pending", payloadDigest: "d" }) },
  // a provisioning kind carrying attemptId.
  { name: "provision_ready carrying attemptId", body: JSON.stringify({ source: "runner", kind: "provision_ready", instanceId: "i", requestId: "r", attemptId: "a" }) },
];

describe("errand_transition rows — every new presence iff violated (both directions) → read_failed", () => {
  it.each(ERRAND_R3_FIXTURES)("$name", async ({ body }) => {
    const path = tempDbPath();
    const handle = openDiagStore(path, createControlledClock(0));
    insertRaw(path, body, "i");
    expect(await reasonOf(handle.reader.getGlobalDiagnostics(0))).toBe("read_failed");
    handle.close();
  });

  it("the provisioning kinds STILL carry requestId (the re-scope left them unchanged)", async () => {
    const handle = openDiagStore(":memory:", createControlledClock(0));
    handle.sink.emit(B_RUN_READY);
    const events = await handle.reader.getGlobalDiagnostics(0);
    expect((events[0] as DiagnosticEvent).requestId).toBe("req-1000-1");
    handle.close();
  });
});

// ===========================================================================
// packet ch9-p3b, DG2 — the spawn_outcome rows + the two H5 successor edges:
// emit/read parity, every new presence iff violated in BOTH directions →
// read_failed, the contextPacketId re-scope split, the new-edge iffs.
// ===========================================================================
const B_SPAWN: DiagnosticEventBody = {
  source: "runner",
  kind: "spawn_outcome",
  instanceId: "inst-1",
  contextPacketId: "inst-1@v2",
  attemptId: "att-1",
  spawnOutcome: "submitted",
};
const B_SPAWN_DETAIL: DiagnosticEventBody = {
  source: "runner",
  kind: "spawn_outcome",
  instanceId: "inst-1",
  contextPacketId: "inst-1@v2",
  attemptId: "att-2",
  spawnOutcome: "spawn_infra",
  spawnDetail: "stderr tail: fatal boom",
};
const B_EVID_CLAIM: DiagnosticEventBody = {
  source: "runner",
  kind: "errand_transition",
  instanceId: "inst-1",
  contextPacketId: "inst-1@v2",
  errandEdge: "evidence-at-claim",
  errandFrom: "claimed",
  errandTo: "confirmed",
};
const B_EVID_RESPAWN: DiagnosticEventBody = {
  source: "runner",
  kind: "errand_transition",
  instanceId: "inst-1",
  contextPacketId: "inst-1@v2",
  errandEdge: "evidence-at-respawn",
  errandFrom: "unconfirmed",
  errandTo: "confirmed",
};

describe("spawn_outcome rows — emit/read round-trip + the new evidence edges (DG2)", () => {
  it("ROUND-TRIPS a spawn_outcome (with and without spawnDetail) and both new evidence edges", async () => {
    const handle = openDiagStore(":memory:", createControlledClock(5));
    handle.sink.emit(B_SPAWN);
    handle.sink.emit(B_SPAWN_DETAIL);
    handle.sink.emit(B_EVID_CLAIM);
    handle.sink.emit(B_EVID_RESPAWN);
    const events = await handle.reader.getGlobalDiagnostics(0);
    expect(events).toEqual([
      { ...B_SPAWN, at: 5, ordinal: 1 },
      { ...B_SPAWN_DETAIL, at: 5, ordinal: 2 },
      { ...B_EVID_CLAIM, at: 5, ordinal: 3 },
      { ...B_EVID_RESPAWN, at: 5, ordinal: 4 },
    ]);
    handle.close();
  });

  it("every SPAWN_OUTCOMES token round-trips — name_collision INCLUDED (packet ch9-p4a, DG3: the P3b-pre-authorized growth)", async () => {
    const handle = openDiagStore(":memory:", createControlledClock(0));
    for (const token of ["submitted", "no_output", "spawn_infra", "nonzero_exit", "own_timeout", "foreign_kill", "name_collision"] as const) {
      handle.sink.emit({ ...B_SPAWN, spawnOutcome: token });
    }
    const events = await handle.reader.getGlobalDiagnostics(0);
    expect(events.map((e) => e.spawnOutcome)).toEqual([
      "submitted",
      "no_output",
      "spawn_infra",
      "nonzero_exit",
      "own_timeout",
      "foreign_kill",
      "name_collision",
    ]);
    handle.close();
  });

  it("DG3: the name_collision token rides ONLY the spawn_outcome kind — on another kind it still rejects (the iff shape unchanged)", async () => {
    const path = tempDbPath();
    const handle = openDiagStore(path, createControlledClock(0));
    handle.sink.emit(B_SPAWN); // a valid row so the read has something to fail over
    const db = new DatabaseSync(path);
    db.prepare("INSERT INTO diagnostics (at, instance_id, body) VALUES (1, 'i', ?)").run(
      JSON.stringify({
        source: "runner",
        kind: "errand_transition",
        instanceId: "i",
        contextPacketId: "i@v2",
        errandEdge: "create",
        errandTo: "pending",
        spawnOutcome: "name_collision",
      }),
    );
    db.close();
    await expect(handle.reader.getGlobalDiagnostics(0)).rejects.toMatchObject({
      name: "DiagUnavailableError",
      reason: "read_failed",
    });
    handle.close();
  });

  it("attributed spawn_outcome rows read back on the instance surface", async () => {
    const handle = openDiagStore(":memory:", createControlledClock(0));
    handle.sink.emit(B_SPAWN);
    const events = await handle.reader.getDiagnostics("inst-1", 0);
    expect(events.map((e) => e.kind)).toEqual(["spawn_outcome"]);
    handle.close();
  });
});

const SPAWN_R3_FIXTURES: readonly { name: string; body: string }[] = [
  // spawn_outcome kind ⇔ runner source (both directions).
  { name: "spawn_outcome with source kernel", body: JSON.stringify({ source: "kernel", kind: "spawn_outcome", instanceId: "i", contextPacketId: "i@v2", attemptId: "a", spawnOutcome: "submitted" }) },
  { name: "runner source with an unknown kind", body: JSON.stringify({ source: "runner", kind: "not_a_kind", instanceId: "i" }) },
  // spawnOutcome iff spawn_outcome (both directions).
  { name: "spawn_outcome MISSING spawnOutcome", body: JSON.stringify({ source: "runner", kind: "spawn_outcome", instanceId: "i", contextPacketId: "i@v2", attemptId: "a" }) },
  { name: "errand_transition carrying spawnOutcome", body: JSON.stringify({ source: "runner", kind: "errand_transition", instanceId: "i", contextPacketId: "i@v2", errandEdge: "create", errandTo: "pending", spawnOutcome: "submitted" }) },
  { name: "kernel kind carrying spawnOutcome", body: JSON.stringify({ ...KDUP, spawnOutcome: "submitted" }) },
  // spawnOutcome domain membership (name_collision JOINED the domain at
  // ch9-P4a DG3 — its admitted round-trip lives above; a nonsense token
  // still rejects).
  { name: "spawnOutcome not in the token domain", body: JSON.stringify({ source: "runner", kind: "spawn_outcome", instanceId: "i", contextPacketId: "i@v2", attemptId: "a", spawnOutcome: "teleported" }) },
  // spawnDetail ⇒ spawn_outcome; string-typed.
  { name: "errand_transition carrying spawnDetail", body: JSON.stringify({ source: "runner", kind: "errand_transition", instanceId: "i", contextPacketId: "i@v2", errandEdge: "create", errandTo: "pending", spawnDetail: "x" }) },
  { name: "spawnDetail not a string", body: JSON.stringify({ source: "runner", kind: "spawn_outcome", instanceId: "i", contextPacketId: "i@v2", attemptId: "a", spawnOutcome: "submitted", spawnDetail: 5 }) },
  // contextPacketId re-scope: required on spawn_outcome; a kernel kind carrying it rejects.
  { name: "spawn_outcome MISSING contextPacketId", body: JSON.stringify({ source: "runner", kind: "spawn_outcome", instanceId: "i", attemptId: "a", spawnOutcome: "submitted" }) },
  { name: "kernel kind carrying contextPacketId (re-scope reaches only the two runner kinds)", body: JSON.stringify({ ...KDUP, contextPacketId: "i@v2" }) },
  // attemptId ALWAYS present on spawn_outcome.
  { name: "spawn_outcome MISSING attemptId", body: JSON.stringify({ source: "runner", kind: "spawn_outcome", instanceId: "i", contextPacketId: "i@v2", spawnOutcome: "submitted" }) },
  // spawn_outcome carries NO errand fields.
  { name: "spawn_outcome carrying errandEdge", body: JSON.stringify({ source: "runner", kind: "spawn_outcome", instanceId: "i", contextPacketId: "i@v2", attemptId: "a", spawnOutcome: "submitted", errandEdge: "create" }) },
  { name: "spawn_outcome carrying errandTo", body: JSON.stringify({ source: "runner", kind: "spawn_outcome", instanceId: "i", contextPacketId: "i@v2", attemptId: "a", spawnOutcome: "submitted", errandTo: "pending" }) },
  // spawn_outcome carries NO op-world attribution / requestId.
  { name: "spawn_outcome carrying opId", body: JSON.stringify({ source: "runner", kind: "spawn_outcome", instanceId: "i", contextPacketId: "i@v2", attemptId: "a", spawnOutcome: "submitted", opId: "o" }) },
  { name: "spawn_outcome carrying requestId", body: JSON.stringify({ source: "runner", kind: "spawn_outcome", instanceId: "i", contextPacketId: "i@v2", attemptId: "a", spawnOutcome: "submitted", requestId: "r" }) },
  { name: "spawn_outcome MISSING instanceId", body: JSON.stringify({ source: "runner", kind: "spawn_outcome", contextPacketId: "i@v2", attemptId: "a", spawnOutcome: "submitted" }) },
  // the two H5 successor edges are NON-attempt-scoped AND non-birth (both directions).
  { name: "evidence-at-claim carrying attemptId (non-attempt-scoped)", body: JSON.stringify({ source: "runner", kind: "errand_transition", instanceId: "i", contextPacketId: "i@v2", errandEdge: "evidence-at-claim", errandFrom: "claimed", errandTo: "confirmed", attemptId: "a" }) },
  { name: "evidence-at-respawn carrying attemptId (non-attempt-scoped)", body: JSON.stringify({ source: "runner", kind: "errand_transition", instanceId: "i", contextPacketId: "i@v2", errandEdge: "evidence-at-respawn", errandFrom: "unconfirmed", errandTo: "confirmed", attemptId: "a" }) },
  { name: "evidence-at-claim MISSING errandFrom (non-birth)", body: JSON.stringify({ source: "runner", kind: "errand_transition", instanceId: "i", contextPacketId: "i@v2", errandEdge: "evidence-at-claim", errandTo: "confirmed" }) },
  { name: "evidence-at-respawn MISSING errandFrom (non-birth)", body: JSON.stringify({ source: "runner", kind: "errand_transition", instanceId: "i", contextPacketId: "i@v2", errandEdge: "evidence-at-respawn", errandTo: "confirmed" }) },
];

describe("spawn_outcome + evidence-edge rows — every new presence iff violated (both directions) → read_failed", () => {
  it.each(SPAWN_R3_FIXTURES)("$name", async ({ body }) => {
    const path = tempDbPath();
    const handle = openDiagStore(path, createControlledClock(0));
    insertRaw(path, body, "i");
    expect(await reasonOf(handle.reader.getGlobalDiagnostics(0))).toBe("read_failed");
    handle.close();
  });

  it("the ingress `detail` iff is UNTOUCHED by the spawnDetail sibling (a runner row carrying detail still rejects)", async () => {
    const path = tempDbPath();
    const handle = openDiagStore(path, createControlledClock(0));
    insertRaw(
      path,
      JSON.stringify({ source: "runner", kind: "spawn_outcome", instanceId: "i", contextPacketId: "i@v2", attemptId: "a", spawnOutcome: "submitted", detail: "unknown_key" }),
      "i",
    );
    expect(await reasonOf(handle.reader.getGlobalDiagnostics(0))).toBe("read_failed");
    handle.close();
  });
});

// A VALID representative body of EVERY sibling kind (guards the iff walk against
// vacuity — each base reads clean; injecting spawnOutcome/spawnDetail then flips
// it to read_failed). This parameterizes the spawn_outcome field iffs over the
// COMPLETE sibling-kind set, not just the two hand-picked ones (finding 3).
const SIBLING_VALID_BODIES: readonly { kind: string; body: Record<string, unknown> }[] = [
  { kind: "rejected (kernel, post-digest)", body: { source: "kernel", kind: "rejected", reason: "not_authorized", instanceId: "i", opId: "o", actorId: "a", type: "t", payloadDigest: "d" } },
  { kind: "stale", body: { source: "kernel", kind: "stale", instanceId: "i", opId: "o", actorId: "a", type: "t", payloadDigest: "d", expectedVersion: 1, currentVersion: 2 } },
  { kind: "duplicate", body: { source: "kernel", kind: "duplicate", instanceId: "i", opId: "o", actorId: "a", type: "t", payloadDigest: "d" } },
  { kind: "cas_restart", body: { source: "kernel", kind: "cas_restart", instanceId: "i", opId: "o", actorId: "a", type: "t", payloadDigest: "d" } },
  { kind: "internal_failure", body: { source: "kernel", kind: "internal_failure", instanceId: "i", opId: "o", actorId: "a", type: "t", error: { name: "E", message: "m" } } },
  { kind: "provision_ready", body: { source: "runner", kind: "provision_ready", instanceId: "i", requestId: "r" } },
  { kind: "provision_failed", body: { source: "runner", kind: "provision_failed", instanceId: "i", requestId: "r", providerReason: "x" } },
  { kind: "errand_transition", body: { source: "runner", kind: "errand_transition", instanceId: "i", contextPacketId: "i@v2", errandEdge: "create", errandTo: "pending" } },
  { kind: "ingress rejected", body: { source: "ingress", kind: "rejected", reason: "invalid_shape", detail: "not_plain_object" } },
];

describe("spawn_outcome field iffs — parameterized over EVERY sibling kind (finding 3)", () => {
  it.each(SIBLING_VALID_BODIES)(
    "$kind: base reads clean; +spawnOutcome and +spawnDetail each → read_failed",
    async ({ body }) => {
      // (a) the base is a VALID projection (a wrong base would make the iff vacuous).
      const clean = openDiagStore(":memory:", createControlledClock(0));
      clean.sink.emit(body as unknown as DiagnosticEventBody);
      expect((await clean.reader.getGlobalDiagnostics(0)).length).toBe(1);
      clean.close();
      // (b) spawnOutcome present on a NON-spawn_outcome kind → read_failed (the iff).
      const p1 = tempDbPath();
      const h1 = openDiagStore(p1, createControlledClock(0));
      insertRaw(p1, JSON.stringify({ ...body, spawnOutcome: "submitted" }), "i");
      expect(await reasonOf(h1.reader.getGlobalDiagnostics(0))).toBe("read_failed");
      h1.close();
      // (c) spawnDetail present on a NON-spawn_outcome kind → read_failed.
      const p2 = tempDbPath();
      const h2 = openDiagStore(p2, createControlledClock(0));
      insertRaw(p2, JSON.stringify({ ...body, spawnDetail: "tail" }), "i");
      expect(await reasonOf(h2.reader.getGlobalDiagnostics(0))).toBe("read_failed");
      h2.close();
    },
  );
});
