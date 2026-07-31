import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { openDiagStore } from "../diag/index.js";
import type { DiagStoreHandle } from "../diag/index.js";
import { openStore } from "../store/index.js";
import type { StoreHandle } from "../store/index.js";
import { createControlledClock, createScriptedTailWait } from "../testkit/index.js";
import type { CliSinks } from "./common.js";
import { createOutputSinks, OutputClosedError } from "./common.js";
import type { CliErrorDoc } from "./contract.js";
import { EXIT } from "./contract.js";
import { runCli } from "./main.js";
import type { CliDeps } from "./runtime.js";

/**
 * packet ch13-p0 — the IN-PROCESS SEAM lanes of the closed-pipe sink
 * contract (E1–E6, E9d, E11, E12). Families 1–4's seam members and
 * family 7's factory member live here; every member that spawns a
 * subprocess lives in `closedPipe.test.ts` (the packet's file-roles
 * paragraph). This file is deliberately NOT stryker-excluded — the new
 * branching logic in `cli/common.ts` is exactly what the mutation pilot
 * must see.
 *
 * The doubles below stand in for `process.stdout` / `process.stderr` at
 * the factory's MINIMAL structural shape (E1(i)): a `write(chunk)` that
 * returns a boolean plus an `on("error", …)` registration. The
 * asynchronous `error` REPORT is delivered by calling the registered
 * listener out of band (`emitError`) — never as a throw out of
 * `write()`; the synchronous arm is the `throwOnWrite` knob (E2's
 * SEAM-only branch).
 */

// ── the stream doubles ───────────────────────────────────────────────

type ErrorListener = (error: Error) => void;

interface RecordingStreamOptions {
  /** Sync `write()` throw on the n-th call (E2's sync arm). */
  readonly throwOnWrite?: (n: number) => unknown;
  /** `write()`'s return value on the n-th call — `false` is backpressure. */
  readonly writeResult?: (n: number) => boolean;
  /** An `error` REPORT delivered right after the n-th write returns. */
  readonly reportAfterWrite?: (n: number) => unknown;
}

class RecordingStream {
  readonly chunks: string[] = [];
  private readonly listeners: ErrorListener[] = [];
  private writes = 0;

  constructor(private readonly options: RecordingStreamOptions = {}) {}

  write(chunk: string): boolean {
    this.writes += 1;
    const thrown = this.options.throwOnWrite?.(this.writes);
    if (thrown !== undefined) {
      // Fault injection: the double must be able to throw a NON-Error
      // carrier, because E2's classifier is "by error CODE and by
      // nothing else" — a double restricted to Error instances cannot
      // falsify a classifier that also tests the carrier's shape.
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw thrown;
    }
    this.chunks.push(chunk);
    const reported = this.options.reportAfterWrite?.(this.writes);
    if (reported !== undefined) {
      this.emitError(reported);
    }
    return this.options.writeResult?.(this.writes) ?? true;
  }

  on(event: "error", listener: ErrorListener): this {
    expect(event).toBe("error");
    this.listeners.push(listener);
    return this;
  }

  /** The ASYNC delivery path: the stream reports out of band. */
  emitError(error: unknown): void {
    for (const listener of [...this.listeners]) {
      // The double models the STREAM: a report's carrier shape is the
      // stream's business, and the classifier must not depend on it.
      listener(error as Error);
    }
  }
}

function streamError(code: string): Error {
  return Object.assign(new Error(`write ${code}`), { code });
}

const epipe = (): Error => streamError("EPIPE");
const otherCode = (): Error => streamError("EACCES");

/** A stream that reports EPIPE right after its FIRST write lands. */
function closingAfterFirstWrite(): RecordingStream {
  return new RecordingStream({ reportAfterWrite: (n) => (n === 1 ? epipe() : undefined) });
}

// ── the CliDeps fixture (all TEN members — cli/runtime.ts:21-50) ──────

const dirs: string[] = [];

function tempDbPath(): string {
  const dir = mkdtempSync(join(tmpdir(), "v3-closed-pipe-"));
  dirs.push(dir);
  return join(dir, "store.db");
}

afterEach(() => {
  for (const dir of dirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

interface DepsOptions {
  readonly tailSteps?: ReadonlyArray<() => void | Promise<void>>;
  readonly openStore?: CliDeps["openStore"];
  readonly openDiagStore?: CliDeps["openDiagStore"];
}

function testDeps(options: DepsOptions = {}): CliDeps {
  let ids = 0;
  return {
    openStore: options.openStore ?? ((path, time) => openStore(path, time)),
    openDiagStore: options.openDiagStore ?? ((path, time) => openDiagStore(path, time)),
    // CHK-D-TESTCLOCK: the controlled clock, never a real timer.
    time: createControlledClock(1_000),
    instanceIdSource: () => {
      ids += 1;
      return `inst-${String(ids)}`;
    },
    nonceSource: () => `nonce-${String((ids += 1))}`,
    // The scripted tail-wait is the multi-write staging seam (and the
    // CHK-D-TESTCLOCK-legal substitute for the real poll timer).
    tailWait: () => createScriptedTailWait(options.tailSteps ?? []).wait,
    env: { PAIRFLOW_V3_TEMPLATES: join(process.cwd(), "templates") },
    attemptIdSource: () => `attempt-${String((ids += 1))}`,
    workerIdSource: () => `cli-worker-${String((ids += 1))}`,
    runInteractive: () => Promise.resolve(0),
  };
}

/** A store binding whose close() is OBSERVABLE (and optionally fallible). */
function observableStore(
  closes: string[],
  failOnClose = false,
): CliDeps["openStore"] {
  return (path, time): StoreHandle => {
    const handle = openStore(path, time);
    return {
      store: handle.store,
      close: () => {
        closes.push("store");
        handle.close();
        if (failOnClose) {
          throw new Error("store handle close failed");
        }
      },
    };
  };
}

function observableDiagStore(closes: string[]): CliDeps["openDiagStore"] {
  return (path, time): DiagStoreHandle => {
    const handle = openDiagStore(path, time);
    return {
      sink: handle.sink,
      reader: handle.reader,
      close: () => {
        closes.push("diag");
        handle.close();
      },
    };
  };
}

// ── plain (non-factory) runs — fixture staging only ──────────────────

interface PlainRun {
  code: number;
  stdout: string[];
  stderr: string[];
}

async function stage(argv: readonly string[], deps: CliDeps): Promise<PlainRun> {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const sinks: CliSinks = {
    out: (line) => stdout.push(line),
    err: (line) => stderr.push(line),
  };
  const code = await runCli(argv, deps, sinks);
  return { code, stdout, stderr };
}

/** create + start → an instance sitting at `implement`, version 2, ONE
 * committed row (STARTED, seq 1). */
async function startOne(db: string, deps: CliDeps): Promise<string> {
  const created = await stage(["create", "--db", db, "--task", "t"], deps);
  expect(created.code).toBe(EXIT.ok);
  const id = (JSON.parse(created.stdout[0] ?? "") as { instanceId: string }).instanceId;
  expect((await stage(["start", id, "--db", db], deps)).code).toBe(EXIT.ok);
  return id;
}

/** …plus one committed PASS → TWO committed rows (seq 1, seq 2). */
async function startTwoRows(db: string, deps: CliDeps): Promise<string> {
  const id = await startOne(db, deps);
  const passed = await stage(
    [
      "submit", "--db", db, "--instance", id, "--type", "PASS",
      "--expected-version", "2", "--expected-role", "implementer",
      "--payload", '{"ref":"r1"}',
    ],
    deps,
  );
  expect(passed.code).toBe(EXIT.ok);
  return id;
}

function errorDocOf(chunk: string): CliErrorDoc["error"] {
  return (JSON.parse(chunk) as CliErrorDoc).error;
}

// ── family 7 (E12): the factory member — framing and routing ─────────

describe("ch13-p0 family 7 (E12) — the factory's framing and routing", () => {
  it("emits ONE newline-terminated line per document, each on its OWN stream", () => {
    const out = new RecordingStream();
    const err = new RecordingStream();
    const sinks = createOutputSinks(out, err);

    sinks.out('{"kind":"a"}');
    expect(out.chunks).toEqual(['{"kind":"a"}\n']);
    expect(err.chunks).toEqual([]);

    sinks.err('{"error":{"class":"usage"}}');
    expect(err.chunks).toEqual(['{"error":{"class":"usage"}}\n']);
    // Routing is not swapped: the out stream saw nothing new.
    expect(out.chunks).toEqual(['{"kind":"a"}\n']);

    sinks.out('{"kind":"b"}');
    expect(out.chunks).toEqual(['{"kind":"a"}\n', '{"kind":"b"}\n']);
  });
});

// ── family 1 (E2, E6): closure classification, BOTH directions ───────

describe("ch13-p0 family 1 (E2, E6) — closure classification", () => {
  it.each(["out", "err"] as const)(
    "an ASYNC `error` report carrying EPIPE on %s marks the stream closed; the report is absorbed",
    (which) => {
      const out = new RecordingStream();
      const err = new RecordingStream();
      const sinks = createOutputSinks(out, err);
      const stream = which === "out" ? out : err;

      sinks[which]("first");
      expect(stream.chunks).toEqual(["first\n"]);

      // The establishing report is ABSORBED — delivering it throws nothing.
      expect(() => {
        stream.emitError(epipe());
      }).not.toThrow();

      // …and the stream is now marked closed: the NEXT write raises the
      // sentinel and writes no byte (E4).
      expect(() => sinks[which]("second")).toThrow(OutputClosedError);
      expect(stream.chunks).toEqual(["first\n"]);
    },
  );

  it.each(["out", "err"] as const)(
    "a SYNC `write()` throw carrying EPIPE on %s is ABSORBED — the call returns normally and marks the stream closed",
    (which) => {
      const throwing = new RecordingStream({
        throwOnWrite: (n) => (n === 1 ? epipe() : undefined),
      });
      const quiet = new RecordingStream();
      const sinks =
        which === "out" ? createOutputSinks(throwing, quiet) : createOutputSinks(quiet, throwing);

      // The ESTABLISHING failure: absorbed, so the sink call returns normally.
      expect(() => sinks[which]("first")).not.toThrow();
      expect(throwing.chunks).toEqual([]);

      expect(() => sinks[which]("second")).toThrow(OutputClosedError);
      expect(throwing.chunks).toEqual([]);
    },
  );

  it("the stderr SYNC EPIPE throw at dispatch's own document write is absorbed — the class exit code stands", async () => {
    const out = new RecordingStream();
    const err = new RecordingStream({ throwOnWrite: (n) => (n === 1 ? epipe() : undefined) });
    const code = await runCli(["frobnicate"], testDeps(), createOutputSinks(out, err));
    expect(code).toBe(EXIT.usage);
    expect(err.chunks).toEqual([]);
    expect(out.chunks).toEqual([]);
  });

  it.each(["out", "err"] as const)(
    "`write()` returning false on %s is BACKPRESSURE, not a closure (E9d)",
    (which) => {
      const backpressured = new RecordingStream({ writeResult: () => false });
      const quiet = new RecordingStream();
      const sinks =
        which === "out"
          ? createOutputSinks(backpressured, quiet)
          : createOutputSinks(quiet, backpressured);

      sinks[which]("first");
      sinks[which]("second");
      expect(backpressured.chunks).toEqual(["first\n", "second\n"]);
    },
  );

  it.each(["out", "err"] as const)(
    "a SYNC throw carrying a non-EPIPE code on %s is NOT a closure — the stream stays open",
    (which) => {
      const failure = otherCode();
      const flaky = new RecordingStream({ throwOnWrite: (n) => (n === 1 ? failure : undefined) });
      const quiet = new RecordingStream();
      const sinks =
        which === "out" ? createOutputSinks(flaky, quiet) : createOutputSinks(quiet, flaky);

      expect(() => sinks[which]("first")).toThrow(failure);
      // Not marked closed: the next write reaches the stream (no sentinel).
      sinks[which]("second");
      expect(flaky.chunks).toEqual(["second\n"]);
    },
  );

  it.each(["out", "err"] as const)(
    "an ASYNC report carrying a non-EPIPE code on %s is NOT a closure — the stream stays open",
    (which) => {
      const out = new RecordingStream();
      const err = new RecordingStream();
      const sinks = createOutputSinks(out, err);
      const stream = which === "out" ? out : err;
      const failure = otherCode();

      expect(() => {
        stream.emitError(failure);
      }).toThrow(failure);

      sinks[which]("still open");
      expect(stream.chunks).toEqual(["still open\n"]);
    },
  );

  // The classifier's DOMAIN, as a FULL CROSS-PRODUCT. E2 says the
  // classification is "by error CODE and by nothing else — not by
  // delivery path, not by stream state, not by verb". A fixture that
  // fixes any one of those axes cannot falsify a classifier that
  // secretly tests it: three successive build-close gates each found
  // the next unfixed axis alive (a single non-EPIPE code, then a
  // path-scoped carrier test, then a stream-scoped one — each proven
  // by an executed mutation that survived the whole suite). So the
  // lanes below cross CARRIER SHAPE x DELIVERY PATH x STREAM on the
  // closure side, and CODE DOMAIN x DELIVERY PATH x STREAM on the
  // non-closure side. Nothing is fixed.

  const streams = ["out", "err"] as const;
  const paths = ["async", "sync"] as const;

  /** A sink pair whose CHOSEN stream carries the fault on the CHOSEN path. */
  function faulted(which: (typeof streams)[number], path: (typeof paths)[number], carrier: unknown) {
    const target =
      path === "sync"
        ? new RecordingStream({ throwOnWrite: (n) => (n === 1 ? carrier : undefined) })
        : new RecordingStream();
    const other = new RecordingStream();
    const sinks =
      which === "out" ? createOutputSinks(target, other) : createOutputSinks(other, target);
    return { target, sinks };
  }

  const nonClosures: ReadonlyArray<readonly [string, unknown]> = [
    ["a second non-EPIPE code (ENOENT)", streamError("ENOENT")],
    ["a third non-EPIPE code (EPERM)", streamError("EPERM")],
    ["an error carrying NO code", new Error("write failed")],
    ["a non-object throw", "write failed"],
    ["a plain object carrying a non-EPIPE code", { code: "EACCES" }],
  ];

  const epipeCarriers: ReadonlyArray<readonly [string, unknown]> = [
    ["an Error instance", streamError("EPIPE")],
    ["a plain object", { code: "EPIPE" }],
  ];

  for (const which of streams) {
    for (const path of paths) {
      it.each(epipeCarriers)(
        `EPIPE on ${which} via the ${path} path, carried by %s, marks the stream closed`,
        (_label, carrier) => {
          const { target, sinks } = faulted(which, path, carrier);

          if (path === "sync") {
            // The ESTABLISHING failure is absorbed whatever the carrier is.
            expect(() => sinks[which]("first")).not.toThrow();
            expect(target.chunks).toEqual([]);
          } else {
            sinks[which]("first");
            expect(target.chunks).toEqual(["first\n"]);
            expect(() => {
              target.emitError(carrier);
            }).not.toThrow();
          }

          // Marked closed: the NEXT write raises the sentinel, writes nothing.
          const before = [...target.chunks];
          expect(() => sinks[which]("second")).toThrow(OutputClosedError);
          expect(target.chunks).toEqual(before);
        },
      );

      it.each(nonClosures)(
        `a non-EPIPE fault on ${which} via the ${path} path — %s — is NOT a closure and propagates by IDENTITY`,
        (_label, failure) => {
          const { target, sinks } = faulted(which, path, failure);
          let caught: unknown;

          if (path === "sync") {
            try {
              sinks[which]("first");
            } catch (error) {
              caught = error;
            }
          } else {
            sinks[which]("first");
            try {
              target.emitError(failure);
            } catch (error) {
              caught = error;
            }
          }

          // Identity, not a message match: a wrapper would pass `toThrow`.
          expect(caught).toBe(failure);
          // Not marked closed — the next write still reaches the stream.
          sinks[which]("second");
          expect(target.chunks).toContain("second\n");
        },
      );
    }
  }
});

// ── family 2 (E3, E5, E11): the quiet contract ───────────────────────

describe("ch13-p0 family 2 (E3, E5, E11) — the quiet contract", () => {
  it("branch 1, class 0: a closure landing AFTER the write leaves exit 0 and adds no stderr byte", async () => {
    const db = tempDbPath();
    const deps = testDeps();
    await startOne(db, deps);

    const out = closingAfterFirstWrite();
    const err = new RecordingStream();
    const code = await runCli(["list", "--db", db], deps, createOutputSinks(out, err));

    expect(code).toBe(EXIT.ok);
    expect(out.chunks).toHaveLength(1);
    expect(err.chunks).toEqual([]);
  });

  it("branch 1, class 3 (the DATA half): a rejected submit keeps exit 3, closure or not", async () => {
    const db = tempDbPath();
    const deps = testDeps();
    const id = await startOne(db, deps);

    const out = closingAfterFirstWrite();
    const err = new RecordingStream();
    const code = await runCli(
      [
        "submit", "--db", db, "--instance", id, "--type", "NOPE",
        "--expected-version", "2", "--expected-role", "implementer",
      ],
      deps,
      createOutputSinks(out, err),
    );

    expect(code).toBe(EXIT.notFound);
    expect((JSON.parse(out.chunks[0] ?? "") as { kind: string }).kind).toBe("rejected");
    expect(err.chunks).toEqual([]);
  });

  it("branch 1, class 1: a tail failure AFTER the closure is marked still reports exit 1 with its document", async () => {
    const db = tempDbPath();
    const deps = testDeps({
      tailSteps: [
        () => {
          throw new Error("boom mid-tail");
        },
      ],
    });
    await startOne(db, deps);

    const out = closingAfterFirstWrite();
    const err = new RecordingStream();
    // ONE committed row: it is written, the closure is marked, and the
    // engine then WAITS — the scripted step throws before any second write.
    const code = await runCli(["tail", "inst-1", "--db", db], deps, createOutputSinks(out, err));

    expect(code).toBe(EXIT.internal);
    expect(out.chunks).toHaveLength(1);
    expect(err.chunks).toHaveLength(1);
    expect(errorDocOf(err.chunks[0] ?? "").class).toBe("internal");
  });

  it("E11 the preempted PAIR — masked: a tail ASKED TO WRITE AGAIN after the closure exits 0 with no document", async () => {
    const db = tempDbPath();
    const deps = testDeps({
      tailSteps: [
        () => {
          throw new Error("the integrity failure that never resolves");
        },
      ],
    });
    await startTwoRows(db, deps);

    const out = closingAfterFirstWrite();
    const err = new RecordingStream();
    const code = await runCli(["tail", "inst-1", "--db", db], deps, createOutputSinks(out, err));

    // Row 1 lands, the closure is marked, row 2's write attempt raises the
    // sentinel — the pending failure is preempted and never resolves.
    expect(code).toBe(EXIT.ok);
    expect(out.chunks).toHaveLength(1);
    expect(err.chunks).toEqual([]);
  });

  it("E11 the preempted PAIR — unmasked: a marked closure with NO further write leaves the failure loud", async () => {
    const db = tempDbPath();
    const deps = testDeps({
      tailSteps: [
        () => {
          throw new Error("the integrity failure that DOES resolve");
        },
      ],
    });
    await startOne(db, deps);

    const out = closingAfterFirstWrite();
    const err = new RecordingStream();
    const code = await runCli(["tail", "inst-1", "--db", db], deps, createOutputSinks(out, err));

    expect(code).toBe(EXIT.internal);
    expect(out.chunks).toHaveLength(1);
    expect(errorDocOf(err.chunks[0] ?? "").message).toContain("DOES resolve");
  });

  it("E3 precedence: a cleanup that THROWS while the sentinel unwinds WINS — exit 1 with its document on an OPEN stderr", async () => {
    const db = tempDbPath();
    const closes: string[] = [];
    const setup = testDeps();
    await startTwoRows(db, setup);

    const deps = testDeps({ openStore: observableStore(closes, true) });
    const out = closingAfterFirstWrite();
    const err = new RecordingStream();
    const code = await runCli(["tail", "inst-1", "--db", db], deps, createOutputSinks(out, err));

    expect(closes).toEqual(["store"]);
    expect(code).toBe(EXIT.internal);
    expect(err.chunks).toHaveLength(1);
    expect(errorDocOf(err.chunks[0] ?? "").message).toContain("store handle close failed");
  });

  it("E3 precedence on a CLOSED stderr: the cleanup error's code stands, its document is dropped — never 0", async () => {
    const db = tempDbPath();
    const closes: string[] = [];
    const setup = testDeps();
    await startTwoRows(db, setup);

    const deps = testDeps({ openStore: observableStore(closes, true) });
    const out = closingAfterFirstWrite();
    const err = new RecordingStream();
    const sinks = createOutputSinks(out, err);
    err.emitError(epipe());

    const code = await runCli(["tail", "inst-1", "--db", db], deps, sinks);

    expect(code).toBe(EXIT.internal);
    expect(err.chunks).toEqual([]);
  });

  it.each([
    ["usage (2)", ["frobnicate"], EXIT.usage] as const,
    ["not_found (3)", ["detail", "ghost"], EXIT.notFound] as const,
    ["internal (1)", ["list"], EXIT.internal] as const,
  ])(
    "E5 a CLOSED stderr keeps the class code — %s — and drops the document",
    async (_label, argv, expected) => {
      const db = tempDbPath();
      const deps =
        expected === EXIT.internal
          ? testDeps({
              openStore: () => {
                throw new Error("store open refused");
              },
            })
          : testDeps();

      const out = new RecordingStream();
      const err = new RecordingStream();
      const sinks = createOutputSinks(out, err);
      err.emitError(epipe());

      const code = await runCli([...argv, "--db", db], deps, sinks);

      expect(code).toBe(expected);
      expect(err.chunks).toEqual([]);
      expect(out.chunks).toEqual([]);
    },
  );

  it("E3 branch 1 on stderr: an EPIPE report landing AFTER the document write leaves the class code standing", async () => {
    const out = new RecordingStream();
    const err = closingAfterFirstWrite();
    const code = await runCli(["frobnicate"], testDeps(), createOutputSinks(out, err));

    expect(code).toBe(EXIT.usage);
    expect(err.chunks).toHaveLength(1);
    expect(errorDocOf(err.chunks[0] ?? "").class).toBe("usage");
  });
});

// ── family 3 (E4): post-closure behavior ─────────────────────────────

describe("ch13-p0 family 3 (E4) — post-closure behavior", () => {
  it("the combination lane: a reported closure plus a further write raises the sentinel and writes no byte", () => {
    const out = new RecordingStream();
    const sinks = createOutputSinks(out, new RecordingStream());
    sinks.out("first");
    out.emitError(epipe());

    expect(() => sinks.out("second")).toThrow(OutputClosedError);
    expect(() => sinks.out("third")).toThrow(OutputClosedError);
    expect(out.chunks).toEqual(["first\n"]);
  });

  // The repeat-report lane, crossed over STREAM STATE — the fourth axis
  // E2 names ("not by stream state"). A report arriving on an ALREADY
  // CLOSED stream classifies exactly as it would on an open one, on
  // either stream and whatever the carrier. The sync path has no
  // post-closure cell by construction: after closure the sink raises
  // the sentinel INSTEAD of calling `write()`, so no `write()` throw
  // can occur there (the grid's phase-applicability rule).
  for (const which of ["out", "err"] as const) {
    it.each([
      ["an Error instance", streamError("EPIPE")],
      ["a plain object", { code: "EPIPE" }],
    ] as ReadonlyArray<readonly [string, unknown]>)(
      `the repeat-report lane on ${which}: a further EPIPE report carried by %s is absorbed without state change`,
      (_label, carrier) => {
        const target = new RecordingStream();
        const other = new RecordingStream();
        const sinks =
          which === "out" ? createOutputSinks(target, other) : createOutputSinks(other, target);

        target.emitError(epipe());
        expect(() => {
          target.emitError(carrier);
          target.emitError(carrier);
        }).not.toThrow();

        expect(() => sinks[which]("after")).toThrow(OutputClosedError);
        expect(target.chunks).toEqual([]);
      },
    );
  }

  it("the sentinel-in-dispatch lane: the inner guard absorbs it and the class code already computed stands", async () => {
    const out = new RecordingStream();
    const err = new RecordingStream();
    const sinks = createOutputSinks(out, err);
    err.emitError(epipe());

    const code = await runCli(["frobnicate"], testDeps(), sinks);

    expect(code).toBe(EXIT.usage);
    expect(err.chunks).toEqual([]);
  });

  it("withStore (plain tail): the sentinel traverses every catch site unchanged, the cleanup runs, dispatch returns 0", async () => {
    const db = tempDbPath();
    const closes: string[] = [];
    await startTwoRows(db, testDeps());

    const deps = testDeps({ openStore: observableStore(closes) });
    const out = closingAfterFirstWrite();
    const err = new RecordingStream();
    const code = await runCli(["tail", "inst-1", "--db", db], deps, createOutputSinks(out, err));

    expect(code).toBe(EXIT.ok);
    expect(closes).toEqual(["store"]);
    expect(out.chunks).toHaveLength(1);
    expect(err.chunks).toEqual([]);
  });

  it("withStoreAndDiag (tail --diag): BOTH cleanup closes run and dispatch still returns 0", async () => {
    const db = tempDbPath();
    const closes: string[] = [];
    await startTwoRows(db, testDeps());

    const deps = testDeps({
      openStore: observableStore(closes),
      openDiagStore: observableDiagStore(closes),
    });
    const out = closingAfterFirstWrite();
    const err = new RecordingStream();
    const code = await runCli(
      ["tail", "inst-1", "--db", db, "--diag"],
      deps,
      createOutputSinks(out, err),
    );

    expect(code).toBe(EXIT.ok);
    expect(closes).toEqual(["diag", "store"]);
    expect(err.chunks).toEqual([]);
  });
});

// ── family 4 (E6): non-closure preservation, per path and per stream ─

describe("ch13-p0 family 4 (E6) — non-closure preservation", () => {
  it.each(["out", "err"] as const)(
    "the ASYNC path on %s: the listener RETHROWS, so the report stays an unhandled error",
    (which) => {
      const out = new RecordingStream();
      const err = new RecordingStream();
      createOutputSinks(out, err);
      const failure = otherCode();
      const stream = which === "out" ? out : err;

      expect(() => {
        stream.emitError(failure);
      }).toThrow(failure);
    },
  );

  it("the SYNC path at a VERB-SIDE write: rethrown into dispatch's generic branch — ONE internal document, exit 1", async () => {
    const db = tempDbPath();
    const deps = testDeps();
    await startOne(db, deps);

    const failure = otherCode();
    const out = new RecordingStream({ throwOnWrite: (n) => (n === 1 ? failure : undefined) });
    const err = new RecordingStream();
    const code = await runCli(["list", "--db", db], deps, createOutputSinks(out, err));

    expect(code).toBe(EXIT.internal);
    expect(err.chunks).toHaveLength(1);
    expect(errorDocOf(err.chunks[0] ?? "").class).toBe("internal");
    expect(out.chunks).toEqual([]);
  });

  it("the SYNC path at dispatch's OWN document write: it escapes the type-scoped guard AND dispatch's try — no document", async () => {
    const failure = otherCode();
    const out = new RecordingStream();
    const err = new RecordingStream({ throwOnWrite: (n) => (n === 1 ? failure : undefined) });

    await expect(runCli(["frobnicate"], testDeps(), createOutputSinks(out, err))).rejects.toBe(
      failure,
    );
    expect(err.chunks).toEqual([]);
    expect(out.chunks).toEqual([]);
  });

  // The post-closure member, crossed over STREAM STATE x STREAM x the
  // whole non-closure domain: a closed stream must not turn a
  // non-EPIPE report into a silent closure on EITHER stream.
  for (const which of ["out", "err"] as const) {
    it.each([
      ["a non-EPIPE code (EACCES)", streamError("EACCES")],
      ["a second non-EPIPE code (EPERM)", streamError("EPERM")],
      ["an error carrying NO code", new Error("write failed")],
      ["a non-object throw", "write failed"],
      ["a plain object carrying a non-EPIPE code", { code: "ENOENT" }],
    ] as ReadonlyArray<readonly [string, unknown]>)(
      `the post-closure member on ${which}: %s on an ALREADY-CLOSED stream still takes this lane, by identity`,
      (_label, failure) => {
        const target = new RecordingStream();
        const other = new RecordingStream();
        if (which === "out") {
          createOutputSinks(target, other);
        } else {
          createOutputSinks(other, target);
        }

        target.emitError(epipe());

        let caught: unknown;
        try {
          target.emitError(failure);
        } catch (error) {
          caught = error;
        }
        expect(caught).toBe(failure);
      },
    );
  }
});
