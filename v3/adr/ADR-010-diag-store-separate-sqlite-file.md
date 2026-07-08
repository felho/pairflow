# ADR-010: the diag store is a separate SQLite file, fail-open

Status: accepted
Date: 2026-07-09
Links: supersedes — · amends ADR-006 · depends-on ADR-003 · related ADR-001

## Context

Chapter 7 persists the non-authoritative diagnostic channel (PI-4 / memo
Addendum 2 B1). Its store must never be able to corrupt, block, or leak
into the authoritative commit path: a diag failure is invisible to every
`Outcome` and every committed read surface. The question is WHERE the
diagnostic rows live relative to the main store, and how the store's open
fence behaves when the channel's own file is hostile.

## Decision

**One SQLite file PER CHANNEL.** The diagnostic events live in a
PHYSICALLY separate SQLite database (`<main-db>.diag.sqlite`, the naming
realized at the CLI in P4, §7.5), not a table in the main store. This
makes the separation claim structural: a diag row cannot enter a
committed surface by construction, there is no write-lock contention with
the authoritative commit path (SQLite is single-writer per database), and
a corrupt diag DB cannot touch the main path (failure isolation).

- **Driver:** `node:sqlite` (`DatabaseSync`), the same as the main store.
  **This ADR AMENDS ADR-006:** the driver-visibility rule widens from
  "invisible outside `store/`" to "invisible outside the SQLite-backed
  substrate homes (`store/` + `diag/`)". ADR-006 gets the amended-by
  marker in the same commit.
- **WAL** on file-backed paths (skipped for `:memory:`).
- **`ordinal` = `INTEGER PRIMARY KEY AUTOINCREMENT`** — strictly
  increasing, never reused within a stream; NO CAS and NO uniqueness
  contract (the channel is non-authoritative by type; identical bodies
  are distinct rows). `sqlite_sequence` is the substrate's own artifact,
  excluded from every application-table-set assertion by name.
- **`open` NEVER throws** — the ADR-003 fence transposed to FAIL-OPEN.
  The wipe fence itself is UNCHANGED (wipe only on a known prototype
  marker with a moved schema version; unreadable/incomplete/non-prototype
  markers are refused, file intact); but refusal DEGRADES the handle to
  an unavailable state instead of throwing. The main store fails CLOSED
  (open refuses loudly, the CLI dies); the diag store fails OPEN (the
  main path lives).
- **Open order: schema fence FIRST, WAL PRAGMA LAST** — a deliberate
  divergence from `openStore`'s WAL-first order. The PRAGMA is a
  potential journal-mode-switch WRITE and must not precede the fence on
  hostile/readonly states; WAL is a persistent file property, so setting
  it once the schema settles is equivalent.
- **Own schema marker starting at "1"** — the diag store versions
  INDEPENDENTLY of the main store (whose "2" is untouched).

## Alternatives Considered

- **A diagnostics table in the main store** — rejected: it puts
  non-authoritative writes on the authoritative single-writer database
  (lock contention against commits), and makes the separation a
  convention the code must uphold rather than a structural fact.
- **Fail-closed diag open (reuse the main fence verbatim)** — rejected:
  a hostile diag file would then kill the main path, inverting the
  channel's entire purpose (observation must never harm the observed).
- **A queue / async-drain write contract** — declined (packet flag 3):
  a new contract class with its own loss-window semantics, unjustified
  before any operator need; the sync inline write is the driver's reality.

## IC-N Screen (mandatory)

No — a storage-topology and driver-visibility decision. It touches no
banned kernel shape (no deterministic actor replay, no leader-per-shard,
no event-sourcing source of truth, no reconciler/outbox for kernel
state). The diag store is observation-only and holds no authority.

## Consequences

- Positive: the separation claim is structural, not conventional; a diag
  failure is provably isolated from the commit path; no lock contention.
- Positive: the fail-open open fence keeps the main path alive against
  any diag-file state (missing, corrupt, refused, readonly).
- Negative: a second SQLite file to manage (retention/rotation is §7.1
  out-of-scope); `ordinal` beyond 2^53 is ruled out, not handled (flag 4).
- Neutral: the driver is now visible in two substrate homes (`store/` +
  `diag/`), not one — the ADR-006 amendment records exactly that.

## Verification

The packet ch7-P2 store suite: the open-outcome × availability matrix
(O1–O10) drives fresh/normal/fenced-wipe and every hostile lane
(refused-marker, garbage, directory, readonly DROP/WAL/CREATE) to the
declared availability; the fail-open PRODUCT test runs real kernel +
ingress + main store against a corrupt diag DB and asserts every
`Outcome` and committed read surface is deep-equal to a noop-sink twin;
the separation twin-run asserts the diag file's application table set is
exactly `meta` + `diagnostics` and the main store is byte-identical.

## Related

Plan §7.1–§7.4 · packet ch7-P2 · ADR-003 (fence) · ADR-006 (driver) ·
ADR-001 (module homes).
