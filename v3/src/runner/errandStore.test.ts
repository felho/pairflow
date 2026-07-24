import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createControlledClock } from "../testkit/index.js";
import { ErrandStoreError, openErrandStore } from "./errandStore.js";
import type { ErrandStore, ErrandStoreHandle } from "./errandStore.js";

// ── ES family (packet ch9-p3a): the errand ledger. Fresh-handle durability,
// fail-loud reads, mint-retry, CAS semantics, physical separation, contention.

const dirs: string[] = [];
function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "v3-errand-store-"));
  dirs.push(dir);
  return dir;
}
afterEach(() => {
  for (const dir of dirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

const KEY = "inst-1@v2";
function seedPending(store: ErrandStore, budget = 3): void {
  store.createErrand({
    instanceId: "inst-1",
    contextPacketId: KEY,
    expectedVersion: 2,
    actorId: "codex",
    budget,
  });
}

describe("errandStore ES2 — the durable row contract round-trips every field", () => {
  it("createErrand stores pending, budget, discovery=live, no claim/attempt", () => {
    const handle = openErrandStore(join(tempDir(), "errands.db"), createControlledClock(1_000));
    seedPending(handle.store);
    const row = handle.store.getErrand("inst-1", KEY);
    expect(row).toEqual({
      instanceId: "inst-1",
      contextPacketId: KEY,
      expectedVersion: 2,
      actorId: "codex",
      state: "pending",
      remainingBudget: 3,
      activeAttemptId: null,
      liveSessionName: null,
      workerId: null,
      claimedAt: null,
      recordedAdmitOutcome: null,
      discovery: "live",
      createdAt: 1_000,
      updatedAt: 1_000,
    });
    handle.close();
  });

  it("createErrand is idempotent (D3): a second insert is a no-op, first row survives", () => {
    const handle = openErrandStore(join(tempDir(), "errands.db"), createControlledClock(1_000));
    expect(handle.store.createErrand({
      instanceId: "inst-1",
      contextPacketId: KEY,
      expectedVersion: 2,
      actorId: "codex",
      budget: 3,
    }).created).toBe(true);
    handle.store.claim({ instanceId: "inst-1", contextPacketId: KEY, workerId: "w1", now: 5 });
    // A second create must NOT overwrite the claimed state.
    expect(handle.store.createErrand({
      instanceId: "inst-1",
      contextPacketId: KEY,
      expectedVersion: 2,
      actorId: "other",
      budget: 9,
    }).created).toBe(false);
    const row = handle.store.getErrand("inst-1", KEY);
    expect(row?.state).toBe("claimed");
    expect(row?.actorId).toBe("codex");
    expect(row?.remainingBudget).toBe(3);
    handle.close();
  });
});

describe("errandStore ES4 — durability across a fresh handle over the same file", () => {
  it("every committed write is visible to a restarted worker; errand state is never memory", () => {
    const path = join(tempDir(), "errands.db");
    const clock = createControlledClock(1_000);
    const a = openErrandStore(path, clock);
    seedPending(a.store);
    a.store.claim({ instanceId: "inst-1", contextPacketId: KEY, workerId: "w1", now: 1_000 });
    a.store.startBudgetedAttempt({
      instanceId: "inst-1",
      contextPacketId: KEY,
      workerId: "w1",
      now: 1_000,
      attemptIdSource: () => "att-1",
      sessionNamer: (i, at) => `sess-${i}-${at}`,
    });
    a.close();

    const b = openErrandStore(path, clock);
    const row = b.store.getErrand("inst-1", KEY);
    expect(row?.state).toBe("attempting");
    expect(row?.remainingBudget).toBe(2); // decrement-on-start survived the restart
    expect(row?.activeAttemptId).toBe("att-1");
    expect(row?.liveSessionName).toBe("sess-inst-1-att-1");
    expect(b.store.getAttempt("att-1")?.kind).toBe("budgeted");
    b.close();
  });
});

describe("errandStore ES5 — fail-LOUD authority character (never [], never silent)", () => {
  it("open refuses a non-prototype store (fail closed, typed throw)", () => {
    const path = join(tempDir(), "hostile.db");
    const raw = new DatabaseSync(path);
    raw.exec("CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL) STRICT");
    raw.prepare("INSERT INTO meta (key, value) VALUES (?, ?)").run("schema_version", "1");
    raw.prepare("INSERT INTO meta (key, value) VALUES (?, ?)").run("prototype", "false");
    raw.close();
    expect(() => openErrandStore(path, createControlledClock(1))).toThrow(ErrandStoreError);
  });

  it("a shape-invalid stored row throws on READ — never degrades to []", () => {
    const path = join(tempDir(), "errands.db");
    const handle = openErrandStore(path, createControlledClock(1));
    seedPending(handle.store);
    handle.close();
    // Corrupt the state token behind the store's back.
    const raw = new DatabaseSync(path);
    raw.exec("UPDATE errands SET state = 'bogus'");
    raw.close();
    const reopened = openErrandStore(path, createControlledClock(1));
    expect(() => reopened.store.listErrands()).toThrow(ErrandStoreError);
    expect(() => reopened.store.getErrand("inst-1", KEY)).toThrow(ErrandStoreError);
    reopened.close();
  });

  it("a recorded_admit_outcome outside the closed domain is fail-loud drift", () => {
    const path = join(tempDir(), "errands.db");
    const handle = openErrandStore(path, createControlledClock(1));
    seedPending(handle.store);
    handle.close();
    const raw = new DatabaseSync(path);
    raw.exec("UPDATE errands SET recorded_admit_outcome = 'free text nonsense'");
    raw.close();
    const reopened = openErrandStore(path, createControlledClock(1));
    expect(() => reopened.store.getErrand("inst-1", KEY)).toThrow(ErrandStoreError);
    reopened.close();
  });
});

describe("errandStore ES1 — physical separation from the kernel/diag stores", () => {
  it("a burst of errand writes leaves a sibling store file's bytes untouched", () => {
    const dir = tempDir();
    const errandPath = join(dir, "errands.db");
    const siblingPath = join(dir, "kernel.db");
    // A stand-in sibling store on disk.
    const sibling = new DatabaseSync(siblingPath);
    sibling.exec("PRAGMA journal_mode = WAL");
    sibling.exec("CREATE TABLE t (x INTEGER) STRICT");
    sibling.prepare("INSERT INTO t (x) VALUES (?)").run(1);
    sibling.close();
    const before = readFileSync(siblingPath);

    const handle = openErrandStore(errandPath, createControlledClock(1));
    for (let i = 0; i < 20; i += 1) {
      handle.store.createErrand({
        instanceId: `inst-${String(i)}`,
        contextPacketId: `inst-${String(i)}@v2`,
        expectedVersion: 2,
        actorId: "codex",
        budget: 3,
      });
    }
    handle.close();
    expect(readFileSync(siblingPath).equals(before)).toBe(true);
  });
});

describe("errandStore ES3 — attempt-id mint-retry on a UNIQUE collision", () => {
  it("a colliding id source retries to a fresh id, never reuses", () => {
    const handle = openErrandStore(join(tempDir(), "errands.db"), createControlledClock(1));
    // First errand + attempt burns id "dup".
    handle.store.createErrand({ instanceId: "a", contextPacketId: "a@v2", expectedVersion: 2, actorId: "codex", budget: 3 });
    handle.store.claim({ instanceId: "a", contextPacketId: "a@v2", workerId: "w1", now: 1 });
    handle.store.startBudgetedAttempt({
      instanceId: "a", contextPacketId: "a@v2", workerId: "w1", now: 1,
      attemptIdSource: () => "dup", sessionNamer: (i, at) => `${i}:${at}`,
    });
    // Second errand's id source first yields the taken "dup", then "fresh".
    handle.store.createErrand({ instanceId: "b", contextPacketId: "b@v2", expectedVersion: 2, actorId: "codex", budget: 3 });
    handle.store.claim({ instanceId: "b", contextPacketId: "b@v2", workerId: "w1", now: 1 });
    const ids = ["dup", "fresh"];
    let i = 0;
    const started = handle.store.startBudgetedAttempt({
      instanceId: "b", contextPacketId: "b@v2", workerId: "w1", now: 1,
      attemptIdSource: () => ids[i++] ?? "x", sessionNamer: (inst, at) => `${inst}:${at}`,
    });
    expect(started).toEqual({ kind: "started", attemptId: "fresh", sessionName: "b:fresh" });
    handle.close();
  });
});

describe("errandStore ES6 — two-handle write contention (probe P5b shape)", () => {
  it("a sibling lock surfaces the fail-loud typed throw; the next-tick retry succeeds", () => {
    const path = join(tempDir(), "errands.db");
    // busyTimeoutMs: 0 so the contended acquirer fails immediately (no 5s wait).
    const handle = openErrandStore(path, createControlledClock(1), { busyTimeoutMs: 0 });
    seedPending(handle.store);

    // A sibling raw handle HOLDS the write lock (BEGIN IMMEDIATE, uncommitted).
    const sibling = new DatabaseSync(path);
    sibling.exec("PRAGMA busy_timeout = 0");
    sibling.exec("BEGIN IMMEDIATE");
    sibling.prepare("INSERT INTO reconciled_runs (instance_id, reconciled_at) VALUES (?, ?)").run("x", 1);

    // The store's write contends at lock acquisition → fail-loud typed throw.
    expect(() =>
      handle.store.claim({ instanceId: "inst-1", contextPacketId: KEY, workerId: "w1", now: 5 }),
    ).toThrow(ErrandStoreError);

    // The sibling releases; the loop's next tick retries and succeeds.
    sibling.exec("ROLLBACK");
    sibling.close();
    expect(handle.store.claim({ instanceId: "inst-1", contextPacketId: KEY, workerId: "w1", now: 5 }).claimed).toBe(true);
    handle.close();
  });

  it("the default bounded busy wait is factory-configurable and green on an uncontended write", () => {
    const handle = openErrandStore(join(tempDir(), "errands.db"), createControlledClock(1), {
      busyTimeoutMs: 250,
    });
    seedPending(handle.store);
    expect(handle.store.claim({ instanceId: "inst-1", contextPacketId: KEY, workerId: "w1", now: 5 }).claimed).toBe(true);
    handle.close();
  });
});

describe("errandStore — the write machinery (claim CAS, decrement, precedence, reclaim, remint)", () => {
  function fresh(): ErrandStoreHandle {
    const h = openErrandStore(join(tempDir(), "errands.db"), createControlledClock(1_000));
    seedPending(h.store);
    return h;
  }

  it("claim CAS: only from pending, exactly once", () => {
    const h = fresh();
    expect(h.store.claim({ instanceId: "inst-1", contextPacketId: KEY, workerId: "w1", now: 5 }).claimed).toBe(true);
    // A second claim from `claimed` is a no-op (CAS on state=pending).
    expect(h.store.claim({ instanceId: "inst-1", contextPacketId: KEY, workerId: "w2", now: 6 }).claimed).toBe(false);
    expect(h.store.getErrand("inst-1", KEY)?.workerId).toBe("w1");
    h.close();
  });

  it("startBudgetedAttempt decrements once; a budgeted start requires budget >= 1", () => {
    const h = openErrandStore(join(tempDir(), "errands.db"), createControlledClock(1));
    h.store.createErrand({ instanceId: "inst-1", contextPacketId: KEY, expectedVersion: 2, actorId: "codex", budget: 1 });
    h.store.claim({ instanceId: "inst-1", contextPacketId: KEY, workerId: "w1", now: 1 });
    const s1 = h.store.startBudgetedAttempt({
      instanceId: "inst-1", contextPacketId: KEY, workerId: "w1", now: 1,
      attemptIdSource: () => "a1", sessionNamer: (i, a) => `${i}:${a}`,
    });
    expect(s1.kind).toBe("started");
    expect(h.store.getErrand("inst-1", KEY)?.remainingBudget).toBe(0);
    // Return to pending, then a zero-budget claimed errand is not_startable.
    h.store.concludeNegativeBudgeted({ instanceId: "inst-1", contextPacketId: KEY, attemptId: "a1" });
    h.store.claim({ instanceId: "inst-1", contextPacketId: KEY, workerId: "w1", now: 1 });
    const s2 = h.store.startBudgetedAttempt({
      instanceId: "inst-1", contextPacketId: KEY, workerId: "w1", now: 1,
      attemptIdSource: () => "a2", sessionNamer: (i, a) => `${i}:${a}`,
    });
    expect(s2.kind).toBe("not_startable");
    expect(h.store.getErrand("inst-1", KEY)?.remainingBudget).toBe(0); // never below zero
    h.close();
  });

  it("B2 CAS: a STALE attempt's negative conclusion is INERT (demotes nothing)", () => {
    const h = fresh();
    h.store.claim({ instanceId: "inst-1", contextPacketId: KEY, workerId: "w1", now: 1 });
    h.store.startBudgetedAttempt({
      instanceId: "inst-1", contextPacketId: KEY, workerId: "w1", now: 1,
      attemptIdSource: () => "active", sessionNamer: (i, a) => `${i}:${a}`,
    });
    // A conclusion for a DIFFERENT (stale) attempt id is inert.
    expect(h.store.concludeNegativeBudgeted({ instanceId: "inst-1", contextPacketId: KEY, attemptId: "stale" }).applied).toBe(false);
    expect(h.store.getErrand("inst-1", KEY)?.state).toBe("attempting");
    // The active attempt concludes.
    expect(h.store.concludeNoOutput({ instanceId: "inst-1", contextPacketId: KEY, attemptId: "active" }).applied).toBe(true);
    expect(h.store.getErrand("inst-1", KEY)?.state).toBe("unconfirmed");
    h.close();
  });

  it("concludeConfirmed is a CAS-free precedence write from EVERY non-confirmed state", () => {
    for (const setup of ["pending", "unconfirmed", "exhausted", "mooted"] as const) {
      const h = fresh();
      const path = "inst-1";
      if (setup === "unconfirmed") {
        h.store.claim({ instanceId: path, contextPacketId: KEY, workerId: "w", now: 1 });
        h.store.startBudgetedAttempt({ instanceId: path, contextPacketId: KEY, workerId: "w", now: 1, attemptIdSource: () => "a", sessionNamer: (i, a) => `${i}:${a}` });
        h.store.concludeNoOutput({ instanceId: path, contextPacketId: KEY, attemptId: "a" });
      } else if (setup === "mooted") {
        h.store.concludeMooted({ instanceId: path, contextPacketId: KEY });
      } else if (setup === "exhausted") {
        h.store.claim({ instanceId: path, contextPacketId: KEY, workerId: "w", now: 1 });
        // drive budget to 0 then exhaust-at-claim
        for (const id of ["a", "b", "c"]) {
          h.store.startBudgetedAttempt({ instanceId: path, contextPacketId: KEY, workerId: "w", now: 1, attemptIdSource: () => id, sessionNamer: (i, at) => `${i}:${at}` });
          h.store.concludeNegativeBudgeted({ instanceId: path, contextPacketId: KEY, attemptId: id });
          h.store.claim({ instanceId: path, contextPacketId: KEY, workerId: "w", now: 1 });
        }
        h.store.exhaustAtClaim({ instanceId: path, contextPacketId: KEY });
        expect(h.store.getErrand(path, KEY)?.state).toBe("exhausted");
      }
      expect(h.store.concludeConfirmed({ instanceId: path, contextPacketId: KEY }).applied).toBe(true);
      expect(h.store.getErrand(path, KEY)?.state).toBe("confirmed");
      // Idempotent: a re-run on confirmed is a no-op (never demotes).
      expect(h.store.concludeConfirmed({ instanceId: path, contextPacketId: KEY }).applied).toBe(false);
      h.close();
    }
  });

  it("concludeMooted fires from each of the four non-terminal states, never from confirmed", () => {
    // confirmed is dominant: mooting it is a no-op.
    const h = fresh();
    h.store.concludeConfirmed({ instanceId: "inst-1", contextPacketId: KEY });
    expect(h.store.concludeMooted({ instanceId: "inst-1", contextPacketId: KEY }).applied).toBe(false);
    expect(h.store.getErrand("inst-1", KEY)?.state).toBe("confirmed");
    h.close();

    for (const from of ["pending", "claimed", "attempting"] as const) {
      const g = fresh();
      if (from !== "pending") {
        g.store.claim({ instanceId: "inst-1", contextPacketId: KEY, workerId: "w", now: 1 });
      }
      if (from === "attempting") {
        g.store.startBudgetedAttempt({ instanceId: "inst-1", contextPacketId: KEY, workerId: "w", now: 1, attemptIdSource: () => "a", sessionNamer: (i, a) => `${i}:${a}` });
      }
      expect(g.store.concludeMooted({ instanceId: "inst-1", contextPacketId: KEY }).applied).toBe(true);
      expect(g.store.getErrand("inst-1", KEY)?.state).toBe("mooted");
      g.close();
    }
  });

  it("reclaim: stale-only, clears the active marker + claim atomically; post-reclaim stale CAS is inert", () => {
    const h = fresh();
    h.store.claim({ instanceId: "inst-1", contextPacketId: KEY, workerId: "w1", now: 1_000 });
    h.store.startBudgetedAttempt({
      instanceId: "inst-1", contextPacketId: KEY, workerId: "w1", now: 1_000,
      attemptIdSource: () => "att", sessionNamer: (i, a) => `${i}:${a}`,
    });
    // Not stale yet (within lease): no reclaim.
    expect(h.store.reclaim({ instanceId: "inst-1", contextPacketId: KEY, now: 1_500, leaseMs: 1_000, landing: "pending" }).reclaimed).toBe(false);
    // Past the lease: reclaim to pending, clears marker + claim, returns the cleared id.
    const r = h.store.reclaim({ instanceId: "inst-1", contextPacketId: KEY, now: 3_000, leaseMs: 1_000, landing: "pending" });
    expect(r).toEqual({ reclaimed: true, clearedAttemptId: "att" });
    const row = h.store.getErrand("inst-1", KEY);
    expect(row?.state).toBe("pending");
    expect(row?.activeAttemptId).toBeNull();
    expect(row?.workerId).toBeNull();
    expect(row?.remainingBudget).toBe(2); // the crashed attempt's decrement stands
    // The stale attempt's late CAS conclusion can never succeed now.
    expect(h.store.concludeNegativeBudgeted({ instanceId: "inst-1", contextPacketId: KEY, attemptId: "att" }).applied).toBe(false);
    h.close();
  });

  it("remint: NET-ZERO budget, fresh id + session, CAS-guarded; a stale remint is inert", () => {
    const h = fresh();
    h.store.claim({ instanceId: "inst-1", contextPacketId: KEY, workerId: "w1", now: 1 });
    h.store.startBudgetedAttempt({
      instanceId: "inst-1", contextPacketId: KEY, workerId: "w1", now: 1,
      attemptIdSource: () => "old", sessionNamer: (i, a) => `${i}:${a}`,
    });
    const budgetBefore = h.store.getErrand("inst-1", KEY)?.remainingBudget;
    const r = h.store.remint({
      instanceId: "inst-1", contextPacketId: KEY, oldAttemptId: "old", workerId: "w1", now: 2,
      attemptIdSource: () => "new", sessionNamer: (i, a) => `${i}:${a}`,
    });
    expect(r).toEqual({ kind: "reminted", attemptId: "new", sessionName: "inst-1:new" });
    const row = h.store.getErrand("inst-1", KEY);
    expect(row?.state).toBe("attempting"); // in-place: never leaves attempting
    expect(row?.activeAttemptId).toBe("new");
    expect(row?.remainingBudget).toBe(budgetBefore); // NET-ZERO
    // A remint against the now-stale old id is inert.
    expect(h.store.remint({
      instanceId: "inst-1", contextPacketId: KEY, oldAttemptId: "old", workerId: "w1", now: 3,
      attemptIdSource: () => "z", sessionNamer: (i, a) => `${i}:${a}`,
    }).kind).toBe("inert");
    h.close();
  });

  it("startRespawnAttempt: from unconfirmed only, UNBUDGETED, kind=respawn", () => {
    const h = fresh();
    h.store.claim({ instanceId: "inst-1", contextPacketId: KEY, workerId: "w", now: 1 });
    h.store.startBudgetedAttempt({ instanceId: "inst-1", contextPacketId: KEY, workerId: "w", now: 1, attemptIdSource: () => "a", sessionNamer: (i, at) => `${i}:${at}` });
    h.store.concludeNoOutput({ instanceId: "inst-1", contextPacketId: KEY, attemptId: "a" });
    const budget = h.store.getErrand("inst-1", KEY)?.remainingBudget;
    const s = h.store.startRespawnAttempt({
      instanceId: "inst-1", contextPacketId: KEY, workerId: "w", now: 2,
      attemptIdSource: () => "r", sessionNamer: (i, at) => `${i}:${at}`,
    });
    expect(s.kind).toBe("started");
    expect(h.store.getAttempt("r")?.kind).toBe("respawn");
    expect(h.store.getErrand("inst-1", KEY)?.remainingBudget).toBe(budget); // frozen
    // A respawn start from a NON-unconfirmed state is not_startable.
    const g = fresh();
    expect(g.store.startRespawnAttempt({
      instanceId: "inst-1", contextPacketId: KEY, workerId: "w", now: 1,
      attemptIdSource: () => "r", sessionNamer: (i, at) => `${i}:${at}`,
    }).kind).toBe("not_startable");
    g.close();
    h.close();
  });
});

// ── Aftermath (gate-2 findings 4, 9, 6): typed open failure, real read-path
// IO failure, stale other-admit inert.
describe("errandStore ES5 — open + read IO failures are typed (never raw, never null)", () => {
  it("finding 4: opening a DIRECTORY path throws a typed ErrandStoreError (not raw ERR_SQLITE_ERROR)", () => {
    const dir = tempDir(); // a directory, not a file
    expect(() => openErrandStore(dir, createControlledClock(1))).toThrow(ErrandStoreError);
  });

  it("finding 9: a read after the underlying handle is closed is a typed throw, never a swallow-to-null", () => {
    const h = openErrandStore(join(tempDir(), "errands.db"), createControlledClock(1));
    seedPending(h.store);
    h.close(); // a real read-path IO failure: the handle is gone
    expect(() => h.store.getErrand("inst-1", KEY)).toThrow(ErrandStoreError);
    expect(() => h.store.listErrands()).toThrow(ErrandStoreError);
  });
});

describe("errandStore — a STALE other-admit conclusion is inert (finding 6, B2 CAS)", () => {
  it("a stale other-admit demotes nothing", () => {
    const h = openErrandStore(join(tempDir(), "errands.db"), createControlledClock(1));
    seedPending(h.store);
    h.store.claim({ instanceId: "inst-1", contextPacketId: KEY, workerId: "w", now: 1 });
    h.store.startBudgetedAttempt({
      instanceId: "inst-1",
      contextPacketId: KEY,
      workerId: "w",
      now: 1,
      attemptIdSource: () => "active",
      sessionNamer: () => "s",
    });
    // A conclusion for a stale (superseded) attempt id is inert under the CAS.
    expect(
      h.store.concludeOtherAdmit({
        instanceId: "inst-1",
        contextPacketId: KEY,
        attemptId: "stale",
        recordedAdmitOutcome: "stale",
      }).applied,
    ).toBe(false);
    expect(h.store.getErrand("inst-1", KEY)?.state).toBe("attempting");
    h.close();
  });
});
