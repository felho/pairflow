import { mkdirSync, mkdtempSync, readdirSync, rmSync, watch, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { admitTemplate } from "./definition/index.js";
import { noopDiagnosticsSink } from "./diag/index.js";
import type { AdmittedTemplate, Outcome, WorkflowTemplate } from "./domain/index.js";
import { deriveEmitDigest } from "./emit/index.js";
import { createGateRegistry } from "./gates/index.js";
import { createIngress } from "./ingress/index.js";
import { createKernel } from "./kernel/index.js";
import { createStaticProviderRegistry } from "./ports/index.js";
import { createActorAdapter, createDeliveryLoop, openErrandStore, PAIRFLOW_EMIT } from "./runner/index.js";
import type { DeliveryReadSeam } from "./runner/index.js";
import { openStore } from "./store/index.js";
import {
  createControlledClock,
  createScriptedProcessGateRunner,
  fixtureDefinitionStore,
  fixtureTemplate,
} from "./testkit/index.js";

/**
 * CB1 — CT-B-TWOWORKER re-run under the REAL runner (packet ch9-p3b; plan §9.1
 * item 4). TWO delivery-loop workers, each composed with a REAL actor adapter,
 * over ONE kernel store and ONE errand-ledger file. A barrier-staged
 * lease/reclaim interleaving forces TWO genuinely in-flight real-adapter
 * attempts of ONE dispatch; correctness rests SOLELY on the kernel's
 * content-addressed op-id collapse (one committed, one duplicate, one
 * committed transition row, the errand confirmed) — never worker-local state.
 */

const gateCatalog = createGateRegistry();
function admit(template: WorkflowTemplate): AdmittedTemplate {
  const result = admitTemplate(template, gateCatalog);
  if (!result.ok) {
    throw new Error(`fixture admission failed: ${JSON.stringify(result.findings)}`);
  }
  return result.template;
}

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});
function tempDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  dirs.push(dir);
  return dir;
}

// The deterministic stub actor with a BARRIER affordance: it writes a presence
// file (named by its OWN attempt dir — unique per attempt) into the shared
// presenceDir, blocks until the release file appears (so co-in-flight is
// PROVEN, never timing-lucked), then writes a FIXED emit and exits 0. Bound
// through the SHIPPED argv/env surface — configuration, not test machinery.
const STUB = [
  'const fs = require("node:fs");',
  'const path = require("node:path");',
  "const presenceDir = process.argv[2];",
  "const releaseFile = process.argv[3];",
  // Finding 7: reference the EXPORTED env-name constant, never a raw literal.
  `const emitPath = process.env.${PAIRFLOW_EMIT};`,
  "const presenceName = path.basename(path.dirname(emitPath));", // = enc(attemptId)
  'fs.writeFileSync(path.join(presenceDir, presenceName), "here");',
  "const sab = new Int32Array(new SharedArrayBuffer(4));",
  "while (!fs.existsSync(releaseFile)) { Atomics.wait(sab, 0, 0, 20); }",
  'fs.writeFileSync(emitPath, JSON.stringify({ type: "PASS", payload: { note: "cb" } }));',
  "process.exit(0);",
  "",
].join("\n");

/**
 * EVENT-DRIVEN presence-count barrier (finding 5): resolve as soon as the
 * directory holds `n` entries, driven by `fs.watch` (no polling sleep, no
 * aliased real timer). The initial read catches files created before the
 * watcher armed. The vitest per-test timeout is the sole backstop — this
 * promise carries no clock of its own.
 */
function waitForCount(dir: string, n: number): Promise<void> {
  return new Promise<void>((resolve) => {
    let done = false;
    const check = (): void => {
      if (done) return;
      let count = 0;
      try {
        count = readdirSync(dir).length;
      } catch {
        /* the dir may not be readable yet — treated as count 0 */
      }
      if (count >= n) {
        done = true;
        watcher.close();
        resolve();
      }
    };
    const watcher = watch(dir, check);
    check(); // files may already exist before the watcher armed
  });
}

describe("CB1 — CT-B-TWOWORKER under the real runner (op-id collapse, real processes)", () => {
  it("two barrier-staged in-flight real attempts of ONE dispatch collapse to one committed + one duplicate", async () => {
    const root = tempDir("v3-ctb-");
    const storePath = join(root, "kernel.db");
    const errandPath = join(root, "errands.db");
    const presenceDir = join(root, "presence");
    const releaseFile = join(root, "release");
    const stubPath = join(root, "stub-actor.js");
    const defaultCwd = join(root, "runs");
    mkdirSync(presenceDir, { recursive: true });
    mkdirSync(defaultCwd, { recursive: true });
    writeFileSync(stubPath, STUB);

    // ── ONE kernel store + kernel + ingress (the shared collapse authority) ──
    const kernelClock = createControlledClock(1_000);
    const store = openStore(storePath, kernelClock);
    const kernel = createKernel({
      providerRegistry: createStaticProviderRegistry({}),
      processRunner: createScriptedProcessGateRunner([]),
      store: store.store,
      definitions: fixtureDefinitionStore(admit(fixtureTemplate())),
      time: kernelClock,
      digest: deriveEmitDigest,
      gates: gateCatalog,
      diag: noopDiagnosticsSink,
    });
    const ingress = createIngress({ kernel, diag: noopDiagnosticsSink });

    // Record every submission's outcome (the two racing submissions).
    const outcomes: Outcome[] = [];
    const recordingIngress = {
      async submit(raw: unknown): Promise<Outcome> {
        const outcome = await ingress.submit(raw);
        outcomes.push(outcome);
        return outcome;
      },
    };

    // Activate the run → an ACTIVE @v2 dispatch for the implementer (codex).
    const created = await kernel.create({
      instanceId: "inst-1",
      templateRef: { id: "local-pair-v0", version: 1 },
      task: "two real workers, one truth",
    });
    if (created.kind !== "created") throw new Error(`create → ${created.kind}`);
    const activated = await kernel.start({ instanceId: "inst-1", opId: "op-start" });
    if (activated.kind !== "activated") throw new Error(`start → ${activated.kind}`);

    // ── The shared clock + two errand handles on ONE file ────────────────────
    const loopClock = createControlledClock(1_000);
    const eh1 = openErrandStore(errandPath, loopClock);
    const eh2 = openErrandStore(errandPath, loopClock);
    const readSeam = store.store as unknown as DeliveryReadSeam;
    const argvMapper = () => ({ cmd: process.execPath, args: [stubPath, presenceDir, releaseFile] });
    const adapterDeps = { ingress: recordingIngress, argvMapper, diag: noopDiagnosticsSink };
    const adapterOptions = { defaultCwd, timeoutMs: 1_800_000, graceMs: 10_000, backstopMarginMs: 5_000 };

    function makeLoop(errandStore: typeof eh1.store, workerId: string, idPrefix: string, leaseMs: number) {
      let n = 0;
      return createDeliveryLoop(
        {
          errandStore,
          readSeam,
          definitions: fixtureDefinitionStore(admit(fixtureTemplate())),
          providerRegistry: createStaticProviderRegistry({}),
          executor: createActorAdapter(adapterDeps, adapterOptions),
          time: loopClock,
          wait: () => Promise.resolve(),
          attemptIdSource: () => `${idPrefix}-${String((n += 1))}`,
          sessionNamer: (i, a) => `sess:${i}:${a}`,
          diag: noopDiagnosticsSink,
          workerId,
        },
        { leaseMs },
      );
    }
    // Worker 1 carries the CB1/F8 PAIRING lease: 2 700 000 ms — a margin ABOVE
    // the adapter's effective 1 800 000 ms delivery timeout (T2's pairing rule,
    // so a sibling never reclaims a still-live attempt on the primary path).
    // Worker 2 is the deliberately-aggressive reclaimer (a 100 ms lease) that
    // FORCES the staged interleave — the misconfigured-sibling half of the race.
    const loop1 = makeLoop(eh1.store, "worker-1", "w1", 2_700_000);
    const loop2 = makeLoop(eh2.store, "worker-2", "w2", 100);

    try {
      // Worker 1 starts attempt-1 (the stub blocks on the barrier).
      const p1 = loop1.tick();
      await waitForCount(presenceDir, 1);
      // Advance past worker-2's lease → its poll reclaims the (still-running)
      // attempt-1 errand and starts a SECOND real attempt.
      loopClock.advance(200);
      const p2 = loop2.tick();
      await waitForCount(presenceDir, 2); // BOTH attempts genuinely in-flight
      // Release the barrier → both stubs submit the SAME op through NORMAL ingress.
      writeFileSync(releaseFile, "go");
      await Promise.all([p1, p2]);

      // EXACTLY two submissions: one committed AND one duplicate (the conjunction
      // is mandatory — a claim-race single-submission run does NOT satisfy it).
      expect(outcomes.map((o) => o.kind).sort()).toEqual(["committed", "duplicate"]);

      // Exactly ONE committed transition row (the content-addressed collapse).
      const detail = await store.store.getInstanceDetail("inst-1");
      const transitions = (detail?.transcript ?? []).filter((e) => e.entryKind === "transition");
      expect(transitions).toHaveLength(1);
      expect(detail?.instance.version).toBe(3); // v2 → v3, once

      // The errand converges confirmed (under L2's precedence).
      const errand = eh1.store.getErrand("inst-1", "inst-1@v2");
      expect(errand?.state).toBe("confirmed");

      // Budget/attempt bookkeeping stays consistent (CB1): BOTH real attempts
      // were durably recorded (worker-1's "w1-1" and worker-2's reclaim "w2-1"),
      // the two budgeted starts decremented the errand's budget from 3 → 1, and
      // confirm cleared the active-attempt hold.
      expect(eh1.store.getAttempt("w1-1")).not.toBeNull();
      expect(eh1.store.getAttempt("w2-1")).not.toBeNull();
      expect(errand?.remainingBudget).toBe(1);
      expect(errand?.activeAttemptId).toBeNull();
    } finally {
      eh1.close();
      eh2.close();
      store.close();
    }
  }, 30_000);
});
