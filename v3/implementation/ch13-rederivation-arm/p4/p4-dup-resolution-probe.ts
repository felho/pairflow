/**
 * P4 draft probe — duplicate x resolution interplay (old ch13-C8(e)+C7:
 * a repeat occurrence draws the duplicate finding and is EXCLUDED from
 * resolution; the FIRST occurrence carries resolution).
 * Also: non-string catalog key on the file channel (old C7's PROBE-CB2
 * discriminating case) under the new engine + belt.
 */
import { parseDocument } from "/Users/felho/dev/pairflow/node_modules/yaml/dist/index.js";
import { runSurface } from "/Users/felho/dev/pairflow/v3/src/definition/schema/engine.ts";
import type { EngineChannel } from "/Users/felho/dev/pairflow/v3/src/definition/schema/engine.ts";
import { defineSurface } from "/Users/felho/dev/pairflow/v3/src/definition/schema/defineSurface.ts";
import { templateFormat } from "/Users/felho/dev/pairflow/v3/src/definition/schema/templateFormat.ts";
import type { NodeDecl, SurfaceDecl } from "/Users/felho/dev/pairflow/v3/src/definition/schema/vocabulary.ts";

const rows = ["probe"] as const;
const noCatalog = { resolve: () => null };

const decl: SurfaceDecl = defineSurface({
  substrate: templateFormat.substrate,
  root: {
    kind: "map.fixed",
    tag: "root",
    rows,
    containerMessage: "root map",
    unknownMessage: "unknown {value}",
    fields: {
      contextBlocks: {
        kind: "map.open",
        tag: "cat",
        rows,
        containerMessage: "contextBlocks must be a map; got {value}",
        keyClass: {
          kind: "string",
          tag: "cat-key",
          rows,
          typeMessage: "invalid context block id {valueJson}",
          grammar: { re: "^[a-z][a-z0-9-]*$", message: "invalid context block id {valueJson}" },
        },
        keyLaneAt: "container",
        entry: {
          kind: "map.fixed",
          tag: "entry",
          rows,
          containerMessage: "entry must be a map; got {value}",
          unknownMessage: "unknown key {value}",
          missingMessage: 'missing required key "{key}"',
          fields: {
            body: {
              kind: "string",
              tag: "body",
              rows,
              presence: { required: true },
              typeMessage: "body must be a nonempty string",
              nonempty: { message: "body must be a nonempty string" },
            },
          },
        },
      },
      refs: {
        kind: "list",
        tag: "refs",
        rows,
        containerMessage: "refs must be a list",
        memberLaneAt: "index",
        member: {
          kind: "string",
          tag: "ref",
          rows,
          typeMessage: "invalid context block id {valueJson}",
          grammar: { re: "^[a-z][a-z0-9-]*$", message: "invalid context block id {valueJson}" },
        },
        unique: { grain: "perOccurrence", at: "index", message: "duplicate context block ref {valueJson}" },
        memberOf: {
          relation: "memberOf",
          target: { validKeysOf: "$.contextBlocks" },
          code: "unresolved_context_block_ref",
          message: "context block ref {valueJson} does not resolve to an entry",
        },
      },
    },
  },
  valueClasses: {},
  crossRules: [],
  normalizers: [],
});

function run(value: unknown, channel: EngineChannel = { kind: "direct" }) {
  return runSurface(decl, value, { channel, catalog: noCatalog }).findings;
}

// 1) duplicated GHOST ref: does the unresolved lane fire per occurrence or
//    only at the first (old C8(e): repeats excluded from resolution)?
console.log("DUP_GHOST", JSON.stringify(run({ refs: ["ghost", "ghost"] })));
// 2) duplicated RESOLVING ref: dup findings only.
console.log("DUP_OK", JSON.stringify(run({ contextBlocks: { alpha: { body: "x" } }, refs: ["alpha", "alpha"] })));
// 3) shape-failing duplicate: co-fires shape + dup on the same index
//    (old C8(e): per-defect-class findings)?
console.log("DUP_BAD_SHAPE", JSON.stringify(run({ refs: ["Bad", "Bad"] })));
// 4) PROBE-CB2 class on the FILE channel: a bare `true:` key beside the
//    grammar-valid ref "true" — non-string key preserved (mapAsMap), belt
//    must treat "true" as unresolved (SameValueZero: "true" != true).
const yaml = 'contextBlocks:\n  true:\n    body: x\nrefs:\n  - "true"\n';
const doc = parseDocument(yaml);
console.log(
  "NONSTRING_KEY_FILE",
  JSON.stringify(run(doc.toJS({ mapAsMap: true }), { kind: "file", doc, source: yaml })),
);
// 5) grammar-failing STRING key with no ref naming it: key lane fires;
//    a shape-passing ref cannot address it (one shared grammar) — vacuous
//    leg; and a ref naming a VALID sibling still resolves.
console.log(
  "BAD_KEY_SIBLING",
  JSON.stringify(run({ contextBlocks: { BAD: { body: "x" }, ok: { body: "y" } }, refs: ["ok"] })),
);
