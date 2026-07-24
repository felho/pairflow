import { execFile, execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import { afterEach, describe, expect, it } from "vitest";

import { openDiagStore } from "../diag/index.js";
import { createControlledClock } from "../testkit/index.js";
import { deriveDiagDbPath } from "./common.js";

const execFileAsync = promisify(execFile);

/**
 * The ACTIVATION JOURNEY (packet ch9-p2, J1/J2; R-ACTIVATION-JOURNEY) — the
 * `pairflow.worktree` provider wired into a LIVE path reachable from the
 * shipped `start` entrypoint, driven through the SHIPPED CLI as subprocesses
 * (the ch8-P2 journey.test.ts culture): production bindings, a real store file
 * + a real host git repo, ZERO test seams.
 *
 * FIXTURE LAYOUT (J1): the host repo is a NAMED SUBDIR under the journey's
 * registered-and-swept temp root, never a mkdtemp root itself — so the
 * beside-repo default worktree (`<repo-parent>/.pairflow-worktrees/<repo-name>`)
 * lands INSIDE the swept root and never leaks into the shared system tmpdir.
 * The template file is JOURNEY-AUTHORED (J3/flag F4): its `config.repo` must
 * embed the per-run temp fixture path no repo-canonical file can carry.
 */

const roots: string[] = [];
afterEach(() => {
  for (const dir of roots.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

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

/** A journey-authored template declaring the worktree runtime context whose
 * `config.repo` embeds the per-run fixture path. */
function writeTemplate(templatesDir: string, repoConfig: string): void {
  mkdirSync(templatesDir, { recursive: true });
  const yaml = [
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
  ].join("\n");
  writeFileSync(join(templatesDir, "local-pair-v0@1.yaml"), yaml);
}

interface Detail {
  instance: {
    kernelStatus: string;
    terminalDisposition: string | null;
    failureReason: string | null;
    runtimeContext:
      | {
          state: "ready";
          ref: {
            kind: string;
            locator: { path: string; branch: string; repo: string; base_commit: string };
          };
        }
      | { state: "none" }
      | { state: "requested"; requestId: string };
  };
}

/**
 * Fix G — the PRODUCTION diag path readback: the shipped composition emits the
 * runner-plane provisioning event through the DG4 sink WRAPPER onto the
 * derived-path diag store (`<db>.diag.sqlite`). Reading it back (a READ, never
 * a seam in the emission path — the twin of J1's host-git reads) proves the
 * production composition emitted the DG2 event: REMOVING the DG4 wrapper leaves
 * ZERO runner rows, and a mis-spelled kind fails the read gate — either way RED.
 */
async function readRunnerRows(
  db: string,
  instanceId: string,
): Promise<readonly { kind: string; requestId?: string; providerReason?: string }[]> {
  const handle = openDiagStore(deriveDiagDbPath(db), createControlledClock(0));
  try {
    const rows = await handle.reader.getDiagnostics(instanceId, 0);
    return rows.filter((r) => r.source === "runner");
  } finally {
    handle.close();
  }
}

describe("cli — the worktree activation journey (packet ch9-p2: J1/J2)", () => {
  const tsxBin = join(process.cwd(), "..", "node_modules", ".bin", "tsx");
  const mainPath = join(process.cwd(), "src", "cli", "main.ts");

  function setup(): { root: string; db: string; templatesDir: string } {
    const root = mkdtempSync(join(tmpdir(), "v3-wt-journey-"));
    roots.push(root);
    return { root, db: join(root, "store.db"), templatesDir: join(root, "templates") };
  }

  it(
    "J1 READY: create → start → a real branch-isolated worktree at the C8 path, floor READY ref + ACTIVE state",
    { timeout: 30_000 },
    async () => {
      const { root, db, templatesDir } = setup();
      const { repo, head } = makeHostRepo(root);
      writeTemplate(templatesDir, repo);
      const cli = (...argv: string[]): Promise<{ stdout: string }> =>
        execFileAsync(tsxBin, [mainPath, ...argv]);

      const created = await cli("create", "--db", db, "--task", "journey", "--templates-dir", templatesDir);
      const createdDoc = JSON.parse(created.stdout.trim()) as { kind: string; instanceId: string };
      expect(createdDoc.kind).toBe("created");
      const id = createdDoc.instanceId;

      const started = await cli("start", id, "--db", db, "--templates-dir", templatesDir);
      // The required-context START rides the async READY path → `accepted`.
      expect(JSON.parse(started.stdout.trim()) as { kind: string }).toEqual({ kind: "accepted" });

      // Post-exit floor read: the run is READY-committed and ACTIVE, carrying
      // the RP1 ref.
      const detail = JSON.parse(
        (await cli("detail", id, "--db", db)).stdout.trim(),
      ) as Detail;
      expect(detail.instance.kernelStatus).toBe("ACTIVE");
      const rc = detail.instance.runtimeContext;
      expect(rc.state).toBe("ready");
      if (rc.state !== "ready") throw new Error("expected ready runtime context");
      expect(rc.ref.kind).toBe("worktree");
      const loc = rc.ref.locator;
      expect(Object.keys(loc).sort()).toEqual(["base_commit", "branch", "path", "repo"]);

      // The worktree directory exists at the C8-derived path.
      expect(existsSync(loc.path)).toBe(true);
      // The branch exists at the resolved base commit.
      expect(gitOut(repo, "rev-parse", loc.branch)).toBe(head);
      expect(loc.base_commit).toBe(head);
      // The fresh worktree's HEAD equals the base commit.
      expect(gitOut(loc.path, "rev-parse", "HEAD")).toBe(head);

      // Fix G — the production diag path: exactly ONE runner-plane row, a
      // `provision_ready` carrying the kernel-minted requestId (the composed
      // `req-<epochMillis>-<n>` form). The READY-committed floor read above ALSO
      // proves R2's `withKernel` settle drain: under PB2's synchronous shape the
      // completion is held and flushed at the START attempt's conclusion — the
      // run could not be READY-committed at process exit unless the drain
      // completed. (`withKernel` is composition-internal, not exported; the
      // journey is its proof surface.)
      const runnerRows = await readRunnerRows(db, id);
      expect(runnerRows).toHaveLength(1);
      expect(runnerRows[0]?.kind).toBe("provision_ready");
      expect(runnerRows[0]?.requestId).toMatch(/^req-\d+-\d+$/);
    },
  );

  it(
    "J2 FAILED: a non-repository `repo` → start → TERMINAL failed(sys:provision_rejected), floor-visible",
    { timeout: 30_000 },
    async () => {
      const { root, db, templatesDir } = setup();
      // A real directory that is NOT a git repository (S2 lane d — the
      // cheapest deterministic FAILED member).
      const notRepo = join(root, "not-a-repo");
      mkdirSync(notRepo, { recursive: true });
      writeTemplate(templatesDir, notRepo);
      const cli = (...argv: string[]): Promise<{ stdout: string }> =>
        execFileAsync(tsxBin, [mainPath, ...argv]);

      const created = await cli("create", "--db", db, "--task", "journey", "--templates-dir", templatesDir);
      const id = (JSON.parse(created.stdout.trim()) as { instanceId: string }).instanceId;

      const started = await cli("start", id, "--db", db, "--templates-dir", templatesDir);
      // The detach ack rides `accepted`; the FAILED completion terminalizes the
      // run at the attempt's conclusion, BEFORE the process exits.
      expect(JSON.parse(started.stdout.trim()) as { kind: string }).toEqual({ kind: "accepted" });

      const detail = JSON.parse(
        (await cli("detail", id, "--db", db)).stdout.trim(),
      ) as Detail;
      expect(detail.instance.kernelStatus).toBe("TERMINAL");
      expect(detail.instance.terminalDisposition).toBe("failed");
      expect(detail.instance.failureReason).toBe("sys:provision_rejected");

      // Fix G — the production diag path: exactly ONE runner-plane row, a
      // `provision_failed` carrying the requestId and the VERBATIM provider
      // reason (the provider's REPORT, never the kernel's classified verdict —
      // here they coincide, but the field is the report).
      const runnerRows = await readRunnerRows(db, id);
      expect(runnerRows).toHaveLength(1);
      expect(runnerRows[0]?.kind).toBe("provision_failed");
      expect(runnerRows[0]?.requestId).toMatch(/^req-\d+-\d+$/);
      expect(runnerRows[0]?.providerReason).toBe("sys:provision_rejected");
    },
  );
});
