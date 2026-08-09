import type { GateCatalog } from "../../ports/index.js";
import type { ValidationFinding } from "../errors.js";
import type { EngineChannel } from "./engine.js";
import { derefNode, runSurface, sourceLadderFinding } from "./engine.js";
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
 * - **R7** the uses-scoped SOURCE ladder on two gate-config integers
 *   (ch11-C12's source half). Its declaration exists — `[vc-authored-int]`
 *   — but realizing it inside the engine requires the `delegate` hand-off
 *   to carry the CHANNEL into the registration, which is a change to the
 *   ratified `GateRegistration` port shape: out of ADR-019 D2's scope and
 *   exactly the "while we are here" D6 forbids. Under D7's ≥2-row test the
 *   alternative — a construct that scopes a source lane by a sibling's
 *   value, serving this one row — is refused, and the row keeps a code
 *   lane. This is R7's first live member; the family was kept open at the
 *   ratification for precisely this case.
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

/** R7: the two uses-scoped integer fields whose SOURCE form is laddered by
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

/** R7's walk: `steps.<id>.gates.<event>[<i>].config.<field>` for the two
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
  findings.push(...sourceScopedFindings(value, channel));
  findings.push(...unreferencedEntryFindings(value, run.failedTags));
  const crossRule = runtimeContextCrossRule(run.normalized, run.runtimeContextBindings);
  if (crossRule !== undefined) findings.push(crossRule);
  if (findings.length > 0) return { findings };
  return { findings: [], admitted: normalize(templateFormat, run.normalized, run.effectiveConfigs) };
}
