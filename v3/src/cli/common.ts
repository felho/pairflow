import { readdirSync } from "node:fs";
import { parseArgs } from "node:util";

import type { DiagStoreHandle } from "../diag/index.js";
import { TemplateLoadError } from "../definition/index.js";
import type { StoreHandle } from "../store/index.js";
import { CliError, exitCodeFor, toErrorDoc } from "./contract.js";
import type { CliDeps } from "./runtime.js";

/**
 * Shared CLI plumbing (packet ch6-P4b — mechanically extracted from
 * main.ts, no behavior change: the P4a regression suite is the
 * guard). Both entrypoints (normal main.ts, dev/main.ts) dispatch
 * through here, so the channel rule and the error-doc contract cannot
 * fork between them.
 */
export interface CliSinks {
  out(line: string): void;
  err(line: string): void;
}

export interface VerbContext {
  readonly positionals: readonly string[];
  readonly values: Record<string, string | boolean | (string | boolean)[] | undefined>;
  readonly deps: CliDeps;
  readonly sinks: CliSinks;
}

export type VerbHandler = (ctx: VerbContext) => Promise<number>;
export type VerbOptions = NonNullable<Parameters<typeof parseArgs>[0]>["options"];

export function usage(
  name: string,
  message: string,
  details?: Readonly<Record<string, unknown>>,
): CliError {
  return new CliError("usage", name, message, details);
}

export function notFound(name: string, message: string): CliError {
  return new CliError("not_found", name, message);
}

/** Runtime config matrix (packet ch6-P4a): --db > PAIRFLOW_V3_DB env;
 * missing/empty = usage (exit 2). Store-OPEN failures are NOT config
 * errors — they map to internal (exit 1) so the ADR-003 fail-closed
 * character stays loud. */
export function resolveDbPath(dbFlag: string | undefined, deps: CliDeps): string {
  const path = dbFlag ?? deps.env["PAIRFLOW_V3_DB"];
  if (path === undefined || path === "") {
    throw usage("MissingDbPath", "no database path: pass --db <path> or set PAIRFLOW_V3_DB");
  }
  return path;
}

export function openStoreOrInternal(path: string, deps: CliDeps): StoreHandle {
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

/** W2 (packet ch8-P2; draft C38/C31): a typed load error surfaces as
 * the ONE TemplateInvalid doc — details = the E5 {stage, findings}
 * shape VERBATIM, never a raw internal wrap. Everything else passes
 * through unchanged (the kernel's absent-at-handle integrity throw
 * stays its own internal doc — W3). ONE mapping, PER-VERB catch
 * sites (W4): start maps at its pre-load+kernel body, submit and
 * dev inject at their ingress.submit awaits — never one shared
 * catch site. */
export function toTemplateInvalid(error: unknown): unknown {
  return error instanceof TemplateLoadError
    ? new CliError("internal", "TemplateInvalid", error.message, {
        stage: error.stage,
        findings: error.findings,
      })
    : error;
}

/** The templates-dir config lane (packet ch8-P2, A1/A2; draft C29):
 * --templates-dir > PAIRFLOW_V3_TEMPLATES env; missing/empty = usage
 * (exit 2). A configured dir that cannot be LISTED (absent, not a
 * directory, unreadable) is ALSO usage — the ratified deviation from
 * the ch6 store-open half: a templates dir is a read-only LOOKUP
 * location, not the fail-closed write substrate. Checked EAGERLY at
 * wiring, so a bad dir exits 2 BEFORE any kernel handle. */
export function resolveTemplatesDir(flag: string | undefined, deps: CliDeps): string {
  const dir = flag ?? deps.env["PAIRFLOW_V3_TEMPLATES"];
  if (dir === undefined || dir === "") {
    throw usage(
      "MissingTemplatesDir",
      "no templates directory: pass --templates-dir <path> or set PAIRFLOW_V3_TEMPLATES",
    );
  }
  try {
    readdirSync(dir);
  } catch (error) {
    throw usage(
      "InvalidTemplatesDir",
      `templates directory '${dir}' cannot be listed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  return dir;
}

export function parseNonNegativeSafeInt(raw: string, flag: string): number {
  // Lexical check FIRST: Number() would coerce "", whitespace, "1e2"
  // and "0x10" — the contract is a plain decimal integer string
  // (P4a aftermath finding 2).
  if (!/^\d+$/.test(raw) || !Number.isSafeInteger(Number(raw))) {
    throw usage("InvalidFlagValue", `${flag} must be a nonnegative safe integer, got '${raw}'`);
  }
  return Number(raw);
}

export function flagString(ctx: VerbContext, name: string): string | undefined {
  const value = ctx.values[name];
  return typeof value === "string" ? value : undefined;
}

export function requireInstanceId(ctx: VerbContext): string {
  const id = ctx.positionals[0];
  if (id === undefined || id === "") {
    throw usage("MissingInstanceId", "an <instanceId> positional argument is required");
  }
  return id;
}

export function withStore<T>(
  ctx: VerbContext,
  run: (handle: StoreHandle) => Promise<T>,
): Promise<T> {
  const path = resolveDbPath(flagString(ctx, "db"), ctx.deps);
  const handle = openStoreOrInternal(path, ctx.deps);
  return run(handle).finally(() => {
    handle.close();
  });
}

/** The derived diag-DB path (packet ch7-P4, C1): a textual append after
 * the P4a resolution — no new flag, no new env var (plan §7.5). */
export function deriveDiagDbPath(dbPath: string): string {
  return `${dbPath}.diag.sqlite`;
}

/** withStore plus the diag handle on the derived path (ch7-P4, C3/V7).
 * Only diag-consuming/emitting verbs come through here; `openDiagStore`
 * never throws (C2), so — deliberately unlike `openStoreOrInternal` —
 * the diag open needs no fail-closed wrapper: a bad diag state
 * surfaces at the consuming read (fail-LOUD) or swallows at the write
 * (fail-open), per the §7.3 availability matrix. */
export function withStoreAndDiag<T>(
  ctx: VerbContext,
  run: (handle: StoreHandle, diag: DiagStoreHandle) => Promise<T>,
): Promise<T> {
  const path = resolveDbPath(flagString(ctx, "db"), ctx.deps);
  const handle = openStoreOrInternal(path, ctx.deps);
  const diag = ctx.deps.openDiagStore(deriveDiagDbPath(path), ctx.deps.time);
  return run(handle, diag).finally(() => {
    diag.close();
    handle.close();
  });
}

/** Diag-only access for the dev dump (ch7-P4, F4): resolves the db path
 * (the inherited usage lane) but NEVER opens the MAIN store — the
 * derivation is textual, and the dump consumes only the diag surface. */
export function withDiagStore<T>(
  ctx: VerbContext,
  run: (diag: DiagStoreHandle) => Promise<T>,
): Promise<T> {
  const path = resolveDbPath(flagString(ctx, "db"), ctx.deps);
  const diag = ctx.deps.openDiagStore(deriveDiagDbPath(path), ctx.deps.time);
  return run(diag).finally(() => {
    diag.close();
  });
}

/** The shared dispatch + catch shell: verb lookup, strict parseArgs,
 * and the channel rule's error side (ONE stderr doc + class code). */
export async function dispatch(
  verbs: Readonly<Record<string, VerbHandler>>,
  options: Readonly<Record<string, VerbOptions>>,
  argv: readonly string[],
  deps: CliDeps,
  sinks: CliSinks,
): Promise<number> {
  try {
    const verb = argv[0];
    if (verb === undefined || verbs[verb] === undefined) {
      throw usage(
        "UnknownVerb",
        `unknown verb '${verb ?? ""}' — expected one of: ${Object.keys(verbs).join(", ")}`,
      );
    }
    let parsed: { values: VerbContext["values"]; positionals: string[] };
    try {
      parsed = parseArgs({
        args: [...argv.slice(1)],
        options: options[verb],
        allowPositionals: true,
        strict: true,
      });
    } catch (error) {
      throw usage("InvalidArguments", error instanceof Error ? error.message : String(error));
    }
    const handler = verbs[verb];
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
