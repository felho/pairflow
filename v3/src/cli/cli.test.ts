import { execFile } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { loadTemplate } from "../definition/index.js";
import type { DiagStoreHandle } from "../diag/index.js";
import { DiagUnavailableError, openDiagStore } from "../diag/index.js";
import type {
  AdmittedTemplate,
  ResumeWaitOutcome,
  SubmitDecisionOutcome,
  WorkflowInstance,
} from "../domain/index.js";
import type { InstanceDetail } from "../ports/store.js";
import type { DiagnosticEvent, DiagnosticEventBody } from "../ports/diagnostics.js";
import type { DefinitionStore } from "../ports/definition.js";
// The mock factory returns the real module's own shape; naming the type
// here keeps it out of an inline `import()` annotation (lint).
import type * as DefinitionModuleShape from "../definition/index.js";
import type * as IngressModuleShape from "../ingress/ingress.js";
import type * as KernelModuleShape from "../kernel/kernel.js";
import type { GateCatalog } from "../ports/gate.js";
import { openStore } from "../store/index.js";
import { createControlledClock, createScriptedTailWait } from "../testkit/index.js";
import type { CliErrorDoc } from "./contract.js";
import { EXIT } from "./contract.js";
import type { CliSinks } from "./main.js";
import { runCli } from "./main.js";
import type { CliDeps } from "./runtime.js";

const execFileAsync = promisify(execFile);

/**
 * V8's store-destination observer (packet ch14-p3a, family 5). The rule
 * V8 states is OBJECT IDENTITY — a build constructing two stores over the
 * SAME dir and catalog satisfies every functional, matrix and journey
 * obligation, because the file store caches nothing — so identity is the
 * only form of the claim that can FAIL, and nothing but a seam can see it.
 *
 * The mock DELEGATES in full: every returned store is the real one behind
 * a recording wrapper, so no behaviour anywhere in this file changes.
 */
type DefinitionModule = typeof DefinitionModuleShape;

const definitionStoreBuilds: DefinitionStore[] = [];
const definitionLoads: DefinitionStore[] = [];
let definitionTemplateDoctor: ((template: AdmittedTemplate) => AdmittedTemplate) | null = null;

vi.mock("../definition/index.js", async (importOriginal) => {
  const actual = await importOriginal<DefinitionModule>();
  return {
    ...actual,
    createFileDefinitionStore: (dir: string, catalog: GateCatalog): DefinitionStore => {
      const real = actual.createFileDefinitionStore(dir, catalog);
      const wrapper: DefinitionStore = {
        load: async (ref) => {
          definitionLoads.push(wrapper);
          const loaded = await real.load(ref);
          // Family 2b needs the derivation's `no role` / `no instruction`
          // sites at the CLI grain, and neither is reachable through a
          // FILE: admission refuses such a template, so it would answer
          // `TemplateInvalid` instead of ever reaching the derivation.
          // The doctor is the only seam that can stage them, and it is
          // OFF (null) everywhere else.
          return loaded === null || definitionTemplateDoctor === null
            ? loaded
            : definitionTemplateDoctor(loaded);
        },
      };
      definitionStoreBuilds.push(wrapper);
      return wrapper;
    },
  };
});

function resetDefinitionSeam(): void {
  definitionStoreBuilds.length = 0;
  definitionLoads.length = 0;
  definitionTemplateDoctor = null;
}

/**
 * V5's ROUTE observer (packet ch14-p3a, family 4). The route claim is
 * "the kernel handlers DIRECTLY, never `ingress.submitIntent`", and the
 * TYPE-level lane below cannot see it: a verb that serialized its own
 * VALID record and pushed it through `submitIntent` would reach the very
 * same `kernel.submitDecision` with the very same outcome, and every
 * runtime lane in this file would stay green. Only a seam that watches
 * WHICH object was called can fail on it.
 *
 * Both mocks DELEGATE in full — every returned object is the real one
 * behind a recording wrapper — so no behaviour anywhere in this file
 * changes.
 *
 * THEY SIT ON THE IMPLEMENTATION ORIGIN (`kernel/kernel.js`,
 * `ingress/ingress.js`), NOT ON THE BARRELS the CLI imports through, and
 * that placement is load-bearing rather than stylistic. `createKernel`
 * is reachable by TWO specifiers — the barrel and the leaf — and the
 * barrel re-exports the leaf, so a mock on the BARREL observes one of
 * them: a build that constructed or called a kernel through
 * `../kernel/kernel.js` would leave every array below empty and pass
 * families 4, 6 and 7 while doing exactly what those rows forbid. A mock
 * on the LEAF is observed through BOTH specifiers, because the barrel's
 * own `export { createKernel } from "./kernel.js"` resolves to the very
 * module id mocked here. The observer is therefore TOTAL over the
 * construction site rather than pinned to one import path — which is
 * what makes the empty-array assertions in families 4/6/7 mean what they
 * say. The import-origin pin further down is the SEPARATE, structural
 * half: it keeps the barrel convention from drifting silently, and it is
 * not what these arrays depend on.
 */
type KernelModule = typeof KernelModuleShape;
type IngressModule = typeof IngressModuleShape;

/** The kernel's WRITE family — the methods a verb can route a write through. */
const KERNEL_WRITE_METHODS = [
  "handle",
  "create",
  "start",
  "kickoff",
  "cancel",
  "submitDecision",
  "resumeWait",
  "fail",
] as const;

const kernelWrites: string[] = [];
const ingressBuilds: string[] = [];
const ingressCalls: string[] = [];

/**
 * V4's PRE-KERNEL observers (packet ch14-p3a, family 6). V4 does not
 * only claim that the three resolution answers COMMIT nothing — it
 * claims each of them "RETURNS BEFORE ANY KERNEL IS BUILT". The two are
 * different claims and only one of them is visible to a store snapshot:
 * a build that constructed a kernel, called it, took `unknown_instance`
 * or `not_awaiting_decision` back and REMAPPED that to the very
 * document the CLI emits today would commit nothing, pass every
 * document assertion and every before/after equality in this file — and
 * still violate the row. Only a counter on the CONSTRUCTOR and on the
 * CALL can fail on it.
 *
 * `kernelBuilds` counts constructions; `kernelCalls` counts EVERY method
 * a caller reaches through, not just the write family, because a build
 * that consulted the kernel and then answered on its own would be a
 * kernel it was not supposed to have. `kernelWrites` stays exactly what
 * V5's route lane reads it as — the write-family subset.
 */
const kernelBuilds: string[] = [];
const kernelCalls: string[] = [];

vi.mock("../kernel/kernel.js", async (importOriginal) => {
  const actual = await importOriginal<KernelModule>();
  return {
    ...actual,
    createKernel: (deps: Parameters<KernelModule["createKernel"]>[0]) => {
      const real = actual.createKernel(deps);
      kernelBuilds.push("createKernel");
      const recorded = { ...real } as unknown as Record<string, unknown>;
      const methods = real as unknown as Record<string, (...args: unknown[]) => unknown>;
      const writes = KERNEL_WRITE_METHODS as readonly string[];
      for (const name of Object.keys(recorded)) {
        if (typeof methods[name] !== "function") continue;
        recorded[name] = (...args: unknown[]): unknown => {
          kernelCalls.push(name);
          if (writes.includes(name)) {
            kernelWrites.push(name);
          }
          return methods[name]!(...args);
        };
      }
      return recorded as unknown as ReturnType<KernelModule["createKernel"]>;
    },
  };
});

vi.mock("../ingress/ingress.js", async (importOriginal) => {
  const actual = await importOriginal<IngressModule>();
  return {
    ...actual,
    createIngress: (deps: Parameters<IngressModule["createIngress"]>[0]) => {
      const real = actual.createIngress(deps);
      ingressBuilds.push("createIngress");
      return {
        submit: (raw: unknown) => {
          ingressCalls.push("submit");
          return real.submit(raw);
        },
        submitIntent: (raw: unknown) => {
          ingressCalls.push("submitIntent");
          return real.submitIntent(raw);
        },
      };
    },
  };
});

/**
 * THE IMPORT-ORIGIN PIN (packet ch14-p3a, families 4/6/7 — the observers'
 * structural half).
 *
 * The seams above observe the implementation ORIGIN, so they see a
 * kernel or an ingress built through EITHER specifier and the empty-array
 * assertions in families 4, 6 and 7 do not rest on a convention. This
 * lane guards the convention itself: the CLI's production files reach
 * both modules through their BARRELS, which is what `kernel/index.ts`'s
 * own header declares ("named here rather than reached through a deep
 * path"). A deep import is not a correctness failure any more — it is a
 * silent drift away from the one import surface the barrels exist to be,
 * and drift in the layer the observers watch is worth failing on.
 *
 * WHAT THIS LANE DOES NOT CATCH, stated so the pin is not read wider
 * than it is: it is LEXICAL, and it scans the production files under
 * `v3/src/cli` (recursively — `cli/dev/main.ts` builds both and is
 * inside the scan). It reads a `from` keyword followed by a QUOTED
 * literal — both quote forms since the gate-2d fold, neither backticks
 * nor a specifier assembled any other way. A dynamic
 * `await import("../kernel/kernel.js")`, a re-export through some third
 * module, and every build outside `cli/` are all invisible to it. Each of those is caught by the SEAMS
 * instead, which is the division of labour: the seams carry the
 * guarantee, the pin carries the convention.
 */
describe("cli — ch14-p3a: the kernel and ingress import origins are PINNED", () => {
  const BARRELS = ["kernel/index.js", "ingress/index.js"];
  /**
   * Every `from "…"` or `from '…'` specifier naming the kernel or the
   * ingress tree, with the leading `../` run dropped so a nested file's
   * `../../` reads the same as a top-level file's `../`.
   *
   * BOTH QUOTE FORMS, and the reason is a measured false green rather
   * than symmetry for its own sake: the scanner read double quotes
   * only, and `from '../kernel/kernel.js'` in a production file passed
   * this lane 91/91 AND passed `eslint .` — nothing in the lint config
   * settles the quote style, so the pin was resting on a convention it
   * did not itself check. The opening quote is captured and the closing
   * one is a BACKREFERENCE, so a specifier is never read across a
   * mismatched pair.
   */
  const moduleSpecifiers = (source: string): readonly string[] =>
    [...source.matchAll(/from\s+(["'])(?:\.\.\/)+((?:kernel|ingress)\/[^"']+)\1/g)].map(
      (match) => match[2] ?? "",
    );

  const productionFiles = (dir: string): readonly string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) return productionFiles(full);
      return entry.name.endsWith(".ts") && !entry.name.includes(".test.") ? [full] : [];
    });

  it("every production file under `cli/` names the BARREL, never the leaf", () => {
    const dir = new URL(".", import.meta.url).pathname;
    const files = productionFiles(dir);
    // The scan is not vacuous: these three are the files that build a
    // kernel or an ingress, and a walk that found nothing would pass.
    expect(files.map((file) => file.slice(dir.length)).sort()).toEqual(
      expect.arrayContaining(["dev/main.ts", "main.ts", "runnerVerbs.ts"]),
    );
    const offenders: string[] = [];
    let seen = 0;
    for (const file of files) {
      for (const specifier of moduleSpecifiers(readFileSync(file, "utf8"))) {
        seen += 1;
        if (!BARRELS.includes(specifier)) {
          offenders.push(`${file.slice(dir.length)}: ${specifier}`);
        }
      }
    }
    expect(seen).toBeGreaterThan(0);
    expect(offenders).toEqual([]);
  });

  it("…and the scanner itself REDS on a leaf specifier — the pin's own negative", () => {
    // Without this, a scanner whose regex had stopped matching would pass
    // the lane above for the wrong reason — and the `../../` case is the
    // one a top-level-only regex silently drops.
    expect(moduleSpecifiers('import { createKernel } from "../kernel/kernel.js";')).toEqual([
      "kernel/kernel.js",
    ]);
    expect(
      moduleSpecifiers('import { createIngress } from "../../ingress/ingress.js";'),
    ).toEqual(["ingress/ingress.js"]);
    expect(moduleSpecifiers('import { createKernel } from "../../kernel/index.js";')).toEqual([
      "kernel/index.js",
    ]);
    // The SINGLE-QUOTED leaf, which the double-quote-only scanner read
    // as no specifier at all and therefore reported as no offender.
    expect(moduleSpecifiers("import { createKernel } from '../kernel/kernel.js';")).toEqual([
      "kernel/kernel.js",
    ]);
    expect(moduleSpecifiers("import { createIngress } from '../../ingress/index.js';")).toEqual([
      "ingress/index.js",
    ]);
  });
});

function resetRouteSeam(): void {
  kernelWrites.length = 0;
  kernelBuilds.length = 0;
  kernelCalls.length = 0;
  ingressBuilds.length = 0;
  ingressCalls.length = 0;
}

const dirs: string[] = [];

function tempDbPath(): string {
  const dir = mkdtempSync(join(tmpdir(), "v3-cli-"));
  dirs.push(dir);
  return join(dir, "store.db");
}

afterEach(() => {
  for (const dir of dirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

interface Run {
  code: number;
  stdout: string[];
  stderr: string[];
}

interface TestDepsOptions {
  nonce?: () => string;
  tailSteps?: ReadonlyArray<() => void | Promise<void>>;
  env?: Readonly<Record<string, string | undefined>>;
  openDiagStore?: CliDeps["openDiagStore"];
  /** ch14-p3a: the store seam the read-count and race lanes bind. */
  openStore?: CliDeps["openStore"];
}

function testDeps(options: TestDepsOptions = {}): CliDeps {
  let ids = 0;
  return {
    openStore: options.openStore ?? ((path, time) => openStore(path, time)),
    openDiagStore: options.openDiagStore ?? ((path, time) => openDiagStore(path, time)),
    time: createControlledClock(1_000),
    instanceIdSource: () => {
      ids += 1;
      return `inst-${String(ids)}`;
    },
    nonceSource: options.nonce ?? (() => `nonce-${String((ids += 1))}`),
    tailWait: () => createScriptedTailWait(options.tailSteps ?? []).wait,
    // The A4 sweep (packet ch8-P2): the builtin store retired — every
    // start/submit needs the templates-dir lane; the default deps ride
    // the ENV leg on the repo's canonical templates dir (A1's env leg,
    // exercised by every seeded test). Tests overriding env re-state it
    // (or deliberately omit it — the A1 missing lane).
    env: options.env ?? { PAIRFLOW_V3_TEMPLATES: join(process.cwd(), "templates") },
    // packet ch9-p4b (T1): the additive CliDeps growth — deterministic in the
    // suite (the runner plane's attempt/worker ids and the attach exec seam;
    // the detail/swap lanes here never reach runInteractive).
    attemptIdSource: () => `attempt-${String((ids += 1))}`,
    workerIdSource: () => `cli-worker-${String((ids += 1))}`,
    runInteractive: () => Promise.resolve(0),
  };
}

/** The derived diag-DB sibling (packet ch7-P4, C1). */
function diagPathOf(db: string): string {
  return `${db}.diag.sqlite`;
}

/** Stages R3-valid bodies into the REAL diag store on the derived path
 * (the P3 direct-sink.emit staging culture). */
function stageDiagEvents(db: string, bodies: readonly DiagnosticEventBody[]): void {
  const handle = openDiagStore(diagPathOf(db), createControlledClock(2_000));
  for (const body of bodies) {
    handle.sink.emit(body);
  }
  handle.close();
}

type TailLine =
  | { lane: "committed"; row: { seq: number } }
  | { lane: "diag"; event: DiagnosticEvent };

function tailLines(result: Run): TailLine[] {
  return result.stdout.map((line) => JSON.parse(line) as TailLine);
}

async function run(argv: readonly string[], deps: CliDeps): Promise<Run> {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const sinks: CliSinks = {
    out: (line) => stdout.push(line),
    err: (line) => stderr.push(line),
  };
  const code = await runCli(argv, deps, sinks);
  return { code, stdout, stderr };
}

function errorDoc(result: Run): CliErrorDoc["error"] {
  expect(result.stdout).toEqual([]);
  expect(result.stderr).toHaveLength(1);
  const doc = JSON.parse(result.stderr[0] ?? "") as CliErrorDoc;
  return doc.error;
}

/** F1 keyset rule: exactly {class, name, message} (+ optional details),
 * and the class ↔ exit-code correspondence holds. */
function assertErrorContract(result: Run, expectedClass: string, expectedCode: number): void {
  const error = errorDoc(result);
  expect(result.code).toBe(expectedCode);
  expect(error.class).toBe(expectedClass);
  const keys = Object.keys(error).sort();
  const allowed = ["class", "details", "message", "name"];
  for (const key of keys) {
    expect(allowed).toContain(key);
  }
  for (const required of ["class", "message", "name"]) {
    expect(keys).toContain(required);
  }
}

/**
 * ch13-p1b (ch13v2-C16): the shipped catalog entry's body, TRANSCRIBED
 * from the canonical `v3/templates/local-pair-v0@1.yaml` — the authored
 * source. Never computed through the render under test and never pasted
 * from a failing run: the subject of this growth is ORDER and CONTENT,
 * and a pasted expectation would assert the implementation against
 * itself.
 */
const EMIT_ENVELOPE_BODY = [
  "How to emit an operation.",
  "",
  "Your dispatch packet is a JSON file; its path is in the",
  "PAIRFLOW_PACKET environment variable. It carries your task,",
  "your instruction, and availableOps — the operation types",
  "this step can move on.",
  "",
  "To emit, write ONE JSON object to the path in the",
  "PAIRFLOW_EMIT environment variable, with EXACTLY two keys:",
  "",
  '  { "type": "<one of availableOps>", "payload": <your result> }',
  "",
  "Nothing else is read. Extra keys, a missing payload, or an",
  "unparseable file are taken as producing NO OUTPUT AT ALL —",
  "silently, with nothing to correct. A well-formed emit can",
  "still be rejected — the type may not be in availableOps, or",
  "your role may not be authorized to emit it here — and the",
  "rejection says which.",
].join("\n");

/** ch14-p3b: the shipped CONVERGED edge PARKS at `human_approval`, so a
 * run reaches its terminal only THROUGH the human. Every lane below that
 * needed a terminal run RESTATES its route with these two shipped verbs
 * rather than dropping the terminal expectation. `--by` is omitted so
 * the default resolves to the bound operator the same read supplies. */
async function throughTheHuman(db: string, id: string): Promise<void> {
  // Its OWN nonce namespace: both verbs MINT their op id from the deps'
  // nonce source, and every other lane's ids come from the same
  // restart-at-1 counter — so a shared source would collide rather than
  // commit, and the collision would read as a route defect.
  let minted = 0;
  const deps = testDeps({ nonce: () => `human-nonce-${String((minted += 1))}` });
  expect((await run(["submit-decision", id, "--db", db, "--decision", "approve"], deps)).code).toBe(
    EXIT.ok,
  );
  expect((await run(["resume", id, "--db", db, "--event", "COMMIT"], deps)).code).toBe(EXIT.ok);
}

/** ch12-P4: the create→start sequence replaces the retired C25 bridge —
 * `create` is genesis (the Created doc carries the minted instance id),
 * `start` is the real single-op START (the `activated` doc). */
async function startOne(db: string, deps: CliDeps): Promise<string> {
  const created = await run(["create", "--db", db, "--task", "t"], deps);
  expect(created.code).toBe(EXIT.ok);
  const createdDoc = JSON.parse(created.stdout[0] ?? "") as {
    kind: string;
    instanceId: string;
    version: number;
  };
  // `create` emits the Created outcome as data — the minted instance id is
  // surfaced on stdout for scripting the create→start sequence (V2). The
  // EXACT keyset proves creation is genesis: NO `op_id` (creation mints only
  // the instance id — a leaked op_id would fail this assert).
  expect(Object.keys(createdDoc).sort()).toEqual(["instanceId", "kind", "version"]);
  expect(createdDoc.kind).toBe("created");
  expect(typeof createdDoc.instanceId).toBe("string");
  expect(createdDoc.instanceId).not.toBe("");
  expect(createdDoc.version).toBe(1);
  const id = createdDoc.instanceId;

  const started = await run(["start", id, "--db", db], deps);
  expect(started.code).toBe(EXIT.ok);
  // `start` emits the START `activated` outcome — asserted by FULL equality:
  // genesis v1 + the activation commit ⇒ version 2, and the first dispatch's
  // ContextPacket for the implement step (task "t", role implementer, the
  // canonical template's instruction + availableOps).
  const doc = JSON.parse(started.stdout[0] ?? "") as { instanceId: string };
  expect(doc).toEqual({
    kind: "activated",
    instanceId: id,
    version: 2,
    intent: {
      actor: "codex",
      packet: {
        instanceId: id,
        expectedVersion: 2,
        task: "t",
        role: "implementer",
        instruction: "build it",
        availableOps: ["PASS"],
        // ch12-p2 (E1) + ch13-p1b: the resolved run profile. The
        // canonical template's only authored agent config is the role
        // default carrying the catalog ref — and the normalizer's lift
        // COPIES rather than moves, so that authored key survives at its
        // own position and rides the ch12 cascade. The ref therefore
        // lands at BOTH positions: here, and in the rendered blocks below.
        effectiveAgentConfig: { promptConcernRefs: ["emit-envelope"] },
        // ch13-p1b: the rendered blocks — the canonical template's
        // shipped catalog entry, reached from the role config.
        contextBlocks: [
          {
            id: "emit-envelope",
            body: EMIT_ENVELOPE_BODY,
            provenance: { sources: [{ source: "role_config" }] },
          },
        ],
        // ch12-p3 (E1): a context-free run — the explicit `none`.
        runtimeContext: "none",
      },
    },
  });
  return id;
}

describe("cli — runtime config matrix (packet ch6-P4a)", () => {
  it("missing --db and env → usage (2); env fallback works", async () => {
    assertErrorContract(await run(["list"], testDeps()), "usage", EXIT.usage);

    const db = tempDbPath();
    const withEnv = testDeps({ env: { PAIRFLOW_V3_DB: db } });
    const result = await run(["list"], withEnv);
    expect(result.code).toBe(EXIT.ok);
    expect(JSON.parse(result.stdout[0] ?? "")).toEqual([]);
  });

  it("store-open fail-closed → internal (1), NOT usage — ADR-003 stays loud", async () => {
    const db = tempDbPath();
    // Poison: tables exist, no schema marker → openStore refuses.
    const { DatabaseSync } = await import("node:sqlite");
    const raw = new DatabaseSync(db);
    raw.exec("CREATE TABLE something (a INTEGER)");
    raw.close();

    assertErrorContract(
      await run(["list", "--db", db], testDeps()),
      "internal",
      EXIT.internal,
    );
  });

  it("unknown verb / unknown flag → usage (2)", async () => {
    assertErrorContract(await run(["frobnicate"], testDeps()), "usage", EXIT.usage);
    assertErrorContract(
      await run(["list", "--db", tempDbPath(), "--nope"], testDeps()),
      "usage",
      EXIT.usage,
    );
  });
});

describe("cli — start / submit (write verbs through the sanctioned entrypoints)", () => {
  it("start → started doc on stdout, exit 0; detail sees the run", async () => {
    const db = tempDbPath();
    const deps = testDeps();
    const id = await startOne(db, deps);
    expect(id).toBe("inst-1");

    const detail = await run(["detail", id, "--db", db], deps);
    expect(detail.code).toBe(EXIT.ok);
    const doc = JSON.parse(detail.stdout[0] ?? "") as {
      instance: { instanceId: string; kernelStatus: string; terminalDisposition: string | null };
      transcript: { entryKind: string; seq: number; opId: string }[];
    };
    expect(doc.instance.kernelStatus).toBe("ACTIVE");
    expect(doc.instance.terminalDisposition).toBeNull();
    // `start` stamps the STARTED lifecycle fact at seq 1 — every run's
    // transcript begins with it (opId is the start-minted nonce).
    expect(doc.transcript).toHaveLength(1);
    expect(doc.transcript[0]?.entryKind).toBe("STARTED");
    expect(doc.transcript[0]?.seq).toBe(1);
    expect(typeof doc.transcript[0]?.opId).toBe("string");
    expect(doc.transcript[0]?.opId).not.toBe("");
  });

  it("create parse contract: bad template ref → 2; unknown template → 3; bad/unknown override → 2 (+validRoles)", async () => {
    const db = tempDbPath();
    // ch12-P4: template-ref parsing + `--override` binding parsing moved to
    // `create` (the genesis verb pins the ref and binds actors).
    assertErrorContract(
      await run(["create", "--db", db, "--task", "t", "--template", "nope"], testDeps()),
      "usage",
      EXIT.usage,
    );
    assertErrorContract(
      await run(["create", "--db", db, "--task", "t", "--template", "ghost@1"], testDeps()),
      "not_found",
      EXIT.notFound,
    );
    assertErrorContract(
      await run(["create", "--db", db, "--task", "t", "--override", "reviewer"], testDeps()),
      "usage",
      EXIT.usage,
    );
    const unknownRole = await run(
      ["create", "--db", db, "--task", "t", "--override", "ghost=claude"],
      testDeps(),
    );
    const error = errorDoc(unknownRole);
    expect(unknownRole.code).toBe(EXIT.usage);
    // ch14-p3b (R3's VALUE half): `parseOverrides` derives `validRoles`
    // from `Object.keys(template.roles)`, so T1's third role widens this
    // closed literal — and the assertion is an ORDERED array, which is
    // why T6 fixes the key order rather than leaving it to two hands.
    // Re-pinned to the new closed set, never relaxed to a containment.
    expect(error.details).toEqual({ validRoles: ["implementer", "reviewer", "operator"] });
  });

  it("submit → outcome is DATA on stdout for ALL protocol answers; exit classifies", async () => {
    const db = tempDbPath();
    const deps = testDeps();
    const id = await startOne(db, deps);

    const committed = await run(
      ["submit", "--db", db, "--instance", id, "--type", "PASS", "--expected-version", "2", "--expected-role", "implementer", "--payload", '{"ref":"d1"}'],
      deps,
    );
    expect(committed.code).toBe(EXIT.ok);
    expect((JSON.parse(committed.stdout[0] ?? "") as { kind: string }).kind).toBe("committed");
    expect(committed.stderr).toEqual([]);

    const stale = await run(
      ["submit", "--db", db, "--instance", id, "--type", "PASS", "--expected-version", "2", "--expected-role", "implementer", "--payload", '{"ref":"d2"}'],
      deps,
    );
    expect(stale.code).toBe(EXIT.notFound);
    expect((JSON.parse(stale.stdout[0] ?? "") as { kind: string }).kind).toBe("stale");
    expect(stale.stderr).toEqual([]);

    const rejected = await run(
      ["submit", "--db", db, "--instance", id, "--type", "NOPE", "--expected-version", "3", "--expected-role", "reviewer"],
      deps,
    );
    expect(rejected.code).toBe(EXIT.notFound);
    expect((JSON.parse(rejected.stdout[0] ?? "") as { kind: string }).kind).toBe("rejected");
  });

  it("ADR-004 operator nonce: a fixed nonce re-derives the same op_id → duplicate = exit 0", async () => {
    const db = tempDbPath();
    // `start` mints its own op_id from the nonce source too, so seed with a
    // FRESH nonce — the fixed nonce is the artifice that makes the two
    // SUBMITS collide onto one op_id (the lane under test).
    const id = await startOne(db, testDeps());
    const deps = testDeps({ nonce: () => "nonce-fixed" });
    const args = [
      "submit", "--db", db, "--instance", id, "--type", "PASS", "--expected-version", "2", "--expected-role", "implementer", "--payload", '{"ref":"d"}',
    ];
    expect((await run(args, deps)).code).toBe(EXIT.ok);
    const second = await run(args, deps);
    expect(second.code).toBe(EXIT.ok);
    expect((JSON.parse(second.stdout[0] ?? "") as { kind: string }).kind).toBe("duplicate");
  });

  it("submit payload rules: absent → NO payload key; 'null' → JSON null; bad JSON → 2; bad version → 2", async () => {
    const db = tempDbPath();
    const deps = testDeps();
    const id = await startOne(db, deps);

    const noPayload = await run(
      ["submit", "--db", db, "--instance", id, "--type", "PASS", "--expected-version", "2", "--expected-role", "implementer"],
      deps,
    );
    expect(noPayload.code).toBe(EXIT.ok);
    const nullPayload = await run(
      ["submit", "--db", db, "--instance", id, "--type", "PASS", "--expected-version", "3", "--expected-role", "reviewer", "--payload", "null"],
      deps,
    );
    expect(nullPayload.code).toBe(EXIT.ok);

    const detail = await run(["detail", id, "--db", db], deps);
    const doc = JSON.parse(detail.stdout[0] ?? "") as {
      transcript: { envelope?: Record<string, unknown> }[];
    };
    // Transcript index 0 is the STARTED fact (no envelope); the two
    // transition rows follow at indices 1 and 2.
    expect("payload" in (doc.transcript[1]?.envelope ?? {})).toBe(false);
    expect(doc.transcript[2]?.envelope?.["payload"]).toBeNull();

    assertErrorContract(
      await run(
        ["submit", "--db", db, "--instance", id, "--type", "PASS", "--expected-version", "4", "--expected-role", "implementer", "--payload", "{bad"],
        deps,
      ),
      "usage",
      EXIT.usage,
    );
    assertErrorContract(
      await run(
        ["submit", "--db", db, "--instance", id, "--type", "PASS", "--expected-version", "1.5", "--expected-role", "implementer"],
        deps,
      ),
      "usage",
      EXIT.usage,
    );
  });
});

describe("cli — read verbs (the floor activated)", () => {
  it("timeline: rows / --after suffix / unknown → 3 / invalid cursor → 2", async () => {
    const db = tempDbPath();
    const deps = testDeps();
    const id = await startOne(db, deps);
    await run(
      ["submit", "--db", db, "--instance", id, "--type", "PASS", "--expected-version", "2", "--expected-role", "implementer", "--payload", '{"ref":"d"}'],
      deps,
    );

    const rows = await run(["timeline", id, "--db", db], deps);
    expect(rows.code).toBe(EXIT.ok);
    // seq 1 is the STARTED fact, seq 2 the PASS transition.
    expect((JSON.parse(rows.stdout[0] ?? "") as { seq: number }[]).map((r) => r.seq)).toEqual([1, 2]);

    const beyond = await run(["timeline", id, "--db", db, "--after", "99"], deps);
    expect(JSON.parse(beyond.stdout[0] ?? "")).toEqual([]);

    assertErrorContract(
      await run(["timeline", "ghost", "--db", db], deps),
      "not_found",
      EXIT.notFound,
    );
    assertErrorContract(
      await run(["timeline", id, "--db", db, "--after", "-1"], deps),
      "usage",
      EXIT.usage,
    );
  });

  it("dim8 (ch11-P2b): detail AND timeline rows carry gateDecisions [] on an ungated run", async () => {
    const db = tempDbPath();
    const deps = testDeps();
    const id = await startOne(db, deps);
    await run(
      ["submit", "--db", db, "--instance", id, "--type", "PASS", "--expected-version", "2", "--expected-role", "implementer", "--payload", '{"ref":"d"}'],
      deps,
    );

    // gateDecisions rides the transition rows only — the STARTED fact row
    // carries no gate lane, so filter to the transition class.
    const detail = await run(["detail", id, "--db", db], deps);
    const detailDoc = JSON.parse(detail.stdout[0] ?? "") as {
      transcript: { entryKind: string; gateDecisions?: unknown }[];
    };
    expect(
      detailDoc.transcript.filter((r) => r.entryKind === "transition").map((r) => r.gateDecisions),
    ).toEqual([[]]);

    const timeline = await run(["timeline", id, "--db", db], deps);
    const rows = JSON.parse(timeline.stdout[0] ?? "") as { entryKind: string; gateDecisions?: unknown }[];
    expect(
      rows.filter((r) => r.entryKind === "transition").map((r) => r.gateDecisions),
    ).toEqual([[]]);
  });

  it("bundle: default policy — payload markers appear NOWHERE (REV-BUNDLE-DEFAULT-POLICY)", async () => {
    const db = tempDbPath();
    const deps = testDeps();
    const id = await startOne(db, deps);
    await run(
      ["submit", "--db", db, "--instance", id, "--type", "PASS", "--expected-version", "2", "--expected-role", "implementer", "--payload", '{"secret":"MARKER_CLI_DELTA_4b"}'],
      deps,
    );

    const bundle = await run(["bundle", id, "--db", db], deps);
    expect(bundle.code).toBe(EXIT.ok);
    expect(bundle.stdout[0]).not.toContain("MARKER_CLI_DELTA_4b");
    expect((JSON.parse(bundle.stdout[0] ?? "") as { policy: string }).policy).toBe(
      "redact-payloads",
    );
    assertErrorContract(
      await run(["bundle", "ghost", "--db", db], deps),
      "not_found",
      EXIT.notFound,
    );
  });

  it("bundle on the WIRED channel (ch7-P4 C5/V4/C1): fresh → present []; a real rejected submit → present rows; the sibling file appears", async () => {
    const db = tempDbPath();
    const deps = testDeps();
    const id = await startOne(db, deps);

    // C5: a wired channel's empty store is KNOWN-EMPTY, never the X1
    // interim unavailable(open_failed) — that state ceased to exist here.
    const fresh = await run(["bundle", id, "--db", db], deps);
    expect(fresh.code).toBe(EXIT.ok);
    const freshDoc = JSON.parse(fresh.stdout[0] ?? "") as { rejectedInputs: unknown };
    expect(freshDoc.rejectedInputs).toEqual({ status: "present", rows: [] });
    // C1 sibling placement: the derived diag DB sits beside the main DB.
    expect(existsSync(diagPathOf(db))).toBe(true);

    // V5→V4 pass-through: a REAL rejected submit lands in the diag store
    // and surfaces as an attributed bundle row.
    const rejected = await run(
      ["submit", "--db", db, "--instance", id, "--type", "NOPE", "--expected-version", "2", "--expected-role", "implementer"],
      deps,
    );
    expect(rejected.code).toBe(EXIT.notFound);
    const bundle = await run(["bundle", id, "--db", db], deps);
    expect(bundle.code).toBe(EXIT.ok);
    const doc = JSON.parse(bundle.stdout[0] ?? "") as {
      rejectedInputs: { status: string; rows: { kind: string; reason?: string }[] };
    };
    expect(doc.rejectedInputs.status).toBe("present");
    expect(doc.rejectedInputs.rows).toHaveLength(1);
    expect(doc.rejectedInputs.rows[0]?.kind).toBe("rejected");
    expect(doc.rejectedInputs.rows[0]?.reason).toBe("no_transition");
  });

  it("bundle under a corrupt diag store (M10): section = unavailable(reason), the bundle SUCCEEDS at exit 0", async () => {
    const db = tempDbPath();
    const deps = testDeps();
    const id = await startOne(db, deps);
    writeFileSync(diagPathOf(db), "garbage-not-a-database", "utf8");

    const bundle = await run(["bundle", id, "--db", db], deps);
    expect(bundle.code).toBe(EXIT.ok);
    expect(bundle.stderr).toEqual([]);
    const doc = JSON.parse(bundle.stdout[0] ?? "") as { rejectedInputs: unknown };
    expect(doc.rejectedInputs).toEqual({ status: "unavailable", reason: "open_failed" });
  });

  it("tail: NDJSON rows on stdout, completion on terminal; error lanes → 3 / 2", async () => {
    const db = tempDbPath();
    const setupDeps = testDeps();
    const id = await startOne(db, setupDeps);
    await run(
      ["submit", "--db", db, "--instance", id, "--type", "PASS", "--expected-version", "2", "--expected-role", "implementer", "--payload", '{"ref":"d1"}'],
      setupDeps,
    );

    // The scripted wait's step commits CONVERGED cross-handle (a second
    // runCli on the same WAL file) — then the tail must complete.
    const tailDeps = testDeps({
      tailSteps: [
        async () => {
          // ONE deps across this step's three committing calls: the
          // nonce source restarts per deps object, so a fresh one per
          // call would mint the same op id twice and collide.
          const stepDeps = testDeps();
          const converge = await run(
            ["submit", "--db", db, "--instance", id, "--type", "CONVERGED", "--expected-version", "3", "--expected-role", "reviewer"],
            stepDeps,
          );
          expect(converge.code).toBe(EXIT.ok);
          await throughTheHuman(db, id);
        },
      ],
    });
    const tail = await run(["tail", id, "--db", db], tailDeps);
    expect(tail.code).toBe(EXIT.ok);
    expect(tail.stderr).toEqual([]);
    // seq 1 STARTED, 2 PASS, 3 CONVERGED, 4 DECISION_REQUEST (the park's
    // second row, same commit), 5 DECISION_MADE, 6 WAIT_RESUMED.
    const seqs = tail.stdout.map((line) => (JSON.parse(line) as { seq: number }).seq);
    expect(seqs).toEqual([1, 2, 3, 4, 5, 6]);

    assertErrorContract(await run(["tail", "ghost", "--db", db], testDeps()), "not_found", EXIT.notFound);
    assertErrorContract(
      await run(["tail", id, "--db", db, "--from", "1.5"], testDeps()),
      "usage",
      EXIT.usage,
    );
    assertErrorContract(
      await run(["tail", id, "--db", db, "--poll-ms", "-5"], testDeps()),
      "usage",
      EXIT.usage,
    );
  });
});

describe("cli — P4a aftermath (post-commit review, 2026-07-08)", () => {
  it("F1 — a colliding minted id is INTERNAL (1), never usage: the 2-vs-1 split holds", async () => {
    const db = tempDbPath();
    // ch12-P4: the id is MINTED at `create` (genesis), so the collision
    // surfaces there — a fixed id re-created is the store's creation-
    // uniqueness THROW, internal 1 (never the binding-coverage usage lane).
    const deps: CliDeps = { ...testDeps(), instanceIdSource: () => "inst-fixed" };
    expect((await run(["create", "--db", db, "--task", "t"], deps)).code).toBe(EXIT.ok);
    assertErrorContract(
      await run(["create", "--db", db, "--task", "t"], deps),
      "internal",
      EXIT.internal,
    );
  });

  it("F2 — numeric flags are LEXICAL decimal integers: coercion lanes → 2", async () => {
    const db = tempDbPath();
    const deps = testDeps();
    const id = await startOne(db, deps);
    for (const bad of ["", " ", "1e2", "0x10", "+1"]) {
      assertErrorContract(
        await run(["timeline", id, "--db", db, "--after", bad], deps),
        "usage",
        EXIT.usage,
      );
    }
    assertErrorContract(
      await run(
        ["submit", "--db", db, "--instance", id, "--type", "PASS", "--expected-version", " ", "--expected-role", "implementer"],
        deps,
      ),
      "usage",
      EXIT.usage,
    );
  });

  it("test gap — tail mid-stream failure: emitted rows stay parseable, ONE stderr doc, exit 1", async () => {
    const db = tempDbPath();
    const setupDeps = testDeps();
    const id = await startOne(db, setupDeps);
    await run(
      ["submit", "--db", db, "--instance", id, "--type", "PASS", "--expected-version", "2", "--expected-role", "implementer", "--payload", '{"ref":"d"}'],
      setupDeps,
    );

    const deps = testDeps({
      tailSteps: [
        () => {
          throw new Error("boom mid-tail");
        },
      ],
    });
    const result = await run(["tail", id, "--db", db], deps);
    expect(result.code).toBe(EXIT.internal);
    // Both committed rows (STARTED seq 1, PASS seq 2) drain before the
    // wait throws; they stay parseable on stdout.
    expect(result.stdout).toHaveLength(2);
    expect((JSON.parse(result.stdout[0] ?? "") as { seq: number }).seq).toBe(1);
    expect(result.stderr).toHaveLength(1);
    expect((JSON.parse(result.stderr[0] ?? "") as CliErrorDoc).error.class).toBe("internal");
  });
});

describe("cli — tail --diag (packet ch7-P4: V1/M1–M8/F1–F2)", () => {
  /** Drives the builtin template to its terminal: PASS → CONVERGED (the
   * park) → approve → COMMIT. Since ch14-p3b the last two legs are what
   * make the run terminal at all. */
  async function startAndConverge(db: string, deps: CliDeps): Promise<string> {
    const id = await startOne(db, deps);
    expect(
      (await run(["submit", "--db", db, "--instance", id, "--type", "PASS", "--expected-version", "2", "--expected-role", "implementer", "--payload", '{"ref":"d"}'], deps)).code,
    ).toBe(EXIT.ok);
    expect(
      (await run(["submit", "--db", db, "--instance", id, "--type", "CONVERGED", "--expected-version", "3", "--expected-role", "reviewer"], deps)).code,
    ).toBe(EXIT.ok);
    await throughTheHuman(db, id);
    return id;
  }

  it("V1/M1: two-lane NDJSON — history + LIVE diag via the real sink, completion on terminal, exit 0", async () => {
    const db = tempDbPath();
    const setupDeps = testDeps();
    const id = await startOne(db, setupDeps);
    await run(
      ["submit", "--db", db, "--instance", id, "--type", "PASS", "--expected-version", "2", "--expected-role", "implementer", "--payload", '{"ref":"d1"}'],
      setupDeps,
    );
    // Pre-tail diag history: a REAL rejected submit through the wired sink.
    const preReject = await run(
      ["submit", "--db", db, "--instance", id, "--type", "NOPE", "--expected-version", "3", "--expected-role", "reviewer"],
      setupDeps,
    );
    expect(preReject.code).toBe(EXIT.notFound);

    const tailDeps = testDeps({
      tailSteps: [
        async () => {
          // Mid-tail LIVE diag event: another real rejected submit.
          const midReject = await run(
            ["submit", "--db", db, "--instance", id, "--type", "NOPE", "--expected-version", "3", "--expected-role", "reviewer"],
            testDeps(),
          );
          expect(midReject.code).toBe(EXIT.notFound);
        },
        async () => {
          // ONE deps across this step's three committing calls (see the
          // plain-tail lane: the nonce source restarts per deps object).
          const stepDeps = testDeps();
          expect(
            (await run(["submit", "--db", db, "--instance", id, "--type", "CONVERGED", "--expected-version", "3", "--expected-role", "reviewer"], stepDeps)).code,
          ).toBe(EXIT.ok);
          await throughTheHuman(db, id);
        },
      ],
    });
    const tail = await run(["tail", id, "--db", db, "--diag"], tailDeps);
    expect(tail.code).toBe(EXIT.ok);
    expect(tail.stderr).toEqual([]);
    const lines = tailLines(tail);
    // Every row carries the lane discriminator (V1).
    expect(lines.every((l) => l.lane === "committed" || l.lane === "diag")).toBe(true);
    const committed = lines.filter((l) => l.lane === "committed");
    const diag = lines.filter((l) => l.lane === "diag");
    // seq 1 STARTED, 2 PASS, 3 CONVERGED, 4 the park's DECISION_REQUEST,
    // 5 DECISION_MADE, 6 WAIT_RESUMED.
    expect(committed.map((l) => (l as { row: { seq: number } }).row.seq)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(diag).toHaveLength(2);
    for (const line of diag) {
      const event = (line as { event: DiagnosticEvent }).event;
      expect(event.kind).toBe("rejected");
      expect(event.reason).toBe("no_transition");
      expect(typeof event.ordinal).toBe("number");
      expect(typeof event.at).toBe("number");
    }
  });

  it("dimension 1 tail-side full-event lane: an internal_failure's error.message rides INTACT (local surface)", async () => {
    const db = tempDbPath();
    const deps = testDeps();
    const id = await startAndConverge(db, deps);
    stageDiagEvents(db, [
      {
        source: "kernel",
        kind: "internal_failure",
        instanceId: id,
        error: { name: "BoomError", message: "boom detail with context" },
      },
    ]);

    const tail = await run(["tail", id, "--db", db, "--diag"], testDeps());
    expect(tail.code).toBe(EXIT.ok);
    const diag = tailLines(tail).filter((l) => l.lane === "diag");
    expect(diag).toHaveLength(1);
    const event = (diag[0] as { event: DiagnosticEvent }).event;
    expect(event.error).toEqual({ name: "BoomError", message: "boom detail with context" });
  });

  it("M2 at-start + M4 combination: corrupt diag → DiagUnavailableError doc / 1; unknown id + corrupt diag → 3", async () => {
    const db = tempDbPath();
    const deps = testDeps();
    const id = await startOne(db, deps);
    writeFileSync(diagPathOf(db), "garbage-not-a-database", "utf8");

    const result = await run(["tail", id, "--db", db, "--diag"], testDeps());
    assertErrorContract(result, "internal", EXIT.internal);
    expect(result.stdout).toEqual([]);
    const doc = errorDoc(result);
    expect(doc.name).toBe("DiagUnavailableError");
    expect(doc.details).toEqual({ reason: "open_failed" });

    // M4: the committed fetch runs FIRST (P3 E3) — unknown id wins over
    // the corrupt diag store, and the CLI cannot reorder (one iteration).
    assertErrorContract(
      await run(["tail", "ghost", "--db", db, "--diag"], testDeps()),
      "not_found",
      EXIT.notFound,
    );
  });

  it("M3 mid-stream diag failure: prior rows stay parseable, ONE stderr doc, exit 1", async () => {
    const db = tempDbPath();
    const setupDeps = testDeps();
    const id = await startOne(db, setupDeps);
    await run(
      ["submit", "--db", db, "--instance", id, "--type", "PASS", "--expected-version", "2", "--expected-role", "implementer", "--payload", '{"ref":"d"}'],
      setupDeps,
    );

    let reads = 0;
    const scripted: DiagStoreHandle = {
      sink: { emit: () => undefined },
      reader: {
        getDiagnostics: () => {
          reads += 1;
          return reads === 1
            ? Promise.resolve([])
            : Promise.reject(new DiagUnavailableError("read_failed"));
        },
        getGlobalDiagnostics: () => Promise.resolve([]),
      },
      close: () => undefined,
    };
    const deps = testDeps({ openDiagStore: () => scripted, tailSteps: [() => undefined] });
    const result = await run(["tail", id, "--db", db, "--diag"], deps);
    expect(result.code).toBe(EXIT.internal);
    // Round 1 yields both committed rows (STARTED seq 1, PASS seq 2)
    // before the second diag read rejects.
    expect(result.stdout).toHaveLength(2);
    expect((JSON.parse(result.stdout[0] ?? "") as { lane: string }).lane).toBe("committed");
    expect(result.stderr).toHaveLength(1);
    const doc = (JSON.parse(result.stderr[0] ?? "") as CliErrorDoc).error;
    expect(doc.name).toBe("DiagUnavailableError");
    expect(doc.details).toEqual({ reason: "read_failed" });
  });

  it("M6: a NON-typed reader failure propagates to the catch-all — internal / 1 with the error's OWN name", async () => {
    const db = tempDbPath();
    const setupDeps = testDeps();
    const id = await startOne(db, setupDeps);

    const scripted: DiagStoreHandle = {
      sink: { emit: () => undefined },
      reader: {
        getDiagnostics: () => Promise.reject(new Error("kaboom — not a typed diag error")),
        getGlobalDiagnostics: () => Promise.resolve([]),
      },
      close: () => undefined,
    };
    const result = await run(
      ["tail", id, "--db", db, "--diag"],
      testDeps({ openDiagStore: () => scripted }),
    );
    assertErrorContract(result, "internal", EXIT.internal);
    expect(errorDoc(result).name).toBe("Error");
  });

  it("F2/M7/M8: --from-ordinal parses lexically, skips delivered events, and is REJECTED without --diag", async () => {
    const db = tempDbPath();
    const deps = testDeps();
    const id = await startAndConverge(db, deps);
    stageDiagEvents(db, [
      { source: "kernel", kind: "internal_failure", instanceId: id, error: { name: "E1", message: "first" } },
      { source: "kernel", kind: "internal_failure", instanceId: id, error: { name: "E2", message: "second" } },
    ]);

    // M7: the CLI parse lane (lexical, the shared helper — no new validator).
    assertErrorContract(
      await run(["tail", id, "--db", db, "--diag", "--from-ordinal", "1.5"], testDeps()),
      "usage",
      EXIT.usage,
    );
    // M8: presence-checked coupling — the value 0 is red too.
    assertErrorContract(
      await run(["tail", id, "--db", db, "--from-ordinal", "0"], testDeps()),
      "usage",
      EXIT.usage,
    );

    // The skip lane: ordinal ≤ 1 is excluded (`ordinal > fromOrdinal`).
    const skipped = await run(["tail", id, "--db", db, "--diag", "--from-ordinal", "1"], testDeps());
    expect(skipped.code).toBe(EXIT.ok);
    const diag = tailLines(skipped).filter((l) => l.lane === "diag");
    expect(diag).toHaveLength(1);
    expect((diag[0] as { event: DiagnosticEvent }).event.error?.name).toBe("E2");
  });

  it("dimension 3 RESUME COMBINATION (aftermath): --from + --from-ordinal together — each lane honors ITS cursor", async () => {
    const db = tempDbPath();
    const deps = testDeps();
    const id = await startAndConverge(db, deps); // committed seq 1..6 (see the helper)
    stageDiagEvents(db, [
      { source: "kernel", kind: "internal_failure", instanceId: id, error: { name: "E1", message: "first" } },
      { source: "kernel", kind: "internal_failure", instanceId: id, error: { name: "E2", message: "second" } },
    ]);

    // A swapped or dropped cursor wiring cannot pass BOTH assertions
    // at once (the combination-lane heuristic — flag 1's "both
    // cursors" resumability ground driven as ONE invocation).
    const resumed = await run(
      ["tail", id, "--db", db, "--diag", "--from", "1", "--from-ordinal", "1"],
      testDeps(),
    );
    expect(resumed.code).toBe(EXIT.ok);
    const lines = tailLines(resumed);
    const committed = lines.filter((l) => l.lane === "committed");
    const diag = lines.filter((l) => l.lane === "diag");
    // --from 1 skips the STARTED fact (seq 1); the rest of the run follows.
    expect(committed.map((l) => (l as { row: { seq: number } }).row.seq)).toEqual([2, 3, 4, 5, 6]);
    expect(diag).toHaveLength(1);
    expect((diag[0] as { event: DiagnosticEvent }).event.error?.name).toBe("E2");
  });

  it("F1 representative negative (aftermath): --diag on a NON-tail verb → usage 2", async () => {
    const db = tempDbPath();
    assertErrorContract(
      await run(["list", "--db", db, "--diag"], testDeps()),
      "usage",
      EXIT.usage,
    );
  });
});

describe("cli — write-path wiring + separation (packet ch7-P4: V5/M11/C3/dimension 8)", () => {
  it("M11: start/submit outcomes and exits are byte-identical under a corrupt diag store (the sink swallows)", async () => {
    const healthyDb = tempDbPath();
    const corruptDb = tempDbPath();
    writeFileSync(diagPathOf(corruptDb), "garbage-not-a-database", "utf8");

    const runFlow = async (db: string): Promise<{ outs: string[]; codes: number[] }> => {
      const deps = testDeps();
      const outs: string[] = [];
      const codes: number[] = [];
      const record = (r: Run): void => {
        outs.push(...r.stdout);
        codes.push(r.code);
      };
      record(await run(["create", "--db", db, "--task", "t"], deps));
      const id = "inst-1";
      record(await run(["start", id, "--db", db], deps));
      record(
        await run(
          ["submit", "--db", db, "--instance", id, "--type", "PASS", "--expected-version", "2", "--expected-role", "implementer", "--payload", '{"ref":"d"}'],
          deps,
        ),
      );
      record(
        await run(["submit", "--db", db, "--instance", id, "--type", "NOPE", "--expected-version", "3", "--expected-role", "reviewer"], deps),
      );
      return { outs, codes };
    };

    const healthy = await runFlow(healthyDb);
    const corrupt = await runFlow(corruptDb);
    expect(corrupt.outs).toEqual(healthy.outs);
    expect(corrupt.codes).toEqual(healthy.codes);
  });

  it("C3: committed-only verbs NEVER create the diag file", async () => {
    const db = tempDbPath();
    const deps = testDeps();
    const id = await startOne(db, deps);
    await run(
      ["submit", "--db", db, "--instance", id, "--type", "PASS", "--expected-version", "2", "--expected-role", "implementer", "--payload", '{"ref":"d"}'],
      deps,
    );
    await run(["submit", "--db", db, "--instance", id, "--type", "CONVERGED", "--expected-version", "3", "--expected-role", "reviewer"], deps);
    await throughTheHuman(db, id);
    // The write verbs ARE diag verbs — remove their sibling so the
    // committed-only reads run against a diag-free path.
    rmSync(diagPathOf(db), { force: true });

    expect((await run(["list", "--db", db], deps)).code).toBe(EXIT.ok);
    expect((await run(["detail", id, "--db", db], deps)).code).toBe(EXIT.ok);
    expect((await run(["timeline", id, "--db", db], deps)).code).toBe(EXIT.ok);
    // The plain tail (V2) — already-terminal, zero waits, no diag open.
    expect((await run(["tail", id, "--db", db], testDeps())).code).toBe(EXIT.ok);
    expect(existsSync(diagPathOf(db))).toBe(false);
  });

  it("dimension 8: list + plain tail outputs are byte-identical beside a corrupt diag file", async () => {
    const seed = async (db: string): Promise<string> => {
      const deps = testDeps();
      const id = await startOne(db, deps);
      await run(
        ["submit", "--db", db, "--instance", id, "--type", "PASS", "--expected-version", "2", "--expected-role", "implementer", "--payload", '{"ref":"d"}'],
        deps,
      );
      await run(["submit", "--db", db, "--instance", id, "--type", "CONVERGED", "--expected-version", "3", "--expected-role", "reviewer"], deps);
      await throughTheHuman(db, id);
      return id;
    };
    const healthyDb = tempDbPath();
    const corruptDb = tempDbPath();
    const idH = await seed(healthyDb);
    const idC = await seed(corruptDb);
    writeFileSync(diagPathOf(corruptDb), "garbage-not-a-database", "utf8");

    const listH = await run(["list", "--db", healthyDb], testDeps());
    const listC = await run(["list", "--db", corruptDb], testDeps());
    expect(listC.stdout).toEqual(listH.stdout);
    expect(listC.code).toBe(listH.code);

    const tailH = await run(["tail", idH, "--db", healthyDb], testDeps());
    const tailC = await run(["tail", idC, "--db", corruptDb], testDeps());
    expect(tailC.stdout).toEqual(tailH.stdout);
    expect(tailC.code).toBe(tailH.code);
  });
});

// ── packet ch8-P2: the templates-dir lane + write-lane dispositions ──

const REPO_TEMPLATES = join(process.cwd(), "templates");
const CANONICAL_BYTES = (): string =>
  readFileSync(join(REPO_TEMPLATES, "local-pair-v0@1.yaml"), "utf8");

/** Stages RAW yaml text files into a fresh temp templates dir
 * (R-RAW-FIXTURES: hostile values ride raw text, never a serializer). */
function stageTemplates(files: Readonly<Record<string, string>>): string {
  const dir = mkdtempSync(join(tmpdir(), "v3-tpl-"));
  dirs.push(dir);
  for (const [name, body] of Object.entries(files)) {
    writeFileSync(join(dir, name), body);
  }
  return dir;
}

describe("cli — the templates-dir config lane (packet ch8-P2: A1/A2/A3)", () => {
  it("A1: --templates-dir beats env; env-only works; both missing → usage 2 MissingTemplatesDir", async () => {
    // flag beats env: env points at an EMPTY dir (a miss there would be
    // exit 3), the flag at the repo dir → the flag's dir served.
    const emptyDir = stageTemplates({});
    const flagWins = await run(
      ["create", "--db", tempDbPath(), "--task", "t", "--templates-dir", REPO_TEMPLATES],
      testDeps({ env: { PAIRFLOW_V3_TEMPLATES: emptyDir } }),
    );
    expect(flagWins.code).toBe(EXIT.ok);

    // env-only (the leg every seeded test rides via the default deps),
    // explicit here:
    const envOnly = await run(
      ["create", "--db", tempDbPath(), "--task", "t"],
      testDeps({ env: { PAIRFLOW_V3_TEMPLATES: REPO_TEMPLATES } }),
    );
    expect(envOnly.code).toBe(EXIT.ok);

    // both missing → usage 2 with the A1 doc name:
    const missing = await run(
      ["create", "--db", tempDbPath(), "--task", "t"],
      testDeps({ env: {} }),
    );
    const err = errorDoc(missing);
    expect(missing.code).toBe(EXIT.usage);
    expect(err.name).toBe("MissingTemplatesDir");

    // the EMPTY forms (A1's "missing/empty" — both halves driven;
    // aftermath finding 3): an empty flag and an empty env value each
    // take the missing lane.
    const emptyFlag = await run(
      ["create", "--db", tempDbPath(), "--task", "t", "--templates-dir", ""],
      testDeps({ env: {} }),
    );
    expect(errorDoc(emptyFlag).name).toBe("MissingTemplatesDir");
    const emptyEnv = await run(
      ["create", "--db", tempDbPath(), "--task", "t"],
      testDeps({ env: { PAIRFLOW_V3_TEMPLATES: "" } }),
    );
    expect(errorDoc(emptyEnv).name).toBe("MissingTemplatesDir");
  });

  it("A2: unlistable dir (absent / a FILE / unreadable) → usage 2 InvalidTemplatesDir, EAGERLY — no store write, no diag file", async () => {
    const scratch = mkdtempSync(join(tmpdir(), "v3-tpl-a2-"));
    dirs.push(scratch);
    const absent = join(scratch, "nope");
    const fileAtPath = join(scratch, "file-not-dir");
    writeFileSync(fileAtPath, "not a directory");
    const forms = [absent, fileAtPath];
    // The unreadable form is root-guarded (packet note 7): uid 0
    // bypasses permission checks and the lane is unstageable there.
    const canRestrict = typeof process.getuid === "function" && process.getuid() !== 0;
    if (canRestrict) {
      const unreadable = join(scratch, "locked");
      mkdirSync(unreadable);
      chmodSync(unreadable, 0o000);
      forms.push(unreadable);
    }
    for (const form of forms) {
      const db = tempDbPath();
      const res = await run(
        ["create", "--db", db, "--task", "t", "--templates-dir", form],
        testDeps(),
      );
      const err = errorDoc(res);
      expect(res.code).toBe(EXIT.usage);
      expect(err.name).toBe("InvalidTemplatesDir");
      // EAGER (A2): exit 2 fired BEFORE any kernel effect — the run
      // store and the derived diag file were never created.
      expect(existsSync(db)).toBe(false);
      expect(existsSync(diagPathOf(db))).toBe(false);
    }
    if (canRestrict) {
      chmodSync(join(scratch, "locked"), 0o755);
    }
  });

  it("A3: --templates-dir is REJECTED by strict parse on unbound verbs (read verbs take no template config)", async () => {
    const db = tempDbPath();
    assertErrorContract(
      await run(["list", "--db", db, "--templates-dir", REPO_TEMPLATES], testDeps()),
      "usage",
      EXIT.usage,
    );
    assertErrorContract(
      await run(["tail", "x", "--db", db, "--templates-dir", REPO_TEMPLATES], testDeps()),
      "usage",
      EXIT.usage,
    );
  });
});

describe("cli — the pinned --template ref grammar (packet ch8-P2: T1/T2)", () => {
  it("T2 ladder: source-form negatives → usage 2; lexical positives reach the store (miss = 3); id not prevalidated", async () => {
    // Negatives: the version half mirrors C8's source grammar — plus
    // the safe-integer BELT (passes the regex, fails safe-int).
    for (const bad of [
      "x", "@1", "x@", "x@0", "x@-1", "x@+1", "x@01", "x@1.0",
      "x@0x10", "x@1e2", "x@ 1", "x@'1'", "x@9007199254740993",
    ]) {
      const res = await run(
        ["create", "--db", tempDbPath(), "--task", "t", "--template", bad],
        testDeps(),
      );
      const err = errorDoc(res);
      expect(res.code).toBe(EXIT.usage);
      expect(err.name).toBe("InvalidTemplateRef");
    }
    // Positives past the parse (incl. the safe boundary, and an id
    // CONTAINING '@' — the split is at the LAST '@'; an indexOf
    // regression would reject it; aftermath finding 3): the repo dir
    // has no such file → UnknownTemplate 3 proves the parse ACCEPTED.
    for (const good of ["x@10", "x@9007199254740991", "a@b@1"]) {
      const res = await run(
        ["create", "--db", tempDbPath(), "--task", "t", "--template", good],
        testDeps(),
      );
      const err = errorDoc(res);
      expect(res.code).toBe(EXIT.notFound);
      expect(err.name).toBe("UnknownTemplate");
    }
    // The id half is NOT prevalidated (S1 no-prevalidation): an
    // off-grammar id can only MISS — never open outside the dir.
    const trav = await run(
      ["create", "--db", tempDbPath(), "--task", "t", "--template", "../evil@1"],
      testDeps(),
    );
    expect(trav.code).toBe(EXIT.notFound);
  });
});

describe("cli — write-lane dispositions (packet ch8-P2: W1/W2/W3/W4)", () => {
  it("W1/W2 at start: present-but-invalid → TemplateInvalid 1 with the VERBATIM {stage, findings} details; absent → 3", async () => {
    const badBody = `${CANONICAL_BYTES()}kind: nope\n`;
    const dir = stageTemplates({ "local-pair-v0@1.yaml": badBody });
    const res = await run(
      ["create", "--db", tempDbPath(), "--task", "t", "--templates-dir", dir],
      testDeps(),
    );
    const err = errorDoc(res);
    expect(res.code).toBe(EXIT.internal);
    expect(err.class).toBe("internal");
    expect(err.name).toBe("TemplateInvalid");
    const details = err.details as { stage: string; findings: unknown[] };
    expect(Object.keys(err.details ?? {}).sort()).toEqual(["findings", "stage"]);
    expect(details.stage).toBe("validate");
    expect(details.findings.length).toBeGreaterThan(0);
    // VERBATIM (W2, aftermath finding 3): the doc's details deep-equal
    // the pipeline's OWN result on the same bytes — never a
    // re-serialization that changes the shape.
    const direct = loadTemplate(new TextEncoder().encode(badBody));
    expect(direct.ok).toBe(false);
    if (!direct.ok) {
      expect(details).toEqual({ stage: direct.error.stage, findings: direct.error.findings });
    }

    // absent-at-START (invalid ≠ absent, the other half): version 2
    // has no byte-exact listing match in the repo dir.
    const absent = await run(
      ["create", "--db", tempDbPath(), "--task", "t", "--template", "local-pair-v0@2"],
      testDeps(),
    );
    const absentErr = errorDoc(absent);
    expect(absent.code).toBe(EXIT.notFound);
    expect(absentErr.name).toBe("UnknownTemplate");
  });

  it("W2/W4 at submit: the in-handle typed load error surfaces at the ingress.submit await as the SAME TemplateInvalid doc", async () => {
    const db = tempDbPath();
    const id = await startOne(db, testDeps());
    const badBody = `${CANONICAL_BYTES()}kind: nope\n`;
    const badDir = stageTemplates({ "local-pair-v0@1.yaml": badBody });
    const res = await run(
      [
        "submit", "--db", db, "--instance", id, "--type", "PASS",
        "--expected-version", "2", "--expected-role", "implementer", "--templates-dir", badDir,
      ],
      testDeps(),
    );
    const err = errorDoc(res);
    expect(res.code).toBe(EXIT.internal);
    expect(err.name).toBe("TemplateInvalid");
    const details = err.details as { stage: string; findings: unknown[] };
    expect(Object.keys(err.details ?? {}).sort()).toEqual(["findings", "stage"]);
    expect(details.stage).toBe("validate");
    // VERBATIM (W2): the in-handle surfacing carries the pipeline's own
    // findings unchanged.
    const direct = loadTemplate(new TextEncoder().encode(badBody));
    expect(direct.ok).toBe(false);
    if (!direct.ok) {
      expect(details).toEqual({ stage: direct.error.stage, findings: direct.error.findings });
    }
  });

  it("W3: absent at HANDLE → the kernel's pinned-ref integrity error (internal 1; the doc name is literally 'Error', the MESSAGE is the assert target)", async () => {
    // A deletable COPY of the canonical bytes (raw byte copy — the repo
    // file itself is never touched).
    const dir = stageTemplates({ "local-pair-v0@1.yaml": CANONICAL_BYTES() });
    const db = tempDbPath();
    const deps = testDeps();
    const created = await run(
      ["create", "--db", db, "--task", "t", "--templates-dir", dir],
      deps,
    );
    expect(created.code).toBe(EXIT.ok);
    const id = (JSON.parse(created.stdout[0] ?? "") as { instanceId: string }).instanceId;
    expect((await run(["start", id, "--db", db, "--templates-dir", dir], deps)).code).toBe(EXIT.ok);
    rmSync(join(dir, "local-pair-v0@1.yaml"));
    const res = await run(
      [
        "submit", "--db", db, "--instance", id, "--type", "PASS",
        "--expected-version", "2", "--expected-role", "implementer", "--templates-dir", dir,
      ],
      testDeps(),
    );
    const err = errorDoc(res);
    expect(res.code).toBe(EXIT.internal);
    expect(err.name).toBe("Error");
    expect(err.message).toContain("kernel integrity: pinned template");
    expect(err.name).not.toBe("TemplateInvalid");
  });
});

describe("cli — last-mile smoke: the SHIPPED entrypoint (root tsx bridge)", () => {
  it("create → start → detail through the real cli/main.ts process", { timeout: 30_000 }, async () => {
    const db = tempDbPath();
    const tsxBin = join(process.cwd(), "..", "node_modules", ".bin", "tsx");
    const mainPath = join(process.cwd(), "src", "cli", "main.ts");
    const templatesDir = join(process.cwd(), "templates");

    const created = await execFileAsync(tsxBin, [
      mainPath,
      "create",
      "--db",
      db,
      "--task",
      "smoke",
      "--templates-dir",
      templatesDir,
    ]);
    const createdDoc = JSON.parse(created.stdout.trim()) as { instanceId: string; kind: string };
    expect(createdDoc.kind).toBe("created");

    const started = await execFileAsync(tsxBin, [
      mainPath,
      "start",
      createdDoc.instanceId,
      "--db",
      db,
      "--templates-dir",
      templatesDir,
    ]);
    const doc = JSON.parse(started.stdout.trim()) as { instanceId: string; version: number };
    expect(doc.version).toBe(2);

    const detail = await execFileAsync(tsxBin, [mainPath, "detail", doc.instanceId, "--db", db]);
    const parsed = JSON.parse(detail.stdout.trim()) as { instance: { task: string } };
    expect(parsed.instance.task).toBe("smoke");
  });
});

// ── packet ch11-P1: the operator submit role flag (matrix O, dimension 10) ──

describe("submit --expected-role (packet ch11-P1, O1/O2)", () => {
  it("O1: submit WITHOUT --expected-role → MissingSubmitFlags usage error naming the quartet", async () => {
    const db = tempDbPath();
    const deps = testDeps();
    const id = await startOne(db, deps);
    const result = await run(
      ["submit", "--db", db, "--instance", id, "--type", "PASS", "--expected-version", "2"],
      deps,
    );
    const error = errorDoc(result);
    expect(result.code).toBe(EXIT.usage);
    expect(error.name).toBe("MissingSubmitFlags");
    expect(error.message).toBe(
      "--instance, --type, --expected-version and --expected-role are required",
    );
  });

  it("O2: a WRONG role rides stdout as a role_not_authorized outcome data row (kernel authority; exit per the outcome matrix)", async () => {
    const db = tempDbPath();
    const deps = testDeps();
    const id = await startOne(db, deps);
    const wrongRole = await run(
      ["submit", "--db", db, "--instance", id, "--type", "PASS", "--expected-version", "2", "--expected-role", "reviewer", "--payload", '{"ref":"d"}'],
      deps,
    );
    expect(wrongRole.code).toBe(EXIT.notFound);
    expect(JSON.parse(wrongRole.stdout[0] ?? "")).toEqual({
      kind: "rejected",
      reason: "role_not_authorized",
    });
    expect(wrongRole.stderr).toEqual([]);
  });
});

// ── packet ch11-P4: Y6 the eager required-context start pre-check + the
// gate-defective write-lane drive ──────────────────────────────────────

describe("cli — ch12-P4 V6: the spec-declaring-template unstartable lane + the C25 P4-deferral retirement", () => {
  it("a residual `runtimeContext: required` template → the R2 admission migration refusal at CREATE", async () => {
    // A bare `required` string is refused by admission's migration (R2) at
    // template load — CREATE pre-loads the template, so the refusal surfaces
    // as the canonical TemplateInvalid doc.
    const dir = stageTemplates({
      "local-pair-v0@1.yaml": `${CANONICAL_BYTES()}runtimeContext: required\n`,
    });
    const db = tempDbPath();
    const res = await run(
      ["create", "--db", db, "--task", "t", "--templates-dir", dir],
      testDeps(),
    );
    expect(res.code).not.toBe(EXIT.ok);
    expect(JSON.stringify(res)).toMatch(/retired|spec map/);
  });

  it("a FILE-authored spec-map template naming an UNREGISTERED provider → start → Rejected(runtime_context_provider_unavailable) exit 3 (the resolution lane survives; ch9-P2 T1 re-base)", async () => {
    // ch12-P4 Claim 6 item 4 / V6 (the C25 P4-deferral RETIRED): a
    // YAML-authored runtimeContext spec map is MATERIALIZED by F3 and ADMITS.
    // `start` then resolves the provider against the production registry — the
    // ch9-P2 T1 re-base: `pairflow.worktree` is now REGISTERED (it would
    // provision), so this lane names an UNREGISTERED provider to keep the
    // name-resolution-failure lane driven. The premise moved off the
    // production registry's emptiness (registration flipped it).
    const dir = stageTemplates({
      "local-pair-v0@1.yaml": `${CANONICAL_BYTES()}runtimeContext:\n  kind: worktree\n  provider: pairflow.unregistered\n`,
    });
    const db = tempDbPath();
    const deps = testDeps();
    const created = await run(
      ["create", "--db", db, "--task", "t", "--templates-dir", dir],
      deps,
    );
    expect(created.code).toBe(EXIT.ok);
    const id = (JSON.parse(created.stdout[0] ?? "") as { instanceId: string }).instanceId;

    const started = await run(["start", id, "--db", db, "--templates-dir", dir], deps);
    // The kernel-negative rejection rides as a DATA doc on stdout, exit 3.
    expect(started.code).toBe(EXIT.notFound);
    expect(started.stderr).toEqual([]);
    expect(JSON.parse(started.stdout[0] ?? "")).toEqual({
      kind: "rejected",
      reason: "runtime_context_provider_unavailable",
    });
  });

  it("create on a template with an unbound role → usage 2 CreateFailed (the binding-coverage guard, migrated from the retired bridge)", async () => {
    // The reviewer role carries NO defaultActor and no override is passed —
    // CREATE's coverage REQUIRE throws, and `create` maps the "create failed
    // (binding coverage)" prefix to usage 2 (the migrated guard; the 2-vs-1
    // exit split preserved).
    // ch13-p1b: only the `defaultActor` line is removed. The role's
    // catalog ref STAYS — dropping it would leave the shipped entry
    // unreferenced, and the document would fail p1a's hygiene lane
    // instead of reaching the binding-coverage guard under test.
    const dir = stageTemplates({
      "local-pair-v0@1.yaml": CANONICAL_BYTES().replace(
        "  reviewer:\n    defaultActor: claude\n",
        "  reviewer:\n",
      ),
    });
    const db = tempDbPath();
    const res = await run(
      ["create", "--db", db, "--task", "t", "--templates-dir", dir],
      testDeps(),
    );
    const err = errorDoc(res);
    expect(res.code).toBe(EXIT.usage);
    expect(err.name).toBe("CreateFailed");
    expect(err.class).toBe("usage");
    expect(err.message).toMatch(/create failed \(binding coverage\): role 'reviewer'/);
  });

  it("a context-FREE template creates and starts normally (the no-throw baseline)", async () => {
    // The default deps ride the repo canonical template (context-free). A
    // clean create→start reaches ACTIVE with the `activated` outcome.
    const db = tempDbPath();
    const deps = testDeps();
    const created = await run(["create", "--db", db, "--task", "t"], deps);
    expect(created.code).toBe(EXIT.ok);
    const id = (JSON.parse(created.stdout[0] ?? "") as { instanceId: string }).instanceId;
    const started = await run(["start", id, "--db", db], deps);
    expect(started.code).toBe(EXIT.ok);
    expect((JSON.parse(started.stdout[0] ?? "") as { kind: string }).kind).toBe("activated");
  });
});

describe("cli — the gate-defective write-lane drive (packet ch11-P4 → ch12-P4)", () => {
  // ch14-p3b: the review step's CONVERGED edge retargets at the gate, so
  // the anchor this defect is spliced onto is RE-PINNED to the shipped
  // bytes. A stale anchor would silently splice nothing and leave the
  // lane asserting against a VALID template.
  const gateDefective = `${CANONICAL_BYTES()}`
    .replace(
      "    transitions:\n      PASS: implement\n      CONVERGED: human_approval\n",
      "    transitions:\n      PASS: implement\n      CONVERGED: human_approval\n" +
        "    gates:\n      CONVERGED:\n        - uses: no.such.gate\n",
    );

  it("create on a gate-defective template → TemplateInvalid 1 with the coded finding in the VERBATIM {stage, findings} doc", async () => {
    const dir = stageTemplates({ "local-pair-v0@1.yaml": gateDefective });
    const res = await run(
      ["create", "--db", tempDbPath(), "--task", "t", "--templates-dir", dir],
      testDeps(),
    );
    const err = errorDoc(res);
    expect(res.code).toBe(EXIT.internal);
    expect(err.name).toBe("TemplateInvalid");
    const details = err.details as { stage: string; findings: unknown[] };
    expect(details.stage).toBe("validate");
    // the doc SHAPE is byte-unchanged in kind; only the finding CONTENT is
    // new (a coded gate lane surfacing through the SAME {stage, findings}
    // carrier the ch8 W-lane already tests).
    expect(JSON.stringify(details.findings)).toContain("gate_evaluator_unavailable");
    expect(JSON.stringify(details.findings)).toContain("steps.review.gates.CONVERGED[0]");
  });

  // ── packet ch13-p1b (D11 / family 11): code EXCLUSIVITY over this
  // packet's own surface. THE PREMISE IS NAMED: this packet mints no lane
  // and no finding at all, so a document "failing through its lanes" is
  // unconstructible — the carrier is a validate document failing on the
  // ch13 lane p1a already ships. p1a's own lane discharges the "only the
  // ch13 finding carries a code" direction over its whole lane inventory
  // and is asserted unchanged rather than re-driven; what is owed HERE is
  // the negative over the OPERATOR entrypoint's documents, which are what
  // this packet grows.
  it("ch13-p1b: the operator document gains NO code from anything below the ch13 lane", async () => {
    // One role's ref is redirected at an undeclared id; the other role
    // keeps the shipped ref, so the entry stays referenced and the ONLY
    // coded finding is the resolution lane's.
    const refDefective = CANONICAL_BYTES().replace(
      "  reviewer:\n    defaultActor: claude\n    defaultAgentConfig:\n      promptConcernRefs:\n        - emit-envelope\n",
      "  reviewer:\n    defaultActor: claude\n    defaultAgentConfig:\n      promptConcernRefs:\n        - no-such-block\n",
    );
    expect(refDefective).not.toBe(CANONICAL_BYTES());
    const dir = stageTemplates({ "local-pair-v0@1.yaml": refDefective });
    const result = await run(
      ["create", "--db", tempDbPath(), "--task", "t", "--templates-dir", dir],
      testDeps(),
    );
    const err = errorDoc(result);
    const details = err.details as { stage: string; findings: { code?: string }[] };
    expect(details.stage).toBe("validate");
    const codes = details.findings.map((f) => f.code).filter((c) => c !== undefined);
    // EXACTLY the ratified ch13 code — nothing this packet ships adds a
    // second one, and the render mints none at all. The gate lane above
    // is the DISCRIMINATING positive that keeps this from passing by a
    // tree-wide code famine.
    expect(codes).toEqual(["unresolved_context_block_ref"]);
  });

  it("ch13-p1b: the gate schemas' named lane still carries its code IN THE CODE FIELD", () => {
    // The half that keeps the negative above from passing by a tree-wide
    // code famine — and it is asserted at the MACHINE shape, not by
    // finding the token anywhere in the serialized document: a lane that
    // lost its `code` attribute while keeping the word in its message
    // would satisfy a containment check and prove nothing.
    const dir = stageTemplates({ "local-pair-v0@1.yaml": gateDefective });
    return run(
      ["create", "--db", tempDbPath(), "--task", "t", "--templates-dir", dir],
      testDeps(),
    ).then((res) => {
      const details = errorDoc(res).details as { findings: { code?: string }[] };
      expect(details.findings.map((f) => f.code)).toEqual(["gate_evaluator_unavailable"]);
    });
  });
});

// ── packet ch12-P4: the four lifecycle verbs — the CLI input-precondition
// lanes (V2) + the kernel-outcome exit classes (V3) + the mode/run-overrides
// realizations (V5) ─────────────────────────────────────────────────────

describe("cli — create input-precondition lanes (packet ch12-P4, V2)", () => {
  it("a `--mode` non-member token → usage 2 (refused CLI-side BEFORE the kernel — the sensitivity lane)", async () => {
    const res = await run(["create", "--db", tempDbPath(), "--task", "t", "--mode", "eager"], testDeps());
    const err = errorDoc(res);
    expect(res.code).toBe(EXIT.usage);
    expect(err.name).toBe("InvalidMode");
  });

  for (const [label, value] of [
    ["malformed JSON", "{bad"],
    ["valid JSON that is not a map", "[1,2]"],
    ["a map with a non-map entry", '{"implement":5}'],
    ["a non-canonical-JSON-safe leaf (1e999 → Infinity)", '{"implement":{"budget":1e999}}'],
  ] as const) {
    it(`a \`--run-overrides\` ${label} → usage 2`, async () => {
      const res = await run(
        ["create", "--db", tempDbPath(), "--task", "t", "--run-overrides", value],
        testDeps(),
      );
      const err = errorDoc(res);
      expect(res.code).toBe(EXIT.usage);
      expect(err.name).toBe("InvalidRunOverrides");
    });
  }

  it("a well-formed `--run-overrides` snapshots onto the instance (an unknown step-id is INERT — no rejection lane, the D5 conscious debt)", async () => {
    const db = tempDbPath();
    const deps = testDeps();
    // An unknown step-id `ghost-step` is INERT kernel-side — create still
    // succeeds (no CLI rejection lane; the conscious-debt disposition).
    const res = await run(
      ["create", "--db", db, "--task", "t", "--run-overrides", '{"implement":{"approach":"tdd"},"ghost-step":{"x":1}}'],
      deps,
    );
    expect(res.code).toBe(EXIT.ok);
    const id = (JSON.parse(res.stdout[0] ?? "") as { instanceId: string }).instanceId;
    // The snapshot is frozen on the instance at genesis (C9).
    const detail = await run(["detail", id, "--db", db], deps);
    const doc = JSON.parse(detail.stdout[0] ?? "") as {
      instance: { runOverrides: Record<string, unknown> };
    };
    expect(doc.instance.runOverrides).toEqual({
      implement: { approach: "tdd" },
      "ghost-step": { x: 1 },
    });
  });
});

describe("cli — create kernel-outcome lanes (packet ch12-P4, V3/V5)", () => {
  it("immediate create WITHOUT --task → Rejected(task_required) DATA doc, exit 3", async () => {
    const res = await run(["create", "--db", tempDbPath()], testDeps());
    expect(res.code).toBe(EXIT.notFound);
    expect(res.stderr).toEqual([]);
    expect(JSON.parse(res.stdout[0] ?? "")).toEqual({ kind: "rejected", reason: "task_required" });
  });

  it("--mode deferredKickoff create WITHOUT --task → Created (task-less legal), exit 0", async () => {
    const res = await run(["create", "--db", tempDbPath(), "--mode", "deferredKickoff"], testDeps());
    expect(res.code).toBe(EXIT.ok);
    const doc = JSON.parse(res.stdout[0] ?? "") as { kind: string; instanceId: string };
    expect(doc.kind).toBe("created");
    expect(doc.instanceId).not.toBe("");
  });
});

describe("cli — kickoff / cancel lanes (packet ch12-P4, V3)", () => {
  it("kickoff WITHOUT --task → usage 2 MissingTask", async () => {
    const db = tempDbPath();
    const res = await run(["kickoff", "inst-x", "--db", db], testDeps());
    const err = errorDoc(res);
    expect(res.code).toBe(EXIT.usage);
    expect(err.name).toBe("MissingTask");
  });

  it("kickoff / cancel / start of an UNKNOWN instance → Rejected(unknown_instance) DATA doc, exit 3 (a write-path kernel-negative, NOT a read-side notFound)", async () => {
    const db = tempDbPath();
    const deps = testDeps();
    for (const argv of [
      ["start", "ghost", "--db", db],
      ["kickoff", "ghost", "--db", db, "--task", "t"],
      ["cancel", "ghost", "--db", db],
    ]) {
      const res = await run(argv, deps);
      expect(res.code).toBe(EXIT.notFound);
      expect(res.stderr).toEqual([]);
      expect(JSON.parse(res.stdout[0] ?? "")).toEqual({
        kind: "rejected",
        reason: "unknown_instance",
      });
    }
  });

  it("cancel of a non-terminal run → TERMINAL(cancelled) exit 0; a SECOND cancel of the now-terminal run → state_violation THROW, internal 1", async () => {
    const db = tempDbPath();
    const deps = testDeps();
    const id = await startOne(db, deps);

    const cancelled = await run(["cancel", id, "--db", db], deps);
    expect(cancelled.code).toBe(EXIT.ok);
    expect(JSON.parse(cancelled.stdout[0] ?? "")).toEqual({
      kind: "terminated",
      disposition: "cancelled",
    });

    // The terminal-sink guard: cancel of an already-TERMINAL run is an
    // INTEGRITY THROW (exit-1 internal), NOT an exit-3 business rejection.
    const again = await run(["cancel", id, "--db", db], deps);
    assertErrorContract(again, "internal", EXIT.internal);
    expect(again.stdout).toEqual([]);
  });

  it("a replayed CANCEL op_id → Duplicate idempotent-success, exit 0", async () => {
    const db = tempDbPath();
    // A fixed nonce makes two cancels derive the SAME op_id — the second is a
    // Duplicate (idempotent success), not a fresh commit.
    const id = await startOne(db, testDeps());
    const deps = testDeps({ nonce: () => "nonce-fixed" });
    const first = await run(["cancel", id, "--db", db], deps);
    expect(first.code).toBe(EXIT.ok);
    expect((JSON.parse(first.stdout[0] ?? "") as { kind: string }).kind).toBe("terminated");
    const second = await run(["cancel", id, "--db", db], deps);
    expect(second.code).toBe(EXIT.ok);
    expect((JSON.parse(second.stdout[0] ?? "") as { kind: string }).kind).toBe("duplicate");
  });

  it("a replayed START op_id → Duplicate idempotent-success, exit 0 (the grid's start/replayed-op_id cell)", async () => {
    const db = tempDbPath();
    const deps = testDeps();
    // create with fresh deps; the two STARTs share a FIXED nonce → the same
    // op_id, so the second start is a Duplicate (not a fresh activation).
    const created = await run(["create", "--db", db, "--task", "t"], deps);
    expect(created.code).toBe(EXIT.ok);
    const id = (JSON.parse(created.stdout[0] ?? "") as { instanceId: string }).instanceId;
    const fixed = testDeps({ nonce: () => "nonce-start-fixed" });
    const first = await run(["start", id, "--db", db], fixed);
    expect(first.code).toBe(EXIT.ok);
    expect((JSON.parse(first.stdout[0] ?? "") as { kind: string }).kind).toBe("activated");
    const second = await run(["start", id, "--db", db], fixed);
    expect(second.code).toBe(EXIT.ok);
    expect((JSON.parse(second.stdout[0] ?? "") as { kind: string }).kind).toBe("duplicate");
  });

  it("kickoff of an already-TERMINAL run → state_violation THROW, internal 1 (the terminal-sink guard on kickoff — distinct from cancel-sink)", async () => {
    const db = tempDbPath();
    const deps = testDeps();
    const id = await startOne(db, deps); // create→start (immediate) ⇒ ACTIVE
    const cancelled = await run(["cancel", id, "--db", db], deps);
    expect(cancelled.code).toBe(EXIT.ok); // ⇒ TERMINAL(cancelled)
    // kickoff on a TERMINAL run: not WAITING(kickoff_pending) → the hold-guard
    // state_violation THROW → exit-1 internal (NOT an exit-3 rejection).
    const kicked = await run(["kickoff", id, "--db", db, "--task", "t"], deps);
    assertErrorContract(kicked, "internal", EXIT.internal);
    expect(kicked.stdout).toEqual([]);
  });

  it("NO `stale` lane surfaces from the lifecycle verbs (a CAS conflict retries in-loop — a driven non-occurrence)", async () => {
    const db = tempDbPath();
    const deps = testDeps();
    // Drive the full create→start→kickoff-attempt→cancel surface and collect
    // every lifecycle outcome kind; `stale` (an actor-`Outcome` kind) must
    // NEVER appear — it is absent from the lifecycle unions (retries in-loop).
    const kinds: string[] = [];
    const record = (r: Run): void => {
      if (r.stdout[0] !== undefined) kinds.push((JSON.parse(r.stdout[0]) as { kind: string }).kind);
    };
    const created = await run(["create", "--db", db, "--mode", "deferredKickoff"], deps);
    record(created);
    const id = (JSON.parse(created.stdout[0] ?? "") as { instanceId: string }).instanceId;
    record(await run(["start", id, "--db", db], deps)); // accepted (held)
    record(await run(["kickoff", id, "--db", db, "--task", "t"], deps)); // activated
    record(await run(["cancel", id, "--db", db], deps)); // terminated
    expect(kinds).toEqual(["created", "accepted", "activated", "terminated"]);
    expect(kinds).not.toContain("stale");
  });
});

// ─────────────────────────────────────────────────────────────────────
// FAMILY 13's DOCUMENT LANE (packet ch14-p2b, Q16)
//
// The shipped CLI's timeline/tail/detail documents reach the two new
// classes by CONTENT REACHABILITY: those documents serialize the floor's
// rows WHOLE, so the classes reach them with NO CLI code change. The
// renderer rule requires naming them on that ground rather than on "this
// packet edits no CLI file" — and requires DRIVING it rather than
// asserting it, which is what this lane does.
// ─────────────────────────────────────────────────────────────────────

describe("cli — the two operator classes survive the shipped documents WHOLE (family 13)", () => {
  /** Seed a store directly with both new classes, then read it through
   * the CLI's own verbs. */
  async function seedOperatorRows(db: string): Promise<string> {
    const handle = openStore(db, createControlledClock(1_000));
    const id = "inst-ops";
    await handle.store.createInstance({
      instanceId: id,
      templateRef: { id: "local-pair-v0", version: 1 },
      task: "t",
      binding: { implementer: "codex", reviewer: "claude" },
      currentStep: "gate",
      round: 1,
      kernelStatus: "WAITING",
      terminalDisposition: null,
      activationMode: "immediate",
      wait: {
        kind: "human_decision",
        requestedBy: "gate",
        resumeEvents: ["approve"],
        requestRef: "R-1",
      },
      runtimeContext: { state: "ready", ref: null },
      failureReason: null,
      runOverrides: {},
      version: 1,
    });
    const arrival = {
      newCurrentStep: "commit_wait",
      newRound: 1,
      newKernelStatus: "WAITING",
      newTerminalDisposition: null,
      newWait: { kind: "commit_pending", requestedBy: "commit_wait", resumeEvents: ["COMMIT"] },
      issuedAgentConfig: {},
    } as unknown as Parameters<
      ReturnType<typeof openStore>["store"]["commitOperatorEntry"]
    >[0]["arrival"];
    await handle.store.commitOperatorEntry({
      instanceId: id,
      expectedVersion: 1,
      entry: {
        kind: "DECISION_MADE",
        opId: "d1",
        body: {
          decision: "request_rework",
          payload: { instruction: "operator text" },
          by: "human-1",
          requestRef: "R-1",
          override: true,
        },
      },
      arrival,
    });
    await handle.store.commitOperatorEntry({
      instanceId: id,
      expectedVersion: 2,
      entry: {
        kind: "WAIT_RESUMED",
        opId: "r1",
        body: { kind: "commit_pending", event: "COMMIT" },
      },
      arrival,
    });
    handle.close();
    return id;
  }

  it("timeline carries both classes with their kind VISIBLE and their fields whole", async () => {
    const db = tempDbPath();
    const deps = testDeps();
    const id = await seedOperatorRows(db);
    const timeline = await run(["timeline", id, "--db", db], deps);
    expect(timeline.code).toBe(EXIT.ok);
    const rows = JSON.parse(timeline.stdout[0] ?? "") as Record<string, unknown>[];
    expect(rows.map((r) => r["entryKind"])).toEqual(["DECISION_MADE", "WAIT_RESUMED"]);
    expect(rows[0]).toEqual({
      entryKind: "DECISION_MADE",
      seq: 1,
      opId: "d1",
      decision: "request_rework",
      payload: { instruction: "operator text" },
      by: "human-1",
      requestRef: "R-1",
      override: true,
      committedAt: 1_000,
    });
    expect(rows[1]).toEqual({
      entryKind: "WAIT_RESUMED",
      seq: 2,
      opId: "r1",
      kind: "commit_pending",
      event: "COMMIT",
      committedAt: 1_000,
    });
  });

  it("detail carries both classes too — the SAME rows through the other document", async () => {
    const db = tempDbPath();
    const deps = testDeps();
    const id = await seedOperatorRows(db);
    const detail = await run(["detail", id, "--db", db], deps);
    expect(detail.code).toBe(EXIT.ok);
    const doc = JSON.parse(detail.stdout[0] ?? "") as {
      transcript: Record<string, unknown>[];
    };
    expect(doc.transcript.map((r) => r["entryKind"])).toEqual([
      "DECISION_MADE",
      "WAIT_RESUMED",
    ]);
    expect(doc.transcript[0]?.["decision"]).toBe("request_rework");
    expect(doc.transcript[1]?.["event"]).toBe("COMMIT");
  });

  it("NO field is added, removed or re-keyed on any emitted document — the shape is unchanged", async () => {
    // The CLI/human-payload half of the escalation walk, driven rather
    // than asserted: the documents grow new ROWS, never new columns.
    const db = tempDbPath();
    const deps = testDeps();
    const id = await startOne(db, deps);
    await run(
      ["submit", "--db", db, "--instance", id, "--type", "PASS", "--expected-version", "2", "--expected-role", "implementer"],
      deps,
    );
    const timeline = await run(["timeline", id, "--db", db], deps);
    const rows = JSON.parse(timeline.stdout[0] ?? "") as Record<string, unknown>[];
    // The pre-existing classes' key sets are byte-unmoved.
    expect(Object.keys(rows[0] ?? {}).sort()).toEqual(
      ["committedAt", "entryKind", "opId", "seq"].sort(),
    );
    expect(Object.keys(rows[1] ?? {}).sort()).toEqual(
      [
        "committedAt",
        "entryKind",
        "envelope",
        "gateDecisions",
        "issuedAgentConfig",
        "payloadDigest",
        "seq",
      ].sort(),
    );
  });
});

// ── packet ch14-p3a: the operator's two verbs and the read that feeds them ──

/**
 * The STAGED gate template (J1): a `humanGate` reachable from an agent
 * step whose PASS edge RECOMMENDS `approve`, plus a bare `wait` whose
 * declared resume events cover all three post-admission answers — a
 * routed one (`COMMIT`), a re-parking one (`REPARK`, which keeps the
 * non-collision lane drivable), and a DECLARED-but-UNROUTED one
 * (`ABANDON`), which is what keeps `no_resume_transition` reachable.
 *
 * Staged rather than shipped: `local-pair-v0` declares no gate until
 * ch14-p3b, and this packet's boundary carries neither that file nor the
 * shared fixture.
 */
const GATED_TEMPLATE_YAML = `ref:
  id: gated-v0
  version: 1
start: implement
steps:
  implement:
    role: implementer
    instruction: |-
      build it
    transitions:
      PASS: gate
    recommends:
      PASS: approve
  gate:
    type: humanGate
    role: operator
    instruction: |-
      approve it?
    decisions:
      approve:
        target: hold
      again:
        target: gate
      finish:
        target: done
      rework:
        target: implement
        payload:
          instruction:
            required: true
          refs:
            required: false
  hold:
    type: wait
    wait:
      kind: commit_pending
      resumeEvents:
        - COMMIT
        - REPARK
        - ABANDON
    onResume:
      COMMIT: done
      REPARK: hold
terminal:
  - done
roles:
  implementer:
    defaultActor: codex
  operator:
    defaultActor: human-1
`;

function stagedTemplatesDir(body: string = GATED_TEMPLATE_YAML): string {
  const dir = mkdtempSync(join(tmpdir(), "v3-p3a-tpl-"));
  dirs.push(dir);
  writeFileSync(join(dir, "gated-v0@1.yaml"), body);
  return dir;
}

/** A dir that LISTS but yields no matching file — C27's `null` shape. */
function emptyTemplatesDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "v3-p3a-empty-"));
  dirs.push(dir);
  return dir;
}

/**
 * Nonces are GLOBALLY unique across these lanes by default: two deps
 * objects over the same store would otherwise mint the same `op_id` and
 * every second write would answer `op_id_collision`. The collision lanes
 * PIN the source deliberately, which is exactly the distinction family 8
 * says the two idempotency halves must keep apart.
 */
let p3aNonce = 0;

function gatedDeps(templatesDir: string, options: TestDepsOptions = {}): CliDeps {
  return testDeps({
    nonce: () => `p3a-${String((p3aNonce += 1))}`,
    ...options,
    env: { PAIRFLOW_V3_TEMPLATES: templatesDir },
  });
}

/** A nonce source that is unique UNTIL pinned — the collision and replay
 * lanes pin it for exactly the invocations whose op id must repeat. */
function pinnableNonce(): { source: () => string; pin: (value: string | null) => void } {
  let pinned: string | null = null;
  return {
    source: () => pinned ?? `p3a-${String((p3aNonce += 1))}`,
    pin: (value) => {
      pinned = value;
    },
  };
}

/**
 * THE RACE V2 DESCRIBES, made stageable: the FLOOR read sees committed
 * state and the KERNEL's own `loadInstance` — a strictly later read —
 * sees the instance as a concurrent move left it. This is the ONLY way
 * the three race-reachable answers (`stale`, `not_awaiting_decision`,
 * `decision_request_mismatch`) are drivable from this surface at all;
 * the non-raced cases are answered by V4 before the kernel is reached.
 */
function racedStore(map: (instance: WorkflowInstance) => WorkflowInstance): CliDeps["openStore"] {
  return (path, time) => {
    const handle = openStore(path, time);
    return {
      ...handle,
      store: {
        ...handle.store,
        loadInstance: async (id) => {
          const loaded = await handle.store.loadInstance(id);
          return loaded === null ? null : map(loaded);
        },
      },
    };
  };
}

/** Counts the FLOOR/store detail reads an invocation performs (V2/V9). */
function countingStore(counter: { reads: number }): CliDeps["openStore"] {
  return (path, time) => {
    const handle = openStore(path, time);
    return {
      ...handle,
      store: {
        ...handle.store,
        getInstanceDetail: (id) => {
          counter.reads += 1;
          return handle.store.getInstanceDetail(id);
        },
      },
    };
  };
}

/** create → start → PASS: the run lands PARKED at the human gate. */
async function parkedRun(db: string, deps: CliDeps, templatesDir: string): Promise<string> {
  const created = await run(
    ["create", "--db", db, "--task", "decide it", "--template", "gated-v0@1",
     "--override", "operator=decider-7", "--templates-dir", templatesDir],
    deps,
  );
  expect(created.code).toBe(EXIT.ok);
  const id = (JSON.parse(created.stdout[0] ?? "") as { instanceId: string }).instanceId;
  expect((await run(["start", id, "--db", db, "--templates-dir", templatesDir], deps)).code)
    .toBe(EXIT.ok);
  const passed = await run(
    ["submit", "--db", db, "--instance", id, "--type", "PASS", "--expected-version", "2",
     "--expected-role", "implementer", "--templates-dir", templatesDir],
    deps,
  );
  expect(passed.code).toBe(EXIT.ok);
  expect(JSON.parse(passed.stdout[0] ?? "")).toMatchObject({ kind: "committed", version: 3 });
  return id;
}

/** A verb's DATA answer: exactly one stdout document, nothing on stderr. */
function dataDoc(result: Run): Record<string, unknown> {
  expect(result.stderr).toEqual([]);
  expect(result.stdout).toHaveLength(1);
  return JSON.parse(result.stdout[0] ?? "") as Record<string, unknown>;
}

type SubmitReason = Extract<SubmitDecisionOutcome, { kind: "rejected" }>["reason"];
type ResumeReason = Extract<ResumeWaitOutcome, { kind: "rejected" }>["reason"];

/**
 * Family 4's membership owner is the UNION ITSELF, not a hand-copied
 * list: `Record<Reason, …>` is total, so a token added to
 * `domain/outcome.ts` later arrives here WITHOUT a lane and the
 * derivation is what notices — a compile error, not a silent gap.
 *
 * `gated-out` is V6's exclusion set, and each of its members carries the
 * reason it cannot surface. Every other token is DRIVEN end-to-end.
 */
const SUBMIT_REASONS: Record<SubmitReason, "driven" | "gated-out"> = {
  unknown_instance: "gated-out", // V4 (i) answers it before the kernel
  missing_version: "gated-out", // no --expected-version flag exists (V2)
  op_id_collision: "driven",
  not_awaiting_decision: "driven", // race-only, and the race is staged
  decision_request_mismatch: "driven", // race-only, and the race is staged
  operator_not_authorized: "driven",
  unknown_decision: "driven",
  missing_required_field: "driven",
  override_required: "driven",
  override_not_applicable: "driven",
};

const RESUME_REASONS: Record<ResumeReason, "driven" | "gated-out"> = {
  unknown_instance: "gated-out",
  missing_version: "gated-out",
  op_id_collision: "driven",
  not_waiting: "driven",
  resume_event_mismatch: "driven",
  not_bare_wait: "driven",
  no_resume_transition: "driven",
};

function drivenReasons(table: Record<string, "driven" | "gated-out">): string[] {
  return Object.keys(table).filter((k) => table[k] === "driven").sort();
}

describe("cli — ch14-p3a family 1/3/10: the detail document under every derivability state", () => {
  it("carries pendingDecision for a parked run, and grows by EXACTLY that one key", async () => {
    const db = tempDbPath();
    const dir = stagedTemplatesDir();
    const deps = gatedDeps(dir);
    const id = await parkedRun(db, deps, dir);

    const parked = await run(["detail", id, "--db", db, "--templates-dir", dir], deps);
    const doc = dataDoc(parked);
    expect(parked.code).toBe(EXIT.ok);
    // PER SURFACE, PER STATE, against a CLOSED literal keyset (F7).
    expect(Object.keys(doc).sort()).toEqual([
      "instance",
      "pendingDecision",
      "runner",
      "transcript",
    ]);
    const ask = doc["pendingDecision"] as Record<string, unknown>;
    expect(Object.keys(ask).sort()).toEqual([
      "allowedDecisions",
      "context",
      "decisionRequirements",
      "expectedVersion",
      "instanceId",
      "operator",
      "question",
      "recommendation",
      "requestRef",
    ]);
    expect(ask["operator"]).toBe("decider-7");
    expect(ask["recommendation"]).toBe("approve");
    expect(ask["allowedDecisions"]).toEqual(["approve", "again", "finish", "rework"]);
  });

  it("emits the WHOLE document with the member ABSENT for all THREE underivable conditions — and adds NO key", async () => {
    const db = tempDbPath();
    const dir = stagedTemplatesDir();
    const deps = gatedDeps(dir);
    const id = await parkedRun(db, deps, dir);
    const malformed = stagedTemplatesDir("ref:\n  id: gated-v0\n  version: 1\nstart: nope\n");

    const lanes: readonly (readonly [string, readonly string[], CliDeps])[] = [
      // (1) the dependency is NULL — no dir configured anywhere
      ["dependency-null", ["detail", id, "--db", db], testDeps({ env: {} })],
      // (2) the dependency is WIRED and the load returns null
      ["wired-and-null", ["detail", id, "--db", db, "--templates-dir", emptyTemplatesDir()], deps],
      // (3) the dependency is WIRED and the load REJECTS — V9's recovery read
      ["wired-and-throws", ["detail", id, "--db", db, "--templates-dir", malformed], deps],
    ];
    // THE BASELINE the "existing members intact" half is measured
    // against: the SAME committed state read where the member IS
    // derivable. A keyset pin does not see a CHANGED VALUE under an
    // unchanged key, so without this a recovery path that rewrote the
    // transcript, the runner section or any other instance field would
    // stay green.
    const derivable = dataDoc(await run(["detail", id, "--db", db, "--templates-dir", dir], deps));

    let firstDoc: Record<string, unknown> | null = null;
    for (const [lane, argv, laneDeps] of lanes) {
      const result = await run(argv, laneDeps);
      expect(result.code, lane).toBe(EXIT.ok);
      const doc = dataDoc(result);
      // ONE whole document, its existing members intact…
      expect(Object.keys(doc).sort(), lane).toEqual(["instance", "runner", "transcript"]);
      // …the member ABSENT rather than valued…
      expect("pendingDecision" in doc, lane).toBe(false);
      // …and `wait.kind` STILL READABLE beside it: the pair of fields is
      // what separates "not parked" from "parked but unyielded" (C27).
      expect((doc["instance"] as { wait: { kind: string } }).wait.kind, lane).toBe(
        "human_decision",
      );
      // WHOLE-VALUE, member by member, against the derivable baseline —
      // the half the keyset pin cannot carry.
      expect(doc["instance"], lane).toStrictEqual(derivable["instance"]);
      expect(doc["transcript"], lane).toStrictEqual(derivable["transcript"]);
      expect(doc["runner"], lane).toStrictEqual(derivable["runner"]);
      // …and the three arms are ONE AND THE SAME document: V9's recovery
      // read "composes NOTHING EXTRA", which is a claim about the whole
      // value and not about a keyset.
      if (firstDoc === null) {
        firstDoc = doc;
      } else {
        expect(doc, lane).toStrictEqual(firstDoc);
      }
    }
    // …and the derivable document differs from them by EXACTLY the one
    // member, which keeps the equalities above from being satisfiable by
    // a build that emitted the same degraded document everywhere.
    expect(Object.keys(derivable).sort()).toEqual([
      "instance",
      "pendingDecision",
      "runner",
      "transcript",
    ]);
  });

  it("family 10: the emitted `detail` keyset is CLOSED in EVERY state — ACTIVE, parked-derivable, parked-underivable, a NON-decision WAIT, and TERMINAL", async () => {
    const dir = stagedTemplatesDir();
    const db = tempDbPath();
    const deps = gatedDeps(dir);
    // The CLOSED literal, PER STATE. A whole-keyset pin run only on the
    // derivable and parked-underivable states cannot see a SECOND
    // explanatory key that appears only in a non-decision WAITING or a
    // TERMINAL document — the states no lane read at all.
    const CLOSED = ["instance", "runner", "transcript"];
    const keysetOf = async (target: string, templatesDir = dir): Promise<string[]> =>
      Object.keys(
        dataDoc(await run(["detail", target, "--db", db, "--templates-dir", templatesDir], deps)),
      ).sort();

    // ACTIVE — created and started, never parked.
    const created = await run(
      ["create", "--db", db, "--task", "t", "--template", "gated-v0@1", "--templates-dir", dir],
      deps,
    );
    const activeId = (JSON.parse(created.stdout[0] ?? "") as { instanceId: string }).instanceId;
    expect((await run(["start", activeId, "--db", db, "--templates-dir", dir], deps)).code)
      .toBe(EXIT.ok);
    expect(await keysetOf(activeId), "ACTIVE").toEqual(CLOSED);

    // PARKED on a human decision, template YIELDED — the ONE state whose
    // keyset grows, and by exactly the one member.
    const id = await parkedRun(db, deps, dir);
    expect(await keysetOf(id), "parked-and-derivable").toEqual([
      "instance",
      "pendingDecision",
      "runner",
      "transcript",
    ]);
    // …the SAME state with the template UNYIELDED adds nothing.
    expect(await keysetOf(id, emptyTemplatesDir()), "parked-and-underivable").toEqual(CLOSED);

    // A NON-DECISION WAIT: `approve` routes into the `commit_pending`
    // bare wait, so the run is WAITING on a kind that is not a decision.
    expect(
      (await run(["submit-decision", id, "--db", db, "--decision", "approve",
                  "--templates-dir", dir], deps)).code,
    ).toBe(EXIT.ok);
    const waitingDoc = dataDoc(
      await run(["detail", id, "--db", db, "--templates-dir", dir], deps),
    );
    expect((waitingDoc["instance"] as { wait: { kind: string } }).wait.kind).toBe("commit_pending");
    expect(Object.keys(waitingDoc).sort(), "non-decision WAITING").toEqual(CLOSED);

    // TERMINAL: the declared resume event routes to the terminal step.
    expect(
      (await run(["resume", id, "--db", db, "--event", "COMMIT", "--templates-dir", dir], deps)).code,
    ).toBe(EXIT.ok);
    const terminalDoc = dataDoc(
      await run(["detail", id, "--db", db, "--templates-dir", dir], deps),
    );
    expect((terminalDoc["instance"] as { kernelStatus: string }).kernelStatus).toBe("TERMINAL");
    expect(Object.keys(terminalDoc).sort(), "TERMINAL").toEqual(CLOSED);
  });

  it("the read verb's ORDERING: a NOT-parked run with a REJECTING template takes ZERO loads and exactly ONE detail read", async () => {
    const db = tempDbPath();
    const dir = stagedTemplatesDir();
    const setup = gatedDeps(dir);
    const created = await run(
      ["create", "--db", db, "--task", "t", "--template", "gated-v0@1", "--templates-dir", dir],
      setup,
    );
    const id = (JSON.parse(created.stdout[0] ?? "") as { instanceId: string }).instanceId;
    expect((await run(["start", id, "--db", db, "--templates-dir", dir], setup)).code).toBe(EXIT.ok);

    // The DOCUMENT is identical either way on this cell — so the lane
    // rests on the read COUNT: an eager-load build would throw at the
    // floor and take V9's recovery read, making it two.
    const counter = { reads: 0 };
    const malformed = stagedTemplatesDir("ref:\n  id: gated-v0\n  version: 1\nstart: nope\n");
    const result = await run(
      ["detail", id, "--db", db, "--templates-dir", malformed],
      gatedDeps(malformed, { openStore: countingStore(counter) }),
    );
    expect(result.code).toBe(EXIT.ok);
    expect(counter.reads).toBe(1);
    // …and the SAME rejecting dir on a PARKED run DOES take the recovery
    // read, which is what keeps the 1 above from being vacuous.
    const parkedCounter = { reads: 0 };
    const db2 = tempDbPath();
    const id2 = await parkedRun(db2, setup, dir);
    const recovered = await run(
      ["detail", id2, "--db", db2, "--templates-dir", malformed],
      gatedDeps(malformed, { openStore: countingStore(parkedCounter) }),
    );
    expect(recovered.code).toBe(EXIT.ok);
    expect(parkedCounter.reads).toBe(2);
  });

  it("family 2b: ALL EIGHT integrity conditions reach the `internal` class on BOTH verb classes that derive", async () => {
    const db = tempDbPath();
    const dir = stagedTemplatesDir();
    const deps = gatedDeps(dir);
    const id = await parkedRun(db, deps, dir);

    // A BARE catch on the read verb would have emitted a silently
    // member-less document at exit 0 for every one of these; a caller
    // degrading only SOME of them would pass a lane that drove only one.
    // The lane asserts the STAGED PRECONDITION and the CLASS, never the
    // document `name`: all six derivation throws are bare `Error`s and
    // `name` cannot discriminate them.
    const instanceDoctor =
      (map: (detail: InstanceDetail) => InstanceDetail): CliDeps["openStore"] =>
      (path, time) => {
        const handle = openStore(path, time);
        return {
          ...handle,
          store: {
            ...handle.store,
            getInstanceDetail: async (target) => {
              const detail = await handle.store.getInstanceDetail(target);
              return detail === null ? null : map(detail);
            },
          },
        };
      };
    /** Drops a key from the GATE step of the loaded template. Dropped, not
     * authored `undefined`: under exactOptionalPropertyTypes a key authored
     * `undefined` is PRESENT, a different state from the missing one. */
    const gateWithout = (key: "role" | "instruction") => (template: AdmittedTemplate) => {
      const gate: Record<string, unknown> = { ...template.steps["gate"] };
      delete gate[key];
      // The `never` route, not `as AdmittedTemplate`: the brand's only
      // sanctioned producer is `admitTemplate`, and admission is exactly
      // what this fixture must bypass — the derivation's integrity
      // throws describe committed state an admitted value cannot express.
      return { ...template, steps: { ...template.steps, gate } } as never;
    };

    const members: readonly (readonly [
      string,
      CliDeps["openStore"] | null,
      ((template: AdmittedTemplate) => AdmittedTemplate) | null,
    ])[] = [
      // F3's TWO integrity conditions
      ["join: the wait handle names NO committed row",
       instanceDoctor((d) => ({
         ...d,
         instance: { ...d.instance, wait: { ...d.instance.wait!, requestRef: "req-never" } },
       })), null],
      ["join: the wait handle is ABSENT",
       instanceDoctor((d) => ({
         ...d,
         instance: {
           ...d.instance,
           wait: {
             kind: d.instance.wait!.kind,
             requestedBy: d.instance.wait!.requestedBy,
             resumeEvents: d.instance.wait!.resumeEvents,
           },
         },
       })), null],
      // the derivation's SIX throw sites, each at its OWN precondition
      ["derivation: a parked gate with a NULL currentStep",
       instanceDoctor((d) => ({ ...d, instance: { ...d.instance, currentStep: null } })), null],
      ["derivation: a currentStep with NO step definition",
       instanceDoctor((d) => ({ ...d, instance: { ...d.instance, currentStep: "ghost" } })), null],
      ["derivation: the step declares NO role", null, gateWithout("role")],
      ["derivation: the role is UNBOUND in instance.binding",
       instanceDoctor((d) => ({ ...d, instance: { ...d.instance, binding: {} } })), null],
      ["derivation: the step declares NO instruction", null, gateWithout("instruction")],
      ["derivation: a NULL task",
       instanceDoctor((d) => ({ ...d, instance: { ...d.instance, task: null } })), null],
    ];

    const verbs: readonly (readonly [string, readonly string[]])[] = [
      ["detail", ["detail", id, "--db", db, "--templates-dir", dir]],
      ["submit-decision",
       ["submit-decision", id, "--db", db, "--decision", "approve", "--templates-dir", dir]],
    ];

    for (const [member, storeDoctor, templateDoctor] of members) {
      for (const [verb, argv] of verbs) {
        definitionTemplateDoctor = templateDoctor;
        try {
          const result = await run(
            argv,
            gatedDeps(dir, storeDoctor === null ? {} : { openStore: storeDoctor }),
          );
          assertErrorContract(result, "internal", EXIT.internal);
          expect(result.stdout, `${verb} / ${member}`).toEqual([]);
        } finally {
          definitionTemplateDoctor = null;
        }
      }
    }

    // …and the CONTROL that keeps the eight from being vacuous: with NO
    // doctor at all the very same argv pair is a clean success on both
    // verbs, so an implementation that failed everything could not pass.
    expect((await run(verbs[0]![1], deps)).code).toBe(EXIT.ok);
    expect((await run(verbs[1]![1], deps)).code).toBe(EXIT.ok);
  });
});

describe("cli — ch14-p3a family 6: resolution failure and its ZERO side effects", () => {
  it("the SUBMIT path's four lanes: two classes, four names, and nothing committed", async () => {
    const db = tempDbPath();
    const dir = stagedTemplatesDir();
    const deps = gatedDeps(dir);
    const parkedId = await parkedRun(db, deps, dir);
    const activeDb = tempDbPath();
    const created = await run(
      ["create", "--db", activeDb, "--task", "t", "--template", "gated-v0@1",
       "--templates-dir", dir],
      deps,
    );
    const activeId = (JSON.parse(created.stdout[0] ?? "") as { instanceId: string }).instanceId;
    expect((await run(["start", activeId, "--db", activeDb, "--templates-dir", dir], deps)).code)
      .toBe(EXIT.ok);
    const malformed = stagedTemplatesDir("ref:\n  id: gated-v0\n  version: 1\nstart: nope\n");

    /**
     * THE SNAPSHOT IS PER LANE AND OVER THE LANE'S OWN TARGET. A single
     * before/after around the whole block, taken on the PARKED instance
     * alone, cannot see a write on the V4 (ii) instance — which lives in
     * a DIFFERENT database — so a `(ii)` path that WROTE and then
     * answered `NoPendingDecision` would stay green.
     */
    const observe = async (
      snapDb: string,
      snapId: string,
    ): Promise<{ instance: unknown; transcript: unknown }> => {
      const doc = dataDoc(await run(["detail", snapId, "--db", snapDb, "--templates-dir", dir], deps));
      return { instance: doc["instance"], transcript: doc["transcript"] };
    };

    /**
     * …AND (i)'S OWN TARGET IS `ghost`, WHICH IS NOT AN INSTANCE. A
     * snapshot of some OTHER instance is not this lane's target at all:
     * it would stay green through a build that CREATED `ghost` on the
     * way to reporting it unknown. What (i) can assert about its target
     * is the absence itself — the read verb answers the standing
     * not-found document on both sides — carried together with the FULL
     * instance list, which is what `ghost` is absent FROM and which
     * moves if any instance was touched.
     */
    const observeGhost = async (snapDb: string): Promise<unknown> => {
      const missing = await run(["detail", "ghost", "--db", snapDb, "--templates-dir", dir], deps);
      expect(missing.code).toBe(EXIT.notFound);
      expect(errorDoc(missing).name).toBe("UnknownInstance");
      // `list` takes no `--templates-dir` — it derives nothing.
      const listed = await run(["list", "--db", snapDb], deps);
      expect(listed.stderr).toEqual([]);
      expect(listed.code).toBe(EXIT.ok);
      return JSON.parse(listed.stdout[0] ?? "") as unknown;
    };

    const lanes: readonly (readonly [
      string, readonly string[], string, string, number, () => Promise<unknown>,
    ])[] = [
      // (i) UNKNOWN INSTANCE — the standing read-side not-found document,
      //     snapshotted on ITS OWN target: `ghost`'s absence and the list
      //     it is absent from.
      ["(i)", ["submit-decision", "ghost", "--db", db, "--decision", "approve",
               "--templates-dir", dir], "not_found", "UnknownInstance", EXIT.notFound,
       (): Promise<unknown> => observeGhost(db)],
      // (ii) NO PENDING DECISION — keyed on the PARK STATE, never on the
      //      member's absence (C27's own reason). Its target is the
      //      ACTIVE instance, in its OWN database.
      ["(ii)", ["submit-decision", activeId, "--db", activeDb, "--decision", "approve",
                "--templates-dir", dir], "not_found", "NoPendingDecision", EXIT.notFound,
       (): Promise<unknown> => observe(activeDb, activeId)],
      // (iii) the pinned template is NOT YIELDED — TWO shapes, two names
      ["(iii)-rejects", ["submit-decision", parkedId, "--db", db, "--decision", "approve",
                         "--templates-dir", malformed], "internal", "TemplateInvalid",
       EXIT.internal, (): Promise<unknown> => observe(db, parkedId)],
      ["(iii)-null", ["submit-decision", parkedId, "--db", db, "--decision", "approve",
                      "--templates-dir", emptyTemplatesDir()], "internal", "TemplateUnavailable",
       EXIT.internal, (): Promise<unknown> => observe(db, parkedId)],
    ];
    for (const [lane, argv, cls, name, code, observeLane] of lanes) {
      // NOTHING is committed by any of them: no transcript row, no
      // version move — measured on the lane's OWN target, immediately
      // around the lane's OWN invocation.
      const before = await observeLane();
      // The seam is reset AFTER the snapshot, so the read verbs the
      // snapshot itself runs cannot be mistaken for the lane's own work.
      resetRouteSeam();
      const result = await run(argv, deps);
      assertErrorContract(result, cls, code);
      // On the document's FIELDS, never on a token in its message.
      expect(errorDoc(result).name, lane).toBe(name);
      // V4's OTHER half, and the one no snapshot can see: the lane
      // returned BEFORE ANY KERNEL WAS BUILT. Asserted here, before the
      // after-snapshot runs anything else through the CLI.
      expect(kernelBuilds, lane).toEqual([]);
      expect(kernelCalls, lane).toEqual([]);
      expect(await observeLane(), lane).toStrictEqual(before);
    }

    // THE CONTROL for the two counters, because `[]` is worthless
    // without a lane that makes it non-empty: the SAME seam, on a
    // submit that DOES resolve, records the build and the call.
    const controlDb = tempDbPath();
    const controlDeps = gatedDeps(dir);
    const controlId = await parkedRun(controlDb, controlDeps, dir);
    resetRouteSeam();
    expect(
      (await run(["submit-decision", controlId, "--db", controlDb, "--decision", "approve",
                  "--templates-dir", dir], controlDeps)).code,
    ).toBe(EXIT.ok);
    expect(kernelBuilds).toEqual(["createKernel"]);
    // The write and the post-commit settle — `kernelCalls` is TOTAL over
    // the kernel's surface, not the write family, which is exactly why an
    // empty one above is the row's claim rather than a weaker cousin.
    expect(kernelCalls).toEqual(["submitDecision", "settleRuntimeContextDeliveries"]);

    // …and the two instances are still in the states the lanes assumed,
    // which keeps every equality above from being satisfiable by a run
    // that had already moved on.
    expect(
      ((await observe(db, parkedId)).instance as { wait: { kind: string } }).wait.kind,
    ).toBe("human_decision");
    expect(
      ((await observe(activeDb, activeId)).instance as { kernelStatus: string }).kernelStatus,
    ).toBe("ACTIVE");
  });

  it("the ORDERING member, submit-only: NOT parked + an unreadable pinned file answers (ii) at exit 3", async () => {
    const db = tempDbPath();
    const dir = stagedTemplatesDir();
    const deps = gatedDeps(dir);
    const created = await run(
      ["create", "--db", db, "--task", "t", "--template", "gated-v0@1", "--templates-dir", dir],
      deps,
    );
    const id = (JSON.parse(created.stdout[0] ?? "") as { instanceId: string }).instanceId;
    expect((await run(["start", id, "--db", db, "--templates-dir", dir], deps)).code).toBe(EXIT.ok);
    const malformed = stagedTemplatesDir("ref:\n  id: gated-v0\n  version: 1\nstart: nope\n");
    // An EAGER-LOAD build answers V4 (iii) at exit 1 here; the
    // short-circuit owes V4 (ii) at exit 3.
    resetRouteSeam();
    const result = await run(
      ["submit-decision", id, "--db", db, "--decision", "approve", "--templates-dir", malformed],
      deps,
    );
    assertErrorContract(result, "not_found", EXIT.notFound);
    expect(errorDoc(result).name).toBe("NoPendingDecision");
    // …and this ordering member is a V4 (ii) lane like any other, so it
    // owes the row's pre-kernel half too.
    expect(kernelBuilds).toEqual([]);
    expect(kernelCalls).toEqual([]);
  });

  it("C27's MANDATORY resume lane: on an UNYIELDED template resume reaches the KERNEL, never an early integrity document", async () => {
    const db = tempDbPath();
    const dir = stagedTemplatesDir();
    const deps = gatedDeps(dir);
    const id = await parkedRun(db, deps, dir);
    // A REJECTING dir on a GATE-parked run, deliberately: this is the ONE
    // shape that separates a `null` floor from one carrying a store. Under
    // an empty dir both answer the same document, so the lane would be
    // blind; under a rejecting one a floor WITH a store throws before
    // admission and the verb answers `TemplateInvalid` at exit 1 — which
    // is exactly the build C27 forbids and a build copying the submit
    // block would produce.
    const malformed = stagedTemplatesDir("ref:\n  id: gated-v0\n  version: 1\nstart: nope\n");
    const result = await run(
      ["resume", id, "--db", db, "--event", "WRONG", "--templates-dir", malformed],
      gatedDeps(malformed),
    );
    expect(result.code).toBe(EXIT.notFound);
    expect(dataDoc(result)).toEqual({ kind: "rejected", reason: "resume_event_mismatch" });
  });

  it("the PRE-LOAD guarantee, driven POSITIVELY: with an unyielded template every pre-load answer still arrives as DATA", async () => {
    const dir = stagedTemplatesDir();
    const empty = emptyTemplatesDir();
    const malformed = stagedTemplatesDir("ref:\n  id: gated-v0\n  version: 1\nstart: nope\n");

    // duplicate — a replayed op id, under a pinned nonce
    const dupDb = tempDbPath();
    const dupNonce = pinnableNonce();
    const dupDeps = gatedDeps(dir, { nonce: dupNonce.source });
    const dupId = await parkedRun(dupDb, dupDeps, dir);
    expect(
      (await run(["submit-decision", dupId, "--db", dupDb, "--decision", "approve",
                  "--templates-dir", dir], dupDeps)).code,
    ).toBe(EXIT.ok);
    dupNonce.pin("resume-1");
    expect(
      dataDoc(await run(["resume", dupId, "--db", dupDb, "--event", "REPARK",
                         "--templates-dir", dir], dupDeps)),
    ).toMatchObject({ kind: "committed" });
    // …and the REPLAY under an UNYIELDED template still answers duplicate.
    const replay = await run(
      ["resume", dupId, "--db", dupDb, "--event", "REPARK", "--templates-dir", empty],
      gatedDeps(empty, { nonce: () => "resume-1" }),
    );
    expect(replay.code).toBe(EXIT.ok);
    expect(dataDoc(replay)).toEqual({ kind: "duplicate" });

    // stale — the version moved between the floor read and the kernel's load
    const staleDb = tempDbPath();
    const staleId = await parkedRun(staleDb, gatedDeps(dir), dir);
    expect(
      (await run(["submit-decision", staleId, "--db", staleDb, "--decision", "approve",
                  "--templates-dir", dir], gatedDeps(dir))).code,
    ).toBe(EXIT.ok);
    const staleResult = await run(
      ["resume", staleId, "--db", staleDb, "--event", "REPARK", "--templates-dir", malformed],
      gatedDeps(malformed, {
        openStore: racedStore((i) => ({ ...i, version: i.version + 1 })),
      }),
    );
    expect(staleResult.code).toBe(EXIT.notFound);
    expect(dataDoc(staleResult)).toMatchObject({ kind: "stale" });

    // not_waiting — an ACTIVE run, under an unyielded template
    const activeDb = tempDbPath();
    const setup = gatedDeps(dir);
    const created = await run(
      ["create", "--db", activeDb, "--task", "t", "--template", "gated-v0@1",
       "--templates-dir", dir],
      setup,
    );
    const activeId = (JSON.parse(created.stdout[0] ?? "") as { instanceId: string }).instanceId;
    expect((await run(["start", activeId, "--db", activeDb, "--templates-dir", dir], setup)).code)
      .toBe(EXIT.ok);
    const notWaiting = await run(
      ["resume", activeId, "--db", activeDb, "--event", "COMMIT", "--templates-dir", malformed],
      gatedDeps(malformed),
    );
    expect(notWaiting.code).toBe(EXIT.notFound);
    expect(dataDoc(notWaiting)).toEqual({ kind: "rejected", reason: "not_waiting" });
  });

  it("the KERNEL's OWN load stays reachable POST-admission on resume — BOTH shapes are its integrity error", async () => {
    const dir = stagedTemplatesDir();
    const malformed = stagedTemplatesDir("ref:\n  id: gated-v0\n  version: 1\nstart: nope\n");
    for (const [shape, badDir] of [
      ["rejecting", malformed],
      ["null", emptyTemplatesDir()],
    ] as const) {
      const db = tempDbPath();
      const id = await parkedRun(db, gatedDeps(dir), dir);
      expect(
        (await run(["submit-decision", id, "--db", db, "--decision", "approve",
                    "--templates-dir", dir], gatedDeps(dir))).code,
      ).toBe(EXIT.ok);
      // Admission PASSES (a bare wait, a routed event, a fresh op, the
      // right version) and the load lands after it — resume avoids the
      // FLOOR load, never EVERY load.
      const result = await run(
        ["resume", id, "--db", db, "--event", "COMMIT", "--templates-dir", badDir],
        gatedDeps(badDir),
      );
      assertErrorContract(result, "internal", EXIT.internal);
      expect(result.stdout, shape).toEqual([]);
    }
  });

  it("V4 (i) on the RESUME path — an unknown instance is the same standing not-found document", async () => {
    const dir = stagedTemplatesDir();
    const db = tempDbPath();
    const deps = gatedDeps(dir);
    // The lane's OWN target, on both sides: `ghost` is not there, and the
    // list it is absent from is empty and stays empty.
    const listed = async (): Promise<unknown> => {
      const result = await run(["list", "--db", db], deps);
      expect(result.code).toBe(EXIT.ok);
      return JSON.parse(result.stdout[0] ?? "") as unknown;
    };
    expect(await listed()).toEqual([]);
    resetRouteSeam();
    const result = await run(
      ["resume", "ghost", "--db", db, "--event", "COMMIT", "--templates-dir", dir],
      deps,
    );
    assertErrorContract(result, "not_found", EXIT.notFound);
    expect(errorDoc(result).name).toBe("UnknownInstance");
    // V4's pre-kernel half on the resume path: no kernel was built and
    // none was called.
    expect(kernelBuilds).toEqual([]);
    expect(kernelCalls).toEqual([]);
    expect(await listed()).toEqual([]);
  });
});

describe("cli — ch14-p3a family 4: the exit and channel matrix, TOTAL over BOTH unions", () => {
  it("submit-decision: every DRIVEN reason token reaches exit 3 as a stdout DATA document", async () => {
    const dir = stagedTemplatesDir();
    const observed = new Map<string, number>();

    const park = async (): Promise<{ db: string; id: string; deps: CliDeps }> => {
      const db = tempDbPath();
      const deps = gatedDeps(dir);
      return { db, id: await parkedRun(db, deps, dir), deps };
    };
    /**
     * SCENARIO → EXACT REASON, never scenario → "some reason in the set".
     * The observed SET alone is blind to a permutation: swapping which
     * scenario answers `unknown_decision` and which answers
     * `missing_required_field` yields the same set and the same exit
     * codes, so the set-level totality assert at the end can only be the
     * SECOND half of this family.
     */
    const decide = async (
      scenario: string,
      expected: SubmitReason,
      argv: readonly string[],
      db: string,
      id: string,
      deps: CliDeps,
    ): Promise<void> => {
      const result = await run(
        ["submit-decision", id, "--db", db, "--templates-dir", dir, ...argv],
        deps,
      );
      const doc = dataDoc(result);
      expect(doc["kind"], scenario).toBe("rejected");
      expect(doc["reason"], scenario).toBe(expected);
      observed.set(doc["reason"] as string, result.code);
    };

    // the key-scoped guards and the authority rung
    let ctx = await park();
    await decide("an UNDECLARED decision key", "unknown_decision",
                 ["--decision", "nope"], ctx.db, ctx.id, ctx.deps);
    ctx = await park();
    await decide("a declared key whose payload spec is unmet", "missing_required_field",
                 ["--decision", "rework"], ctx.db, ctx.id, ctx.deps);
    ctx = await park();
    await decide("a key AGAINST the recommendation, no --override", "override_required",
                 ["--decision", "finish"], ctx.db, ctx.id, ctx.deps);
    ctx = await park();
    await decide("--override where nothing is to be overridden", "override_not_applicable",
                 ["--decision", "approve", "--override"], ctx.db, ctx.id, ctx.deps);
    ctx = await park();
    await decide("an EXPLICIT wrong principal", "operator_not_authorized",
                 ["--decision", "approve", "--by", "somebody-else"], ctx.db, ctx.id, ctx.deps);

    // op_id_collision — the nonce the STARTED fact already consumed
    {
      const db = tempDbPath();
      const control = pinnableNonce();
      const deps = gatedDeps(dir, { nonce: control.source });
      control.pin("start-op");
      const created = await run(
        ["create", "--db", db, "--task", "t", "--template", "gated-v0@1", "--templates-dir", dir],
        deps,
      );
      const id = (JSON.parse(created.stdout[0] ?? "") as { instanceId: string }).instanceId;
      expect((await run(["start", id, "--db", db, "--templates-dir", dir], deps)).code).toBe(EXIT.ok);
      control.pin(null);
      expect(
        (await run(["submit", "--db", db, "--instance", id, "--type", "PASS",
                    "--expected-version", "2", "--expected-role", "implementer",
                    "--templates-dir", dir], deps)).code,
      ).toBe(EXIT.ok);
      // The nonce the STARTED fact already consumed — a DIFFERENT entry
      // kind under the same (instance, op_id) key.
      control.pin("start-op");
      await decide("a nonce a DIFFERENT entry kind already consumed", "op_id_collision",
                   ["--decision", "approve"], db, id, deps);
    }

    // the two RACE-reachable rungs, each staged as the race it is
    {
      const db = tempDbPath();
      const id = await parkedRun(db, gatedDeps(dir), dir);
      await decide(
        "a run that LEFT the gate between the read and the write",
        "not_awaiting_decision",
        ["--decision", "approve"], db, id,
        gatedDeps(dir, {
          openStore: racedStore((i) => ({ ...i, kernelStatus: "ACTIVE", wait: null })),
        }),
      );
    }
    {
      const db = tempDbPath();
      const id = await parkedRun(db, gatedDeps(dir), dir);
      await decide(
        "a request handle that MOVED between the read and the write",
        "decision_request_mismatch",
        ["--decision", "approve"], db, id,
        gatedDeps(dir, {
          openStore: racedStore((i) => ({
            ...i,
            wait: { ...i.wait!, requestRef: "moved-on" },
          })),
        }),
      );
    }

    // TOTALITY: the observed set IS the declared driven set — a token
    // declared driven but never reached fails here, and a token added to
    // the union without an entry fails at COMPILE time.
    expect([...observed.keys()].sort()).toEqual(drivenReasons(SUBMIT_REASONS));
    for (const [reason, code] of observed) {
      expect(code, reason).toBe(EXIT.notFound);
    }
  });

  it("resume: every DRIVEN reason token reaches exit 3 as a stdout DATA document", async () => {
    const dir = stagedTemplatesDir();
    const observed = new Map<string, number>();
    // SCENARIO → EXACT REASON (see the submit matrix above for why the
    // observed SET cannot be the whole of this family).
    const record = async (
      scenario: string,
      expected: ResumeReason,
      argv: readonly string[],
      deps: CliDeps,
    ): Promise<void> => {
      const result = await run(argv, deps);
      const doc = dataDoc(result);
      expect(doc["kind"], scenario).toBe("rejected");
      expect(doc["reason"], scenario).toBe(expected);
      observed.set(doc["reason"] as string, result.code);
    };

    // not_bare_wait — a run parked on a DECISION wait, resumed with one of
    // the gate's own decision keys (the correlation rung passes, and the
    // POST-admission shape guard is what refuses).
    {
      const db = tempDbPath();
      const id = await parkedRun(db, gatedDeps(dir), dir);
      await record("a DECISION wait resumed with one of the gate's OWN keys", "not_bare_wait",
                   ["resume", id, "--db", db, "--event", "approve", "--templates-dir", dir],
                   gatedDeps(dir));
      await record("an event the wait does not declare", "resume_event_mismatch",
                   ["resume", id, "--db", db, "--event", "NOPE", "--templates-dir", dir],
                   gatedDeps(dir));
    }
    // not_waiting — an ACTIVE run
    {
      const db = tempDbPath();
      const deps = gatedDeps(dir);
      const created = await run(
        ["create", "--db", db, "--task", "t", "--template", "gated-v0@1", "--templates-dir", dir],
        deps,
      );
      const id = (JSON.parse(created.stdout[0] ?? "") as { instanceId: string }).instanceId;
      expect((await run(["start", id, "--db", db, "--templates-dir", dir], deps)).code).toBe(EXIT.ok);
      await record("an ACTIVE run", "not_waiting",
                   ["resume", id, "--db", db, "--event", "COMMIT", "--templates-dir", dir], deps);
    }
    // no_resume_transition — a DECLARED resume event with no route
    // …and op_id_collision — the nonce a DECISION_MADE row already consumed
    {
      const db = tempDbPath();
      const control = pinnableNonce();
      const deps = gatedDeps(dir, { nonce: control.source });
      const id = await parkedRun(db, deps, dir);
      control.pin("decide-op");
      expect(
        (await run(["submit-decision", id, "--db", db, "--decision", "approve",
                    "--templates-dir", dir], deps)).code,
      ).toBe(EXIT.ok);
      control.pin(null);
      await record("a DECLARED resume event with no route", "no_resume_transition",
                   ["resume", id, "--db", db, "--event", "ABANDON", "--templates-dir", dir], deps);
      // The nonce the DECISION_MADE row already consumed.
      control.pin("decide-op");
      await record("a nonce the DECISION_MADE row already consumed", "op_id_collision",
                   ["resume", id, "--db", db, "--event", "COMMIT", "--templates-dir", dir], deps);
    }

    expect([...observed.keys()].sort()).toEqual(drivenReasons(RESUME_REASONS));
    for (const [reason, code] of observed) {
      expect(code, reason).toBe(EXIT.notFound);
    }
  });

  it("the SUCCESS kinds: committed and duplicate are stdout DATA at exit 0, stale is DATA at exit 3", async () => {
    const dir = stagedTemplatesDir();
    const db = tempDbPath();
    const control = pinnableNonce();
    const deps = gatedDeps(dir, { nonce: control.source });
    const id = await parkedRun(db, deps, dir);

    control.pin("decide-1");
    const committed = await run(
      ["submit-decision", id, "--db", db, "--decision", "again", "--override",
       "--templates-dir", dir],
      deps,
    );
    expect(committed.code).toBe(EXIT.ok);
    expect(dataDoc(committed)).toMatchObject({ kind: "committed", version: 4 });

    // `again` RE-ARRIVES at the gate, so the run is STILL parked on a
    // decision wait and the replay reaches the kernel's idempotency rung
    // rather than the CLI's V4 (ii).
    const duplicate = await run(
      ["submit-decision", id, "--db", db, "--decision", "again", "--override",
       "--templates-dir", dir],
      gatedDeps(dir, { nonce: () => "decide-1" }),
    );
    // A duplicate is IDEMPOTENT SUCCESS — exit 0, never a failure class.
    expect(duplicate.code).toBe(EXIT.ok);
    expect(dataDoc(duplicate)).toEqual({ kind: "duplicate" });

    const stale = await run(
      ["submit-decision", id, "--db", db, "--decision", "again", "--override",
       "--templates-dir", dir],
      gatedDeps(dir, {
        nonce: () => "fresh-op",
        openStore: racedStore((i) => ({ ...i, version: i.version + 1 })),
      }),
    );
    expect(stale.code).toBe(EXIT.notFound);
    expect(dataDoc(stale)).toMatchObject({ kind: "stale" });
  });

  it("V5's route, OBSERVED: both verbs call their kernel handler directly and NO ingress is built", async () => {
    const dir = stagedTemplatesDir();
    const db = tempDbPath();
    const id = await parkedRun(db, gatedDeps(dir), dir);

    // The CONTROL first, because `ingressBuilds === []` is worthless
    // without a lane that makes it non-empty: the OLDER `submit` verb is
    // an ingress writer, and the SAME seam sees it.
    resetRouteSeam();
    expect(
      (await run(["resume", id, "--db", db, "--event", "WRONG", "--templates-dir", dir],
                 gatedDeps(dir))).code,
    ).toBe(EXIT.notFound);
    expect(ingressBuilds).toEqual([]);
    expect(ingressCalls).toEqual([]);
    expect(kernelWrites).toEqual(["resumeWait"]);

    resetRouteSeam();
    expect(
      (await run(["submit-decision", id, "--db", db, "--decision", "approve",
                  "--templates-dir", dir], gatedDeps(dir))).code,
    ).toBe(EXIT.ok);
    // EXACTLY the one direct handler — not a second write, and not one
    // reached through a wire record the verb serialized to itself.
    expect(kernelWrites).toEqual(["submitDecision"]);
    expect(ingressBuilds).toEqual([]);
    expect(ingressCalls).toEqual([]);

    // …and the CONTROL: the ingress writer the tree already ships DOES
    // light the same counters, so an empty `ingressCalls` above is a
    // measured absence rather than a seam that never fires.
    const controlDb = tempDbPath();
    const controlDeps = gatedDeps(dir);
    const created = await run(
      ["create", "--db", controlDb, "--task", "t", "--template", "gated-v0@1",
       "--templates-dir", dir],
      controlDeps,
    );
    const controlId = (JSON.parse(created.stdout[0] ?? "") as { instanceId: string }).instanceId;
    expect(
      (await run(["start", controlId, "--db", controlDb, "--templates-dir", dir], controlDeps)).code,
    ).toBe(EXIT.ok);
    resetRouteSeam();
    expect(
      (await run(["submit", "--db", controlDb, "--instance", controlId, "--type", "PASS",
                  "--expected-version", "2", "--expected-role", "implementer",
                  "--templates-dir", dir], controlDeps)).code,
    ).toBe(EXIT.ok);
    expect(ingressBuilds).toEqual(["createIngress"]);
    expect(ingressCalls).toEqual(["submit"]);
  });

  it("V5's route: `invalid_shape` is ABSENT from BOTH verbs' outcome surfaces", () => {
    // Reachable ONLY through the ingress's operator-intent leg, which
    // these verbs do not take — a build routing through `submitIntent`
    // would put it in reach.
    const submitHasInvalidShape: "invalid_shape" extends SubmitReason ? true : false = false;
    const resumeHasInvalidShape: "invalid_shape" extends ResumeReason ? true : false = false;
    expect(submitHasInvalidShape).toBe(false);
    expect(resumeHasInvalidShape).toBe(false);
    expect(Object.keys(SUBMIT_REASONS)).not.toContain("invalid_shape");
    expect(Object.keys(RESUME_REASONS)).not.toContain("invalid_shape");
  });

  it("V6's TWO gated-out tokens cannot surface: unknown_instance is answered first, missing_version has no flag", async () => {
    const dir = stagedTemplatesDir();
    const db = tempDbPath();
    const deps = gatedDeps(dir);
    const id = await parkedRun(db, deps, dir);
    // `unknown_instance` — the pre-read answers it as an ERROR document,
    // never as a kernel-negative data row.
    for (const argv of [
      ["submit-decision", "ghost", "--db", db, "--decision", "approve", "--templates-dir", dir],
      ["resume", "ghost", "--db", db, "--event", "COMMIT", "--templates-dir", dir],
    ]) {
      const result = await run(argv, deps);
      assertErrorContract(result, "not_found", EXIT.notFound);
      expect(errorDoc(result).name, argv[0]).toBe("UnknownInstance");
    }
    // `missing_version` — the operator addresses the INSTANCE, not a
    // version: neither verb accepts `--expected-version` at all.
    for (const argv of [
      ["submit-decision", id, "--db", db, "--decision", "approve", "--expected-version", "3",
       "--templates-dir", dir],
      ["resume", id, "--db", db, "--event", "COMMIT", "--expected-version", "3",
       "--templates-dir", dir],
    ]) {
      const result = await run(argv, deps);
      assertErrorContract(result, "usage", EXIT.usage);
      expect(errorDoc(result).name, argv[0]).toBe("InvalidArguments");
    }
  });
});

describe("cli — ch14-p3a family 5: argument shape and the absence boundary", () => {
  it("the required flags and the POSITIONAL instance id (never `submit`'s --instance)", async () => {
    const dir = stagedTemplatesDir();
    const db = tempDbPath();
    const deps = gatedDeps(dir);
    const id = await parkedRun(db, deps, dir);
    // EVERY member carries its EXPECTED ERROR-DOCUMENT NAME. Exit 2 plus
    // an empty stdout is satisfied by an implementation that emits NO
    // stderr document at all — the operator would be told nothing — so
    // the WHOLE inherited contract is asserted here (one document, its
    // closed keyset, its class) and the name pins WHICH usage failure it
    // is.
    const cases: readonly (readonly [string, readonly string[], string])[] = [
      ["submit-decision without the positional",
       ["submit-decision", "--db", db, "--decision", "approve", "--templates-dir", dir],
       "MissingInstanceId"],
      ["submit-decision without --decision",
       ["submit-decision", id, "--db", db, "--templates-dir", dir], "MissingDecision"],
      ["resume without the positional", ["resume", "--db", db, "--event", "COMMIT",
                                         "--templates-dir", dir], "MissingInstanceId"],
      ["resume without --event", ["resume", id, "--db", db, "--templates-dir", dir],
       "MissingEvent"],
      // the older verb's flag is NOT this surface's
      ["submit-decision with --instance", ["submit-decision", "--instance", id, "--db", db,
                                           "--decision", "approve", "--templates-dir", dir],
       "InvalidArguments"],
      // `resume` carries NEITHER --by, --payload NOR --override
      ["resume with --by", ["resume", id, "--db", db, "--event", "COMMIT", "--by", "x",
                            "--templates-dir", dir], "InvalidArguments"],
      ["resume with --payload", ["resume", id, "--db", db, "--event", "COMMIT", "--payload", "{}",
                                 "--templates-dir", dir], "InvalidArguments"],
      ["resume with --override", ["resume", id, "--db", db, "--event", "COMMIT", "--override",
                                  "--templates-dir", dir], "InvalidArguments"],
      // the MALFORMED column, scoped to the ONE flag with a CLI-side parse
      ["malformed --payload", ["submit-decision", id, "--db", db, "--decision", "approve",
                               "--payload", "{oops", "--templates-dir", dir],
       "InvalidPayloadJson"],
    ];
    for (const [label, argv, name] of cases) {
      const result = await run(argv, deps);
      assertErrorContract(result, "usage", EXIT.usage);
      expect(errorDoc(result).name, label).toBe(name);
    }
  });

  it("BOTH write verbs DEMAND --templates-dir: missing and unlistable are usage/2, eagerly", async () => {
    const dir = stagedTemplatesDir();
    const db = tempDbPath();
    const id = await parkedRun(db, gatedDeps(dir), dir);
    const noEnv = testDeps({ env: {} });
    for (const argv of [
      ["submit-decision", id, "--db", db, "--decision", "approve"],
      ["resume", id, "--db", db, "--event", "COMMIT"],
    ]) {
      const result = await run(argv, noEnv);
      assertErrorContract(result, "usage", EXIT.usage);
      expect(errorDoc(result).name, argv[0]).toBe("MissingTemplatesDir");
    }
    const gone = join(emptyTemplatesDir(), "not-a-dir");
    for (const argv of [
      ["submit-decision", id, "--db", db, "--decision", "approve", "--templates-dir", gone],
      ["resume", id, "--db", db, "--event", "COMMIT", "--templates-dir", gone],
    ]) {
      const result = await run(argv, noEnv);
      assertErrorContract(result, "usage", EXIT.usage);
      expect(errorDoc(result).name, argv[0]).toBe("InvalidTemplatesDir");
    }
  });

  it("the ABSENT column is NOT uniform: --by DEFAULTS, --payload and --override reach the kernel as ABSENCES", async () => {
    const dir = stagedTemplatesDir();
    const deps = gatedDeps(dir);

    // --by ABSENT defaults to the SAME read's bound operator, and the
    // decision commits. The DEFAULTING lane is sensitive because an
    // EXPLICIT wrong principal reaches the authority rung instead.
    const db = tempDbPath();
    const id = await parkedRun(db, deps, dir);
    expect(
      dataDoc(await run(["submit-decision", id, "--db", db, "--decision", "approve",
                         "--templates-dir", dir], deps)),
    ).toMatchObject({ kind: "committed" });
    const wrongDb = tempDbPath();
    const wrongId = await parkedRun(wrongDb, deps, dir);
    expect(
      dataDoc(await run(["submit-decision", wrongId, "--db", wrongDb, "--decision", "approve",
                         "--by", "not-the-operator", "--templates-dir", dir], deps)),
    ).toEqual({ kind: "rejected", reason: "operator_not_authorized" });

    // --payload ABSENT is an OMITTED KEY, not `{}`: the committed row
    // carries NO payload key. A CLI defaulting it would fail this.
    const timeline = await run(["timeline", id, "--db", db], deps);
    const rows = JSON.parse(timeline.stdout[0] ?? "[]") as Record<string, unknown>[];
    const decided = rows.find((r) => r["entryKind"] === "DECISION_MADE");
    expect(decided).toBeDefined();
    expect(decided && "payload" in decided).toBe(false);
    // …and a SUPPLIED payload does land, which keeps the absence honest.
    const withDb = tempDbPath();
    const withId = await parkedRun(withDb, deps, dir);
    expect(
      dataDoc(await run(["submit-decision", withId, "--db", withDb, "--decision", "approve",
                         "--payload", '{"instruction":"redo it"}', "--templates-dir", dir], deps)),
    ).toMatchObject({ kind: "committed" });
    const withRows = JSON.parse(
      (await run(["timeline", withId, "--db", withDb], deps)).stdout[0] ?? "[]",
    ) as Record<string, unknown>[];
    expect(withRows.find((r) => r["entryKind"] === "DECISION_MADE")?.["payload"]).toEqual({
      instruction: "redo it",
    });

    // --override ABSENT reaches C16's rung as a GENUINE absence: against
    // the recommendation without it is `override_required`, and PRESENT
    // where nothing is to be overridden is `override_not_applicable`.
    // (Omitted and an explicit `false` are indistinguishable AT the rung,
    // so this PAIR is the falsifier a single lane cannot be.)
    const againstDb = tempDbPath();
    const againstId = await parkedRun(againstDb, deps, dir);
    expect(
      dataDoc(await run(["submit-decision", againstId, "--db", againstDb, "--decision", "finish",
                         "--templates-dir", dir], deps)),
    ).toEqual({ kind: "rejected", reason: "override_required" });
    expect(
      dataDoc(await run(["submit-decision", againstId, "--db", againstDb, "--decision", "finish",
                         "--override", "--templates-dir", dir], deps)),
    ).toMatchObject({ kind: "committed" });
  });
});

describe("cli — ch14-p3a family 5/V8: ONE definition store per invocation, and WHERE it goes", () => {
  beforeEach(() => {
    resetDefinitionSeam();
  });

  it("submit-decision: ONE store is built, and the SAME instance serves the floor AND the kernel", async () => {
    const dir = stagedTemplatesDir();
    const db = tempDbPath();
    const id = await parkedRun(db, gatedDeps(dir), dir);
    resetDefinitionSeam();
    expect(
      (await run(["submit-decision", id, "--db", db, "--decision", "approve",
                  "--templates-dir", dir], gatedDeps(dir))).code,
    ).toBe(EXIT.ok);
    // ONE store for the invocation…
    expect(definitionStoreBuilds).toHaveLength(1);
    // …and it is loaded TWICE — once by the floor's Ask derivation, once
    // by the kernel's own pinned-template load (V8's two-read clause) —
    // by the SAME object.
    expect(definitionLoads).toHaveLength(2);
    expect(new Set(definitionLoads).size).toBe(1);
    expect(definitionLoads[0]).toBe(definitionStoreBuilds[0]);
  });

  it("resume: ONE store is built, the KERNEL gets it, and the FLOOR gets `null` with a dir configured", async () => {
    const dir = stagedTemplatesDir();
    const db = tempDbPath();
    // Driven on a run parked at the HUMAN GATE, where a floor CARRYING a
    // store would derive and load. On a bare wait the park test
    // short-circuits either way, so that shape could not fail.
    const id = await parkedRun(db, gatedDeps(dir), dir);
    resetDefinitionSeam();
    expect(
      dataDoc(await run(["resume", id, "--db", db, "--event", "approve", "--templates-dir", dir],
                        gatedDeps(dir))),
    ).toEqual({ kind: "rejected", reason: "not_bare_wait" });
    // The mirror image of the lane above: the store exists and the KERNEL
    // used it (its POST-admission load), but it was loaded EXACTLY ONCE —
    // the floor never had it.
    expect(definitionStoreBuilds).toHaveLength(1);
    expect(definitionLoads).toHaveLength(1);
    expect(definitionLoads[0]).toBe(definitionStoreBuilds[0]);
  });

  it("resume's admission REJECTIONS reach the operator with ZERO loads — the pre-load guarantee, measured", async () => {
    const dir = stagedTemplatesDir();
    const db = tempDbPath();
    const id = await parkedRun(db, gatedDeps(dir), dir);
    resetDefinitionSeam();
    // A decision wait is not a bare wait, but `WRONG` mismatches at the
    // CORRELATION rung, which sits BEFORE the kernel's own load.
    expect(
      dataDoc(await run(["resume", id, "--db", db, "--event", "WRONG", "--templates-dir", dir],
                        gatedDeps(dir))),
    ).toEqual({ kind: "rejected", reason: "resume_event_mismatch" });
    expect(definitionStoreBuilds).toHaveLength(1);
    expect(definitionLoads).toHaveLength(0);
  });
});

describe("cli — ch14-p3a family 7/8: one read, no retry, and idempotency in both directions", () => {
  it("each WRITE verb performs EXACTLY ONE floor detail read per invocation", async () => {
    const dir = stagedTemplatesDir();
    const db = tempDbPath();
    const id = await parkedRun(db, gatedDeps(dir), dir);

    const submitCounter = { reads: 0 };
    expect(
      (await run(["submit-decision", id, "--db", db, "--decision", "approve",
                  "--templates-dir", dir],
                 gatedDeps(dir, { openStore: countingStore(submitCounter) }))).code,
    ).toBe(EXIT.ok);
    expect(submitCounter.reads).toBe(1);

    const resumeCounter = { reads: 0 };
    expect(
      (await run(["resume", id, "--db", db, "--event", "REPARK", "--templates-dir", dir],
                 gatedDeps(dir, { openStore: countingStore(resumeCounter) }))).code,
    ).toBe(EXIT.ok);
    expect(resumeCounter.reads).toBe(1);
  });

  it("no RETRY on a moved version: ONE floor read, ONE kernel attempt, and a `stale` DATA document", async () => {
    const dir = stagedTemplatesDir();
    /**
     * The read COUNT alone cannot carry the no-retry claim: a verb that
     * met `stale`, called the kernel ONCE MORE with the version the
     * kernel just reported, and then returned `stale` anyway performs
     * exactly ONE floor read and emits exactly the same document. Only a
     * KERNEL-ATTEMPT counter can fail on it.
     */
    const staleStore =
      (counter: { reads: number }): CliDeps["openStore"] =>
      (path, time) => {
        const handle = openStore(path, time);
        return {
          ...handle,
          store: {
            ...handle.store,
            getInstanceDetail: (target) => {
              counter.reads += 1;
              return handle.store.getInstanceDetail(target);
            },
            loadInstance: async (target) => {
              const loaded = await handle.store.loadInstance(target);
              return loaded === null ? null : { ...loaded, version: loaded.version + 1 };
            },
          },
        };
      };

    for (const [verb, argv, expectedCall, needsBareWait] of [
      ["submit-decision", ["--decision", "approve"], "submitDecision", false],
      // `resume` needs a BARE wait to reach the version rung at all, so
      // the gate is closed first — with a NORMAL store, outside the
      // measurement.
      ["resume", ["--event", "REPARK"], "resumeWait", true],
    ] as const) {
      const db = tempDbPath();
      const id = await parkedRun(db, gatedDeps(dir), dir);
      if (needsBareWait) {
        expect(
          (await run(["submit-decision", id, "--db", db, "--decision", "approve",
                      "--templates-dir", dir], gatedDeps(dir))).code,
        ).toBe(EXIT.ok);
      }
      const counter = { reads: 0 };
      resetRouteSeam();
      const result = await run(
        [verb, id, "--db", db, ...argv, "--templates-dir", dir],
        gatedDeps(dir, { openStore: staleStore(counter) }),
      );
      expect(result.code, verb).toBe(EXIT.notFound);
      expect(dataDoc(result), verb).toMatchObject({ kind: "stale" });
      expect(counter.reads, verb).toBe(1);
      // EXACTLY ONE kernel attempt — no second call, and no other handler.
      expect(kernelWrites, verb).toEqual([expectedCall]);
    }
  });

  it("a REPLAYED op_id reaches `duplicate` at exit 0, and two invocations do NOT collide", async () => {
    const dir = stagedTemplatesDir();
    const db = tempDbPath();
    const id = await parkedRun(db, gatedDeps(dir), dir);
    expect(
      (await run(["submit-decision", id, "--db", db, "--decision", "approve",
                  "--templates-dir", dir], gatedDeps(dir))).code,
    ).toBe(EXIT.ok);

    // The REPLAY half PINS the nonce source…
    const pinned = gatedDeps(dir, { nonce: () => "one-shot" });
    expect(
      dataDoc(await run(["resume", id, "--db", db, "--event", "REPARK", "--templates-dir", dir],
                        pinned)),
    ).toMatchObject({ kind: "committed" });
    expect(
      dataDoc(await run(["resume", id, "--db", db, "--event", "REPARK", "--templates-dir", dir],
                        pinned)),
    ).toEqual({ kind: "duplicate" });

    // …and the NON-COLLISION half uses the PRODUCTION source, because one
    // lane can otherwise pass by defeating the other. IT IS DRIVEN ON
    // BOTH WRITE VERBS: a `submit-decision` minting a CONSTANT nonce
    // while `resume` minted correctly would pass a resume-only lane, and
    // the submit REPLAY lane above would even confirm the bug as a
    // well-behaved `duplicate`.
    const production = gatedDeps(dir);
    const first = dataDoc(
      await run(["resume", id, "--db", db, "--event", "REPARK", "--templates-dir", dir], production),
    );
    const second = dataDoc(
      await run(["resume", id, "--db", db, "--event", "REPARK", "--templates-dir", dir], production),
    );
    expect(first).toMatchObject({ kind: "committed" });
    expect(second).toMatchObject({ kind: "committed" });
    expect(second["version"]).not.toBe(first["version"]);

    // `again --override` RE-ARRIVES at the gate, so two consecutive
    // submits are both legal writes on the SAME parked run — the shape a
    // constant nonce turns into a `duplicate` at the second.
    const submitDb = tempDbPath();
    const submitDeps = gatedDeps(dir);
    const submitId = await parkedRun(submitDb, submitDeps, dir);
    const submitArgv = ["submit-decision", submitId, "--db", submitDb, "--decision", "again",
                        "--override", "--templates-dir", dir];
    const firstSubmit = dataDoc(await run(submitArgv, submitDeps));
    const secondSubmit = dataDoc(await run(submitArgv, submitDeps));
    expect(firstSubmit).toMatchObject({ kind: "committed" });
    expect(secondSubmit).toMatchObject({ kind: "committed" });
    expect(secondSubmit["version"]).not.toBe(firstSubmit["version"]);
  });
});
