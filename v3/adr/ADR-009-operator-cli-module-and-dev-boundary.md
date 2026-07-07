# ADR-009: the operator CLI module and the dev entrypoint boundary

Status: accepted
Date: 2026-07-08
Links: supersedes — · amends ADR-001, ADR-005 · depends-on ADR-000 · related ADR-003, ADR-004

Ratified at the ch6-P4a pre-approval (plan §6.5; two refine rounds).

## Context

PI-2's operator CLI needs a code home. Three tensions force a decision:
(1) the CLI is an IO shell — unlike the port-parametric kernel it must
touch argv, env, stdout, timers and crypto sources, so ADR-001's module
map needs a row with its own import stance; (2) the dev verbs (fixture
injection, trace replay, pass-through bundle dump) NEED the testkit,
which ADR-005 categorically bans from production — a lint concession
would erode the ban, so the exemption must be structural; (3) v3 source
uses `.js` specifiers (the compiled-style ESM convention), which Node's
native type-stripping cannot resolve to `.ts` files, so the shipped
entrypoint needs a runner without adding a v3 dependency.

## Decision

- **`cli/` is a top-level v3 module** (amends ADR-001's map): the thin
  operator client — formatting, defaults, wiring, ZERO semantics. It
  may import the production modules and node builtins; testkit/ and
  drift/ stay banned (the production lint entry now includes
  `src/cli/**`).
- **The dev CLI boundary** (amends ADR-005): `src/cli/dev/**` is the
  ONE structural exemption — a SEPARATE entrypoint (own bridge script,
  lands with P4b) that may import testkit. The normal CLI graph must
  not reach testkit even transitively; the exemption is an
  entry-`ignores` in the lint config, negative-tested in BOTH
  directions with executed probes.
- **Write boundary:** no code under `src/cli/**` (dev included) calls
  a StorePort write directly — `no-restricted-syntax` bans
  `.commitTransition(` / `.createInstance(` call shapes there. Writes
  enter through `kernel.startInstance` and `ingress.submit` only (the
  packet's write-entrypoint matrix).
- **Tooling:** argument parsing is stdlib `node:util` `parseArgs`;
  ZERO new dependencies anywhere. Activation is the ROOT bridge script
  `pnpm v3:cli` running the root-side `tsx` (already a root dev
  dependency for v1 tooling); the v3 package itself stays
  dependency-clean.
- **Policy binding home:** the normal CLI binds the production
  `redactPayloadsPolicy` (ADR-005's testkit home keeps the named
  pass-through out of its graph); `REV-BUNDLE-DEFAULT-POLICY` is
  verified on the diff at review, pass-through appears only under
  `cli/dev/` (P4b).
- **Config ownership:** `cli/runtime.ts` owns the production bindings
  (wall clock, crypto id/nonce, real poll timer); the main resolver
  owns the config matrix — `--db` > `PAIRFLOW_V3_DB`, missing = usage
  (exit 2), while store-OPEN failures stay internal (exit 1) so the
  ADR-003 fail-closed character remains loud.

## Alternatives Considered

- **Dev verbs in the normal CLI behind a flag** — one entrypoint, but
  the testkit lands in the production import graph; exactly what
  ADR-005 exists to prevent. Rejected.
- **Lazy `import()` of testkit for dev verbs** — hides the edge from
  the static module graph the lint boundary lives on. Rejected at the
  chapter ratification.
- **A CLI arg-parsing library** — violates the zero-new-deps stance
  (ADR-002 stdlib culture) for a shape `parseArgs` covers. Rejected.
- **`node --experimental-strip-types` as the runner** — cannot resolve
  `.js`-specifier imports to `.ts` sources; switching v3 to `.ts`
  specifiers is a package-wide churn for no semantic gain. Rejected.

## IC-N Screen (mandatory)

No — a thin client and a module boundary touch none of the banned
kernel shapes, and the CLI adds zero kernel semantics (every write
re-enters through the existing bootstrap and ingress surfaces).

## Consequences

- Positive: the dev/production split is structural and lint-enforced;
  the operator surface activates the whole ch-6 floor with one wiring
  point (`runtime.ts`); op identity on the operator path gets its
  ADR-004 nonce family consumer.
- Negative: the builtin template is an MD-1 production COPY of the
  testkit fixture (drift-pinned by test; ch 8 retires both) — a known,
  recorded duplication.
- Neutral: the exit-code / error-doc contract is CLI-owned surface
  (packet matrices), not kernel contract.

## Verification

`cli/cli.test.ts` — the runtime-config, parse-contract, exit-class and
channel-rule matrices plus the last-mile smoke on the shipped
entrypoint; `cli/templates.test.ts` — the MD-1 drift-pin; four executed
lint probes (cli→testkit red, cli/dev→testkit clean, both StorePort
write shapes red), recorded in the packet build record.

## Related

Plan §6.5 + packet ch6-p4a; ADR-001 (module map), ADR-005 (testkit
ban), ADR-004 (operator nonce family), ADR-003 (fail-closed store
open); `REV-BUNDLE-DEFAULT-POLICY` (packet ch6-P3).
