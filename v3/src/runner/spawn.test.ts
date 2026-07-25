import { mkdtempSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { disciplinedSpawn, TimerKnobError, validateTimerKnobs } from "./spawn.js";

/**
 * The SD1 seam (packet ch9-p3b) — driven against REAL child processes
 * (integration-grain BY DESIGN: the spawn discipline IS the subject). Children
 * are inline `node -e` scripts run through `process.execPath` (an absolute
 * path, so no PATH is needed to resolve the binary — the env-replacement lane
 * can prove PATH absent).
 */

const NODE = process.execPath;
const roots: string[] = [];
afterEach(() => {
  for (const dir of roots.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});
function tempRoot(): string {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "v3-spawn-")));
  roots.push(root);
  return root;
}

/** A spawn over a `node -e` child, wide timers so the seam's own timer never
 * fires unless a lane wants it to. */
function nodeScript(
  script: string,
  overrides: { cwd?: string; env?: Record<string, string>; timeoutMs?: number; graceMs?: number } = {},
) {
  return disciplinedSpawn({
    cmd: NODE,
    args: ["-e", script],
    cwd: overrides.cwd ?? tempRoot(),
    env: overrides.env ?? { PATH: process.env.PATH ?? "" },
    timeoutMs: overrides.timeoutMs ?? 30_000,
    graceMs: overrides.graceMs ?? 10_000,
  });
}

describe("disciplinedSpawn — SD1 the shared spawn discipline seam", () => {
  it("exit fidelity: a real child's exit code is reported VERBATIM (code path)", async () => {
    const c = await nodeScript("process.exit(3)");
    expect(c).toMatchObject({ kind: "exit", code: 3, signal: null, timedOut: false });
  });

  it("exit fidelity: a real signal conclusion is reported VERBATIM (code null)", async () => {
    // The child self-signals with no handler → default-terminated by SIGTERM;
    // the seam's own timer never fired, so `timedOut` is false.
    const c = await nodeScript("process.kill(process.pid, 'SIGTERM')");
    expect(c.kind).toBe("exit");
    if (c.kind !== "exit") return;
    expect(c.code).toBeNull();
    expect(c.signal).toBe("SIGTERM");
    expect(c.timedOut).toBe(false);
  });

  it("the timedOut flag is set on a TERM-COMPLIANT timeout (child dies on our SIGTERM)", async () => {
    const c = await nodeScript("setTimeout(() => process.exit(0), 100000)", {
      timeoutMs: 150,
      graceMs: 5_000,
    });
    expect(c.kind).toBe("exit");
    if (c.kind !== "exit") return;
    expect(c.timedOut).toBe(true);
    expect(c.signal).toBe("SIGTERM");
    expect(c.code).toBeNull();
  });

  it("the grace escalation: a TERM-IGNORING child is SIGKILLed at the grace (flag set)", async () => {
    const c = await nodeScript(
      "process.on('SIGTERM', () => {}); setTimeout(() => process.exit(0), 100000)",
      { timeoutMs: 150, graceMs: 150 },
    );
    expect(c.kind).toBe("exit");
    if (c.kind !== "exit") return;
    expect(c.timedOut).toBe(true);
    expect(c.signal).toBe("SIGKILL");
    expect(c.code).toBeNull();
  });

  it("the flag is NEVER set on a natural clean exit within the timeout", async () => {
    const c = await nodeScript("process.exit(0)");
    expect(c).toMatchObject({ kind: "exit", code: 0, signal: null, timedOut: false });
  });

  it("infra lane A: a nonexistent binary fires the ENOENT error event (no exit code)", async () => {
    const c = await disciplinedSpawn({
      cmd: join(tempRoot(), "no-such-binary"),
      args: [],
      cwd: tempRoot(),
      env: { PATH: process.env.PATH ?? "" },
      timeoutMs: 30_000,
      graceMs: 10_000,
    });
    expect(c.kind).toBe("infra");
    if (c.kind !== "infra") return;
    expect(c.message).toMatch(/ENOENT|spawn/i);
  });

  it("infra lane B: a synchronous spawn-setup throw (a NUL-byte command) lands infra", async () => {
    const c = await disciplinedSpawn({
      cmd: "bad\u0000cmd",
      args: [],
      cwd: tempRoot(),
      env: { PATH: process.env.PATH ?? "" },
      timeoutMs: 30_000,
      graceMs: 10_000,
    });
    expect(c.kind).toBe("infra");
  });

  it("env FULL REPLACEMENT: the child observes ONLY the passed object (host PATH absent)", async () => {
    const c = await nodeScript(
      "process.stdout.write(JSON.stringify({ FOO: process.env.FOO ?? null, PATH: process.env.PATH ?? null, HOME: process.env.HOME ?? null }))",
      { env: { FOO: "bar" } },
    );
    expect(c.kind).toBe("exit");
    if (c.kind !== "exit") return;
    expect(JSON.parse(c.stdout)).toEqual({ FOO: "bar", PATH: null, HOME: null });
  });

  it("chunk-split multibyte decoding: a multibyte char split across two flushed writes decodes ONCE at conclusion (never per chunk), and stdoutBytes carries the EXACT raw bytes", async () => {
    // "é" is 0xC3 0xA9. The child writes the two bytes in SEPARATE flushes with
    // a delay, so the seam receives them as separate chunks. Per-chunk decoding
    // corrupts each half to U+FFFD; the one-shot decode at conclusion is exact,
    // and the raw-bytes field (GR4's hashing input) is byte-identical.
    const c = await nodeScript(
      "const b = Buffer.from([0xc3, 0xa9]);" +
        "process.stdout.write(b.subarray(0, 1));" +
        "setTimeout(() => { process.stdout.write(b.subarray(1)); process.exit(0); }, 150);",
    );
    expect(c.kind).toBe("exit");
    if (c.kind !== "exit") return;
    expect(c.code).toBe(0);
    expect(c.stdout).toBe("é");
    expect(c.stdoutBytes).toEqual(Buffer.from([0xc3, 0xa9]));
  });

  it("explicit cwd honored: the child runs in exactly the passed directory", async () => {
    const dir = tempRoot();
    const c = await nodeScript("process.stdout.write(process.cwd())", { cwd: dir });
    expect(c.kind).toBe("exit");
    if (c.kind !== "exit") return;
    expect(realpathSync(c.stdout)).toBe(dir);
  });

  // ── GR2 (packet ch9-p4a, flag F2): the OPTIONAL stdin capability ──────────
  it("stdin PRESENT: the contents arrive on the child's stdin BYTE-EXACT (written then ended at spawn)", async () => {
    const doc = 'the invocation document {"a":1}\nline twoé';
    const c = await disciplinedSpawn({
      cmd: NODE,
      args: [
        "-e",
        'let d="";process.stdin.on("data",(x)=>{d+=x});process.stdin.on("end",()=>{process.stdout.write(d);process.exit(0)})',
      ],
      cwd: tempRoot(),
      env: { PATH: process.env.PATH ?? "" },
      timeoutMs: 30_000,
      graceMs: 10_000,
      stdin: doc,
    });
    expect(c.kind).toBe("exit");
    if (c.kind !== "exit") return;
    expect(c.code).toBe(0);
    expect(c.stdout).toBe(doc);
  });

  it("stdin EPIPE negative: a fast-exiting child that never reads its (large) stdin — the kind follows the EXIT, never infra", async () => {
    // ~1 MiB overflows the pipe buffer, so the write hits a closed pipe
    // (EPIPE). GR2: the write is best-effort input delivery — its failure is
    // observable only through the child's behavior; the child's own exit
    // decides the conclusion.
    const big = "x".repeat(1_048_576);
    const c = await disciplinedSpawn({
      cmd: NODE,
      args: ["-e", "process.exit(7)"],
      cwd: tempRoot(),
      env: { PATH: process.env.PATH ?? "" },
      timeoutMs: 30_000,
      graceMs: 10_000,
      stdin: big,
    });
    expect(c).toMatchObject({ kind: "exit", code: 7, signal: null, timedOut: false });
  });

  it("stdin ABSENT: stdio[0] stays 'ignore' — a stdin-reading child sees immediate EOF (the prior behavior pin)", async () => {
    // With fd 0 ignored (/dev/null) the child's stdin ends immediately; the
    // existing suite pins every other absent-stdin behavior byte-identical.
    const c = await nodeScript(
      'let d="";process.stdin.on("data",(x)=>{d+=x});process.stdin.on("end",()=>{process.stdout.write(JSON.stringify(d));process.exit(0)})',
    );
    expect(c.kind).toBe("exit");
    if (c.kind !== "exit") return;
    expect(c.code).toBe(0);
    expect(c.stdout).toBe('""');
  });

  it("exit-not-close + bounded drain: the seam settles on the child's EXIT even while a live orphan holds the pipes", async () => {
    // The parent spawns a grandchild that INHERITS the seam's pipes and
    // outlives the parent; the parent exits 0 immediately. The seam must
    // settle on the parent's death and resolve within the drain deadline —
    // never stall on the orphan-held `close`.
    const script =
      "const { spawn } = require('node:child_process');" +
      "const g = spawn(process.execPath, ['-e', 'setTimeout(() => {}, 3000)'], { stdio: 'inherit' });" +
      "g.unref(); process.exit(0);";
    const c = await nodeScript(script);
    expect(c.kind).toBe("exit");
    if (c.kind !== "exit") return;
    expect(c.code).toBe(0);
    expect(c.timedOut).toBe(false);
  });
});

describe("validateTimerKnobs — the shared timer-knob validator (T2)", () => {
  it("accepts finite safe integers at or above their floor and derived sums below 2^31", () => {
    expect(() =>
      validateTimerKnobs(
        [
          { label: "timeoutMs", value: 1_800_000 },
          { label: "graceMs", value: 10_000 },
          { label: "backstopMarginMs", value: 5_000 },
        ],
        [{ label: "graceMs + backstopMarginMs", value: 15_000 }],
      ),
    ).not.toThrow();
  });

  it("rejects NaN, Infinity, and non-integer knob values (the 1 ms-collapse hazard, P6i)", () => {
    for (const bad of [NaN, Infinity, -Infinity, 1000.5]) {
      expect(() => validateTimerKnobs([{ label: "graceMs", value: bad }])).toThrow(TimerKnobError);
    }
  });

  it("rejects a knob below its floor", () => {
    expect(() => validateTimerKnobs([{ label: "graceMs", value: 999 }])).toThrow(TimerKnobError);
    expect(() => validateTimerKnobs([{ label: "timeoutMs", value: 0 }])).toThrow(TimerKnobError);
  });

  it("rejects a knob at or above Node's 2^31 timer bound", () => {
    expect(() => validateTimerKnobs([{ label: "timeoutMs", value: 2 ** 31 }])).toThrow(
      TimerKnobError,
    );
  });

  it("rejects a DERIVED sum at or above the 2^31 bound even when each knob is legal", () => {
    // Each knob is a legal finite integer; only the SUM overflows.
    expect(() =>
      validateTimerKnobs(
        [
          { label: "graceMs", value: 2_000_000_000 },
          { label: "backstopMarginMs", value: 2_000_000_000 },
        ],
        [{ label: "graceMs + backstopMarginMs", value: 4_000_000_000 }],
      ),
    ).toThrow(TimerKnobError);
  });
});
