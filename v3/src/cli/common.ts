import { parseArgs } from "node:util";

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
