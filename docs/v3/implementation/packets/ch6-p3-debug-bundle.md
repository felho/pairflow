# Task Packet: ch6-P3 — Debug bundle + `RedactionPolicy`

Plan step: plan.md §6.4. Autonomy stage: calibration — **pre-approve**
(first-of-a-kind: redaction boundary). Approved after one refine round
(three findings: the overstated structural claim, the nested schema
lock, `eventId`).

**Scope statement (approval watchpoint, binding): FOUNDATION ONLY** —
this packet delivers the bundle format, the policy seam, and the two
named policies. The operator/dev bundle-dump verb activates in P4.

## Ledger slice (declared — feeds the coverage accounting)

```json
{
  "ledger_slice": {
    "units": [],
    "rejections": [],
    "invariants": [],
    "traces": [],
    "shared_ownership": []
  }
}
```

(Empty by design — the P1/P2 precedent. The one export-adjacent unit,
`complete-pseudocode/archive_or_export`, is LC4/purge territory, NOT
this bundle — plan §6.6.)

## Claim + dimensions (chapter rule 1 — enumerated BEFORE deriving)

**Claim (stated wide):** the DEFAULT bundle contains NO payload
material anywhere in its serialized output; it carries one run's
complete committed METADATA read from the store ONLY (env/runtime
material cannot enter by construction); it records its policy id and
format version; the rejected-inputs gap is explicit; the same store
state exports deterministically identical bundles.

1. **Redact-by-default, negative from the wide claim** — marker
   strings planted in payloads (committed through the REAL kernel,
   nested levels included) appear NOWHERE in `JSON.stringify(bundle)`
   — a full-output scan, not a field check (build watchpoint 1).
2. **Metadata completeness** — every row's seq / payloadDigest /
   committedAt / op metadata mirrors the store; `hasPayload` flags
   correct on payload-bearing and payload-less ops; **`eventId`**
   (refine finding 3) present exactly where the committed envelope
   carried it; instance state equals the store's.
3. **Pass-through = explicit opt-in** — under the testkit policy the
   payloads round-trip exactly against `getInstanceDetail`'s
   transcript, and `bundle.policy` records `dev-passthrough`; a
   payload-less op stays payload-less.
4. **Unknown instance → `null`** (the §6.2 read-surface duality; the
   P4 CLI maps it to "no such run").
5. **Closed schema at EVERY level** (refine finding 2) — the canonical
   schema matrix below is the SINGLE source of the keyset tests (build
   watchpoint 2): exact keysets for bundle / instance / row /
   rejectedInputs; required ⊆ keys ⊆ allowed for the envelope meta
   with its optionals. Checked under BOTH policies.
6. **Rejected-inputs section** — present, explicitly
   `{ status: "absent", reason: "diagnostic channel lands ch 7" }` — a
   stated gap, never a silent one.
7. **Determinism** — two exports of the same store state are
   string-identical (no clock read, no randomness on the bundle path).

## Canonical bundle schema matrix (the single source — P4's JSON/dump consumer reads THIS)

| Level | Keys |
|---|---|
| bundle | `formatVersion` (=1), `policy`, `instance`, `transcript`, `rejectedInputs` — exactly |
| `instance` | `instanceId`, `templateRef`, `task`, `binding`, `currentStep`, `round`, `status`, `version` — exactly |
| `transcript[i]` | `seq`, `committedAt`, `payloadDigest`, `envelope` — exactly |
| `transcript[i].envelope` | required: `instanceId`, `opId`, `type`, `actorId`, `hasPayload`; optional: `expectedVersion`, `eventId`, `payload` (ONLY when `hasPayload` AND the policy admits) |
| `rejectedInputs` | `status: "absent"`, `reason` — exactly |

## Operative material

- **The guardrail, stated precisely (refine finding 1):** the
  `RedactionPolicy` seam (`ports/redaction.ts`) is public — custom
  implementations are possible by construction. P3 ships exactly TWO
  named policies: the production default **`redactPayloadsPolicy`**
  (floor-side: payloads OMITTED; `hasPayload` + `payloadDigest` remain
  as the fingerprint) and the testkit-only
  **`devPassthroughRedactionPolicy`** — the testkit home keeps the
  named pass-through OUT of the normal production import graph
  (ADR-005 lint). The binding obligation is review-owned:
  **REV-BUNDLE-DEFAULT-POLICY** — P4's normal CLI graph binds the
  default; pass-through appears only under `cli/dev/` (a mandatory row
  in the P4 pre-approval matrix; the ADR-009 dev-boundary lint keeps
  the testkit export unreachable from the normal graph).
- Factory shape (the P2 pattern): `createDebugBundleExporter(store,
  policy)` in `floor/debugBundle.ts`; `Floor` stays seam-free.
- The bundle reads through `getInstanceDetail` ONLY — one store read,
  one snapshot-shape question deferred exactly as P1's boundary note
  left it.
- No kernel / ingress / emit / store / schema change.

## Embedding gates (v1-inherited)

- Target files: `v3/src/ports/redaction.ts` (new) + `ports/index.ts`,
  `v3/src/floor/debugBundle.ts` (new) + `floor/index.ts`,
  `v3/src/floor/debugBundle.test.ts` (new),
  `v3/src/testkit/redaction.ts` (new) + `testkit/index.ts`,
  `docs/v3/implementation/plan.md` (§6.4 aligned-at-ch6-P3 line), this
  packet file.
- Mutation boundary: exactly those. No ripple (StorePort / Floor /
  kernel untouched).

## Acceptance

- Dimensions 1–3 against the real store + real kernel (payload-bearing
  commits, nested markers, `eventId` mix); 4–7 on the real store; the
  schema walk under both policies, driven from the matrix constants.
- All v3 bridges green; coverage unchanged on ownership axes
  (units 5/158, invariants 8/116, traces 2/20).
- Standing review rules: **REV-C-PROJECTIONS-READONLY**;
  **REV-BUNDLE-DEFAULT-POLICY** born here, enforced at the P4 review.

## Build record

Built 2026-07-08. 185 v3 tests green (179 → 185: 6 new in
`floor/debugBundle.test.ts`). One fixture correction during build (the
third seeded op was CONVERGED at a step with no such transition —
`no_transition` red caught it; switched to PASS, no terminal state
needed by any dimension). Typecheck + lint green.
