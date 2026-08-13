import { execFile } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import { afterEach, describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);

/**
 * The repo's first FULL-LIFECYCLE JOURNEY SMOKE (packet ch8-P2, J1/J2;
 * plan §8.9 P2 row, user-ratified 2026-07-11): template file → start →
 * submitted events → terminal → floor reads, through the SHIPPED CLI
 * processes (the root tsx bridge — the last-mile-smoke culture).
 *
 * J2: the SHIPPED configuration surface only — real entrypoint
 * processes, a real store file in a temp dir, the REPO's canonical
 * template file as the operator-authored input (never a temp copy —
 * the artifact's provenance is the repo file; packet note 4). Zero
 * test-side seams: no injected deps, no scripted clocks or sinks.
 */

/**
 * ch13-p1b (ch13v2-C16): the shipped catalog entry's body, TRANSCRIBED
 * from the canonical `v3/templates/local-pair-v0@1.yaml` this journey
 * drives — the authored source, never the render's own output.
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

/**
 * ch13-p1b (D14 / family 10): the rendered blocks a dispatch from the
 * canonical template carries. The entry is ROLE-SYMMETRIC — both roles
 * reference it — so the same value is expected at each role's dispatch,
 * and a single-role drive could not tell a symmetric authoring from a
 * one-sided one.
 */
const SHIPPED_CONTEXT_BLOCKS = [
  {
    id: "emit-envelope",
    body: EMIT_ENVELOPE_BODY,
    provenance: { sources: [{ source: "role_config" }] },
  },
];

/** The role default carrying the ref rides the ch12 cascade too (the lift COPIES). */
const SHIPPED_EFFECTIVE_AGENT_CONFIG = { promptConcernRefs: ["emit-envelope"] };

const dirs: string[] = [];

afterEach(() => {
  for (const dir of dirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

interface TimelineRow {
  seq: number;
  // The STARTED lifecycle fact row (seq 1) carries opId at the top level
  // and no envelope/gateDecisions; transition rows carry the envelope pair.
  entryKind: string;
  opId?: string;
  envelope?: { opId: string; type: string };
  gateDecisions?: unknown;
}

describe("cli — the full-lifecycle journey smoke (packet ch8-P2: J1/J2)", () => {
  it(
    "file → start → PASS → CONVERGED → terminal DONE → timeline + tail agree, every stage exit 0",
    { timeout: 30_000 },
    async () => {
      const tsxBin = join(process.cwd(), "..", "node_modules", ".bin", "tsx");
      const mainPath = join(process.cwd(), "src", "cli", "main.ts");
      const templatesDir = join(process.cwd(), "templates");
      const dir = mkdtempSync(join(tmpdir(), "v3-journey-"));
      dirs.push(dir);
      const db = join(dir, "store.db");
      const cli = (...argv: string[]): Promise<{ stdout: string; stderr: string }> =>
        execFileAsync(tsxBin, [mainPath, ...argv]); // rejects on nonzero exit

      // create → start — the operator-authored repo file, the pinned default
      // ref (ch12-P4: the create→start sequence replaces the retired C25
      // bridge). `create` mints the instance id (surfaced on stdout).
      const created = await cli(
        "create", "--db", db, "--task", "journey",
        "--templates-dir", templatesDir,
      );
      const createdDoc = JSON.parse(created.stdout.trim()) as { kind: string; instanceId: string };
      expect(createdDoc.kind).toBe("created");
      expect(typeof createdDoc.instanceId).toBe("string");
      expect(createdDoc.instanceId).not.toBe("");
      const id = createdDoc.instanceId;

      const started = await cli("start", id, "--db", db, "--templates-dir", templatesDir);
      // The START `activated` stdout document asserted by FULL equality —
      // version 2 = genesis v1 + the activation commit; the first dispatch's
      // ContextPacket for the implement step.
      const startDoc = JSON.parse(started.stdout.trim()) as { instanceId: string };
      expect(startDoc).toEqual({
        kind: "activated",
        instanceId: id,
        version: 2,
        intent: {
          actor: "codex",
          packet: {
            instanceId: id,
            expectedVersion: 2,
            task: "journey",
            role: "implementer",
            instruction: "build it",
            availableOps: ["PASS"],
            effectiveAgentConfig: SHIPPED_EFFECTIVE_AGENT_CONFIG,
            contextBlocks: SHIPPED_CONTEXT_BLOCKS,
            runtimeContext: "none",
          },
        },
      });

      // submitted events driving implement →(PASS)→ review →(CONVERGED)→ done.
      const pass = await cli(
        "submit", "--db", db, "--instance", id, "--type", "PASS",
        "--expected-version", "2", "--expected-role", "implementer", "--templates-dir", templatesDir,
      );
      // ch13-p1b (D14 / family 10): the OTHER role's dispatch. The
      // activation document can only ever carry the START step's role,
      // so the reviewer's packet rides the SUBMIT verb's committed
      // document — asserted here by FULL equality (it was a containment
      // assert), which is what makes the shipped entry's ratified
      // role-SYMMETRY observable end-to-end.
      expect(JSON.parse(pass.stdout.trim())).toEqual({
        kind: "committed",
        version: 3,
        intent: {
          actor: "claude",
          packet: {
            instanceId: id,
            expectedVersion: 3,
            task: "journey",
            role: "reviewer",
            instruction: "review it",
            availableOps: ["PASS", "CONVERGED"],
            effectiveAgentConfig: SHIPPED_EFFECTIVE_AGENT_CONFIG,
            contextBlocks: SHIPPED_CONTEXT_BLOCKS,
            runtimeContext: "none",
          },
        },
      });

      const converged = await cli(
        "submit", "--db", db, "--instance", id, "--type", "CONVERGED",
        "--expected-version", "3", "--expected-role", "reviewer", "--templates-dir", templatesDir,
      );
      expect(JSON.parse(converged.stdout.trim())).toMatchObject({ kind: "committed", version: 4 });

      // terminal verified (detail — a shipped ch6 floor verb).
      const detail = await cli("detail", id, "--db", db);
      const detailDoc = JSON.parse(detail.stdout.trim()) as {
        instance: {
          kernelStatus: string;
          terminalDisposition: string | null;
          currentStep: string;
          task: string;
        };
      };
      expect(detailDoc.instance.kernelStatus).toBe("TERMINAL");
      expect(detailDoc.instance.terminalDisposition).toBe("done");
      expect(detailDoc.instance.currentStep).toBe("done");
      expect(detailDoc.instance.task).toBe("journey");

      // floor reads — the ratified row's named pair, both driven:
      // timeline (the cursor read) — the STARTED fact (seq 1, the START
      // verb's activation record) plus the two submitted transitions.
      const timeline = await cli("timeline", id, "--db", db);
      const timelineRows = JSON.parse(timeline.stdout.trim()) as TimelineRow[];
      const timelineTx = timelineRows.filter((r) => r.entryKind === "transition");
      expect(timelineRows[0]?.entryKind).toBe("STARTED");
      expect(timelineTx.map((r) => r.envelope?.type)).toEqual(["PASS", "CONVERGED"]);
      // ch11-P2b R-ACTIVATION-JOURNEY discharge: the C27 read-surface
      // delta end-to-end — an ungated lifecycle's transition rows carry
      // gateDecisions [] (a POSITIVE assert, not compile-survival).
      expect(timelineTx.map((r) => r.gateDecisions)).toEqual([[], []]);

      // …and tail --from 0 (NDJSON; completes on the terminal instance).
      const tail = await cli("tail", id, "--db", db, "--from", "0");
      const tailRows = tail.stdout
        .trim()
        .split("\n")
        .map((line) => JSON.parse(line) as TimelineRow);

      // the two floor reads agree on THE SAME ROWS — full deep
      // equality, not a projected field pair (arm gate 2, aftermath
      // finding 3).
      expect(tailRows).toEqual(timelineRows);
      // Every row carries an op_id: the fact row at the top level, a
      // transition row inside its envelope.
      expect(
        tailRows.every(
          (r) => typeof (r.entryKind === "transition" ? r.envelope?.opId : r.opId) === "string",
        ),
      ).toBe(true);
    },
  );

  it(
    "ch11-P4 pass-back: PASS → PASS (pass back to start) → PASS → CONVERGED → DONE, final round === 2",
    { timeout: 30_000 },
    async () => {
      // The R-ACTIVATION-JOURNEY discharge: as of ch11-P4 the SHIPPED
      // template DECLARES its round advancement (Y1 —
      // `round: { advanceOnArrivalAt: [implement] }`, the model's own
      // exhibited restoration), so the pass-back loop-back arrival at the
      // start step DOES advance the round. This is the shipped delta the
      // Y1 restoration makes observable end-to-end (Y8 item 1).
      const tsxBin = join(process.cwd(), "..", "node_modules", ".bin", "tsx");
      const mainPath = join(process.cwd(), "src", "cli", "main.ts");
      const templatesDir = join(process.cwd(), "templates");
      const dir = mkdtempSync(join(tmpdir(), "v3-journey-passback-"));
      dirs.push(dir);
      const db = join(dir, "store.db");
      const cli = (...argv: string[]): Promise<{ stdout: string; stderr: string }> =>
        execFileAsync(tsxBin, [mainPath, ...argv]); // rejects on nonzero exit

      const created = await cli(
        "create", "--db", db, "--task", "pass-back journey",
        "--templates-dir", templatesDir,
      );
      const createdDoc = JSON.parse(created.stdout.trim()) as { kind: string; instanceId: string };
      expect(createdDoc.kind).toBe("created");
      expect(createdDoc.instanceId).not.toBe("");
      const id = createdDoc.instanceId;

      const started = await cli("start", id, "--db", db, "--templates-dir", templatesDir);
      // The pass-back journey's START document asserted by FULL equality
      // (task "pass-back journey"; version 2 = genesis v1 + the activation
      // commit).
      const startDoc = JSON.parse(started.stdout.trim()) as { instanceId: string };
      expect(startDoc).toEqual({
        kind: "activated",
        instanceId: id,
        version: 2,
        intent: {
          actor: "codex",
          packet: {
            instanceId: id,
            expectedVersion: 2,
            task: "pass-back journey",
            role: "implementer",
            instruction: "build it",
            availableOps: ["PASS"],
            effectiveAgentConfig: SHIPPED_EFFECTIVE_AGENT_CONFIG,
            contextBlocks: SHIPPED_CONTEXT_BLOCKS,
            runtimeContext: "none",
          },
        },
      });

      const submit = (
        type: string,
        expectedVersion: number,
        role: string,
      ): Promise<{ stdout: string; stderr: string }> =>
        cli(
          "submit", "--db", db, "--instance", id, "--type", type,
          "--expected-version", String(expectedVersion), "--expected-role", role,
          "--templates-dir", templatesDir,
        );

      // implement →(PASS)→ review
      expect(JSON.parse((await submit("PASS", 2, "implementer")).stdout.trim())).toMatchObject({
        kind: "committed", version: 3,
      });
      // review →(PASS, pass back — arrival at start)→ implement; round → 2
      expect(JSON.parse((await submit("PASS", 3, "reviewer")).stdout.trim())).toMatchObject({
        kind: "committed", version: 4,
      });
      // implement →(PASS)→ review
      expect(JSON.parse((await submit("PASS", 4, "implementer")).stdout.trim())).toMatchObject({
        kind: "committed", version: 5,
      });
      // review →(CONVERGED)→ done (terminal)
      expect(JSON.parse((await submit("CONVERGED", 5, "reviewer")).stdout.trim())).toMatchObject({
        kind: "committed", version: 6,
      });

      const detail = await cli("detail", id, "--db", db);
      const detailDoc = JSON.parse(detail.stdout.trim()) as {
        instance: {
          kernelStatus: string;
          terminalDisposition: string | null;
          currentStep: string;
          round: number;
        };
      };
      expect(detailDoc.instance.kernelStatus).toBe("TERMINAL");
      expect(detailDoc.instance.terminalDisposition).toBe("done");
      expect(detailDoc.instance.currentStep).toBe("done");
      // The Y1 restoration live end-to-end: the round ADVANCED on the
      // pass-back arrival at the start step (the declared advancement).
      expect(detailDoc.instance.round).toBe(2);
    },
  );

  it(
    "ch11-P4 Y5b gated journey: a FILE-authored gated template blocks at round 1 → pass-back → allows at round 2 → DONE",
    { timeout: 30_000 },
    async () => {
      // The R-ACTIVATION-JOURNEY discharge: a test-AUTHORED gated template
      // FILE (the operator-authored input artifact) staged into a temp
      // templates dir, driven full-lifecycle through the SHIPPED subprocess
      // channel. A threshold `round >= 2` gate on review's CONVERGED plus
      // the round declaration: CONVERGED blocks at round 1, the pass-back
      // advances the round to 2, and CONVERGED then allows to DONE. The
      // timeline rows carry the ordered gateDecisions — the C27 read
      // surface, first driven from a FILE-authored gate.
      const tsxBin = join(process.cwd(), "..", "node_modules", ".bin", "tsx");
      const mainPath = join(process.cwd(), "src", "cli", "main.ts");
      const templatesDir = mkdtempSync(join(tmpdir(), "v3-journey-gated-tpl-"));
      dirs.push(templatesDir);
      writeFileSync(
        join(templatesDir, "gated-pair-v0@1.yaml"),
        `ref:
  id: gated-pair-v0
  version: 1
start: implement
steps:
  implement:
    role: implementer
    instruction: |-
      build it
    transitions:
      PASS: review
  review:
    role: reviewer
    instruction: |-
      review it
    transitions:
      PASS: implement
      CONVERGED: done
    gates:
      CONVERGED:
        - uses: declarative.threshold
          config:
            metric: round
            op: ">="
            value: 2
terminal:
  - done
roles:
  implementer:
    defaultActor: codex
  reviewer:
    defaultActor: claude
round:
  advanceOnArrivalAt:
    - implement
`,
      );
      const dir = mkdtempSync(join(tmpdir(), "v3-journey-gated-"));
      dirs.push(dir);
      const db = join(dir, "store.db");
      const cli = (...argv: string[]): Promise<{ stdout: string; stderr: string }> =>
        execFileAsync(tsxBin, [mainPath, ...argv]); // rejects on nonzero exit

      const created = await cli(
        "create", "--db", db, "--task", "gated", "--template", "gated-pair-v0@1",
        "--templates-dir", templatesDir,
      );
      const createdDoc = JSON.parse(created.stdout.trim()) as { kind: string; instanceId: string };
      expect(createdDoc.kind).toBe("created");
      expect(createdDoc.instanceId).not.toBe("");
      const id = createdDoc.instanceId;

      const started = await cli("start", id, "--db", db, "--templates-dir", templatesDir);
      // The gated file's START document asserted by FULL equality (task
      // "gated" over the gated-pair-v0 template — same implement-step dispatch
      // shape; version 2 = genesis v1 + the activation commit).
      const startDoc = JSON.parse(started.stdout.trim()) as { instanceId: string };
      expect(startDoc).toEqual({
        kind: "activated",
        instanceId: id,
        version: 2,
        intent: {
          actor: "codex",
          packet: {
            instanceId: id,
            expectedVersion: 2,
            task: "gated",
            role: "implementer",
            instruction: "build it",
            availableOps: ["PASS"],
            // This journey authors its OWN gated template (above), which
            // declares no catalog and issues no ref — so the cascade is
            // empty and the rendered list is too, with the key present.
            effectiveAgentConfig: {},
            contextBlocks: [],
            runtimeContext: "none",
          },
        },
      });

      const submit = (
        type: string,
        expectedVersion: number,
        role: string,
      ): Promise<{ stdout: string; stderr: string }> =>
        cli(
          "submit", "--db", db, "--instance", id, "--type", type,
          "--expected-version", String(expectedVersion), "--expected-role", role,
          "--templates-dir", templatesDir,
        );

      // implement →(PASS)→ review, round 1
      expect(JSON.parse((await submit("PASS", 2, "implementer")).stdout.trim())).toMatchObject({
        kind: "committed", version: 3,
      });

      // review →(CONVERGED)→ BLOCKED at round 1: the submit exits NONZERO
      // (execFileAsync rejects) with the rejected gate_blocked outcome on
      // stdout.
      const blocked = await submit("CONVERGED", 3, "reviewer").then(
        () => {
          throw new Error("expected the CONVERGED at round 1 to be rejected (nonzero exit)");
        },
        (error: { code?: number; stdout?: string }) => error,
      );
      expect(blocked.code).toBe(3); // EXIT.notFound — the rejected class
      expect(JSON.parse((blocked.stdout ?? "").trim())).toEqual({
        kind: "rejected",
        reason: "gate_blocked",
        gate: "declarative.threshold",
        gateReason: "sys:round_below_min",
      });

      // review →(PASS, pass back — arrival at start)→ implement; round → 2
      expect(JSON.parse((await submit("PASS", 3, "reviewer")).stdout.trim())).toMatchObject({
        kind: "committed", version: 4,
      });
      // implement →(PASS)→ review, round 2
      expect(JSON.parse((await submit("PASS", 4, "implementer")).stdout.trim())).toMatchObject({
        kind: "committed", version: 5,
      });
      // review →(CONVERGED)→ ALLOW → done: round 2 >= 2 clears the gate.
      expect(JSON.parse((await submit("CONVERGED", 5, "reviewer")).stdout.trim())).toMatchObject({
        kind: "committed", version: 6,
      });

      const detail = await cli("detail", id, "--db", db);
      const detailDoc = JSON.parse(detail.stdout.trim()) as {
        instance: {
          kernelStatus: string;
          terminalDisposition: string | null;
          currentStep: string;
          round: number;
        };
      };
      expect(detailDoc.instance.kernelStatus).toBe("TERMINAL");
      expect(detailDoc.instance.terminalDisposition).toBe("done");
      expect(detailDoc.instance.currentStep).toBe("done");
      expect(detailDoc.instance.round).toBe(2);

      // The timeline carries the ordered gateDecisions — a blocked step
      // commits no row, so only the four committed rows appear; the final
      // CONVERGED-allow row carries the threshold allow decision.
      const timeline = await cli("timeline", id, "--db", db);
      const timelineRows = JSON.parse(timeline.stdout.trim()) as TimelineRow[];
      // seq 1 is the STARTED fact; the four committed transitions follow
      // (the blocked CONVERGED committed no row).
      expect(timelineRows[0]?.entryKind).toBe("STARTED");
      const timelineTx = timelineRows.filter((r) => r.entryKind === "transition");
      expect(timelineTx.map((r) => r.envelope?.type)).toEqual(["PASS", "PASS", "PASS", "CONVERGED"]);
      expect(timelineTx.map((r) => r.gateDecisions)).toEqual([
        [],
        [],
        [],
        [{ uses: "declarative.threshold", verdict: "allow" }],
      ]);

      // the staged store DB exists (the run really persisted).
      expect(existsSync(db)).toBe(true);
    },
  );

  it(
    "ch12-P4 V7: a context-free DEFERRED-HOLD lifecycle through all four verbs — create --mode deferredKickoff → start (held) → kickoff (activate)",
    { timeout: 30_000 },
    async () => {
      // The R-ACTIVATION-JOURNEY discharge (V7): the full CREATE→START→hold→
      // KICKOFF lifecycle drivable through the SHIPPED subprocess CLI. This
      // template is CONTEXT-FREE (no runtimeContext spec), so it never touches
      // the production provider registry — behavior is registry-independent.
      // Deterministic by construction (context-free + deferred: no provider
      // leg, and every state read lands BEFORE any immediate dispatch would
      // spawn an actor).
      const tsxBin = join(process.cwd(), "..", "node_modules", ".bin", "tsx");
      const mainPath = join(process.cwd(), "src", "cli", "main.ts");
      const templatesDir = join(process.cwd(), "templates");
      const dir = mkdtempSync(join(tmpdir(), "v3-journey-deferred-"));
      dirs.push(dir);
      const db = join(dir, "store.db");
      const cli = (...argv: string[]): Promise<{ stdout: string; stderr: string }> =>
        execFileAsync(tsxBin, [mainPath, ...argv]); // rejects on nonzero exit

      // create --mode deferredKickoff (NO task — task-less legal in deferred
      // mode) → Created + the instance id on stdout.
      const created = await cli(
        "create", "--db", db, "--mode", "deferredKickoff",
        "--templates-dir", templatesDir,
      );
      const createdDoc = JSON.parse(created.stdout.trim()) as { kind: string; instanceId: string };
      expect(createdDoc.kind).toBe("created");
      expect(createdDoc.instanceId).not.toBe("");
      const id = createdDoc.instanceId;

      // start → Accepted, the run WAITING(kickoff_pending) (the deferred hold).
      const started = await cli("start", id, "--db", db, "--templates-dir", templatesDir);
      expect(JSON.parse(started.stdout.trim())).toEqual({ kind: "accepted" });

      // detail shows kernelStatus WAITING + the typed wait (the EMITTED
      // camelCase read-doc grain, R1).
      const heldDetail = await cli("detail", id, "--db", db);
      const heldDoc = JSON.parse(heldDetail.stdout.trim()) as {
        instance: {
          kernelStatus: string;
          activationMode: string;
          currentStep: string | null;
          wait: { kind: string } | null;
        };
      };
      expect(heldDoc.instance.kernelStatus).toBe("WAITING");
      expect(heldDoc.instance.activationMode).toBe("deferred_kickoff");
      expect(heldDoc.instance.currentStep).toBeNull();
      expect(heldDoc.instance.wait?.kind).toBe("kickoff_pending");

      // the compact list row carries the WAITING discriminant + the wait KIND
      // only (R1's state-scan projection), never the full wait payload.
      const heldList = await cli("list", "--db", db);
      const heldRows = JSON.parse(heldList.stdout.trim()) as {
        instanceId: string;
        kernelStatus: string;
        wait: { kind: string } | null;
      }[];
      const heldRow = heldRows.find((r) => r.instanceId === id);
      expect(heldRow?.kernelStatus).toBe("WAITING");
      expect(heldRow?.wait).toEqual({ kind: "kickoff_pending" });

      // kickoff --task → activation (currentStep = template.start, round 1).
      const kicked = await cli("kickoff", id, "--db", db, "--task", "deferred task", "--templates-dir", templatesDir);
      const kickedDoc = JSON.parse(kicked.stdout.trim()) as { kind: string; version: number };
      expect(kickedDoc.kind).toBe("activated");

      const activeDetail = await cli("detail", id, "--db", db);
      const activeDoc = JSON.parse(activeDetail.stdout.trim()) as {
        instance: { kernelStatus: string; currentStep: string; round: number; task: string };
      };
      expect(activeDoc.instance.kernelStatus).toBe("ACTIVE");
      expect(activeDoc.instance.currentStep).toBe("implement");
      expect(activeDoc.instance.round).toBe(1);
      expect(activeDoc.instance.task).toBe("deferred task");
    },
  );

  it(
    "ch12-P4 V7 cancel lane: create --mode deferredKickoff → start (held) → cancel → TERMINAL(cancelled)",
    { timeout: 30_000 },
    async () => {
      const tsxBin = join(process.cwd(), "..", "node_modules", ".bin", "tsx");
      const mainPath = join(process.cwd(), "src", "cli", "main.ts");
      const templatesDir = join(process.cwd(), "templates");
      const dir = mkdtempSync(join(tmpdir(), "v3-journey-cancel-"));
      dirs.push(dir);
      const db = join(dir, "store.db");
      const cli = (...argv: string[]): Promise<{ stdout: string; stderr: string }> =>
        execFileAsync(tsxBin, [mainPath, ...argv]); // rejects on nonzero exit

      const created = await cli(
        "create", "--db", db, "--mode", "deferredKickoff",
        "--templates-dir", templatesDir,
      );
      const id = (JSON.parse(created.stdout.trim()) as { instanceId: string }).instanceId;

      const started = await cli("start", id, "--db", db, "--templates-dir", templatesDir);
      expect(JSON.parse(started.stdout.trim())).toEqual({ kind: "accepted" });

      // cancel → TERMINAL(cancelled) — the terminated outcome on stdout.
      const cancelled = await cli("cancel", id, "--db", db, "--templates-dir", templatesDir);
      expect(JSON.parse(cancelled.stdout.trim())).toEqual({
        kind: "terminated",
        disposition: "cancelled",
      });

      // detail's instance shows the terminal disposition.
      const detail = await cli("detail", id, "--db", db);
      const detailDoc = JSON.parse(detail.stdout.trim()) as {
        instance: { kernelStatus: string; terminalDisposition: string | null };
      };
      expect(detailDoc.instance.kernelStatus).toBe("TERMINAL");
      expect(detailDoc.instance.terminalDisposition).toBe("cancelled");

      // the compact list row's cancelled discriminant.
      const list = await cli("list", "--db", db);
      const rows = JSON.parse(list.stdout.trim()) as {
        instanceId: string;
        kernelStatus: string;
        terminalDisposition: string | null;
      }[];
      const row = rows.find((r) => r.instanceId === id);
      expect(row?.kernelStatus).toBe("TERMINAL");
      expect(row?.terminalDisposition).toBe("cancelled");
    },
  );
});
