import { execFileSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import type { RuntimeContextCompletion, RuntimeContextRef, RuntimeContextSpec } from "../domain/index.js";
import type { RuntimeContextCompletionSink } from "../ports/runtimeContextProvider.js";
import { enc } from "../runner/enc.js";
import { TimerKnobError } from "../runner/spawn.js";
import { createWorktreeProvider } from "./worktreeProvider.js";
import type { WorktreeProviderOptions } from "./worktreeProvider.js";

/**
 * The `pairflow.worktree` provider families (packet ch9-p2, S/N/M/PB/RP) —
 * driven against REAL temp git repos (integration-grain BY DESIGN: the
 * mechanics ARE the subject; a recording sink stands in for the kernel).
 * FIXTURE LAYOUT rule (J1): every fixture repo is a NAMED SUBDIR under the
 * swept temp root, never a mkdtemp root itself — so the beside-repo default
 * worktree (`<repo-parent>/.pairflow-worktrees/<repo-name>`) lands INSIDE the
 * swept root and never leaks into the shared system tmpdir.
 */

const roots: string[] = [];
afterEach(() => {
  for (const dir of roots.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "v3-worktree-"));
  roots.push(root);
  return root;
}

function git(cwd: string, ...args: string[]): void {
  execFileSync("git", args, { cwd, stdio: "pipe" });
}
function gitOut(cwd: string, ...args: string[]): string {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

/** A real git repo as a NAMED SUBDIR of `root`, with `commits` commits. */
function makeRepo(root: string, name: string, commits = 1): string {
  const repo = join(root, name);
  mkdirSync(repo, { recursive: true });
  git(repo, "init", "-q", "-b", "main");
  git(repo, "config", "user.email", "t@example.com");
  git(repo, "config", "user.name", "Test");
  git(repo, "config", "commit.gpgsign", "false");
  for (let i = 0; i < commits; i += 1) {
    writeFileSync(join(repo, `f${String(i)}.txt`), `content ${String(i)}`);
    git(repo, "add", "-A");
    git(repo, "commit", "-q", "-m", `commit ${String(i)}`);
  }
  return repo;
}

/** An empty non-repository directory (a NAMED SUBDIR of root). */
function makePlainDir(root: string, name: string): string {
  const dir = join(root, name);
  mkdirSync(dir, { recursive: true });
  return dir;
}

interface Recorder {
  readonly completions: { instanceId: string; requestId: string; completion: RuntimeContextCompletion }[];
  readonly sink: RuntimeContextCompletionSink;
}
function recorder(): Recorder {
  const completions: Recorder["completions"] = [];
  return {
    completions,
    sink: (instanceId, requestId, completion) => {
      completions.push({ instanceId, requestId, completion });
    },
  };
}

/** Provision once through a bound provider; returns the single completion. */
async function provisionOnce(
  spec: RuntimeContextSpec,
  opts: WorktreeProviderOptions = {},
  ids: { instanceId?: string; requestId?: string } = {},
): Promise<{ completion: RuntimeContextCompletion; completions: Recorder["completions"] }> {
  const provider = createWorktreeProvider(opts);
  const rec = recorder();
  provider.bindCompletionSink(rec.sink);
  await provider.provision(ids.instanceId ?? "i1", ids.requestId ?? "r1", spec);
  // EXACTLY-ONE completion is UNIVERSAL (PB1): the shared helper asserts it on
  // EVERY provision lane (S/N/M/PB/RP), never in one representative test — a
  // lane that double-fires or drops a completion reds here.
  expect(rec.completions).toHaveLength(1);
  const completion = rec.completions[0]?.completion;
  if (completion === undefined) {
    throw new Error("test wiring: provision fired no completion");
  }
  return { completion, completions: rec.completions };
}

/**
 * A SITE-AWARE git fake (D): delegates to REAL git except at ONE injected
 * fault site — the provider's git invocations are, in order, repo-check
 * (`rev-parse --git-dir`), root (`rev-parse --show-toplevel`), base-resolution
 * (`rev-parse --verify`), and worktree-add (`worktree add`). `mode`:
 *  - "timeout": the target site SLEEPS past the provider's tiny timeout (the
 *    provider's SIGTERM→SIGKILL kill → infra(timeout));
 *  - "infra": the invocation IMMEDIATELY BEFORE the target runs real git and
 *    then REMOVES this binary, so the target site's `spawn` hits ENOENT (the
 *    provider's child `error` event → infra) — a SITE-specific spawn-infra with
 *    the earlier sites succeeding.
 */
function writeSiteAwareGit(
  root: string,
  name: string,
  failSite: "base-resolution" | "worktree-add",
  mode: "timeout" | "infra",
): string {
  const priorSite = failSite === "base-resolution" ? "root" : "base-resolution";
  const lines = [
    "#!/bin/sh",
    'site=""',
    'if [ "$1" = "worktree" ] && [ "$2" = "add" ]; then site="worktree-add"; fi',
    'if [ "$1" = "rev-parse" ]; then',
    '  case "$2" in',
    '    --git-dir) site="repo-check" ;;',
    '    --show-toplevel) site="root" ;;',
    '    --verify) site="base-resolution" ;;',
    "  esac",
    "fi",
  ];
  if (mode === "timeout") {
    lines.push(`if [ "$site" = "${failSite}" ]; then sleep 30; exit 0; fi`);
  } else {
    // Run the prior site normally, then self-remove so the TARGET site ENOENTs.
    lines.push(
      `if [ "$site" = "${priorSite}" ]; then git "$@"; rc=$?; rm -f "$0"; exit $rc; fi`,
    );
  }
  lines.push('exec git "$@"', "");
  return writeScript(root, name, lines.join("\n"));
}

function worktreeSpec(repo: string, extra: Record<string, unknown> = {}): RuntimeContextSpec {
  return { kind: "worktree", provider: "pairflow.worktree", config: { repo, ...extra } };
}

/** The default worktree dir for a repo — `<repo-parent>/.pairflow-worktrees/<repo-name>`. */
function defaultWorktreeParent(repo: string): string {
  const real = execFileSync("git", ["-C", repo, "rev-parse", "--show-toplevel"], {
    encoding: "utf8",
  }).trim();
  return join(dirname(real), ".pairflow-worktrees", basename(real));
}

function locatorOf(ref: RuntimeContextRef): Record<string, unknown> {
  return ref.locator as Record<string, unknown>;
}

// A script usable as a fake `gitBinary` (ignores git args). Written +x under root.
function writeScript(root: string, name: string, body: string): string {
  const path = join(root, name);
  writeFileSync(path, body, { mode: 0o755 });
  chmodSync(path, 0o755);
  return path;
}

// ─────────────────────────────────────────────────────────────────────────
describe("worktreeProvider — S: spec/config evaluation", () => {
  it("happy path (three defaults, repo-only config) → ready ref; worktree dir + branch exist at HEAD", async () => {
    const root = tempRoot();
    const repo = makeRepo(root, "host");
    const head = gitOut(repo, "rev-parse", "HEAD");
    const { completion } = await provisionOnce(worktreeSpec(repo));
    expect(completion.kind).toBe("ready");
    if (completion.kind !== "ready") return;
    const loc = locatorOf(completion.ref);
    expect(existsSync(loc.path as string)).toBe(true);
    expect(loc.branch as string).toMatch(/^pairflow\//);
    // The branch exists at the resolved base commit.
    expect(gitOut(repo, "rev-parse", loc.branch as string)).toBe(head);
    expect(loc.base_commit).toBe(head);
    // The default dir lives BESIDE the repo (outside the working tree).
    expect(loc.path as string).toContain(join(".pairflow-worktrees", "host"));
  });

  it("explicit `dir` + explicit `base` variants both provision", async () => {
    const root = tempRoot();
    const repo = makeRepo(root, "host", 2);
    const firstCommit = gitOut(repo, "rev-parse", "HEAD~1");
    const dir = join(root, "custom-worktrees");
    const { completion } = await provisionOnce(worktreeSpec(repo, { dir, base: firstCommit }));
    expect(completion.kind).toBe("ready");
    if (completion.kind !== "ready") return;
    const loc = locatorOf(completion.ref);
    expect((loc.path as string).startsWith(dir)).toBe(true);
    expect(loc.base_commit).toBe(firstCommit);
  });

  // The S2 rejection matrix — every lane FAILED(sys:provision_rejected), ZERO
  // host mutation (no worktree dir, no pairflow branch, host status unchanged).
  function assertRejectedNoMutation(
    completion: RuntimeContextCompletion,
    repo?: string,
  ): void {
    expect(completion.kind).toBe("failed");
    if (completion.kind !== "failed") return;
    expect(completion.reason).toBe("sys:provision_rejected");
    if (repo !== undefined) {
      expect(gitOut(repo, "status", "--porcelain")).toBe("");
      expect(gitOut(repo, "branch", "--list", "pairflow/*")).toBe("");
      expect(existsSync(defaultWorktreeParent(repo))).toBe(false);
    }
  }

  it("(a) kind ≠ worktree → rejected, no mutation", async () => {
    const root = tempRoot();
    const repo = makeRepo(root, "host");
    const { completion } = await provisionOnce({
      kind: "container",
      provider: "pairflow.worktree",
      config: { repo },
    });
    assertRejectedNoMutation(completion, repo);
  });

  it("(b) config absent → rejected; repo missing → rejected", async () => {
    const a = await provisionOnce({ kind: "worktree", provider: "pairflow.worktree" });
    assertRejectedNoMutation(a.completion);
    const b = await provisionOnce({ kind: "worktree", provider: "pairflow.worktree", config: {} });
    assertRejectedNoMutation(b.completion);
  });

  it("(c) repo not a string → rejected; repo relative → rejected", async () => {
    const a = await provisionOnce({
      kind: "worktree",
      provider: "pairflow.worktree",
      config: { repo: 42 },
    });
    assertRejectedNoMutation(a.completion);
    const b = await provisionOnce({
      kind: "worktree",
      provider: "pairflow.worktree",
      config: { repo: "relative/path" },
    });
    assertRejectedNoMutation(b.completion);
    // The relative rejection must come from the ABSOLUTE-PATH guard itself,
    // not from a downstream resolution failure masking it: a relative path
    // to a REAL git repo would fully provision if the guard were dropped
    // (realpath resolves it, root identity passes), so this lane can only
    // stay rejected while the guard stands.
    const root = tempRoot();
    const realRepo = makeRepo(root, "relhost");
    const c = await provisionOnce({
      kind: "worktree",
      provider: "pairflow.worktree",
      config: { repo: relative(process.cwd(), realRepo) },
    });
    assertRejectedNoMutation(c.completion);
    expect(existsSync(join(dirname(realRepo), ".pairflow-worktrees"))).toBe(false);
  });

  it("(d) repo not a git repository → rejected, no mutation", async () => {
    const root = tempRoot();
    const plain = makePlainDir(root, "not-a-repo");
    const { completion } = await provisionOnce(worktreeSpec(plain));
    expect(completion.kind).toBe("failed");
    if (completion.kind !== "failed") return;
    expect(completion.reason).toBe("sys:provision_rejected");
    expect(existsSync(join(dirname(plain), ".pairflow-worktrees"))).toBe(false);
  });

  it("(e) unknown config key → rejected, no mutation (the C7 closed keyset)", async () => {
    const root = tempRoot();
    const repo = makeRepo(root, "host");
    const { completion } = await provisionOnce(worktreeSpec(repo, { bogus: "x" }));
    assertRejectedNoMutation(completion, repo);
  });

  it("(f) dir present but not absolute / not a string → rejected", async () => {
    const root = tempRoot();
    const repo = makeRepo(root, "host");
    const a = await provisionOnce(worktreeSpec(repo, { dir: "relative" }));
    assertRejectedNoMutation(a.completion, repo);
    const b = await provisionOnce(worktreeSpec(repo, { dir: 5 }));
    assertRejectedNoMutation(b.completion, repo);
  });

  it("(g) base present but not a string → rejected", async () => {
    const root = tempRoot();
    const repo = makeRepo(root, "host");
    const { completion } = await provisionOnce(worktreeSpec(repo, { base: 7 }));
    assertRejectedNoMutation(completion, repo);
  });

  it("(h) base unresolvable committish → rejected, no mutation", async () => {
    const root = tempRoot();
    const repo = makeRepo(root, "host");
    const { completion } = await provisionOnce(worktreeSpec(repo, { base: "no-such-ref" }));
    assertRejectedNoMutation(completion, repo);
  });

  it("(h/S4) DECIDED PLACEMENT: a valid repo whose HEAD is UNBORN (zero commits) rejects at EVALUATION", async () => {
    const root = tempRoot();
    const repo = makeRepo(root, "host", 0); // git init, NO commits — unborn HEAD
    const { completion } = await provisionOnce(worktreeSpec(repo));
    expect(completion.kind).toBe("failed");
    if (completion.kind !== "failed") return;
    // The substrate would let `worktree add -b` succeed on an unborn HEAD
    // (probe P4c) — the placement is a CHOICE: rejected at evaluation.
    expect(completion.reason).toBe("sys:provision_rejected");
    expect(existsSync(defaultWorktreeParent(repo))).toBe(false);
  });

  it("(i) ROOT IDENTITY: repo is a SUBDIRECTORY of a repo (not its root) → rejected", async () => {
    const root = tempRoot();
    const repo = makeRepo(root, "host");
    const sub = join(repo, "subdir");
    mkdirSync(sub, { recursive: true });
    const { completion } = await provisionOnce(worktreeSpec(sub));
    expect(completion.kind).toBe("failed");
    if (completion.kind !== "failed") return;
    // `--git-dir` alone PASSES from a subdir (probe P4i), so without the
    // root-identity lane the default `dir` would derive INSIDE the working
    // tree — this lane rejects it.
    expect(completion.reason).toBe("sys:provision_rejected");
    expect(gitOut(repo, "status", "--porcelain")).toBe("");
  });

  it("(i) a repo reached via a SYMLINK path is NOT falsely rejected (realpath normalization)", async () => {
    const root = tempRoot();
    const repo = makeRepo(root, "host");
    // realpath-normalizing both sides handles the macOS /tmp → /private/tmp
    // symlink case; a legitimately-rooted repo reached via realpath still
    // matches --show-toplevel. Driven via the OS-provided temp symlink: the
    // mkdtemp root under /var → /private/var on darwin resolves fine.
    const { completion } = await provisionOnce(worktreeSpec(repo));
    expect(completion.kind).toBe("ready");
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe("worktreeProvider — N: naming/identity (the enc scheme)", () => {
  // The pure `enc` property lanes RELOCATED to runner/enc.test.ts with the
  // function (packet ch9-p3b, T1); the provider suite keeps its COMPOSED-
  // identity lanes below — enc exercised THROUGH real provisioning.

  it("hostile ids never appear RAW in the created path/branch (path-safe, ref-safe)", async () => {
    const root = tempRoot();
    const repo = makeRepo(root, "host");
    const hostile = "../Escape--x/y";
    const { completion } = await provisionOnce(worktreeSpec(repo), {}, { instanceId: hostile });
    expect(completion.kind).toBe("ready");
    if (completion.kind !== "ready") return;
    const loc = locatorOf(completion.ref);
    const leaf = basename(loc.path as string);
    // The composite leaf carries enc(instance)--enc(request); no raw traversal,
    // no uppercase, no bare `--` from the id survives into the leaf.
    expect(leaf).toBe(`${enc(hostile)}--${enc("r1")}`);
    expect(leaf).not.toContain("..");
    expect(leaf).not.toMatch(/[A-Z]/);
    expect(existsSync(loc.path as string)).toBe(true);
    // The worktree landed UNDER the default parent (no escape).
    expect((loc.path as string).startsWith(defaultWorktreeParent(repo))).toBe(true);
  });

  it("case-fold injectivity on the case-insensitive host: two ids differing only by case → DISTINCT worktrees", async () => {
    const root = tempRoot();
    const repo = makeRepo(root, "host");
    const a = await provisionOnce(worktreeSpec(repo), {}, { instanceId: "abc" });
    const b = await provisionOnce(worktreeSpec(repo), {}, { instanceId: "ABC" });
    expect(a.completion.kind).toBe("ready");
    expect(b.completion.kind).toBe("ready");
    if (a.completion.kind !== "ready" || b.completion.kind !== "ready") return;
    const pa = locatorOf(a.completion.ref).path as string;
    const pb = locatorOf(b.completion.ref).path as string;
    expect(pa).not.toBe(pb);
    expect(existsSync(pa)).toBe(true);
    expect(existsSync(pb)).toBe(true);
  });

  it("delimiter reservation: `a--b`/`c` cannot ALIAS `a`/`b--c` (injectivity pair, not a string assert)", async () => {
    const root = tempRoot();
    const repo = makeRepo(root, "host");
    const x = await provisionOnce(worktreeSpec(repo), {}, { instanceId: "a--b", requestId: "c" });
    const y = await provisionOnce(worktreeSpec(repo), {}, { instanceId: "a", requestId: "b--c" });
    expect(x.completion.kind).toBe("ready");
    expect(y.completion.kind).toBe("ready");
    if (x.completion.kind !== "ready" || y.completion.kind !== "ready") return;
    expect(locatorOf(x.completion.ref).path).not.toBe(locatorOf(y.completion.ref).path);
    expect(locatorOf(x.completion.ref).branch).not.toBe(locatorOf(y.completion.ref).branch);
  });

  it("ILL-FORMED-Unicode injectivity: lone-surrogate vs U+FFFD yield DISTINCT worktrees (adversarial, code-unit grain)", async () => {
    const root = tempRoot();
    const repo = makeRepo(root, "host");
    const a = await provisionOnce(worktreeSpec(repo), {}, { instanceId: "\uD800" });
    const b = await provisionOnce(worktreeSpec(repo), {}, { instanceId: "�" });
    expect(a.completion.kind).toBe("ready");
    expect(b.completion.kind).toBe("ready");
    if (a.completion.kind !== "ready" || b.completion.kind !== "ready") return;
    expect(locatorOf(a.completion.ref).path).not.toBe(locatorOf(b.completion.ref).path);
  });

  it("over-length degrades LOUD → sys:provision_failed (P4a; never silent truncation)", async () => {
    const root = tempRoot();
    const repo = makeRepo(root, "host");
    const huge = "x".repeat(300);
    const { completion } = await provisionOnce(worktreeSpec(repo), {}, { instanceId: huge });
    expect(completion.kind).toBe("failed");
    if (completion.kind !== "failed") return;
    expect(completion.reason).toBe("sys:provision_failed");
  });

  it("same-name collision degrades LOUD → sys:provision_failed (a second provision with the SAME ids)", async () => {
    const root = tempRoot();
    const repo = makeRepo(root, "host");
    const first = await provisionOnce(worktreeSpec(repo), {}, { instanceId: "same", requestId: "same" });
    expect(first.completion.kind).toBe("ready");
    const second = await provisionOnce(worktreeSpec(repo), {}, { instanceId: "same", requestId: "same" });
    expect(second.completion.kind).toBe("failed");
    if (second.completion.kind !== "failed") return;
    expect(second.completion.reason).toBe("sys:provision_failed");
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe("worktreeProvider — M: git mechanics", () => {
  it("created branch points AT the resolved base (explicit older commit → the worktree checks out THAT tree)", async () => {
    const root = tempRoot();
    const repo = makeRepo(root, "host", 3);
    const older = gitOut(repo, "rev-parse", "HEAD~2");
    const { completion } = await provisionOnce(worktreeSpec(repo, { base: older }));
    expect(completion.kind).toBe("ready");
    if (completion.kind !== "ready") return;
    const loc = locatorOf(completion.ref);
    expect(loc.base_commit).toBe(older);
    // The fresh worktree's HEAD equals the base commit (checks out THAT tree).
    expect(gitOut(loc.path as string, "rev-parse", "HEAD")).toBe(older);
  });

  it("a DIRTY host repository does not block provisioning", async () => {
    const root = tempRoot();
    const repo = makeRepo(root, "host");
    writeFileSync(join(repo, "dirty.txt"), "uncommitted");
    const { completion } = await provisionOnce(worktreeSpec(repo));
    expect(completion.kind).toBe("ready");
  });

  it("a host that is itself a LINKED WORKTREE provisions fine (root is itself)", async () => {
    const root = tempRoot();
    const repo = makeRepo(root, "host");
    const linked = join(root, "linked-wt");
    git(repo, "worktree", "add", linked, "-b", "linkedbranch");
    const { completion } = await provisionOnce(worktreeSpec(linked));
    expect(completion.kind).toBe("ready");
  });

  it("host status/index UNCHANGED under the amended default (clean, unqualified)", async () => {
    const root = tempRoot();
    const repo = makeRepo(root, "host");
    const { completion } = await provisionOnce(worktreeSpec(repo));
    expect(completion.kind).toBe("ready");
    // Beside-repo default: the host working tree/index is untouched.
    expect(gitOut(repo, "status", "--porcelain")).toBe("");
    expect(gitOut(repo, "diff", "--cached", "--name-only")).toBe("");
  });

  it("an EXPLICIT in-repo `dir` is legal and then shows ONLY the untracked entry (P4d / F3 residual)", async () => {
    const root = tempRoot();
    const repo = makeRepo(root, "host");
    const inRepoDir = join(repo, "inside-worktrees");
    const { completion } = await provisionOnce(worktreeSpec(repo, { dir: inRepoDir }));
    expect(completion.kind).toBe("ready");
    // Only the untracked entry appears — the tracked tree/index stays clean.
    const status = gitOut(repo, "status", "--porcelain");
    expect(status).toContain("inside-worktrees");
    expect(status.split("\n").every((l) => l.startsWith("??"))).toBe(true);
    expect(gitOut(repo, "diff", "--cached", "--name-only")).toBe("");
  });

  it("PATH-only env spawn succeeds (the M4 allowlist default; probe P4b)", async () => {
    const root = tempRoot();
    const repo = makeRepo(root, "host");
    const { completion } = await provisionOnce(worktreeSpec(repo), {
      env: { PATH: process.env.PATH ?? "" },
    });
    expect(completion.kind).toBe("ready");
  });

  it(
    "timeout kill → sys:provision_failed (a hang-simulating invocation under a tiny timeout)",
    { timeout: 15_000 },
    async () => {
      const root = tempRoot();
      const repo = makeRepo(root, "host");
      const hang = writeScript(root, "hang.sh", "#!/bin/sh\nsleep 30\n");
      const { completion } = await provisionOnce(worktreeSpec(repo), {
        gitBinary: hang,
        timeoutMs: 1000,
        graceMs: 1000,
      });
      expect(completion.kind).toBe("failed");
      if (completion.kind !== "failed") return;
      expect(completion.reason).toBe("sys:provision_failed");
    },
  );

  it(
    "a TERM-ignoring child is killed at the grace default (SIGKILL escalation) → sys:provision_failed",
    { timeout: 15_000 },
    async () => {
      const root = tempRoot();
      const repo = makeRepo(root, "host");
      const stubborn = writeScript(root, "stubborn.sh", '#!/bin/sh\ntrap "" TERM\nsleep 30\n');
      const { completion } = await provisionOnce(worktreeSpec(repo), {
        gitBinary: stubborn,
        timeoutMs: 1000,
        graceMs: 1000,
      });
      expect(completion.kind).toBe("failed");
      if (completion.kind !== "failed") return;
      expect(completion.reason).toBe("sys:provision_failed");
    },
  );

  it("ENOENT (a bad git binary path) → sys:provision_failed", async () => {
    const root = tempRoot();
    const repo = makeRepo(root, "host");
    const { completion } = await provisionOnce(worktreeSpec(repo), {
      gitBinary: join(root, "no", "such", "git"),
    });
    expect(completion.kind).toBe("failed");
    if (completion.kind !== "failed") return;
    expect(completion.reason).toBe("sys:provision_failed");
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe("worktreeProvider — PB: port behavior (C11 routing)", () => {
  it("EXACTLY ONE completion per lane: success → one READY; every failure lane → one FAILED; no lane throws out of provision()", async () => {
    const root = tempRoot();
    const repo = makeRepo(root, "host");
    const plain = makePlainDir(root, "plain");
    // A representative slice across S2 + M failure lanes, plus success.
    const lanes: { spec: RuntimeContextSpec; opts?: WorktreeProviderOptions; expect: "ready" | "failed"; ids?: { instanceId?: string } }[] = [
      { spec: worktreeSpec(repo), expect: "ready" },
      { spec: { kind: "container", provider: "pairflow.worktree", config: { repo } }, expect: "failed" },
      { spec: { kind: "worktree", provider: "pairflow.worktree", config: {} }, expect: "failed" },
      { spec: worktreeSpec(plain), expect: "failed" },
      { spec: worktreeSpec(repo, { base: "no-such" }), expect: "failed" },
      { spec: worktreeSpec(repo, { bogus: 1 }), expect: "failed" },
      { spec: worktreeSpec(repo), opts: { gitBinary: join(root, "no", "git") }, expect: "failed" },
      { spec: worktreeSpec("/definitely/not/here"), expect: "failed" },
    ];
    let idx = 0;
    for (const lane of lanes) {
      const provider = createWorktreeProvider(lane.opts ?? {});
      const rec = recorder();
      provider.bindCompletionSink(rec.sink);
      idx += 1;
      // No lane throws out of provision() (the port-breach reserve stays
      // unreached from hostile config).
      await expect(
        provider.provision(`i${String(idx)}`, `r${String(idx)}`, lane.spec),
      ).resolves.toBeUndefined();
      expect(rec.completions).toHaveLength(1);
      expect(rec.completions[0]?.completion.kind).toBe(lane.expect);
    }
  });

  it("PB2: the completion is fired BEFORE the detach ack fulfills (the sink already holds it at settle)", async () => {
    const root = tempRoot();
    const repo = makeRepo(root, "host");
    const provider = createWorktreeProvider();
    const rec = recorder();
    provider.bindCompletionSink(rec.sink);
    let heldAtSettle = -1;
    await provider
      .provision("i1", "r1", worktreeSpec(repo))
      .then(() => {
        heldAtSettle = rec.completions.length;
      });
    expect(heldAtSettle).toBe(1);
  });

  it("PB3 source-class lanes: empty-stderr nonzero → detail ABSENT; ENOENT → infra message; realpath fs-failure → fs message", async () => {
    const root = tempRoot();
    const repo = makeRepo(root, "host");
    // (1) empty-stderr nonzero exit — an injected git that exits 1 with no
    // output (the first rev-parse fails) → detail ABSENT.
    const silentFail = writeScript(root, "exit1.sh", "#!/bin/sh\nexit 1\n");
    const a = await provisionOnce(worktreeSpec(repo), { gitBinary: silentFail });
    expect(a.completion.kind).toBe("failed");
    if (a.completion.kind === "failed") {
      expect(a.completion.detail).toBeUndefined();
    }
    // (2) ENOENT spawn-infra failure — the infra error's message is present.
    const b = await provisionOnce(worktreeSpec(repo), { gitBinary: join(root, "no", "git") });
    expect(b.completion.kind).toBe("failed");
    if (b.completion.kind === "failed") {
      expect(typeof b.completion.detail).toBe("string");
      expect((b.completion.detail as string).length).toBeGreaterThan(0);
    }
    // (3) realpath fs-failure — the fs error's message is present (probe P4j).
    const c = await provisionOnce(worktreeSpec("/nonexistent/abs/path/xyz"));
    expect(c.completion.kind).toBe("failed");
    if (c.completion.kind === "failed") {
      expect(c.completion.reason).toBe("sys:provision_rejected");
      expect(typeof c.completion.detail).toBe("string");
      expect((c.completion.detail as string).length).toBeGreaterThan(0);
    }
  });

  it("PB3: the detail tail is BOUNDED to 2000 code units", async () => {
    const root = tempRoot();
    const repo = makeRepo(root, "host");
    // A git that writes a >2000-char stderr then exits nonzero (create-phase);
    // drive it as the create git so the tail path runs.
    const big = "E".repeat(5000);
    const noisy = writeScript(root, "noisy.sh", `#!/bin/sh\n>&2 printf '%s' '${big}'\nexit 1\n`);
    const { completion } = await provisionOnce(worktreeSpec(repo), { gitBinary: noisy });
    expect(completion.kind).toBe("failed");
    if (completion.kind !== "failed") return;
    expect(typeof completion.detail).toBe("string");
    expect((completion.detail as string).length).toBe(2000);
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe("worktreeProvider — RP: ref + projection", () => {
  it("RP1: the READY ref carries EXACTLY {kind, locator:{path,branch,repo,base_commit}} — all plain strings", async () => {
    const root = tempRoot();
    const repo = makeRepo(root, "host");
    const { completion } = await provisionOnce(worktreeSpec(repo));
    expect(completion.kind).toBe("ready");
    if (completion.kind !== "ready") return;
    expect(completion.ref.kind).toBe("worktree");
    const loc = locatorOf(completion.ref);
    expect(Object.keys(loc).sort()).toEqual(["base_commit", "branch", "path", "repo"]);
    for (const v of Object.values(loc)) {
      expect(typeof v).toBe("string");
    }
  });

  it("RP2: projectForActor returns EXACTLY {kind, path, branch} (field OMISSION of repo/base_commit)", async () => {
    const root = tempRoot();
    const repo = makeRepo(root, "host");
    const provider = createWorktreeProvider();
    const rec = recorder();
    provider.bindCompletionSink(rec.sink);
    await provider.provision("i1", "r1", worktreeSpec(repo));
    expect(rec.completions).toHaveLength(1);
    const ready = rec.completions[0]?.completion;
    if (ready === undefined || ready.kind !== "ready") throw new Error("no ready ref");
    const projection = provider.projectForActor(ready.ref) as unknown as Record<string, unknown>;
    expect(Object.keys(projection).sort()).toEqual(["branch", "kind", "path"]);
    expect(projection.kind).toBe("worktree");
    expect(projection.path).toBe(locatorOf(ready.ref).path);
    expect(projection.branch).toBe(locatorOf(ready.ref).branch);
  });

  it("RP3 integrity: a foreign-kind ref throws; a malformed locator throws (LOUD synchronous)", async () => {
    const provider = createWorktreeProvider();
    expect(() => provider.projectForActor({ kind: "container", locator: "/x" })).toThrow(
      /foreign-kind/,
    );
    expect(() =>
      provider.projectForActor({ kind: "worktree", locator: { path: "/p" } }),
    ).toThrow(/malformed locator/);
    expect(() => provider.projectForActor({ kind: "worktree", locator: "not-an-object" })).toThrow(
      /malformed locator/,
    );
  });

  it("RP3 EXACT shape: an EXTRA-key locator throws; an INHERITED-key carrier throws; four-string projects", async () => {
    const root = tempRoot();
    const repo = makeRepo(root, "host");
    const provider = createWorktreeProvider();
    // The happy four-string OWN-key shape projects.
    const rec = recorder();
    provider.bindCompletionSink(rec.sink);
    await provider.provision("i1", "r1", worktreeSpec(repo));
    expect(rec.completions).toHaveLength(1);
    const ready = rec.completions[0]?.completion;
    if (ready === undefined || ready.kind !== "ready") throw new Error("no ready ref");
    expect(() => provider.projectForActor(ready.ref)).not.toThrow();
    // An EXTRA own key beyond the RP1 set → LOUD throw (never project lossily).
    expect(() =>
      provider.projectForActor({
        kind: "worktree",
        locator: { path: "/p", branch: "b", repo: "/r", base_commit: "c", evil: "x" },
      }),
    ).toThrow(/malformed locator/);
    // An INHERITED/prototype carrier — the four fields live on the PROTOTYPE,
    // zero own keys → LOUD throw (own-property reads only).
    const carrier = Object.create({ path: "/p", branch: "b", repo: "/r", base_commit: "c" }) as object;
    expect(() => provider.projectForActor({ kind: "worktree", locator: carrier })).toThrow(
      /malformed locator/,
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────
// D — the failure grid's remaining site×shape cells, driven with a SITE-AWARE
// git fake (base-resolution / worktree-add × timeout / spawn-infra) + the
// synchronous spawn-setup throw lane. Every cell → sys:provision_failed.
describe("worktreeProvider — D: the failure grid site×shape cells", () => {
  it(
    "base-resolution × timeout → sys:provision_failed",
    { timeout: 15_000 },
    async () => {
      const root = tempRoot();
      const repo = makeRepo(root, "host");
      const fake = writeSiteAwareGit(root, "br-timeout.sh", "base-resolution", "timeout");
      const { completion } = await provisionOnce(worktreeSpec(repo), {
        gitBinary: fake,
        timeoutMs: 1000,
        graceMs: 1000,
      });
      expect(completion.kind).toBe("failed");
      if (completion.kind !== "failed") return;
      expect(completion.reason).toBe("sys:provision_failed");
    },
  );

  it("base-resolution × spawn-infra (ENOENT) → sys:provision_failed", async () => {
    const root = tempRoot();
    const repo = makeRepo(root, "host");
    const fake = writeSiteAwareGit(root, "br-infra.sh", "base-resolution", "infra");
    const { completion } = await provisionOnce(worktreeSpec(repo), { gitBinary: fake });
    expect(completion.kind).toBe("failed");
    if (completion.kind !== "failed") return;
    expect(completion.reason).toBe("sys:provision_failed");
  });

  it(
    "worktree-add × timeout → sys:provision_failed",
    { timeout: 15_000 },
    async () => {
      const root = tempRoot();
      const repo = makeRepo(root, "host");
      const fake = writeSiteAwareGit(root, "wt-timeout.sh", "worktree-add", "timeout");
      const { completion } = await provisionOnce(worktreeSpec(repo), {
        gitBinary: fake,
        timeoutMs: 1000,
        graceMs: 1000,
      });
      expect(completion.kind).toBe("failed");
      if (completion.kind !== "failed") return;
      expect(completion.reason).toBe("sys:provision_failed");
    },
  );

  it("worktree-add × spawn-infra (ENOENT) → sys:provision_failed", async () => {
    const root = tempRoot();
    const repo = makeRepo(root, "host");
    const fake = writeSiteAwareGit(root, "wt-infra.sh", "worktree-add", "infra");
    const { completion } = await provisionOnce(worktreeSpec(repo), { gitBinary: fake });
    expect(completion.kind).toBe("failed");
    if (completion.kind !== "failed") return;
    expect(completion.reason).toBe("sys:provision_failed");
  });

  it("a SYNCHRONOUS spawn-setup throw → sys:provision_failed (infra in every phase)", async () => {
    const root = tempRoot();
    const repo = makeRepo(root, "host");
    // A git-binary path containing a NUL byte makes node's `spawn` throw
    // SYNCHRONOUSLY (ERR_INVALID_ARG_VALUE) before any child exists — the
    // provider's try/catch infra lane (S3), classified sys:provision_failed.
    const nulBin = `git${String.fromCharCode(0)}x`;
    const { completion } = await provisionOnce(worktreeSpec(repo), { gitBinary: nulBin });
    expect(completion.kind).toBe("failed");
    if (completion.kind !== "failed") return;
    expect(completion.reason).toBe("sys:provision_failed");
  });
});

// ─────────────────────────────────────────────────────────────────────────
// E — the M4 spawn-discipline halves: the env allowlist (NEGATIVE) and the
// SIGTERM→grace→SIGKILL escalation ORDER.
describe("worktreeProvider — E: M4 spawn discipline (env allowlist + signal order)", () => {
  it("env allowlist NEGATIVE: a forbidden sentinel env var never reaches the git child (PATH-only positive)", async () => {
    const root = tempRoot();
    const repo = makeRepo(root, "host");
    const marker = join(root, "child-env.txt");
    const sentinel = "PAIRFLOW_FORBIDDEN_SENTINEL_9f3";
    // A git fake that DUMPS its own environment (last write wins across the
    // invocations, all sharing the same allowlisted env) then delegates to real
    // git so provisioning still completes.
    const dumper = writeScript(root, "envdump.sh", `#!/bin/sh\nprintenv > "${marker}"\nexec git "$@"\n`);
    process.env[sentinel] = "leak";
    try {
      const { completion } = await provisionOnce(worktreeSpec(repo), { gitBinary: dumper });
      expect(completion.kind).toBe("ready");
    } finally {
      delete process.env[sentinel];
    }
    const dumped = readFileSync(marker, "utf8");
    // NEGATIVE: a forbidden var set in THIS process never crosses the allowlist.
    expect(dumped).not.toContain(sentinel);
    // POSITIVE: PATH (the {PATH} allowlist default) IS present.
    expect(dumped).toMatch(/^PATH=/m);
  });

  it(
    "SIGTERM→grace→SIGKILL ORDER: the child receives SIGTERM first and survives the grace window; SIGKILL ends it",
    { timeout: 15_000 },
    async () => {
      const root = tempRoot();
      const repo = makeRepo(root, "host");
      const marker = join(root, "signals.log");
      // A node child (deterministic signal handling — a shell `trap` DEFERS
      // during a foreground `sleep`, which node-spawn makes flaky) that catches
      // SIGTERM (records it + keeps running) — only the UNCATCHABLE SIGKILL can
      // end it. It records SURVIVED 100 ms AFTER SIGTERM to prove it lived into
      // the grace window. An immediate-SIGKILL provider would leave NO "TERM"
      // line (SIGKILL cannot be trapped) → this test RED. The timeout is set
      // well above node's cold-start so SIGTERM never races the boot.
      const signalChild = writeScript(
        root,
        "signal-order.js",
        [
          "#!/usr/bin/env node",
          'const fs = require("node:fs");',
          `const m = ${JSON.stringify(marker)};`,
          'fs.appendFileSync(m, "START\\n");',
          'process.on("SIGTERM", () => {',
          '  fs.appendFileSync(m, "TERM\\n");',
          '  setTimeout(() => fs.appendFileSync(m, "SURVIVED\\n"), 100);',
          "});",
          "setInterval(() => {}, 1000);",
          "",
        ].join("\n"),
      );
      const { completion } = await provisionOnce(worktreeSpec(repo), {
        gitBinary: signalChild,
        timeoutMs: 1500,
        graceMs: 1000,
      });
      expect(completion.kind).toBe("failed");
      if (completion.kind !== "failed") return;
      expect(completion.reason).toBe("sys:provision_failed");
      const log = readFileSync(marker, "utf8").split("\n").filter(Boolean);
      // SIGTERM arrived FIRST (the child recorded it) — an immediate-SIGKILL
      // impl can't leave this line.
      expect(log).toContain("TERM");
      // The child SURVIVED past SIGTERM into the grace window, and SIGKILL —
      // the only thing it cannot catch — ended it: SURVIVED appears AFTER TERM.
      const firstTerm = log.indexOf("TERM");
      expect(log.slice(firstTerm + 1)).toContain("SURVIVED");
    },
  );
});

// ─────────────────────────────────────────────────────────────────────────
// F — identity/ref/detail: request-only variation, the N5 orphan-retry at
// provider grain, the RP1 `repo` VALUE, and the PB3 tail CONTENT (last-2000).
describe("worktreeProvider — F: identity/ref/detail", () => {
  it("SAME instance, DIFFERENT request → DISTINCT worktrees (request-only variation)", async () => {
    const root = tempRoot();
    const repo = makeRepo(root, "host");
    const a = await provisionOnce(worktreeSpec(repo), {}, { instanceId: "inst", requestId: "reqA" });
    const b = await provisionOnce(worktreeSpec(repo), {}, { instanceId: "inst", requestId: "reqB" });
    expect(a.completion.kind).toBe("ready");
    expect(b.completion.kind).toBe("ready");
    if (a.completion.kind !== "ready" || b.completion.kind !== "ready") return;
    expect(locatorOf(a.completion.ref).path).not.toBe(locatorOf(b.completion.ref).path);
    expect(locatorOf(a.completion.ref).branch).not.toBe(locatorOf(b.completion.ref).branch);
  });

  it("N5 orphan-retry (provider grain): a worktree pre-created at (inst, reqA) does not block (inst, reqB) — the orphan PERSISTS", async () => {
    const root = tempRoot();
    const repo = makeRepo(root, "host");
    // reqA provisions its worktree (the crashed attempt's would-be orphan).
    const a = await provisionOnce(worktreeSpec(repo), {}, { instanceId: "inst", requestId: "reqA" });
    expect(a.completion.kind).toBe("ready");
    if (a.completion.kind !== "ready") return;
    const orphanPath = locatorOf(a.completion.ref).path as string;
    expect(existsSync(orphanPath)).toBe(true);
    // The retry under a FRESH request id (reqB) SUCCEEDS — no collision.
    const b = await provisionOnce(worktreeSpec(repo), {}, { instanceId: "inst", requestId: "reqB" });
    expect(b.completion.kind).toBe("ready");
    if (b.completion.kind !== "ready") return;
    expect(locatorOf(b.completion.ref).path).not.toBe(orphanPath);
    // Orphan PERSISTENCE (teardown is the named Absent): reqA's worktree remains.
    expect(existsSync(orphanPath)).toBe(true);
  });

  it("RP1: the locator `repo` VALUE equals the EVALUATED repo path (root/realpath), not just a string", async () => {
    const root = tempRoot();
    const repo = makeRepo(root, "host");
    const evaluated = gitOut(repo, "rev-parse", "--show-toplevel");
    const { completion } = await provisionOnce(worktreeSpec(repo));
    expect(completion.kind).toBe("ready");
    if (completion.kind !== "ready") return;
    expect(locatorOf(completion.ref).repo).toBe(evaluated);
  });

  it("PB3: the detail tail keeps the LAST 2000 code units (a prefix-keeping impl fails)", async () => {
    const root = tempRoot();
    const repo = makeRepo(root, "host");
    const tail = "T".repeat(2000);
    // stderr = a DISTINCT head marker + exactly 2000 trailing units; the tail
    // must be the LAST 2000 (the marker dropped), never the first 2000.
    const noisy = writeScript(
      root,
      "tailcontent.sh",
      `#!/bin/sh\n>&2 printf '%s' 'HEADMARKER${tail}'\nexit 1\n`,
    );
    const { completion } = await provisionOnce(worktreeSpec(repo), { gitBinary: noisy });
    expect(completion.kind).toBe("failed");
    if (completion.kind !== "failed") return;
    expect(completion.detail).toBe(tail);
    expect(completion.detail).not.toContain("HEADMARKER");
  });
});

// ─────────────────────────────────────────────────────────────────────────
// SD2/H1 (packet ch9-p3b): the fold-in's construction-time validator (the
// shared seam validator driven at THIS consumer factory) + the
// LocalExecutionCapability facet.
describe("worktreeProvider — SD2/H1 the seam fold-in", () => {
  it("the shared timer-knob validator throws at construction on an invalid timeoutMs/graceMs", () => {
    expect(() => createWorktreeProvider({ timeoutMs: 500 })).toThrow(TimerKnobError);
    expect(() => createWorktreeProvider({ graceMs: Number.NaN })).toThrow(TimerKnobError);
    expect(() => createWorktreeProvider({ timeoutMs: 2 ** 31 })).toThrow(TimerKnobError);
  });

  it("valid knobs (and the defaults) construct without throwing", () => {
    expect(() => createWorktreeProvider()).not.toThrow();
    expect(() => createWorktreeProvider({ timeoutMs: 1000, graceMs: 1000 })).not.toThrow();
  });

  it("resolveLocalWorkingDirectory returns the ref's own locator.path (byte-identical to the actor projection's path)", async () => {
    const root = tempRoot();
    const repo = makeRepo(root, "host");
    const provider = createWorktreeProvider();
    const rec = recorder();
    provider.bindCompletionSink(rec.sink);
    await provider.provision("i1", "r1", worktreeSpec(repo));
    const completion = rec.completions[0]?.completion;
    expect(completion?.kind).toBe("ready");
    if (completion?.kind !== "ready") return;
    const cwd = provider.resolveLocalWorkingDirectory(completion.ref);
    const projection = provider.projectForActor(completion.ref) as unknown as { path: string };
    expect(cwd).toBe((completion.ref.locator as { path: string }).path);
    expect(cwd).toBe(projection.path);
  });

  it("resolveLocalWorkingDirectory throws LOUD on a foreign-kind or malformed ref (D6 config-integrity)", () => {
    const provider = createWorktreeProvider();
    expect(() => provider.resolveLocalWorkingDirectory({ kind: "container", locator: {} })).toThrow();
    expect(() =>
      provider.resolveLocalWorkingDirectory({ kind: "worktree", locator: { path: 5 } }),
    ).toThrow();
  });
});
