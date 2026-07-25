import { execFile, execFileSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import { afterEach, describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);

/**
 * The R-ACTIVATION-JOURNEY family (packet ch9-p4b, J1) — the operator runner
 * plane driven through the SHIPPED CLI as subprocesses (the ch8-P2 /
 * worktreeJourney culture): production bindings, real tmux sessions, real host
 * git repos + worktrees, real gate spawns, deterministic stub actors bound
 * through the shipped `--actor-cmd` surface. tmux + git are declared
 * test-environment requirements.
 *
 * FIXTURE LAYOUT (J1): the host repo is a NAMED SUBDIR under the per-run swept
 * temp root, so the beside-repo worktree lands INSIDE the swept root.
 */

const roots: string[] = [];
afterEach(() => {
  for (const dir of roots.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

const tsxBin = join(process.cwd(), "..", "node_modules", ".bin", "tsx");
const mainPath = join(process.cwd(), "src", "cli", "main.ts");

interface CliResult {
  code: number;
  stdout: string;
  stderr: string;
}

async function cli(...args: string[]): Promise<CliResult> {
  try {
    const { stdout, stderr } = await execFileAsync(tsxBin, [mainPath, ...args]);
    return { code: 0, stdout, stderr };
  } catch (error) {
    const e = error as { code?: number; stdout?: string; stderr?: string };
    return { code: e.code ?? 1, stdout: e.stdout ?? "", stderr: e.stderr ?? "" };
  }
}

function git(cwd: string, ...args: string[]): void {
  execFileSync("git", args, { cwd, stdio: "pipe" });
}
function gitOut(cwd: string, ...args: string[]): string {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

function makeHostRepo(root: string): { repo: string; head: string } {
  const repo = join(root, "host");
  mkdirSync(repo, { recursive: true });
  git(repo, "init", "-q", "-b", "main");
  git(repo, "config", "user.email", "t@example.com");
  git(repo, "config", "user.name", "Test");
  git(repo, "config", "commit.gpgsign", "false");
  writeFileSync(join(repo, "README.md"), "journey");
  git(repo, "add", "-A");
  git(repo, "commit", "-q", "-m", "init");
  return { repo, head: gitOut(repo, "rev-parse", "HEAD") };
}

/** A single-step worktree template; `gated` attaches an `external.process`
 * gate (command `true`, allow-on-zero) on the CONVERGED transition. */
function writeTemplate(templatesDir: string, repoConfig: string, gated: boolean): void {
  mkdirSync(templatesDir, { recursive: true });
  const lines = [
    "ref:",
    "  id: local-pair-v0",
    "  version: 1",
    "start: implement",
    "steps:",
    "  implement:",
    "    role: implementer",
    "    instruction: build it",
    "    transitions:",
    "      CONVERGED: done",
  ];
  if (gated) {
    lines.push(
      "    gates:",
      "      CONVERGED:",
      "        - uses: external.process",
      '          config: { command: "true", timeoutMs: 5000, output: { mode: exitCode }, onExit: { zero: allow, nonzero: block } }',
    );
  }
  lines.push(
    "terminal:",
    "  - done",
    "roles:",
    "  implementer:",
    "    defaultActor: codex",
    "runtimeContext:",
    "  kind: worktree",
    "  provider: pairflow.worktree",
    "  config:",
    `    repo: ${repoConfig}`,
    "",
  );
  writeFileSync(join(templatesDir, "local-pair-v0@1.yaml"), lines.join("\n"));
}

/** The deterministic stub actor — bound through the shipped `--actor-cmd`
 * surface. The emitting stub writes a CONVERGED op to `PAIRFLOW_EMIT`; the
 * silent stub exits 0 writing nothing (→ no_output → unconfirmed). */
function writeStub(root: string, name: string, emit: boolean): string {
  const path = join(root, name);
  const body = emit
    ? `import { writeFileSync } from "node:fs";\nwriteFileSync(process.env.PAIRFLOW_EMIT, JSON.stringify({ type: "CONVERGED", payload: {} }));\n`
    : `process.exit(0);\n`;
  writeFileSync(path, body);
  return path;
}

function actorCmd(stubPath: string): string {
  return JSON.stringify({ cmd: process.execPath, args: [stubPath] });
}

interface DetailDoc {
  instance: {
    kernelStatus: string;
    terminalDisposition: string | null;
    runtimeContext:
      | { state: "ready"; ref: { locator: { path: string; branch: string } } }
      | { state: "none" }
      | { state: "requested"; requestId: string };
  };
  runner: {
    errand: Record<string, unknown>;
    attach: Record<string, unknown>;
    runtimeContextSummary: Record<string, unknown>;
  };
}

interface OnceDoc {
  errands: {
    instanceId: string;
    state: string;
    remainingBudget: number;
    contextPacketId: string;
  }[];
}

function setup(): { root: string; db: string; templatesDir: string } {
  const root = mkdtempSync(join(tmpdir(), "v3-runner-journey-"));
  roots.push(root);
  return { root, db: join(root, "store.db"), templatesDir: join(root, "templates") };
}

async function createAndStart(db: string, templatesDir: string): Promise<string> {
  const created = await cli("create", "--db", db, "--task", "journey", "--templates-dir", templatesDir);
  expect(created.code).toBe(0);
  const id = (JSON.parse(created.stdout.trim()) as { instanceId: string }).instanceId;
  const started = await cli("start", id, "--db", db, "--templates-dir", templatesDir);
  expect(started.code).toBe(0);
  return id;
}

describe("cli — the operator runner activation journeys (packet ch9-p4b: J1)", () => {
  it(
    "J-DELIVER: create → start → runner run --once through the tmux channel → the emitted op commits, the errand confirms, the attempt ran in the worktree cwd",
    { timeout: 60_000 },
    async () => {
      const { root, db, templatesDir } = setup();
      const { repo } = makeHostRepo(root);
      writeTemplate(templatesDir, repo, false);
      const stub = writeStub(root, "emit.mjs", true);
      const id = await createAndStart(db, templatesDir);

      const run = await cli(
        "runner",
        "run",
        "--db",
        db,
        "--templates-dir",
        templatesDir,
        "--actor-cmd",
        actorCmd(stub),
        "--once",
      );
      expect(run.code).toBe(0);
      const once = JSON.parse(run.stdout.trim()) as OnceDoc;
      const errand = once.errands.find((e) => e.instanceId === id);
      expect(errand?.state).toBe("confirmed"); // the delivered op landed committed → confirmed

      // detail's runner section: the confirmed errand + the worktree
      // projection (the summary needs `--templates-dir` for the provider name —
      // the degrade-vs-demand election: without it, detail degrades in-doc).
      const detail = JSON.parse(
        (await cli("detail", id, "--db", db, "--templates-dir", templatesDir)).stdout.trim(),
      ) as DetailDoc;
      expect(detail.runner.errand).toMatchObject({ state: "confirmed" });
      expect(detail.runner.runtimeContextSummary).toMatchObject({ kind: "worktree" });

      // The attempt ran INSIDE the worktree cwd: the adapter's per-attempt
      // handoff dir landed under the ledger-recorded worktree path.
      const rc = detail.instance.runtimeContext;
      expect(rc.state).toBe("ready");
      if (rc.state !== "ready") throw new Error("expected ready runtime context");
      expect(existsSync(join(rc.ref.locator.path, ".pairflow"))).toBe(true);
    },
  );

  it(
    "J-GATE: a gate-bearing worktree run → the REAL gate spawn executes in the worktree cwd, the kernel commits, evidence durably resolvable (RED under the fail-closed slot)",
    { timeout: 60_000 },
    async () => {
      const { root, db, templatesDir } = setup();
      const { repo, head } = makeHostRepo(root);
      writeTemplate(templatesDir, repo, true); // the CONVERGED transition carries a process gate
      const stub = writeStub(root, "emit.mjs", true);
      const id = await createAndStart(db, templatesDir);

      const run = await cli(
        "runner",
        "run",
        "--db",
        db,
        "--templates-dir",
        templatesDir,
        "--actor-cmd",
        actorCmd(stub),
        "--once",
      );
      expect(run.code).toBe(0);

      // Under the REAL runner the gate SPAWNED, exited 0, allowed the CONVERGED
      // transition → the run reached TERMINAL(done). Under the fail-closed slot
      // the gate blocks (gate_blocked(sys:runner_error)) and the run never
      // terminalizes — this assertion is the swap's activation proof.
      const detail = JSON.parse((await cli("detail", id, "--db", db)).stdout.trim()) as DetailDoc;
      expect(detail.instance.kernelStatus).toBe("TERMINAL");
      expect(detail.instance.terminalDisposition).toBe("done");

      // The evidence record is durably resolvable on the derived sibling path,
      // carrying the REAL measured workspace fact (the worktree HEAD) — never
      // the fail-closed sentinel.
      const evDb = new DatabaseSync(`${db}.process-evidence.sqlite`);
      const rows = evDb.prepare("SELECT record FROM process_evidence").all() as { record: string }[];
      evDb.close();
      const records = rows.map((r) => JSON.parse(r.record) as { kind: string; headSha: string });
      expect(records.length).toBeGreaterThanOrEqual(1);
      expect(records.some((r) => r.kind === "ok" && r.headSha === head)).toBe(true);
    },
  );

  it(
    "J-ATTACH-LANE: attach against a run with no live attempt → the clean 'not running' doc, exit 3",
    { timeout: 60_000 },
    async () => {
      const { root, db, templatesDir } = setup();
      const { repo } = makeHostRepo(root);
      writeTemplate(templatesDir, repo, false);
      const id = await createAndStart(db, templatesDir); // no `runner run` → no errand ledger

      const attach = await cli("attach", id, "--db", db);
      expect(attach.code).toBe(3);
      const doc = JSON.parse(attach.stderr.trim()) as { error: { class: string; name: string } };
      expect(doc.error.class).toBe("not_found");
      expect(doc.error.name).toBe("NotRunning");
    },
  );

  it(
    "J-RESPAWN: a silent stub drives the errand to unconfirmed → runner respawn with an emitting stub → confirmed, the respawn attempt UNBUDGETED",
    { timeout: 60_000 },
    async () => {
      const { root, db, templatesDir } = setup();
      const { repo } = makeHostRepo(root);
      writeTemplate(templatesDir, repo, false);
      const silent = writeStub(root, "silent.mjs", false);
      const emit = writeStub(root, "emit.mjs", true);
      const id = await createAndStart(db, templatesDir);

      // A silent (no-emit, exit 0) attempt → no_output → the errand rests unconfirmed.
      const firstRun = await cli(
        "runner",
        "run",
        "--db",
        db,
        "--templates-dir",
        templatesDir,
        "--actor-cmd",
        actorCmd(silent),
        "--once",
      );
      expect(firstRun.code).toBe(0);
      const afterSilent = (JSON.parse(firstRun.stdout.trim()) as OnceDoc).errands.find((e) => e.instanceId === id);
      expect(afterSilent?.state).toBe("unconfirmed");
      const budgetAfterSilent = afterSilent?.remainingBudget;
      expect(typeof budgetAfterSilent).toBe("number");

      // The respawn edge with an EMITTING stub → the errand lands confirmed and
      // the respawn attempt is UNBUDGETED (remaining budget unchanged).
      const respawn = await cli(
        "runner",
        "respawn",
        id,
        "--db",
        db,
        "--templates-dir",
        templatesDir,
        "--actor-cmd",
        actorCmd(emit),
      );
      expect(respawn.code).toBe(0);
      const post = JSON.parse(respawn.stdout.trim()) as { state: string; remainingBudget: number };
      expect(post.state).toBe("confirmed");
      expect(post.remainingBudget).toBe(budgetAfterSilent); // unbudgeted edge
    },
  );
});
