import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";

import type { ProcessGateEvidence, ProcessGateRunner, ProcessResult } from "../ports/index.js";

/**
 * The fail-closed process-gate composition slot (packet ch11-P3b, W2; the C26
 * anchored requirements). The shipped CLI roots wire a runner that NEVER spawns
 * and NEVER allows: on its normal path every `run()` durably persists a
 * COMPLETE C26 evidence record BEFORE resolving, returns
 * `{ kind: "runner_error", logRef, durationMs: 0 }`, and classification then
 * blocks (`gate_blocked(sys:runner_error)`).
 *
 * Durability grain (entailed for THIS slot): its refs must survive the emitting
 * CLI invocation — records resolve across a re-open of the same path — so the
 * substrate is durable BEYOND the process (a sibling SQLite DB beside the store
 * DB; the `deriveDiagDbPath` textual-derivation precedent). PERSISTENCE-FAILURE
 * lane: when the record CANNOT be durably persisted, `run()` THROWS instead of
 * returning — a returned-but-unresolvable `logRef` would violate C26's resolve
 * guarantee, so the throw IS the C26-conform refusal (it propagates to the
 * kernel's internal-failure path: pre-commit, no state — still fail-closed).
 *
 * The real spawn REPLACES this slot at ch9 (the port and C26 pin what it must
 * meet). Placement: `cli/` (composition-owned — `gates/` stays evaluators +
 * registry per ADR-013, `kernel/` stays port-consuming).
 */

/** The runner's DECLARED workspace-fact sentinels (no spawn, no measurement —
 * ch9 measures real facts). */
export const FAIL_CLOSED_HEAD_SHA = "unavailable-no-runner";
export const FAIL_CLOSED_GIT_STATUS_HASH = "unavailable-no-runner";

export const FAIL_CLOSED_UNAVAILABLE_LOG =
  "process gate runner unavailable: no spawn capability is wired at this composition root (fail-closed; the real runner ships at ch9)";

/** A textual-derivation sibling beside the store DB (the C1 / `deriveDiagDbPath`
 * precedent) — no new flag, no new env var. */
export function deriveProcessEvidenceDbPath(dbPath: string): string {
  return `${dbPath}.process-evidence.sqlite`;
}

export interface FailClosedProcessGateRunner extends ProcessGateRunner {
  /** Resolve a returned `logRef` to its durably persisted evidence record. */
  resolve(logRef: string): ProcessGateEvidence | undefined;
  close(): void;
}

export function createFailClosedProcessGateRunner(path: string): FailClosedProcessGateRunner {
  const db = new DatabaseSync(path);
  db.exec(
    `CREATE TABLE IF NOT EXISTS process_evidence (
       log_ref TEXT PRIMARY KEY,
       record  TEXT NOT NULL
     ) STRICT;`,
  );

  return {
    run(): Promise<ProcessResult> {
      const logRef = randomUUID();
      const record: ProcessGateEvidence = {
        log: FAIL_CLOSED_UNAVAILABLE_LOG,
        kind: "runner_error",
        durationMs: 0,
        headSha: FAIL_CLOSED_HEAD_SHA,
        gitStatusHash: FAIL_CLOSED_GIT_STATUS_HASH,
      };
      // Persist BEFORE resolving — a returned logRef MUST resolve (C26). If the
      // write throws (a closed / unwritable substrate), the throw propagates:
      // NEVER a returned-but-unresolvable ref (W2's persistence-failure lane).
      db.prepare("INSERT INTO process_evidence (log_ref, record) VALUES (?, ?)").run(
        logRef,
        JSON.stringify(record),
      );
      return Promise.resolve({ kind: "runner_error", logRef, durationMs: 0 });
    },
    resolve(logRef: string): ProcessGateEvidence | undefined {
      const row = db
        .prepare("SELECT record FROM process_evidence WHERE log_ref = ?")
        .get(logRef) as { record: string } | undefined;
      return row === undefined ? undefined : (JSON.parse(row.record) as ProcessGateEvidence);
    },
    close(): void {
      db.close();
    },
  };
}
