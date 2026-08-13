import { defineSurface } from "./defineSurface.js";
import type { NodeDecl, SurfaceDecl } from "./vocabulary.js";

/**
 * ADR-019 D4: THE CANONICAL HOME — the template surface's declaration, as
 * DATA. This module contains no executable logic: every export is a frozen
 * declaration object consumed by `engine.ts` (the validator) and
 * `normalizer.ts` (the derivation capability, D3).
 *
 * The two-authority rule (D4): the CONTRACT states decisions and cites the
 * `tag` values below; a row's passing gloss of an attribute is non-binding
 * paraphrase and THESE bytes govern (the contract's Context states the
 * rule). A structural rule carried NORMATIVELY in both places is a defect;
 * citation closure (every tag cited exists; every node rowed to a contract
 * is cited by it) is checked mechanically at review — no standing code
 * check exists for it yet.
 *
 * Every node below realizes the re-expression column of
 * `v3/implementation/schema-expressiveness-audit.md` (the standing pin is
 * recorded in ADR-019's Context — never restated here, so it cannot go
 * stale twice) and carries the ratified rows it realizes in `rows`. The
 * audited residual stays PROSE/CODE and is NOT declared here — R2
 * (unreferenced hygiene), R3 (the existential cross-rule over resolved
 * registrations), R4 (derivation — the normalizer's), R5 (the
 * cross-artifact store check), R6 (substrate wording), R7 (see
 * `d-gate-config`'s note) — with ONE exception since D10: R1's
 * value-shaped reference belt became the `validKeysOf` construct and IS
 * declared below (`vc-blockidlist`).
 */

// ---------------------------------------------------------------------------
// Value classes (vocabulary #15).
// ---------------------------------------------------------------------------

/** ch8-C10: ONE grammar for every id class — nonempty, no whitespace, no
 * dot. The citing site supplies `{label}`. */
const idClass: NodeDecl = {
  kind: "string",
  tag: "vc-id-class",
  rows: ["ch8-C10"],
  typeMessage: "{label} must be a nonempty string, got {value}",
  nonempty: { message: "{label} must be a nonempty string, got {value}" },
  grammar: {
    re: "^[^\\s.]+$",
    message: 'invalid {label} {valueJson}: ids contain no whitespace and no "."',
  },
};

/** ch8-C14 → ch12-C7: a run-profile position is a PLAIN map whose resolved
 * values are canonical-JSON-safe. A non-plain container suppresses the
 * canonical lane (dependent-lane suppression). */
const agentConfigValue: NodeDecl = {
  kind: "map.plain",
  tag: "vc-agentconfig",
  rows: ["ch8-C14", "ch12-C7", "ch13v2-C4"],
  containerMessage: "{label} must be a map; got {value}",
  canonicalJsonSafe: {
    message: "{label} must be canonical-JSON-safe (a map of finite numbers and plain values)",
  },
  // ch13v2-C4 (ADR-019 D11): the ONE typed field of the otherwise
  // format-open agent config. Both template positions (the role-level
  // default and the step-level map) share this class, so one declaration
  // covers both; the runOverrides position never meets this declaration
  // (a CLI input surface — ch13v2-C5's run scope).
  fields: {
    promptConcernRefs: {
      kind: "valueClass",
      tag: "d-prompt-refs",
      rows: ["ch13v2-C4"],
      valueClass: "blockIdList",
      label: "promptConcernRefs",
    },
  },
};

/** ch13v2-C2: ONE grammar for catalog keys and every ref-list member —
 * the block-id namespace. The citing site supplies `{label}`. */
const blockId: NodeDecl = {
  kind: "string",
  tag: "vc-block-id",
  rows: ["ch13v2-C2"],
  typeMessage: "invalid {label} {valueJson}: block ids are kebab-case strings",
  nonempty: { message: "invalid {label} {valueJson}: block ids are kebab-case strings" },
  grammar: {
    re: "^[a-z][a-z0-9-]*$",
    message: "invalid {label} {valueJson}: block ids match {grammar}",
  },
};

/** ch13v2-C4/C6/C7/C8: the shared ref-list value class — the entry belt
 * (ADR-019 D10) and the per-occurrence duplicate lane, one definition
 * for all three ref positions. */
const blockIdList: NodeDecl = {
  kind: "list",
  tag: "vc-blockidlist",
  rows: ["ch13v2-C4", "ch13v2-C6", "ch13v2-C7", "ch13v2-C8"],
  containerMessage: "{label} must be a list of context block ids; got {value}",
  memberLaneAt: "index",
  member: {
    kind: "valueClass",
    tag: "d-block-ref",
    rows: ["ch13v2-C4", "ch13v2-C6"],
    valueClass: "blockId",
    label: "context block ref",
  },
  unique: { grain: "perOccurrence", at: "index", message: "duplicate context block ref {valueJson}" },
  memberOf: {
    relation: "memberOf",
    target: { validKeysOf: "$.contextBlocks" },
    code: "unresolved_context_block_ref",
    message: "context block ref {valueJson} does not resolve to an entry",
  },
};

/**
 * NOT DECLARED HERE, and the reason is a REPO GUARD, not taste: the three
 * delegated gate-config schemas (`declarative.threshold`,
 * `pairflow.previous_reviewer_verdict`, `external.process`) live behind
 * ch11-C5's `delegate: registry(uses)` hand-off, and ch11-P2a G1 —
 * lint-enforced — permits `gates/` to VALUE-import `domain/` and `ports/`
 * only. A registration cannot consume an engine that lives under
 * `definition/`, and moving the engine into `domain/` or `ports/` to make
 * it reachable would be a worse answer than leaving the hand-off alone.
 *
 * Under ADR-019 D2 (the TEMPLATE surface, now; nothing else is built) and
 * D6 (migrating a surface is a deliberate per-surface act, never a "while
 * we are here"), the three schemas stay as built. The audit's paper
 * declarations `[d-gc-threshold]`, `[d-gc-verdict]` and `[d-gc-process]`
 * remain available to the act that migrates them.
 */

// ---------------------------------------------------------------------------
// The template surface's node tree.
// ---------------------------------------------------------------------------

const transitionsNode: NodeDecl = {
  kind: "map.open",
  tag: "d-transitions",
  rows: ["ch8-C12", "ch8-C10"],
  presence: { required: true },
  containerMessage: "transitions must be a map of event-type -> target id (it may be empty)",
  keyClass: { kind: "valueClass", tag: "d-event-type", rows: ["ch8-C10"], valueClass: "idClass", label: "event type" },
  keyLaneAt: "container",
  entry: {
    kind: "string",
    tag: "d-target",
    rows: ["ch8-C19"],
    // No `typeMessage`: a non-string target IS the membership fault, and
    // the measured lane emits ONE finding for both.
    memberOf: {
      relation: "memberOf",
      target: { union: [{ keysOf: "$.steps" }, { valuesOf: "$.terminal" }] },
      message: "transition target must name a step or a terminal id; got {value}",
    },
  },
};

const gateBindingNode: NodeDecl = {
  kind: "map.fixed",
  tag: "d-binding",
  rows: ["ch11-C4"],
  containerMessage: "gate binding must be a map",
  unknownMessage: "unknown gate binding key '{key}' (allowed: {keys})",
  fields: {
    uses: {
      kind: "string",
      tag: "d-uses",
      rows: ["ch11-C6", "ch11-C8", "ch11-C21"],
      presence: { required: true, foldedIntoTypeLane: true },
      typeMessage: "uses must be a non-empty string",
      nonempty: { message: "uses must be a non-empty string" },
      grammar: {
        re: "^[a-z][a-z0-9_]*(\\.[a-z][a-z0-9_]*)+$",
        message: "uses must match {grammar} (two or more dot-separated lowercase segments); got {valueJson}",
      },
      // D8's ADMITTED widening: a selector root that is an INJECTED set.
      // The finding reports at the BINDING, not at `…uses` (audit §5 F3).
      memberOf: {
        relation: "memberOf",
        target: { injected: "gateCatalog" },
        at: "container",
        code: "gate_evaluator_unavailable",
        message: "no gate evaluator is registered for '{valueRaw}'",
      },
    },
    config: {
      kind: "delegate",
      tag: "d-gate-config",
      rows: ["ch11-C5"],
      registry: "gateCatalog",
      by: "uses",
      presence: { required: true, foldedIntoTypeLane: true },
      dependsOn: ["d-uses"],
      beltMessage: "gate evaluator '{valueRaw}' reported a config failure without findings",
    },
    // ch13v2-C6: the binding's ref position. The keyset growth itself is
    // ch11-C4's realized text (the executed 2026-07-26 reopen act).
    contextBlockRefs: {
      kind: "valueClass",
      tag: "d-ctx-gate-refs",
      rows: ["ch13v2-C6", "ch13v2-C13"],
      valueClass: "blockIdList",
      label: "contextBlockRefs",
      // ch13v2-C13: the admitted form carries this position on EVERY
      // binding. Filling an absent key with a constant is `default:`
      // materialization, which is schema-side (ADR-019 D3) — no hook is
      // needed here, unlike the two config positions whose source is
      // nested. It fills an ABSENT key only: a key authored `undefined`
      // is PRESENT and meets this field's own lane, which is C1's
      // fail-closed class working rather than a gap.
      default: [],
    },
  },
};

const stepNode: NodeDecl = {
  kind: "map.fixed",
  tag: "d-step",
  rows: ["ch8-C9", "ch8-C13", "ch11-C1"],
  containerMessage:
    "a step must be a map with exactly role, instruction, transitions (+ optional agentConfig, gates)",
  unknownMessage: "unknown key {value}",
  laneOrder: "unknownThenMissingThenValues",
  fields: {
    role: {
      kind: "valueClass",
      tag: "d-role-ref",
      rows: ["ch8-C10", "ch8-C16"],
      valueClass: "idClass",
      label: "role name",
      presence: { required: true },
      // A grammar-invalid role makes the USED-role set unreliable, so the
      // role-set equality is suppressed rather than cascaded.
      gating: true,
    },
    instruction: {
      kind: "string",
      tag: "d-instruction",
      rows: ["ch8-C11"],
      presence: { required: true },
      typeMessage: "instruction must be a nonempty string",
      nonempty: { message: "instruction must be a nonempty string" },
    },
    transitions: transitionsNode,
    advancesRound: {
      kind: "raw",
      tag: "d-advances-round",
      rows: ["ch11-C39"],
      // The ADMITTED form's producer-owned field. A direct-construction
      // caller may already hold an admitted value, so the key is legal on
      // that channel and is RECOMPUTED by the normalizer's producer
      // monopoly; it is never authorable in a file.
      channel: "direct",
    },
    agentConfig: {
      kind: "valueClass",
      tag: "d-agentconfig",
      rows: ["ch8-C14", "ch12-C7"],
      valueClass: "agentConfigValue",
      label: "agentConfig",
    },
    // ch13v2-C13: the step position's ADMISSION-PRODUCED ref list — the
    // roles-entry node's twin, normalized from the nested `agentConfig`
    // source by `n-ctx-step-refs`, `raw` and channel-DIRECT on the same
    // `d-advances-round` precedent and for the same reason.
    promptConcernRefs: {
      kind: "raw",
      tag: "d-ctx-step-refs",
      rows: ["ch13v2-C13"],
      channel: "direct",
    },
    gates: {
      kind: "map.open",
      tag: "d-gates",
      rows: ["ch11-C1", "ch11-C2", "ch11-C21"],
      containerMessage: "gates must be a map of event type to gate pipeline",
      keyLaneAt: "container",
      // The gates subtree's file-channel key-STRINGNESS scan: a non-string
      // key cannot become an own property and would blind every own-key
      // scan downstream.
      deepKeyStringness: {
        message: "map keys in the gates subtree must be strings; got {value}",
        channel: "file",
      },
      // ch11-C2: a gates key outside the step's transitions is DEAD config
      // — nothing under it has an operand to be validated against.
      keysSubsetOf: {
        relation: "keysSubsetOf",
        target: { keysOf: "^.transitions" },
        message: "dead gate config: '{key}' is not a transition of step '{ownerKey}'",
      },
      entry: {
        kind: "list",
        tag: "d-pipeline",
        rows: ["ch11-C3"],
        containerMessage: "gate pipeline must be a list",
        nonempty: { message: "gate pipeline must not be empty" },
        memberLaneAt: "index",
        member: gateBindingNode,
      },
    },
  },
};

const runtimeContextSpecNode: NodeDecl = {
  kind: "map.fixed",
  tag: "d-rtc-spec",
  rows: ["ch12-C3"],
  containerMessage:
    'runtimeContext must be "none" or a spec map { kind, provider, config? } when present; got {value}',
  unknownMessage: "unknown key {value} (a runtimeContext spec map's only keys are kind, provider, config?)",
  fields: {
    kind: {
      kind: "string",
      tag: "d-rtc-kind",
      rows: ["ch12-C3"],
      presence: { required: true },
      typeMessage: "kind must be a string matching {grammar}; got {value}",
      grammar: { re: "^[a-z][a-z0-9_]*$", message: "kind must be a string matching {grammar}; got {value}" },
    },
    provider: {
      kind: "string",
      tag: "d-rtc-provider",
      rows: ["ch12-C3"],
      presence: { required: true },
      typeMessage:
        "provider must be a string matching {grammar} (two or more dot-separated lowercase segments); got {value}",
      grammar: {
        re: "^[a-z][a-z0-9_]*(\\.[a-z][a-z0-9_]*)+$",
        message:
          "provider must be a string matching {grammar} (two or more dot-separated lowercase segments); got {value}",
      },
    },
    config: {
      kind: "raw",
      tag: "d-rtc-config",
      rows: ["ch12-C3"],
      containerMessage: "config must be a map when present; got {value}",
    },
  },
};

const rootNode: NodeDecl = {
  kind: "map.fixed",
  tag: "d-root",
  rows: ["ch8-C7", "ch8-C13", "ch8-C24", "ch8-C25", "ch11-C18", "ch11-C37", "ch12-C1", "ch13v2-C1"],
  containerMessage: "the template root must be a map with exactly ref, start, steps, terminal, roles",
  // ch8-C24's reservation lives in this message and nowhere else: `kind`
  // is illegal today, and the closed keyset below is what makes it so.
  unknownMessage: 'unknown key {value} (fixed keysets grow only by ratified additive keys — V16 reserves "kind")',
  // ch8-C25: the removed/renamed key registry, EMPTY at v0. The lane is
  // live; the registry has no members yet.
  removedKeys: {},
  laneOrder: "missingThenUnknown",
  fields: {
    ref: {
      kind: "map.fixed",
      tag: "d-ref",
      rows: ["ch8-C8"],
      presence: { required: true },
      containerMessage: "ref must be a map with exactly id and version",
      unknownMessage: "unknown key {value}",
      fields: {
        id: {
          kind: "string",
          tag: "d-ref-id",
          rows: ["ch8-C8"],
          presence: { required: true },
          typeMessage: "id must be a string matching {grammar} (filename-safe); got {value}",
          grammar: {
            re: "^[a-z0-9][a-z0-9-]*$",
            message: "id must be a string matching {grammar} (filename-safe); got {value}",
          },
        },
        version: {
          kind: "integer",
          tag: "d-ref-version",
          rows: ["ch8-C8"],
          presence: { required: true },
          sourceForm: "plainDecimalInteger",
          resolvedForm: { safeInteger: true, min: 1, message: "{path} must resolve to a safe integer >= 1" },
        },
      },
    },
    start: {
      kind: "string",
      tag: "d-start",
      rows: ["ch8-C18"],
      presence: { required: true },
      memberOf: {
        relation: "memberOf",
        target: { keysOf: "$.steps" },
        message: "start must name an existing step; got {value}",
      },
    },
    steps: {
      kind: "map.open",
      tag: "d-steps",
      rows: ["ch8-C9", "ch8-C10"],
      presence: { required: true },
      containerMessage: "steps must be a NONEMPTY map of step-id -> step",
      // NOT gating: ch8-C21's container precondition binds MISSING or
      // WRONG-KIND containers only. An empty map is a valid map OF ITS
      // KIND, so `keys($.steps)` = the empty set EXISTS and every rule
      // selecting over it runs normally (ch11-P4 F7's `(b′)` entry).
      nonempty: { message: "steps must be a NONEMPTY map" },
      keyClass: { kind: "valueClass", tag: "d-step-id", rows: ["ch8-C10"], valueClass: "idClass", label: "step id" },
      keyLaneAt: "container",
      entry: stepNode,
    },
    terminal: {
      kind: "list",
      tag: "d-terminal",
      rows: ["ch8-C17", "ch8-C10"],
      presence: { required: true },
      containerMessage: "terminal must be a nonempty list of unique ids",
      nonempty: { message: "terminal must be a NONEMPTY list" },
      memberLaneAt: "container",
      member: {
        kind: "valueClass",
        tag: "d-terminal-id",
        rows: ["ch8-C10"],
        valueClass: "idClass",
        label: "terminal id",
      },
      unique: { grain: "perOccurrence", at: "container", message: "duplicate terminal id {valueJson}" },
      disjointFrom: {
        relation: "disjointFrom",
        target: { keysOf: "$.steps" },
        message: "terminal id {valueJson} collides with a step id (terminal is disjoint from keys(steps))",
      },
    },
    roles: {
      kind: "map.open",
      tag: "d-roles",
      rows: ["ch8-C15", "ch8-C10", "ch8-C16"],
      presence: { required: true },
      containerMessage: "roles must be a map of role-name -> { defaultActor?, defaultAgentConfig? }",
      keyClass: {
        kind: "valueClass",
        tag: "d-role-name",
        rows: ["ch8-C10"],
        valueClass: "idClass",
        label: "role name",
        // The declared-side twin of `d-role-ref`: a grammar-invalid
        // declared name suppresses the role-set equality.
        gating: true,
      },
      keyLaneAt: "container",
      entry: {
        kind: "map.fixed",
        tag: "d-roles-entry",
        rows: ["ch8-C15", "ch12-C6"],
        containerMessage:
          "a roles entry must be a map whose legal keys are the optional defaultActor and defaultAgentConfig",
        unknownMessage: "unknown key {value}",
        fields: {
          defaultActor: {
            kind: "string",
            tag: "d-defaultactor",
            rows: ["ch8-C15"],
            typeMessage: "defaultActor must be a nonempty string when present",
            nonempty: { message: "defaultActor must be a nonempty string when present" },
          },
          defaultAgentConfig: {
            kind: "valueClass",
            tag: "d-defaultagent",
            rows: ["ch12-C6", "ch12-C7"],
            valueClass: "agentConfigValue",
            label: "defaultAgentConfig",
          },
          // ch13v2-C13: the role position's ADMISSION-PRODUCED ref list,
          // normalized from the nested `defaultAgentConfig` source by
          // `n-ctx-role-refs`. `raw` and channel-DIRECT on the
          // `d-advances-round` precedent, carried whole: a validating
          // kind would MINT a lane on the direct channel and turn a
          // caller-supplied produced position into a finding, where
          // C13's own recompute clause requires a silent recompute.
          promptConcernRefs: {
            kind: "raw",
            tag: "d-ctx-role-refs",
            rows: ["ch13v2-C13"],
            channel: "direct",
          },
        },
      },
    },
    capabilityProfile: {
      kind: "raw",
      tag: "d-capability-profile",
      rows: ["ch13v2-C11"],
      // The L1 authorization profile: a TYPE-LEVEL channel only. Authored
      // restrictions are a deferred Absent, so the key stays an
      // unknown-key rejection in a template FILE and is legal only on the
      // direct-construction channel.
      channel: "direct",
    },
    round: {
      kind: "map.fixed",
      tag: "d-round",
      rows: ["ch11-C37", "ch11-C38", "ch11-C40"],
      containerMessage: "round must be a map with the single key advanceOnArrivalAt",
      unknownMessage: "unknown key {value} (round's only key is advanceOnArrivalAt)",
      fields: {
        advanceOnArrivalAt: {
          kind: "list",
          tag: "d-round-list",
          rows: ["ch11-C40"],
          presence: { required: true },
          containerMessage: "advanceOnArrivalAt must be a nonempty list of step ids",
          nonempty: { message: "round.advanceOnArrivalAt must not be empty" },
          memberLaneAt: "index",
          member: {
            kind: "string",
            tag: "d-round-member",
            rows: ["ch11-C40"],
            typeMessage: "advanceOnArrivalAt member must be a step id string; got {value}",
          },
          memberOf: {
            relation: "memberOf",
            target: { keysOf: "$.steps" },
            message: "round.advanceOnArrivalAt member '{valueRaw}' is not a step",
          },
          unique: {
            grain: "perOccurrence",
            at: "index",
            message: "round.advanceOnArrivalAt member '{valueRaw}' is duplicated",
          },
        },
      },
    },
    runtimeContext: {
      kind: "union",
      tag: "d-rtc",
      rows: ["ch11-C18", "ch12-C2", "ch12-C4"],
      default: "none",
      literals: ["none"],
      mapCase: runtimeContextSpecNode,
      removedValues: {
        required:
          'runtimeContext: "required" is retired — author the spec map { kind, provider, config? } (a directly-constructed RuntimeContextSpec)',
      },
      message:
        'runtimeContext must be "none" or a spec map { kind, provider, config? } when present; got {value}',
    },
    activation: {
      kind: "map.fixed",
      tag: "d-activation",
      rows: ["ch12-C1"],
      default: { mode: "immediate" },
      containerMessage: "activation must be a map with the single key mode",
      unknownMessage: "unknown key {value} (activation's only key is mode)",
      fields: {
        mode: {
          kind: "enum",
          tag: "d-act-mode",
          rows: ["ch12-C1"],
          presence: { required: true },
          // The authored↔stored token map (ch12-C1's C1/C11 mapping),
          // declared so neither side silently forks.
          members: [
            { value: "immediate", store: "immediate" },
            { value: "deferredKickoff", store: "deferred_kickoff", channel: "file" },
            // The direct channel's input IS the domain type, whose token
            // domain is the STORED form (ch12-C1's authored↔stored map).
            { value: "deferred_kickoff", channel: "direct" },
          ],
          message: "mode must be one of {members}; got {value}",
        },
      },
    },
    contextBlocks: {
      kind: "map.open",
      tag: "d-ctxblocks",
      rows: ["ch13v2-C1"],
      // ch13v2-C1: absent-catalog normalization — the admitted form always
      // carries a catalog record. The declared default realizes the absent
      // half; a PRESENT non-map value fails the container lane, so
      // fail-closed replaces the superseded normalize-non-record class.
      default: {},
      containerMessage: "contextBlocks must be a map of block-id -> { body }; got {value}",
      keyClass: {
        kind: "valueClass",
        tag: "d-block-key",
        rows: ["ch13v2-C2"],
        valueClass: "blockId",
        label: "context block id",
      },
      keyLaneAt: "container",
      entry: {
        kind: "map.fixed",
        tag: "d-ctx-entry",
        rows: ["ch13v2-C3"],
        containerMessage: "a context block entry must be a map with exactly body; got {value}",
        unknownMessage: "unknown key {value} (a context block entry's only key is body)",
        missingMessage: 'missing required key "{key}"',
        fields: {
          body: {
            kind: "string",
            tag: "d-ctx-body",
            rows: ["ch13v2-C3"],
            presence: { required: true },
            typeMessage: "body must be a nonempty string; got {value}",
            nonempty: { message: "body must be a nonempty string" },
          },
        },
      },
    },
  },
};

// ---------------------------------------------------------------------------
// The surface.
// ---------------------------------------------------------------------------

export const templateFormat: SurfaceDecl = defineSurface({
  // The SUBSTRATE block carries only what is consumed or asserted, and
  // every branch is TAG-ADDRESSABLE so a ratified row can cite it by
  // pointer instead of repeating its text (design review F6). The
  // rules it used to state about the yaml library's own behaviour — the
  // core schema, one document per file, warning promotion, alias
  // resolution — are real ratified rules (ch8-C1/C2/C3/C5) but they are
  // the LIBRARY's behaviour, not a knob anything here reads; stating them
  // as declaration made them read as authority they were not (arm round
  // 1, F5). Their test carriers are `load.test.ts`'s substrate lanes.
  substrate: {
    read: {
      tag: "d-read",
      rows: ["ch8-C6"],
      message: "invalid UTF-8 byte sequence (templates are strict UTF-8)",
    },
    parse: {
      directive: {
        tag: "d-directive",
        rows: ["ch8-C34"],
        only: "1.2",
        message: "%YAML {key} directive: only YAML 1.2 is supported",
      },
      duplicateKeys: {
        tag: "d-dupkeys",
        rows: ["ch8-C4"],
        message: "Map keys must be unique",
      },
    },
    resolve: {
      graph: {
        tag: "d-graph",
        rows: ["ch8-C5"],
        message: "cyclic value structure: the resolved template graph must be acyclic",
      },
    },
    // ch8-C23: the CLOSED issue-code namespace, disjoint from registry
    // names. `unresolved_context_block_ref` rides the declared resolution
    // lane below since the ch13v2 adoption; its end-to-end CLI travel is
    // P5's (ch13v2-C18).
    codes: {
      tag: "d-codes",
      rows: ["ch8-C23"],
      values: [
        "gate_evaluator_unavailable",
        "runtime_context_required_for_process_gate",
        "invalid_process_gate_config",
        "gate_config_not_supported",
        "unresolved_context_block_ref",
      ],
    },
    internalFailure: {
      tag: "d-internal-failure",
      rows: ["ch8-C22", "ch8-C36"],
      path: "$",
      message: "internal validator failure: {valueRaw}",
    },
  },
  root: rootNode,
  valueClasses: { idClass, agentConfigValue, blockId, blockIdList },
  crossRules: [
    {
      tag: "d-roleset",
      rows: ["ch8-C16"],
      relation: "equals",
      left: { keysOf: "$.roles" },
      right: { collect: "$.steps.*.role" },
      missingFromLeft: {
        at: "roles",
        message: "role {valueJson} is used by steps but not declared",
      },
      missingFromRight: {
        at: "roles.{valueRaw}",
        message: "role {valueJson} is declared but not used by any step",
      },
    },
  ],
  normalizers: [
    {
      tag: "n-advances-round",
      rows: ["ch11-C39", "ch11-C38"],
      hook: "expandAdvancesRound",
      over: "$.steps",
      edges: "transitions",
      advanceSet: "$.round.advanceOnArrivalAt",
      into: "advancesRound",
    },
    // ch13v2-C13's two nested-source derivations (ADR-019 D12): the
    // authored ref list lives INSIDE the format-open agent-config map, so
    // it is lifted onto a sibling of the enclosing entry — a value
    // computed from another position, which is derivation and not a
    // `default:`. Declared BEFORE the binding rebuild below, per C13's
    // ordering clause.
    {
      tag: "n-ctx-role-refs",
      rows: ["ch13v2-C13"],
      hook: "liftNestedList",
      over: "$.roles",
      from: "defaultAgentConfig",
      source: "promptConcernRefs",
      into: "promptConcernRefs",
    },
    {
      tag: "n-ctx-step-refs",
      rows: ["ch13v2-C13"],
      hook: "liftNestedList",
      over: "$.steps",
      from: "agentConfig",
      source: "promptConcernRefs",
      into: "promptConcernRefs",
    },
    {
      tag: "n-effective-config",
      // ch13v2-C13 legislates this hook's carry-list growth at P5 — the
      // row citation keeps the coupling inside the closure check. The
      // authored gate refs ride the CARRY list: the rebuild would
      // otherwise drop them, and the carry list plus the produced field
      // is the admitted binding's whole keyset.
      rows: ["ch11-C20", "ch11-C5", "ch13v2-C13"],
      hook: "materializeEffectiveConfigs",
      over: "$.steps.*.gates",
      carry: ["uses", "contextBlockRefs"],
      into: "config",
    },
  ],
} satisfies SurfaceDecl);
