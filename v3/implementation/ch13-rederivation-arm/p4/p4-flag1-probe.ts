/**
 * P4 Flag-candidate #1 — executed probe (2026-08-08).
 *
 * Question: can the CURRENT vocabulary express the superseded ch13-C4
 * position — a typed `promptConcernRefs` list INSIDE the format-open
 * agentConfig (`map.plain`) — and what happens when an author tries?
 *
 * P1: the belt composition at a map.fixed position (the ch13-C6 analog)
 *     — expected to WORK with the existing vocabulary incl. validKeysOf.
 * P2: the same ref list nested inside a map.plain position (the ch13-C4
 *     shape) — expected: NO lane reaches it; zero findings from the
 *     position on both channels.
 * P3: a map.plain node carrying a runtime `fields` attribute (illegal at
 *     the type level, present at runtime) — measures whether defineSurface
 *     refuses it or it loads and silently validates nothing.
 */
import { parseDocument } from "/Users/felho/dev/pairflow/node_modules/yaml/dist/index.js";
import { runSurface } from "/Users/felho/dev/pairflow/v3/src/definition/schema/engine.ts";
import type { EngineChannel } from "/Users/felho/dev/pairflow/v3/src/definition/schema/engine.ts";
import { defineSurface } from "/Users/felho/dev/pairflow/v3/src/definition/schema/defineSurface.ts";
import { templateFormat } from "/Users/felho/dev/pairflow/v3/src/definition/schema/templateFormat.ts";
import type { NodeDecl, SurfaceDecl } from "/Users/felho/dev/pairflow/v3/src/definition/schema/vocabulary.ts";

const rows = ["probe"] as const;
const noCatalog = { resolve: () => null };

const catalogNode: NodeDecl = {
  kind: "map.open",
  tag: "d-ctxblocks",
  rows,
  containerMessage: "contextBlocks must be a map of block-id -> entry; got {value}",
  keyClass: {
    kind: "string",
    tag: "d-block-id",
    rows,
    typeMessage: "invalid context block id {valueJson}",
    grammar: { re: "^[a-z][a-z0-9-]*$", message: "invalid context block id {valueJson}; expected {grammar}" },
  },
  keyLaneAt: "container",
  entry: {
    kind: "map.fixed",
    tag: "d-ctx-entry",
    rows,
    containerMessage: "a context block entry must be a map with exactly body; got {value}",
    unknownMessage: "unknown key {value}",
    fields: {
      body: {
        kind: "string",
        tag: "d-ctx-body",
        rows,
        presence: { required: true },
        typeMessage: "body must be a nonempty string; got {value}",
        nonempty: { message: "body must be a nonempty string" },
      },
    },
  },
};

const blockRefList: NodeDecl = {
  kind: "list",
  tag: "d-ctx-refs",
  rows,
  containerMessage: "contextBlockRefs must be a list of block ids; got {value}",
  memberLaneAt: "index",
  member: {
    kind: "string",
    tag: "d-ctx-ref-member",
    rows,
    typeMessage: "invalid context block id {valueJson}",
    grammar: { re: "^[a-z][a-z0-9-]*$", message: "invalid context block id {valueJson}; expected {grammar}" },
  },
  unique: { grain: "perOccurrence", at: "index", message: "duplicate context block ref {valueJson}" },
  memberOf: {
    relation: "memberOf",
    target: { validKeysOf: "$.contextBlocks" },
    code: "unresolved_context_block_ref",
    message: "context block ref {valueJson} does not resolve to an entry",
  },
};

function surfaceWith(fields: Record<string, NodeDecl>): SurfaceDecl {
  return {
    substrate: templateFormat.substrate, // lifted whole — the round-10 USABILITY-2 pattern
    root: {
      kind: "map.fixed",
      tag: "d-probe-root",
      rows,
      containerMessage: "root must be a map",
      unknownMessage: "unknown key {value}",
      fields,
    },
    valueClasses: {},
    crossRules: [],
    normalizers: [],
  };
}

function run(surface: SurfaceDecl, value: unknown, channel: EngineChannel = { kind: "direct" }) {
  return runSurface(surface, value, { channel, catalog: noCatalog }).findings;
}

function both(surface: SurfaceDecl, label: string, value: unknown, yamlText: string) {
  const direct = run(surface, value);
  const doc = parseDocument(yamlText);
  const file = run(surface, doc.toJS({ mapAsMap: true }), { kind: "file", doc, source: yamlText });
  console.log(
    label,
    JSON.stringify({ direct, file, agree: JSON.stringify(direct) === JSON.stringify(file) }),
  );
}

// ---------------------------------------------------------------------------
// P1 — the ch13-C6 analog: refs at a FIXED-map position, belt via validKeysOf.
// ---------------------------------------------------------------------------
const p1 = defineSurface(
  surfaceWith({
    contextBlocks: catalogNode,
    binding: {
      kind: "map.fixed",
      tag: "d-probe-binding",
      rows,
      containerMessage: "binding must be a map",
      unknownMessage: "unknown key {value}",
      fields: { contextBlockRefs: blockRefList },
    },
  }),
);

both(p1, "P1_resolving", { contextBlocks: { alpha: { body: "text" } }, binding: { contextBlockRefs: ["alpha"] } },
  'contextBlocks:\n  alpha:\n    body: text\nbinding:\n  contextBlockRefs:\n    - alpha\n');
both(p1, "P1_belted_empty_entry", { contextBlocks: { alpha: {} }, binding: { contextBlockRefs: ["alpha"] } },
  "contextBlocks:\n  alpha: {}\nbinding:\n  contextBlockRefs:\n    - alpha\n");
both(p1, "P1_wrong_kind_catalog", { contextBlocks: ["alpha"], binding: { contextBlockRefs: ["alpha"] } },
  "contextBlocks:\n  - alpha\nbinding:\n  contextBlockRefs:\n    - alpha\n");
both(p1, "P1_absent_catalog", { binding: { contextBlockRefs: ["alpha"] } },
  "binding:\n  contextBlockRefs:\n    - alpha\n");
both(p1, "P1_duplicates", { contextBlocks: { alpha: { body: "text" } }, binding: { contextBlockRefs: ["alpha", "alpha", "alpha"] } },
  'contextBlocks:\n  alpha:\n    body: text\nbinding:\n  contextBlockRefs:\n    - alpha\n    - alpha\n    - alpha\n');

// ---------------------------------------------------------------------------
// P2 — the ch13-C4 shape: the SAME ref list nested inside map.plain.
// ---------------------------------------------------------------------------
const p2 = defineSurface(
  surfaceWith({
    contextBlocks: catalogNode,
    agentConfig: {
      kind: "map.plain",
      tag: "d-probe-agentconfig",
      rows,
      containerMessage: "agentConfig must be a map; got {value}",
      canonicalJsonSafe: { message: "agentConfig must be canonical-JSON-safe" },
    },
  }),
);

both(p2, "P2_ghost_ref_inside_plain",
  { contextBlocks: { alpha: { body: "text" } }, agentConfig: { promptConcernRefs: ["ghost", 123, "Bad Id"] } },
  'contextBlocks:\n  alpha:\n    body: text\nagentConfig:\n  promptConcernRefs:\n    - ghost\n    - 123\n    - Bad Id\n');

// ---------------------------------------------------------------------------
// P3 — the sneak-in: a runtime `fields` attribute on map.plain. Type-illegal
// (cast to bypass), measured at runtime: refused, or loaded-and-inert?
// ---------------------------------------------------------------------------
const plainWithFields = {
  kind: "map.plain",
  tag: "d-probe-agentconfig",
  rows,
  containerMessage: "agentConfig must be a map; got {value}",
  canonicalJsonSafe: { message: "agentConfig must be canonical-JSON-safe" },
  fields: { promptConcernRefs: blockRefList },
} as unknown as NodeDecl;

try {
  const p3 = defineSurface(surfaceWith({ contextBlocks: catalogNode, agentConfig: plainWithFields }));
  both(p3, "P3_sneaked_fields",
    { contextBlocks: { alpha: { body: "text" } }, agentConfig: { promptConcernRefs: ["ghost"] } },
    'contextBlocks:\n  alpha:\n    body: text\nagentConfig:\n  promptConcernRefs:\n    - ghost\n');
} catch (error) {
  console.log("P3_sneaked_fields", "REFUSED AT LOAD:", (error as Error).message.split("\n")[0]);
}
