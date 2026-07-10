# ADR-012: the yaml package — the first v3 runtime dependency

Status: accepted
Date: 2026-07-10
Links: supersedes — · amends ADR-002 · depends-on ADR-011 · related ADR-009

Draft-lane ADR (README §4 step 5): rode the `ch8-template-format`
contract-draft — `proposed` with the draft's content commit, flipped
`accepted` by the draft's human ratification act of 2026-07-10 (the
ratification IS the acceptance; recorded content commit 9ea630a0).

## Context

Plan chapter 8 fixes the template authoring format as YAML with
YAML 1.2 semantics (D2, ratified 2026-07-10 — the deciding requirement
is inline multiline instruction prose via block scalars). Node has no
builtin YAML parser, and ADR-002's stance (with ADR-009 restating it:
"ZERO new dependencies anywhere") has kept the v3 package
dependency-clean so far. A YAML format therefore forces the package's
FIRST runtime dependency — a decision, not a drift.

## Decision

**`yaml` (eemeli/yaml), major version 2**, as a regular dependency of
the v3 package — probed at 2.9.0 (2026-07-10, the draft's substrate
probe record):

- **YAML 1.2 core schema by default** — the 1.1 coercion trap
  (`on`/`yes`/`no`/`off` → boolean) does not exist (probe P1); this is
  exactly the hazard that forced omnigent to patch its loader.
- **Zero transitive dependencies** (`npm ls yaml --all`: one package)
  — the supply-chain surface is a single, widely-used,
  actively-maintained library.
- **The document API exposes what the contract needs**: duplicate keys
  and multi-document streams as errors, unresolved custom tags as
  warnings (which draft row C2 promotes to errors, fail-closed), parse
  positions (line/col), and a built-in alias-amplification guard
  (probes P2, P5–P9).
- **Scope:** imported ONLY by `src/definition/` (ADR-011's module) —
  the kernel and every other production module never see it; the
  ADR-001 kernel allowlist already bans it structurally.

This ADR AMENDS ADR-002: the stdlib-only stance becomes
"stdlib-first — a runtime dependency requires its own accepted ADR";
this file is the first such record. ADR-009's "ZERO new dependencies
anywhere" line described the ch-6 decision context and is read WITH
this amendment from ch-8 on.

## Alternatives Considered

- **JSON (zero-dep)** — rejected at the ch-8 ratification (D2): no
  comments and escaped-`\n` multiline strings make prompt-heavy
  templates materially worse to author; the user's deciding
  requirement was inline multiline prose.
- **Hand-rolled YAML-subset parser** — a large correctness surface
  (exactly what the probe record shows: chomping, tags, aliases,
  number forms) re-implemented without the ecosystem's test corpus;
  worse supply-chain math than one audited dependency. Rejected.
- **`js-yaml`** — YAML 1.1 semantics by default (the coercion trap is
  the default); 1.2 requires schema juggling. Rejected.
- **Vendoring the parser** — freezes upstream fixes and inflates the
  repo for no trust gain over a pinned lockfile entry. Rejected.

## IC-N Screen (mandatory)

No — a parsing library confined to `src/definition/` touches none of
the banned kernel shapes; the kernel consumes the unchanged
`DefinitionStore` port and never imports the dependency (lint-enforced
by the ADR-001 allowlist, static + dynamic forms).

## Consequences

- Positive: the authoring surface gets comfortable multiline prose;
  1.2 semantics kill the classic YAML traps by default; the
  dependency is structurally confined to one module.
- Negative: the package loses its zero-dependency property —
  `pnpm audit` surface and upgrade cadence now exist; mitigated by
  the single-module confinement and the lockfile pin.
- Neutral: canonicalization/digest culture is unaffected — digests
  operate on the emit path's canonical JSON, never on template file
  bytes.

## Verification

The draft's probe record (P1–P23, `scratchpad/yaml-probe/*.mjs`
transcribed into the draft's Context); at ch8-P1: the dependency
lands with the lockfile pin, the parser-behavior contract rows
(C1–C6, C34–C35) are driven as tests against the REAL library, and
the lint probes prove the kernel/production boundary (static +
dynamic) stays red for `definition/`-external imports of the package.

## Related

The `ch8-template-format` contract-draft (C1–C6, C33–C36); plan §8.3;
ADR-011 (the importing module); ADR-002 (amended — stdlib-first);
ADR-009 (the prior zero-deps restatement, now read with this
amendment).
