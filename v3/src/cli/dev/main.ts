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
    const exporter = createDebugBundleExporter(
      handle.store,
      passthrough ? devPassthroughRedactionPolicy : redactPayloadsPolicy,
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
    if (
      expectedVersion !== undefined &&
      (typeof expectedVersion !== "number" ||
        !Number.isSafeInteger(expectedVersion) ||
        expectedVersion < 0)
    ) {
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
    });
    const ingress = createIngress(kernel);
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

function validateFixtureShape(parsed: unknown): TraceFixture {
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw usage("InvalidFixture", "the fixture file must be a JSON object");
  }
  const record = parsed as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (!FIXTURE_KEYS.includes(key)) {
      throw usage("InvalidFixture", `unknown fixture field '${key}'`, {
        allowedFields: FIXTURE_KEYS,
      });
    }
  }
  if (
    typeof record["name"] !== "string" ||
    !Array.isArray(record["steps"]) ||
    record["steps"].length === 0 ||
    !Array.isArray(record["finalTranscript"]) ||
    typeof record["finalState"] !== "object" ||
    record["finalState"] === null
  ) {
    throw usage(
      "InvalidFixture",
      "a fixture requires: name (string), steps (non-empty array), finalTranscript (array), finalState (object)",
    );
  }
  // Structural gate at the boundary; the harness itself fails closed on
  // anything deeper (lift-less versions, emit-before-start, ...).
  return parsed as TraceFixture;
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
    });
    const ingress = createIngress(kernel);
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
