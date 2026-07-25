import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import type { TimeSource } from "../ports/time.js";
import { MEASUREMENT_FAILED_SENTINEL, createProcessGateRunner } from "./processGateRunner.js";
import type * as SpawnModule from "./spawn.js";
import { TIMER_MAX_MS, TimerKnobError } from "./spawn.js";

/** GR8's observation point: a TRANSPARENT pass-through spy over the C19 seam —
 * every `disciplinedSpawn` input is recorded, then the REAL seam runs (every
 * lane stays integration-real; only the seam INPUT becomes observable). */
const seamSpy = vi.hoisted(() => ({ inputs: [] as { cmd: string; timeoutMs: number }[] }));
vi.mock("./spawn.js", async (importOriginal) => {
  const actual = await importOriginal<typeof SpawnModule>();
  return {
    ...actual,
    disciplinedSpawn: (input: Parameters<typeof actual.disciplinedSpawn>[0]) => {
      seamSpy.inputs.push({ cmd: input.cmd, timeoutMs: input.timeoutMs });
      return actual.disciplinedSpawn(input);
    },
  };
});

/**
 * The real ProcessGateRunner (packet ch9-p4a, GR1–GR5/GR8) — driven against
 * REAL `/bin/sh` children and a REAL temp git repo (integration-grain BY
 * DESIGN; this file joins the Stryker subprocess exclude). The runner NEVER
 * classifies gate semantics: nonzero exits are kind `ok`, the kernel's
 * mode-dependent classification is the only consumer of exitCode/stdout.
 */

const roots: string[] = [];
const runners: { close(): void }[] = [];
afterEach(() => {
  for (const r of runners.splice(0)) {
    try {
      r.close();
    } catch {
      // already closed by the lane
    }
  }
  for (const dir of roots.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});
function tempRoot(): string {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "v3-gate-runner-")));
  roots.push(root);
  return root;
}

/** A deterministic two-reads-per-run time source (IC-D): each run consumes a
 * (start, end) pair from the script; an exhausted script keeps stepping by
 * the last delta so unrelated lanes never depend on the clock. */
function scriptedTime(deltas: readonly number[]): TimeSource {
  let calls = 0;
  let at = 1_000;
  return {
    now() {
      const runIndex = Math.floor(calls / 2);
      const isEnd = calls % 2 === 1;
      calls += 1;
      if (isEnd) {
        at += deltas[runIndex] ?? 7;
      }
      return at;
    },
  };
}

function makeRunner(opts: {
  dbPath?: string;
  deltas?: readonly number[];
  envAllowlist?: Record<string, string>;
  graceMs?: number;
}) {
  const dbPath = opts.dbPath ?? join(tempRoot(), "store.sqlite.process-evidence.sqlite");
  const runner = createProcessGateRunner(
    dbPath,
    { time: scriptedTime(opts.deltas ?? [7]) },
    {
      ...(opts.envAllowlist !== undefined ? { envAllowlist: opts.envAllowlist } : {}),
      ...(opts.graceMs !== undefined ? { graceMs: opts.graceMs } : {}),
    },
  );
  runners.push(runner);
  return runner;
}

/** A committed temp git repo (P8a's substrate) — returns dir + HEAD sha. */
function tempRepo(): { dir: string; head: string } {
  const dir = tempRoot();
  const git = (...args: string[]): string =>
    execFileSync("git", ["-C", dir, ...args], { encoding: "utf8" });
  git("init", "-q");
  git("config", "user.email", "t@example.com");
  git("config", "user.name", "t");
  writeFileSync(join(dir, "a.txt"), "one\n");
  git("add", "a.txt");
  git("commit", "-q", "-m", "init");
  return { dir, head: git("rev-parse", "HEAD").trim() };
}

describe("processGateRunner — GR3 the TOTAL kind walk (the runner never classifies)", () => {
  it("exit 0 → ok(0, stdout) with captured stdout", async () => {
    const runner = makeRunner({});
    const r = await runner.run("printf gate-out", {
      cwd: tempRoot(),
      stdin: "",
      timeoutMs: 30_000,
    });
    expect(r).toMatchObject({ kind: "ok", exitCode: 0, stdout: "gate-out" });
  });

  it("exit NONZERO → kind stays ok(n, stdout) — classification is the KERNEL's", async () => {
    const runner = makeRunner({});
    const r = await runner.run("printf partial; exit 4", {
      cwd: tempRoot(),
      stdin: "",
      timeoutMs: 30_000,
    });
    expect(r).toMatchObject({ kind: "ok", exitCode: 4, stdout: "partial" });
  });

  it("a TERM-compliant child under the runner's own timeout → timeout", async () => {
    const runner = makeRunner({ graceMs: 5_000 });
    const r = await runner.run("sleep 100", { cwd: tempRoot(), stdin: "", timeoutMs: 200 });
    expect(r.kind).toBe("timeout");
  });

  it("a TERM-IGNORING child → the grace SIGKILL escalation → timeout", async () => {
    const runner = makeRunner({ graceMs: 1_000 });
    const r = await runner.run("trap '' TERM; sleep 100", {
      cwd: tempRoot(),
      stdin: "",
      timeoutMs: 200,
    });
    expect(r.kind).toBe("timeout");
  }, 15_000);

  it("the FLAGGED-natural-exit race → timeout (GR3: ANY flagged conclusion, code shape included)", async () => {
    // The child ignores TERM and exits 0 NATURALLY after the deadline but
    // before the grace SIGKILL: the seam reports a code-0 conclusion WITH the
    // timedOut flag. GR3's letter: the deadline elapsing IS the runner's own
    // timeout engaging — kind `timeout`, never ok (fail-closed toward block).
    const runner = makeRunner({ graceMs: 5_000 });
    const r = await runner.run("trap '' TERM; sleep 0.6; exit 0", {
      cwd: tempRoot(),
      stdin: "",
      timeoutMs: 150,
    });
    expect(r.kind).toBe("timeout");
  }, 15_000);

  it("a FOREIGN kill (unflagged signal conclusion) → runner_error", async () => {
    const runner = makeRunner({});
    const r = await runner.run("kill -9 $$", { cwd: tempRoot(), stdin: "", timeoutMs: 30_000 });
    expect(r.kind).toBe("runner_error");
  });

  it("a spawn-infra error (nonexistent cwd → ENOENT) → runner_error", async () => {
    const runner = makeRunner({});
    const r = await runner.run("true", {
      cwd: join(tempRoot(), "no-such-dir"),
      stdin: "",
      timeoutMs: 30_000,
    });
    expect(r.kind).toBe("runner_error");
  });
});

describe("processGateRunner — GR1/GR2 the seam-confined spawn", () => {
  it("the invocation document arrives on the gate child's stdin BYTE-EXACT (ch11-C13: stdin, no argv payload)", async () => {
    const runner = makeRunner({});
    const doc = '{"instance_id":"i-1","config":{"note":"é"}}';
    const r = await runner.run("cat", { cwd: tempRoot(), stdin: doc, timeoutMs: 30_000 });
    expect(r).toMatchObject({ kind: "ok", exitCode: 0, stdout: doc });
  });

  it("the EPIPE negative: a fast-exiting child that never reads a LARGE stdin — kind follows the exit, never runner_error", async () => {
    const runner = makeRunner({});
    const r = await runner.run("exit 5", {
      cwd: tempRoot(),
      stdin: "x".repeat(1_048_576),
      timeoutMs: 30_000,
    });
    expect(r).toMatchObject({ kind: "ok", exitCode: 5 });
  });

  it("allowlist confinement: the gate child sees the allowlist, a host canary is ABSENT (canary-absence, NEVER set-equality — the /bin/sh built-ins PWD/SHLVL/_ are declared residuals, F6c)", async () => {
    const runner = makeRunner({
      envAllowlist: { PATH: process.env.PATH ?? "", GATE_ALLOWED: "yes" },
    });
    const r = await runner.run("env", { cwd: tempRoot(), stdin: "", timeoutMs: 30_000 });
    expect(r.kind).toBe("ok");
    if (r.kind !== "ok") return;
    expect(r.stdout).toContain("GATE_ALLOWED=yes");
    // The host canary (always set on darwin/CI shells): proven ABSENT.
    expect(r.stdout).not.toMatch(/^HOME=/m);
  });

  it("the explicit cwd is the gate child's cwd", async () => {
    const dir = tempRoot();
    const runner = makeRunner({});
    const r = await runner.run("pwd", { cwd: dir, stdin: "", timeoutMs: 30_000 });
    expect(r.kind).toBe("ok");
    if (r.kind !== "ok") return;
    expect(realpathSync(r.stdout.trim())).toBe(dir);
  });
});

describe("processGateRunner — GR4 measurement (after the gate child concludes)", () => {
  it("a repo cwd yields the REAL head sha and a porcelain hash that is STABLE across identical states and CHANGES when the tree dirties", async () => {
    const { dir, head } = tempRepo();
    const runner = makeRunner({});
    const r1 = await runner.run("true", { cwd: dir, stdin: "", timeoutMs: 30_000 });
    const r2 = await runner.run("true", { cwd: dir, stdin: "", timeoutMs: 30_000 });
    const e1 = runner.resolve(r1.logRef);
    const e2 = runner.resolve(r2.logRef);
    expect(e1?.headSha).toBe(head);
    expect(e2?.headSha).toBe(head);
    expect(e1?.gitStatusHash).toBe(e2?.gitStatusHash); // stable across identical states
    expect(e1?.gitStatusHash).not.toBe(MEASUREMENT_FAILED_SENTINEL);
    // Dirty the tree — the hash MUST move (sensitivity).
    writeFileSync(join(dir, "b.txt"), "dirty\n");
    const r3 = await runner.run("true", { cwd: dir, stdin: "", timeoutMs: 30_000 });
    const e3 = runner.resolve(r3.logRef);
    expect(e3?.headSha).toBe(head);
    expect(e3?.gitStatusHash).not.toBe(e1?.gitStatusHash);
  });

  it("gitStatusHash is sha256 over the RAW porcelain BYTES — the EXACT digest, computed independently from the byte output (never a re-encoding of decoded text)", async () => {
    const { dir } = tempRepo();
    // A multibyte untracked filename: the porcelain -z output carries its raw
    // UTF-8 bytes unquoted, so any decode/re-encode corruption moves the hash.
    writeFileSync(join(dir, "é üó.txt"), "multibyte-name\n");
    // The EXPECTED digest, independently: the raw porcelain BYTES (Buffer —
    // no encoding), hashed directly, under the measurement's own env shape.
    const rawPorcelain = execFileSync("git", ["-C", dir, "status", "--porcelain=v1", "-z"], {
      env: { PATH: process.env.PATH ?? "" },
    });
    const expected = createHash("sha256").update(rawPorcelain).digest("hex");
    const runner = makeRunner({});
    const r = await runner.run("true", { cwd: dir, stdin: "", timeoutMs: 30_000 });
    expect(runner.resolve(r.logRef)?.gitStatusHash).toBe(expected);
  });

  it("measurement runs AFTER the gate child concludes: a workspace-MUTATING gate child's facts reflect the POST-child state (headSha AND gitStatusHash)", async () => {
    const { dir, head } = tempRepo();
    writeFileSync(join(dir, "b.txt"), "post\n");
    const runner = makeRunner({});
    // The gate child itself MUTATES the workspace: stages and commits b.txt.
    const r = await runner.run(
      "git add b.txt && git -c user.email=t@example.com -c user.name=t commit -q -m post",
      { cwd: dir, stdin: "", timeoutMs: 30_000 },
    );
    expect(r).toMatchObject({ kind: "ok", exitCode: 0 });
    const measureEnv = { env: { PATH: process.env.PATH ?? "" } };
    const postHead = execFileSync("git", ["-C", dir, "rev-parse", "HEAD"], {
      encoding: "utf8",
      ...measureEnv,
    }).trim();
    const postStatus = execFileSync(
      "git",
      ["-C", dir, "status", "--porcelain=v1", "-z"],
      measureEnv,
    );
    expect(postHead).not.toBe(head); // the child really moved HEAD
    const evidence = runner.resolve(r.logRef);
    // POST-child facts — RED if measurement ran before/concurrent with the child.
    expect(evidence?.headSha).toBe(postHead);
    expect(evidence?.gitStatusHash).toBe(createHash("sha256").update(postStatus).digest("hex"));
  });

  it("a NON-repo cwd (P8b: git exits 128) → BOTH facts take the ONE sentinel, the gate kind UNCHANGED", async () => {
    const runner = makeRunner({});
    const r = await runner.run("printf ok", { cwd: tempRoot(), stdin: "", timeoutMs: 30_000 });
    expect(r).toMatchObject({ kind: "ok", exitCode: 0, stdout: "ok" });
    const evidence = runner.resolve(r.logRef);
    expect(evidence?.headSha).toBe(MEASUREMENT_FAILED_SENTINEL);
    expect(evidence?.gitStatusHash).toBe(MEASUREMENT_FAILED_SENTINEL);
  });

  it("durationMs comes from the INJECTED TimeSource only (IC-D) — the scripted delta is the recorded value", async () => {
    const runner = makeRunner({ deltas: [250] });
    const r = await runner.run("true", { cwd: tempRoot(), stdin: "", timeoutMs: 30_000 });
    expect(r.durationMs).toBe(250);
    expect(runner.resolve(r.logRef)?.durationMs).toBe(250);
  });

  it("a backwards clock clamps durationMs at 0 (non-negative by contract)", async () => {
    const runner = makeRunner({ deltas: [-50] });
    const r = await runner.run("true", { cwd: tempRoot(), stdin: "", timeoutMs: 30_000 });
    expect(r.durationMs).toBe(0);
  });
});

describe("processGateRunner — GR5 durable evidence (every kind, before run() resolves)", () => {
  it("ok / timeout / runner_error are evidenced EQUALLY: each logRef resolves to the COMPLETE per-kind record", async () => {
    const { dir } = tempRepo();
    const runner = makeRunner({ graceMs: 5_000 });
    const ok = await runner.run("printf out; printf err >&2; exit 3", {
      cwd: dir,
      stdin: "",
      timeoutMs: 30_000,
    });
    const timeout = await runner.run("sleep 100", { cwd: dir, stdin: "", timeoutMs: 200 });
    const runnerError = await runner.run("kill -9 $$", {
      cwd: dir,
      stdin: "",
      timeoutMs: 30_000,
    });
    expect(ok.kind).toBe("ok");
    expect(timeout.kind).toBe("timeout");
    expect(runnerError.kind).toBe("runner_error");

    const okEvidence = runner.resolve(ok.logRef);
    expect(okEvidence).toMatchObject({ kind: "ok", exitCode: 3, durationMs: ok.durationMs });
    // `log` carries the captured stdout+stderr text VERBATIM (untrusted-confined).
    expect(okEvidence?.log).toContain("out");
    expect(okEvidence?.log).toContain("err");

    const timeoutEvidence = runner.resolve(timeout.logRef);
    expect(timeoutEvidence?.kind).toBe("timeout");
    expect(timeoutEvidence).not.toHaveProperty("exitCode"); // exitCode iff ok
    expect(timeoutEvidence?.headSha).toBeDefined();
    expect(timeoutEvidence?.gitStatusHash).toBeDefined();

    const runnerErrorEvidence = runner.resolve(runnerError.logRef);
    expect(runnerErrorEvidence?.kind).toBe("runner_error");
    expect(runnerErrorEvidence).not.toHaveProperty("exitCode");
  });

  it("the COMPLETE per-kind record for timeout AND runner_error: log/kind/durationMs/headSha/gitStatusHash ALL present (real facts, not sentinels), exitCode ABSENT", async () => {
    const { dir, head } = tempRepo();
    const runner = makeRunner({ graceMs: 5_000, deltas: [40, 50] });
    const timeout = await runner.run("printf t-out; sleep 100", {
      cwd: dir,
      stdin: "",
      timeoutMs: 200,
    });
    const runnerError = await runner.run("kill -9 $$", { cwd: dir, stdin: "", timeoutMs: 30_000 });
    expect(timeout.kind).toBe("timeout");
    expect(runnerError.kind).toBe("runner_error");
    for (const [ref, kind] of [
      [timeout.logRef, "timeout"],
      [runnerError.logRef, "runner_error"],
    ] as const) {
      const evidence = runner.resolve(ref);
      expect(evidence?.kind).toBe(kind);
      // The COMPLETE per-kind keyset — every field present, exitCode absent.
      expect(Object.keys(evidence ?? {}).sort()).toEqual([
        "durationMs",
        "gitStatusHash",
        "headSha",
        "kind",
        "log",
      ]);
      expect(typeof evidence?.log).toBe("string");
      expect(evidence?.durationMs).toBeGreaterThanOrEqual(0);
      expect(evidence?.headSha).toBe(head); // a REAL measured fact, not the sentinel
      expect(evidence?.gitStatusHash).not.toBe(MEASUREMENT_FAILED_SENTINEL);
    }
    // The captured text still rides `log` on the non-ok kinds.
    expect(runner.resolve(timeout.logRef)?.log).toContain("t-out");
  });

  it("records survive a re-open of the same evidence db path (durable BEYOND the handle — the slot's substrate reused)", async () => {
    const dbPath = join(tempRoot(), "s.sqlite.process-evidence.sqlite");
    const runner = makeRunner({ dbPath });
    const r = await runner.run("printf x", { cwd: tempRoot(), stdin: "", timeoutMs: 30_000 });
    runner.close();
    const reopened = makeRunner({ dbPath });
    expect(reopened.resolve(r.logRef)).toMatchObject({ kind: "ok", exitCode: 0 });
  });

  it("resolve of an unknown ref is undefined", async () => {
    const runner = makeRunner({});
    expect(runner.resolve("no-such-ref")).toBeUndefined();
  });

  it("the W2 persistence-failure lane: an unwritable substrate → run() THROWS, never a returned-but-unresolvable ref", async () => {
    const runner = makeRunner({});
    runner.close(); // the closed substrate: the evidence INSERT must throw
    await expect(
      runner.run("printf x", { cwd: tempRoot(), stdin: "", timeoutMs: 30_000 }),
    ).rejects.toThrow();
  });
});

describe("processGateRunner — GR8 the per-call timer clamp + construction knobs", () => {
  it("a timeoutMs ABOVE the 2^31 substrate bound is CLAMPED, never collapsed to ~1 ms (P6i driven out): the child completes", async () => {
    // Under the raw-substrate collapse a 2^31 delay fires at ~1 ms and the
    // 300 ms child would be killed → kind timeout. The clamp keeps the timer
    // at TIMER_MAX_MS − graceMs, so the child completes normally.
    const runner = makeRunner({});
    const r = await runner.run("sleep 0.3; printf done", {
      cwd: tempRoot(),
      stdin: "",
      timeoutMs: 2 ** 31,
    });
    expect(r).toMatchObject({ kind: "ok", exitCode: 0, stdout: "done" });
  });

  it("the clamp CEILING is EXACT: a timeoutMs above 2^31−1 reaches the seam as TIMER_MAX_MS − graceMs (observed at the seam input); a below-ceiling value passes through UNCLAMPED", async () => {
    seamSpy.inputs.length = 0;
    const runner = makeRunner({}); // the default graceMs (10 000) — GR8's subtrahend
    const clamped = await runner.run("true", {
      cwd: tempRoot(),
      stdin: "",
      timeoutMs: 2 ** 40,
    });
    expect(clamped.kind).toBe("ok");
    const clampedGateSpawn = seamSpy.inputs.find((i) => i.cmd === "/bin/sh");
    expect(clampedGateSpawn?.timeoutMs).toBe(TIMER_MAX_MS - 10_000);

    seamSpy.inputs.length = 0;
    const passthrough = await runner.run("true", {
      cwd: tempRoot(),
      stdin: "",
      timeoutMs: 30_000,
    });
    expect(passthrough.kind).toBe("ok");
    expect(seamSpy.inputs.find((i) => i.cmd === "/bin/sh")?.timeoutMs).toBe(30_000);
  });

  it("the runner NEVER rejects a call on timeout magnitude (admission owns config validity)", async () => {
    const runner = makeRunner({});
    const r = await runner.run("true", {
      cwd: tempRoot(),
      stdin: "",
      timeoutMs: Number.MAX_SAFE_INTEGER,
    });
    expect(r.kind).toBe("ok");
  });

  it("graceMs is validated FAIL-CLOSED at construction via the SHARED validator (P3b-T2)", () => {
    expect(() => makeRunner({ graceMs: 500 })).toThrow(TimerKnobError);
    expect(() => makeRunner({ graceMs: Number.NaN })).toThrow(TimerKnobError);
    expect(() => makeRunner({ graceMs: 2 ** 31 })).toThrow(TimerKnobError);
    expect(() => makeRunner({ graceMs: 10_000 })).not.toThrow();
  });
});
