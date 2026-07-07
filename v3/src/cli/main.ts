import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

import type { EventEnvelope, Outcome, WorkflowTemplate } from "../domain/index.js";
import { deriveEmitDigest, deriveOperatorOpId } from "../emit/index.js";
import {
  createDebugBundleExporter,
  createFloor,
  createTail,
  redactPayloadsPolicy,
  TailIntegrityError,
  TailUnknownInstanceError,
} from "../floor/index.js";
import { createIngress } from "../ingress/index.js";
import { createKernel } from "../kernel/index.js";
import type { StoreHandle } from "../store/index.js";
import { CliError, EXIT, exitCodeFor, toErrorDoc } from "./contract.js";
import type { CliDeps } from "./runtime.js";
import { productionDeps } from "./runtime.js";
import { builtinDefinitionStore } from "./templates.js";

/**
 * The operator CLI, normal entrypoint (plan §6.5, packet ch6-P4a): a
 * THIN client — formatting, defaults, wiring; zero semantics. Verbs:
 * list / detail / timeline / tail / bundle (read-only floor) and
 * start / submit (writes — through kernel.startInstance and
 * ingress.submit ONLY; the src/cli lint boundary bans direct StorePort
 * writes). Dev verbs live behind the SEPARATE cli/dev entrypoint
 * (P4b; ADR-009 boundary).
 */
export interface CliSinks {
  out(line: string): void;
  err(line: string): void;
}

function usage(name: string, message: string, details?: Readonly<Record<string, unknown>>): CliError {
  return new CliError("usage", name, message, details);
}

function notFound(name: string, message: string): CliError {
  return new CliError("not_found", name, message);
}

/** Runtime config matrix (packet ch6-P4a): --db > PAIRFLOW_V3_DB env;
 * missing/empty = usage (exit 2). Store-OPEN failures are NOT config
 * errors — they map to internal (exit 1) so the ADR-003 fail-closed
 * character stays loud. */
function resolveDbPath(dbFlag: string | undefined, deps: CliDeps): string {
  const path = dbFlag ?? deps.env["PAIRFLOW_V3_DB"];
  if (path === undefined || path === "") {
    throw usage(
      "MissingDbPath",
      "no database path: pass --db <path> or set PAIRFLOW_V3_DB",
    );
  }
  return path;
}

function openStoreOrInternal(path: string, deps: CliDeps): StoreHandle {
  try {
    return deps.openStore(path, deps.time);
  } catch (error) {
    throw new CliError(
      "internal",
      "StoreOpenFailed",
      `store open failed (fail closed): ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function parseNonNegativeSafeInt(raw: string, flag: string): number {
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 0) {
    throw usage("InvalidFlagValue", `${flag} must be a nonnegative safe integer, got '${raw}'`);
  }
  return value;
}

function parseTemplateRef(raw: string): { id: string; version: number } {
  const at = raw.lastIndexOf("@");
  const id = at > 0 ? raw.slice(0, at) : "";
  const version = at > 0 ? Number(raw.slice(at + 1)) : Number.NaN;
  if (id === "" || !Number.isSafeInteger(version) || version < 1) {
    throw usage("InvalidTemplateRef", `--template must be '<id>@<version>', got '${raw}'`);
  }
  return { id, version };
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

interface VerbContext {
  readonly positionals: readonly string[];
  readonly values: Record<string, string | boolean | (string | boolean)[] | undefined>;
  readonly deps: CliDeps;
  readonly sinks: CliSinks;
}

function requireInstanceId(ctx: VerbContext): string {
  const id = ctx.positionals[0];
  if (id === undefined || id === "") {
    throw usage("MissingInstanceId", "an <instanceId> positional argument is required");
  }
  return id;
}

function flagString(ctx: VerbContext, name: string): string | undefined {
  const value = ctx.values[name];
  return typeof value === "string" ? value : undefined;
}

function withStore<T>(ctx: VerbContext, run: (handle: StoreHandle) => Promise<T>): Promise<T> {
  const path = resolveDbPath(flagString(ctx, "db"), ctx.deps);
  const handle = openStoreOrInternal(path, ctx.deps);
  return run(handle).finally(() => {
    handle.close();
  });
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
  return withStore(ctx, async (handle) => {
    const tail = createTail(handle.store, ctx.deps.tailWait(pollMs));
    try {
      for await (const row of tail.tailCommittedTimeline(id, from)) {
        ctx.sinks.out(JSON.stringify(row));
      }
    } catch (error) {
      // Tail Error Contract (P2): rows already on stdout stay parseable;
      // the failure becomes ONE stderr document + the class exit code.
      if (error instanceof TailUnknownInstanceError) {
        throw notFound("TailUnknownInstanceError", error.message);
      }
      if (error instanceof RangeError) {
        throw usage("InvalidCursor", error.message);
      }
      if (error instanceof TailIntegrityError) {
        throw new CliError("internal", "TailIntegrityError", error.message);
      }
      throw error;
    }
    return EXIT.ok;
  });
}

async function verbBundle(ctx: VerbContext): Promise<number> {
  const id = requireInstanceId(ctx);
  return withStore(ctx, async (handle) => {
    // REV-BUNDLE-DEFAULT-POLICY: the normal CLI binds the production
    // default; pass-through exists only behind the dev entrypoint (P4b).
    const exporter = createDebugBundleExporter(handle.store, redactPayloadsPolicy);
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
  const definitions = builtinDefinitionStore();
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
  return withStore(ctx, async (handle) => {
    const kernel = createKernel({
      store: handle.store,
      definitions,
      time: ctx.deps.time,
      digest: deriveEmitDigest,
    });
    try {
      const started = await kernel.startInstance({
        instanceId: ctx.deps.instanceIdSource(),
        templateRef,
        task,
        ...(Object.keys(overrides).length > 0 ? { startOverrides: overrides } : {}),
      });
      ctx.sinks.out(JSON.stringify(started));
      return EXIT.ok;
    } catch (error) {
      // Start-side failures throw before any state exists (plan §4.1);
      // with the ref pre-checked above, what remains is start INPUT
      // trouble (binding coverage) — usage class.
      throw usage("StartFailed", error instanceof Error ? error.message : String(error));
    }
  });
}

async function verbSubmit(ctx: VerbContext): Promise<number> {
  const instanceId = flagString(ctx, "instance");
  const type = flagString(ctx, "type");
  const expectedVersionRaw = flagString(ctx, "expected-version");
  if (instanceId === undefined || type === undefined || expectedVersionRaw === undefined) {
    throw usage(
      "MissingSubmitFlags",
      "--instance, --type and --expected-version are required",
    );
  }
  const expectedVersion = parseNonNegativeSafeInt(expectedVersionRaw, "--expected-version");
  const payload = parsePayload(flagString(ctx, "payload"));
  // ADR-004 operator family: ONE nonce per logical invocation; a retry
  // within this invocation would reuse it (no transport retry in v1).
  const opId = deriveOperatorOpId(ctx.deps.nonceSource());
  const envelope: EventEnvelope = {
    instanceId,
    opId,
    type,
    actorId: flagString(ctx, "actor") ?? "operator",
    expectedVersion,
    ...(payload.present ? { payload: payload.value } : {}),
  };
  return withStore(ctx, async (handle) => {
    const kernel = createKernel({
      store: handle.store,
      definitions: builtinDefinitionStore(),
      time: ctx.deps.time,
      digest: deriveEmitDigest,
    });
    const outcome = await createIngress(kernel).submit(envelope);
    // The outcome IS the surface's answer — DATA on stdout, always;
    // the exit code classifies it (duplicate = idempotent success).
    ctx.sinks.out(JSON.stringify(outcome));
    return outcomeExitCode(outcome);
  });
}

const VERB_OPTIONS: Record<string, NonNullable<Parameters<typeof parseArgs>[0]>["options"]> = {
  list: { db: { type: "string" } },
  detail: { db: { type: "string" } },
  timeline: { db: { type: "string" }, after: { type: "string" } },
  tail: { db: { type: "string" }, from: { type: "string" }, "poll-ms": { type: "string" } },
  bundle: { db: { type: "string" } },
  start: {
    db: { type: "string" },
    task: { type: "string" },
    template: { type: "string" },
    override: { type: "string", multiple: true },
  },
  submit: {
    db: { type: "string" },
    instance: { type: "string" },
    type: { type: "string" },
    "expected-version": { type: "string" },
    payload: { type: "string" },
    actor: { type: "string" },
  },
};

const VERBS: Record<string, (ctx: VerbContext) => Promise<number>> = {
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
  sinks: CliSinks,
): Promise<number> {
  try {
    const verb = argv[0];
    if (verb === undefined || VERBS[verb] === undefined) {
      throw usage(
        "UnknownVerb",
        `unknown verb '${verb ?? ""}' — expected one of: ${Object.keys(VERBS).join(", ")}`,
      );
    }
    let parsed: { values: VerbContext["values"]; positionals: string[] };
    try {
      parsed = parseArgs({
        args: [...argv.slice(1)],
        options: VERB_OPTIONS[verb],
        allowPositionals: true,
        strict: true,
      });
    } catch (error) {
      throw usage("InvalidArguments", error instanceof Error ? error.message : String(error));
    }
    const handler = VERBS[verb];
    return await handler({ positionals: parsed.positionals, values: parsed.values, deps, sinks });
  } catch (error) {
    const cliError =
      error instanceof CliError
        ? error
        : new CliError(
            "internal",
            error instanceof Error ? error.name : "UnknownError",
            error instanceof Error ? error.message : String(error),
          );
    sinks.err(JSON.stringify(toErrorDoc(cliError)));
    return exitCodeFor(cliError.errorClass);
  }
}

// Shipped entrypoint (root bridge: `pnpm v3:cli -- <verb> ...`).
const invokedPath = process.argv[1];
if (invokedPath !== undefined && import.meta.url === pathToFileURL(invokedPath).href) {
  process.exitCode = await runCli(process.argv.slice(2), productionDeps(), {
    out: (line) => process.stdout.write(`${line}\n`),
    err: (line) => process.stderr.write(`${line}\n`),
  });
}
