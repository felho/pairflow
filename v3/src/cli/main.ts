import { pathToFileURL } from "node:url";

import { DiagUnavailableError } from "../diag/index.js";
import type {
  ActivationMode,
  EventEnvelope,
  Outcome,
  WorkflowTemplate,
} from "../domain/index.js";
import { deriveEmitDigest, deriveOperatorOpId, isCanonicalizable } from "../emit/index.js";
import type { FloorInstanceDetail } from "../floor/index.js";
import {
  createDebugBundleExporter,
  createDiagTail,
  createFloor,
  createTail,
  redactPayloadsPolicy,
  TailIntegrityError,
  TailUnknownInstanceError,
} from "../floor/index.js";
import { createIngress } from "../ingress/index.js";
import { createKernel } from "../kernel/index.js";
import type { Kernel } from "../kernel/index.js";
import type { RuntimeContextCompletion } from "../domain/index.js";
import type { DefinitionStore } from "../ports/definition.js";
import type { DiagnosticEventBody, DiagnosticsSink } from "../ports/diagnostics.js";
import type { GateCatalog } from "../ports/gate.js";
import type {
  ProviderRegistry,
  RuntimeContextCompletionSink,
} from "../ports/runtimeContextProvider.js";
import { createWorktreeProvider } from "../providers/index.js";
import type { WorktreeProvider } from "../providers/index.js";
import type { VerbContext, VerbHandler, VerbOptions } from "./common.js";
import {
  createOutputSinks,
  dispatch,
  flagString,
  notFound,
  parseNonNegativeSafeInt,
  requireInstanceId,
  resolveDbPath,
  resolveTemplatesDir,
  toTemplateInvalid,
  usage,
  withStore,
  withStoreAndDiag,
} from "./common.js";
import { CliError, EXIT } from "./contract.js";
import { deriveProcessEvidenceDbPath } from "./failClosedProcessGateRunner.js";
import type { CliDeps } from "./runtime.js";
import { productionDeps } from "./runtime.js";
import { createFileDefinitionStore, TemplateLoadError } from "../definition/index.js";
import { createGateRegistry } from "../gates/index.js";
import { createStaticProviderRegistry } from "../ports/index.js";
import { createProcessGateRunner } from "../runner/index.js";
import {
  ATTACH_VERB_OPTIONS,
  enrichDetailRunner,
  optionalTemplatesDir,
  RUNNER_VERB_OPTIONS,
  verbAttach,
  verbRunner,
} from "./runnerVerbs.js";

/**
 * The operator CLI, normal entrypoint (plan §6.5, packets ch6-P4a ·
 * ch12-P4): a THIN client — formatting, defaults, wiring; zero
 * semantics. Verbs: list / detail / timeline / tail / bundle (read-only
 * floor) and create / start / kickoff / cancel / submit (writes — THIN
 * INGRESS WRITERS over the built kernel lifecycle methods and
 * ingress.submit ONLY; the src/cli lint boundary bans direct StorePort
 * writes). The four lifecycle verbs (ch12-P4, V1–V6) replace the
 * retired C25 in-handler CREATE→START bridge — `create` is genesis,
 * `start` the real single-op START. Dev verbs live behind the SEPARATE
 * cli/dev entrypoint (P4b; ADR-009 boundary).
 */
export type { CliSinks } from "./common.js";

function parseTemplateRef(raw: string): { id: string; version: number } {
  const at = raw.lastIndexOf("@");
  const id = at > 0 ? raw.slice(0, at) : "";
  const versionSource = at > 0 ? raw.slice(at + 1) : "";
  // The version half mirrors C8's source grammar, LEXICAL FIRST (the
  // P4a numeric-flag rule; packet ch8-P2 T2): Number() alone coerces
  // '0x10'/'1e2'/'01' and would silently canonicalize distinct source
  // forms onto one filename. The safe-int belt stays — a [1-9]\d* string
  // past 2^53−1 collapses under Number(). The id half is NOT
  // prevalidated beyond nonempty: the store judges it (S1, no
  // prevalidation — an off-grammar id can only miss).
  if (
    id === "" ||
    !/^[1-9][0-9]*$/.test(versionSource) ||
    !Number.isSafeInteger(Number(versionSource))
  ) {
    throw usage("InvalidTemplateRef", `--template must be '<id>@<version>', got '${raw}'`);
  }
  return { id, version: Number(versionSource) };
}


function parseOverrides(
  raw: readonly string[],
  template: WorkflowTemplate,
): Readonly<Record<string, string>> {
  const overrides: Record<string, string> = {};
  const validRoles = Object.keys(template.roles);
  for (const entry of raw) {
    const eq = entry.indexOf("=");
    if (eq <= 0 || eq === entry.length - 1) {
      throw usage("InvalidOverride", `--override must be 'role=actor', got '${entry}'`);
    }
    const role = entry.slice(0, eq);
    if (!validRoles.includes(role)) {
      // The kernel's resolveBinding ignores unknown roles silently — the
      // thin client catches the operator typo instead (zero semantics).
      throw usage("UnknownRole", `unknown role '${role}'`, { validRoles });
    }
    overrides[role] = entry.slice(eq + 1);
  }
  return overrides;
}

/** Submit payload rules (parse-contract matrix): flag absent → the
 * envelope has NO payload key (absent ≠ null, the emit-digest arity
 * rule); the literal string 'null' → JSON null; unparsable → usage. */
function parsePayload(raw: string | undefined): { present: boolean; value?: unknown } {
  if (raw === undefined) {
    return { present: false };
  }
  try {
    return { present: true, value: JSON.parse(raw) as unknown };
  } catch {
    throw usage("InvalidPayloadJson", `--payload is not valid JSON: '${raw}'`);
  }
}

/**
 * V6 (contract:ch14-human-decision#C23): the ch6-P4a exit classification,
 * reused UNCHANGED. Its declared input is the actor-envelope `Outcome`
 * and BOTH operator-intent unions are ASSIGNABLE to it — identical
 * `committed`/`duplicate`/`stale` arms, and every reason token of both is
 * a `RejectionName` other than `gate_blocked`, which is exactly what the
 * rejected arm admits. So no shared production helper is edited and no
 * classifier is duplicated. THE TRAP IS NAMED: `lifecycleExitCode` below
 * has no `stale` arm and its `default` would route one silently to exit
 * 1 — reaching for it because these verbs sit beside the lifecycle verbs
 * is the plausible wrong move.
 */
export function outcomeExitCode(outcome: Outcome): number {
  switch (outcome.kind) {
    case "committed":
    case "duplicate":
      return EXIT.ok;
    case "stale":
    case "rejected":
      return EXIT.notFound;
  }
}

/**
 * V3 (packet ch12-P4): the exit mapping over the LIFECYCLE outcome
 * unions (`CreateOutcome`/`StartOutcome`/`KickoffOutcome`/`CancelOutcome`
 * — `domain/outcome.ts`), which DIFFER from the actor-transition
 * `Outcome`: the SUCCESS/idempotent kinds (`created`/`activated`/
 * `accepted`/`terminated`/`duplicate`) → exit-0 DATA docs; `rejected`
 * → exit-3 kernel-negative DATA docs (incl. a WRITE-path
 * `unknown_instance` — NOT a read-side notFound error doc). There is NO
 * `stale` (a lifecycle CAS conflict RETRIES in-loop, never surfacing an
 * outcome), and the terminal-sink `state_violation` THROWS (mapped to
 * exit-1 internal by the dispatch catch) rather than returning here.
 */
function lifecycleExitCode(outcome: { readonly kind: string }): number {
  switch (outcome.kind) {
    case "created":
    case "activated":
    case "accepted":
    case "terminated":
    case "duplicate":
      return EXIT.ok;
    case "rejected":
      return EXIT.notFound;
    default:
      // Unreachable — the lifecycle unions carry no other kind.
      return EXIT.internal;
  }
}

/** V2/V5 (packet ch12-P4, C13): the `--mode` CLI input precondition — a
 * MEMBER token by construction. The authored camelCase `immediate` /
 * `deferredKickoff` maps to the DOMAIN token; a NON-member is refused
 * CLI-side (usage/2) BEFORE `kernel.create`, so the `?? default` cascade
 * never resolves a bogus token (the fail-open a silent pass-through would
 * create is closed at the CLI grain). */
const MODE_BY_AUTHORED: Readonly<Record<string, ActivationMode>> = {
  immediate: "immediate",
  deferredKickoff: "deferred_kickoff",
};
function parseMode(raw: string | undefined): ActivationMode | undefined {
  if (raw === undefined) {
    return undefined;
  }
  const mode = MODE_BY_AUTHORED[raw];
  if (mode === undefined) {
    throw usage("InvalidMode", `--mode must be 'immediate' or 'deferredKickoff', got '${raw}'`);
  }
  return mode;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** V2 (packet ch12-P4, C9): `--run-overrides` — a JSON map of step-id →
 * agent-config map, shape-validated CLI-side as STRUCTURE ONLY (valid
 * JSON, a map whose every entry is a map, canonical-JSON-safe). The
 * SEMANTICS are kernel-side (C9 — the kernel treats each entry opaquely;
 * an unknown step-id is INERT, the ratifier's D5 conscious debt, NOT a
 * CLI rejection lane). Each structure violation is a deterministic
 * usage/2. */
function parseRunOverrides(
  raw: string | undefined,
): Readonly<Record<string, Readonly<Record<string, unknown>>>> | undefined {
  if (raw === undefined) {
    return undefined;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw usage("InvalidRunOverrides", `--run-overrides is not valid JSON: '${raw}'`);
  }
  if (!isPlainRecord(parsed)) {
    throw usage(
      "InvalidRunOverrides",
      "--run-overrides must be a JSON map of step-id -> agent-config map",
    );
  }
  for (const [stepId, entry] of Object.entries(parsed)) {
    if (!isPlainRecord(entry)) {
      throw usage("InvalidRunOverrides", `--run-overrides entry '${stepId}' must be a map`);
    }
    // Canonical-JSON safety (`1e999` → Infinity survives JSON.parse but
    // fails here) — the same emit-lib strictness the provenance rests on.
    if (!isCanonicalizable(entry)) {
      throw usage(
        "InvalidRunOverrides",
        `--run-overrides entry '${stepId}' must be canonical-JSON-safe`,
      );
    }
  }
  return parsed as Record<string, Record<string, unknown>>;
}

/**
 * R1 (packet ch9-p2; contract:ch9-runner#C6): the shared PRODUCTION provider
 * registry — sole member `pairflow.worktree` (the real worktree provider).
 * The C12 empty-map call retires from production. Returns the registry plus
 * the provider handle so the caller can bind its completion sink AFTER the
 * kernel exists (R2/DG4). The join is legal by ordering — ch9-P1 realized the
 * FAILED channel this provider routes onto.
 */
export function createProductionProviderRegistry(): {
  readonly registry: ProviderRegistry;
  readonly provider: WorktreeProvider;
} {
  const provider = createWorktreeProvider();
  return {
    registry: createStaticProviderRegistry({ "pairflow.worktree": provider }),
    provider,
  };
}

/**
 * DG4 (packet ch9-p2; contract:ch9-runner#C26): the runner-plane diagnostic
 * event for a provisioning completion — provider-anonymous, built at the
 * composition sink wrapper. `provision_ready` carries instanceId + requestId;
 * `provision_failed` adds the RAW reason token AS REPORTED (`providerReason`,
 * never the kernel's classified verdict) and — iff the report's `detail` is a
 * plain string — the PB3 tail (`providerDetail`). A non-string hostile detail
 * is OMITTED and the event still fires.
 */
function runnerDiagEvent(
  instanceId: string,
  requestId: string,
  completion: RuntimeContextCompletion,
): DiagnosticEventBody {
  if (completion.kind === "ready") {
    return { source: "runner", kind: "provision_ready", instanceId, requestId };
  }
  return {
    source: "runner",
    kind: "provision_failed",
    instanceId,
    requestId,
    providerReason: completion.reason,
    ...(typeof completion.detail === "string" ? { providerDetail: completion.detail } : {}),
  };
}

/**
 * R2/DG4: bind the provider's completion sink to `Kernel.deliverCompletion`,
 * WRAPPED by the diag-emitting sink. The wrapper emits the DG2 event BARE
 * (the fail-open `DiagnosticsSink` contract, REV-DIAG-FAILOPEN — no defensive
 * try/catch) at completion-FIRE time, independent of the later admission
 * outcome (the event records the provider's REPORT, never the kernel's
 * verdict), THEN delivers.
 */
export function bindProductionCompletionSink(
  provider: WorktreeProvider,
  kernel: Kernel,
  diag: DiagnosticsSink,
): void {
  const sink: RuntimeContextCompletionSink = (instanceId, requestId, completion) => {
    diag.emit(runnerDiagEvent(instanceId, requestId, completion));
    kernel.deliverCompletion(instanceId, requestId, completion);
  };
  provider.bindCompletionSink(sink);
}

/**
 * V1 (packet ch12-P4): the shared kernel wiring for the lifecycle write
 * verbs — the REAL `ProcessGateRunner` beside the derived-path store DB
 * (CW1, packet ch9-p4b — the operator gate-runner swap replaced the
 * fail-closed slot on this shipped operator path; C21 activated), the
 * PRODUCTION provider registry (ch9-P2 C6 — the
 * shipped CLI's sole member is `pairflow.worktree`, wired onto the completion
 * seam through the DG4 diag-wrapping sink), and the built kernel injected the
 * SAME gate catalog the definition store admits with (ch11-P2b T1). No CLI
 * handler writes through `StorePort` directly. R2: the START verb (the ONLY
 * `provision()` caller) runs here, so `withKernel` AWAITS
 * `settleRuntimeContextDeliveries()` after its verb body — the seam's own
 * shutdown-drain rule made real at the first composition that can produce
 * deliveries (empty in the normal PB2-synchronous path; the belt for any
 * direct-path residue).
 */
async function withKernel<T>(
  ctx: VerbContext,
  definitions: DefinitionStore,
  gates: GateCatalog,
  run: (kernel: Kernel) => Promise<T>,
): Promise<T> {
  return withStoreAndDiag(ctx, async (handle, diag) => {
    // CW1 (packet ch9-p4b): the OPERATOR gate-runner swap — the real
    // `ProcessGateRunner` (C21, GR1–GR8) replaces the fail-closed slot on the
    // shipped operator path. Options defaulted (env allowlist `{ PATH }`, grace
    // 10 000 ms — W1 is the gate-lane widening boundary); the evidence home is
    // the derived sibling path unchanged (GR5's one-home rule — the slot's
    // `resolve` reads the same rows). A shipped operator verb reaching a
    // process gate now SPAWNS it for real and the kernel classifies the result.
    const processRunner = createProcessGateRunner(
      deriveProcessEvidenceDbPath(resolveDbPath(flagString(ctx, "db"), ctx.deps)),
      { time: ctx.deps.time },
      {},
    );
    const { registry, provider } = createProductionProviderRegistry();
    try {
      const kernel = createKernel({
        store: handle.store,
        definitions,
        time: ctx.deps.time,
        digest: deriveEmitDigest,
        diag: diag.sink,
        gates,
        processRunner,
        providerRegistry: registry,
      });
      bindProductionCompletionSink(provider, kernel, diag.sink);
      const result = await run(kernel);
      // R2 shutdown drain — await every in-flight post-conclusion delivery
      // before process exit (a permanent no-op under PB2's synchronous shape;
      // the belt for any direct-path residue).
      await kernel.settleRuntimeContextDeliveries();
      return result;
    } finally {
      processRunner.close();
    }
  });
}

async function verbList(ctx: VerbContext): Promise<number> {
  return withStore(ctx, async (handle) => {
    // F1: every composition root ANSWERS the required parameter. `list`
    // derives no Ask, so its answer is the explicit `null`.
    const rows = await createFloor(handle.store, null).listInstances();
    ctx.sinks.out(JSON.stringify(rows));
    return EXIT.ok;
  });
}

async function verbDetail(ctx: VerbContext): Promise<number> {
  const id = requireInstanceId(ctx);
  // DT1 (packet ch9-p4b): the detail doc gains ONE sibling `runner` key beside
  // the byte-preserved kernel detail. The section is CLI-layer composition (the
  // floor MODULE stays kernel-only). It stays on `withStore` — the enrichment's
  // reader facade rides the NOOP diag sink, so a committed-only detail read
  // still NEVER opens the diag file (C3); the CF3 flip's write is to the
  // errand ledger alone.
  // V9 (packet ch9-p4b DT2): the DEGRADE election, unchanged — `detail`
  // resolves the dir flag-first and answers "none configured" with `null`
  // rather than demanding it. The seam is NAMED here because `verbDetail`
  // needs the dir BEFORE `createFloor` and the member is produced BY the
  // read rather than composed after it.
  const dir = optionalTemplatesDir(ctx);
  return withStore(ctx, async (handle) => {
    const definitions =
      dir === null ? null : createFileDefinitionStore(dir, createGateRegistry());
    let detail;
    try {
      detail = await createFloor(handle.store, definitions).getInstanceDetail(id);
    } catch (error) {
      // THE CATCH IS NARROWED, and that is the whole difference between
      // reuse and damage (F6): a bare `catch` here would swallow the
      // derivation's six kernel-integrity throws and F3's two into a
      // silently member-less document. An integrity throw reaches the
      // `internal` class on this verb exactly as it does on
      // `submit-decision`; only "I cannot reach the template" degrades.
      if (!(error instanceof TemplateLoadError)) {
        throw error;
      }
      // V9's ONE recovery read: the SAME detail read with a `null`
      // dependency, which cannot load and therefore cannot throw. It
      // composes NOTHING EXTRA — no key, no token — so the emitted
      // document is byte-identical to the `null`-load arm's.
      detail = await createFloor(handle.store, null).getInstanceDetail(id);
    }
    if (detail === null) {
      throw notFound("UnknownInstance", `no such run: '${id}'`);
    }
    const runner = await enrichDetailRunner(ctx, handle.store, detail.instance);
    ctx.sinks.out(JSON.stringify({ ...detail, runner }));
    return EXIT.ok;
  });
}

async function verbTimeline(ctx: VerbContext): Promise<number> {
  const id = requireInstanceId(ctx);
  const after = parseNonNegativeSafeInt(flagString(ctx, "after") ?? "0", "--after");
  return withStore(ctx, async (handle) => {
    // F1: `timeline` derives no Ask either — the explicit `null`.
    const rows = await createFloor(handle.store, null).getTimeline(id, after);
    if (rows === null) {
      throw notFound("UnknownInstance", `no such run: '${id}'`);
    }
    ctx.sinks.out(JSON.stringify(rows));
    return EXIT.ok;
  });
}

async function verbTail(ctx: VerbContext): Promise<number> {
  const id = requireInstanceId(ctx);
  const from = parseNonNegativeSafeInt(flagString(ctx, "from") ?? "0", "--from");
  const pollMs = parseNonNegativeSafeInt(flagString(ctx, "poll-ms") ?? "250", "--poll-ms");
  const diagMode = ctx.values["diag"] === true;
  const fromOrdinalRaw = flagString(ctx, "from-ordinal");
  if (fromOrdinalRaw !== undefined && !diagMode) {
    // M8 (packet ch7-P4): a cursor for a lane not requested is a
    // contract violation — presence-checked, so `--from-ordinal 0`
    // without --diag is red too.
    throw usage("FromOrdinalWithoutDiag", "--from-ordinal is valid only with --diag");
  }
  const fromOrdinal = parseNonNegativeSafeInt(fromOrdinalRaw ?? "0", "--from-ordinal");

  // ONE shared catch for BOTH branches (ch7-P4 M5 build-guard): the
  // plain and --diag streams map through the same type-based site, so
  // the P4a-driven mappings structurally cover the diag path too.
  const streamTail = async (rows: AsyncIterable<unknown>): Promise<number> => {
    try {
      for await (const row of rows) {
        ctx.sinks.out(JSON.stringify(row));
      }
    } catch (error) {
      // Tail Error Contract (P2/P3): rows already on stdout stay
      // parseable; the failure becomes ONE stderr document + the class
      // exit code.
      if (error instanceof TailUnknownInstanceError) {
        throw notFound("TailUnknownInstanceError", error.message);
      }
      if (error instanceof RangeError) {
        throw usage("InvalidCursor", error.message);
      }
      if (error instanceof TailIntegrityError) {
        throw new CliError("internal", "TailIntegrityError", error.message);
      }
      if (error instanceof DiagUnavailableError) {
        // M2: fail-LOUD with the enumerated token in details (§7.3).
        throw new CliError("internal", "DiagUnavailableError", error.message, {
          reason: error.reason,
        });
      }
      throw error;
    }
    return EXIT.ok;
  };

  if (!diagMode) {
    // V2: the plain tail stays on the ch6-P2 engine — no diag open (C3).
    return withStore(ctx, (handle) =>
      streamTail(createTail(handle.store, ctx.deps.tailWait(pollMs)).tailCommittedTimeline(id, from)),
    );
  }
  return withStoreAndDiag(ctx, (handle, diag) =>
    streamTail(
      createDiagTail(handle.store, diag.reader, ctx.deps.tailWait(pollMs)).tailWithDiagnostics(
        id,
        from,
        fromOrdinal,
      ),
    ),
  );
}

async function verbBundle(ctx: VerbContext): Promise<number> {
  const id = requireInstanceId(ctx);
  return withStoreAndDiag(ctx, async (handle, diag) => {
    // REV-BUNDLE-DEFAULT-POLICY: the normal CLI binds the production
    // default; pass-through exists only behind the dev entrypoint (P4b).
    // The store-backed reader on the derived path (ch7-P4, V4) — the
    // ch7-P3 interim reader retired with this wiring.
    const exporter = createDebugBundleExporter(
      handle.store,
      redactPayloadsPolicy,
      diag.reader,
    );
    const bundle = await exporter.exportDebugBundle(id);
    if (bundle === null) {
      throw notFound("UnknownInstance", `no such run: '${id}'`);
    }
    ctx.sinks.out(JSON.stringify(bundle));
    return EXIT.ok;
  });
}

/**
 * V2 (packet ch12-P4, C20): `create` — genesis. The pinned template ref
 * (ch8-C30 grammar; default `local-pair-v0@1`), the caller-MINTED
 * instance id (`ctx.deps.instanceIdSource()` — no op_id; creation is
 * genesis, C13), optional `--task`, the `--override role=actor` binding
 * surface, optional `--run-overrides` (C9), and optional `--mode`
 * (C13). Emits the `Created` outcome as data (the instance id surfaced
 * on stdout for scripting the `create`→`start` sequence). The
 * binding-coverage guard MIGRATED from the retired bridge (V4): a
 * `kernel.create` binding-coverage THROW maps to usage/2.
 */
async function verbCreate(ctx: VerbContext): Promise<number> {
  const templateRef = parseTemplateRef(flagString(ctx, "template") ?? "local-pair-v0@1");
  const task = flagString(ctx, "task");
  // CLI-side INPUT-PRECONDITION lanes (V2) — a non-member `--mode` and a
  // malformed `--run-overrides` are refused CLI-side (usage/2) BEFORE the
  // kernel sees anything (the kernel never sees a malformed input).
  const mode = parseMode(flagString(ctx, "mode"));
  const runOverrides = parseRunOverrides(flagString(ctx, "run-overrides"));
  // ONE catalog value per composition root (ch11-P2b, T1): the SAME
  // `createGateRegistry()` feeds the definition store AND the kernel.
  const gates = createGateRegistry();
  const definitions = createFileDefinitionStore(
    resolveTemplatesDir(flagString(ctx, "templates-dir"), ctx.deps),
    gates,
  );
  // The outer catch is TYPE-based (W4): it maps TemplateLoadError from the
  // pre-load AND the kernel's own load inside CREATE (the mid-race).
  try {
    const template = await definitions.load(templateRef);
    if (template === null) {
      throw notFound(
        "UnknownTemplate",
        `template '${templateRef.id}@${String(templateRef.version)}' not found`,
      );
    }
    const overrideFlags = ctx.values["override"];
    const overrides = parseOverrides(
      Array.isArray(overrideFlags) ? overrideFlags.filter((v) => typeof v === "string") : [],
      template,
    );
    return await withKernel(ctx, definitions, gates, async (kernel) => {
      try {
        const instanceId = ctx.deps.instanceIdSource();
        const outcome = await kernel.create({
          instanceId,
          templateRef,
          ...(task !== undefined ? { task } : {}),
          ...(Object.keys(overrides).length > 0 ? { overrides } : {}),
          ...(runOverrides !== undefined ? { runOverrides } : {}),
          ...(mode !== undefined ? { mode } : {}),
        });
        // The Created outcome carries the minted instance id on stdout;
        // a `Rejected(task_required)` rides as an exit-3 DATA doc (V3).
        ctx.sinks.out(JSON.stringify(outcome));
        return lifecycleExitCode(outcome);
      } catch (error) {
        // The retired bridge's binding-coverage → usage guard, migrated to
        // CREATE (where binding coverage now rejects; V4). Everything else
        // (a colliding minted id, unexpected errors) flows to the dispatch
        // internal branch — the 2-vs-1 exit split must not collapse.
        if (
          error instanceof Error &&
          error.message.startsWith("create failed (binding coverage)")
        ) {
          throw usage("CreateFailed", error.message);
        }
        throw error;
      }
    });
  } catch (error) {
    throw toTemplateInvalid(error);
  }
}

/**
 * V3/V4/V6 (packet ch12-P4, C20/C24): `start <instance-id>` — the real
 * single-op START verb (the C25 in-handler CREATE→START bridge RETIRED).
 * Calls `kernel.start` alone with a minted nonce `op_id` (C13); NO
 * create. Since ch9-P2 (C6) a spec-declaring template resolves
 * `pairflow.worktree` against the PRODUCTION registry and provisions a live
 * worktree (the run lands READY-committed or FAILED through the ch9 channel);
 * an UNREGISTERED provider name still returns
 * `Rejected(runtime_context_provider_unavailable)`. No convenience
 * CREATE+START verb ships (C19).
 */
async function verbStart(ctx: VerbContext): Promise<number> {
  const instanceId = requireInstanceId(ctx);
  const gates = createGateRegistry();
  const definitions = createFileDefinitionStore(
    resolveTemplatesDir(flagString(ctx, "templates-dir"), ctx.deps),
    gates,
  );
  try {
    return await withKernel(ctx, definitions, gates, async (kernel) => {
      const outcome = await kernel.start({
        instanceId,
        opId: deriveOperatorOpId(ctx.deps.nonceSource()),
      });
      ctx.sinks.out(JSON.stringify(outcome));
      return lifecycleExitCode(outcome);
    });
  } catch (error) {
    throw toTemplateInvalid(error);
  }
}

/**
 * V3 (packet ch12-P4, C20): `kickoff <instance-id> --task <task>` — the
 * deferred task supplied now. REQUIRES the task (its nonempty-string
 * grammar; a missing `--task` is usage/2). Mints a nonce `op_id` (C13).
 * A terminal-sink `state_violation` (kickoff of an already-TERMINAL run)
 * THROWS → exit-1 internal (the dispatch catch).
 */
async function verbKickoff(ctx: VerbContext): Promise<number> {
  const instanceId = requireInstanceId(ctx);
  const task = flagString(ctx, "task");
  if (task === undefined || task === "") {
    throw usage("MissingTask", "--task <text> is required");
  }
  const gates = createGateRegistry();
  const definitions = createFileDefinitionStore(
    resolveTemplatesDir(flagString(ctx, "templates-dir"), ctx.deps),
    gates,
  );
  try {
    return await withKernel(ctx, definitions, gates, async (kernel) => {
      const outcome = await kernel.kickoff({
        instanceId,
        task,
        opId: deriveOperatorOpId(ctx.deps.nonceSource()),
      });
      ctx.sinks.out(JSON.stringify(outcome));
      return lifecycleExitCode(outcome);
    });
  } catch (error) {
    throw toTemplateInvalid(error);
  }
}

/**
 * V3 (packet ch12-P4, C20): `cancel <instance-id>` — terminal disposal
 * from any non-terminal state. No payload; mints a nonce `op_id` (C13).
 * A terminal-sink `state_violation` (cancel of an already-TERMINAL run)
 * THROWS → exit-1 internal (the dispatch catch — a terminal instance is
 * an INVARIANT sink, not a business rejection).
 */
async function verbCancel(ctx: VerbContext): Promise<number> {
  const instanceId = requireInstanceId(ctx);
  const gates = createGateRegistry();
  const definitions = createFileDefinitionStore(
    resolveTemplatesDir(flagString(ctx, "templates-dir"), ctx.deps),
    gates,
  );
  try {
    return await withKernel(ctx, definitions, gates, async (kernel) => {
      const outcome = await kernel.cancel({
        instanceId,
        opId: deriveOperatorOpId(ctx.deps.nonceSource()),
      });
      ctx.sinks.out(JSON.stringify(outcome));
      return lifecycleExitCode(outcome);
    });
  } catch (error) {
    throw toTemplateInvalid(error);
  }
}

async function verbSubmit(ctx: VerbContext): Promise<number> {
  const instanceId = flagString(ctx, "instance");
  const type = flagString(ctx, "type");
  const expectedVersionRaw = flagString(ctx, "expected-version");
  // ch11-P1 O1: --expected-role joins the required set at parse — the
  // warrant's context-authority pair gets ONE fail-fast treatment on
  // this production write surface (the human-approve-ratified form).
  const expectedRole = flagString(ctx, "expected-role");
  if (
    instanceId === undefined ||
    type === undefined ||
    expectedVersionRaw === undefined ||
    expectedRole === undefined ||
    expectedRole === ""
  ) {
    throw usage(
      "MissingSubmitFlags",
      "--instance, --type, --expected-version and --expected-role are required",
    );
  }
  const expectedVersion = parseNonNegativeSafeInt(expectedVersionRaw, "--expected-version");
  const payload = parsePayload(flagString(ctx, "payload"));
  // ADR-004 operator family: ONE nonce per logical invocation; a retry
  // within this invocation would reuse it (no transport retry in v1).
  const opId = deriveOperatorOpId(ctx.deps.nonceSource());
  // O2: pass-through — the KERNEL stays the semantic authority; a
  // wrong role rides stdout as a role_not_authorized outcome data row.
  const envelope: EventEnvelope = {
    instanceId,
    opId,
    type,
    actorId: flagString(ctx, "actor") ?? "operator",
    expectedVersion,
    expectedRole,
    ...(payload.present ? { payload: payload.value } : {}),
  };
  // ONE catalog value per composition root (ch11-P2b, T1): the same
  // registry feeds the definition store and the kernel.
  const gates = createGateRegistry();
  const definitions = createFileDefinitionStore(
    resolveTemplatesDir(flagString(ctx, "templates-dir"), ctx.deps),
    gates,
  );
  // W4: submit first touches the template INSIDE kernel.handle — the
  // typed error surfaces at the ingress.submit await (ingress carries
  // no catch); the type-based outer catch maps it there. The
  // absent-at-handle null stays the kernel's integrity throw (W3) and
  // passes through unchanged.
  try {
    return await withStoreAndDiag(ctx, async (handle, diag) => {
      // CW1 (packet ch9-p4b): the OPERATOR gate-runner swap on the submit write
      // site too — the real `ProcessGateRunner` (C21) on the derived-path
      // evidence sibling, replacing the fail-closed slot. Options defaulted
      // (env allowlist `{ PATH }`, grace 10 000 ms — W1's gate-lane boundary).
      const processRunner = createProcessGateRunner(
        deriveProcessEvidenceDbPath(resolveDbPath(flagString(ctx, "db"), ctx.deps)),
        { time: ctx.deps.time },
        {},
      );
      // R1: the SAME shared production registry helper (the empty-map call
      // retired). This site builds a kernel but NEVER provisions (submit
      // handles actor envelopes) — the provider is wired for uniformity /
      // provider-anonymity, and a settle here would be a permanent no-op
      // across one-shot processes, so none is awaited (R2).
      const { registry, provider } = createProductionProviderRegistry();
      try {
        // V5 (ch7-P4): kernel AND ingress emit into the derived-path store.
        const kernel = createKernel({
          store: handle.store,
          definitions,
          time: ctx.deps.time,
          digest: deriveEmitDigest,
          diag: diag.sink,
          gates,
          processRunner,
          providerRegistry: registry,
        });
        bindProductionCompletionSink(provider, kernel, diag.sink);
        const outcome = await createIngress({ kernel, diag: diag.sink }).submit(envelope);
        // The outcome IS the surface's answer — DATA on stdout, always;
        // the exit code classifies it (duplicate = idempotent success).
        ctx.sinks.out(JSON.stringify(outcome));
        return outcomeExitCode(outcome);
      } finally {
        processRunner.close();
      }
    });
  } catch (error) {
    throw toTemplateInvalid(error);
  }
}

/**
 * THE ONE FLOOR DETAIL READ both write verbs perform before constructing
 * their kernel input (V2; contract:ch14-human-decision#C23(a)).
 *
 * It runs in its OWN store scope, BEFORE any kernel exists, so each of
 * V4's three resolution answers returns having committed NOTHING — no
 * transcript row, no version change, no op consumption. There is no
 * re-read, no retry and no loop: a value that moved between this read
 * and the write lands as the kernel's own `Stale` /
 * `decision_request_mismatch` DATA outcome.
 *
 * `definitions` is the verb's answer to F1's REQUIRED dependency:
 * `submit-decision` hands over its store (it needs the derived Ask),
 * `resume` hands over `null` BY CONSTRUCTION — which is the mechanism
 * behind contract:ch14-human-decision#C27's no-early-block rule rather
 * than a saving of work.
 */
async function readForWrite<T>(
  ctx: VerbContext,
  instanceId: string,
  definitions: DefinitionStore | null,
  resolve: (detail: FloorInstanceDetail) => T,
): Promise<T> {
  return withStore(ctx, async (handle) => {
    const detail = await createFloor(handle.store, definitions).getInstanceDetail(instanceId);
    if (detail === null) {
      // V4 (i): the standing read-side not-found document the read verbs
      // already emit. `unknown_instance` therefore cannot surface from
      // either verb's outcome union (V6).
      throw notFound("UnknownInstance", `no such run: '${instanceId}'`);
    }
    return resolve(detail);
  });
}

/**
 * V1/V2/V3/V4 (contract:ch14-human-decision#C23, #C16, #C15, #C27):
 * `submit-decision <instance-id> --decision <key> [--override]
 * [--payload <json>] [--by <operator>]` — the operator's decision on a
 * parked human gate.
 *
 * DELIBERATELY NOT the older `submit` verb's shape: the instance id is
 * POSITIONAL, and neither `--expected-version` nor `--expected-role`
 * exists — the CAS input and the bound operator come from V2's ONE read,
 * so `missing_version` has no way to reach the kernel from this surface.
 *
 * V5: the route is `kernel.submitDecision` DIRECTLY, never
 * `ingress.submitIntent` — the ingress's operator-intent leg validates an
 * UNTRUSTED wire record off a transport, and this verb has none.
 */
async function verbSubmitDecision(ctx: VerbContext): Promise<number> {
  const instanceId = requireInstanceId(ctx);
  const verdict = flagString(ctx, "decision");
  if (verdict === undefined || verdict === "") {
    throw usage("MissingDecision", "--decision <key> is required");
  }
  // THE ABSENCE BOUNDARY IS PER-FLAG (V3): `--payload` and `--override`
  // are passed as GENUINE ABSENCES — omitted keys — so C15's
  // `missing_required_field` and C16's `override_required` are the rungs
  // that decide them. Defaulting either here would silently answer a
  // question the contract gives the kernel.
  const payload = parsePayload(flagString(ctx, "payload"));
  const override = ctx.values["override"] === true;
  const by = flagString(ctx, "by");
  // V8: ONE gate catalog and ONE definition store per invocation — the
  // SAME instance reaches the floor AND the kernel.
  const gates = createGateRegistry();
  const definitions = createFileDefinitionStore(
    resolveTemplatesDir(flagString(ctx, "templates-dir"), ctx.deps),
    gates,
  );
  try {
    const resolved = await readForWrite(ctx, instanceId, definitions, (detail) => {
      const instance = detail.instance;
      // V4 (ii) is keyed on the PARK STATE, read off `wait.kind` DIRECTLY
      // and never off the member's absence — otherwise a parked run whose
      // pinned file is missing would be told it has no pending decision
      // (contract:ch14-human-decision#C27's own reason).
      if (instance.kernelStatus !== "WAITING" || instance.wait?.kind !== "human_decision") {
        throw notFound(
          "NoPendingDecision",
          `run '${instanceId}' is not awaiting a human decision`,
        );
      }
      const ask = detail.pendingDecision;
      if (ask === undefined) {
        // V4 (iii)'s NULL shape. The REJECTING shape never reaches here —
        // it throws out of the floor and the outer catch maps it through
        // the tree's live `toTemplateInvalid`. The null arm has no error
        // to map, so the name is minted HERE, in `cli/main.ts`, never in
        // the barred shared helpers.
        throw new CliError(
          "internal",
          "TemplateUnavailable",
          `the pinned template for run '${instanceId}' could not be loaded`,
        );
      }
      return {
        requestRef: ask.requestRef,
        // The instance record's own non-optional `version`. The Ask's
        // `expectedVersion` is the same number by C20's definition; the
        // build reads ONE of them rather than comparing two.
        expectedVersion: instance.version,
        // V3(b): `--by` defaults to the SAME read's bound operator — no
        // second load. An EXPLICIT wrong principal still reaches the
        // kernel's authority rung.
        by: by ?? ask.operator,
      };
    });
    return await withKernel(ctx, definitions, gates, async (kernel) => {
      const outcome = await kernel.submitDecision({
        intent: "submit-decision",
        instanceId,
        opId: deriveOperatorOpId(ctx.deps.nonceSource()),
        expectedVersion: resolved.expectedVersion,
        requestRef: resolved.requestRef,
        verdict,
        ...(override ? { override: true } : {}),
        ...(payload.present ? { payload: payload.value } : {}),
        by: resolved.by,
      });
      // The outcome IS the surface's answer — DATA on stdout, always;
      // the exit code classifies it (V6's inherited ch6-P4a matrix).
      ctx.sinks.out(JSON.stringify(outcome));
      return outcomeExitCode(outcome);
    });
  } catch (error) {
    throw toTemplateInvalid(error);
  }
}

/**
 * V1/V2/V4 (contract:ch14-human-decision#C23, #C9, #C27): `resume
 * <instance-id> --event <type>` — the bare wait's resume.
 *
 * ITS FLOOR IS BUILT WITH `null` BY CONSTRUCTION (F1), and that is what
 * makes C27's rule STRUCTURAL rather than asserted: the verb performs NO
 * floor template load, NO Ask derivation and NO correlation join, so it
 * cannot be blocked EARLY — before admission — on an unyielded template.
 * Its pre-load answers (`duplicate`, `stale`, `not_waiting`,
 * `resume_event_mismatch`) reach the operator as DATA. The KERNEL's own
 * post-admission load stays reachable and may still fail there, which is
 * exactly what C27 preserves rather than removes.
 *
 * `resume` is the verb name and `resume-wait` the intent discriminant —
 * C23's asymmetry, kept rather than tidied.
 */
async function verbResume(ctx: VerbContext): Promise<number> {
  const instanceId = requireInstanceId(ctx);
  const type = flagString(ctx, "event");
  if (type === undefined || type === "") {
    throw usage("MissingEvent", "--event <type> is required");
  }
  const gates = createGateRegistry();
  const definitions = createFileDefinitionStore(
    resolveTemplatesDir(flagString(ctx, "templates-dir"), ctx.deps),
    gates,
  );
  // V2: `resume` takes `expected_version` ALONE — its wire carries no
  // `request_ref`, so it has no use for the Ask.
  const expectedVersion = await readForWrite(
    ctx,
    instanceId,
    null,
    (detail) => detail.instance.version,
  );
  try {
    return await withKernel(ctx, definitions, gates, async (kernel) => {
      const outcome = await kernel.resumeWait({
        intent: "resume-wait",
        instanceId,
        opId: deriveOperatorOpId(ctx.deps.nonceSource()),
        expectedVersion,
        type,
      });
      ctx.sinks.out(JSON.stringify(outcome));
      return outcomeExitCode(outcome);
    });
  } catch (error) {
    throw toTemplateInvalid(error);
  }
}

const VERB_OPTIONS: Record<string, VerbOptions> = {
  list: { db: { type: "string" } },
  // DT2 (packet ch9-p4b): `detail` gains `--templates-dir` — the
  // `templates-unavailable` summary member resolves the dir flag-first (the
  // strict shell must admit the flag) BUT degrades in-doc rather than
  // demanding it (the degrade-vs-demand election).
  detail: { db: { type: "string" }, "templates-dir": { type: "string" } },
  timeline: { db: { type: "string" }, after: { type: "string" } },
  tail: {
    db: { type: "string" },
    from: { type: "string" },
    "poll-ms": { type: "string" },
    diag: { type: "boolean" },
    "from-ordinal": { type: "string" },
  },
  bundle: { db: { type: "string" } },
  create: {
    db: { type: "string" },
    task: { type: "string" },
    template: { type: "string" },
    "templates-dir": { type: "string" },
    override: { type: "string", multiple: true },
    "run-overrides": { type: "string" },
    mode: { type: "string" },
  },
  start: {
    db: { type: "string" },
    "templates-dir": { type: "string" },
  },
  kickoff: {
    db: { type: "string" },
    task: { type: "string" },
    "templates-dir": { type: "string" },
  },
  cancel: {
    db: { type: "string" },
    "templates-dir": { type: "string" },
  },
  // ch14-p3a (V1/V8): the two operator verbs. Both DEMAND
  // `--templates-dir` (the write-verb election) and take a POSITIONAL
  // instance id — deliberately NOT `submit`'s `--instance` shape.
  "submit-decision": {
    db: { type: "string" },
    "templates-dir": { type: "string" },
    decision: { type: "string" },
    override: { type: "boolean" },
    payload: { type: "string" },
    by: { type: "string" },
  },
  resume: {
    db: { type: "string" },
    "templates-dir": { type: "string" },
    event: { type: "string" },
  },
  submit: {
    db: { type: "string" },
    instance: { type: "string" },
    type: { type: "string" },
    "expected-version": { type: "string" },
    "expected-role": { type: "string" },
    payload: { type: "string" },
    actor: { type: "string" },
    "templates-dir": { type: "string" },
  },
  // RR1 (packet ch9-p4b): `VERB_OPTIONS["runner"]` is the UNION of both
  // subverbs' flag sets — the shared dispatch shell strict-parses ONCE per
  // top-level verb and each subverb HANDLER enforces its own partition.
  runner: RUNNER_VERB_OPTIONS,
  attach: ATTACH_VERB_OPTIONS,
};

const VERBS: Record<string, VerbHandler> = {
  list: verbList,
  detail: verbDetail,
  timeline: verbTimeline,
  tail: verbTail,
  bundle: verbBundle,
  create: verbCreate,
  start: verbStart,
  kickoff: verbKickoff,
  cancel: verbCancel,
  submit: verbSubmit,
  // ch14-p3a: the operator's two verbs — the first path by which a human
  // being can move a v3 workflow from the shipped command line.
  "submit-decision": verbSubmitDecision,
  resume: verbResume,
  // ch9-p4b: the operator runner plane — `runner run` / `runner respawn`
  // (subverb dispatch) and top-level `attach`. Production seams are bound by
  // default; the unit suite drives the handlers directly with scripted seams.
  runner: verbRunner,
  attach: verbAttach,
};

export async function runCli(
  argv: readonly string[],
  deps: CliDeps,
  sinks: { out(line: string): void; err(line: string): void },
): Promise<number> {
  return dispatch(VERBS, VERB_OPTIONS, argv, deps, sinks);
}

// Shipped entrypoint (root bridge: `pnpm v3:cli -- <verb> ...`).
const invokedPath = process.argv[1];
if (invokedPath !== undefined && import.meta.url === pathToFileURL(invokedPath).href) {
  // packet ch13-p0 (E1): the ONE shared sink factory — the closure rule,
  // the line framing and the stream routing cannot fork between the two
  // shipped entrypoints.
  process.exitCode = await runCli(
    process.argv.slice(2),
    productionDeps(),
    createOutputSinks(process.stdout, process.stderr),
  );
}
