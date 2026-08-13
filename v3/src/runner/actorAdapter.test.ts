import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
// Real elapsed time, deliberately — the CHK-D-TESTCLOCK boundary. Signal
// delivery and the init reap of a real process happen on the OS clock, which no
// controlled clock can advance; same rationale (and same idiom) as the `delay`
// pacing in the sibling process-grain suite tmuxChannel.test.ts.
import { setTimeout as delay } from "node:timers/promises";

import { afterAll, afterEach, describe, expect, it } from "vitest";

import type { ContextPacket, DispatchIntent, Outcome } from "../domain/index.js";
import { canonicalize, deriveActorEmitOpId } from "../emit/index.js";
import type { AttemptExecutorInput } from "../ports/delivery.js";
import type { DiagnosticEventBody } from "../ports/diagnostics.js";
import { createActorAdapter, PAIRFLOW_EMIT, PAIRFLOW_PACKET } from "./actorAdapter.js";
import { enc } from "./enc.js";
import type { ChannelConclusion, SpawnChannel, SpawnChannelInput } from "./spawnChannel.js";

/**
 * The real actor adapter families (packet ch9-p3b, H/AV/RS/CL/EM/DG) — driven
 * with REAL wrapper spawns of a deterministic stub actor (integration-grain BY
 * DESIGN) + a scripted ingress for the submit lanes. The PURE fail-closed
 * parsers (`parseResult`/`parseEmit`) and the CL1 precedence classifier
 * (`classifyConclusion`) are unit-driven — SPLIT into `actorAdapterClassify.
 * test.ts` (a NON-subprocess file, so Stryker covers those mutants).
 */

const roots: string[] = [];

// ── Stub-process accounting (the P6e orphan is a REAL process) ─────────────
// The kill-wrapper lane drives a RATIFIED production position (packet ch9-p3b,
// SD3 / probe P6e): a SIGKILLed wrapper cannot forward what it never receives,
// so the actor child is ORPHANED ALIVE and reparents to init. That orphan is
// not a fiction of the fixture — it is a live node process that outlives the
// run, and the test that deliberately creates it OWNS reaping it. Left unreaped
// it accumulates one process per run, forever.
//
// Two registries, because the two lanes carry DIFFERENT obligations and only
// one of them may ever be signalled:
//   • orphanPidFiles — the P6e lane. The stub provably cannot have exited (it
//     holds an unbounded interval), so its PID cannot have been recycled and
//     signalling it is safe. Teardown SIGKILLs and VERIFIES the reap.
//   • reapedPidFiles — the escalation lanes (sleep / ignore-term). The wrapper's
//     own grace SIGKILL must ALREADY have landed by the time execute() returns
//     (SD3's two-tier deadline). Teardown asserts that positively and NEVER
//     signals: a dead PID may have been recycled, and killing a stranger to
//     tidy up would be worse than the leak.
const orphanPidFiles: string[] = [];
const reapedPidFiles: string[] = [];

function orphanPid(root: string): string {
  const path = join(root, "stub.pid");
  orphanPidFiles.push(path);
  return path;
}
function reapedPid(root: string): string {
  const path = join(root, "stub.pid");
  reapedPidFiles.push(path);
  return path;
}

function readPid(file: string): number | null {
  if (!existsSync(file)) return null;
  const pid = Number(readFileSync(file, "utf8").trim());
  // Guard the substrate's footguns: `process.kill(0, …)` signals the entire
  // process GROUP (the runner itself), and 1 is init. Never either.
  return Number.isInteger(pid) && pid > 1 ? pid : null;
}
function alive(pid: number): boolean {
  try {
    process.kill(pid, 0); // signal 0 — an existence probe, delivers nothing
    return true;
  } catch {
    return false; // ESRCH
  }
}
/** Poll for the process to disappear, bounded — signal delivery and the init
 * reap of the resulting zombie are both asynchronous. */
async function awaitGone(pid: number, budgetMs = 2000): Promise<boolean> {
  const step = 20;
  for (let waited = 0; waited < budgetMs && alive(pid); waited += step) {
    await delay(step);
  }
  return !alive(pid);
}

/** Returns the PIDs that VIOLATED their lane's obligation — orphans we failed
 * to reap, and escalation-lane stubs the wrapper left running. */
async function settleStubs(): Promise<{ unreaped: number[]; survived: number[] }> {
  const unreaped: number[] = [];
  for (const file of orphanPidFiles.splice(0)) {
    const pid = readPid(file);
    if (pid === null) continue;
    try {
      process.kill(pid, "SIGKILL");
    } catch {
      // ESRCH — already gone, which is fine: the obligation is "not alive
      // after teardown", not "killed by us".
    }
    if (!(await awaitGone(pid))) unreaped.push(pid);
  }
  const survived: number[] = [];
  for (const file of reapedPidFiles.splice(0)) {
    const pid = readPid(file);
    if (pid === null) continue;
    if (!(await awaitGone(pid))) survived.push(pid);
  }
  return { unreaped, survived };
}

afterEach(async () => {
  const { unreaped, survived } = await settleStubs();
  for (const dir of roots.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
  // The GUARD: a stub outliving its test is the process leak returning. These
  // run AFTER the adapter has already concluded and been asserted — reaping
  // can never be the thing that makes a conclusion assertion pass.
  expect({ unreaped, survived }).toEqual({ unreaped: [], survived: [] });
});

/** Every root this file ever minted — retained past the per-test cleanup so the
 * closing sweep can still recognize a straggler by its (unique) mkdtemp path. */
const allRoots: string[] = [];

function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "v3-adapter-"));
  roots.push(root);
  allRoots.push(root);
  return root;
}

// ── The closing sweep (the catch-all net) ──────────────────────────────────
// The per-test reaping above is OPT-IN: it only covers lanes wired to a PID
// registry, so a future test introducing a new long-lived stub mode would leak
// again, silently — precisely the class of bug this net exists to stop. This
// asks the OS directly instead: ANY surviving process whose argv still names one
// of this file's mkdtemp roots is a straggler, whatever spawned it. One `ps`
// invocation for the whole file, at the end. Matching on the root path (not a
// bare PID) also makes the kill reuse-safe — the process is identified by what
// it IS, not by a number that may since have been recycled.
function processesUnderRoots(): { pid: number; args: string }[] {
  let table: string;
  try {
    table = execFileSync("ps", ["-eo", "pid=,args="], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  } catch {
    return []; // no `ps` — the net simply does not apply on this host
  }
  const found: { pid: number; args: string }[] = [];
  for (const line of table.split("\n")) {
    if (!allRoots.some((root) => line.includes(root))) continue;
    const match = /^\s*(\d+)\s+(.*)$/.exec(line);
    if (match?.[1] === undefined || match[2] === undefined) continue;
    const pid = Number(match[1]);
    if (pid > 1 && pid !== process.pid) found.push({ pid, args: match[2] });
  }
  return found;
}

afterAll(async () => {
  const stragglers = processesUnderRoots();
  for (const { pid } of stragglers) {
    try {
      process.kill(pid, "SIGKILL");
    } catch {
      // ESRCH — it exited between the scan and the signal
    }
  }
  if (stragglers.length > 0) await delay(200);
  // Fail LOUD with the argv: a straggler here means some lane spawns a process
  // that outlives its test and is not accounted for above.
  expect(stragglers.map((s) => s.args)).toEqual([]);
});

// The deterministic stub actor — CONFIGURATION bound through the argv mapping
// (never an injected seam): a node script reading PAIRFLOW_PACKET/PAIRFLOW_EMIT.
const STUB = [
  'const fs = require("node:fs");',
  "const mode = process.argv[2];",
  "const a3 = process.argv[3];",
  "const a4 = process.argv[4];",
  // AV2 (finding 7): reference the EXPORTED env-name constants — never a raw
  // string literal — so an in-repo rename stays a one-line change.
  `const emitPath = process.env.${PAIRFLOW_EMIT};`,
  // Publish this process's PID so the suite can hold the long-lived modes to
  // account (see the stub-process accounting above). argv is the ONLY channel
  // available: the child env is asserted COMPLETE key-and-value by AV, so an
  // extra env var would break that pin.
  "const publishPid = (p) => { if (p !== undefined) fs.writeFileSync(p, String(process.pid)); };",
  'if (mode === "raw") {',
  '  if (a3 !== "__none__") fs.writeFileSync(emitPath, a3);',
  "  process.exit(a4 === undefined ? 0 : Number(a4));",
  '} else if (mode === "emit") {',
  '  fs.writeFileSync(emitPath, JSON.stringify({ type: "PASS", payload: { note: a3 || "ok" } }));',
  "  process.exit(0);",
  '} else if (mode === "nonzero") {',
  "  process.exit(4);",
  '} else if (mode === "sleep") {',
  "  publishPid(a3);",
  "  setInterval(() => {}, 1000);",
  '} else if (mode === "ignore-term") {',
  "  publishPid(a3);",
  '  process.on("SIGTERM", () => {});',
  "  setInterval(() => {}, 1000);",
  '} else if (mode === "self-term") {',
  '  process.kill(process.pid, "SIGTERM");',
  '} else if (mode === "kill-wrapper") {',
  // The PID is published BEFORE the kill — the write completes first, so the
  // orphan this lane deliberately strands is reapable on every path the
  // assertion can take. The foreign kill below is untouched and still genuine.
  "  publishPid(a3);",
  '  process.kill(process.ppid, "SIGKILL");',
  "  setInterval(() => {}, 1000);",
  '} else if (mode === "mkdir-emit") {',
  "  fs.mkdirSync(emitPath);",
  "  process.exit(0);",
  '} else if (mode === "dump-env") {',
  // Dump BOTH the full env and the full argv (finding 3/6): the exact env
  // key/value map AND the exact actor argv order are asserted from this.
  "  fs.writeFileSync(a3, JSON.stringify({ env: process.env, argv: process.argv }));",
  '  fs.writeFileSync(emitPath, JSON.stringify({ type: "PASS", payload: { note: "env" } }));',
  "  process.exit(0);",
  '} else if (mode === "dump-packet") {',
  `  fs.writeFileSync(a3, fs.readFileSync(process.env.${PAIRFLOW_PACKET}, "utf8"));`,
  '  fs.writeFileSync(emitPath, JSON.stringify({ type: "PASS", payload: { note: "pkt" } }));',
  "  process.exit(0);",
  "} else {",
  "  process.exit(0);",
  "}",
  "",
].join("\n");

function writeStub(root: string): string {
  const path = join(root, "stub-actor.js");
  writeFileSync(path, STUB);
  return path;
}

type Mapped = { readonly cmd: string; readonly args: readonly string[] };
function mapTo(stubPath: string, ...stubArgs: string[]): () => Mapped {
  return () => ({ cmd: process.execPath, args: [stubPath, ...stubArgs] });
}

// ── Scripted ingress ──────────────────────────────────────────────────────
interface FakeIngress {
  submit(raw: unknown): Promise<Outcome>;
  readonly calls: unknown[];
}
function ingressReturning(outcome: Outcome): FakeIngress {
  const calls: unknown[] = [];
  return {
    calls,
    submit(raw: unknown): Promise<Outcome> {
      calls.push(raw);
      return Promise.resolve(outcome);
    },
  };
}
function ingressRejecting(message = "kernel integrity throw"): FakeIngress {
  const calls: unknown[] = [];
  return {
    calls,
    submit(raw: unknown): Promise<Outcome> {
      calls.push(raw);
      return Promise.reject(new Error(message));
    },
  };
}
function ingressThrowingSync(message = "sync kernel throw"): FakeIngress {
  const calls: unknown[] = [];
  return {
    calls,
    submit(raw: unknown): Promise<Outcome> {
      calls.push(raw);
      throw new Error(message);
    },
  };
}
const neverIngress: FakeIngress = {
  calls: [],
  submit() {
    throw new Error("ingress.submit must not be called on this lane");
  },
};

function recordingDiag(): { sink: { emit(b: DiagnosticEventBody): void }; events: DiagnosticEventBody[] } {
  const events: DiagnosticEventBody[] = [];
  return { events, sink: { emit: (b) => events.push(b) } };
}

// ── Intent / adapter builders ───────────────────────────────────────────────
const INSTANCE = "inst-1";
const VERSION = 2;
const CPID = `${INSTANCE}@v${String(VERSION)}`;
const ATTEMPT = "att-1";

function makeIntent(overrides: Partial<ContextPacket> = {}): DispatchIntent {
  const packet: ContextPacket = {
    instanceId: INSTANCE,
    expectedVersion: VERSION,
    task: "build the thing",
    role: "implementer",
    instruction: "do the work",
    availableOps: ["PASS"],
    effectiveAgentConfig: { profile: "stub" },
    contextBlocks: [],
    runtimeContext: "none",
    ...overrides,
  };
  return { actor: "codex", packet };
}

interface RunOpts {
  readonly mapper: () => Mapped | null;
  readonly ingress?: FakeIngress;
  readonly diag?: { emit(b: DiagnosticEventBody): void };
  readonly channel?: SpawnChannel;
  readonly defaultCwd: string;
  readonly cwd?: string;
  readonly attemptId?: string;
  readonly timeoutMs?: number;
  readonly graceMs?: number;
  readonly backstopMarginMs?: number;
  readonly envAllowlist?: Record<string, string>;
  readonly intent?: DispatchIntent;
}

function run(opts: RunOpts): Promise<Outcome | { kind: string; class?: string }> {
  const adapter = createActorAdapter(
    {
      ingress: opts.ingress ?? neverIngress,
      argvMapper: opts.mapper,
      diag: opts.diag ?? recordingDiag().sink,
      ...(opts.channel !== undefined ? { channel: opts.channel } : {}),
    },
    {
      defaultCwd: opts.defaultCwd,
      ...(opts.envAllowlist !== undefined ? { envAllowlist: opts.envAllowlist } : {}),
      ...(opts.timeoutMs !== undefined ? { timeoutMs: opts.timeoutMs } : {}),
      ...(opts.graceMs !== undefined ? { graceMs: opts.graceMs } : {}),
      ...(opts.backstopMarginMs !== undefined ? { backstopMarginMs: opts.backstopMarginMs } : {}),
    },
  );
  const input: AttemptExecutorInput = {
    intent: opts.intent ?? makeIntent(),
    attemptId: opts.attemptId ?? ATTEMPT,
    sessionName: "sess:inst-1:att-1",
    ...(opts.cwd !== undefined ? { cwd: opts.cwd } : {}),
  };
  return adapter.execute(input);
}

function noneCwd(defaultCwd: string, instanceId = INSTANCE, version = VERSION): string {
  return join(defaultCwd, `${enc(instanceId)}--${enc(`${instanceId}@v${String(version)}`)}`);
}
function attemptDirOf(cwd: string, attemptId = ATTEMPT): string {
  return join(cwd, ".pairflow", enc(attemptId));
}

// ═══════════════════════════════════════════════════════════════════════════
describe("actorAdapter — AV (argv mapping)", () => {
  it("a resolving mapper spawns exactly the mapped argv (the stub runs and its emit is submitted)", async () => {
    const root = tempRoot();
    const stub = writeStub(root);
    const ingress = ingressReturning({ kind: "committed", version: 3, intent: null });
    const result = await run({ mapper: mapTo(stub, "emit", "hi"), ingress, defaultCwd: root });
    expect(result).toEqual({ kind: "submitted", outcome: { kind: "committed", version: 3, intent: null } });
    expect(ingress.calls).toHaveLength(1);
  });

  it("a null-returning mapper → spawn_infra (no spawn, no submit)", async () => {
    const root = tempRoot();
    const result = await run({ mapper: () => null, ingress: neverIngress, defaultCwd: root });
    expect(result).toEqual({ kind: "infra_failure", class: "spawn_infra" });
  });

  it("a THROWING mapper → spawn_infra", async () => {
    const root = tempRoot();
    const result = await run({
      mapper: () => {
        throw new Error("no template");
      },
      defaultCwd: root,
    });
    expect(result).toEqual({ kind: "infra_failure", class: "spawn_infra" });
  });

  // The ONLY substrate keys the OS injects regardless of the passed env object
  // (macOS CoreFoundation) — excluded by EXACT name, never a prefix wildcard,
  // so any OTHER unexpected key fails the complete-map compare (finding 6).
  const OS_SUBSTRATE_KEYS: readonly string[] = ["__CF_USER_TEXT_ENCODING"];
  function actorDump(dumpPath: string): { env: Record<string, string>; argv: string[] } {
    return JSON.parse(readFileSync(dumpPath, "utf8")) as { env: Record<string, string>; argv: string[] };
  }
  /** The observed env minus ONLY the exact OS substrate keys — the COMPLETE
   * remaining key/value map the adapter is responsible for. */
  function adapterEnv(env: Record<string, string>): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(env)) {
      if (!OS_SUBSTRATE_KEYS.includes(k)) out[k] = v;
    }
    return out;
  }

  it("PAIRFLOW_PACKET/PAIRFLOW_EMIT + the allowlist are the COMPLETE child env (key AND value), and the actor argv is the mapped argv verbatim — both cwd lanes", async () => {
    const PATH = process.env.PATH ?? "";
    // ── NONE lane ────────────────────────────────────────────────────────────
    const rootN = tempRoot();
    const stubN = writeStub(rootN);
    const dumpN = join(rootN, "env-none.json");
    await run({
      mapper: mapTo(stubN, "dump-env", dumpN),
      ingress: ingressReturning({ kind: "committed", version: 3, intent: null }),
      defaultCwd: rootN,
      envAllowlist: { PATH },
    });
    const cwdN = noneCwd(rootN);
    const dirN = attemptDirOf(cwdN);
    // Finding 3 (H4): the REALIZED filesystem paths exist (not just helper-derived).
    expect(existsSync(dirN)).toBe(true);
    expect(existsSync(join(dirN, "packet.json"))).toBe(true);
    const dumpedN = actorDump(dumpN);
    // Finding 6: the COMPLETE remaining key/value map — exact, nothing more.
    expect(adapterEnv(dumpedN.env)).toEqual({
      PATH,
      [PAIRFLOW_PACKET]: join(dirN, "packet.json"),
      [PAIRFLOW_EMIT]: join(dirN, "emit.json"),
    });
    // Finding 3: the actor argv is EXACTLY the mapped argv, in order.
    expect(dumpedN.argv).toEqual([process.execPath, stubN, "dump-env", dumpN]);

    // ── CONTEXT lane (explicit cwd) ──────────────────────────────────────────
    const rootC = tempRoot();
    const stubC = writeStub(rootC);
    const ctxCwd = tempRoot();
    const dumpC = join(rootC, "env-ctx.json");
    await run({
      mapper: mapTo(stubC, "dump-env", dumpC),
      ingress: ingressReturning({ kind: "committed", version: 3, intent: null }),
      defaultCwd: rootC,
      cwd: ctxCwd,
      envAllowlist: { PATH },
    });
    const dirC = attemptDirOf(ctxCwd);
    expect(existsSync(join(dirC, "packet.json"))).toBe(true);
    const dumpedC = actorDump(dumpC);
    expect(adapterEnv(dumpedC.env)).toEqual({
      PATH,
      [PAIRFLOW_PACKET]: join(dirC, "packet.json"),
      [PAIRFLOW_EMIT]: join(dirC, "emit.json"),
    });
    expect(dumpedC.argv).toEqual([process.execPath, stubC, "dump-env", dumpC]);
  });

  it("a wider allowlist flows through COMPLETE (key AND value) — a custom var reaches the actor, a forbidden host var stays absent", async () => {
    const root = tempRoot();
    const stub = writeStub(root);
    const dump = join(root, "env-wide.json");
    const PATH = process.env.PATH ?? "";
    await run({
      mapper: mapTo(stub, "dump-env", dump),
      ingress: ingressReturning({ kind: "committed", version: 3, intent: null }),
      defaultCwd: root,
      envAllowlist: { PATH, HOME: "/composition/home", API_TOKEN: "sk-xyz" },
    });
    const dir = attemptDirOf(noneCwd(root));
    const dumped = actorDump(dump);
    expect(adapterEnv(dumped.env)).toEqual({
      PATH,
      HOME: "/composition/home", // the composition's value, NOT the host's
      API_TOKEN: "sk-xyz",
      [PAIRFLOW_PACKET]: join(dir, "packet.json"),
      [PAIRFLOW_EMIT]: join(dir, "emit.json"),
    });
  });
});

describe("actorAdapter — H (handoff)", () => {
  it("packet.json is the emit-lib CANONICAL serialization of the dispatched packet (byte-asserted)", async () => {
    const root = tempRoot();
    const stub = writeStub(root);
    const intent = makeIntent();
    await run({
      mapper: mapTo(stub, "emit", "ok"),
      ingress: ingressReturning({ kind: "committed", version: 3, intent: null }),
      defaultCwd: root,
      intent,
    });
    const dir = attemptDirOf(noneCwd(root));
    const written = readFileSync(join(dir, "packet.json"), "utf8");
    expect(written).toBe(canonicalize(intent.packet));
  });

  it("ch13-p1b: the rendered context blocks reach the actor's packet.json INTACT (byte-asserted)", async () => {
    // The far end of guarantee 3: the operator journey runs no actor, so
    // the byte grain lands here — where the artifact the actor actually
    // reads is written.
    const blocks = [
      {
        id: "emit-envelope",
        body: 'first line\n\n  { "type": "PASS" }\n\nlast line',
        provenance: {
          sources: [
            { source: "role_config" as const },
            { source: "gate_binding" as const, stepId: "implement", eventType: "PASS" },
          ],
        },
      },
    ];
    const root = tempRoot();
    const stub = writeStub(root);
    const intent = makeIntent({ contextBlocks: blocks });
    await run({
      mapper: mapTo(stub, "emit", "ok"),
      ingress: ingressReturning({ kind: "committed", version: 3, intent: null }),
      defaultCwd: root,
      intent,
    });
    const written = readFileSync(join(attemptDirOf(noneCwd(root)), "packet.json"), "utf8");
    expect(written).toBe(canonicalize(intent.packet));
    // Read back from the BYTES, not from the object that produced them:
    // multi-line bodies, literal braces and the provenance list all
    // survive the canonical encoding.
    expect((JSON.parse(written) as ContextPacket).contextBlocks).toEqual(blocks);
  });

  it("the attempt directory is keyed by enc(attemptId): two attempts of one errand → DISJOINT dirs", async () => {
    const root = tempRoot();
    const stub = writeStub(root);
    const ingress = ingressReturning({ kind: "committed", version: 3, intent: null });
    await run({ mapper: mapTo(stub, "dump-packet", join(root, "p1.json")), ingress, defaultCwd: root, attemptId: "att-1" });
    await run({ mapper: mapTo(stub, "dump-packet", join(root, "p2.json")), ingress, defaultCwd: root, attemptId: "att-2" });
    const cwd = noneCwd(root);
    expect(attemptDirOf(cwd, "att-1")).not.toBe(attemptDirOf(cwd, "att-2"));
    // Both dirs materialized their own packet.json (read back by the stub).
    expect(readFileSync(join(root, "p1.json"), "utf8")).toBe(canonicalize(makeIntent().packet));
    expect(readFileSync(join(root, "p2.json"), "utf8")).toBe(canonicalize(makeIntent().packet));
  });

  it("a pre-spawn fs fault (mkdir under a FILE) → spawn_infra (a full-disk-class fault is not a loop crash)", async () => {
    const root = tempRoot();
    const stub = writeStub(root);
    // A defaultCwd whose parent is a FILE — mkdirSync(recursive) throws ENOTDIR.
    const filePath = join(root, "a-file");
    writeFileSync(filePath, "x");
    const badCwd = join(filePath, "under");
    const result = await run({ mapper: mapTo(stub, "emit", "ok"), defaultCwd: root, cwd: badCwd });
    expect(result).toEqual({ kind: "infra_failure", class: "spawn_infra" });
  });
});

describe("actorAdapter — CL (conclusion classification, real processes)", () => {
  it("actor exit 0 + valid emit → submitted (outcome passthrough verbatim)", async () => {
    const root = tempRoot();
    const stub = writeStub(root);
    const ingress = ingressReturning({ kind: "duplicate" });
    const result = await run({ mapper: mapTo(stub, "emit", "x"), ingress, defaultCwd: root });
    expect(result).toEqual({ kind: "submitted", outcome: { kind: "duplicate" } });
  });

  it("actor exit 0 + no emit → no_output", async () => {
    const root = tempRoot();
    const stub = writeStub(root);
    const result = await run({ mapper: mapTo(stub, "raw", "__none__"), ingress: neverIngress, defaultCwd: root });
    expect(result).toEqual({ kind: "no_output" });
  });

  it("actor nonzero exit → nonzero_exit (never a kill record)", async () => {
    const root = tempRoot();
    const stub = writeStub(root);
    const result = await run({ mapper: mapTo(stub, "nonzero"), ingress: neverIngress, defaultCwd: root });
    expect(result).toEqual({ kind: "infra_failure", class: "nonzero_exit" });
  });

  it("a mapped-but-missing actor binary → wrapper exits 0 with NO result → spawn_infra (RS3 head)", async () => {
    const root = tempRoot();
    const result = await run({
      mapper: () => ({ cmd: join(root, "no-such-actor"), args: [] }),
      ingress: neverIngress,
      defaultCwd: root,
    });
    expect(result).toEqual({ kind: "infra_failure", class: "spawn_infra" });
  });

  it("actor foreign-killed by signal (no fired timer) → foreign_kill", async () => {
    const root = tempRoot();
    const stub = writeStub(root);
    const result = await run({ mapper: mapTo(stub, "self-term"), ingress: neverIngress, defaultCwd: root });
    expect(result).toEqual({ kind: "infra_failure", class: "foreign_kill" });
  });

  it("a foreign KILL of the WRAPPER (no result written) → foreign_kill via CL1 row 2", async () => {
    const root = tempRoot();
    const stub = writeStub(root);
    const result = await run({ mapper: mapTo(stub, "kill-wrapper", orphanPid(root)), ingress: neverIngress, defaultCwd: root });
    expect(result).toEqual({ kind: "infra_failure", class: "foreign_kill" });
  });

  it("the NORMAL own-timeout path (our TERM, TERM-compliant actor, forwarded kill recorded) → own_timeout", async () => {
    const root = tempRoot();
    const stub = writeStub(root);
    const result = await run({
      mapper: mapTo(stub, "sleep", reapedPid(root)),
      ingress: neverIngress,
      defaultCwd: root,
      timeoutMs: 1000,
      graceMs: 1000,
      backstopMarginMs: 1000,
    });
    expect(result).toEqual({ kind: "infra_failure", class: "own_timeout" });
  }, 15_000);

  it("own-timeout with a TERM-IGNORING actor (the wrapper's grace SIGKILL observed) → own_timeout", async () => {
    const root = tempRoot();
    const stub = writeStub(root);
    const result = await run({
      mapper: mapTo(stub, "ignore-term", reapedPid(root)),
      ingress: neverIngress,
      defaultCwd: root,
      timeoutMs: 1000,
      graceMs: 1000,
      backstopMarginMs: 1000,
    });
    expect(result).toEqual({ kind: "infra_failure", class: "own_timeout" });
  }, 15_000);
});

describe("actorAdapter — EM (emit capture + submission)", () => {
  const shapes: readonly { name: string; raw: string }[] = [
    { name: "invalid JSON", raw: "{not json" },
    { name: "non-object (array)", raw: "[1,2]" },
    { name: "unknown key", raw: JSON.stringify({ type: "PASS", payload: {}, extra: 1 }) },
    { name: "missing/empty type", raw: JSON.stringify({ type: "", payload: {} }) },
    { name: "missing payload", raw: JSON.stringify({ type: "PASS" }) },
    { name: "non-canonicalizable payload (-0)", raw: '{"type":"PASS","payload":-0}' },
  ];
  it.each(shapes)("EM1 rejection shape → no_output: $name", async ({ raw }) => {
    const root = tempRoot();
    const stub = writeStub(root);
    const result = await run({ mapper: mapTo(stub, "raw", raw), ingress: neverIngress, defaultCwd: root });
    expect(result).toEqual({ kind: "no_output" });
  });

  it("an unreadable emit (a DIRECTORY at emit.json) → no_output", async () => {
    const root = tempRoot();
    const stub = writeStub(root);
    const result = await run({ mapper: mapTo(stub, "mkdir-emit"), ingress: neverIngress, defaultCwd: root });
    expect(result).toEqual({ kind: "no_output" });
  });

  it("EM2: the envelope is composed FIELD-BY-FIELD with the derived opId", async () => {
    const root = tempRoot();
    const stub = writeStub(root);
    const ingress = ingressReturning({ kind: "committed", version: 3, intent: null });
    await run({ mapper: mapTo(stub, "emit", "ok"), ingress, defaultCwd: root });
    const expectedOpId = deriveActorEmitOpId({
      instanceId: INSTANCE,
      contextPacketId: CPID,
      opType: "PASS",
      payload: { note: "ok" },
    }).opId;
    expect(ingress.calls[0]).toEqual({
      instanceId: INSTANCE,
      opId: expectedOpId,
      type: "PASS",
      actorId: "codex",
      expectedVersion: VERSION,
      expectedRole: "implementer",
      payload: { note: "ok" },
    });
  });

  it("op-id STABILITY: two deliveries of one dispatch derive the SAME opId (a different attempt does not change it)", async () => {
    const root = tempRoot();
    const stub = writeStub(root);
    const ingress = ingressReturning({ kind: "committed", version: 3, intent: null });
    await run({ mapper: mapTo(stub, "emit", "ok"), ingress, defaultCwd: root, attemptId: "att-1" });
    await run({ mapper: mapTo(stub, "emit", "ok"), ingress, defaultCwd: root, attemptId: "att-2" });
    const opIds = (ingress.calls as { opId: string }[]).map((c) => c.opId);
    expect(opIds[0]).toBe(opIds[1]);
  });

  it("the outcome passthrough is VERBATIM for every outcome kind", async () => {
    const outcomes: Outcome[] = [
      { kind: "committed", version: 3, intent: null },
      { kind: "duplicate" },
      { kind: "stale", currentVersion: 9 },
      { kind: "rejected", reason: "not_authorized" },
    ];
    for (const outcome of outcomes) {
      const root = tempRoot();
      const stub = writeStub(root);
      const result = await run({ mapper: mapTo(stub, "emit", "ok"), ingress: ingressReturning(outcome), defaultCwd: root });
      expect(result).toEqual({ kind: "submitted", outcome });
    }
  });

  it("EM3: a REJECTING ingress propagates out of execute() (never converted to no_output)", async () => {
    const root = tempRoot();
    const stub = writeStub(root);
    await expect(run({ mapper: mapTo(stub, "emit", "ok"), ingress: ingressRejecting(), defaultCwd: root })).rejects.toThrow(
      /kernel integrity/,
    );
  });

  it("EM3: a SYNCHRONOUSLY-throwing ingress also propagates", async () => {
    const root = tempRoot();
    const stub = writeStub(root);
    await expect(run({ mapper: mapTo(stub, "emit", "ok"), ingress: ingressThrowingSync(), defaultCwd: root })).rejects.toThrow(
      /sync kernel throw/,
    );
  });
});

describe("actorAdapter — DG (observability)", () => {
  it("exactly ONE spawn_outcome event per concluded execute, its token = the returned member's class", async () => {
    const root = tempRoot();
    const stub = writeStub(root);
    const diag = recordingDiag();
    await run({
      mapper: mapTo(stub, "emit", "ok"),
      ingress: ingressReturning({ kind: "committed", version: 3, intent: null }),
      defaultCwd: root,
      diag: diag.sink,
    });
    expect(diag.events).toHaveLength(1);
    expect(diag.events[0]).toMatchObject({
      source: "runner",
      kind: "spawn_outcome",
      instanceId: INSTANCE,
      contextPacketId: CPID,
      attemptId: ATTEMPT,
      spawnOutcome: "submitted",
    });
  });

  it("the token tracks the member on the failure lanes (nonzero_exit, no_output, spawn_infra)", async () => {
    const cases: readonly { args: string[]; token: string }[] = [
      { args: ["nonzero"], token: "nonzero_exit" },
      { args: ["raw", "__none__"], token: "no_output" },
    ];
    for (const c of cases) {
      const root = tempRoot();
      const stub = writeStub(root);
      const diag = recordingDiag();
      await run({ mapper: mapTo(stub, ...c.args), ingress: neverIngress, defaultCwd: root, diag: diag.sink });
      expect(diag.events.map((e) => e.spawnOutcome)).toEqual([c.token]);
    }
    // spawn_infra via the null mapper (no spawn).
    const root = tempRoot();
    const diag = recordingDiag();
    await run({ mapper: () => null, ingress: neverIngress, defaultCwd: root, diag: diag.sink });
    expect(diag.events.map((e) => e.spawnOutcome)).toEqual(["spawn_infra"]);
  });

  it("the EM3 rejecting path STILL yields exactly one spawn_outcome event (spawn_infra) before propagation", async () => {
    const root = tempRoot();
    const stub = writeStub(root);
    const diag = recordingDiag();
    await expect(
      run({ mapper: mapTo(stub, "emit", "ok"), ingress: ingressRejecting(), defaultCwd: root, diag: diag.sink }),
    ).rejects.toThrow();
    expect(diag.events).toHaveLength(1);
    expect(diag.events[0]).toMatchObject({ kind: "spawn_outcome", spawnOutcome: "spawn_infra" });
  });

  it("a SWALLOWING sink (fail-open per the port) changes no conclusion AND no attempt-directory artifact (DG1's exact boundary)", async () => {
    const root = tempRoot();
    const stub = writeStub(root);
    // A VALID fail-open sink: it internally hits a fault and SWALLOWS it (the
    // port owns fail-open; the adapter calls emit BARE — REV-DIAG-FAILOPEN).
    const swallowingSink = {
      emit() {
        try {
          throw new Error("internal sink fault");
        } catch {
          // swallowed — the port's contract
        }
      },
    };
    const result = await run({
      mapper: mapTo(stub, "emit", "ok"),
      ingress: ingressReturning({ kind: "committed", version: 3, intent: null }),
      defaultCwd: root,
      diag: swallowingSink,
    });
    expect(result).toEqual({ kind: "submitted", outcome: { kind: "committed", version: 3, intent: null } });
    // DG1: the sink writes NOTHING into the attempt directory — it holds EXACTLY
    // the three exchange files (the diag store's own file is the sink's normal
    // write surface, never an attempt-directory artifact).
    const dir = attemptDirOf(noneCwd(root));
    expect(readdirSync(dir).sort()).toEqual(["emit.json", "packet.json", "result.json"]);
  });

  it("spawnDetail carries a captured-stderr tail bounded by the 2000-code-unit cap", async () => {
    const root = tempRoot();
    // An actor that writes >2000 chars to stderr then exits nonzero.
    const noisy = join(root, "noisy.js");
    writeFileSync(noisy, 'process.stderr.write("E".repeat(5000)); process.exit(4);');
    const diag = recordingDiag();
    await run({
      mapper: () => ({ cmd: process.execPath, args: [noisy] }),
      ingress: neverIngress,
      defaultCwd: root,
      diag: diag.sink,
    });
    const detail = diag.events[0]?.spawnDetail;
    expect(detail).toBeDefined();
    expect((detail as string).length).toBe(2000);
  });
});

describe("actorAdapter — construction knob validation (the shared validator, T2)", () => {
  it("throws at construction on an invalid knob or an overflowing derived sum", () => {
    const root = tempRoot();
    const deps = { ingress: neverIngress, argvMapper: () => null, diag: recordingDiag().sink };
    expect(() => createActorAdapter(deps, { defaultCwd: root, timeoutMs: 500 })).toThrow();
    expect(() => createActorAdapter(deps, { defaultCwd: root, graceMs: Number.NaN })).toThrow();
    expect(() =>
      createActorAdapter(deps, { defaultCwd: root, graceMs: 2_000_000_000, backstopMarginMs: 2_000_000_000 }),
    ).toThrow();
    expect(() => createActorAdapter(deps, { defaultCwd: root })).not.toThrow();
  });

  it("REJECTS a non-absolute defaultCwd at construction (finding 1 — the AV2 relative-path breach)", () => {
    const deps = { ingress: neverIngress, argvMapper: () => null, diag: recordingDiag().sink };
    // A relative defaultCwd yields relative PAIRFLOW_* paths the child resolves
    // from its OWN cwd — a config-integrity fault, fail-closed LOUD.
    expect(() => createActorAdapter(deps, { defaultCwd: "relative/scratch" })).toThrow(/absolute/i);
    expect(() => createActorAdapter(deps, { defaultCwd: "./also-relative" })).toThrow(/absolute/i);
    expect(() => createActorAdapter(deps, { defaultCwd: "" })).toThrow(/absolute/i);
    // An absolute path passes (the tempRoot lanes above already exercise this).
    expect(() => createActorAdapter(deps, { defaultCwd: tempRoot() })).not.toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// packet ch9-p4a (TX1/TX7/DG3): the injected SpawnChannel — the adapter's
// spawn/observe stage behind the seam. A SCRIPTED channel drives the
// session-grain conclusions and the name_collision/infra lanes with NO real
// spawn; the tmux end-to-end lanes live in tmuxChannel.test.ts, and the
// entire suite ABOVE pins the direct default byte-unchanged.
// ═══════════════════════════════════════════════════════════════════════════
function scriptedChannel(conclusion: ChannelConclusion): {
  channel: SpawnChannel;
  inputs: SpawnChannelInput[];
} {
  const inputs: SpawnChannelInput[] = [];
  return {
    inputs,
    channel: {
      launch(input: SpawnChannelInput): Promise<ChannelConclusion> {
        inputs.push(input);
        return Promise.resolve(conclusion);
      },
    },
  };
}

/** Plant a file inside the (deterministically derived) attempt dir BEFORE the
 * run — the adapter's recursive mkdir tolerates the pre-created chain. */
function plantAttemptFile(root: string, name: string, contents: string): void {
  const dir = attemptDirOf(noneCwd(root));
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, name), contents);
}

describe("actorAdapter — TX1/TX7 (the injected channel; session-grain derivation)", () => {
  it("the channel receives the COMPLETE wrapper argv, the composed child env, the ledger sessionName, and the adapter's timer knobs", async () => {
    const scripted = scriptedChannel({ kind: "session-concluded", timedOut: false });
    const root = tempRoot();
    const stub = writeStub(root);
    await run({ mapper: mapTo(stub, "emit", "x"), channel: scripted.channel, defaultCwd: root });
    expect(scripted.inputs).toHaveLength(1);
    const input = scripted.inputs[0];
    if (input === undefined) return;
    const dir = attemptDirOf(noneCwd(root));
    // The wrapper argv shape (AV/RS1): [node, wrapper, graceMs, resultPath, attemptId, cmd, args…].
    expect(input.wrapperArgv[0]).toBe(process.execPath);
    expect(input.wrapperArgv[1]).toMatch(/attemptWrapper\.mjs$/);
    expect(input.wrapperArgv[2]).toBe("10000");
    expect(input.wrapperArgv[3]).toBe(join(dir, "result.json"));
    expect(input.wrapperArgv[4]).toBe(ATTEMPT);
    expect(input.wrapperArgv.slice(5)).toEqual([process.execPath, stub, "emit", "x"]);
    // The adapter-composed env rides UNCHANGED (allowlist + the PAIRFLOW pair).
    expect(input.env[PAIRFLOW_PACKET]).toBe(join(dir, "packet.json"));
    expect(input.env[PAIRFLOW_EMIT]).toBe(join(dir, "emit.json"));
    // The ledger-recorded session name (C23's resolution source) + the knobs.
    expect(input.sessionName).toBe("sess:inst-1:att-1");
    expect(input).toMatchObject({ timeoutMs: 1_800_000, graceMs: 10_000, backstopMarginMs: 5_000 });
  });

  it("name_collision from the channel → the K1 member, reported with NO result-file read (pre-side-effect) and the DG3 token", async () => {
    const scripted = scriptedChannel({ kind: "name_collision" });
    const root = tempRoot();
    const stub = writeStub(root);
    const diag = recordingDiag();
    const result = await run({
      mapper: mapTo(stub, "emit", "x"),
      channel: scripted.channel,
      defaultCwd: root,
      diag: diag.sink,
    });
    expect(result).toEqual({ kind: "name_collision" });
    // DG3: exactly one spawn_outcome event, the NEW token, no spawnDetail.
    expect(diag.events).toHaveLength(1);
    expect(diag.events[0]).toMatchObject({ kind: "spawn_outcome", spawnOutcome: "name_collision" });
    expect(diag.events[0]).not.toHaveProperty("spawnDetail");
  });

  it("channel infra → spawn_infra (fail-closed, budget-bounded)", async () => {
    const scripted = scriptedChannel({ kind: "infra", message: "tmux client fault" });
    const root = tempRoot();
    const stub = writeStub(root);
    const result = await run({ mapper: mapTo(stub, "emit", "x"), channel: scripted.channel, defaultCwd: root });
    expect(result).toEqual({ kind: "infra_failure", class: "spawn_infra" });
  });

  it("session-concluded + a WRITTEN exit-0 result + emit → the recorded outcome honored (the actor's emit submitted)", async () => {
    const scripted = scriptedChannel({ kind: "session-concluded", timedOut: false });
    const root = tempRoot();
    const stub = writeStub(root);
    plantAttemptFile(root, "result.json", JSON.stringify({ attemptId: ATTEMPT, exitCode: 0, signal: null, termForwarded: false }));
    plantAttemptFile(root, "emit.json", JSON.stringify({ type: "PASS", payload: { note: "tmux" } }));
    const ingress = ingressReturning({ kind: "committed", version: 3, intent: null });
    const result = await run({ mapper: mapTo(stub, "emit", "x"), channel: scripted.channel, ingress, defaultCwd: root });
    expect(result).toEqual({ kind: "submitted", outcome: { kind: "committed", version: 3, intent: null } });
  });

  it("the completed-but-stuck member: session-concluded FLAGGED with a WRITTEN exit-0 record → the recorded outcome honored, NEVER own_timeout (TX7: the last resort never bypasses the precedence)", async () => {
    const scripted = scriptedChannel({ kind: "session-concluded", timedOut: true });
    const root = tempRoot();
    const stub = writeStub(root);
    plantAttemptFile(root, "result.json", JSON.stringify({ attemptId: ATTEMPT, exitCode: 0, signal: null, termForwarded: false }));
    plantAttemptFile(root, "emit.json", JSON.stringify({ type: "PASS", payload: { note: "done" } }));
    const ingress = ingressReturning({ kind: "duplicate" });
    const result = await run({ mapper: mapTo(stub, "emit", "x"), channel: scripted.channel, ingress, defaultCwd: root });
    expect(result).toEqual({ kind: "submitted", outcome: { kind: "duplicate" } });
  });

  it("session-concluded FLAGGED with NO result → own_timeout; UNFLAGGED with no result → spawn_infra (the flag branches of the dead-session lane)", async () => {
    for (const [timedOut, cls] of [
      [true, "own_timeout"],
      [false, "spawn_infra"],
    ] as const) {
      const scripted = scriptedChannel({ kind: "session-concluded", timedOut });
      const root = tempRoot();
      const stub = writeStub(root);
      const result = await run({ mapper: mapTo(stub, "emit", "x"), channel: scripted.channel, defaultCwd: root });
      expect(result).toEqual({ kind: "infra_failure", class: cls });
    }
  });

  it("session-concluded with a FOREIGN-attemptId result → fail-closed (never an actor outcome): the flag decides", async () => {
    const scripted = scriptedChannel({ kind: "session-concluded", timedOut: false });
    const root = tempRoot();
    const stub = writeStub(root);
    plantAttemptFile(root, "result.json", JSON.stringify({ attemptId: "att-FOREIGN", exitCode: 0, signal: null, termForwarded: false }));
    const result = await run({ mapper: mapTo(stub, "emit", "x"), channel: scripted.channel, defaultCwd: root });
    expect(result).toEqual({ kind: "infra_failure", class: "spawn_infra" });
  });

  it("spawnDetail is ABSENT on session-grain (tmux-channel) spawn_outcome events — the F6(b) named diagnostic-only absence", async () => {
    const scripted = scriptedChannel({ kind: "session-concluded", timedOut: true });
    const root = tempRoot();
    const stub = writeStub(root);
    const diag = recordingDiag();
    await run({ mapper: mapTo(stub, "emit", "x"), channel: scripted.channel, defaultCwd: root, diag: diag.sink });
    expect(diag.events).toHaveLength(1);
    expect(diag.events[0]).toMatchObject({ kind: "spawn_outcome", spawnOutcome: "own_timeout" });
    expect(diag.events[0]).not.toHaveProperty("spawnDetail");
  });
});
