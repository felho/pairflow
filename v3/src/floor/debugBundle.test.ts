import { describe, expect, it } from "vitest";

import type { EventEnvelope, WorkflowInstance } from "../domain/index.js";
import { deriveEmitDigest } from "../emit/index.js";
import { createKernel } from "../kernel/index.js";
import type { Kernel } from "../kernel/index.js";
import type { StorePort } from "../ports/store.js";
import { openStore } from "../store/index.js";
import {
  createControlledClock,
  devPassthroughRedactionPolicy,
  fixtureDefinitionStore,
  fixtureTemplate,
} from "../testkit/index.js";
import type { DebugBundle } from "./debugBundle.js";
import { createDebugBundleExporter, redactPayloadsPolicy } from "./debugBundle.js";

const definitions = fixtureDefinitionStore(fixtureTemplate());

const instance: WorkflowInstance = {
  instanceId: "inst-1",
  templateRef: { id: "local-pair-v0", version: 1 },
  task: "t",
  binding: { implementer: "codex", reviewer: "claude" },
  currentStep: "implement",
  round: 1,
  status: "RUNNING",
  version: 1,
};

// Markers planted in committed payloads — the default-policy negative
// scans the ENTIRE serialized bundle for them (build watchpoint).
const MARKER_A = "MARKER_PAYLOAD_ALPHA_9f3";
const MARKER_B = "MARKER_NESTED_BRAVO_c71";
const MARKER_C = "MARKER_SECOND_CHARLIE_e02";

function env(
  opId: string,
  type: string,
  expectedVersion?: number,
  payload?: unknown,
): EventEnvelope {
  return {
    instanceId: "inst-1",
    opId,
    type,
    actorId: "codex",
    ...(expectedVersion !== undefined ? { expectedVersion } : {}),
    ...(payload !== undefined ? { payload } : {}),
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
    store: handle.store,
    definitions,
    time: createControlledClock(0),
    digest: deriveEmitDigest,
  });
  await committed(kernel, env("a1", "PASS", 1, { ref: MARKER_A, nested: { deep: MARKER_B } }));
  await committed(kernel, { ...env("b2", "PASS", 2, { note: MARKER_C }), eventId: "evt-42" });
  await committed(kernel, env("c3", "PASS", 3));
  return { store: handle.store, close: () => handle.close() };
}

// ── The canonical bundle schema matrix (the packet's single source —
// every keyset assertion below derives from THESE constants, build
// watchpoint 2) ──────────────────────────────────────────────────────
const BUNDLE_KEYS = ["formatVersion", "policy", "instance", "transcript", "rejectedInputs"];
const INSTANCE_KEYS = [
  "instanceId",
  "templateRef",
  "task",
  "binding",
  "currentStep",
  "round",
  "status",
  "version",
];
const ROW_KEYS = ["seq", "committedAt", "payloadDigest", "envelope"];
const ENVELOPE_REQUIRED = ["instanceId", "opId", "type", "actorId", "hasPayload"];
const ENVELOPE_OPTIONAL = ["expectedVersion", "eventId", "payload"];
const REJECTED_KEYS = ["status", "reason"];

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

function assertBundleSchema(bundle: DebugBundle): void {
  assertExactKeys(bundle, BUNDLE_KEYS);
  assertExactKeys(bundle.instance, INSTANCE_KEYS);
  assertExactKeys(bundle.rejectedInputs, REJECTED_KEYS);
  for (const row of bundle.transcript) {
    assertExactKeys(row, ROW_KEYS);
    assertKeysWithin(row.envelope, ENVELOPE_REQUIRED, ENVELOPE_OPTIONAL);
  }
}

describe("debug bundle — the §6.4 export + redaction boundary (packet ch6-P3)", () => {
  it("dim 1 — default policy: NO payload material anywhere in the entire serialized bundle", async () => {
    const { store, close } = await seeded();
    const exporter = createDebugBundleExporter(store, redactPayloadsPolicy);
    const bundle = await exporter.exportDebugBundle("inst-1");

    const text = JSON.stringify(bundle);
    expect(text).not.toContain(MARKER_A);
    expect(text).not.toContain(MARKER_B);
    expect(text).not.toContain(MARKER_C);
    for (const row of bundle?.transcript ?? []) {
      expect("payload" in row.envelope).toBe(false);
    }
    expect(bundle?.policy).toBe("redact-payloads");
    close();
  });

  it("dim 2 — complete committed metadata: rows, digests, flags, eventId presence/absence", async () => {
    const { store, close } = await seeded();
    const detail = await store.getInstanceDetail("inst-1");
    const bundle = await createDebugBundleExporter(store, redactPayloadsPolicy)
      .exportDebugBundle("inst-1");

    expect(bundle?.formatVersion).toBe(1);
    expect(bundle?.instance).toEqual(detail?.instance);
    expect(bundle?.transcript.map((r) => r.seq)).toEqual([1, 2, 3]);
    expect(bundle?.transcript.map((r) => r.envelope.opId)).toEqual(["a1", "b2", "c3"]);
    expect(bundle?.transcript.map((r) => r.payloadDigest)).toEqual(
      detail?.transcript.map((e) => e.payloadDigest),
    );
    expect(bundle?.transcript.map((r) => r.committedAt)).toEqual(
      detail?.transcript.map((e) => e.committedAt),
    );
    expect(bundle?.transcript.map((r) => r.envelope.hasPayload)).toEqual([true, true, false]);
    expect(bundle?.transcript.map((r) => r.envelope.expectedVersion)).toEqual([1, 2, 3]);
    expect(bundle?.transcript.map((r) => r.envelope.eventId)).toEqual([
      undefined,
      "evt-42",
      undefined,
    ]);
    expect("eventId" in (bundle?.transcript[0]?.envelope ?? {})).toBe(false);
    close();
  });

  it("dim 3 — dev pass-through (explicit opt-in): payloads round-trip exactly, policy recorded", async () => {
    const { store, close } = await seeded();
    const detail = await store.getInstanceDetail("inst-1");
    const bundle = await createDebugBundleExporter(store, devPassthroughRedactionPolicy)
      .exportDebugBundle("inst-1");

    expect(bundle?.policy).toBe("dev-passthrough");
    expect(bundle?.transcript.map((r) => r.envelope.payload)).toEqual(
      detail?.transcript.map((e) => e.envelope.payload),
    );
    // A payload-less op stays payload-less even under pass-through.
    expect("payload" in (bundle?.transcript[2]?.envelope ?? {})).toBe(false);
    close();
  });

  it("dim 4 — unknown instance → null (the §6.2 duality)", async () => {
    const handle = openStore(":memory:", createControlledClock(0));
    const exporter = createDebugBundleExporter(handle.store, redactPayloadsPolicy);
    expect(await exporter.exportDebugBundle("ghost")).toBeNull();
    handle.close();
  });

  it("dims 5+6 — closed schema at EVERY level (matrix-driven) + the explicit rejected-inputs gap", async () => {
    const { store, close } = await seeded();
    const redacted = await createDebugBundleExporter(store, redactPayloadsPolicy)
      .exportDebugBundle("inst-1");
    const passthrough = await createDebugBundleExporter(store, devPassthroughRedactionPolicy)
      .exportDebugBundle("inst-1");

    for (const bundle of [redacted, passthrough]) {
      expect(bundle).not.toBeNull();
      if (bundle !== null) {
        assertBundleSchema(bundle);
        expect(bundle.rejectedInputs).toEqual({
          status: "absent",
          reason: "diagnostic channel lands ch 7",
        });
      }
    }
    close();
  });

  it("dim 7 — deterministic: two exports of the same store state are string-identical", async () => {
    const { store, close } = await seeded();
    const exporter = createDebugBundleExporter(store, redactPayloadsPolicy);
    const first = await exporter.exportDebugBundle("inst-1");
    const second = await exporter.exportDebugBundle("inst-1");
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    close();
  });
});
