import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { noopDiagnosticsSink } from "./diag/index.js";
import type { AdmittedTemplate, Outcome, WorkflowTemplate } from "./domain/index.js";
import { deriveEmitDigest } from "./emit/index.js";
import { createIngress } from "./ingress/index.js";
import { createKernel } from "./kernel/index.js";
import { openStore } from "./store/index.js";
import type { StoreHandle } from "./store/index.js";
import {
  createControlledClock,
  fixtureDefinitionStore,
  fixtureTemplate,
} from "./testkit/index.js";
import { admitTemplate } from "./definition/index.js";
import { createGateRegistry } from "./gates/index.js";

const gateCatalog = createGateRegistry();
function admit(template: WorkflowTemplate): AdmittedTemplate {
  const result = admitTemplate(template, gateCatalog);
  if (!result.ok) {
    throw new Error(`test fixture admission failed: ${JSON.stringify(result.findings)}`);
  }
  return result.template;
}

/**
 * CT-B-TWOWORKER (IC-B; packet ch5-P5) — the op-level interleave form
 * (plan §5.5): two kernels over two real store handles on ONE
 * file-backed WAL database. Correctness is winner- and
 * schedule-independent because authority is the SHARED store —
 * uniqueness + CAS — never worker-local state (REV-B). Under this
 * chapter's topology (one process, one event loop, synchronous
 * node:sqlite) no two BEGIN IMMEDIATE transactions are ever in flight
 * at once, so SQLITE_BUSY does not arise HERE — process-level
 * contention is the explicit ch-9 contract (real-runner re-run).
 */
const dirs: string[] = [];

function tempDbPath(): string {
  const dir = mkdtempSync(join(tmpdir(), "v3-two-worker-"));
  dirs.push(dir);
  return join(dir, "store.db");
}

afterEach(() => {
  for (const dir of dirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

interface Worker {
  readonly handle: StoreHandle;
  readonly submit: (raw: unknown) => Promise<Outcome>;
  readonly start: () => Promise<unknown>;
}

function wireWorker(path: string): Worker {
  const handle = openStore(path, createControlledClock(1_000));
  const kernel = createKernel({
    store: handle.store,
    definitions: fixtureDefinitionStore(admit(fixtureTemplate())),
    time: createControlledClock(1_000),
    digest: deriveEmitDigest,
    gates: gateCatalog,
    diag: noopDiagnosticsSink,
  });
  const ingress = createIngress({ kernel, diag: noopDiagnosticsSink });
  return {
    handle,
    submit: (raw) => ingress.submit(raw),
    start: () =>
      kernel.startInstance({
        instanceId: "inst-1",
        templateRef: { id: "local-pair-v0", version: 1 },
        task: "two workers, one truth",
      }),
  };
}

function raw(
  opId: string,
  type: string,
  actorId: string,
  expectedVersion: number,
  expectedRole: string,
) {
  return {
    instanceId: "inst-1",
    opId,
    type,
    actorId,
    expectedVersion,
    expectedRole,
    payload: { note: `${actorId}:${opId}` },
  };
}

// The four-op run to DONE (the l0b shape, minus the stale probe).
const OPS = [
  raw("a1", "PASS", "codex", 1, "implementer"),
  raw("b2", "PASS", "claude", 2, "reviewer"),
  raw("c4", "PASS", "codex", 3, "implementer"),
  raw("d5", "CONVERGED", "claude", 4, "reviewer"),
];

describe("CT-B-TWOWORKER — two workers, one instance stream, winner-independent (IC-B)", () => {
  it("racing deliveries of the SAME op across the two handles: exactly one commit, one Duplicate, one row", async () => {
    const path = tempDbPath();
    const w1 = wireWorker(path);
    const w2 = wireWorker(path);
    await w1.start();

    const outcomes = await Promise.all([w1.submit(OPS[0]), w2.submit(OPS[0])]);
    expect(outcomes.map((o) => o.kind).sort()).toEqual(["committed", "duplicate"]);

    // BOTH handles read the same truth back.
    const d1 = await w1.handle.store.getInstanceDetail("inst-1");
    const d2 = await w2.handle.store.getInstanceDetail("inst-1");
    expect(d1?.transcript).toHaveLength(1);
    expect(d2?.transcript).toHaveLength(1);
    expect(d1?.instance.version).toBe(2);
    expect(d2?.instance.version).toBe(2);
    w1.handle.close();
    w2.handle.close();
  });

  it("every worker-assignment schedule (2^4) commits the same run: identical final state and transcript", async () => {
    for (let mask = 0; mask < 16; mask += 1) {
      const path = tempDbPath();
      const workers = [wireWorker(path), wireWorker(path)] as const;
      await workers[0].start();

      for (const [index, op] of OPS.entries()) {
        const worker = (mask >> index) & 1 ? workers[1] : workers[0];
        expect((await worker.submit(op)).kind, `mask ${String(mask)} op ${op.opId}`).toBe(
          "committed",
        );
      }

      const detail = await workers[1].handle.store.getInstanceDetail("inst-1");
      expect(detail?.transcript.map((entry) => [entry.seq, entry.envelope.opId])).toEqual([
        [1, "a1"],
        [2, "b2"],
        [3, "c4"],
        [4, "d5"],
      ]);
      expect(detail?.instance).toMatchObject({
        currentStep: "done",
        status: "DONE",
        version: 5,
        round: 2,
      });
      workers[0].handle.close();
      workers[1].handle.close();
    }
  });

  it("cross-handle staleness and idempotency: the store is the only authority (REV-B)", async () => {
    const path = tempDbPath();
    const w1 = wireWorker(path);
    const w2 = wireWorker(path);
    await w1.start();

    expect((await w1.submit(OPS[0])).kind).toBe("committed");

    // w2 never saw w1's commit locally — its kernel reads the shared
    // store: the stale intent is visible, the committed op is a
    // duplicate, both THROUGH the other handle.
    expect(await w2.submit(raw("x9", "PASS", "codex", 1, "implementer"))).toEqual({
      kind: "stale",
      currentVersion: 2,
    });
    expect((await w2.submit(OPS[0])).kind).toBe("duplicate");

    w1.handle.close();
    w2.handle.close();
  });
});
