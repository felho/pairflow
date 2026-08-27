import { createStaticProviderRegistry } from "../ports/index.js";
import { createScriptedProcessGateRunner } from "../testkit/index.js";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { afterEach, describe, expect, it } from "vitest";

import { noopDiagnosticsSink, openDiagStore } from "../diag/index.js";
import type { EventEnvelope, TransitionEntry, WorkflowInstance } from "../domain/index.js";
import { deriveEmitDigest } from "../emit/index.js";
import { createKernel } from "../kernel/index.js";
import type { Kernel } from "../kernel/index.js";
import type {
  DiagnosticEvent,
  DiagnosticEventBody,
  DiagnosticsReader,
} from "../ports/diagnostics.js";
import type { InstanceDetail, StorePort } from "../ports/store.js";
import { openStore } from "../store/index.js";
import {
  createControlledClock,
  devPassthroughRedactionPolicy,
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
import type {
  BundleDiagRow,
  BundleTranscriptRow,
  DebugBundle,
  RejectedInputsSection,
} from "./debugBundle.js";
import { createDebugBundleExporter, redactPayloadsPolicy } from "./debugBundle.js";

const definitions = fixtureDefinitionStore(admit(fixtureTemplate()));

const instance: WorkflowInstance = {
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

// Markers planted in committed payloads — the default-policy negative
// scans the ENTIRE serialized bundle for them (build watchpoint).
// Plain alphanumeric so JSON escaping cannot flatten them (dim 9).
const MARKER_A = "MARKERPAYLOADALPHA9f3";
const MARKER_B = "MARKERNESTEDBRAVOc71";
const MARKER_C = "MARKERSECONDCHARLIEe02";
const MARKER_MSG = "MARKERHOSTILEMSG4242";
const MARKER_CARRIER = "MARKERCARRIERMSG777";
const MARKER_NAME = "MARKERHOSTILENAME999";

function env(
  opId: string,
  type: string,
  expectedVersion?: number,
  payload?: unknown,
  expectedRole = "implementer",
): EventEnvelope {
  return {
    instanceId: "inst-1",
    opId,
    type,
    actorId: "codex",
    ...(expectedVersion !== undefined ? { expectedVersion } : {}),
    ...(payload !== undefined ? { payload } : {}),
    expectedRole,
  };
}

async function committed(kernel: Kernel, envelope: EventEnvelope): Promise<void> {
  const outcome = await kernel.handle(envelope);
  expect(outcome.kind).toBe("committed");
}

/** Seeds: row 1 payload w/o eventId; row 2 payload + eventId; row 3
 * no payload, no eventId (implement → review → implement → review). */
async function seeded(): Promise<{ store: StorePort; close: () => void }> {
  const handle = openStore(":memory:", createControlledClock(0));
  await handle.store.createInstance(instance);
  const kernel = createKernel({
      providerRegistry: createStaticProviderRegistry({}),
      processRunner: createScriptedProcessGateRunner([]),
    store: handle.store,
    definitions,
    time: createControlledClock(0),
    digest: deriveEmitDigest,
    gates: gateCatalog,
    diag: noopDiagnosticsSink,
  });
  await committed(kernel, env("a1", "PASS", 1, { ref: MARKER_A, nested: { deep: MARKER_B } }));
  await committed(kernel, { ...env("b2", "PASS", 2, { note: MARKER_C }, "reviewer"), eventId: "evt-42" });
  await committed(kernel, env("c3", "PASS", 3));
  return { store: handle.store, close: () => handle.close() };
}

const dirs: string[] = [];

function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "v3-bundle-"));
  dirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of dirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

/** Healthy, empty diag reader — the known-empty baseline. */
function emptyDiag(): { reader: DiagnosticsReader; close(): void } {
  const handle = openDiagStore(":memory:", createControlledClock(0));
  return { reader: handle.reader, close: () => handle.close() };
}

/** Build a raw diag DB via a second connection (the P2 fixture culture). */
function buildRawDiag(
  path: string,
  opts: {
    prototype?: string | null;
    rows?: readonly { body: string; instanceId?: string | null }[];
  } = {},
): void {
  const { prototype = "true", rows = [] } = opts;
  const raw = new DatabaseSync(path);
  raw.exec("CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL) STRICT");
  raw.exec(
    "CREATE TABLE diagnostics (ordinal INTEGER PRIMARY KEY AUTOINCREMENT, at INTEGER NOT NULL, instance_id TEXT, body TEXT NOT NULL) STRICT",
  );
  const ins = raw.prepare("INSERT INTO meta (key, value) VALUES (?, ?)");
  ins.run("schema_version", "1");
  if (prototype !== null) ins.run("prototype", prototype);
  const rowIns = raw.prepare("INSERT INTO diagnostics (at, instance_id, body) VALUES (?, ?, ?)");
  for (const r of rows) rowIns.run(0, r.instanceId ?? null, r.body);
  raw.close();
}

async function exportWith(
  store: StorePort,
  reader: DiagnosticsReader,
  policy = redactPayloadsPolicy,
): Promise<DebugBundle | null> {
  return createDebugBundleExporter(store, policy, reader).exportDebugBundle("inst-1");
}

/** The committed half, serialized — the byte-identical-twin assert. */
function committedHalf(bundle: DebugBundle | null): string {
  expect(bundle).not.toBeNull();
  return JSON.stringify({ instance: bundle?.instance, transcript: bundle?.transcript });
}

function sectionOf(bundle: DebugBundle | null): RejectedInputsSection {
  expect(bundle).not.toBeNull();
  if (bundle === null) throw new Error("unreachable");
  return bundle.rejectedInputs;
}

function rowsOf(bundle: DebugBundle | null): readonly BundleDiagRow[] {
  const section = sectionOf(bundle);
  expect(section.status).toBe("present");
  return section.status === "present" ? section.rows : [];
}

/** F4 (packet ch12-p1b): narrow the bundle transcript to its
 * transition rows — a transition's envelope/payloadDigest ride the row;
 * fact rows carry neither (the class-shared fields only). `seeded()`
 * builds via `createInstance` + kernel emits, so every row is a
 * transition, but the union demands the narrow. */
function bundleTx(bundle: DebugBundle | null): readonly BundleTranscriptRow[] {
  return (bundle?.transcript ?? []).filter((r): r is BundleTranscriptRow => "envelope" in r);
}

/** The detail-side twin: narrow committed rows to transition entries. */
function detailTx(detail: InstanceDetail | null): readonly TransitionEntry[] {
  return (detail?.transcript ?? []).filter(
    (e): e is TransitionEntry => e.entryKind === "transition",
  );
}

// ── The canonical bundle schema matrix (the packet's K matrix — the
// single source; supersedes ch6-P3's rejectedInputs row, every other
// level inherited unchanged) ─────────────────────────────────────────
const BUNDLE_KEYS = ["formatVersion", "policy", "instance", "transcript", "rejectedInputs"];
const INSTANCE_KEYS = [
  "instanceId",
  "templateRef",
  "task",
  "binding",
  "currentStep",
  "round",
  // ch12-p1a (W3): the axis fields ride the zero-projection passthrough —
  // `status` disappeared with its column (C21 realized), the axis pair +
  // the P1a-constant fields surface structurally.
  "kernelStatus",
  "terminalDisposition",
  "activationMode",
  "wait",
  "failureReason",
  // ch12-p1b (G2): the C9 create-snapshot rides the INSTANCE-carrying
  // read payloads verbatim — additive, every pre-existing key deep-equal.
  "runOverrides",
  "version",
  // ch11-P3b (S1/dimension 12): the instance's runtimeContext rides the
  // INSTANCE-carrying read payloads verbatim — additive, every pre-existing
  // key deep-equal.
  "runtimeContext",
];
const ROW_KEYS = ["seq", "committedAt", "payloadDigest", "envelope"];
// F4 (packet ch12-p1b): a lifecycle fact row's closed keyset — the
// class-shared fields only; the transition-only fields ABSENT by class.
const FACT_ROW_KEYS = ["seq", "entryKind", "opId", "committedAt"];
const ENVELOPE_REQUIRED = ["instanceId", "opId", "type", "actorId", "hasPayload"];
const ENVELOPE_OPTIONAL = ["expectedVersion", "expectedRole", "eventId", "payload"];
const PRESENT_KEYS = ["status", "rows"];
const UNAVAILABLE_KEYS = ["status", "reason"];
const UNAVAILABLE_REASONS = ["open_failed", "refused_marker", "read_failed"];

function assertExactKeys(value: object, expected: readonly string[]): void {
  expect(Object.keys(value).sort()).toEqual([...expected].sort());
}

function assertKeysWithin(
  value: object,
  required: readonly string[],
  optional: readonly string[],
): void {
  const keys = Object.keys(value);
  for (const key of required) {
    expect(keys).toContain(key);
  }
  const allowed = [...required, ...optional];
  for (const key of keys) {
    expect(allowed).toContain(key);
  }
}

function assertSectionSchema(section: RejectedInputsSection): void {
  if (section.status === "present") {
    assertExactKeys(section, PRESENT_KEYS);
  } else {
    assertExactKeys(section, UNAVAILABLE_KEYS);
    expect(UNAVAILABLE_REASONS).toContain(section.reason);
  }
}

function assertBundleSchema(bundle: DebugBundle): void {
  assertExactKeys(bundle, BUNDLE_KEYS);
  assertExactKeys(bundle.instance, INSTANCE_KEYS);
  assertSectionSchema(bundle.rejectedInputs);
  for (const row of bundle.transcript) {
    // F4: assert the closed keyset per class — a fact row carries the
    // class-shared fields only, a transition row keeps its EXACT built
    // keyset (no entryKind, envelope present).
    if ("entryKind" in row) {
      assertExactKeys(row, FACT_ROW_KEYS);
    } else {
      assertExactKeys(row, ROW_KEYS);
      assertKeysWithin(row.envelope, ENVELOPE_REQUIRED, ENVELOPE_OPTIONAL);
    }
  }
}

describe("debug bundle — the §6.4 export + redaction boundary (packet ch6-P3)", () => {
  it("dim 1 — default policy: NO payload material anywhere in the entire serialized bundle", async () => {
    const { store, close } = await seeded();
    const diag = emptyDiag();
    const bundle = await exportWith(store, diag.reader);

    const text = JSON.stringify(bundle);
    expect(text).not.toContain(MARKER_A);
    expect(text).not.toContain(MARKER_B);
    expect(text).not.toContain(MARKER_C);
    for (const row of bundleTx(bundle)) {
      expect("payload" in row.envelope).toBe(false);
    }
    expect(bundle?.policy).toBe("redact-payloads");
    diag.close();
    close();
  });

  it("dim 2 — complete committed metadata: rows, digests, flags, eventId presence/absence", async () => {
    const { store, close } = await seeded();
    const diag = emptyDiag();
    const detail = await store.getInstanceDetail("inst-1");
    const bundle = await exportWith(store, diag.reader);

    expect(bundle?.formatVersion).toBe(1);
    expect(bundle?.instance).toEqual(detail?.instance);
    expect(bundle?.transcript.map((r) => r.seq)).toEqual([1, 2, 3]);
    expect(bundleTx(bundle).map((r) => r.envelope.opId)).toEqual(["a1", "b2", "c3"]);
    expect(bundleTx(bundle).map((r) => r.payloadDigest)).toEqual(
      detailTx(detail).map((e) => e.payloadDigest),
    );
    expect(bundle?.transcript.map((r) => r.committedAt)).toEqual(
      detail?.transcript.map((e) => e.committedAt),
    );
    expect(bundleTx(bundle).map((r) => r.envelope.hasPayload)).toEqual([true, true, false]);
    expect(bundleTx(bundle).map((r) => r.envelope.expectedVersion)).toEqual([1, 2, 3]);
    expect(bundleTx(bundle).map((r) => r.envelope.eventId)).toEqual([
      undefined,
      "evt-42",
      undefined,
    ]);
    expect("eventId" in (bundleTx(bundle)[0]?.envelope ?? {})).toBe(false);
    diag.close();
    close();
  });

  it("O4 (ch11-P2b): bundle transcript rows do NOT carry gateDecisions — the projected keyset is unchanged", async () => {
    const { store, close } = await seeded();
    const diag = emptyDiag();
    // The committed transcript DOES carry gateDecisions (the read surface
    // that detail/timeline expose); the bundle is its OWN projected
    // surface and drops it (an added key would fail this).
    const detail = await store.getInstanceDetail("inst-1");
    expect(detailTx(detail).every((e) => Array.isArray(e.gateDecisions))).toBe(true);
    const bundle = await exportWith(store, diag.reader);
    for (const row of bundle?.transcript ?? []) {
      expect("gateDecisions" in row).toBe(false);
      expect(Object.keys(row).sort()).toEqual(
        ["committedAt", "envelope", "payloadDigest", "seq"].sort(),
      );
    }
    diag.close();
    close();
  });

  it("dim 3 — dev pass-through (explicit opt-in): payloads round-trip exactly, policy recorded", async () => {
    const { store, close } = await seeded();
    const diag = emptyDiag();
    const detail = await store.getInstanceDetail("inst-1");
    const bundle = await exportWith(store, diag.reader, devPassthroughRedactionPolicy);

    expect(bundle?.policy).toBe("dev-passthrough");
    expect(bundleTx(bundle).map((r) => r.envelope.payload)).toEqual(
      detailTx(detail).map((e) => e.envelope.payload),
    );
    // A payload-less op stays payload-less even under pass-through.
    expect("payload" in (bundleTx(bundle)[2]?.envelope ?? {})).toBe(false);
    diag.close();
    close();
  });

  it("dim 4 — unknown instance → null (the §6.2 duality)", async () => {
    const handle = openStore(":memory:", createControlledClock(0));
    const diag = emptyDiag();
    const exporter = createDebugBundleExporter(handle.store, redactPayloadsPolicy, diag.reader);
    expect(await exporter.exportDebugBundle("ghost")).toBeNull();
    diag.close();
    handle.close();
  });

  it("dims 5+6 — closed schema at EVERY level (matrix-driven); the ch6-P3 'absent' gap RESOLVED to known-empty", async () => {
    const { store, close } = await seeded();
    const diag = emptyDiag();
    const redacted = await exportWith(store, diag.reader);
    const passthrough = await exportWith(store, diag.reader, devPassthroughRedactionPolicy);

    for (const bundle of [redacted, passthrough]) {
      expect(bundle).not.toBeNull();
      if (bundle !== null) {
        assertBundleSchema(bundle);
        // S2: known-empty is `present` with zero rows — never
        // `unavailable`, never omitted (the retired `absent` state
        // cannot reappear: the union has no such member).
        expect(bundle.rejectedInputs).toEqual({ status: "present", rows: [] });
      }
    }
    diag.close();
    close();
  });

  it("dim 7/12 — deterministic: two exports of the same store + diag state are string-identical", async () => {
    const { store, close } = await seeded();
    const diag = emptyDiag();
    const exporter = createDebugBundleExporter(store, redactPayloadsPolicy, diag.reader);
    const first = await exporter.exportDebugBundle("inst-1");
    const second = await exporter.exportDebugBundle("inst-1");
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    diag.close();
    close();
  });
});

describe("bundle section-state matrix (S) — packet ch7-P3", () => {
  it("S1 — attributed rows exist: `present` with the FULL attributed history (cursor 0), ordinal-ascending", async () => {
    const { store, close } = await seeded();
    const diag = openDiagStore(":memory:", createControlledClock(0));
    diag.sink.emit({
      source: "kernel",
      kind: "duplicate",
      instanceId: "inst-1",
      opId: "s1-a",
      actorId: "codex",
      type: "PASS",
      payloadDigest: "dg-a",
    });
    diag.sink.emit({
      source: "kernel",
      kind: "rejected",
      reason: "unknown_instance",
      instanceId: "inst-1",
      opId: "s1-b",
      actorId: "codex",
      type: "PASS",
    });

    const bundle = await exportWith(store, diag.reader);
    const rows = rowsOf(bundle);
    expect(rows.map((row) => row.ordinal)).toEqual([1, 2]);
    expect(rows.map((row) => row.kind)).toEqual(["duplicate", "rejected"]);
    diag.close();
    close();
  });

  it("S2 — diag store open, zero attributed rows: `present` with [] — NEVER unavailable, never omitted", async () => {
    const { store, close } = await seeded();
    const diag = emptyDiag();
    const bundle = await exportWith(store, diag.reader);
    expect(sectionOf(bundle)).toEqual({ status: "present", rows: [] });
    diag.close();
    close();
  });

  it("S3 — open failure (garbage bytes; directory path): unavailable(open_failed), the bundle SUCCEEDS, committed half byte-identical to the healthy twin", async () => {
    const { store, close } = await seeded();
    const healthy = emptyDiag();
    const twin = await exportWith(store, healthy.reader);

    const garbagePath = join(tempDir(), "diag.sqlite");
    writeFileSync(garbagePath, "this is not a sqlite database, just some garbage bytes");
    const garbage = openDiagStore(garbagePath, createControlledClock(0));
    const viaGarbage = await exportWith(store, garbage.reader);
    expect(sectionOf(viaGarbage)).toEqual({ status: "unavailable", reason: "open_failed" });
    expect(committedHalf(viaGarbage)).toBe(committedHalf(twin));

    const dirStore = openDiagStore(tempDir(), createControlledClock(0));
    const viaDir = await exportWith(store, dirStore.reader);
    expect(sectionOf(viaDir)).toEqual({ status: "unavailable", reason: "open_failed" });
    expect(committedHalf(viaDir)).toBe(committedHalf(twin));

    dirStore.close();
    garbage.close();
    healthy.close();
    close();
  });

  it("S4 — refused marker (the P2 O4–O6 family): unavailable(refused_marker), the bundle SUCCEEDS", async () => {
    const { store, close } = await seeded();
    const healthy = emptyDiag();
    const twin = await exportWith(store, healthy.reader);

    const path = join(tempDir(), "diag.sqlite");
    buildRawDiag(path, { prototype: null });
    const refused = openDiagStore(path, createControlledClock(0));
    const bundle = await exportWith(store, refused.reader);
    expect(sectionOf(bundle)).toEqual({ status: "unavailable", reason: "refused_marker" });
    expect(committedHalf(bundle)).toBe(committedHalf(twin));
    refused.close();
    healthy.close();
    close();
  });

  it("S5 — read failure (closed handle): unavailable(read_failed), the bundle SUCCEEDS", async () => {
    const { store, close } = await seeded();
    const healthy = emptyDiag();
    const twin = await exportWith(store, healthy.reader);

    const path = join(tempDir(), "diag.sqlite");
    const diag = openDiagStore(path, createControlledClock(0));
    diag.close();
    const bundle = await exportWith(store, diag.reader);
    expect(sectionOf(bundle)).toEqual({ status: "unavailable", reason: "read_failed" });
    expect(committedHalf(bundle)).toBe(committedHalf(twin));
    healthy.close();
    close();
  });

  it("S5 — read failure (raw-SQL corrupt row): unavailable(read_failed), the bundle SUCCEEDS", async () => {
    const { store, close } = await seeded();
    const path = join(tempDir(), "diag.sqlite");
    buildRawDiag(path, { rows: [{ body: "not json {{", instanceId: "inst-1" }] });
    const diag = openDiagStore(path, createControlledClock(0));
    const bundle = await exportWith(store, diag.reader);
    expect(sectionOf(bundle)).toEqual({ status: "unavailable", reason: "read_failed" });
    diag.close();
    close();
  });

  it("S8 — foreign-instance and unattributed rows staged in the REAL diag store never enter rejectedInputs.rows", async () => {
    const { store, close } = await seeded();
    const diag = openDiagStore(":memory:", createControlledClock(0));
    diag.sink.emit({
      source: "kernel",
      kind: "duplicate",
      instanceId: "inst-1",
      opId: "own",
      actorId: "codex",
      type: "PASS",
      payloadDigest: "dg-own",
    });
    diag.sink.emit({
      source: "kernel",
      kind: "duplicate",
      instanceId: "other-1",
      opId: "foreign",
      actorId: "codex",
      type: "PASS",
      payloadDigest: "dg-f",
    });
    diag.sink.emit({
      source: "ingress",
      kind: "rejected",
      reason: "invalid_shape",
      detail: "not_plain_object",
    });

    // The rows exist (global read, P4's dev-dump territory)…
    expect(await diag.reader.getGlobalDiagnostics(0)).toHaveLength(3);
    // …and the bundle's attributed-only selection excludes them.
    const rows = rowsOf(await exportWith(store, diag.reader));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.ordinal).toBe(1);
    diag.close();
    close();
  });

  it("S9 — a committed-half failure propagates: the export FAILS, never masked as unavailable; the diag reader is never the fallback", async () => {
    const failingStore: StorePort = {
      loadInstance: () => Promise.reject(new Error("unused")),
      findOp: () => Promise.reject(new Error("unused")),
      createInstance: () => Promise.reject(new Error("unused")),
      commitTransition: () => Promise.reject(new Error("unused")),
      commitLifecycle: () => Promise.reject(new Error("unused")),
      commitOperatorEntry: () => Promise.reject(new Error("unused")),
      listInstances: () => Promise.reject(new Error("unused")),
      getInstanceDetail: () => Promise.reject(new Error("detail-boom")),
      getTimeline: () => Promise.reject(new Error("unused")),
    };
    let readerCalls = 0;
    const reader: DiagnosticsReader = {
      getDiagnostics: () => {
        readerCalls += 1;
        return Promise.resolve([]);
      },
      getGlobalDiagnostics: () => Promise.reject(new Error("unused")),
    };
    const exporter = createDebugBundleExporter(failingStore, redactPayloadsPolicy, reader);
    await expect(exporter.exportDebugBundle("inst-1")).rejects.toThrow("detail-boom");
    expect(readerCalls).toBe(0);
  });
});

describe("S6 — contract-violating reader: every member degrades to unavailable(read_failed), the export succeeds", () => {
  it("member (i), NON-typed rejection", async () => {
    const { store, close } = await seeded();
    const reader: DiagnosticsReader = {
      getDiagnostics: () => Promise.reject(new Error("not a typed diag error")),
      getGlobalDiagnostics: () => Promise.reject(new Error("unused")),
    };
    const bundle = await exportWith(store, reader);
    expect(sectionOf(bundle)).toEqual({ status: "unavailable", reason: "read_failed" });
    close();
  });

  it("member (i), SYNCHRONOUS throw — the mis-scoped-catch falsifier (a catch around only the awaited promise fails here)", async () => {
    const { store, close } = await seeded();
    const reader: DiagnosticsReader = {
      getDiagnostics: () => {
        throw new Error("sync throw at the call site");
      },
      getGlobalDiagnostics: () => Promise.reject(new Error("unused")),
    };
    const bundle = await exportWith(store, reader);
    expect(sectionOf(bundle)).toEqual({ status: "unavailable", reason: "read_failed" });
    close();
  });

  it("member (ii), lying carrier — name-matched error with a NON-token reason degrades to read_failed; the lie never serializes (K3)", async () => {
    const { store, close } = await seeded();
    const carrier = new Error(`underlying driver text ${MARKER_CARRIER}`);
    carrier.name = "DiagUnavailableError";
    (carrier as unknown as { reason: string }).reason = "totally_bogus_reason";
    const reader: DiagnosticsReader = {
      getDiagnostics: () => Promise.reject(carrier),
      getGlobalDiagnostics: () => Promise.reject(new Error("unused")),
    };
    const bundle = await exportWith(store, reader);
    expect(sectionOf(bundle)).toEqual({ status: "unavailable", reason: "read_failed" });
    const text = JSON.stringify(bundle);
    expect(text).not.toContain("totally_bogus_reason");
    expect(text).not.toContain(MARKER_CARRIER);
    close();
  });

  it("member (iii), malformed resolved rows — internal_failure without `error` breaks the projection: unavailable(read_failed), never a thrown export", async () => {
    const { store, close } = await seeded();
    const malformed = {
      source: "kernel",
      kind: "internal_failure",
      instanceId: "inst-1",
      at: 0,
      ordinal: 1,
    } as unknown as DiagnosticEvent;
    const reader: DiagnosticsReader = {
      getDiagnostics: () => Promise.resolve([malformed]),
      getGlobalDiagnostics: () => Promise.reject(new Error("unused")),
    };
    const bundle = await exportWith(store, reader);
    expect(sectionOf(bundle)).toEqual({ status: "unavailable", reason: "read_failed" });
    close();
  });
});

describe("S7 / dimension 11 — unknown instance: null, the diag reader NEVER consulted", () => {
  it("a CALL-RECORDING rejecting reader + unknown id → clean null AND zero reader invocations", async () => {
    const handle = openStore(":memory:", createControlledClock(0));
    let calls = 0;
    const reader: DiagnosticsReader = {
      getDiagnostics: () => {
        calls += 1;
        return Promise.reject(new Error("poisoned"));
      },
      getGlobalDiagnostics: () => {
        calls += 1;
        return Promise.reject(new Error("poisoned"));
      },
    };
    const exporter = createDebugBundleExporter(handle.store, redactPayloadsPolicy, reader);
    expect(await exporter.exportDebugBundle("ghost")).toBeNull();
    // A rejecting reader alone cannot distinguish "never called" from
    // "called and swallowed by the S6 catch" — the count can.
    expect(calls).toBe(0);
    handle.close();
  });
});

// ── The eight-class fixture partition (derived FROM the J matrix,
// carried verbatim from the packet; every body R3-valid per P2's
// canonical shape table and staged via the real sink) ────────────────
const J_BASE = ["kind", "source", "at", "ordinal"];
const J_CLASSES: ReadonlyArray<{
  label: string;
  body: DiagnosticEventBody;
  keys: readonly string[];
  values: Readonly<Record<string, unknown>>;
}> = [
  {
    label: "1: kernel duplicate (digested)",
    body: {
      source: "kernel",
      kind: "duplicate",
      instanceId: "inst-1",
      opId: "j1",
      actorId: "codex",
      type: "PASS",
      payloadDigest: "dg-1",
    },
    keys: [...J_BASE, "payloadDigest"],
    values: { kind: "duplicate", source: "kernel", payloadDigest: "dg-1" },
  },
  {
    label: "2: kernel cas_restart (same keyset class as 1 — driven anyway)",
    body: {
      source: "kernel",
      kind: "cas_restart",
      instanceId: "inst-1",
      opId: "j2",
      actorId: "codex",
      type: "PASS",
      payloadDigest: "dg-2",
    },
    keys: [...J_BASE, "payloadDigest"],
    values: { kind: "cas_restart", source: "kernel", payloadDigest: "dg-2" },
  },
  {
    label: "3: kernel stale — versions EXCLUDED from the projection (J9)",
    body: {
      source: "kernel",
      kind: "stale",
      instanceId: "inst-1",
      opId: "j3",
      actorId: "codex",
      type: "PASS",
      payloadDigest: "dg-3",
      expectedVersion: 1,
      currentVersion: 4,
    },
    keys: [...J_BASE, "payloadDigest"],
    values: { kind: "stale", source: "kernel", payloadDigest: "dg-3" },
  },
  {
    label: "4: kernel rejected unknown_instance — reason present, payloadDigest ABSENT",
    body: {
      source: "kernel",
      kind: "rejected",
      reason: "unknown_instance",
      instanceId: "inst-1",
      opId: "j4",
      actorId: "codex",
      type: "PASS",
    },
    keys: [...J_BASE, "reason"],
    values: { kind: "rejected", source: "kernel", reason: "unknown_instance" },
  },
  {
    label: "5: kernel rejected no_transition — reason + payloadDigest both present",
    body: {
      source: "kernel",
      kind: "rejected",
      reason: "no_transition",
      instanceId: "inst-1",
      opId: "j5",
      actorId: "codex",
      type: "PASS",
      payloadDigest: "dg-5",
    },
    keys: [...J_BASE, "reason", "payloadDigest"],
    values: { kind: "rejected", source: "kernel", reason: "no_transition", payloadDigest: "dg-5" },
  },
  {
    label: "6: kernel internal_failure (digested handle-lane) — errorName + payloadDigest CO-OCCUR, message excluded",
    body: {
      source: "kernel",
      kind: "internal_failure",
      instanceId: "inst-1",
      opId: "j6",
      actorId: "codex",
      type: "PASS",
      error: { name: "KernelSplode", message: "boom at /private/path" },
      payloadDigest: "dg-6",
    },
    keys: [...J_BASE, "errorName", "payloadDigest"],
    values: {
      kind: "internal_failure",
      source: "kernel",
      errorName: "KernelSplode",
      payloadDigest: "dg-6",
    },
  },
  {
    label: "7: kernel internal_failure (start-side) — errorName only, minimal keyset",
    body: {
      source: "kernel",
      kind: "internal_failure",
      instanceId: "inst-1",
      error: { name: "StartSplode", message: "birth failed" },
    },
    keys: [...J_BASE, "errorName"],
    values: { kind: "internal_failure", source: "kernel", errorName: "StartSplode" },
  },
  {
    label: "8: attributed ingress rejected — detail + reason present, no digest",
    body: {
      source: "ingress",
      kind: "rejected",
      reason: "invalid_shape",
      detail: "unknown_key",
      instanceId: "inst-1",
      opId: "j8",
      actorId: "someone",
      type: "T",
    },
    keys: [...J_BASE, "reason", "detail"],
    values: { kind: "rejected", source: "ingress", reason: "invalid_shape", detail: "unknown_key" },
  },
];

// J9's closed exclusion list, asserted key-by-key on every row.
const J9_EXCLUDED = [
  "error",
  "instanceId",
  "opId",
  "actorId",
  "type",
  "expectedVersion",
  "currentVersion",
];

describe("bundle diag-row projection (J matrix) — the eight-class fixture partition (dimension 8)", () => {
  it.each(J_CLASSES)("class $label", async ({ body, keys, values }) => {
    const { store, close } = await seeded();
    const diag = openDiagStore(":memory:", createControlledClock(0));
    diag.sink.emit(body);
    // The fixture self-check culture: the staged body really landed.
    expect(await diag.reader.getDiagnostics("inst-1", 0)).toHaveLength(1);

    const rows = rowsOf(await exportWith(store, diag.reader));
    expect(rows).toHaveLength(1);
    const row = rows[0];
    if (row === undefined) throw new Error("unreachable");
    expect(Object.keys(row).sort()).toEqual([...keys].sort());
    expect(row).toMatchObject(values);
    expect(row.at).toBe(0);
    expect(row.ordinal).toBe(1);
    for (const excluded of J9_EXCLUDED) {
      expect(excluded in row).toBe(false);
    }
    diag.close();
    close();
  });
});

describe("K matrix — the schema walk under BOTH policies (dims 8+10)", () => {
  it("present variant: closed schema at every level; the diag-row projection is IDENTICAL under both policies", async () => {
    const { store, close } = await seeded();
    const diag = openDiagStore(":memory:", createControlledClock(0));
    for (const cls of J_CLASSES) {
      diag.sink.emit(cls.body);
    }

    const redacted = await exportWith(store, diag.reader);
    const passthrough = await exportWith(store, diag.reader, devPassthroughRedactionPolicy);
    for (const bundle of [redacted, passthrough]) {
      expect(bundle).not.toBeNull();
      if (bundle !== null) {
        assertBundleSchema(bundle);
        const rows = rowsOf(bundle);
        expect(rows).toHaveLength(J_CLASSES.length);
        rows.forEach((row, index) => {
          const expected = J_CLASSES[index];
          if (expected === undefined) throw new Error("unreachable");
          expect(Object.keys(row).sort()).toEqual([...expected.keys].sort());
        });
      }
    }
    // Dimension 10: RedactionPolicy governs transcript payload admission
    // ONLY — the diag-row projection cannot vary under it.
    expect(JSON.stringify(redacted?.rejectedInputs)).toBe(
      JSON.stringify(passthrough?.rejectedInputs),
    );
    diag.close();
    close();
  });

  it("unavailable variant: closed schema, enumerated token, identical under both policies", async () => {
    const { store, close } = await seeded();
    const path = join(tempDir(), "diag.sqlite");
    writeFileSync(path, "garbage — born unavailable");
    const diag = openDiagStore(path, createControlledClock(0));

    const redacted = await exportWith(store, diag.reader);
    const passthrough = await exportWith(store, diag.reader, devPassthroughRedactionPolicy);
    for (const bundle of [redacted, passthrough]) {
      expect(bundle).not.toBeNull();
      if (bundle !== null) {
        assertBundleSchema(bundle);
      }
    }
    expect(JSON.stringify(redacted?.rejectedInputs)).toBe(
      JSON.stringify(passthrough?.rejectedInputs),
    );
    diag.close();
    close();
  });
});

describe("dimension 9 — the free-text marker scan (the wide-claim negative)", () => {
  it("(b) a HOSTILE internal_failure error.message through the REAL sink never reaches the serialization; errorName rides", async () => {
    const { store, close } = await seeded();
    const diag = openDiagStore(":memory:", createControlledClock(0));
    diag.sink.emit({
      source: "kernel",
      kind: "internal_failure",
      instanceId: "inst-1",
      error: { name: "QuietName", message: `stack fragment ${MARKER_MSG} /etc/secret` },
    });
    // Fixture self-check: the marker IS in the stored event's message.
    const stored = await diag.reader.getDiagnostics("inst-1", 0);
    expect(stored[0]?.error?.message).toContain(MARKER_MSG);

    const bundle = await exportWith(store, diag.reader);
    const text = JSON.stringify(bundle);
    expect(text).not.toContain(MARKER_MSG);
    expect(rowsOf(bundle)[0]?.errorName).toBe("QuietName");
    diag.close();
    close();
  });

  it("(c) the unavailable lane's underlying message — a SYNTHETIC name-matched carrier with a VALID token and a hostile message: token serialized, message never", async () => {
    const { store, close } = await seeded();
    const carrier = new Error(`driver path text ${MARKER_CARRIER}`);
    carrier.name = "DiagUnavailableError";
    (carrier as unknown as { reason: string }).reason = "open_failed";
    // The LOUD fixture self-check (the P2 flag-5 culture): the marker IS
    // present in the carrier before its absence downstream means a thing.
    expect(carrier.message).toContain(MARKER_CARRIER);

    const reader: DiagnosticsReader = {
      getDiagnostics: () => Promise.reject(carrier),
      getGlobalDiagnostics: () => Promise.reject(new Error("unused")),
    };
    const bundle = await exportWith(store, reader);
    expect(sectionOf(bundle)).toEqual({ status: "unavailable", reason: "open_failed" });
    expect(JSON.stringify(bundle)).not.toContain(MARKER_CARRIER);
    close();
  });

  it("(d) a HOSTILE error.name appears ONLY at errorName positions and NOWHERE else in the full serialization", async () => {
    const { store, close } = await seeded();
    const diag = openDiagStore(":memory:", createControlledClock(0));
    diag.sink.emit({
      source: "kernel",
      kind: "internal_failure",
      instanceId: "inst-1",
      error: { name: MARKER_NAME, message: "benign" },
    });

    const bundle = await exportWith(store, diag.reader);
    const full = JSON.stringify(bundle);
    // The carve-out's boundary, driven precisely: the marker IS in the
    // serialization (the one stated exception carries it)…
    expect(full).toContain(MARKER_NAME);
    // …and stripping exactly the errorName field positions removes every
    // occurrence — no other position carries it.
    const parsed = JSON.parse(full) as {
      rejectedInputs: { status: string; rows?: Record<string, unknown>[] };
    };
    for (const row of parsed.rejectedInputs.rows ?? []) {
      delete row["errorName"];
    }
    expect(JSON.stringify(parsed)).not.toContain(MARKER_NAME);
    diag.close();
    close();
  });

  it("(d) the J10 cap: a 65+-character name projects as exactly its first 64 UTF-16 code units; a conforming short name is untouched", async () => {
    const { store, close } = await seeded();
    const diag = openDiagStore(":memory:", createControlledClock(0));
    const longName = "L".repeat(100);
    diag.sink.emit({
      source: "kernel",
      kind: "internal_failure",
      instanceId: "inst-1",
      error: { name: longName, message: "x" },
    });
    diag.sink.emit({
      source: "kernel",
      kind: "internal_failure",
      instanceId: "inst-1",
      error: { name: "ShortConformingName", message: "x" },
    });

    const rows = rowsOf(await exportWith(store, diag.reader));
    expect(rows[0]?.errorName).toBe(longName.slice(0, 64));
    expect(rows[0]?.errorName).toHaveLength(64);
    expect(rows[1]?.errorName).toBe("ShortConformingName");
    diag.close();
    close();
  });

  it("dimension 12 — two exports under the SAME unavailable reason are string-identical", async () => {
    const { store, close } = await seeded();
    const path = join(tempDir(), "diag.sqlite");
    writeFileSync(path, "garbage — born unavailable");
    const diag = openDiagStore(path, createControlledClock(0));
    const exporter = createDebugBundleExporter(store, redactPayloadsPolicy, diag.reader);
    const first = await exporter.exportDebugBundle("inst-1");
    const second = await exporter.exportDebugBundle("inst-1");
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    diag.close();
    close();
  });
});

// ── arm gate 2 aftermath (ch11-P1): the bundle is a hand-projection
// surface — expectedRole must survive the export explicitly, and the
// declared envelope keyset grows by exactly that member. ──

describe("bundle envelope meta — expectedRole fidelity (ch11-P1)", () => {
  it("a committed envelope's expectedRole survives into the exported bundle row", async () => {
    const { store, close } = await seeded();
    const diag = emptyDiag();
    const bundle = await exportWith(store, diag.reader);
    const row = bundleTx(bundle).find((r) => r.envelope.opId === "b2");
    expect(row?.envelope.expectedRole).toBe("reviewer");
    const first = bundleTx(bundle).find((r) => r.envelope.opId === "a1");
    expect(first?.envelope.expectedRole).toBe("implementer");
    diag.close();
    close();
  });
});

// ── FOLD 5 (arm gate 2 aftermath): the bundle transcript is a
// pass-through of the committed detail's rows — a MIXED transcript (fact
// rows + transition rows) must round-trip with FULL fidelity: every fact
// row as an exact {seq, entryKind, opId, committedAt} object, every
// transition row in its built shape, and the row COUNT equal to the
// detail's. `seeded()` builds transitions only, so the mix is staged on a
// hand-built detail returned by a fake store (the S9 fake-store culture). ──

/** A StorePort whose only live member is `getInstanceDetail`, returning
 * the supplied detail — every other member is unused here. */
function detailStore(detail: InstanceDetail | null): StorePort {
  const unused = (): never => {
    throw new Error("unused");
  };
  return {
    loadInstance: unused,
    findOp: unused,
    createInstance: unused,
    commitTransition: unused,
    commitLifecycle: unused,
    commitOperatorEntry: unused,
    listInstances: unused,
    getInstanceDetail: () => Promise.resolve(detail),
    getTimeline: unused,
  };
}

describe("bundle transcript pass-through fidelity — mixed fact + transition rows (packet ch12-p1b F4)", () => {
  it("a mixed detail exports with FULL fidelity: fact rows exact, transition rows built, row count preserved", async () => {
    const mixedDetail: InstanceDetail = {
      instance,
      transcript: [
        { entryKind: "STARTED", seq: 1, opId: "op-start", committedAt: 100 },
        {
          entryKind: "transition",
          seq: 2,
          envelope: {
            instanceId: "inst-1",
            opId: "t2",
            type: "PASS",
            actorId: "codex",
            expectedVersion: 2,
            expectedRole: "implementer",
            payload: { ref: MARKER_A },
          },
          payloadDigest: "dg-2",
          gateDecisions: [],
          issuedAgentConfig: {},
          committedAt: 200,
        },
        { entryKind: "TASK_SUPPLIED", seq: 3, opId: "op-kick", committedAt: 300 },
        {
          entryKind: "transition",
          seq: 4,
          envelope: {
            instanceId: "inst-1",
            opId: "t4",
            type: "CONVERGED",
            actorId: "claude",
            expectedVersion: 3,
            expectedRole: "reviewer",
          },
          payloadDigest: "dg-4",
          gateDecisions: [],
          issuedAgentConfig: {},
          committedAt: 400,
        },
        { entryKind: "CANCELLED", seq: 5, opId: "op-cancel", committedAt: 500 },
      ],
    };
    const reader: DiagnosticsReader = {
      getDiagnostics: () => Promise.resolve([]),
      getGlobalDiagnostics: () => Promise.reject(new Error("unused")),
    };
    const exporter = createDebugBundleExporter(detailStore(mixedDetail), redactPayloadsPolicy, reader);
    const bundle = await exporter.exportDebugBundle("inst-1");

    // FULL-content equality on the transcript array — fact rows as exact
    // {seq, entryKind, opId, committedAt} objects (transition-only fields
    // absent by class), transition rows in their built shape (the payload
    // redacted, hasPayload the surviving fingerprint).
    expect(bundle?.transcript).toEqual([
      { entryKind: "STARTED", seq: 1, opId: "op-start", committedAt: 100 },
      {
        seq: 2,
        committedAt: 200,
        payloadDigest: "dg-2",
        envelope: {
          instanceId: "inst-1",
          opId: "t2",
          type: "PASS",
          actorId: "codex",
          expectedVersion: 2,
          expectedRole: "implementer",
          hasPayload: true,
        },
      },
      { entryKind: "TASK_SUPPLIED", seq: 3, opId: "op-kick", committedAt: 300 },
      {
        seq: 4,
        committedAt: 400,
        payloadDigest: "dg-4",
        envelope: {
          instanceId: "inst-1",
          opId: "t4",
          type: "CONVERGED",
          actorId: "claude",
          expectedVersion: 3,
          expectedRole: "reviewer",
          hasPayload: false,
        },
      },
      { entryKind: "CANCELLED", seq: 5, opId: "op-cancel", committedAt: 500 },
    ]);
    // Pass-through fidelity: the bundle's row count equals the detail's.
    expect(bundle?.transcript).toHaveLength(mixedDetail.transcript.length);
  });
});

describe("the DECISION_REQUEST row class (packet ch14-p2a, K16)", () => {
  const parkedStore = async (
    request: Record<string, unknown>,
  ): Promise<{ store: StorePort; close: () => void }> => {
    const handle = openStore(":memory:", createControlledClock(0));
    await handle.store.createInstance(instance);
    await handle.store.commitTransition({
      instanceId: "inst-1",
      expectedVersion: 1,
      envelope: env("a1", "PASS", 1),
      payloadDigest: "sha256:d",
      gateDecisions: [],
      arrival: {
        newCurrentStep: "review",
        newRound: 1,
        newKernelStatus: "WAITING",
        newTerminalDisposition: null,
        newWait: {
          kind: "human_decision",
          requestedBy: "review",
          resumeEvents: ["approve"],
          requestRef: "req-1",
        },
        issuedAgentConfig: {},
        decisionRequest: request,
      } as never,
    });
    return { store: handle.store, close: () => handle.close() };
  };

  const BASE_REQUEST = {
    requestRef: "req-1",
    recipient: "operator",
    decisions: ["approve", "reject"],
    recommendation: "approve",
    recommendationSource: { fromStep: "implement", eventType: "PASS" },
  };

  it("projects the sanitized fields and CONFINES the context surface to a presence bit", async () => {
    const seed = await parkedStore({ ...BASE_REQUEST, contextRef: { secret: MARKER_A } });
    const diag = emptyDiag();
    const bundle = await exportWith(seed.store, diag.reader);
    const row = bundle?.transcript.find((r) => "entryKind" in r && r.entryKind === "DECISION_REQUEST");

    // THE TWO-DIRECTION PROOF the confinement claim rests on, over the
    // surfaces this packet OWNS — never a policy pair: PRESENT in the
    // stored row, ABSENT from the bundle.
    const detail = await seed.store.getInstanceDetail("inst-1");
    const stored = detail?.transcript[1];
    expect(stored?.entryKind === "DECISION_REQUEST" ? stored.contextRef : undefined).toEqual({
      secret: MARKER_A,
    });
    expect(JSON.stringify(bundle)).not.toContain(MARKER_A);
    expect(row).toStrictEqual({
      seq: 2,
      entryKind: "DECISION_REQUEST",
      requestRef: "req-1",
      recipient: "operator",
      decisions: ["approve", "reject"],
      recommendation: "approve",
      recommendationSource: { fromStep: "implement", eventType: "PASS" },
      hadContext: true,
      committedAt: 0,
    });
    seed.close();
    diag.close();
  });

  it("the presence bit tells 'omitted' from 'never had one'", async () => {
    const seed = await parkedStore(BASE_REQUEST);
    const diag = emptyDiag();
    const bundle = await exportWith(seed.store, diag.reader);
    expect(bundle?.transcript.find((r) => "entryKind" in r && r.entryKind === "DECISION_REQUEST")).toMatchObject({
      hadContext: false,
    });
    seed.close();
    diag.close();
  });

  it("the omission is UNIFORM under the pass-through policy too — fail-closed, structurally", async () => {
    const seed = await parkedStore({ ...BASE_REQUEST, contextRef: { secret: MARKER_A } });
    const diag = emptyDiag();
    // The redaction seam's only member takes an ENVELOPE, which an
    // envelope-less row cannot supply — so no policy can be consulted
    // about this field without widening the port. Widening it is a
    // NAMED DEFERRAL, routed to the chapter that next touches the
    // bundle; until then the value is omitted for everyone.
    const bundle = await exportWith(seed.store, diag.reader, devPassthroughRedactionPolicy);
    expect(JSON.stringify(bundle)).not.toContain(MARKER_A);
    seed.close();
    diag.close();
  });
});

// ─────────────────────────────────────────────────────────────────────
// FAMILY 13 — the CONFINEMENT, in its TWO OWNED DIRECTIONS
// (packet ch14-p2b, Q16/Q10; →[confinement-set], →[payload-presence-bit])
// ─────────────────────────────────────────────────────────────────────

describe("family 13 — the decision payload's store/bundle ASYMMETRY, under BOTH shipped policies", () => {
  /** A store carrying one DECISION_MADE row (with a payload) and one
   * WAIT_RESUMED row, seeded through the real write member. */
  async function seededOperatorRows(): Promise<{
    readonly store: StorePort;
    readonly close: () => void;
  }> {
    const handle = openStore(":memory:", createControlledClock(1_000));
    await handle.store.createInstance({
      instanceId: "inst-1",
      templateRef: { id: "local-pair-v0", version: 1 },
      task: "t",
      binding: { implementer: "codex", reviewer: "claude" },
      currentStep: "gate",
      round: 1,
      kernelStatus: "WAITING",
      terminalDisposition: null,
      activationMode: "immediate",
      wait: {
        kind: "human_decision",
        requestedBy: "gate",
        resumeEvents: ["approve"],
        requestRef: "R-1",
      },
      runtimeContext: { state: "ready", ref: null },
      failureReason: null,
      runOverrides: {},
      version: 1,
    });
    const toWait = {
      newCurrentStep: "commit_wait",
      newRound: 1,
      newKernelStatus: "WAITING" as const,
      newTerminalDisposition: null,
      newWait: {
        kind: "commit_pending",
        requestedBy: "commit_wait",
        resumeEvents: ["COMMIT"],
      },
      issuedAgentConfig: {},
    } as unknown as Parameters<StorePort["commitOperatorEntry"]>[0]["arrival"];
    await handle.store.commitOperatorEntry({
      instanceId: "inst-1",
      expectedVersion: 1,
      entry: {
        kind: "DECISION_MADE",
        opId: "d1",
        body: {
          decision: "request_rework",
          payload: { instruction: "operator free text" },
          by: "human-1",
          requestRef: "R-1",
          override: true,
        },
      },
      arrival: toWait,
    });
    await handle.store.commitOperatorEntry({
      instanceId: "inst-1",
      expectedVersion: 2,
      entry: {
        kind: "WAIT_RESUMED",
        opId: "r1",
        body: { kind: "commit_pending", event: "COMMIT" },
      },
      arrival: toWait,
    });
    return { store: handle.store, close: () => handle.close() };
  }

  it("the payload is PRESENT on the STORE row and ABSENT from the BUNDLE row, under BOTH policies", async () => {
    const { store, close } = await seededOperatorRows();
    const diag = openDiagStore(":memory:", createControlledClock(0));

    // The STORE side carries the untrusted operator text verbatim.
    const detail = await store.getInstanceDetail("inst-1");
    const stored = detail?.transcript.find((e) => e.entryKind === "DECISION_MADE");
    expect(stored).toMatchObject({ payload: { instruction: "operator free text" } });

    // THE BUNDLE SIDE OMITS IT — UNIFORMLY, under both shipped policies.
    // The omission follows K16 exactly because the seam has not moved:
    // the redaction seam's only DECIDING member takes an ENVELOPE, which
    // an envelope-less row cannot supply, so no policy can be consulted.
    for (const policy of [redactPayloadsPolicy, devPassthroughRedactionPolicy]) {
      const bundle = await exportWith(store, diag.reader, policy);
      const row = bundle?.transcript.find((r) => "entryKind" in r && r.entryKind === "DECISION_MADE");
      expect(row).toBeDefined();
      expect("payload" in (row as object)).toBe(false);
      // `hasPayload` asserted BESIDE it — a silent omission and a
      // declared one are the two things the bit exists to keep apart.
      expect(row).toMatchObject({ hasPayload: true });
      // `by` and `decision` ARE carried: an audit surface that hides WHO
      // decided answers the wrong question.
      expect(row).toMatchObject({
        entryKind: "DECISION_MADE",
        opId: "d1",
        decision: "request_rework",
        by: "human-1",
        requestRef: "R-1",
        override: true,
      });
    }
    diag.close();
    close();
  });

  it("`hasPayload` is asserted in BOTH states — a payload-LESS decision reports false", async () => {
    const handle = openStore(":memory:", createControlledClock(1_000));
    await handle.store.createInstance({
      instanceId: "inst-1",
      templateRef: { id: "local-pair-v0", version: 1 },
      task: "t",
      binding: { implementer: "codex", reviewer: "claude" },
      currentStep: "gate",
      round: 1,
      kernelStatus: "WAITING",
      terminalDisposition: null,
      activationMode: "immediate",
      wait: {
        kind: "human_decision",
        requestedBy: "gate",
        resumeEvents: ["approve"],
        requestRef: "R-1",
      },
      runtimeContext: { state: "ready", ref: null },
      failureReason: null,
      runOverrides: {},
      version: 1,
    });
    await handle.store.commitOperatorEntry({
      instanceId: "inst-1",
      expectedVersion: 1,
      entry: {
        kind: "DECISION_MADE",
        opId: "d1",
        body: { decision: "approve", by: "human-1", requestRef: "R-1" },
      },
      arrival: {
        newCurrentStep: "commit_wait",
        newRound: 1,
        newKernelStatus: "WAITING",
        newTerminalDisposition: null,
        newWait: {
          kind: "commit_pending",
          requestedBy: "commit_wait",
          resumeEvents: ["COMMIT"],
        },
        issuedAgentConfig: {},
      } as unknown as Parameters<StorePort["commitOperatorEntry"]>[0]["arrival"],
    });
    const diag = openDiagStore(":memory:", createControlledClock(0));
    const bundle = await exportWith(handle.store, diag.reader);
    const row = bundle?.transcript.find((r) => "entryKind" in r && r.entryKind === "DECISION_MADE");
    // NEVER CARRIED ONE — distinguished from "omitted by policy" by
    // exactly this bit.
    expect(row).toMatchObject({ hasPayload: false });
    expect("override" in (row as object)).toBe(false);
    diag.close();
    handle.close();
  });

  it("WAIT_RESUMED is carried WHOLE — every field is kernel-minted or an admitted id-grammar token", async () => {
    const { store, close } = await seededOperatorRows();
    const diag = openDiagStore(":memory:", createControlledClock(0));
    const bundle = await exportWith(store, diag.reader);
    const row = bundle?.transcript.find((r) => "entryKind" in r && r.entryKind === "WAIT_RESUMED");
    expect(row).toEqual({
      seq: 2,
      entryKind: "WAIT_RESUMED",
      opId: "r1",
      kind: "commit_pending",
      event: "COMMIT",
      committedAt: 1_000,
    });
    diag.close();
    close();
  });
});
