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
 * canonical template carries. Both ACTOR roles reference the entry, so
 * the same value is expected at each of their dispatches, and a
 * single-role drive could not tell a two-sided authoring from a
 * one-sided one. Since ch14-p3b the template also declares a third role
 * — `operator` — which references NO block and never dispatches, so the
 * entry is no longer role-symmetric across the whole roles map.
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
  /** ch14-p3b: the OP-LESS DECISION_REQUEST class's correlation key. */
  requestRef?: string;
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

      // ch14-p3b: CONVERGED PARKS at the shipped `human_approval` gate,
      // so this journey's terminal is reached THROUGH the two operator
      // verbs — the same shipped subprocess entrypoint, no seam.
      const decided = await cli(
        "submit-decision", id, "--db", db, "--decision", "approve",
        "--templates-dir", templatesDir,
      );
      expect(JSON.parse(decided.stdout.trim())).toMatchObject({ kind: "committed", version: 5 });
      const resumed = await cli(
        "resume", id, "--db", db, "--event", "COMMIT", "--templates-dir", templatesDir,
      );
      expect(JSON.parse(resumed.stdout.trim())).toMatchObject({ kind: "committed", version: 6 });

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
      // The whole row sequence, since the park and the two operator
      // commits are what the terminal now runs through.
      expect(timelineRows.map((r) => r.entryKind)).toEqual([
        "STARTED",
        "transition",
        "transition",
        "DECISION_REQUEST",
        "DECISION_MADE",
        "WAIT_RESUMED",
      ]);
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
      // transition row inside its envelope. ch14-p3b: the ONE exception
      // is the park's DECISION_REQUEST, which is kernel-derived and
      // therefore OP-LESS by class — it correlates by `requestRef`, and
      // the exception is stated as a POSITIVE requirement on that class
      // rather than as a skip, so a row that lost its op id elsewhere
      // still reds.
      for (const r of tailRows) {
        if (r.entryKind === "DECISION_REQUEST") {
          expect(r.opId, "the DECISION_REQUEST class is op-less").toBeUndefined();
          expect(typeof r.requestRef, "…and correlates by requestRef").toBe("string");
          continue;
        }
        expect(
          typeof (r.entryKind === "transition" ? r.envelope?.opId : r.opId),
          `${r.entryKind} carries an op id`,
        ).toBe("string");
      }
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
      // review →(CONVERGED)→ the human_approval gate (ch14-p3b): the run
      // parks rather than terminating…
      expect(JSON.parse((await submit("CONVERGED", 5, "reviewer")).stdout.trim())).toMatchObject({
        kind: "committed", version: 6,
      });
      // …and the terminal is reached through the operator's approve and
      // the COMMIT resume. Neither edge is named by `advanceOnArrivalAt`,
      // so the round the Y1 restoration made observable stays 2.
      await cli(
        "submit-decision", id, "--db", db, "--decision", "approve",
        "--templates-dir", templatesDir,
      );
      await cli("resume", id, "--db", db, "--event", "COMMIT", "--templates-dir", templatesDir);

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

  it(
    "ch14-p3b J1: the CANONICAL local-pair-v0 — park → decide → resume through the SHIPPED verbs",
    { timeout: 60_000 },
    async () => {
      // R-ACTIVATION-JOURNEY's discharge for THIS packet, and what
      // distinguishes it from ch14-p3a's instance: the templates
      // directory is the CANONICAL `v3/templates`, so the artifact under
      // test is the SHIPPED file rather than a fixture written to prove
      // a point. Production bindings, a DETERMINISTIC actor bound
      // through the shipped actor-configuration surface (the file's own
      // `roles.operator.defaultActor`), subprocesses throughout. No
      // injected seam anywhere in this lane.
      const tsxBin = join(process.cwd(), "..", "node_modules", ".bin", "tsx");
      const mainPath = join(process.cwd(), "src", "cli", "main.ts");
      const templatesDir = join(process.cwd(), "templates");
      const dir = mkdtempSync(join(tmpdir(), "v3-journey-shipped-gate-"));
      dirs.push(dir);
      const db = join(dir, "store.db");
      const cli = (...argv: string[]): Promise<{ stdout: string; stderr: string }> =>
        execFileAsync(tsxBin, [mainPath, ...argv]); // rejects on nonzero exit
      const failing = (
        ...argv: string[]
      ): Promise<{ code?: number; stdout?: string; stderr?: string }> =>
        cli(...argv).then(
          () => {
            throw new Error(`expected a NONZERO exit from: ${argv.join(" ")}`);
          },
          (error: { code?: number; stdout?: string; stderr?: string }) => error,
        );
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

      const created = await cli(
        "create", "--db", db, "--task", "decide the shipped run",
        "--templates-dir", templatesDir,
      );
      const id = (JSON.parse(created.stdout.trim()) as { instanceId: string }).instanceId;
      await cli("start", id, "--db", db, "--templates-dir", templatesDir);

      // implement →(PASS)→ review →(CONVERGED)→ the PARK.
      expect(JSON.parse((await submit("PASS", 2, "implementer")).stdout.trim())).toMatchObject({
        kind: "committed", version: 3,
      });
      expect(JSON.parse((await submit("CONVERGED", 3, "reviewer")).stdout.trim())).toMatchObject({
        kind: "committed", version: 4,
      });

      // The operator DISCOVERS the Ask through the shipped read verb.
      const parked = await cli("detail", id, "--db", db, "--templates-dir", templatesDir);
      const parkedDoc = JSON.parse(parked.stdout.trim()) as {
        instance: { currentStep: string; wait: { kind: string } };
        pendingDecision: {
          operator: string;
          question: string;
          recommendation: string;
          allowedDecisions: string[];
          decisionRequirements: Record<string, string[]>;
          context: { task: string };
        };
      };
      expect(parkedDoc.instance.currentStep).toBe("human_approval");
      expect(parkedDoc.instance.wait.kind).toBe("human_decision");
      expect(parkedDoc.pendingDecision).toMatchObject({
        operator: "human",
        question: "The reviewer has converged. Decide how this run continues.",
        recommendation: "approve",
        allowedDecisions: ["approve", "request_rework"],
        // `refs` is declared `required: false`, so it reaches no
        // requirement list — the field is a REQUIRED-field list.
        decisionRequirements: { approve: [], request_rework: ["instruction"] },
      });
      expect(parkedDoc.pendingDecision.context.task).toBe("decide the shipped run");

      // THE ORDER OF THE NEGATIVES IS PART OF THE ROUTE, because the
      // third of them COMMITS and moves the run off the gate.
      //
      // NEGATIVE 1 — `override_required`: a verdict AGAINST the recorded
      // recommendation without the flag. THE PAYLOAD IS PART OF THE LEG:
      // the guard order runs `missing_required_field` BEFORE the override
      // guards, so the same call without it would green on the wrong
      // rejection.
      const needsOverride = await failing(
        "submit-decision", id, "--db", db, "--decision", "request_rework",
        "--payload", '{"instruction":"tighten the error path"}',
        "--templates-dir", templatesDir,
      );
      expect(needsOverride.code).toBe(3);
      expect(JSON.parse((needsOverride.stdout ?? "").trim())).toEqual({
        kind: "rejected", reason: "override_required",
      });

      // NEGATIVE 2 — `override_not_applicable`: AGREEING with the
      // recommendation while carrying the flag. Non-committing too.
      const notApplicable = await failing(
        "submit-decision", id, "--db", db, "--decision", "approve", "--override",
        "--templates-dir", templatesDir,
      );
      expect(notApplicable.code).toBe(3);
      expect(JSON.parse((notApplicable.stdout ?? "").trim())).toEqual({
        kind: "rejected", reason: "override_not_applicable",
      });

      // THE COMMITTING ONE: `request_rework` WITH the flag and its
      // required payload — back to `implement`, in a NEW round.
      const reworked = await cli(
        "submit-decision", id, "--db", db, "--decision", "request_rework", "--override",
        "--payload", '{"instruction":"tighten the error path"}',
        "--templates-dir", templatesDir,
      );
      expect(JSON.parse(reworked.stdout.trim())).toMatchObject({ kind: "committed", version: 5 });
      const reopened = await cli("detail", id, "--db", db, "--templates-dir", templatesDir);
      const reopenedDoc = JSON.parse(reopened.stdout.trim()) as {
        instance: { currentStep: string; kernelStatus: string; round: number };
      };
      expect(reopenedDoc.instance.currentStep).toBe("implement");
      expect(reopenedDoc.instance.kernelStatus).toBe("ACTIVE");
      // `implement` IS the round declaration's arrival step — the rework
      // round advance, observable end to end.
      expect(reopenedDoc.instance.round).toBe(2);

      // A SECOND traversal to the second park, where the approve leg and
      // the resume complete the route.
      expect(JSON.parse((await submit("PASS", 5, "implementer")).stdout.trim())).toMatchObject({
        kind: "committed", version: 6,
      });
      expect(JSON.parse((await submit("CONVERGED", 6, "reviewer")).stdout.trim())).toMatchObject({
        kind: "committed", version: 7,
      });

      // DECIDE: `--by` ABSENT defaults to the bound operator the same
      // read supplies.
      const decided = await cli(
        "submit-decision", id, "--db", db, "--decision", "approve",
        "--templates-dir", templatesDir,
      );
      expect(JSON.parse(decided.stdout.trim())).toMatchObject({ kind: "committed", version: 8 });

      const waiting = await cli("detail", id, "--db", db, "--templates-dir", templatesDir);
      const waitingDoc = JSON.parse(waiting.stdout.trim()) as {
        instance: { currentStep: string; wait: { kind: string } };
      };
      expect(waitingDoc.instance.currentStep).toBe("commit_pending");
      expect(waitingDoc.instance.wait.kind).toBe("commit_pending");
      // The gate is closed and the Ask is GONE, with NO key in its place.
      expect(Object.keys(waitingDoc as Record<string, unknown>).sort()).toEqual([
        "instance",
        "runner",
        "transcript",
      ]);

      // RESUME: the bare wait's declared event routes to the terminal.
      const resumed = await cli(
        "resume", id, "--db", db, "--event", "COMMIT", "--templates-dir", templatesDir,
      );
      expect(JSON.parse(resumed.stdout.trim())).toMatchObject({ kind: "committed", version: 9 });

      // OBSERVED through the shipped read verbs.
      const final = await cli("detail", id, "--db", db, "--templates-dir", templatesDir);
      const finalDoc = JSON.parse(final.stdout.trim()) as {
        instance: { kernelStatus: string; terminalDisposition: string | null; round: number };
      };
      expect(finalDoc.instance.kernelStatus).toBe("TERMINAL");
      expect(finalDoc.instance.terminalDisposition).toBe("done");
      // Neither operator edge is named by `advanceOnArrivalAt`, so the
      // round stays where the rework put it.
      expect(finalDoc.instance.round).toBe(2);

      const timeline = await cli("timeline", id, "--db", db);
      const rows = JSON.parse(timeline.stdout.trim()) as TimelineRow[];
      expect(rows.map((r) => r.entryKind)).toEqual([
        "STARTED",
        "transition",
        "transition",
        "DECISION_REQUEST",
        "DECISION_MADE",
        "transition",
        "transition",
        "DECISION_REQUEST",
        "DECISION_MADE",
        "WAIT_RESUMED",
      ]);
    },
  );

  it(
    "ch14-p3a J1: park → decide → resume through the SHIPPED verbs, on a STAGED gate template",
    { timeout: 30_000 },
    async () => {
      // R-ACTIVATION-JOURNEY's discharge for this packet: the two new
      // operator verbs drive the human's side of a real run as SUBPROCESSES
      // through the shipped entrypoint, against PRODUCTION bindings, with a
      // DETERMINISTIC actor bound through the shipped actor-configuration
      // surface (the template file's `roles.operator.defaultActor`). No
      // injected seam anywhere in this lane.
      //
      // The template is STAGED into a temp templates dir: the shipped
      // `local-pair-v0` declares no gate until ch14-p3b, and this packet's
      // boundary carries neither that file nor the shared fixture.
      const tsxBin = join(process.cwd(), "..", "node_modules", ".bin", "tsx");
      const mainPath = join(process.cwd(), "src", "cli", "main.ts");
      const templatesDir = mkdtempSync(join(tmpdir(), "v3-journey-gate-tpl-"));
      dirs.push(templatesDir);
      writeFileSync(
        join(templatesDir, "human-pair-v0@1.yaml"),
        `ref:
  id: human-pair-v0
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
        target: commit_pending
      request_rework:
        target: implement
        payload:
          instruction:
            required: true
  commit_pending:
    type: wait
    wait:
      kind: commit_pending
      resumeEvents:
        - COMMIT
    onResume:
      COMMIT: done
terminal:
  - done
roles:
  implementer:
    defaultActor: codex
  operator:
    defaultActor: human-1
`,
      );
      const dir = mkdtempSync(join(tmpdir(), "v3-journey-gate-"));
      dirs.push(dir);
      const db = join(dir, "store.db");
      const cli = (...argv: string[]): Promise<{ stdout: string; stderr: string }> =>
        execFileAsync(tsxBin, [mainPath, ...argv]); // rejects on nonzero exit
      const failing = (
        ...argv: string[]
      ): Promise<{ code?: number; stdout?: string; stderr?: string }> =>
        cli(...argv).then(
          () => {
            throw new Error(`expected a NONZERO exit from: ${argv.join(" ")}`);
          },
          (error: { code?: number; stdout?: string; stderr?: string }) => error,
        );

      const created = await cli(
        "create", "--db", db, "--task", "decide it", "--template", "human-pair-v0@1",
        "--templates-dir", templatesDir,
      );
      const id = (JSON.parse(created.stdout.trim()) as { instanceId: string }).instanceId;
      await cli("start", id, "--db", db, "--templates-dir", templatesDir);

      // NAMED NEGATIVE 1: a submit-decision against a run with NO pending
      // decision reaches V4 (ii) — exit 3, ONE error document on stderr.
      const notParked = await failing(
        "submit-decision", id, "--db", db, "--decision", "approve",
        "--templates-dir", templatesDir,
      );
      expect(notParked.code).toBe(3);
      expect(notParked.stdout?.trim()).toBe("");
      expect(JSON.parse((notParked.stderr ?? "").trim())).toMatchObject({
        error: { class: "not_found", name: "NoPendingDecision" },
      });

      // PARK: the agent's PASS routes into the gate.
      await cli(
        "submit", "--db", db, "--instance", id, "--type", "PASS",
        "--expected-version", "2", "--expected-role", "implementer",
        "--templates-dir", templatesDir,
      );

      // The operator DISCOVERS the Ask through the shipped read verb —
      // everything the decision needs is in ONE committed-state read.
      const parked = await cli("detail", id, "--db", db, "--templates-dir", templatesDir);
      const parkedDoc = JSON.parse(parked.stdout.trim()) as {
        instance: { wait: { kind: string } };
        pendingDecision: {
          instanceId: string;
          expectedVersion: number;
          requestRef: string;
          operator: string;
          question: string;
          recommendation: string;
          context: { task: string };
          allowedDecisions: string[];
          decisionRequirements: Record<string, string[]>;
        };
      };
      // The WHOLE top-level keyset, against a closed literal: a second
      // explanatory key would pass every field assert below.
      expect(Object.keys(parkedDoc).sort()).toEqual([
        "instance",
        "pendingDecision",
        "runner",
        "transcript",
      ]);
      expect(parkedDoc.instance.wait.kind).toBe("human_decision");
      expect(parkedDoc.pendingDecision).toMatchObject({
        instanceId: id,
        expectedVersion: 3,
        operator: "human-1",
        question: "approve it?",
        recommendation: "approve",
        allowedDecisions: ["approve", "request_rework"],
        decisionRequirements: { approve: [], request_rework: ["instruction"] },
      });
      expect(parkedDoc.pendingDecision.context.task).toBe("decide it");
      expect(parkedDoc.pendingDecision.requestRef).not.toBe("");

      // NAMED NEGATIVE 2: an EXPLICIT wrong `--by` reaches the kernel's
      // authority rung and comes back as a DATA outcome — exit 3, stdout.
      const wrongBy = await failing(
        "submit-decision", id, "--db", db, "--decision", "approve",
        "--by", "not-the-operator", "--templates-dir", templatesDir,
      );
      expect(wrongBy.code).toBe(3);
      expect(wrongBy.stderr?.trim()).toBe("");
      expect(JSON.parse((wrongBy.stdout ?? "").trim())).toEqual({
        kind: "rejected",
        reason: "operator_not_authorized",
      });

      // DECIDE: `--by` ABSENT defaults to the SAME read's bound operator.
      const decided = await cli(
        "submit-decision", id, "--db", db, "--decision", "approve",
        "--templates-dir", templatesDir,
      );
      expect(JSON.parse(decided.stdout.trim())).toMatchObject({
        kind: "committed",
        version: 4,
      });

      const waiting = await cli("detail", id, "--db", db, "--templates-dir", templatesDir);
      const waitingDoc = JSON.parse(waiting.stdout.trim()) as {
        instance: { currentStep: string; wait: { kind: string } };
      };
      expect(waitingDoc.instance.currentStep).toBe("commit_pending");
      expect(waitingDoc.instance.wait.kind).toBe("commit_pending");
      // The gate is closed and the Ask is GONE — the member is absent
      // again, and NO key takes its place: the CLOSED keyset is what says
      // so, where `not.toHaveProperty` would pass a second key.
      expect(waitingDoc).not.toHaveProperty("pendingDecision");
      expect(Object.keys(waitingDoc as Record<string, unknown>).sort()).toEqual([
        "instance",
        "runner",
        "transcript",
      ]);

      // RESUME: the bare wait's declared event routes to the terminal.
      const resumed = await cli(
        "resume", id, "--db", db, "--event", "COMMIT", "--templates-dir", templatesDir,
      );
      expect(JSON.parse(resumed.stdout.trim())).toMatchObject({
        kind: "committed",
        version: 5,
      });

      // OBSERVED through the shipped read verbs.
      const final = await cli("detail", id, "--db", db, "--templates-dir", templatesDir);
      const finalDoc = JSON.parse(final.stdout.trim()) as {
        instance: { kernelStatus: string; terminalDisposition: string | null };
      };
      expect(finalDoc.instance.kernelStatus).toBe("TERMINAL");
      expect(finalDoc.instance.terminalDisposition).toBe("done");
      expect(Object.keys(finalDoc as Record<string, unknown>).sort()).toEqual([
        "instance",
        "runner",
        "transcript",
      ]);

      const timeline = await cli("timeline", id, "--db", db);
      const rows = JSON.parse(timeline.stdout.trim()) as TimelineRow[];
      expect(rows.map((r) => r.entryKind)).toEqual([
        "STARTED",
        "transition",
        "DECISION_REQUEST",
        "DECISION_MADE",
        "WAIT_RESUMED",
      ]);
    },
  );
});
