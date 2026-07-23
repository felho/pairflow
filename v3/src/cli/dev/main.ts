import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

import type { KernelStatus, TerminalDisposition } from "../../domain/index.js";
import { deriveActorEmitOpId, deriveEmitDigest, isCanonicalizable } from "../../emit/index.js";
import { createDebugBundleExporter, redactPayloadsPolicy } from "../../floor/index.js";
import { createIngress } from "../../ingress/index.js";
import { createKernel } from "../../kernel/index.js";
import {
  admitTemplate,
  createFileDefinitionStore,
  loadTemplate,
  TemplateLoadError,
} from "../../definition/index.js";
import { createGateRegistry } from "../../gates/index.js";
import { createStaticProviderRegistry } from "../../ports/index.js";
import type { TraceFixture } from "../../testkit/index.js";
import {
  createScriptedRuntimeContextProvider,
  devPassthroughRedactionPolicy,
  fixtureDefinitionStore,
  fixtureTemplate,
  replayTrace,
  TraceMismatchError,
} from "../../testkit/index.js";
import type { VerbContext, VerbHandler, VerbOptions } from "../common.js";
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
  withDiagStore,
  withStoreAndDiag,
} from "../common.js";
import { CliError, EXIT } from "../contract.js";
import {
  createFailClosedProcessGateRunner,
  deriveProcessEvidenceDbPath,
} from "../failClosedProcessGateRunner.js";
import type { CliDeps } from "../runtime.js";
import { productionDeps } from "../runtime.js";
import { DiagUnavailableError, noopDiagnosticsSink } from "../../diag/index.js";

/**
 * The DEV entrypoint (plan §6.5, packet ch6-P4b; ADR-009 dev CLI
 * boundary): the ONE graph that may import the testkit. Verbs:
 * bundle [--passthrough] · inject · replay · validate (one file
 * through the load pipeline — packet ch8-P2) · diag (the global
 * cursor dump — packet ch7-P4). Shares the dispatch shell, the channel rule,
 * and the error-doc contract with the normal CLI (cli/common.ts) —
 * the contracts cannot fork.
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
  return withStoreAndDiag(ctx, async (handle, diag) => {
    // The store-backed reader on the derived path (ch7-P4, V4) — the
    // ch7-P3 interim reader retired with this wiring.
    const exporter = createDebugBundleExporter(
      handle.store,
      passthrough ? devPassthroughRedactionPolicy : redactPayloadsPolicy,
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

// ── inject: the actor-emit family's staging tool ─────────────────────

interface InjectStep {
  readonly type: string;
  readonly expectedVersion?: number;
  /** Optional role claim (ch11-P1 X1/X3): absence stages a missing_role probe. */
  readonly expectedRole?: string;
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

const INJECT_STEP_KEYS = ["type", "expectedVersion", "expectedRole", "payload", "actorId", "opId"];

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
    const expectedRole = record["expectedRole"];
    if (expectedRole !== undefined && (typeof expectedRole !== "string" || expectedRole === "")) {
      throw usage(
        "InvalidInjectStep",
        `${label}.expectedRole must be a non-empty string when present`,
      );
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
      ...(expectedRole !== undefined ? { expectedRole } : {}),
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
  // ONE catalog value per composition root (ch11-P2b, T1): the same
  // registry feeds the definition store and the kernel.
  const gates = createGateRegistry();
  const definitions = createFileDefinitionStore(
    resolveTemplatesDir(flagString(ctx, "templates-dir"), ctx.deps),
    gates,
  );
  // W4 (packet ch8-P2): inject first touches the template INSIDE
  // kernel.handle — the typed error surfaces at the ingress.submit
  // await below; the type-based outer catch maps it there.
  try {
  return await withStoreAndDiag(ctx, async (handle, diag) => {
    // W2 (ch11-P3b): the fail-closed process-gate runner on the derived-path
    // evidence sibling — never spawns, never allows.
    const processRunner = createFailClosedProcessGateRunner(
      deriveProcessEvidenceDbPath(resolveDbPath(flagString(ctx, "db"), ctx.deps)),
    );
    try {
      // V5 (ch7-P4): the store-backed sink on the derived path, BARE
      // (REV-DIAG-FAILOPEN) — inject stages through the real channel.
      const kernel = createKernel({
        store: handle.store,
        definitions,
        time: ctx.deps.time,
        digest: deriveEmitDigest,
        diag: diag.sink,
        gates,
        processRunner,
        // inject stages actor emits only (never START) — the registry is
        // unused here; the EMPTY registry keeps the wiring honest.
        providerRegistry: createStaticProviderRegistry({}),
      });
      const ingress = createIngress({ kernel, diag: diag.sink });
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
          ...(step.expectedRole !== undefined ? { expectedRole: step.expectedRole } : {}),
          ...(step.hasPayload ? { payload: step.payload } : {}),
        };
        // Every outcome — rejections included — is a DATA row: a staging
        // tool's rejection is often the intended state (exit stays 0).
        const outcome = await ingress.submit(envelope);
        ctx.sinks.out(JSON.stringify(outcome));
      }
      return EXIT.ok;
    } finally {
      processRunner.close();
    }
  });
  } catch (error) {
    throw toTemplateInvalid(error);
  }
}

// ── replay: hermetic golden-trace diagnostics ────────────────────────

const FIXTURE_KEYS = ["name", "lift", "steps", "finalTranscript", "finalState"];

// W2 + build-close aftermath (packet ch12-p1a): the finalState axis
// fields are validated against the EXACT l0d token sets — an
// out-of-union token is a structural (usage 2) defect drawn HERE, like
// every other shape rule; a nonempty string is NOT enough. The arrays
// are typed against the domain unions so a union edit that misses this
// list is a compile error (the sqliteStore token-domain culture).
const FINAL_STATE_KERNEL_STATUS_TOKENS: readonly KernelStatus[] = [
  "CREATED",
  "ACTIVE",
  "WAITING",
  "TERMINAL",
];
const FINAL_STATE_TERMINAL_DISPOSITION_TOKENS: readonly TerminalDisposition[] = [
  "done",
  "failed",
  "cancelled",
];

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
    // W3 (packet ch12-p1b): the start step follows the harness contract
    // re-base — the START intent's opId joins the keyset, and the expected
    // version is 2 (genesis v1 + the activation commit). W4 (packet ch12-p3):
    // the interim `runtimeContextRef` window key RETIRED with the harness
    // seam — the provider machinery resolves the requirement kernel-side.
    const allowedStart = ["kind", "instanceId", "opId", "task", "expect"];
    for (const key of Object.keys(raw)) {
      if (!allowedStart.includes(key)) {
        fixtureError(`${label} has unknown field '${key}'`, { allowedFields: allowedStart });
      }
    }
    if (
      !isNonEmptyString(raw["instanceId"]) ||
      !isNonEmptyString(raw["opId"]) ||
      typeof raw["task"] !== "string"
    ) {
      fixtureError(
        `${label} requires instanceId and opId (non-empty strings) and task (string)`,
      );
    }
    const expect = raw["expect"];
    if (!isPlainObject(expect)) {
      fixtureError(`${label}.expect must be an object`);
    }
    assertExactKeys(expect, ["currentStep", "version"], `${label}.expect`);
    if (!isNonEmptyString(expect["currentStep"]) || expect["version"] !== 2) {
      fixtureError(`${label}.expect requires currentStep (non-empty string) and version === 2`);
    }
    return;
  }
  if (raw["kind"] === "emit") {
    // ch11-P1 X5: expectedRole joins the emit-step keyset — the
    // hand-rolled schema does not type-ripple (the parse-tail cast),
    // so the extension is explicit packet contract.
    const allowed = [
      "kind",
      "opId",
      "type",
      "actorId",
      "payload",
      "expectedVersion",
      "expectedRole",
      "expect",
    ];
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
    if (raw["expectedRole"] !== undefined && !isNonEmptyString(raw["expectedRole"])) {
      fixtureError(`${label}.expectedRole must be a non-empty string when present`);
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
    // ch11-P1 X5: the lift keyset gains the role axis (T2 mirrored).
    const liftKeys = Object.keys(lift);
    const allowedLiftKeys = ["expectedVersion", "expectedRole"];
    for (const key of liftKeys) {
      if (!allowedLiftKeys.includes(key)) {
        fixtureError(`lift has unknown field '${key}'`, { allowedFields: allowedLiftKeys });
      }
    }
    if (liftKeys.length === 0) {
      fixtureError("lift must declare at least one axis");
    }
    if (lift["expectedVersion"] !== undefined && lift["expectedVersion"] !== "track-running-version") {
      fixtureError('lift.expectedVersion must be "track-running-version"');
    }
    if (lift["expectedRole"] !== undefined && lift["expectedRole"] !== "supply-current-step-role") {
      fixtureError('lift.expectedRole must be "supply-current-step-role"');
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
  // W2 (packet ch12-p1a): the exact keyset follows the harness's
  // finalState shape — the ch-4 `status` key re-based onto the axis
  // pair; terminalDisposition is a token OR null (the non-terminal
  // final states). No verb/flag/handler semantics change.
  assertExactKeys(
    finalState,
    ["currentStep", "round", "kernelStatus", "terminalDisposition", "version"],
    "finalState",
  );
  if (
    !isNonEmptyString(finalState["currentStep"]) ||
    !isNonNegSafeInt(finalState["round"]) ||
    !isNonEmptyString(finalState["kernelStatus"]) ||
    !(
      finalState["terminalDisposition"] === null ||
      isNonEmptyString(finalState["terminalDisposition"])
    ) ||
    !isNonNegSafeInt(finalState["version"])
  ) {
    fixtureError(
      "finalState requires currentStep/kernelStatus (non-empty strings), terminalDisposition (non-empty string or null), and round/version (nonnegative safe integers)",
    );
  }
  if (
    !(FINAL_STATE_KERNEL_STATUS_TOKENS as readonly string[]).includes(finalState["kernelStatus"])
  ) {
    fixtureError("finalState.kernelStatus must be CREATED | ACTIVE | WAITING | TERMINAL", {
      got: finalState["kernelStatus"],
    });
  }
  if (
    finalState["terminalDisposition"] !== null &&
    !(FINAL_STATE_TERMINAL_DISPOSITION_TOKENS as readonly string[]).includes(
      finalState["terminalDisposition"],
    )
  ) {
    fixtureError("finalState.terminalDisposition must be done | failed | cancelled | null", {
      got: finalState["terminalDisposition"],
    });
  }
  return parsed as unknown as TraceFixture;
}

async function verbReplay(ctx: VerbContext): Promise<number> {
  const fixture = validateFixtureShape(await readJsonFile(ctx, "file"));
  // HERMETIC: an ephemeral in-memory store per invocation — replay
  // neither reads nor pollutes a user DB (dev config matrix).
  const handle = ctx.deps.openStore(":memory:", ctx.deps.time);
  // W2 (ch11-P3b): the fail-closed runner on an IN-MEMORY evidence substrate
  // (the hermetic fixture carries no gates, so it is never invoked here).
  const processRunner = createFailClosedProcessGateRunner(":memory:");
  try {
    // C37 (packet ch8-P2, M4): the builtin retired — replay repoints to
    // the testkit fixture (itself equality-pinned to the canonical
    // file) and stays OUTSIDE the templates-dir lane (hermetic).
    const template = fixtureTemplate();
    // ONE catalog value per composition root (ch11-P2b, T1): the same
    // registry admits the fixture AND arms the kernel rung. The fixture
    // carries no gates, so admission is vacuous — it never fails here.
    const gates = createGateRegistry();
    const admitted = admitTemplate(template, gates);
    if (!admitted.ok) {
      throw new Error("dev replay: the canonical fixture failed admission (unreachable)");
    }
    // W4/C19 (packet ch12-p3): the dev `replay` root gains the SCRIPTED
    // provider registry — dev `replay` is where the provisioned path is
    // drivable pre-ch9 (the hermetic fixture is context-free, so the provider
    // is never invoked here; the wiring makes the provisioned path reachable).
    const scriptedProvider = createScriptedRuntimeContextProvider();
    const kernel = createKernel({
      store: handle.store,
      definitions: fixtureDefinitionStore(admitted.template),
      time: ctx.deps.time,
      digest: deriveEmitDigest,
      diag: noopDiagnosticsSink,
      gates,
      processRunner,
      providerRegistry: createStaticProviderRegistry({ "pairflow.worktree": scriptedProvider }),
    });
    scriptedProvider.bindCompletionSink((i, r, completion) =>
      kernel.deliverCompletion(i, r, completion),
    );
    const ingress = createIngress({ kernel, diag: noopDiagnosticsSink });
    const result = await replayTrace(fixture, {
      submit: (raw) => ingress.submit(raw),
      // W2/W3 (packet ch12-p1b): the dev entrypoint's one-shot call site
      // rewired to the lifecycle composition seams.
      create: (input) => kernel.create(input),
      start: (input) => kernel.start(input),
      store: handle.store,
      // ch11-P2c T1: the seam narrowed to AdmittedTemplate — hand it the
      // admitted value already computed above (the checker reads the flags).
      template: admitted.template,
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
    processRunner.close();
    handle.close();
  }
}

// ── validate: one file through the load pipeline (packet ch8-P2, D) ──

/**
 * dev `validate <path>` (draft C31; packet ch8-P2 D1–D5): exactly one
 * file through the full P1 load pipeline. Takes ONLY the positional —
 * no --db, no --templates-dir (strict parse rejects flags). The OS
 * read is a PRE-PIPELINE input gate (usage 2 — a path is operator
 * input; the readJsonFile input-error CLASS, cited for the class
 * only): raw BYTES feed loadTemplate so the strict-decode read stage
 * can fire — never a lossy utf8 pre-decode. Content-invalid at any
 * stage → exit 1, the ONE TemplateInvalid doc, details = the
 * {stage, findings} machine shape (the checker verb's semantic
 * verdict — the P4b TraceMismatchError precedent).
 */
async function verbValidate(ctx: VerbContext): Promise<number> {
  // D1: EXACTLY one positional — a silently ignored extra positional
  // would blur "exactly one file" (arm gate 2, aftermath finding 1).
  if (ctx.positionals.length > 1) {
    throw usage(
      "InvalidArguments",
      "validate takes exactly one <path> positional argument",
    );
  }
  const path = ctx.positionals[0];
  if (path === undefined || path === "") {
    throw usage("MissingFile", "a <path> positional argument is required");
  }
  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await readFile(path));
  } catch (error) {
    throw usage(
      "UnreadableFile",
      `cannot read '${path}': ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  const result = loadTemplate(bytes, { path, catalog: createGateRegistry() });
  if (!result.ok) {
    // Lift the result info into the canonical carrier so the doc is
    // byte-identical in shape to the W-lane surfacing (C31: "the SAME
    // TemplateInvalid error doc").
    throw toTemplateInvalid(new TemplateLoadError(result.error));
  }
  ctx.sinks.out(JSON.stringify({ valid: true, ref: result.template.ref }));
  return EXIT.ok;
}

// ── diag: the global cursor dump (packet ch7-P4, V3/F3/F4) ───────────

/**
 * The ONLY surface for unattributed rows (plan §7.5). A bounded
 * one-shot read → ONE JSON array of FULL read-face events
 * (`error.message` included — a LOCAL surface, §7.4). Fail-LOUD (M2):
 * an unavailable/corrupt diag store is one stderr doc at exit 1, never
 * a silent `[]`; known-empty IS `[]` (M9). The MAIN store is never
 * opened (F4) — the path derivation is textual.
 */
async function verbDiag(ctx: VerbContext): Promise<number> {
  const after = parseNonNegativeSafeInt(flagString(ctx, "after") ?? "0", "--after");
  return withDiagStore(ctx, async (diag) => {
    try {
      const rows = await diag.reader.getGlobalDiagnostics(after);
      ctx.sinks.out(JSON.stringify(rows));
      return EXIT.ok;
    } catch (error) {
      if (error instanceof DiagUnavailableError) {
        // M2: fail-LOUD with the enumerated token in details (§7.3).
        throw new CliError("internal", "DiagUnavailableError", error.message, {
          reason: error.reason,
        });
      }
      throw error;
    }
  });
}

const VERB_OPTIONS: Record<string, VerbOptions> = {
  bundle: { db: { type: "string" }, passthrough: { type: "boolean" } },
  inject: {
    db: { type: "string" },
    instance: { type: "string" },
    file: { type: "string" },
    "templates-dir": { type: "string" },
  },
  replay: { file: { type: "string" } },
  // D1: validate takes ONLY the <path> positional — zero flags; the
  // strict parse rejects --db/--templates-dir as usage.
  validate: {},
  diag: { db: { type: "string" }, after: { type: "string" } },
};

const VERBS: Record<string, VerbHandler> = {
  bundle: verbDevBundle,
  inject: verbInject,
  replay: verbReplay,
  validate: verbValidate,
  diag: verbDiag,
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
