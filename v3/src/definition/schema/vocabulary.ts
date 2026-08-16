/**
 * ADR-019 (accepted 2026-08-05): the declaration VOCABULARY, as types.
 *
 * This module is TYPES ONLY — it defines the shape a surface declaration
 * may take, and nothing else. The declaration itself is data
 * (`templateFormat.ts`, D4's canonical home); the machines that consume
 * it are `engine.ts` (the validator) and `normalizer.ts` (D3's second,
 * separately-named capability).
 *
 * Every construct below is one of ADR-019 §2.2's admitted vocabulary
 * entries, each of which passed the audit's ≥2-independent-ratified-rows
 * test (`v3/implementation/schema-expressiveness-audit.md` §2.2, standing
 * sha256 `bfed8210…`). Adding a construct is a D7 amendment of the ADR,
 * never a silent edit here.
 */

/**
 * A message template: literal text with `{placeholder}` slots the engine
 * interpolates (vocabulary #18 — `message:`, the PARITY carrier; ADR-019
 * D5 pre-names message wording as a delta class, and a literal template
 * is the choice that keeps the measured wording byte-identical).
 *
 * The closed placeholder set, all supplied by the engine from the node's
 * own evaluation context — never rule-specific:
 *
 * - `{path}`      the finding's own path
 * - `{key}`       the offending key, raw
 * - `{keyJson}`   the offending key, JSON-quoted
 * - `{value}`     the offending value, DESCRIBED (`a map`/`a list`/literal)
 * - `{valueRaw}`  the offending value, rendered bare (no quoting) — the
 *                 form the measured messages that embed a value inside
 *                 their own quotes need
 * - `{valueJson}` the offending value, JSON-quoted
 * - `{source}`    the offending value's raw source slice, JSON-quoted
 * - `{grammar}`   the grammar's regular-expression source
 * - `{members}`   the enum/allowlist members, comma-joined
 * - `{keys}`      the node's legal keyset, comma-joined
 * - `{label}`     the referencing site's label for a value class
 * - `{ownerKey}`  the key of the nearest enclosing OPEN-map entry
 */
export type MessageTemplate = string;

/**
 * THREE path languages, named apart (design review F11: one type name over
 * three interpreters promises a compatibility that does not exist). Each is
 * checked at declaration load by `defineSurface`, so a path written in the
 * wrong language is a LOUD error rather than a silent no-op.
 */

/**
 * A SELECTOR path — an address into the value graph, read by the engine's
 * selector interpreter.
 *
 * Grammar: a head of `$` (the document root) or `^` (the citing node's own
 * container), then dot-separated segments, where the segment `*` means
 * "every entry of an open map". Nothing else is legal: there is no `..`
 * form, because `..` is indistinguishable from an empty dotted segment.
 */
export type SelectorPath = string;

/**
 * A FINDING-PATH template — where a cross rule's finding is addressed. It
 * is NOT walked: it is rendered, so it carries literal path text plus the
 * same `{placeholder}` slots a `MessageTemplate` carries (`roles`,
 * `roles.{valueRaw}`). Selector syntax is illegal here.
 */
export type FindingPathTemplate = string;

/**
 * A NORMALIZER operand path — read by the normalizer's own resolver, which
 * understands a `$` head, dot-separated segments, and the `.*.`
 * open-map-wildcard separator. It is not the selector language.
 */
export type NormalizerPath = string;

/** vocabulary #12 — the selector roots. `injected` is D8's ADMITTED
 * widening: a selector root that is an injected SET rather than a
 * document node (a set is a set; the relation and finding form are
 * unchanged). */
export type Selector =
  | { readonly keysOf: SelectorPath }
  /**
   * ADR-019 D10 (2026-08-07) — the ENTRY-BELTED root: the keys of an OPEN
   * MAP whose VALUE IS A VALID ENTRY, where "valid entry" is the map's own
   * declared `entry:` node, measured by whether that entry's evaluation
   * produced any finding. Key existence alone is not resolution.
   *
   * There is no separately named entry shape ON PURPOSE: a second name
   * would be a second definition of "entry", and one definition governing
   * both channels is the whole point of the belt.
   *
   * ITS BROKEN-OPERAND SEMANTICS ARE PART OF THE CONSTRUCT. When the
   * operand is wrong-kind, absent, or otherwise unresolvable, no query
   * against it can succeed, so it answers with the EMPTY SET — never
   * "unreliable". Every referencing site therefore gets its own per-site
   * finding, and the container's failure NEVER suppresses them. That is
   * the one suppression exemption the ratified corpus contained, turned
   * from an exception a contract had to restate into a construct's nature.
   */
  | { readonly validKeysOf: SelectorPath }
  | { readonly valuesOf: SelectorPath }
  | { readonly collect: SelectorPath }
  | { readonly union: readonly Selector[] }
  | { readonly injected: "gateCatalog" };

/**
 * vocabulary #12 — a membership relation between the citing node's value
 * (or its keys) and a selector's set.
 *
 * `at` is the finding's PATH GRAIN and exists because the measured lanes
 * DISAGREE (audit §5 F3): the catalog-resolution lane reports at the
 * BINDING, not at `…uses`. `code` is vocabulary #17.
 */
export interface MembershipRule {
  readonly relation: "memberOf" | "keysSubsetOf" | "disjointFrom";
  readonly target: Selector;
  /** `self` = the citing node's own path (the default); `container` = its
   * parent's path. */
  readonly at?: "self" | "container";
  readonly code?: string;
  readonly message: MessageTemplate;
  /** vocabulary #13 — suppression beyond the implicit container rule. */
  readonly dependsOn?: readonly string[];
  /** vocabulary #14 — what this lane does when its operand is still
   * UNDECIDED at the end of the walk.
   *
   * A lane whose target position was never evaluated — because a field the
   * path runs through is legitimately ABSENT — used to be dropped from the
   * deferred queue in silence, leaving no trace anywhere that a declared
   * rule had not run. It is now a reported failure by default. Declaring
   * `skip` says that absence is LEGITIMATE for this lane, and because it
   * is data on the declaration, a reviewer can see and question every
   * place the silence was asked for.
   *
   * This is NOT the suppression `dependsOn` gives: a suppressed lane has a
   * sibling finding that explains it, and an undecided one has nothing. */
  readonly whenOperandAbsent?: "skip";
}

/** vocabulary #11 — the duplicate lane and its path grain. */
export interface UniqueRule {
  readonly grain: "perOccurrence";
  readonly at: "index" | "container";
  readonly message: MessageTemplate;
}

/**
 * The keyset lane ORDER. It is declared, not hard-coded, for the same
 * reason `at:` is (audit §5 F3): the measured nodes DISAGREE, and an
 * engine that picks one silently moves findings. Three measured orders:
 *
 * - `missingThenUnknown`             — the root keyset
 * - `unknownThenPerKey`              — ref, round, activation, the
 *                                      runtimeContext spec, every gate
 *                                      config (the DEFAULT)
 * - `unknownThenMissingThenValues`   — the step keyset
 */
export type LaneOrder =
  | "missingThenUnknown"
  | "unknownThenPerKey"
  | "unknownThenMissingThenValues";

/** Every node carries its declaration TAG (the contract's pointer target,
 * D4) and the ratified rows it realizes (the tag-closure check's other
 * half). `channel` marks a channel-SCOPED node: `file` for a
 * SOURCE-BEARING attribute set (the engine runs it where a source exists
 * and skips it where none does), `direct` for a key that exists only on
 * the direct-construction channel because it belongs to the ADMITTED form
 * rather than the authored one. This is D1's structural channel symmetry
 * — the retired hand-partitioned "realization split".
 *
 * WHERE IT IS HONOURED, exactly (design review F7): on a FIELD of a
 * `map.fixed`, where it scopes the whole field — legality, presence and
 * evaluation. Nowhere else. A `channel` on a root, a list member, an
 * open-map entry, a union case or a value-class definition is REFUSED at
 * declaration load rather than accepted and ignored. (`EnumDecl` members
 * carry their own member-grain `channel`, and `deepKeyStringness` carries
 * its own; both are separate attributes with their own readers.) */
interface NodeBase {
  readonly tag: string;
  readonly rows: readonly string[];
  readonly channel?: "both" | "file" | "direct";
  /** vocabulary #9 — materialized ONCE at admission. Plain `default:` is
   * declarable and stays schema-side (ADR-019 D3); DERIVATION is the
   * normalizer's. */
  readonly default?: unknown;
  /** vocabulary #13 — this node's failure suppresses its dependents. */
  readonly gating?: boolean;
  /**
   * vocabulary #2 — the keyset membership obligation, declared on the
   * FIELD rather than on its container, because the measured lanes
   * disagree on both grains: the template's fixed maps report a missing
   * key at the CONTAINER with one shared wording, every delegated config
   * schema reports it at the KEY with its own wording, and one node (a
   * gate binding's `uses`) folds absence into its own type lane.
   */
  readonly presence?: {
    readonly required: true;
    readonly at?: "container" | "self";
    readonly message?: MessageTemplate;
    readonly code?: string;
    /** Absence is reported by this node's OWN type lane, not by a
     * separate missing lane (a gate binding's `uses`). */
    readonly foldedIntoTypeLane?: true;
  };
}

/** vocabulary #1 `map.fixed` — a closed keyset. The legal keyset IS
 * `Object.keys(fields)`; each field declares its own `presence`. */
export interface MapFixedDecl extends NodeBase {
  readonly kind: "map.fixed";
  /**
   * vocabulary #17 at the CONTAINER and UNKNOWN-KEY grains (ADR-019 D13,
   * user-ratified 2026-08-16 — the existing `code` attribute at a new
   * grain, the D11 shape). ONE node-grain attribute serves BOTH of this
   * kind's coded lanes, because their messages are node-grain templates
   * with no per-lane carrier to hang a second attribute on; the choice
   * follows the enum-grain precedent. The missing-key lane keeps its own
   * `presence.code` — that carrier already existed.
   *
   * It is a member of the surface's declared code namespace like every
   * other `code`, checked at declaration load.
   */
  readonly code?: string;
  readonly containerMessage: MessageTemplate;
  /** The default missing-key wording for fields whose `presence` states
   * none. */
  readonly missingMessage?: MessageTemplate;
  readonly unknownMessage: MessageTemplate;
  readonly laneOrder?: LaneOrder;
  readonly fields: Readonly<Record<string, NodeDecl>>;
  /** vocabulary #10 — fail-loud key removal with migration text. */
  readonly removedKeys?: Readonly<Record<string, MessageTemplate>>;
}

/** vocabulary #1 `map.open` — an open key class. */
export interface MapOpenDecl extends NodeBase {
  readonly kind: "map.open";
  /** vocabulary #17 at the CONTAINER grain (ADR-019 D13) — an open map has
   * one coded lane, its container precondition. See `MapFixedDecl.code`. */
  readonly code?: string;
  readonly containerMessage: MessageTemplate;
  /** vocabulary #3 on a map. `gating` is OPT-IN and the template surface
   * does not use it: ch8-C21's suppression binds MISSING or WRONG-KIND
   * containers only, so an empty map is a valid map of its kind and every
   * rule selecting over its (empty) key set still runs. The attribute
   * exists for a surface that ratifies the opposite; declaring it is what
   * makes an empty container gating, never the engine's own choice. */
  readonly nonempty?: { readonly message: MessageTemplate; readonly gating?: boolean };
  /** vocabulary #5 — the open-map key class and the finding's path grain. */
  readonly keyClass?: ValueClassRefDecl;
  readonly keyLaneAt: "container" | "segment";
  /** The gates subtree's file-channel key-STRINGNESS scan (ch11 walk /
   * GP2): a DEEP scan reporting at the nearest addressable path. */
  readonly deepKeyStringness?: {
    readonly message: MessageTemplate;
    readonly channel: "file";
  };
  readonly keysSubsetOf?: MembershipRule;
  readonly entry: NodeDecl;
}

/** vocabulary #1 `list`. */
export interface ListDecl extends NodeBase {
  readonly kind: "list";
  readonly containerMessage: MessageTemplate;
  /** See `MapOpenDecl.nonempty`: `gating` is opt-in and unused on this
   * surface. */
  readonly nonempty?: { readonly message: MessageTemplate; readonly gating?: boolean };
  readonly member: NodeDecl;
  /** The member lane's path grain — `container` reports every member at
   * the list's own path (ch8-C17's measured grain). */
  readonly memberLaneAt: "container" | "index";
  readonly unique?: UniqueRule;
  readonly disjointFrom?: MembershipRule;
  readonly memberOf?: MembershipRule;
}

/** vocabulary #1 `string` (+ #3 `nonempty`, #4 `grammar`). */
export interface StringDecl extends NodeBase {
  readonly kind: "string";
  /** The non-string lane's message. When a node states only `grammar`,
   * the grammar message covers both lanes (ch8-C8's measured form). */
  readonly typeMessage?: MessageTemplate;
  readonly nonempty?: { readonly message: MessageTemplate };
  readonly grammar?: { readonly re: string; readonly message: MessageTemplate };
  readonly memberOf?: MembershipRule;
}

/** vocabulary #6/#7 — the raw-source ladder and the value-side belt. */
export interface IntegerDecl extends NodeBase {
  readonly kind: "integer";
  /** The alias-free / anchor-free / tag-free / `^[1-9][0-9]*$` ladder over
   * the SOURCE node. File-scoped by construction: no operand exists on the
   * direct-construction channel. */
  readonly sourceForm?: "plainDecimalInteger";
  readonly resolvedForm?: {
    readonly safeInteger: true;
    readonly min: number;
    readonly message: MessageTemplate;
  };
}

/** vocabulary #8 — an allowlist. `store` is the authored↔stored token map
 * (ch12-C1). */
export interface EnumDecl extends NodeBase {
  readonly kind: "enum";
  /** A member may be channel-SCOPED: the same `channel` attribute the node
   * grain carries, applied at MEMBER grain. It is a widening, not a new
   * construct — the measured token domain genuinely differs by channel
   * (ch12-C1: the FILE face is authored camelCase, the direct face is the
   * stored token the domain type declares). */
  readonly members: readonly {
    readonly value: unknown;
    readonly store?: string;
    readonly channel?: "both" | "file" | "direct";
  }[];
  readonly message: MessageTemplate;
  readonly code?: string;
}

/** vocabulary #1 `union` (+ #10 `removed` at VALUE grain). */
export interface UnionDecl extends NodeBase {
  readonly kind: "union";
  readonly literals?: readonly string[];
  readonly mapCase?: NodeDecl;
  readonly removedValues?: Readonly<Record<string, MessageTemplate>>;
  readonly message: MessageTemplate;
}

/** vocabulary #19 — uninterpreted pass-through. */
export interface RawDecl extends NodeBase {
  readonly kind: "raw";
  /** A raw node may still assert a container kind (ch12-C3's `config`). */
  readonly containerMessage?: MessageTemplate;
}

/** `map.plain + canonicalJsonSafe` — the agent-config value class
 * (ch12-C7). A PLAIN string-keyed map (never a class instance, never a
 * JS Map); a non-plain container SUPPRESSES the canonical lane. */
export interface MapPlainDecl extends NodeBase {
  readonly kind: "map.plain";
  readonly containerMessage: MessageTemplate;
  readonly canonicalJsonSafe: { readonly message: MessageTemplate };
  /**
   * ADR-019 D11 (2026-08-08) — the TYPED SUBSET: the `fields` attribute
   * at the plain map's grain, with OPEN-KEYSET semantics that are the
   * point. A listed field is typed and validated WHEN PRESENT; every
   * other key stays legal, uninterpreted open data; NO unknown-key lane
   * exists — the widening types a subset, it closes nothing. Validation
   * transforms nothing: a plain map's value is authored data and passes
   * through unchanged.
   *
   * Attribute applicability is LOUD at this grain: a typed field may
   * carry no `presence` (a plain map has no missing-key lane), no
   * `default` (nothing materializes into authored open data) and no
   * `channel` (read only on a field of a `map.fixed`) — each is refused
   * at declaration load, never accepted-and-ignored.
   */
  readonly fields?: Readonly<Record<string, NodeDecl>>;
}

/** vocabulary #15 — a reusable named value class, with the citing site's
 * `{label}`. */
export interface ValueClassRefDecl extends NodeBase {
  readonly kind: "valueClass";
  readonly valueClass: string;
  readonly label?: string;
}

/** vocabulary #16 — hand-off to an injected registration's own
 * declaration. */
export interface DelegateDecl extends NodeBase {
  readonly kind: "delegate";
  readonly registry: "gateCatalog";
  /** The sibling field whose value names the registration. */
  readonly by: string;
  /** The delegation contract's own belt: a registration that reports
   * failure with ZERO findings must still block admission, or the binding
   * would be admitted with no effective config. A property of the
   * `delegate` construct, not of any one row (audit flag I3). */
  readonly beltMessage: MessageTemplate;
  /** vocabulary #13 — the resolution lane this hand-off presupposes. */
  readonly dependsOn?: readonly string[];
}

export type NodeDecl =
  | MapFixedDecl
  | MapOpenDecl
  | MapPlainDecl
  | ListDecl
  | StringDecl
  | IntegerDecl
  | EnumDecl
  | UnionDecl
  | RawDecl
  | ValueClassRefDecl
  | DelegateDecl;

/**
 * vocabulary #12's `equals` relation — a two-direction set equality with
 * its own message per direction and its own path grain per direction
 * (ch8-C16's measured form: the used-but-undeclared finding reports at
 * the container, the declared-but-unused finding at the entry).
 */
export interface EqualsRuleDecl {
  readonly tag: string;
  readonly rows: readonly string[];
  readonly relation: "equals";
  readonly left: Selector;
  readonly right: Selector;
  readonly missingFromLeft: { readonly at: FindingPathTemplate; readonly message: MessageTemplate };
  readonly missingFromRight: { readonly at: FindingPathTemplate; readonly message: MessageTemplate };
  readonly dependsOn?: readonly string[];
  /** vocabulary #14, as on `MembershipRule`: an operand that was never
   * evaluated is a reported failure unless the absence is declared
   * legitimate here. */
  readonly whenOperandAbsent?: "skip";
}

/**
 * D3 — the NORMALIZER's declared hooks. A declaration says what is legal;
 * it does not compute a value, so derivation is named here and realized in
 * `normalizer.ts`, never in the validator. Each hook is a named capability
 * with its ratified rows; adding one is D7 format growth, not an edit.
 */
/**
 * ONE edge class an `expandAdvancesRound` hook expands over (ADR-019 D13,
 * user-ratified 2026-08-16 — the hook arm's declared attribute WIDENED, an
 * existing attribute at a new grain rather than a new construct).
 *
 * The edge map is an open map on the entry; what its VALUE holds differs
 * per class, so the extraction is declared rather than guessed: `targetAt`
 * absent means the value IS the target (`transitions`, `onResume`), and
 * `targetAt: "target"` means the target sits under that key of the edge
 * value (`decisions`). Both halves are resolved at declaration load.
 */
export interface EdgeSourceDecl {
  /** The entry's own field holding the edge map. */
  readonly from: string;
  /** The key inside an edge VALUE that holds the target id. Absent = the
   * edge value is itself the target. */
  readonly targetAt?: string;
}

export type NormalizerHookDecl =
  | {
      readonly tag: string;
      readonly rows: readonly string[];
      readonly hook: "expandAdvancesRound";
      /** The open map of entries the flag map is expanded per. */
      readonly over: NormalizerPath;
      /** The entry's edge maps, relative to the entry — ONE per edge class
       * (ch14-C11's widening: `transitions`, `decisions`, `onResume`). */
      readonly edges: readonly EdgeSourceDecl[];
      /** The declared advancing set. */
      readonly advanceSet: NormalizerPath;
      /** The produced sibling field. */
      readonly into: string;
    }
  | {
      readonly tag: string;
      readonly rows: readonly string[];
      /**
       * ADR-019 D7 (amended 2026-08-09 — the CONSTRUCT flavour): LIFT a
       * list that lives NESTED inside a format-open map onto a sibling
       * field of the enclosing entry, materializing the EMPTY LIST where
       * no source was authored. The first nested-source derivation: the
       * source is not a field of the entry but a typed field (D11's typed
       * subset) of one of the entry's fields, which is what makes it
       * derivation rather than a plain `default:`.
       *
       * The PRODUCER MONOPOLY holds, as on `expandAdvancesRound`: the
       * produced field is recomputed from the authored source and
       * overwrites whatever the input carried. The nested source itself
       * is left untouched — the lifted list is a SIBLING, never a
       * replacement.
       */
      readonly hook: "liftNestedList";
      /** The open map whose entries carry the nested source. */
      readonly over: NormalizerPath;
      /** The entry's own field whose value holds the source, relative to
       * the entry. */
      readonly from: string;
      /** The source list's key inside that field's value. */
      readonly source: string;
      /** The produced sibling field on the entry. */
      readonly into: string;
    }
  | {
      readonly tag: string;
      readonly rows: readonly string[];
      readonly hook: "materializeEffectiveConfigs";
      /** The open map of pipelines whose members carry a delegated config. */
      readonly over: NormalizerPath;
      /** The binding fields carried into the admitted form verbatim. */
      readonly carry: readonly string[];
      /** The produced field the effective config lands in. */
      readonly into: string;
    };

/**
 * The SUBSTRATE block (audit §2.3): how bytes become a value graph. Its
 * obligations are declared here as data; the yaml library realizes them,
 * which is why their WORDING is residual R6 (library-owned) rather than
 * engine parity.
 */
export interface SubstrateDecl {
  /** ch8-C6: the read stage's decode wording. */
  readonly read: SubstrateBranch & { readonly message: MessageTemplate };
  readonly parse: {
    /** ch8-C34: the only accepted `%YAML` directive version, and the
     * finding a different one produces (`{key}` is the authored one). */
    readonly directive: SubstrateBranch & {
      readonly only: string;
      readonly message: MessageTemplate;
    };
    /** ch8-C4: the duplicate-key wording. */
    readonly duplicateKeys: SubstrateBranch & { readonly message: MessageTemplate };
  };
  /** ch8-C5: the resolved graph must be acyclic, and the finding it
   * yields at the cycle's path. */
  readonly resolve: { readonly graph: SubstrateBranch & { readonly message: MessageTemplate } };
  /** ch8-C23: the CLOSED issue-code namespace. Every `code` any node in
   * the surface declares must be a member — checked at declaration load. */
  readonly codes: SubstrateBranch & { readonly values: readonly string[] };
  /** ch8-C22/C36: the every-stage belt's own finding. */
  readonly internalFailure: SubstrateBranch & {
    readonly path: string;
    readonly message: MessageTemplate;
  };
}

/**
 * Every substrate branch is TAG-ADDRESSABLE, for the same reason every
 * node is (design review F6): D4's contract form is "decisions plus
 * declaration pointers", and a branch with no tag is an authority a
 * ratified row can only cite by repeating its text — which is the one
 * thing D4 forbids.
 */
export interface SubstrateBranch {
  readonly tag: string;
  readonly rows: readonly string[];
}

/** One declared surface: substrate + node tree + the named residual's
 * declarable halves. */
export interface SurfaceDecl {
  readonly substrate: SubstrateDecl;
  readonly root: NodeDecl;
  readonly valueClasses: Readonly<Record<string, NodeDecl>>;
  readonly crossRules: readonly EqualsRuleDecl[];
  readonly normalizers: readonly NormalizerHookDecl[];
}
