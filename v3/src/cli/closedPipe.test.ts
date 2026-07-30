import type { ChildProcessByStdio } from "node:child_process";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Readable } from "node:stream";

import { afterEach, describe, expect, it } from "vitest";

/**
 * packet ch13-p0 — the SUBPROCESS lanes of the closed-pipe sink
 * contract: families 5 (entrypoint parity) and 6 (the measured repro
 * journey) entirely, family 7's production-BINDING members, and family
 * 4's process-level member. Every in-process seam member lives in
 * `closedPipeSink.test.ts` (the packet's file-roles paragraph); this
 * file JOINS the stryker exclude list, because it execs the repo-root
 * tsx bin that Stryker's sandbox copy cannot resolve.
 *
 * Lanes spawn the entrypoints DIRECTLY (`tsx src/cli/main.ts`,
 * `tsx src/cli/dev/main.ts`), NEVER the `pnpm v3:cli` bridge — the
 * bridge prints its own banner on stdout, so a lane through it measures
 * a stream the CLI does not own (in-context note 2).
 *
 * The consumer's departure is staged by CLOSING THE READ END of the
 * child's stdout pipe (`child.stdout.destroy()`), which is what a
 * `| head -c 5` or a quitting pager does to the writer. Every lane is
 * EVENT-DRIVEN — `child.on("exit")`, `stream.once("data")` — never
 * timer-paced: no sleep, no fixed delay.
 *
 * E8's two stated NON-members are deliberately absent: a `head -1` lane
 * over a single-line document through the direct entrypoint (it drains
 * the document to the newline and cannot reproduce), and the
 * `pnpm v3:cli` bridge form (its first stdout bytes are the bridge's
 * banner, not a CLI-owned stream).
 */

const TSX_BIN = join(process.cwd(), "..", "node_modules", ".bin", "tsx");
const MAIN = join(process.cwd(), "src", "cli", "main.ts");
const DEV_MAIN = join(process.cwd(), "src", "cli", "dev", "main.ts");
const COMMON = join(process.cwd(), "src", "cli", "common.ts");
const TEMPLATES = join(process.cwd(), "templates");

/** `stdio: ["ignore", "pipe", "pipe"]` — no stdin, both output streams piped. */
type PipedChild = ChildProcessByStdio<null, Readable, Readable>;

const dirs: string[] = [];
const children: PipedChild[] = [];

function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "v3-closed-pipe-proc-"));
  dirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const child of children.splice(0)) {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill("SIGKILL");
    }
  }
  for (const dir of dirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

interface Completed {
  readonly code: number | null;
  readonly stdout: string;
  readonly stderr: string;
}

function launch(argv: readonly string[]): PipedChild {
  const child = spawn(TSX_BIN, [...argv], { stdio: ["ignore", "pipe", "pipe"] });
  children.push(child);
  return child;
}

function exitOf(child: PipedChild): Promise<number | null> {
  return new Promise((resolve) => {
    child.on("exit", (code) => {
      resolve(code);
    });
  });
}

function firstDataOf(child: PipedChild): Promise<void> {
  return new Promise((resolve) => {
    child.stdout.once("data", () => {
      resolve();
    });
  });
}

function collect(child: PipedChild, into: { text: string }): void {
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk: string) => {
    into.text += chunk;
  });
}

/** A NORMAL run to completion — both streams drained, no closure. */
async function run(argv: readonly string[]): Promise<Completed> {
  const child = launch(argv);
  const out = { text: "" };
  const err = { text: "" };
  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk: string) => {
    out.text += chunk;
  });
  collect(child, err);
  const code = await exitOf(child);
  return { code, stdout: out.text, stderr: err.text };
}

/**
 * The CLOSED-PIPE run: spawn, wait for the CLI's first stdout bytes (or
 * its exit, whichever comes first), then close the read end. `during`
 * runs after the departure — the class-(b) shape, where a multi-write
 * verb is fed more rows once the consumer is already gone.
 */
async function runWithDepartedConsumer(
  argv: readonly string[],
  during: () => Promise<void> = () => Promise.resolve(),
): Promise<Completed> {
  const child = launch(argv);
  const err = { text: "" };
  collect(child, err);
  // Registered BEFORE any await: a child that exits early must not leave
  // the lane waiting on an event that already fired.
  const exited = exitOf(child);
  const firstData = firstDataOf(child);
  await Promise.race([firstData, exited]);
  child.stdout.destroy();
  await during();
  const code = await exited;
  return { code, stdout: "", stderr: err.text };
}

// ── fixture staging (ordinary, fully drained CLI runs) ───────────────

async function stageStarted(db: string): Promise<string> {
  const created = await run([
    MAIN, "create", "--db", db, "--task", "t", "--templates-dir", TEMPLATES,
  ]);
  expect(created.code).toBe(0);
  const id = (JSON.parse(created.stdout.trim()) as { instanceId: string }).instanceId;
  expect((await run([MAIN, "start", id, "--db", db, "--templates-dir", TEMPLATES])).code).toBe(0);
  return id;
}

interface Step {
  readonly type: string;
  readonly expectedVersion: number;
  readonly expectedRole: string;
  readonly actorId: string;
  readonly payload: unknown;
}

/** The cycling canonical template (implement -PASS-> review -PASS->
 * implement) never terminates, so an arbitrary number of committed rows
 * can be staged without reaching a terminal instance. */
function passSteps(count: number, fromVersion: number, payload: (i: number) => unknown): Step[] {
  const steps: Step[] = [];
  for (let i = 0; i < count; i += 1) {
    const even = i % 2 === 0;
    steps.push({
      type: "PASS",
      expectedVersion: fromVersion + i,
      expectedRole: even ? "implementer" : "reviewer",
      actorId: even ? "codex" : "claude",
      payload: payload(i),
    });
  }
  return steps;
}

function stepsFile(dir: string, steps: readonly Step[]): string {
  const path = join(dir, `steps-${String(steps.length)}-${String(steps[0]?.expectedVersion ?? 0)}.json`);
  writeFileSync(path, JSON.stringify({ steps }));
  return path;
}

async function inject(db: string, id: string, file: string): Promise<Completed> {
  const result = await run([
    DEV_MAIN, "inject", "--db", db, "--instance", id, "--file", file,
    "--templates-dir", TEMPLATES,
  ]);
  expect(result.code).toBe(0);
  return result;
}

const BIG_PAYLOAD = "x".repeat(12_000);

// ── family 6 (E8): the journey — one lane per MEASURED repro class ───

describe("ch13-p0 family 6 (E8) — the measured repro classes, through the shipped entrypoint", () => {
  it(
    "class (a): the consumer stops reading mid-document — exit 0, zero CLI stderr bytes",
    { timeout: 60_000 },
    async () => {
      const dir = tempDir();
      const db = join(dir, "store.db");
      const id = await stageStarted(db);
      // The fixture document must exceed the OS pipe buffer (65536 on the
      // measured substrate), or it drains before the consumer leaves.
      await inject(db, id, stepsFile(dir, passSteps(10, 2, (i) => ({ note: BIG_PAYLOAD, i }))));
      const drained = await run([MAIN, "timeline", id, "--db", db]);
      expect(drained.code).toBe(0);
      expect(drained.stdout.length).toBeGreaterThanOrEqual(120 * 1024);

      const cut = await runWithDepartedConsumer([MAIN, "timeline", id, "--db", db]);
      expect(cut.code).toBe(0);
      expect(cut.stderr).toBe("");
    },
  );

  it(
    "class (b): a multi-write verb writes again after the consumer left — exit 0, zero CLI stderr bytes",
    { timeout: 60_000 },
    async () => {
      const dir = tempDir();
      const db = join(dir, "store.db");
      const id = await stageStarted(db);

      const cut = await runWithDepartedConsumer(
        [MAIN, "tail", id, "--db", db, "--from", "0", "--poll-ms", "25"],
        async () => {
          // Rows committed ONE AT A TIME by separate processes, so the live
          // tail meets a departed consumer on a genuinely later write.
          for (const step of passSteps(3, 2, (i) => ({ n: i }))) {
            await inject(db, id, stepsFile(dir, [step]));
          }
        },
      );

      expect(cut.code).toBe(0);
      expect(cut.stderr).toBe("");
    },
  );
});

// ── family 5 (E1): both shipped entrypoints, off ONE implementation ──

describe("ch13-p0 family 5 (E1) — entrypoint parity", () => {
  it(
    "the operator CLI (`tail`) survives a departed consumer: exit 0, zero stderr bytes",
    { timeout: 60_000 },
    async () => {
      const dir = tempDir();
      const db = join(dir, "store.db");
      const id = await stageStarted(db);

      const cut = await runWithDepartedConsumer(
        [MAIN, "tail", id, "--db", db, "--from", "0", "--poll-ms", "25"],
        async () => {
          for (const step of passSteps(3, 2, (i) => ({ n: i }))) {
            await inject(db, id, stepsFile(dir, [step]));
          }
        },
      );

      expect(cut.code).toBe(0);
      expect(cut.stderr).toBe("");
    },
  );

  it(
    "the dev CLI (`dev inject`) survives a departed consumer: exit 0, zero stderr bytes",
    { timeout: 60_000 },
    async () => {
      const dir = tempDir();
      const db = join(dir, "store.db");
      const id = await stageStarted(db);
      const file = stepsFile(dir, passSteps(12, 2, (i) => ({ note: BIG_PAYLOAD, i })));

      const cut = await runWithDepartedConsumer([
        DEV_MAIN, "inject", "--db", db, "--instance", id, "--file", file,
        "--templates-dir", TEMPLATES,
      ]);

      expect(cut.code).toBe(0);
      expect(cut.stderr).toBe("");
    },
  );
});

// ── family 7 (E12): the production BINDINGS, with no stream error ────

describe("ch13-p0 family 7 (E12) — the production bindings deliver today's bytes", () => {
  it(
    "the operator CLI: NDJSON framing on stdout, exit 0 — and ONE error document on stderr, exit 2",
    { timeout: 60_000 },
    async () => {
      const dir = tempDir();
      const db = join(dir, "store.db");
      const id = await stageStarted(db);
      await inject(
        db,
        id,
        stepsFile(dir, [
          { type: "PASS", expectedVersion: 2, expectedRole: "implementer", actorId: "codex", payload: { n: 1 } },
          { type: "CONVERGED", expectedVersion: 3, expectedRole: "reviewer", actorId: "claude", payload: { n: 2 } },
        ]),
      );

      const tail = await run([MAIN, "tail", id, "--db", db, "--from", "0"]);
      expect(tail.code).toBe(0);
      expect(tail.stderr).toBe("");
      expect(tail.stdout.endsWith("\n")).toBe(true);
      const rows = tail.stdout.slice(0, -1).split("\n");
      expect(rows).toHaveLength(3);
      expect(rows.map((row) => (JSON.parse(row) as { seq: number }).seq)).toEqual([1, 2, 3]);

      const failure = await run([MAIN, "frobnicate"]);
      expect(failure.code).toBe(2);
      expect(failure.stdout).toBe("");
      expect(failure.stderr.endsWith("\n")).toBe(true);
      expect(failure.stderr.slice(0, -1).split("\n")).toHaveLength(1);
      expect(Object.keys((JSON.parse(failure.stderr) as { error: object }).error).sort()).toEqual([
        "class", "message", "name",
      ]);
    },
  );

  it(
    "the dev CLI: one line per injected step on stdout, exit 0 — and ONE error document on stderr, exit 2",
    { timeout: 60_000 },
    async () => {
      const dir = tempDir();
      const db = join(dir, "store.db");
      const id = await stageStarted(db);
      const injected = await inject(
        db,
        id,
        stepsFile(dir, passSteps(3, 2, (i) => ({ n: i }))),
      );
      expect(injected.stderr).toBe("");
      expect(injected.stdout.endsWith("\n")).toBe(true);
      expect(injected.stdout.slice(0, -1).split("\n")).toHaveLength(3);

      const failure = await run([DEV_MAIN, "frobnicate"]);
      expect(failure.code).toBe(2);
      expect(failure.stdout).toBe("");
      expect(failure.stderr.slice(0, -1).split("\n")).toHaveLength(1);
      expect((JSON.parse(failure.stderr) as { error: { class: string } }).error.class).toBe("usage");
    },
  );
});

// ── family 4 (E6a): the process-level half of the non-closure lane ───

describe("ch13-p0 family 4 (E6a) — the async non-closure path stays an unhandled error", () => {
  it(
    "a non-EPIPE `error` report is rethrown from the listener: uncaught exception, exit 1, a stack on stderr, NO document",
    { timeout: 60_000 },
    async () => {
      const dir = tempDir();
      const script = join(dir, "nonClosureReport.mts");
      writeFileSync(
        script,
        [
          `import { createOutputSinks } from ${JSON.stringify(COMMON)};`,
          `const listeners: ((error: Error) => void)[] = [];`,
          `const stream = {`,
          `  write(): boolean {`,
          `    process.nextTick(() => {`,
          `      for (const listener of listeners) {`,
          `        listener(Object.assign(new Error("write EACCES"), { code: "EACCES" }));`,
          `      }`,
          `    });`,
          `    return true;`,
          `  },`,
          `  on(_event: "error", listener: (error: Error) => void) {`,
          `    listeners.push(listener);`,
          `    return this;`,
          `  },`,
          `};`,
          `createOutputSinks(stream, stream).out('{"kind":"probe"}');`,
          ``,
        ].join("\n"),
      );

      const result = await run([script]);
      expect(result.code).toBe(1);
      expect(result.stderr).toContain("EACCES");
      // The stream error mints NO error document — the stack is Node's,
      // not the CLI's channel-rule surface. The exact frames are not part
      // of the contract, so only the class and its absence are asserted.
      expect(result.stderr).not.toContain('"error":{"class"');
    },
  );
});
