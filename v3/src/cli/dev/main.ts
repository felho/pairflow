import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

import { deriveActorEmitOpId, deriveEmitDigest, isCanonicalizable } from "../../emit/index.js";
import { createDebugBundleExporter, redactPayloadsPolicy } from "../../floor/index.js";
import { createIngress } from "../../ingress/index.js";
import { createKernel } from "../../kernel/index.js";
import type { TraceFixture } from "../../testkit/index.js";
import {
  devPassthroughRedactionPolicy,
  replayTrace,
  TraceMismatchError,
} from "../../testkit/index.js";
import type { VerbContext, VerbHandler, VerbOptions } from "../common.js";
import {
  dispatch,
  flagString,
  notFound,
  requireInstanceId,
  usage,
  withStore,
} from "../common.js";
import { CliError, EXIT } from "../contract.js";
import type { CliDeps } from "../runtime.js";
import { productionDeps } from "../runtime.js";
import { builtinDefinitionStore, builtinTemplate } from "../templates.js";
import { noopDiagnosticsSink, unavailableDiagnosticsReader } from "../../diag/index.js";

/**
 * The DEV entrypoint (plan §6.5, packet ch6-P4b; ADR-009 dev CLI
 * boundary): the ONE graph that may import the testkit. Verbs:
 * bundle [--passthrough] · inject · replay. Shares the dispatch shell,
 * the channel rule, and the error-doc contract with the normal CLI
 * (cli/common.ts) — the contracts cannot fork.
 *
 * Dev runtime config matrix: bundle and inject inherit the P4a config
 * contract in full (--db > PAIRFLOW_V3_DB; missing = usage 2;
 * store-open fail-closed = internal 1). replay is HERMETIC — an
 * ephemeral :memory: store per invocation, no user DB read or
 * polluted; --db is not an accepted flag there (strict parseArgs).
 */

async function verbDevBundle(ctx: VerbContext): Promise<number> {
  const id = requireInstanceId(ctx);
  const passthrough = ctx.values["passthrough"] === true;
  return withStore(ctx, async (handle) => {
    // Interim diag wiring (ch7-P3, lane X1): the unavailable reader
    // rides until ch7-P4 wires the store on the derived config.
    const exporter = createDebugBundleExporter(
      handle.store,
      passthrough ? devPassthroughRedactionPolicy : redactPayloadsPolicy,
      unavailableDiagnosticsReader,
    );
    const bundle = await exporter.exportDebugBundle(id);
    if (bundle === null) {
      throw notFound("UnknownInstance", `no such run: '${id}'`);
    }
    ctx.sinks.out(JSON.stringify(bundle));
    return EXIT.ok;
  });
}

// ── inject: the actor-emit family's staging tool ─────────────────────

interface InjectStep {
  readonly type: string;
  readonly expectedVersion?: number;
  readonly hasPayload: boolean;
  readonly payload?: unknown;
  readonly actorId: string;
  readonly opId?: string;
}

/** The numeric-domain check with the -0 guard (the ch-4 dimension:
 * Number.isSafeInteger(-0) is true and -0 < 0 is false — JSON.parse
 * CAN produce -0; the ingress rejects it, the dev schemas must too,
 * pre-submit — post-close aftermath finding 1). */
function isNonNegSafeInt(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0 &&
    !Object.is(value, -0)
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value !== "";
}

const INJECT_STEP_KEYS = ["type", "expectedVersion", "payload", "actorId", "opId"];

/** The canonical inject schema (packet ch6-P4b) — validated in FULL
 * before ANY submit (fail-closed staging: no partial injection on a
 * bad file). Derived path (no opId): payload REQUIRED and
 * canonicalizable (deriveActorEmitOpId digests it — the emit-lib
 * contract), expectedVersion REQUIRED (the contextPacketId needs it).
 * Override path (opId present): payload may be absent / null /
 * non-admissible — the ingress answer is the step's outcome row. */
function validateInjectFile(parsed: unknown): InjectStep[] {
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    Array.isArray(parsed) ||
    Object.keys(parsed).some((key) => key !== "steps")
  ) {
    throw usage("InvalidInjectFile", "the inject file must be exactly { \"steps\": [...] }");
  }
  const steps = (parsed as { steps?: unknown }).steps;
  if (!Array.isArray(steps)) {
    throw usage("InvalidInjectFile", "\"steps\" must be an array");
  }
  return steps.map((raw, index) => {
    const label = `steps[${String(index)}]`;
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
      throw usage("InvalidInjectStep", `${label} must be an object`);
    }
    const record = raw as Record<string, unknown>;
    for (const key of Object.keys(record)) {
      if (!INJECT_STEP_KEYS.includes(key)) {
        throw usage("InvalidInjectStep", `${label} has unknown field '${key}'`, {
          allowedFields: INJECT_STEP_KEYS,
        });
      }
    }
    if (typeof record["type"] !== "string" || record["type"] === "") {
      throw usage("InvalidInjectStep", `${label}.type must be a non-empty string`);
    }
    const opId = record["opId"];
    if (opId !== undefined && (typeof opId !== "string" || opId === "")) {
      throw usage("InvalidInjectStep", `${label}.opId must be a non-empty string when present`);
    }
    const expectedVersion = record["expectedVersion"];
    if (expectedVersion !== undefined && !isNonNegSafeInt(expectedVersion)) {
      throw usage(
        "InvalidInjectStep",
        `${label}.expectedVersion must be a nonnegative safe integer JSON number`,
      );
    }
    const actorId = record["actorId"];
    if (actorId !== undefined && (typeof actorId !== "string" || actorId === "")) {
      throw usage("InvalidInjectStep", `${label}.actorId must be a non-empty string when present`);
    }
    const hasPayload = "payload" in record;
    if (opId === undefined) {
      // Derived path: the emit-lib's content-addressed identity NEEDS a
      // digestible payload and the context-packet version.
      if (expectedVersion === undefined) {
        throw usage(
          "InvalidInjectStep",
          `${label}: derived op_id (no opId override) requires expectedVersion`,
        );
      }
      if (!hasPayload || !isCanonicalizable(record["payload"])) {
        throw usage(
          "InvalidInjectStep",
          `${label}: derived op_id requires a present, canonicalizable payload — use an opId override to stage non-admissible inputs`,
        );
      }
    }
    return {
      type: record["type"],
      ...(expectedVersion !== undefined ? { expectedVersion } : {}),
      hasPayload,
      ...(hasPayload ? { payload: record["payload"] } : {}),
      actorId: typeof actorId === "string" ? actorId : "dev-actor",
      ...(opId !== undefined ? { opId } : {}),
    };
  });
}

async function readJsonFile(ctx: VerbContext, flag: string): Promise<unknown> {
  const path = flagString(ctx, flag);
  if (path === undefined || path === "") {
    throw usage("MissingFile", `${`--${flag}`} <path> is required`);
  }
  let text: string;
  try {
    text = await readFile(path, "utf8");
  } catch (error) {
    throw usage(
      "UnreadableFile",
      `cannot read '${path}': ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw usage("InvalidJsonFile", `'${path}' is not valid JSON`);
  }
}

async function verbInject(ctx: VerbContext): Promise<number> {
  const instanceId = flagString(ctx, "instance");
  if (instanceId === undefined || instanceId === "") {
    throw usage("MissingInstance", "--instance <id> is required");
  }
  const steps = validateInjectFile(await readJsonFile(ctx, "file"));
  return withStore(ctx, async (handle) => {
    const kernel = createKernel({
      store: handle.store,
      definitions: builtinDefinitionStore(),
      time: ctx.deps.time,
      digest: deriveEmitDigest,
      diag: noopDiagnosticsSink,
    });
    const ingress = createIngress({ kernel, diag: noopDiagnosticsSink });
    for (const step of steps) {
      const opId =
        step.opId ??
        deriveActorEmitOpId({
          instanceId,
          contextPacketId: `${instanceId}@v${String(step.expectedVersion)}`,
          opType: step.type,
          payload: step.payload,
        }).opId;
      const envelope: Record<string, unknown> = {
        instanceId,
        opId,
        type: step.type,
        actorId: step.actorId,
        ...(step.expectedVersion !== undefined
          ? { expectedVersion: step.expectedVersion }
          : {}),
        ...(step.hasPayload ? { payload: step.payload } : {}),
      };
      // Every outcome — rejections included — is a DATA row: a staging
      // tool's rejection is often the intended state (exit stays 0).
      const outcome = await ingress.submit(envelope);
      ctx.sinks.out(JSON.stringify(outcome));
    }
    return EXIT.ok;
  });
}

// ── replay: hermetic golden-trace diagnostics ────────────────────────

const FIXTURE_KEYS = ["name", "lift", "steps", "finalTranscript", "finalState"];

/**
 * FULL STRUCTURAL validation at the boundary (post-close aftermath
 * finding 2): a fixture whose SHAPE is wrong — keys, kinds, primitive
 * types, tuple forms — is usage 2; a structurally valid fixture whose
 * CONTENT does not hold is the harness's verdict (TraceMismatchError
 * → internal 1). The line is structure vs semantics, and it is drawn
 * HERE, not smeared across the two exit classes.
 */
function fixtureError(message: string, details?: Readonly<Record<string, unknown>>): never {
  throw usage("InvalidFixture", message, details);
}

function assertExactKeys(record: Record<string, unknown>, keys: readonly string[], label: string): void {
  const actual = Object.keys(record).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((k, i) => k !== expected[i])) {
    fixtureError(`${label} must have exactly the fields ${JSON.stringify(expected)}`, {
      got: actual,
    });
  }
}

function validateExpect(raw: unknown, label: string): void {
  if (!isPlainObject(raw)) {
    fixtureError(`${label} must be an outcome object`);
  }
  const kind = raw["kind"];
  switch (kind) {
    case "committed":
      assertExactKeys(raw, ["kind", "version"], label);
      if (!isNonNegSafeInt(raw["version"])) {
        fixtureError(`${label}.version must be a nonnegative safe integer`);
      }
      return;
    case "duplicate":
      assertExactKeys(raw, ["kind"], label);
      return;
    case "stale":
      assertExactKeys(raw, ["kind", "currentVersion"], label);
      if (!isNonNegSafeInt(raw["currentVersion"])) {
        fixtureError(`${label}.currentVersion must be a nonnegative safe integer`);
      }
      return;
    case "rejected":
      assertExactKeys(raw, ["kind", "reason"], label);
      if (!isNonEmptyString(raw["reason"])) {
        fixtureError(`${label}.reason must be a non-empty string`);
      }
      return;
    default:
      fixtureError(`${label}.kind must be committed | duplicate | stale | rejected`);
  }
}

function validateStep(raw: unknown, index: number): void {
  const label = `steps[${String(index)}]`;
  if (!isPlainObject(raw)) {
    fixtureError(`${label} must be an object`);
  }
  if (raw["kind"] === "start") {
    assertExactKeys(raw, ["kind", "instanceId", "task", "expect"], label);
    if (!isNonEmptyString(raw["instanceId"]) || typeof raw["task"] !== "string") {
      fixtureError(`${label} requires instanceId (non-empty string) and task (string)`);
    }
    const expect = raw["expect"];
    if (!isPlainObject(expect)) {
      fixtureError(`${label}.expect must be an object`);
    }
    assertExactKeys(expect, ["currentStep", "version"], `${label}.expect`);
    if (!isNonEmptyString(expect["currentStep"]) || expect["version"] !== 1) {
      fixtureError(`${label}.expect requires currentStep (non-empty string) and version === 1`);
    }
    return;
  }
  if (raw["kind"] === "emit") {
    const allowed = ["kind", "opId", "type", "actorId", "payload", "expectedVersion", "expect"];
    for (const key of Object.keys(raw)) {
      if (!allowed.includes(key)) {
        fixtureError(`${label} has unknown field '${key}'`, { allowedFields: allowed });
      }
    }
    if (
      !isNonEmptyString(raw["opId"]) ||
      !isNonEmptyString(raw["type"]) ||
      !isNonEmptyString(raw["actorId"])
    ) {
      fixtureError(`${label} requires opId, type, actorId (non-empty strings)`);
    }
    if (raw["expectedVersion"] !== undefined && !isNonNegSafeInt(raw["expectedVersion"])) {
      fixtureError(`${label}.expectedVersion must be a nonnegative safe integer`);
    }
    validateExpect(raw["expect"], `${label}.expect`);
    return;
  }
  fixtureError(`${label}.kind must be 'start' or 'emit'`);
}

function validateFixtureShape(parsed: unknown): TraceFixture {
  if (!isPlainObject(parsed)) {
    fixtureError("the fixture file must be a JSON object");
  }
  for (const key of Object.keys(parsed)) {
    if (!FIXTURE_KEYS.includes(key)) {
      fixtureError(`unknown fixture field '${key}'`, { allowedFields: FIXTURE_KEYS });
    }
  }
  if (!isNonEmptyString(parsed["name"])) {
    fixtureError("name must be a non-empty string");
  }
  const lift = parsed["lift"];
  if (lift !== undefined) {
    if (!isPlainObject(lift)) {
      fixtureError("lift must be an object");
    }
    assertExactKeys(lift, ["expectedVersion"], "lift");
    if (lift["expectedVersion"] !== "track-running-version") {
      fixtureError('lift.expectedVersion must be "track-running-version"');
    }
  }
  const steps = parsed["steps"];
  if (!Array.isArray(steps) || steps.length === 0) {
    fixtureError("steps must be a non-empty array");
  }
  steps.forEach((step, index) => {
    validateStep(step, index);
  });
  const finalTranscript = parsed["finalTranscript"];
  if (!Array.isArray(finalTranscript)) {
    fixtureError("finalTranscript must be an array");
  }
  finalTranscript.forEach((row, index) => {
    if (
      !Array.isArray(row) ||
      row.length !== 2 ||
      !isNonNegSafeInt(row[0]) ||
      !isNonEmptyString(row[1])
    ) {
      fixtureError(
        `finalTranscript[${String(index)}] must be a [seq (nonnegative safe integer), opId (non-empty string)] pair`,
      );
    }
  });
  const finalState = parsed["finalState"];
  if (!isPlainObject(finalState)) {
    fixtureError("finalState must be an object");
  }
  assertExactKeys(finalState, ["currentStep", "round", "status", "version"], "finalState");
  if (
    !isNonEmptyString(finalState["currentStep"]) ||
    !isNonNegSafeInt(finalState["round"]) ||
    !isNonEmptyString(finalState["status"]) ||
    !isNonNegSafeInt(finalState["version"])
  ) {
    fixtureError(
      "finalState requires currentStep/status (non-empty strings) and round/version (nonnegative safe integers)",
    );
  }
  return parsed as unknown as TraceFixture;
}

async function verbReplay(ctx: VerbContext): Promise<number> {
  const fixture = validateFixtureShape(await readJsonFile(ctx, "file"));
  // HERMETIC: an ephemeral in-memory store per invocation — replay
  // neither reads nor pollutes a user DB (dev config matrix).
  const handle = ctx.deps.openStore(":memory:", ctx.deps.time);
  try {
    const template = builtinTemplate();
    const kernel = createKernel({
      store: handle.store,
      definitions: builtinDefinitionStore(),
      time: ctx.deps.time,
      digest: deriveEmitDigest,
      diag: noopDiagnosticsSink,
    });
    const ingress = createIngress({ kernel, diag: noopDiagnosticsSink });
    const result = await replayTrace(fixture, {
      submit: (raw) => ingress.submit(raw),
      start: (input) => kernel.startInstance(input),
      store: handle.store,
      template,
    });
    ctx.sinks.out(JSON.stringify(result));
    return EXIT.ok;
  } catch (error) {
    if (error instanceof TraceMismatchError) {
      // The canonical mismatch mapping (packet ch6-P4b): exit 1 with a
      // TYPE-discriminated doc — name + details.{lane, stepIndex,
      // expected, actual}; wiring errors keep their own names.
      throw new CliError("internal", "TraceMismatchError", error.message, {
        lane: error.lane,
        ...(error.stepIndex !== undefined ? { stepIndex: error.stepIndex } : {}),
        expected: error.expected,
        actual: error.actual,
      });
    }
    throw error;
  } finally {
    handle.close();
  }
}

const VERB_OPTIONS: Record<string, VerbOptions> = {
  bundle: { db: { type: "string" }, passthrough: { type: "boolean" } },
  inject: { db: { type: "string" }, instance: { type: "string" }, file: { type: "string" } },
  replay: { file: { type: "string" } },
};

const VERBS: Record<string, VerbHandler> = {
  bundle: verbDevBundle,
  inject: verbInject,
  replay: verbReplay,
};

export async function runDevCli(
  argv: readonly string[],
  deps: CliDeps,
  sinks: { out(line: string): void; err(line: string): void },
): Promise<number> {
  return dispatch(VERBS, VERB_OPTIONS, argv, deps, sinks);
}

// Shipped dev entrypoint (root bridge: `pnpm v3:cli:dev -- <verb> ...`).
const invokedPath = process.argv[1];
if (invokedPath !== undefined && import.meta.url === pathToFileURL(invokedPath).href) {
  process.exitCode = await runDevCli(process.argv.slice(2), productionDeps(), {
    out: (line) => process.stdout.write(`${line}\n`),
    err: (line) => process.stderr.write(`${line}\n`),
  });
}
