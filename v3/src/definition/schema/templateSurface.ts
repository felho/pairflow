import type { GateCatalog } from "../../ports/index.js";
import type { ValidationFinding } from "../errors.js";
import type { DeclCursor, DeclStep, EngineChannel } from "./engine.js";
import { derefNode, descend, runSurface, sourceLadderFinding } from "./engine.js";
import { normalize } from "./normalizer.js";
import { templateFormat } from "./templateFormat.js";
import type { NodeDecl, SurfaceDecl } from "./vocabulary.js";

/**
 * The template surface, composed: ONE engine run over the declaration on
 * whichever channel the caller is on, plus the AUDITED RESIDUAL — the
 * lanes that ADR-019 D1 leaves to prose/code — wired into the SAME finding
 * pipeline so the output is one uniform stream.
 *
 * The residual realized here, by audit family:
 *
 * - **R3** the existential cross-rule over resolved registrations
 *   (ch11-C19 → ch12-C5): "IF any binding resolves to a registration whose
 *   `requiresRuntimeContext` is true THEN `$.runtimeContext` must be a
 *   spec map" is a conditional over a DERIVED property of an injected
 *   object; a `when:` general enough to express it is an expression
 *   language.
 * - **R2** the unreferenced-entry hygiene audit (ch13v2-C9): a
 *   template-wide set comparison whose reference set is the RAW authored
 *   document and whose stand-down reads which declared lanes failed —
 *   neither expressible as a rule ON a node, since the audit belongs to
 *   no single position. Its trigger set is DERIVED from the declaration,
 *   never listed here.
 * - **R8** the uses-scoped SOURCE ladder on two gate-config integers
 *   (ch11-C12's source half). Its declaration exists — `[vc-authored-int]`
 *   — but realizing it inside the engine requires the `delegate` hand-off
 *   to carry the CHANNEL into the registration, which is a change to the
 *   ratified `GateRegistration` port shape: out of ADR-019 D2's scope and
 *   exactly the "while we are here" D6 forbids. The audit's amendment
 *   reclassified this row out of R7 — it is BOUNDARY-kept, not
 *   construct-blocked — and R7 returned to resolved-empty with it.
 * - **R7** the ch14 STEP-CLASS lanes (ch14-C2's expressibility ruling):
 *   the three closed per-class keysets with their presence
 *   re-imposition, the `decisions` floor, the kernel-owned wait-kind
 *   reservation, the two two-hop `recommends` rules, and the re-homed
 *   role-set equality (ch14-C7(a)). Each would need a construct serving
 *   ONE declaration position — a field-discriminated union, a constant-set
 *   selector, a value-to-node dereference — which ADR-019 D7's
 *   ≥2-position test refuses. This is R7's first live member since the
 *   family was declared resolved-empty; it was kept open for exactly this.
 *
 * Not here, and deliberately: **R5** (the store's declared-ref/filename
 * check) stays the store stage's, and **R6** is library-owned wording.
 */

export interface SurfaceOutcome {
  readonly findings: readonly ValidationFinding[];
  /** The admitted VALUE, unbranded: ch11-P2a A6 keeps `admitTemplate` the
   * ONLY sanctioned producer of the `AdmittedTemplate` brand, and that
   * guard is lint-enforced. The engine computes the value; admission
   * brands it. */
  readonly admitted?: unknown;
}

const RUNTIME_CONTEXT_CODE = "runtime_context_required_for_process_gate";

/** R8: the two uses-scoped integer fields whose SOURCE form is laddered by
 * the walk. The scoping is SYNTACTIC — the authored `uses` string, no
 * catalog resolution — exactly as the measured lane does it. */
const SOURCE_SCOPED_CONFIG_FIELDS: Readonly<Record<string, readonly string[]>> = {
  "declarative.threshold": ["value"],
  "external.process": ["timeoutMs"],
};

function isContainer(value: unknown): value is ReadonlyMap<unknown, unknown> | Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function entriesOf(
  value: ReadonlyMap<unknown, unknown> | Record<string, unknown>,
): readonly (readonly [unknown, unknown])[] {
  if (value instanceof Map) return [...value.entries()];
  return Object.keys(value).map((key) => [key, (value as Record<string, unknown>)[key]] as const);
}

function get(value: unknown, key: string): unknown {
  if (!isContainer(value)) return undefined;
  if (value instanceof Map) return value.get(key);
  return Object.prototype.hasOwnProperty.call(value, key) ? (value as Record<string, unknown>)[key] : undefined;
}

/** R8's walk: `steps.<id>.gates.<event>[<i>].config.<field>` for the two
 * scoped fields, on the file channel only (no source, no lane). */
function sourceScopedFindings(value: unknown, channel: EngineChannel): ValidationFinding[] {
  if (channel.kind !== "file") return [];
  const findings: ValidationFinding[] = [];
  const steps = get(value, "steps");
  if (!isContainer(steps)) return findings;
  for (const [stepId, step] of entriesOf(steps)) {
    if (typeof stepId !== "string" || !isContainer(step)) continue;
    const gates = get(step, "gates");
    if (!isContainer(gates)) continue;
    for (const [eventType, pipeline] of entriesOf(gates)) {
      if (typeof eventType !== "string" || !Array.isArray(pipeline)) continue;
      pipeline.forEach((binding: unknown, index: number) => {
        if (!isContainer(binding)) return;
        const uses = get(binding, "uses");
        const config = get(binding, "config");
        if (typeof uses !== "string" || !isContainer(config)) return;
        for (const field of SOURCE_SCOPED_CONFIG_FIELDS[uses] ?? []) {
          if (get(config, field) === undefined) continue;
          // The AST address is built from SEGMENTS, never parsed back out
          // of the rendered path: an authored step id may itself contain
          // `[0]` or a dot, and re-parsing one addresses a different node
          // or none at all (B1 F3 — a forbidden source form got through).
          const segments = ["steps", stepId, "gates", eventType, index, "config", field];
          const path = `steps.${stepId}.gates.${eventType}[${String(index)}].config.${field}`;
          const node: unknown = channel.doc.getIn(segments, true);
          const message = sourceLadderFinding(node, channel.source, path);
          if (message !== undefined) findings.push({ path, message });
        }
      });
    }
  }
  return findings;
}

// ── R2 (ch13v2-C9): the unreferenced-entry hygiene lane ────────────────
//
// A catalog entry no ref names is a finding at the entry's path, carrying
// NO issue code (C18's exclusivity). Three things decide what it reads,
// and each is C9's carried decision rather than this module's choice:
// what counts as REFERENCED (every raw member string authored in any ref
// list whose container held — a defective mention still names its
// target), what gets AUDITED (each key the catalog itself enumerates,
// unconditionally), and when the check STANDS DOWN (template-wide,
// whenever any lane that makes a ref list unreachable fired).
//
// Both sets read the RAW AUTHORED document. Reading the normalized value
// instead would silently narrow the audited half — the engine writes an
// entry into the normalized catalog only where the key is a string — and
// lose a mention sitting inside an enclosure the walk skipped, which is
// the FALSE ACCUSATION this lane exists not to make.

const CATALOG_KEY = "contextBlocks";

/** One declared REF-LIST position: the value path that reaches it, and
 * the declared tags on the containment path from the root to it. */
interface RefListPosition {
  readonly path: readonly PathStep[];
  readonly tags: readonly string[];
}

type PathStep = { readonly kind: "field"; readonly name: string } | { readonly kind: "entry" } | { readonly kind: "member" };

/** A ref list is a position whose members must resolve against the
 * catalog — the entry belt itself, not a name this module recognizes. */
function isCatalogRefList(node: NodeDecl): boolean {
  if (node.kind !== "list") return false;
  const target = node.memberOf?.target;
  return target !== undefined && "validKeysOf" in target && target.validKeysOf === `$.${CATALOG_KEY}`;
}

/**
 * DERIVE the ref-list positions from the declaration. A hand list of tags
 * cannot stay true across an engine it does not control: a node inserted
 * into the containment path would silently leave the stand-down blind.
 *
 * The tag collected at each hop is the REFERRING node's, never the value
 * class's — the engine marks the tag of the node it EVALUATES, and a
 * value-class target is reached by a dispatch that bypasses that marking,
 * so a set naming value-class tags would never match a recorded failure.
 * The ROOT's own tag is deliberately never collected: a failed root
 * container yields no admitted value at all, so it can never be marked.
 */
function refListPositions(surface: SurfaceDecl): readonly RefListPosition[] {
  const found: RefListPosition[] = [];
  const visit = (node: NodeDecl, path: readonly PathStep[], tags: readonly string[]): void => {
    const target = derefNode(surface, node);
    if (target === undefined) return;
    if (isCatalogRefList(target)) {
      found.push({ path, tags });
      return;
    }
    if (target.kind === "map.fixed" || target.kind === "map.plain") {
      for (const [name, field] of Object.entries(target.fields ?? {})) {
        visit(field, [...path, { kind: "field", name }], [...tags, field.tag]);
      }
      return;
    }
    if (target.kind === "map.open") {
      visit(target.entry, [...path, { kind: "entry" }], [...tags, target.entry.tag]);
      return;
    }
    if (target.kind === "list") {
      visit(target.member, [...path, { kind: "member" }], [...tags, target.member.tag]);
    }
  };
  visit(surface.root, [], []);
  return found;
}

const REF_LIST_POSITIONS = refListPositions(templateFormat);

/** C9's stand-down operand: every declared tag whose failure makes SOME
 * ref list unreachable. */
const UNREACHABILITY_TAGS: ReadonlySet<string> = new Set(
  REF_LIST_POSITIONS.flatMap((position) => position.tags),
);

/** Every value a declared position reaches, over EITHER channel's
 * container forms. */
function reachRaw(value: unknown, path: readonly PathStep[]): readonly unknown[] {
  let reached: readonly unknown[] = [value];
  for (const step of path) {
    const next: unknown[] = [];
    for (const node of reached) {
      if (step.kind === "member") {
        if (Array.isArray(node)) next.push(...(node as readonly unknown[]));
        continue;
      }
      if (!isContainer(node)) continue;
      if (step.kind === "entry") {
        for (const [, child] of entriesOf(node)) next.push(child);
        continue;
      }
      const child = get(node, step.name);
      if (child !== undefined) next.push(child);
    }
    reached = next;
  }
  return reached;
}

function unreferencedEntryFindings(value: unknown, failedTags: readonly string[]): ValidationFinding[] {
  // The stand-down, template-wide: the audited set is one union over every
  // ref list, and auditing a partial union accuses entries whose only
  // mentions sit inside the broken position.
  if (failedTags.some((tag) => UNREACHABILITY_TAGS.has(tag))) return [];
  const catalog = get(value, CATALOG_KEY);
  if (!isContainer(catalog)) return [];

  const referenced = new Set<string>();
  for (const position of REF_LIST_POSITIONS) {
    for (const list of reachRaw(value, position.path)) {
      // A list whose own container lane failed contributes no mention;
      // every member of one that held does, grammar-failing and repeated
      // members included — a defective mention still names its target.
      if (!Array.isArray(list)) continue;
      for (const member of list as readonly unknown[]) {
        if (typeof member === "string") referenced.add(member);
      }
    }
  }

  const findings: ValidationFinding[] = [];
  for (const [key] of entriesOf(catalog)) {
    if (typeof key === "string" && referenced.has(key)) continue;
    // A non-string key is audited like any other (no key earns an
    // exemption from the shape of its value) and reports at the catalog's
    // own path, which is the nearest address it has.
    const path = typeof key === "string" ? `${CATALOG_KEY}.${key}` : CATALOG_KEY;
    findings.push({
      path,
      message: `context block ${JSON.stringify(key) ?? String(key)} is declared but no ref names it`,
    });
  }
  return findings;
}

// ── R7 (ch14-C2/C3/C4/C6/C7): the STEP-CLASS lanes ─────────────────────
//
// The declared step node holds the UNION of the three classes' fields, so
// the declaration alone admits `decisions` on an agent step and `role` on
// a wait step. The partition lives HERE and nowhere else, and so do the
// four other rules the vocabulary cannot say: the ≥1-decision floor (a
// declared `nonempty` would express the count but carries no code grain,
// and the floor must carry `decision_gate_empty`), the kernel-owned
// wait-kind reservation (no selector reads a constant set), the two
// two-hop `recommends` dereferences (no selector resolves a value to a
// NODE and then reads a field on it), and the re-homed role-set equality.
//
// COMPOSITION, the rule that keeps them honest: these lanes run AFTER
// every declared one and may only ADD findings, never retract one. So a
// class-refused key that ALSO fails its own declared value lane draws
// BOTH findings — two findings for one authored mistake, by construction.

const STEP_CLASS_CODES = {
  gateConfig: "invalid_decision_gate_config",
  gateEmpty: "decision_gate_empty",
  onNonGate: "recommends_on_non_gate",
  unknownDecision: "recommends_unknown_decision",
} as const;

/**
 * ch14-C3's PARAMETRIC reservation of ch12-C23's kernel-owned wait-kind
 * set — AUTHORED from that row, never derived from the runtime's
 * wait-reason union, which carries one member at this basis and would
 * silently under-reserve three kinds while the lane passed green. A later
 * kernel kind extends this constant in its own chapter, with its own
 * migration sweep.
 */
const KERNEL_WAIT_KINDS: readonly string[] = ["kickoff_pending", "human_decision", "child_workflow", "timeout"];

/** One step class: the keys it OWNS, split by whether they are demanded. */
interface StepClassDecl {
  readonly required: readonly string[];
  readonly optional: readonly string[];
}

/**
 * ch14-C2/C3's three CLOSED keysets, keyed by the STORED class token (the
 * `[d-step-type]` enum's `store` half; the agent class has no token and is
 * keyed by its absence). This is the packet's primary deliverable and the
 * one place it is spelled.
 */
const STEP_CLASSES: Readonly<Record<string, StepClassDecl>> = {
  agent: { required: ["role", "instruction", "transitions"], optional: ["agentConfig", "gates", "recommends"] },
  human_gate: { required: ["type", "role", "instruction", "decisions"], optional: [] },
  wait: { required: ["type", "wait", "onResume"], optional: [] },
};

/** Only ONE presence lane of the three classes carries a code (ch14-C8's
 * table): a `humanGate` with no `decisions`. */
const PRESENCE_CODES: Readonly<Record<string, string>> = {
  "human_gate.decisions": STEP_CLASS_CODES.gateConfig,
};

/** The declaration is the authority on which positions exist; a shape
 * this module expects and the declaration does not have is an integrity
 * fault at module load, never a lane that quietly does nothing. */
function positionOrThrow(from: DeclCursor, step: DeclStep): DeclCursor {
  const at = descend(templateFormat, from, step);
  if (at === undefined) {
    throw new Error(
      `declaration integrity: the template surface declares no ${JSON.stringify(step)} at ${from.decl} — ` +
        `the ch14 step-class lanes read that position`,
    );
  }
  return at;
}

const STEP_AT = positionOrThrow(
  positionOrThrow({ node: templateFormat.root, decl: "$" }, { kind: "field", name: "steps" }),
  { kind: "entry" },
);

function stepFields(): Readonly<Record<string, NodeDecl>> {
  const node = derefNode(templateFormat, STEP_AT.node);
  if (node?.kind !== "map.fixed") {
    throw new Error("declaration integrity: the step node is not a fixed map — the class keysets bind its keyset");
  }
  return node.fields;
}

/** Every AUTHORABLE step key — the class lanes' whole domain. The
 * admission-PRODUCED channel-direct positions (`advancesRound`, the
 * ch13v2 ref list) are producer-owned and outside every class keyset by
 * the standing rule, so a re-admitted admitted value recomputes rather
 * than being refused. Derived, so a later produced field joins the
 * carve-out without an edit here. */
const AUTHORABLE_STEP_KEYS: readonly string[] = Object.entries(stepFields())
  .filter(([, field]) => field.channel !== "direct")
  .map(([name]) => name);

/**
 * The id grammar the `recommends` VALUE cites, read off the declaration
 * rather than restated — the two must not fork.
 *
 * A hand lane owes the DECLARED engine's suppression discipline (ch14-C8's
 * container rule read whole): `evalString` returns before its membership
 * lane when the grammar fails, so a grammar-invalid recommends value must
 * draw its grammar finding ALONE. Without this the lane accumulates where
 * the engine suppresses, which is the exact defect a hand lane written as
 * a straight walk ships.
 */
const RECOMMENDS_VALUE_GRAMMAR: RegExp | undefined = (() => {
  const entry = descend(templateFormat, positionOrThrow(STEP_AT, { kind: "field", name: "recommends" }), {
    kind: "entry",
  });
  const node = entry === undefined ? undefined : derefNode(templateFormat, entry.node);
  const source = node?.kind === "string" ? node.grammar?.re : undefined;
  return source === undefined ? undefined : new RegExp(source, "u");
})();

/** authored token → stored class token, per channel, read off the
 * `[d-step-type]` enum so the hand lanes cannot fork from the enum lane. */
function classTokens(channel: EngineChannel): ReadonlyMap<unknown, string> {
  const node = stepFields()["type"];
  if (node?.kind !== "enum") {
    throw new Error("declaration integrity: the step-class discriminator is not an enum");
  }
  const tokens = new Map<unknown, string>();
  for (const member of node.members) {
    if (member.channel !== undefined && member.channel !== "both" && member.channel !== channel.kind) continue;
    tokens.set(member.value, String(member.store ?? member.value));
  }
  return tokens;
}

/** The AUTHORED spelling of a class on this channel — what a message
 * naming the class must say to the author who wrote it. On the file
 * channel a `humanGate` step is called `humanGate`; on the direct one it
 * is `human_gate`, because that is what the caller wrote. */
function classLabel(stored: string, tokens: ReadonlyMap<unknown, string>): string {
  if (stored === "agent") return "agent";
  for (const [authored, target] of tokens) {
    if (target === stored && typeof authored === "string") return authored;
  }
  return stored;
}

/** English, so a finding reads as a sentence rather than as a template. */
function article(label: string): string {
  return "aeiou".includes(label[0]?.toLowerCase() ?? "") ? "an" : "a";
}

/** The class a step declares, or `undefined` where the discriminator
 * itself is unusable. The gate is computed PER STEP from that step's own
 * `type` — never from the engine's template-wide failed-tag set, which
 * would stand every OTHER step's class lanes down behind one typo. */
function stepClassOf(step: unknown, tokens: ReadonlyMap<unknown, string>): string | undefined {
  const container = isContainer(step) ? step : undefined;
  if (container === undefined) return undefined;
  const declared = get(container, "type");
  const present =
    container instanceof Map ? container.has("type") : Object.prototype.hasOwnProperty.call(container, "type");
  if (!present) return "agent";
  return tokens.get(declared);
}

/** ch14-C6's two-hop rules, both of which STAND DOWN where their own
 * operand is absent: a `recommends` map on a class that refuses it, or an
 * agent step with no `transitions`. The class refusal or the missing-key
 * finding is the honest one, and a second finding at a remote path would
 * mis-address the author. */
function recommendsFindings(
  stepId: string,
  step: ReadonlyMap<unknown, unknown> | Record<string, unknown>,
  steps: ReadonlyMap<unknown, unknown> | Record<string, unknown>,
  terminal: unknown,
  tokens: ReadonlyMap<unknown, string>,
): ValidationFinding[] {
  const findings: ValidationFinding[] = [];
  const recommends = get(step, "recommends");
  const transitions = get(step, "transitions");
  if (!isContainer(recommends) || !isContainer(transitions)) return findings;
  for (const [event, decision] of entriesOf(recommends)) {
    if (typeof event !== "string") continue;
    const target = get(transitions, event);
    // Not a transition at all: the declared dead-config lane owns it.
    if (typeof target !== "string") continue;
    const targetStep = get(steps, target);
    // A TERMINAL target resolves — it is simply not a gate, and saying so
    // is this lane's whole job. Only an UNRESOLVABLE target stands the
    // lane down, because the declared membership lane already named it
    // and a second finding at a remote path would mis-address the author.
    const isTerminal = Array.isArray(terminal) && (terminal as readonly unknown[]).includes(target);
    if (!isContainer(targetStep) && !isTerminal) continue;
    const path = `steps.${stepId}.recommends.${event}`;
    // A target that IS a step but whose discriminator is unusable has no
    // class yet — a third state beside terminal and unresolvable. The
    // lane stands down: that step's own `type` lane owns the authored
    // mistake, and naming a class the author never declared would
    // mis-address them (ratified 2026-08-16).
    const targetClass = isContainer(targetStep) ? stepClassOf(targetStep, tokens) : undefined;
    if (isContainer(targetStep) && targetClass === undefined) continue;
    if (targetClass !== "human_gate") {
      findings.push({
        path,
        code: STEP_CLASS_CODES.onNonGate,
        message:
          `recommends: '${event}' routes to step '${target}', which is not a humanGate step — ` +
          `a recommendation is meaningful only where a decision will be asked`,
      });
      continue;
    }
    const decisions = get(targetStep, "decisions");
    // The gate's own `decisions` container lane is the trace for a broken
    // one; there is nothing to check membership against.
    if (!isContainer(decisions) || typeof decision !== "string") continue;
    // The value's OWN declared lane is the trace where the grammar
    // refused it: a value that cannot be an id can never be a key, and
    // reporting both would double one authored mistake.
    if (RECOMMENDS_VALUE_GRAMMAR?.test(decision) === false) continue;
    const declared = entriesOf(decisions).some(([key]) => key === decision);
    if (declared) continue;
    findings.push({
      path,
      code: STEP_CLASS_CODES.unknownDecision,
      message: `recommends: '${decision}' is not a declared decision of step '${target}'`,
    });
  }
  return findings;
}

/** Every class lane, per step, in the declared node's own lane order:
 * unknown keys, then missing keys, then the class-specific value lanes. */
function stepClassFindings(value: unknown, channel: EngineChannel): ValidationFinding[] {
  const findings: ValidationFinding[] = [];
  const steps = get(value, "steps");
  if (!isContainer(steps)) return findings;
  const tokens = classTokens(channel);
  const fields = new Set(AUTHORABLE_STEP_KEYS);
  for (const [stepId, step] of entriesOf(steps)) {
    if (typeof stepId !== "string" || !isContainer(step)) continue;
    // An unusable discriminator draws the enum lane and GATES this step's
    // class lanes: ONE finding, never an enum finding plus a cascade of
    // agent-class presence findings for a step whose class was never
    // decided.
    const stored = stepClassOf(step, tokens);
    if (stored === undefined) continue;
    const declared = STEP_CLASSES[stored];
    if (declared === undefined) continue;
    const label = classLabel(stored, tokens);
    const owned = new Set([...declared.required, ...declared.optional]);
    const legal = [...declared.required, ...declared.optional].join(", ");

    for (const [key] of entriesOf(step)) {
      // A key outside the DECLARED union is the declared unknown-key
      // lane's alone — one authored mistake, one finding.
      if (typeof key !== "string" || !fields.has(key) || owned.has(key)) continue;
      findings.push({
        path: `steps.${stepId}.${key}`,
        message:
          `unknown key ${key} on ${article(label)} ${label} step ` +
          `(${article(label)} ${label} step's keys are ${legal})`,
      });
    }
    for (const key of declared.required) {
      const present = step instanceof Map ? step.has(key) : Object.prototype.hasOwnProperty.call(step, key);
      if (present) continue;
      // The wording and the path are the RETIRED declared lane's, held
      // byte-identical: the relaxation moves the carrier, never the
      // finding (ch14-P1 D14).
      const code = PRESENCE_CODES[`${stored}.${key}`];
      const finding: ValidationFinding = { path: `steps.${stepId}`, message: `missing required key "${key}"` };
      findings.push(code === undefined ? finding : { ...finding, code });
    }

    if (stored === "human_gate") {
      const decisions = get(step, "decisions");
      if (isContainer(decisions) && entriesOf(decisions).length === 0) {
        findings.push({
          path: `steps.${stepId}.decisions`,
          code: STEP_CLASS_CODES.gateEmpty,
          message: "decisions must declare at least one decision (a gate no one can answer is refused)",
        });
      }
    }
    if (stored === "wait") {
      const kind = get(get(step, "wait"), "kind");
      if (typeof kind === "string" && KERNEL_WAIT_KINDS.includes(kind)) {
        findings.push({
          path: `steps.${stepId}.wait.kind`,
          message:
            `wait kind '${kind}' is reserved by the kernel (reserved: ${KERNEL_WAIT_KINDS.join(", ")}) — ` +
            `an authored collision would alias the kernel's own resume machinery`,
        });
      }
    }
    if (stored === "agent") findings.push(...recommendsFindings(stepId, step, steps, get(value, "terminal"), tokens));
  }
  return findings;
}

// ── R7 (ch14-C7(a)): the RE-HOMED role-set equality ────────────────────
//
// The declared `[d-roleset]` cross rule retired in the same edit that
// landed this lane: its `collect` over `$.steps.*.role` has no per-member
// absence tolerance, and the only existing knob would have disabled the
// equality for every wait-bearing template. THREE properties of the
// retired declaration travel with it, each readable in the declaration
// and the engine at the ratifying basis and each silently dropped by a
// rewrite that did not look:
//
//  1. the two directions with their DIFFERENT path grains — used-but-
//     undeclared at the container, declared-but-unused at the entry;
//  2. the grammar-invalid SUPPRESSION the two role nodes' `gating: true`
//     gave it, which reached the rule as an UNRELIABLE operand;
//  3. the broken-`steps`-container stand-down, which came from the
//     engine's UNRELIABLE-operand rule — SILENCE — and NOT from its
//     undecided-operand rule, which reports an internal validator
//     failure. The two are opposite outcomes, and a lane built off the
//     wrong one ships an internal-failure message where the declaration
//     was silent.
//
// The stand-down operand is the engine's own reliability signal, which
// this module already consumes for the hygiene lane — nothing new crosses
// that boundary.

const ROLE_SET_TAGS: readonly string[] = ["d-steps", "d-step", "d-roles", "d-role-name", "d-role-ref"];

function roleSetFindings(
  value: unknown,
  failedTags: readonly string[],
  channel: EngineChannel,
): ValidationFinding[] {
  if (failedTags.some((tag) => ROLE_SET_TAGS.includes(tag))) return [];
  const steps = get(value, "steps");
  const roles = get(value, "roles");
  if (!isContainer(steps) || !isContainer(roles)) return [];
  const tokens = classTokens(channel);

  const used: string[] = [];
  for (const [, step] of entriesOf(steps)) {
    if (!isContainer(step)) return [];
    const stored = stepClassOf(step, tokens);
    const role = get(step, "role");
    if (typeof role === "string") {
      used.push(role);
      continue;
    }
    // A role-LESS step contributes nothing — that is the tolerance this
    // re-homing exists for. A step whose CLASS demands a role and has
    // none is a different thing: the class lane's missing finding is the
    // trace, and the equality stands down behind it exactly as it did
    // behind the retired declared missing lane.
    if (stored !== undefined && STEP_CLASSES[stored]?.required.includes("role") === true) return [];
  }

  const declared: string[] = [];
  for (const [name] of entriesOf(roles)) if (typeof name === "string") declared.push(name);

  const findings: ValidationFinding[] = [];
  for (const role of [...new Set(used)]) {
    if (declared.includes(role)) continue;
    findings.push({ path: "roles", message: `role ${JSON.stringify(role)} is used by steps but not declared` });
  }
  for (const role of [...new Set(declared)]) {
    if (used.includes(role)) continue;
    findings.push({
      path: `roles.${role}`,
      message: `role ${JSON.stringify(role)} is declared but not used by any step`,
    });
  }
  return findings;
}

/**
 * R3: exactly ONE template-grain finding when a resolved process gate
 * demands a runtime context the template does not provision. The lane is
 * a DEPENDENT of the `runtimeContext` node: an illegal value fired its own
 * container finding and left the normalized field absent, which suppresses
 * this one (ch8-C21's container-precondition rule).
 */
function runtimeContextCrossRule(
  normalized: unknown,
  bindings: readonly string[],
): ValidationFinding | undefined {
  if (bindings.length === 0) return undefined;
  const requirement = get(normalized, "runtimeContext");
  if (requirement === undefined || isContainer(requirement)) return undefined;
  return {
    path: "runtimeContext",
    code: RUNTIME_CONTEXT_CODE,
    message:
      `template declares process gate(s) requiring runtime context but does not ` +
      `declare a provisionable runtimeContext spec { kind, provider } (gates: ${bindings.join(", ")})`,
  };
}

/**
 * Run the template surface on ONE channel. All-or-nothing: any finding
 * means no admitted value exists (ch8-C22), and the admitted form is
 * produced by the NORMALIZER, never by the validator (D3).
 */
export function runTemplateSurface(
  value: unknown,
  channel: EngineChannel,
  catalog: GateCatalog,
): SurfaceOutcome {
  const run = runSurface(templateFormat, value, { channel, catalog });
  const findings: ValidationFinding[] = [...run.findings];
  // The role-set equality first among the residual lanes — the position
  // its retired cross-rule form occupied, so the finding ORDER a template
  // producing both it and a source-ladder finding sees is unchanged.
  findings.push(...roleSetFindings(value, run.failedTags, channel));
  findings.push(...stepClassFindings(value, channel));
  findings.push(...sourceScopedFindings(value, channel));
  findings.push(...unreferencedEntryFindings(value, run.failedTags));
  const crossRule = runtimeContextCrossRule(run.normalized, run.runtimeContextBindings);
  if (crossRule !== undefined) findings.push(crossRule);
  if (findings.length > 0) return { findings };
  return { findings: [], admitted: normalize(templateFormat, run.normalized, run.effectiveConfigs) };
}
