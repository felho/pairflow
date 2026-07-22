import { pathToFileURL } from "node:url";

import { DiagUnavailableError } from "../diag/index.js";
import type { EventEnvelope, Outcome, WorkflowTemplate } from "../domain/index.js";
import { deriveEmitDigest, deriveOperatorOpId } from "../emit/index.js";
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
import type { VerbContext, VerbHandler, VerbOptions } from "./common.js";
import {
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
import {
  createFailClosedProcessGateRunner,
  deriveProcessEvidenceDbPath,
} from "./failClosedProcessGateRunner.js";
import type { CliDeps } from "./runtime.js";
import { productionDeps } from "./runtime.js";
import { createFileDefinitionStore } from "../definition/index.js";
import { createGateRegistry } from "../gates/index.js";
import { createStaticProviderRegistry } from "../ports/index.js";

/**
 * The operator CLI, normal entrypoint (plan §6.5, packet ch6-P4a): a
 * THIN client — formatting, defaults, wiring; zero semantics. Verbs:
 * list / detail / timeline / tail / bundle (read-only floor) and
 * start / submit (writes — through the kernel's CREATE→START bridge and
 * ingress.submit ONLY; the src/cli lint boundary bans direct StorePort
 * writes). Dev verbs live behind the SEPARATE cli/dev entrypoint
 * (P4b; ADR-009 boundary).
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

function outcomeExitCode(outcome: Outcome): number {
  switch (outcome.kind) {
    case "committed":
    case "duplicate":
      return EXIT.ok;
    case "stale":
    case "rejected":
      return EXIT.notFound;
  }
}

async function verbList(ctx: VerbContext): Promise<number> {
  return withStore(ctx, async (handle) => {
    const rows = await createFloor(handle.store).listInstances();
    ctx.sinks.out(JSON.stringify(rows));
    return EXIT.ok;
  });
}

async function verbDetail(ctx: VerbContext): Promise<number> {
  const id = requireInstanceId(ctx);
  return withStore(ctx, async (handle) => {
    const detail = await createFloor(handle.store).getInstanceDetail(id);
    if (detail === null) {
      throw notFound("UnknownInstance", `no such run: '${id}'`);
    }
    ctx.sinks.out(JSON.stringify(detail));
    return EXIT.ok;
  });
}

async function verbTimeline(ctx: VerbContext): Promise<number> {
  const id = requireInstanceId(ctx);
  const after = parseNonNegativeSafeInt(flagString(ctx, "after") ?? "0", "--after");
  return withStore(ctx, async (handle) => {
    const rows = await createFloor(handle.store).getTimeline(id, after);
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

async function verbStart(ctx: VerbContext): Promise<number> {
  const task = flagString(ctx, "task");
  if (task === undefined || task === "") {
    throw usage("MissingTask", "--task <text> is required");
  }
  const templateRef = parseTemplateRef(flagString(ctx, "template") ?? "local-pair-v0@1");
  // ONE catalog value per composition root (ch11-P2b, T1): the SAME
  // `createGateRegistry()` feeds the definition store AND the kernel —
  // composing two would let admission and the rung disagree, the drift
  // the C35 backstop exists to catch.
  const gates = createGateRegistry();
  // ONE resolution, ONE store instance (packet ch8-P2 note 1): the
  // eager dir gate (A2) runs BEFORE any store/kernel construction, and
  // the SAME file store feeds the pre-load and the kernel.
  const definitions = createFileDefinitionStore(
    resolveTemplatesDir(flagString(ctx, "templates-dir"), ctx.deps),
    gates,
  );
  // The outer catch is TYPE-based (W4/note 2): it maps TemplateLoadError
  // from EVERY site in this verb body — the pre-load below AND the
  // kernel's own load inside the CREATE leg (the mid-invocation race).
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
    // W3 (packet ch12-p3, C24): the ch11-P4 EAGER required-context pre-check
    // RETIRES — no retired surface survives as a parallel path. A
    // spec-declaring template is now refused by the KERNEL's own S2 lane
    // (`runtime_context_provider_unavailable` against the EMPTY production
    // registry, C16); a residual `"required"` string by the R2 admission
    // migration refusal. The shipped CLI ships no provider — a
    // spec-declaring template is honestly unstartable here until ch9.
    return await withStoreAndDiag(ctx, async (handle, diag) => {
      // W2 (ch11-P3b): the fail-closed process-gate runner on a derived-path
      // sibling beside the store DB — never spawns, never allows.
      const processRunner = createFailClosedProcessGateRunner(
        deriveProcessEvidenceDbPath(resolveDbPath(flagString(ctx, "db"), ctx.deps)),
      );
      try {
        // V5 (ch7-P4): the store-backed sink on the derived path, passed
        // BARE — no defensive wrapper (REV-DIAG-FAILOPEN).
        const kernel = createKernel({
          store: handle.store,
          definitions,
          time: ctx.deps.time,
          digest: deriveEmitDigest,
          diag: diag.sink,
          gates,
          processRunner,
          // C16 (packet ch12-p3, PR2): the EMPTY production registry — the
          // shipped CLI ships no runtime-context provider.
          providerRegistry: createStaticProviderRegistry({}),
        });
        try {
          // The C25 in-handler bridge (packet ch12-p1b, W2): the retired
          // one-shot's call site rewired to an interim CREATE→START
          // sequence — NOT the C19 convenience verb (P4 lands the
          // four-verb surface and retires this). No CREATE-level mode
          // (immediate default; the deferred path in the window is
          // ingress/test-driven). `--task` is parse-required above, so
          // `task_required` is unreachable through this verb; a
          // CREATE-committed/START-rejected residue is unreachable on
          // the business paths, and any non-business residue is an
          // ordinary CREATED instance, resumable by a fresh START.
          const instanceId = ctx.deps.instanceIdSource();
          const created = await kernel.create({
            instanceId,
            templateRef,
            task,
            ...(Object.keys(overrides).length > 0 ? { overrides } : {}),
          });
          if (created.kind === "rejected") {
            throw new Error(
              `start failed: unexpected create rejection '${created.reason}' with a parse-required task`,
            );
          }
          const startOutcome = await kernel.start({
            instanceId,
            opId: deriveOperatorOpId(ctx.deps.nonceSource()),
          });
          // The verb emits the START leg's outcome as the stdout data
          // document (the CREATE leg's `Created` is interior — C25).
          ctx.sinks.out(JSON.stringify(startOutcome));
          return startOutcome.kind === "activated" || startOutcome.kind === "accepted"
            ? EXIT.ok
            : startOutcome.kind === "duplicate"
              ? EXIT.ok
              : EXIT.notFound;
        } catch (error) {
          // ONLY the create-INPUT lane is usage — binding coverage, the
          // one reachable input failure (the ref is pre-checked above).
          // Everything else (store integrity such as a colliding minted
          // id, unexpected errors) flows to the outer internal branch:
          // the 2-vs-1 exit split must not collapse (P4a aftermath
          // finding 1).
          if (
            error instanceof Error &&
            error.message.startsWith("create failed (binding coverage)")
          ) {
            throw usage("StartFailed", error.message);
          }
          throw error;
        }
      } finally {
        processRunner.close();
      }
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
      // W2 (ch11-P3b): the fail-closed process-gate runner on the derived-path
      // evidence sibling — never spawns, never allows.
      const processRunner = createFailClosedProcessGateRunner(
        deriveProcessEvidenceDbPath(resolveDbPath(flagString(ctx, "db"), ctx.deps)),
      );
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
          providerRegistry: createStaticProviderRegistry({}),
        });
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

const VERB_OPTIONS: Record<string, VerbOptions> = {
  list: { db: { type: "string" } },
  detail: { db: { type: "string" } },
  timeline: { db: { type: "string" }, after: { type: "string" } },
  tail: {
    db: { type: "string" },
    from: { type: "string" },
    "poll-ms": { type: "string" },
    diag: { type: "boolean" },
    "from-ordinal": { type: "string" },
  },
  bundle: { db: { type: "string" } },
  start: {
    db: { type: "string" },
    task: { type: "string" },
    template: { type: "string" },
    "templates-dir": { type: "string" },
    override: { type: "string", multiple: true },
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
};

const VERBS: Record<string, VerbHandler> = {
  list: verbList,
  detail: verbDetail,
  timeline: verbTimeline,
  tail: verbTail,
  bundle: verbBundle,
  start: verbStart,
  submit: verbSubmit,
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
  process.exitCode = await runCli(process.argv.slice(2), productionDeps(), {
    out: (line) => process.stdout.write(`${line}\n`),
    err: (line) => process.stderr.write(`${line}\n`),
  });
}
