import { realpathSync } from "node:fs";
import { basename, dirname, isAbsolute, join } from "node:path";

import type {
  InstanceId,
  ProvisioningFailureReason,
  RuntimeContextProjection,
  RuntimeContextRef,
  RuntimeContextSpec,
} from "../domain/index.js";
import type {
  LocalExecutionCapability,
  RuntimeContextCompletionSink,
  RuntimeContextProvider,
} from "../ports/runtimeContextProvider.js";
import { enc } from "../runner/enc.js";
import { disciplinedSpawn, validateTimerKnobs } from "../runner/spawn.js";

/**
 * The `pairflow.worktree` provider (packet ch9-p2; contract:ch9-runner
 * C6–C11/C26, ADR-014/017/018): the FIRST real runtime-context provider —
 * local git worktree mechanics behind the ch12 L0e port. It evaluates the
 * spec's config AT PROVISION (S), derives a host-safe injective identity (N),
 * creates a branch-isolated worktree under the ADR-017 spawn discipline (M),
 * routes EVERY provisioning failure through the ch9-P1 FAILED completion
 * channel with a C3-classified `sys:` reason (PB), and returns the C10 ref +
 * actor projection (RP). It is STATELESS per call: every provision derives
 * everything from the spec + ids; no instance fields carry cross-call state.
 *
 * The completion is fired SYNCHRONOUSLY inside `provision()` through the bound
 * sink (PB2 — the one-shot CLI's process model needs the completion held and
 * flushed at the START attempt's conclusion, never outliving the process),
 * and only then does the returned detach acknowledgment resolve.
 */

/** The M4 spawn knobs — all defaulted; factory-configurable for hosts/tests. */
export interface WorktreeProviderOptions {
  /** The git binary (default `"git"` — resolved via PATH). A bad path drives
   * the ENOENT spawn-infra lane. */
  readonly gitBinary?: string;
  /** The fail-closed ENV ALLOWLIST handed to every git child (ADR-017). Default
   * `{ PATH }` — probe P4b proves `git worktree add` succeeds PATH-only. */
  readonly env?: Readonly<Record<string, string>>;
  /** The bounded timeout before SIGTERM (default 30 000 ms). */
  readonly timeoutMs?: number;
  /** The bounded grace before SIGKILL escalation (default 10 000 ms). */
  readonly graceMs?: number;
}

/** The worktree provider's public face — the port plus the late-bound sink
 * (the kernel is created after the provider is registered) plus the
 * LocalExecutionCapability facet (packet ch9-p3b, H1: its contexts execute on
 * this host, so it answers WHERE from its own minted `locator.path`). */
export interface WorktreeProvider extends RuntimeContextProvider, LocalExecutionCapability {
  bindCompletionSink(sink: RuntimeContextCompletionSink): void;
}

const REJECTED: ProvisioningFailureReason = "sys:provision_rejected";
const FAILED: ProvisioningFailureReason = "sys:provision_failed";

/** The C7 closed config keyset. */
const CONFIG_KEYS: ReadonlySet<string> = new Set(["repo", "base", "dir"]);

/** PB3: bound `detail` to the last 2 000 code units; ABSENT when the selected
 * source is empty. */
const DETAIL_TAIL_CAP = 2000;
function detailTail(source: string): string | undefined {
  if (source.length === 0) {
    return undefined;
  }
  return source.length > DETAIL_TAIL_CAP ? source.slice(-DETAIL_TAIL_CAP) : source;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// ── The git child-process runner (M4 — ADR-017 spawn discipline) ──────────
// SD2 (packet ch9-p3b): the git runner is RE-EXPRESSED over the shared C19
// spawn seam (`disciplinedSpawn`), closing ADR-017's one-enforcement-point
// intent (the P2-minted ch9-p3 fold-in marker is discharged in this change).
// The M4 discipline properties are preserved EXACTLY — explicit cwd = `repo`,
// `{PATH}` default allowlist, 30 s/10 s defaults, captured stdio, the
// SIGTERM→grace→SIGKILL escalation — and the fold changes WHERE the discipline
// lives, never what it does. The provider's git-specific timeout MESSAGE
// construction lives HERE (the seam's `timedOut`-flagged exit carries no git
// text); the retired `code ?? -1` coercion yields to the seam's faithful
// `code: null` (the `code !== 0` checks are shape-robust; the internal exit
// type widens `code` to `number | null` in the same change).

interface GitExit {
  readonly kind: "exit";
  readonly code: number | null;
  readonly stdout: string;
  readonly stderr: string;
}
interface GitInfra {
  readonly kind: "infra";
  readonly message: string;
}
/** A git run's outcome: a real EXIT (code + captured stdio) or an INFRA shape
 * (a spawn-setup throw, an ENOENT `error` event, or a timeout kill) — the
 * latter is `sys:provision_failed` in EVERY phase (S3). Never rejects. */
type GitResult = GitExit | GitInfra;

interface GitRunConfig {
  readonly bin: string;
  readonly env: Readonly<Record<string, string>>;
  readonly timeoutMs: number;
  readonly graceMs: number;
}

async function runGit(
  cfg: GitRunConfig,
  args: readonly string[],
  cwd: string,
): Promise<GitResult> {
  const conclusion = await disciplinedSpawn({
    cmd: cfg.bin,
    args,
    cwd,
    env: cfg.env,
    timeoutMs: cfg.timeoutMs,
    graceMs: cfg.graceMs,
  });
  if (conclusion.kind === "infra") {
    // A synchronous spawn-setup throw or an ENOENT error event (S3/M4).
    return { kind: "infra", message: conclusion.message };
  }
  if (conclusion.timedOut) {
    // The runner's OWN timeout kill — `sys:provision_failed` in every phase
    // (S3); the provider owns the git-specific message (the seam is text-blind).
    return {
      kind: "infra",
      message: `git '${args.join(" ")}' timed out after ${String(cfg.timeoutMs)}ms (killed ${conclusion.signal ?? "SIGTERM"})`,
    };
  }
  // Faithful exit — `code: null` on a (non-timeout) signal conclusion rides
  // through; the provider's `code !== 0` checks treat it as a mechanics fault.
  return { kind: "exit", code: conclusion.code, stdout: conclusion.stdout, stderr: conclusion.stderr };
}

// ── Evaluation (S) ────────────────────────────────────────────────────────

interface CreatePlan {
  readonly path: string;
  readonly branch: string;
  readonly repo: string;
  readonly baseCommit: string;
}
type EvalResult =
  | { readonly ok: true; readonly plan: CreatePlan }
  | { readonly ok: false; readonly reason: ProvisioningFailureReason; readonly detail?: string };

function reject(detail?: string): EvalResult {
  return detail === undefined
    ? { ok: false, reason: REJECTED }
    : { ok: false, reason: REJECTED, detail };
}
function infraFail(message: string): EvalResult {
  const detail = detailTail(message);
  return detail === undefined
    ? { ok: false, reason: FAILED }
    : { ok: false, reason: FAILED, detail };
}

async function evaluate(
  cfg: GitRunConfig,
  instanceId: InstanceId,
  requestId: string,
  spec: RuntimeContextSpec,
): Promise<EvalResult> {
  // (a) kind — the registry routes by provider NAME, so a foreign kind can
  // arrive; it is a config verdict, not a mechanics failure.
  if (spec.kind !== "worktree") {
    return reject();
  }
  const config = spec.config;
  // (b) config / repo presence.
  if (config === undefined || !Object.prototype.hasOwnProperty.call(config, "repo")) {
    return reject();
  }
  // (e) unknown config key (the C7 closed keyset).
  for (const key of Object.keys(config)) {
    if (!CONFIG_KEYS.has(key)) {
      return reject();
    }
  }
  const repo = config.repo;
  // (c) repo not a string, or a relative path.
  if (typeof repo !== "string" || !isAbsolute(repo)) {
    return reject();
  }
  // (f) dir present but not a string or not absolute.
  const dirRaw = config.dir;
  if (dirRaw !== undefined && (typeof dirRaw !== "string" || !isAbsolute(dirRaw))) {
    return reject();
  }
  // (g) base present but not a string.
  const baseRaw = config.base;
  if (baseRaw !== undefined && typeof baseRaw !== "string") {
    return reject();
  }
  // (i) realpath normalization — an evaluation fs CALL (not a git spawn); a
  // resolution failure (ENOENT on a vanished path) is the same rejected class
  // as (c)/(d), detail = the fs error's message (the grid's realpath row).
  let repoReal: string;
  try {
    repoReal = realpathSync(repo);
  } catch (error) {
    return reject(detailTail(errorMessage(error)));
  }
  // (d) repo is a git repository.
  const gitDir = await runGit(cfg, ["rev-parse", "--git-dir"], repoReal);
  if (gitDir.kind === "infra") {
    return infraFail(gitDir.message);
  }
  if (gitDir.code !== 0) {
    return reject(detailTail(gitDir.stderr));
  }
  // (i) ROOT IDENTITY — the realpath-normalized `repo` must equal the repo's
  // working-tree root (`--show-toplevel` itself returns a realpath). Without
  // this, a `repo=<root>/subdir` config would derive the default `dir` INSIDE
  // the host working tree, breaking the amended C7 guarantee; a linked
  // worktree's root is ITSELF, so the C9 linked-host lane stays legal.
  const topLevel = await runGit(cfg, ["rev-parse", "--show-toplevel"], repoReal);
  if (topLevel.kind === "infra") {
    return infraFail(topLevel.message);
  }
  if (topLevel.code !== 0) {
    return reject(detailTail(topLevel.stderr));
  }
  if (topLevel.stdout.trim() !== repoReal) {
    return reject();
  }
  // (h) base (or the defaulted HEAD) resolvable to a commit — resolved ONCE,
  // the value the ref records (M1/C10). The unborn-HEAD DEFAULT sub-lane is
  // S4's decided record: rejecting at evaluation keeps every create-phase
  // failure a mechanics failure.
  const baseRef = baseRaw ?? "HEAD";
  const rev = await runGit(cfg, ["rev-parse", "--verify", `${baseRef}^{commit}`], repoReal);
  if (rev.kind === "infra") {
    return infraFail(rev.message);
  }
  if (rev.code !== 0) {
    return reject(detailTail(rev.stderr));
  }
  const baseCommit = rev.stdout.trim();
  // Identity (N1) + the default `dir` BESIDE the host repo (the amended C7
  // default, outside every working tree).
  const dir = dirRaw ?? join(dirname(repoReal), ".pairflow-worktrees", basename(repoReal));
  const path = join(dir, `${enc(instanceId)}--${enc(requestId)}`);
  const branch = `pairflow/${enc(instanceId)}/${enc(requestId)}`;
  return { ok: true, plan: { path, branch, repo: repoReal, baseCommit } };
}

// ── Ref + projection (RP) ─────────────────────────────────────────────────

interface WorktreeLocator {
  readonly path: string;
  readonly branch: string;
  readonly repo: string;
  readonly base_commit: string;
}

function buildRef(plan: CreatePlan): RuntimeContextRef {
  const locator: WorktreeLocator = {
    path: plan.path,
    branch: plan.branch,
    repo: plan.repo,
    base_commit: plan.baseCommit,
  };
  return { kind: "worktree", locator };
}

/** The RP1 locator's EXACT own-key set — no more, no less. */
const LOCATOR_KEYS = ["path", "branch", "repo", "base_commit"] as const;

function isWorktreeLocator(locator: unknown): locator is WorktreeLocator {
  if (typeof locator !== "object" || locator === null || Array.isArray(locator)) {
    return false;
  }
  // RP3: the RP1 shape is the EXACT own-key set {path, branch, repo,
  // base_commit}, all strings — NO extra own keys, and INHERITED/prototype
  // keys never satisfy it (own-property reads only). A corrupted store row that
  // carries the four fields on its PROTOTYPE (an `Object.create` carrier) or an
  // extra own key must fail loud at the ch12-C15 projection gate, never project
  // lossily. `Object.keys` returns OWN enumerable keys only, so a length !== 4
  // rejects both the extra-key and the inherited-only carriers.
  if (Object.keys(locator).length !== LOCATOR_KEYS.length) {
    return false;
  }
  for (const key of LOCATOR_KEYS) {
    if (
      !Object.prototype.hasOwnProperty.call(locator, key) ||
      typeof (locator as Record<string, unknown>)[key] !== "string"
    ) {
      return false;
    }
  }
  return true;
}

export function createWorktreeProvider(
  options: WorktreeProviderOptions = {},
): WorktreeProvider {
  const cfg: GitRunConfig = {
    bin: options.gitBinary ?? "git",
    env: options.env ?? { PATH: process.env.PATH ?? "" },
    timeoutMs: options.timeoutMs ?? 30_000,
    graceMs: options.graceMs ?? 10_000,
  };
  // SD2/T2: the shared timer-knob validator, fail-closed at construction — the
  // seam's SIGTERM→grace escalation rests on validated arithmetic, and SD2's
  // unchanged-pin is thereby SCOPED to valid configurations.
  validateTimerKnobs([
    { label: "timeoutMs", value: cfg.timeoutMs },
    { label: "graceMs", value: cfg.graceMs },
  ]);
  let sink: RuntimeContextCompletionSink | null = null;

  const fireReady = (instanceId: InstanceId, requestId: string, ref: RuntimeContextRef): void => {
    if (sink === null) {
      // PORT BREACH (programming error): a bound sink is a composition
      // invariant, never reachable from hostile config.
      throw new Error(
        "worktreeProvider: no completion sink bound (bindCompletionSink) — cannot fire completion",
      );
    }
    sink(instanceId, requestId, { kind: "ready", ref });
  };
  const fireFailed = (
    instanceId: InstanceId,
    requestId: string,
    reason: ProvisioningFailureReason,
    detail: string | undefined,
  ): void => {
    if (sink === null) {
      throw new Error(
        "worktreeProvider: no completion sink bound (bindCompletionSink) — cannot fire completion",
      );
    }
    sink(instanceId, requestId, {
      kind: "failed",
      reason,
      ...(detail !== undefined ? { detail } : {}),
    });
  };

  return {
    bindCompletionSink(next: RuntimeContextCompletionSink): void {
      sink = next;
    },
    async provision(
      instanceId: InstanceId,
      requestId: string,
      spec: RuntimeContextSpec,
    ): Promise<void> {
      // PB1/PB2: the FULL provisioning runs here — evaluation, create, and the
      // completion fire through the bound sink — and only THEN does the detach
      // acknowledgment (this returned promise) resolve. EVERY provisioning
      // failure travels the FAILED completion channel; NO business/config
      // failure throws (the only throw site is the unbound-sink port breach).
      const evaluated = await evaluate(cfg, instanceId, requestId, spec);
      if (!evaluated.ok) {
        fireFailed(instanceId, requestId, evaluated.reason, evaluated.detail);
        return;
      }
      const plan = evaluated.plan;
      // CREATE phase: the branch-isolated worktree at the resolved base.
      const added = await runGit(
        cfg,
        ["worktree", "add", plan.path, "-b", plan.branch, plan.baseCommit],
        plan.repo,
      );
      if (added.kind === "infra") {
        // A timeout kill / spawn-infra error is `sys:provision_failed` in
        // every phase (S3/M4).
        fireFailed(instanceId, requestId, FAILED, detailTail(added.message));
        return;
      }
      if (added.code !== 0) {
        // Create-phase nonzero exit — the mechanics failed (over-length,
        // collision, N3/N4/M1). The stderr tail feeds the confined `detail`.
        fireFailed(instanceId, requestId, FAILED, detailTail(added.stderr));
        return;
      }
      fireReady(instanceId, requestId, buildRef(plan));
    },
    projectForActor(ref: RuntimeContextRef): RuntimeContextProjection {
      // RP3 integrity: the provider gates its own input — a foreign kind or a
      // malformed locator is a LOUD synchronous throw (a corrupted store row
      // must fail loud at the ch12-C15 projection gate, never project lossily;
      // the healthy composition never reaches this — this provider only ever
      // emitted RP1 refs and the kernel guards the kind boundary).
      if (ref.kind !== "worktree") {
        throw new Error(
          `worktreeProvider: projectForActor received a foreign-kind ref '${ref.kind}' (expected 'worktree')`,
        );
      }
      if (!isWorktreeLocator(ref.locator)) {
        throw new Error(
          "worktreeProvider: projectForActor received a worktree ref with a malformed locator",
        );
      }
      // RP2 FIELD OMISSION (not confinement): `repo`/`base_commit` are dropped
      // — the substrate leaks both to a curious actor; host-repo secrecy is
      // not a boundary this chapter claims (the trusted-local-host stance).
      const projection: { kind: "worktree"; path: string; branch: string } = {
        kind: "worktree",
        path: ref.locator.path,
        branch: ref.locator.branch,
      };
      return projection as unknown as RuntimeContextProjection;
    },
    resolveLocalWorkingDirectory(ref: RuntimeContextRef): string {
      // H1 (packet ch9-p3b): the LocalExecutionCapability facet — the absolute
      // working directory is a CONTRACT obligation of this local provider,
      // answered from its OWN minted `locator.path` (byte-identical to the
      // actor projection's `path`; C17 value-identity). The same RP3 integrity
      // gate as `projectForActor`: a foreign-kind or malformed-locator ref is a
      // LOUD synchronous throw (the loop routes it to D6's config-integrity
      // lane, fail-closed, errand unmutated).
      if (ref.kind !== "worktree") {
        throw new Error(
          `worktreeProvider: resolveLocalWorkingDirectory received a foreign-kind ref '${ref.kind}' (expected 'worktree')`,
        );
      }
      if (!isWorktreeLocator(ref.locator)) {
        throw new Error(
          "worktreeProvider: resolveLocalWorkingDirectory received a worktree ref with a malformed locator",
        );
      }
      return ref.locator.path;
    },
  };
}
