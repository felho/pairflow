# Task Packet: ch7-P2 — the diag store (separate-file SQLite sink + read surface)

Plan step: plan.md §7.3. Autonomy stage: calibration — **pre-approve**
(first-of-a-kind: the second store substrate; the fail-open proof;
§7.7).

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

Operability packet (§7.6): the diagnostic channel is memo-born (PI-4 /
Addendum 2 B1), not model pseudocode. Coverage axes unchanged — an
assertion the close verifies, not an omission.

## Claim + dimensions (enumerated BEFORE deriving)

**Claim (wide):** the diag store persists the diagnostic channel in a
PHYSICALLY separate SQLite file: every `emit(body)` either durably
appends the body's DECLARED-FIELD PROJECTION with a sink-stamped `at`
and a strictly increasing `ordinal`, or is silently dropped — `emit`
never THROWS, and no
diag-store state or failure (corrupt file, refused marker, failed
write, closed handle) can EVER change an `Outcome`, a committed row, or
any committed read surface. The READ surface never masks unavailability
as emptiness: an unavailable or corrupt diag DB is a typed, enumerated
error — NEVER `[]` — while known-empty is `[]`. And the separation is
physical, in BOTH directions, scoped to what it actually proves: no
committed read surface is ever served from the diag file, no
diagnostic table or row ever enters the main DB, and the diag file
holds ONLY the P1-declared diagnostic-event projections — event
attribution/digest FIELDS are diagnostic data BY CLASSIFICATION, never
a committed-row copy (dimension 8 draws the line).

1. **Write-half availability (fail-open):** every open-outcome lane and
   every emit-path fallible site swallows (the open-sequence and
   emit-path inventories below); the
   outcome-unchanged proof runs through REAL kernel + ingress flows
   against a corrupt diag DB — the ch7-P1 aftermath lesson: drive the
   PRODUCT (kernel flow × failing diag store), not just the sink unit.
2. **Read-half availability (fail-loud):** the §6.2 duality TRANSPOSED
   — the null/`[]` split becomes typed-error/`[]`: unavailable → typed
   error carrying an enumerated reason (the token list is a declared
   claim — every token driven); known-empty → `[]`. "Corrupt" spans
   BOTH row classes: a non-JSON `body` (R2) AND a valid-JSON body
   failing any ROW-DECIDABLE P1 rule (R3 — the read-side shape gate,
   whose decision surface is the Canonical R3 row-decidable shape
   table; without it a parse-and-cast reader would leak malformed
   events out the typed surface). There is NO null
   lane: the diag store has no instance-existence authority (the
   non-authoritative channel does not know instances) — unknown
   instance ≡ known-empty ≡ `[]`, a stated decision, not an omission.
3. **Open-outcome fencing (the ADR-003 culture transposed):** the wipe
   fence is IDENTICAL to the main store's (wipe ONLY on a known
   prototype marker with a moved schema version; unreadable/incomplete/
   non-prototype markers are REFUSED, file intact) — but refusal
   DEGRADES to the unavailable state instead of throwing: the main
   store fails CLOSED (open refuses loudly, the CLI dies), the diag
   store fails OPEN (open never throws, the main path lives). Same
   fence, inverted failure direction — inverted BY the channel's type.
4. **Stamping + ordering authority:** the SINK stamps `at` from its own
   injected `TimeSource` at emit (the CHK-C-TS-SOURCE lane —
   frozen-clock driven; the P1 recording sink deliberately does not
   stamp); `ordinal` is AUTOINCREMENT — strictly increasing, never
   reused; NO CAS and NO uniqueness contract (plan §7.3) — identical
   bodies are distinct rows (driven); insertion order is the only
   order. The monotonicity/never-reused claim is PER STREAM: the O3
   fenced wipe recreates the schema and starts a NEW stream (ordinals
   restart on the dev-fenced path — not a reuse within a stream).
5. **Round-trip fidelity:** read-back event = the emitted body's
   projection + `{at, ordinal}` (identity on canonical bodies) —
   per-kind keysets preserved exactly, no field
   added, dropped, or mutated. The three representative bodies, in
   full (the driving tests use exactly these keysets — carried here,
   not pointed at through the P1 inventory):
   - `{source:"kernel", kind:"duplicate", instanceId, opId, actorId,
     type, payloadDigest}` — a post-digest kernel lane;
   - `{source:"kernel", kind:"internal_failure", instanceId, opId,
     actorId, type, error:{name, message}}` — with a HOSTILE free-text
     `message` (quotes, unicode, a payload-marker string);
   - `{source:"ingress", kind:"rejected", reason:"invalid_shape",
     detail:"not_plain_object"}` — unattributed (no `instanceId`).
   **Fidelity is claimed for CANONICAL bodies** (type-true values, as
   kernel/ingress construct them): their values are JSON-plain BY
   ADMISSION (the ch-4 pins: no `-0`, no non-plain value can reach a
   body; versions are admitted safe integers), so the projected JSON
   round-trip is exact — stated as the fidelity basis, not re-proven
   here. For HOSTILE carriers the guarantees are the projection's, not
   fidelity: extra enumerable keys are DROPPED (driven); a carrier
   `toJSON` is never consulted (driven — the ch-4 hidden-toJSON
   precedent transposed); a type-LIED value may lose the event to the
   swallow fence — whether by a stringify throw (BigInt/cycle) OR by the
   emit-side shape gate (a JSON-serializable lie, e.g. a number where a
   string is declared — aftermath fix); fidelity for lied values is
   deliberately NOT claimed, and a lied value never writes a
   self-poisoning row.
6. **Cursor domain — a NEW validator over a numeric domain, full ladder
   [R-NUMERIC-LADDER]:** nonnegative safe integer, `-0` REJECTED via
   `Object.is` (the numeric-identity rung), `RangeError` BEFORE any SQL
   AND BEFORE the availability check — precedence driven: an invalid
   cursor on an UNAVAILABLE store is `RangeError`, not the unavailable
   error. Value lanes: `0` = full replay · mid-cursor · beyond-end =
   `[]` · negative · non-integer · non-safe integer · `NaN` ·
   `Infinity` · `-0`. **Flag 1 resolved (b):** the same `Object.is`
   rung lands on the ch-6 `getTimeline` validator in this commit —
   guard + `-0` test in the store suite — making plan §7.3's "inherits
   §6.2 (… `-0` rejected)" true at the store level.
7. **Attribution routing:** attributed rows are readable per-instance
   AND globally; unattributed rows (no `instanceId` on the body) are
   reachable ONLY via the global read — driven from both sides
   (per-instance read never returns them; global read returns them).
   `instanceId` gets NO runtime validation (parity with `getTimeline`,
   which validates only the cursor).
8. **Separation, both directions:** with the store-backed sink active
   through a full kernel flow — (a) the main DB's schema
   (`sqlite_master` table set) and every committed read surface
   (`listInstances` / `getInstanceDetail` / `getTimeline`) are
   deep-equal to a noop-sink twin run (caller-minted ids + controlled
   clock make the twin runs deterministic); (b) the diag file's
   APPLICATION table set is exactly `meta` + `diagnostics` —
   SQLite-owned internals (`sqlite_sequence`, born of AUTOINCREMENT)
   are substrate reality, excluded from the assertion BY NAME — and
   its rows are ONLY P1-declared diagnostic-event projections; the
   main store's `SCHEMA_VERSION` "2" is untouched. **The
   classification line (this is the canonical statement):** P1
   attribution/digest fields on events — `instanceId` / `opId` /
   `actorId` / `type` / `payloadDigest`, the post-success derive-throw
   lane INCLUDED, where the transition IS persisted and the event
   still carries full envelope attribution + digest (the live
   kernel's post-commit catch builds exactly that keyset) — are
   DIAGNOSTIC data by classification, never a "committed-row copy".
   Separation means no committed SURFACE serves from the diag file
   and no diag table/row lives in the main DB — never that a diag
   event's field VALUES cannot coincide with a persisted row's. This
   matches the plan's chapter-7 preamble direction-2 ("no diagnostic or
   non-committed data can EVER enter a committed read surface");
   the earlier "no committed data written into the diag file" wording
   was this packet's over-extension, not plan text (flag 8a).
9. **Zero-semantics regression:** kernel/ingress/floor/CLI source
   untouched (this packet ADDS an implementation of an existing port);
   the full existing suite (257 tests at the ch7-P1 aftermath) stays
   green.

## Canonical surface matrix (this packet IS the shape's source — memo-born)

| Surface | Contract |
|---|---|
| `openDiagStore(path, time): DiagStoreHandle` | NEVER throws — every open-sequence failure degrades to the unavailable state (open-sequence inventory + open-outcome matrix). **Open order: schema fence FIRST, WAL PRAGMA LAST** — a deliberate divergence from `openStore`'s WAL-first order (recorded in ADR-010): the PRAGMA is a potential journal-mode-switch WRITE and must never fire before the fence on hostile/readonly states; WAL is a persistent file property, so setting it after the schema settles is equivalent (fresh init runs its DDL in delete mode, then switches — one-time, harmless). WAL PRAGMA on file-backed paths, skipped for `:memory:` — driven by a `journal_mode` assert on a file-backed store; lives in `diag/` (the channel's ADR-001 reserved home) |
| `DiagStoreHandle` | `{ readonly sink: DiagnosticsSink; readonly reader: DiagnosticsReader; close(): void }` — implementation-local shape in `diag/` (the ch-4 `StoreHandle` precedent) |
| `sink.emit(body)` | synchronous inline INSERT (non-blocking NOT claimed — the P1 aligned block stands); stamps `at = time.now()` at emit; serializes an **ALLOWLIST PROJECTION** of the body — the declared `DiagnosticEventBody` keys (nested `error.name`/`error.message` included) read as own properties ONCE each into a fresh plain object, so extra enumerable keys are DROPPED and a carrier `toJSON` is never consulted; the allowlist is TYPE-LEVEL-synced to the port type (exhaustiveness-checked, the CHK-A2-IDEMKEY pattern — it cannot silently drift); the projected object is then GATED through the SAME shape validator the reader runs (R3) BEFORE the INSERT — a projection that fails it (a NON-throwing type-lie, e.g. a number where a string is declared, which `JSON.stringify` would NOT reject) is LOST to the swallow fence, never written, so the diag file holds ONLY valid projections BY CONSTRUCTION (dimension 8b; aftermath fix); `instance_id` column = the PROJECTED object's `instanceId ?? NULL` (never a second property read — no getter-torn values); swallows EVERY failure (emit-path inventory) |
| `DiagnosticsReader` (TYPE in `ports/diagnostics.ts`) | `getDiagnostics(instanceId: InstanceId, afterOrdinal: number): Promise<readonly DiagnosticEvent[]>` — the instance's ATTRIBUTED rows, ordinal-ascending, `ordinal > afterOrdinal`; `getGlobalDiagnostics(afterOrdinal: number): Promise<readonly DiagnosticEvent[]>` — ALL rows, unattributed included, same cursor semantics. Rows are SHAPE-VALIDATED on read (the emit allowlist reused — R3): the gate enforces EVERY row-decidable P1 rule per the **Canonical R3 row-decidable shape table** (the single decision surface — required/forbidden/conditional per row class), so the typed surface never leaks a malformed event; the write-side-guaranteed residue is exactly that table's three stated items (the `internal_failure` digest-point + its handle-vs-start attribution beyond the row-decidable rules, and ingress best-effort attribution beyond `not_plain_object`). Promise-based (StorePort parity) while `emit` is sync void — a deliberate asymmetry: consumers await reads, emitters never wait |
| cursor domain (both reads) | nonnegative safe integer; `-0` rejected (`Object.is`); violation = `RangeError` BEFORE any SQL and BEFORE the availability check (dimension 6 mirrors this row) |
| `DiagUnavailableReason` (TYPE in `ports/diagnostics.ts`) | `"open_failed" \| "refused_marker" \| "read_failed"` — a declared claim: every token driven; the token is the enumerated constant P3's bundle serializes as `unavailable(reason)` (plan §7.4: never the raw underlying error text) |
| `DiagUnavailableError` (CLASS in `diag/`) | `name = "DiagUnavailableError"`; `reason: DiagUnavailableReason`; `message` = UNTRUSTED free text (may embed path/driver fragments) confined to the diag channel's local surfaces (the §7.4 boundary). The cross-module contract is `(name, reason)` — consumers can match by `error.name` without a `diag/` value import (`ports/` stays type-only, ADR-007); whether P4's CLI imports the class (the ch-6 `instanceof` precedent) or name-matches is P4's call |
| `DiagnosticEvent` | the P1 read face, `DiagnosticEventBody & { at, ordinal }` (`ports/diagnostics.ts`) — this packet adds ZERO event fields; `ordinal` is a JS `number` (beyond-2^53 fidelity ruled out — flag 4) |

## Canonical open-outcome × availability matrix (every lane driven)

The chapter availability matrix (plan §7.3) rows for `tail --diag`,
`bundle`, and dev `diag` are P3/P4 lanes — named-deferred there, not
re-declared here. This matrix is P2's slice, at open-outcome
granularity:

| # | Diag file state | Sink (`emit`) | Reader (both reads) | File |
|---|---|---|---|---|
| O1 | fresh / empty (WRITABLE — the readonly-empty variant is O10) | init schema (marker v1) then works | works | created |
| O2 | prototype marker, version "1" (WRITABLE — the readonly variant is O9) | normal open, works | works | intact |
| O3 | prototype marker, version ≠ "1" (WRITABLE — the readonly moved-version variant is O8) | fenced wipe-and-recreate, then works | works (prior rows GONE — driven) | wiped |
| O4 | tables present, `meta` missing or unreadable | swallow (handle born unavailable) | `DiagUnavailableError`, `refused_marker` | INTACT — never wipe (driven) |
| O5 | marker incomplete (either key absent) | swallow | `refused_marker` | INTACT — never wipe (driven) |
| O6 | `prototype` marker ≠ "true" | swallow | `refused_marker` | INTACT — never wipe (driven) |
| O7 | not a database — TWO members, both driven: garbage bytes · path is a DIRECTORY (the constructor member) | swallow | `open_failed` | INTACT (driven) |
| O8 | READONLY **NON-WAL (delete-mode)** file whose prototype marker carries a moved version (POSIX `chmod`-staged). Under the fence-first open order the probe and marker READS succeed on a readonly delete-mode file (no sidecar writes needed — verified live on this repo's `node:sqlite`), the version mismatch routes to the wipe, and the DROP is the FIRST WRITE of the sequence — it throws readonly. Fixture: raw `DatabaseSync`, NO WAL PRAGMA, marker at a moved version, clean close, `chmod 444` | swallow | `open_failed` | INTACT — the DDL failed before mutation (driven) |
| O9 | READONLY **NON-WAL** file with a CURRENT marker (version "1") — the fence settles CLEAN (probe + marker reads succeed readonly; verified live), then the WAL PRAGMA (last) attempts the journal-mode-switch WRITE and throws. The fence is ALL-OR-NOTHING by decision: a readable-but-unwritable diag DB is UNAVAILABLE — a read-only diag mode is deliberately NOT an affordance (an unclaimed surface, stated). Fixture: the O8 family with a current marker | swallow | `open_failed` | INTACT (driven) |
| O10 | READONLY **EMPTY** file — the probe read succeeds (`0` tables → the fresh-INIT route), and the init `CREATE` is the first write to fire; it throws readonly (verified live: probe `n=0`, `CREATE` throws). The init BRANCH is distinct from the wipe branch — O8 drives the `DROP`, this lane drives the `CREATE`. Fixture: zero-byte file, `chmod 444` | swallow | `open_failed` | INTACT (driven) |
| R1 | post-open read failure (closed handle / SQL error) | — | `read_failed` | — |
| R2 | corrupt ROW (non-JSON `body`) | — | `read_failed` — the WHOLE read fails, never a partial `[]` (driven) | — |
| R3 | corrupt ROW — VALID JSON failing any ROW-DECIDABLE P1 rule — the **Canonical R3 row-decidable shape table** is the decision surface; driven by that table's minimum counterexample set (common · presence · source/domain · digest-point · attribution · internal_failure · ingress groups) | — | `read_failed` — the shape gate fails the WHOLE read; a parse-and-cast reader would leak a malformed `DiagnosticEvent` out the typed surface (driven, per-variant) | — |
| W1 | post-open write failure | swallow — driven via the closed handle (the known drivable instance; the same catch site owns disk-level errors) | — | — |
| C1 | after `close()` | swallow | `read_failed` | — |

Non-lane notes (stated, with their reasons — not exemptions):
- **double `close()`:** not claimed — parity with the ch-4
  `StoreHandle`, whose contract is single-close by the owning
  composition root.
- **recovery/reopen:** an unavailable handle stays unavailable for its
  lifetime; there is no retry, buffering, or reopen (best-effort
  channel; retention/rotation is §7.1 out-of-scope). Per-call behavior
  after a post-open failure is exactly the matrix's R1/W1 rows — no
  state machine beyond the open state is claimed.
- **known-empty** (available store, no matching rows) = `[]` — driven
  per-instance AND global (the duality's other half, dimension 2).

## Open-sequence fallible-site inventory (a LIST — "open NEVER throws" is a collapsed lane)

Every member is caught by the open fence; a firing member leaves the
handle born unavailable. DRIVEN members map to matrix lanes; the
stated residues/non-lanes share the SAME fence and the same reason
mapping (`refused_marker` for the marker members O4–O6; `open_failed`
for every other member, residues and the contested non-lane
included):

The open ORDER is part of the member list (fence first, WAL last —
the `openDiagStore` surface row is canonical):

| Source site (in open order) | Lane | Driven by |
|---|---|---|
| `new DatabaseSync(path)` throw | O7 (path is a directory / unopenable) | directory-path fixture |
| `sqlite_master` probe throw | O7 (garbage bytes) | raw-bytes garbage file |
| `meta` read throw / marker incomplete / non-prototype | O4 / O5 / O6 (`refused_marker`) | per-lane fixtures built via raw SQL |
| wipe `DROP` exec throw | O8 (readonly NON-WAL file + moved version — reads succeed readonly on a delete-mode file, so the `DROP` is the first write to fire; verified live) | `chmod 444` fixture (POSIX; local + CI runners are non-root; loud self-check per flag 5) |
| wipe-branch re-init DDL after a successful `DROP` | residue: a successful `DROP` has already PROVEN writability, so the constant valid re-init DDL can fail only at disk level — not stageable; same fence, stated (the fresh-init `CREATE` branch is O10's, below — never this row's) | stated |
| WAL PRAGMA (runs LAST, post-settle) | a journal-mode-switch WRITE on any non-WAL file — on a READONLY non-WAL file with a CURRENT marker the fence settles clean and this is the FIRST write to fire (the round-2 "readonly states throw earlier by construction" was FALSE for exactly that state — flag 8b, verified live both ways) → O9, DRIVEN. The residue (a writable db where the post-settle PRAGMA fails, e.g. disk-level) is not otherwise stageable — same fence, stated | O9 fixture |
| readonly ALREADY-WAL file | CONTESTED substrate behavior (flag 7): one review arm observed read/PRAGMA throws; a live check on this repo's `node:sqlite` read a clean-closed readonly WAL file fine — SQLite's readonly-WAL support is sidecar/close-state sensitive. Whichever member fires in a given environment, it lands inside the same open fence → `open_failed`. Deliberately NOT a driven lane: no claim stands on the contested premise | stated (flag 7) |
| fresh-init `CREATE` on a READONLY empty file | O10, DRIVEN — the round-3 rule-out CONFLATED the init branch with the wipe branch (O8 drives the `DROP`; the `CREATE` sites are a distinct branch reached via the zero-table probe route; flag 9a). On a WRITABLE fresh database the constant valid DDL remains unfailing — that half of the old rule-out stands | zero-byte `chmod 444` fixture |

## Emit-path fallible-site inventory (a LIST, not a count)

The swallow try/catch wraps the ENTIRE emit body — every member below
sits inside one fence:

| Source site | Disposition | Driven by |
|---|---|---|
| open-sequence failure — ANY member of the open-sequence inventory: the O4–O10 driven lanes PLUS its stated residues/non-lanes | handle born unavailable; every emit swallows | lanes O4–O10 (the stageable members) |
| body property access — a HOSTILE GETTER on a caller-constructed body (the port accepts any `DiagnosticEventBody`-typed value; "emit never THROWS" derives its negatives from the claim, not from polite callers) | swallowed | throwing-getter fake body |
| `time.now()` throw (contract-violating `TimeSource`) | swallowed | throwing-clock fake — the P1 digest-throw pattern: proves the WRAPPER, not reachability |
| `JSON.stringify(projected)` — runs on the fresh projected literal, so a carrier-level `toJSON`/cycle cannot reach it; a throw remains possible ONLY via type-LIED values inside declared keys (e.g. a BigInt where a number is declared, a cycle inside a lied `error`) | swallowed — DRIVEN (a "ruled out by type" argument does not prove a claim against a structural interface: a typed value can lie) | BigInt-lied fake body |
| write-side shape gate — `validateShape(projected)`, the read-side R3 gate REUSED, runs BEFORE the INSERT | swallowed — a NON-throwing type-lie (JSON-serializable, e.g. `instanceId` a number where a string is declared) fails the gate and is LOST to the fence rather than writing a self-poisoning row that would fail every later read (aftermath fix; the file holds ONLY valid projections by construction) | non-throwing type-lied fake body |
| INSERT prepare/run throw | swallowed | emit after `close()` (W1); the same catch owns OS-level write failures AND STRICT type rejections — e.g. a LYING (non-throwing) `TimeSource` returning a non-integer `at` is rejected by the STRICT table and lands here (the type-lie class applied to the injected deps, not just the body) |

## Canonical R3 row-decidable shape table (the gate's source — replaces the prose enumeration)

The read-side shape gate (R3) rejects any parsed row that is not a
P1-declared projection. Every rule the gate can decide from a SINGLE
row lives in THIS table; the reader-inventory R3 row, the open-outcome
R3 row, dimension 2, and the acceptance R3 set all DERIVE from it — one
authority, so a reviewer checks the table, not prose (the fold policy
that ended the round-9→11 slice loop, flag 17). **Common rules (every
row):** no non-allowlisted keys (the emit allowlist reused,
type-level-synced — zero key drift); declared field types incl. the
`error` object `{name, message}` shape; `source` ∈ {`ingress`,
`kernel`}; `kind` ∈ the 5-name enum; `detail` (when present) ∈ the 6-name
`IngressDetailToken` enum; `reason` (when present) ∈ the 85-name
`RejectionName` registry; version fields (when present) nonnegative
safe integers with `-0` rejected via `Object.is`
(R-NUMERIC-LADDER — JSON.parse cannot encode NaN/Infinity, so the live
rungs are value + numeric identity).

| Row class | Required | Forbidden | Conditional / domain |
|---|---|---|---|
| ingress `rejected`, `detail`=`not_plain_object` | `source`, `kind`=`rejected`, `reason`=`invalid_shape`, `detail` | `payloadDigest` · `error` · versions · ALL attribution (`instanceId`/`opId`/`actorId`/`type`) | — |
| ingress `rejected`, other `detail` token | `source`, `kind`=`rejected`, `reason`=`invalid_shape`, `detail` | `payloadDigest` · `error` · versions | attribution fields OPTIONAL (best-effort); each present field, if any, is a NON-EMPTY string — INGRESS-ONLY (ingress admits only `isNonEmptyString` values, P1 `:137` / `ingress.ts` `attributionOf`); kernel attribution has NO such gate — ids are plain-`string` aliases (ch4-P1 `:136`) and `startInstance` passes `input.instanceId` straight through (`kernel.ts:240`), so an empty-string kernel attribution IS a valid projection |
| kernel `duplicate` | `source`, `kind`, `instanceId`, `opId`, `actorId`, `type`, `payloadDigest` | `reason` · `detail` · `error` · versions | full envelope required |
| kernel `stale` | duplicate's Required + `expectedVersion`, `currentVersion` | `reason` · `detail` · `error` | both versions present; safe ints, no `-0` |
| kernel `cas_restart` | duplicate's Required set | `reason` · `detail` · `error` · versions | full envelope required |
| kernel `rejected` `unknown_instance` | `source`, `kind`, `reason`=`unknown_instance`, `instanceId`, `opId`, `actorId`, `type` | `payloadDigest` · `detail` · `error` · versions | pre-digest — no digest |
| kernel `rejected` post-digest | unknown_instance's Required + `payloadDigest`; `reason` ∈ {`missing_version`, `no_transition`, `op_id_collision`} | `detail` · `error` · versions | post-digest — digest present |
| kernel `internal_failure` | `source`, `kind`, `instanceId`, `error` | `reason` · `detail` · versions | `opId`/`actorId`/`type` ALL-present-or-ALL-absent; `payloadDigest` present ⇒ all three present (a digested `internal_failure` is a handle/post-digest lane → full envelope) |

**Write-side-guaranteed residue — the ONLY things the row cannot
decide, all confined to `internal_failure` + ingress best-effort:**
(1) a kernel `internal_failure`'s exact digest-point (whether
`payloadDigest` is present at all — the throw site is unencoded);
(2) its handle-vs-`startInstance` attribution BEYOND the row-decidable
all-or-none + digest⇒full rules (a NON-digested one may be full-envelope
OR `instanceId`-only); (3) ingress best-effort attribution beyond
`not_plain_object`. Everything else the table enforces.

**R3 minimum counterexample set (table-derived — the CANONICAL fixture
list; each a raw-SQL row that must fail the WHOLE read as
`read_failed`, never a partial `[]`):**
- **common:** `{}` · unknown `kind` · unknown `detail` token · unknown `reason` name · extra (non-allowlisted) key · lied type · `-0` version
- **presence iffs:** `duplicate`+`reason` · `rejected` w/o `reason` · `stale` w/o versions · `stale` with ONE version · kernel+`detail` · ingress+non-rejected `kind`
- **source / domain:** ingress+`payloadDigest` · kernel `rejected`+`invalid_shape` (ingress-only reason)
- **digest-point:** `duplicate`/`stale`/`cas_restart` w/o digest · post-digest `rejected` (`missing_version`) w/o digest · `unknown_instance` w/ digest
- **kernel attribution:** `duplicate`/`stale`/`cas_restart`/`rejected` w/o full envelope
- **internal_failure:** w/o `instanceId` · PARTIAL `opId`/`actorId`/`type` (e.g. `opId` only) · `payloadDigest` present w/o full envelope
- **ingress:** `not_plain_object` + ANY attribution field · other `detail` + EMPTY attribution string (drives the ingress-only non-empty-attribution rule)

## Reader fallible-site inventory (a LIST, not a count)

| Source site | Disposition | Driven by |
|---|---|---|
| cursor validation | `RangeError` FIRST — before availability, before SQL | the dimension-6 ladder + the precedence-on-unavailable lane |
| unavailable open state — ANY open-sequence member, stated residues/non-lanes included | `DiagUnavailableError`, reason per the open-sequence mapping (`refused_marker` ONLY for the marker members O4–O6; `open_failed` for all others) | lanes O4–O10 (the stageable members) |
| SELECT prepare/all throw | `read_failed` | R1 (closed handle) |
| `JSON.parse(body)` on a corrupt row | `read_failed` — whole read fails, never partial | R2 — the corrupt row is inserted via raw SQL in the test (a provably preserving channel; R-RAW-FIXTURES-conform) |
| body SHAPE validation — parsed JSON failing ANY ROW-DECIDABLE P1 rule. The DECISION SURFACE is the **Canonical R3 row-decidable shape table** above — this row no longer re-enumerates it (one authority, zero prose drift); the emit-side type-level-synced allowlist is REUSED read-side (zero key drift), and the write-side residue is exactly the table's stated three items (`internal_failure` digest-point + its handle-vs-start attribution beyond the row-decidable rules, and ingress best-effort attribution beyond `not_plain_object`) | `read_failed` — whole read fails, never partial. Structure-vs-semantics line, drawn HERE once: a stored row is trusted only after BOTH the parse gate (R2) and the shape gate (R3); both failures are ONE observable class (`read_failed`) — no divergent handling | R3 — the shape table's minimum counterexample set (common · presence · source/domain · digest-point · attribution · internal_failure · ingress groups), each a per-variant raw-SQL fixture |

## Schema (data — the packet is the source)

```sql
CREATE TABLE meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
) STRICT;
CREATE TABLE diagnostics (
  ordinal     INTEGER PRIMARY KEY AUTOINCREMENT,
  at          INTEGER NOT NULL,
  instance_id TEXT,
  body        TEXT NOT NULL
) STRICT;
CREATE INDEX diagnostics_instance ON diagnostics (instance_id, ordinal);
```

Marker rows: `schema_version` = "1", `prototype` = "true" — the diag
store versions INDEPENDENTLY of the main store (whose "2" is
untouched). `body` (the ALLOWLIST-PROJECTED `DiagnosticEventBody`
JSON — the `sink.emit` surface row is the projection's canonical
statement) is CANONICAL among the columns; `instance_id` is a query
projection of the projected object's `instanceId`, written once and
never read back as data (`NULL` = unattributed). Substrate reality:
AUTOINCREMENT makes SQLite create its own `sqlite_sequence` internal
table — every "table set" assertion in this packet is over
APPLICATION tables and excludes SQLite-owned internals by name.

## Mirrored surface map (one canonical statement per rule)

| Rule | Canonical | Mirrors |
|---|---|---|
| availability behavior per lane | the open-outcome × availability matrix | plan §7.3 availability-matrix rows 1–2 (chapter-level summary) · Claim sentences 1–2 · dimensions 1–3 · acceptance list |
| reader error contract (name + reason tokens, every token driven) | the surface matrix `DiagUnavailableReason` + `DiagUnavailableError` rows | open-outcome matrix reader column + R2/R3 rows · dimension 2 · plan §7.4 `unavailable(reason)` clause (cross-artifact) · acceptance list |
| read-side shape gate (every row-decidable P1 rule; the write-side residue; the structure-vs-semantics line) | the **Canonical R3 row-decidable shape table** (its minimum counterexample set included) | reader-inventory R3 row (now a pointer) · surface matrix `DiagnosticsReader` row · open-outcome matrix R3 row · dimension 2 R3 clause · emit-serialization map row's read-side-reuse mention · acceptance R3 set |
| cursor domain (full ladder + precedence) | the surface matrix cursor row | dimension 6 · reader-inventory row 1 · acceptance list |
| stamping + ordinal authority (no CAS / no uniqueness) | the surface matrix `sink.emit` row + the schema block | dimension 4 · ADR-010 · plan §7.3 ordinal bullet |
| separation both directions (surface/table scoping + the field-classification line) | dimension 8 (the full statement, the CLASSIFICATION line included) | the Claim's final sentence (summary) · the plan's ch-7 PREAMBLE governing principle (chapter-level — sits just before §7.1) · acceptance list · flag 8(a) (historical) |
| wipe fencing (identical fence, inverted failure direction) | open-outcome matrix rows O3–O8 | dimension 3 · ADR-010 · plan §7.1 out-note ("the P2 fenced-wipe negative covers the schema lane") |
| "open NEVER throws" member list | the open-sequence fallible-site inventory | surface matrix `openDiagStore` row · emit-inventory row 1 · dimensions 1/3 · acceptance list |
| emit serialization (allowlist projection, type-level key sync) | the surface matrix `sink.emit` row | Claim ("declared-field projection") · dimension 5 hostile-carrier clauses · emit-inventory stringify row · schema-block body note · in-context "no re-derivation" note (mirror added at the refine round — discovered by the fresh-eyes pass, per the fold policy) · reader shape-gate rows (the READ-side reuse of the same allowlist, round 7) · acceptance list |
| open order (fence first, WAL PRAGMA last) | the surface matrix `openDiagStore` row | ADR-010 · open-sequence inventory header + WAL-member row (O9, driven) + init-member row (O10, driven) · O8/O9/O10 matrix-row rationales · flag 7(b) + flags 8(b)/9(a) (historical) · acceptance list |

The **Pre-approval flags ledger is deliberately NOT in the live mirror
set** (the P1 precedent): its entries are dated per-round resolution
snapshots — history is never rewritten when a canonical row changes
(flag 6(b)'s ALREADY-WAL mechanism stands as the round-1 record; flag
7(b) records its round-2 reversal — the LIVE rule is the canonical
rows').

## In-context notes (the scarce budget)

- **The CLI keeps the noop sink until P4.** The plan's packet table
  (§7.7) gives P4 the CLI surface INCLUDING the derived diag-DB config
  (`<db>.diag.sqlite`, §7.5) — wiring the store-backed sink without the
  path-derivation rule would mint an ad-hoc config lane. The ch7-P1
  packet's "until P2 swaps in the store-backed sink" prose was a
  forecast, not ratified plan text (flag 2); `diag/index.ts`'s noop
  doc-comment gets the comment-only refresh.
- **Single-SELECT reads.** §6.2's one-snapshot rule existed to bind the
  null/`[]` decision and the row suffix to one snapshot; the diag
  reader has NO null decision (dimension 2), so each read is ONE
  statement — the absent read transaction is a decision, not an
  oversight.
- **The wipe drops `diagnostics` + `meta` and re-inits** (the index
  falls with its table) — the O3 lane's mechanism, mirroring the main
  store's fenced path.
- **Emit does no re-derivation:** the store performs COPIES, never
  computation — the allowlist projection (the `sink.emit` row is the
  canonical statement; this note is its named mirror) reads each
  declared key once and derives nothing from the values (the P1
  observer rule: the diagnostic path performs no new fallible work
  beyond its own reads and I/O). The write-side shape gate (aftermath)
  is a VALIDATION, not a derivation — it computes no new value, only
  admits-or-drops the projection inside the swallow fence, so the
  observer rule still holds.

## Embedding gates (v1-inherited)

- New files: `v3/src/diag/sqliteDiagStore.ts` (`openDiagStore`,
  `DiagStoreHandle`, `DiagUnavailableError`),
  `v3/src/diag/sqliteDiagStore.test.ts`,
  `v3/adr/ADR-010-diag-store-separate-sqlite-file.md`.
- Edited: `v3/src/ports/diagnostics.ts` (adds `DiagnosticsReader` +
  `DiagUnavailableReason` — type-only additions),
  `v3/src/ports/index.ts` (the two new type exports),
  `v3/src/diag/index.ts` (re-exports; noop doc-comment refresh —
  comment-only ripple).
- Edited (the refine-round verdicts, same commit):
  `v3/src/store/sqliteStore.ts` + `v3/src/store/sqliteStore.test.ts`
  (flag 1 resolved (b): the `getTimeline` `Object.is` `-0` guard + its
  test); `v3/adr/ADR-006-sqlite-driver-node-sqlite.md` (the amended-by
  marker — ADR-010 widens driver visibility to `store/` + `diag/`);
  `docs/v3/implementation/task-packet-template.md` (§3 gains the
  `REV-DIAG-FAILOPEN` registry row — the rule was born at ch7-P1, plan
  §7.2, but never landed in the canonical registry; row added at
  ch7-p2 pre-approval); `v3/adr/README.md` (the ADR-010 index row —
  `check.sh` index consistency requires every ADR file listed WITH its
  full status string; the prior ADR-bearing packets' precedent).
- Untouched, explicitly: `kernel/`, `ingress/`, `floor/`, `cli/`
  (noop wiring until P4), `testkit/` (tests compose `openDiagStore` +
  `createControlledClock` directly — no new testkit surface).
- Type-ripple targets: NONE — the port file changes are additive
  types; no existing signature changes (verified against the live
  tree: `DiagnosticsSink` consumers keep compiling).
- Mutation boundary: exactly the files above + this packet file.

## ADR-010 (lands `accepted` in this packet's commit)

Records: one SQLite file PER CHANNEL — the separation claim made
physical (a diag row cannot enter a committed surface by construction);
no write-lock contention with the authoritative commit path (SQLite is
single-writer per database); failure isolation (a corrupt diag DB never
touches the main path); the `<main-db>.diag.sqlite` naming convention
(realized at the CLI in P4); driver = `node:sqlite`, and **ADR-010
explicitly AMENDS ADR-006**: the driver-visibility rule widens from
"invisible outside `store/`" to "invisible outside the SQLite-backed
substrate homes (`store/` + `diag/`)" — ADR-006 gets the amended-by
marker in the same commit; WAL; `ordinal` = AUTOINCREMENT with no CAS
and no uniqueness (non-authoritative by type; `sqlite_sequence` is the
substrate's own artifact); **open-never-throws** — the ADR-003 fence
transposed to fail-open (refusal degrades to unavailable; the wipe
fence itself is unchanged); **open order: schema fence FIRST, WAL
PRAGMA LAST** (the deliberate `openStore` divergence — the PRAGMA is a
potential write and must not precede the fence on hostile/readonly
states); own schema marker starting at "1".

## Pre-approval flags

1. **The `-0` inheritance is a plan↔code reality gap
   (plan_contract_challenge).** Plan §7.3 says the cursor domain
   "inherits §6.2 (nonnegative safe integer, RangeError before any
   SQL, `-0` rejected)" — but the LIVE `getTimeline` store validator
   (`sqliteStore.ts:319`: `!Number.isSafeInteger(afterSeq) || afterSeq
   < 0`) does NOT reject `-0` (`Number.isSafeInteger(-0)` is true,
   `-0 < 0` is false; no `Object.is` guard, no `-0` test exists on
   it). Chapter 6 rejected `-0` lexically at the CLI parse
   (`/^\d+$/`) and in the dev inject schema only — the programmatic
   store surface accepts it (observationally ≡ `0` there). P2's NEW
   validator drives the full ladder including `-0` either way. The
   verdict decides the inherited surface:
   - **(a)** leave `getTimeline` as-is; the gap goes to the ch-7
     boundary review; §7.3's "inherits … `-0` rejected" parenthetical
     gets an aligned clarification (the `-0` rung is the NEW
     validator's, not yet the ch-6 store's);
   - **(b) (recommended)** add the `Object.is` guard + its test to
     `getTimeline` in this packet's commit (two-file mutation-boundary
     extension, noted in the gates) — the plan sentence becomes true
     at the store level, no plan edit needed.
   **RESOLVED at the refine round: (b)** — both review arms concurred;
   the two store files are in the mutation boundary, dimension 6
   carries the obligation.
2. **The CLI wiring stays noop until P4** — this contradicts ch7-P1
   PACKET prose ("the CLI wires it until P2 swaps in the store-backed
   sink") but not ratified plan text: §7.7 gives P4 the CLI surface
   including the derived diag-DB config, and the swap needs that
   config rule. The P1 packet is historical record (packets are not
   rewritten); `diag/index.ts`'s comment gets the comment-only
   refresh.
3. **The async-drain option is DECLINED.** Plan §7.2 allowed "P2 may
   propose [a queue/async-drain contract] as its own decision" — P2
   deliberately does not: the sync inline write is the current
   driver's reality, and a drain queue would be a NEW contract class
   with its own loss-window semantics, unjustified before any operator
   need exists. Stated here so the decline is a visible decision.
4. **`ordinal` beyond 2^53 is ruled out, not handled:** AUTOINCREMENT
   can exceed JS safe-integer fidelity in theory; a local v1 diag
   stream cannot reach that volume. Stated so the JS `number` read
   face is a decision, not an oversight.
5. **The O8/O9/O10 fixtures assume POSIX `chmod` semantics and a
   non-root runner** (root bypasses file modes; a root CI would see
   the write succeed — the `DROP` on O8, the WAL switch on O9, the
   init `CREATE` on O10 — and the lanes silently pass the wrong way).
   Local dev and GitHub runners are non-root; if the assumption ever
   breaks, the tests must SKIP loudly (assert the fixture actually
   refuses a probe write before driving the lane), never pass
   vacuously — the fixture self-check is part of each test's
   obligation.
6. **Refine round (both arms), five findings — all folded:**
   (a) *ADR propagation:* ADR-006's "driver invisible outside
   `store/`" claim would be falsified by a SQLite substrate under
   `diag/` — RESOLVED: ADR-010 explicitly AMENDS ADR-006 (visibility
   = the SQLite-backed substrate homes, `store/` + `diag/`); the
   amended-by marker joins the mutation boundary.
   (b) *O8 mechanism reality:* `PRAGMA journal_mode=WAL` is itself a
   WRITE on a non-WAL file — a naive readonly fixture would fail at
   the WAL member and never reach the DDL. RESOLVED: the fixture is
   pinned ALREADY-WAL (built writable, then `chmod 444`), so the
   marker fence is reached and the wipe DROP is the first write; the
   readonly NON-WAL variant is stated as the same fence/token, not
   separately driven.
   (c) *`sqlite_sequence`:* AUTOINCREMENT creates a SQLite-owned
   internal table, making "table set = `meta` + `diagnostics`"
   literally false. RESOLVED: every table-set assertion is over
   APPLICATION tables, internals excluded by name (dimension 8, schema
   note, acceptance).
   (d) *"Ruled out by type" does not prove:* `DiagnosticEventBody` is
   a structural interface — a typed value can lie (extra keys,
   `toJSON`, BigInt, cycles). RESOLVED: emit serializes an ALLOWLIST
   PROJECTION (type-level key sync); extra keys dropped and `toJSON`
   ignored are DRIVEN fidelity lanes; the stringify-throw member is
   DRIVEN with a BigInt-lied fake; fidelity is claimed for canonical
   bodies only.
   (e) *`REV-DIAG-FAILOPEN` was cited as a standing rule but never
   landed in the canonical registry* (template §3 carries only
   A1/B/C/E). RESOLVED: the registry row joins the mutation boundary
   — born at ch7-P1 (plan §7.2), landed at ch7-p2 pre-approval.
7. **Refine round 2, two blockers — both folded:**
   (a) *ADR index:* ADR-010 lands but `v3/adr/README.md` was missing
   from the mutation boundary — `check.sh` requires every ADR file
   indexed with its full status string. RESOLVED: the README index row
   joins the edited-file list.
   (b) *The O8 ALREADY-WAL premise was contested by substrate checks*
   — one review arm measured read/PRAGMA throws on a readonly
   already-WAL file; a live session check on this repo's
   `node:sqlite` read a clean-closed one fine (SQLite readonly-WAL
   support is sidecar/close-state sensitive). RESOLVED by removing
   the contested premise entirely (the arm's own "cleaner" option):
   the open ORDER becomes fence-first/WAL-last (canonical in the
   `openDiagStore` row, recorded in ADR-010), and O8 drives the DDL
   member with a READONLY NON-WAL fixture — whose behavior was
   verified live in this session (reads succeed, `DROP` throws
   `attempt to write a readonly database`). The contested
   already-WAL state is an inventory note: fence-covered in every
   environment, deliberately not a driven lane.
8. **Refine round 3, two findings — both folded:**
   (a) *The separation claim over-stated:* "no committed data is ever
   written into the diag file" collides with P1's own post-commit
   derive-throw lane — the transition IS persisted and the diag event
   carries full envelope attribution + digest (the live kernel's
   post-commit catch). RESOLVED: the claim is scoped to surfaces and
   tables/rows (no committed read surface served from the diag file;
   no diag table/row in the main DB; diag rows are only P1-declared
   event projections), and dimension 8 carries the canonical
   CLASSIFICATION line — attribution/digest FIELDS are diagnostic
   data, never committed-row copies. Plan §7.1's direction-2 text
   never claimed the over-extension; no plan edit needed.
   (b) *The fence-first order MINTED a new lane the round-2 fold
   wrongly ruled out:* on a READONLY non-WAL file with a CURRENT
   marker the fence settles clean and the WAL PRAGMA (now last) is
   the FIRST write to fire — "readonly states throw earlier by
   construction" was false for exactly that state (verified live by
   the reviewer AND in-session). RESOLVED: new driven lane O9
   (`open_failed`, file intact; O2 gains the WRITABLE qualifier), the
   WAL member's ruled-out row replaced with the driven form, and the
   all-or-nothing fence decision stated (a readable-but-unwritable
   diag DB is unavailable; read-only diag mode is an unclaimed
   affordance). Lesson recorded: a rule change (open order) MINTS
   lanes, not just moves them — the re-derivation must ask "what
   fires FIRST now" per file state, not only sweep the old members.
9. **Refine round 4, two findings — both folded:**
   (a) *The fresh-init DDL branch was rule-outed by CONFLATION:* the
   round-3 rule-out pointed its "readonly variant" at O8, but O8
   drives the wipe `DROP` — the init `CREATE` is a DISTINCT branch
   (reached via the zero-table probe route) and IS stageable: a
   readonly EMPTY file passes the probe (`n=0`) and throws on
   `CREATE` (verified live by the reviewer AND in-session). RESOLVED:
   new driven lane O10 (zero-byte `chmod 444` fixture, `open_failed`,
   file intact); the inventory row is now the driven form; the
   writable-fresh half of the old rule-out stands.
   (b) *O3 was too broad after O2 narrowed:* O2 gained its WRITABLE
   qualifier in round 3 but O3 still stated the moved-version wipe
   unconditionally — colliding with O8, its readonly variant.
   RESOLVED: O3 reads "(WRITABLE — the readonly moved-version variant
   is O8)"; O1 got the same treatment against O10 in the same sweep
   (the qualifier class, applied to the WHOLE matrix, not just the
   row the finding named).
10. **Refine round 5, one text fold:** the open-sequence inventory's
   wipe row still read "wipe DROP / init DDL exec throw → O8" — a
   leftover of the flag-9(a) conflation IN the row title after O10
   took the init branch. RESOLVED: the row is split — "wipe `DROP`
   exec throw → O8" (driven), and the wipe-branch re-init DDL is its
   own RESIDUE member (a successful `DROP` proves writability; only
   disk-level failure remains — not stageable, fence-covered,
   stated).
11. **Refine round 6, one acceptance-text fold (R-EXECUTION):** the
   acceptance's "every fallible-site inventory driven per its table"
   over-claimed once the open-sequence table legitimately carried
   NON-driven members (the re-init residue; the contested already-WAL
   non-lane). RESOLVED: the acceptance says COVERED — driven lanes
   executed plus the stated residues/non-lane standing as stated. The
   emit-path and reader tables remain all-driven; the matrix's
   O1–O10 driven claim is untouched.
12. **Refine round 7, two findings — both folded:**
   (a) *Propagation:* the downstream references to the open-sequence
   inventory (emit row 1, reader row 2, the inventory preface) still
   narrowed to "O4–O10" after the table gained stated
   residues/non-lanes. RESOLVED: all three now say ANY open-sequence
   member — the O4–O10 stageable lanes PLUS the stated
   residues/non-lanes — with the explicit reason mapping
   (`refused_marker` ONLY for the marker members O4–O6; `open_failed`
   for all others).
   (b) *Contract reality — the read-side shape gate was missing:* the
   corrupt-row lane drove only non-JSON bodies, but a tampered row
   can be VALID JSON that is not a P1-declared projection (`{}`,
   unknown `kind`) — a parse-and-cast reader would leak a malformed
   `DiagnosticEvent` out the typed surface, breaking BOTH the
   fail-loud claim and dimension 8's "ONLY P1-declared projections".
   RESOLVED: new driven lane R3 (per-variant raw-SQL fixtures: `{}` ·
   unknown `kind` · extra key · lied type) with a read-side SHAPE
   GATE that REUSES the emit-side type-level-synced allowlist (one
   canonical key list validates both directions — zero drift); both
   corrupt classes are one observable (`read_failed`, whole read
   fails); the structure-vs-semantics line is drawn once, in the
   reader-inventory row.
13. **Refine round 8, one finding (both arms converged) — folded:**
   *the R3 shape gate was UNDER-SPECIFIED for its own "P1-declared
   projection" claim:* it checked allowlist/types/enums but not P1's
   PRESENCE rules — `{source:"kernel", kind:"duplicate",
   reason:"invalid_shape"}` is valid JSON with allowlisted keys and
   string types, yet not a P1 projection. RESOLVED by keeping the
   WIDE claim and hardening the gate: it now enforces every
   ROW-DECIDABLE P1 rule — the kind/source presence iffs (reason iff
   rejected; error iff internal_failure; versions iff stale
   both-or-neither; detail iff ingress, ingress ⇒ rejected +
   `"invalid_shape"`), full enum membership (incl. `reason` against
   the 85-name registry), and the numeric-identity rung (`-0` is
   JSON-encodable; JSON.parse kills the descriptor/prototype rungs by
   construction) — with the PROOF BOUNDARY stated: lane-provenance
   rules (digest-point presence, per-lane keysets) are not
   row-decidable and stay write-side-guaranteed. The
   allowlisted-but-invalid variants are driven per the R3 fixture
   list.
14. **Refine round 9, one finding (a row-decidable P1 rule delegated by
   P1 but not closed in the R3 gate) — folded:** the gate enforced the
   kind/source presence iffs but OMITTED two ROW-DECIDABLE P1 rules —
   (i) `payloadDigest` is kernel-source-only (P1 type matrix; plan
   §7.2 "ingress-source events never carry a fingerprint"), so
   `{source:"ingress", kind:"rejected", reason:"invalid_shape",
   detail:"not_plain_object", payloadDigest:"x"}` is valid JSON with
   allowlisted keys, correct types/enums, and passes every LISTED
   presence iff, yet is not a P1 projection (an ingress event carrying
   a fingerprint); (ii) `detail`=`not_plain_object` ⇒ NO attribution
   fields (P1 dimension 3 + lane inventory), so
   `{…, detail:"not_plain_object", instanceId:"x"}` likewise slips.
   A parse-and-cast reader — or the gate as previously specified —
   would leak BOTH out the typed surface, breaking the fail-loud claim
   and dimension 8's "ONLY P1-declared projections". RESOLVED by
   hardening the gate with both row-decidable rules (source=`ingress`
   ⇒ no `payloadDigest`; `not_plain_object` ⇒ no attribution) and
   driving the two new presence fixtures (`ingress+payloadDigest`,
   `not_plain_object+attribution`); the proof boundary is REFINED —
   the digest-POINT presence within kernel lanes and the GENERAL
   per-lane attribution keysets stay write-side-guaranteed; only the
   SOURCE-level absence rules are row-decidable. Lesson: "kind/source
   presence iffs from the type matrix" under-scoped the gate's rule
   SOURCE — a row-decidable rule can live in the lane inventory
   (`not_plain_object` attribution) or be the row-decidable SLICE of a
   rule whose full form is lane-provenance (`payloadDigest`).
15. **Refine round 10, one finding (round 9's own carve-out was too
   broad) — folded:** round 9 pushed ALL kernel-lane `payloadDigest`
   digest-point presence into "write-side-guaranteed, not
   row-decidable" — but that over-corrected. The digest-point of a
   kernel event IS row-decidable from `kind` (and `reason` for
   rejected): P1 makes `duplicate`/`stale`/`cas_restart` and the
   post-digest rejected reasons (`missing_version` / `no_transition` /
   `op_id_collision`) UNCONDITIONALLY post-digest → `payloadDigest`
   present, and `unknown_instance` pre-digest → absent (P1 emission
   matrix `:91–94`, plan §7.2 digest-point clause). So the missing R3
   negatives — `duplicate` / `stale` / `cas_restart` w/o digest, a
   post-digest rejected reason w/o digest, and `unknown_instance` WITH
   a digest — pass allowlist/type/enum/presence yet are not P1
   projections, and would leak out the typed surface (the same
   fail-loud / dimension-8 break as round 9). RESOLVED: the enforced
   rule now carries the kernel digest-point (present on
   duplicate/stale/cas_restart + post-digest rejected reasons; absent
   on unknown_instance), five new R3 negatives are driven, and the
   proof boundary is corrected to the ONE genuinely lane-provenance
   kernel case — `internal_failure`, whose digest-point turns on the
   unencoded throw site (post-digest sites carry it, pre-digest /
   digest-throw sites do not) — plus the general attribution keysets.
   (Round 9's flag 14 stands as its dated snapshot per the
   ledger-not-rewritten policy; the LIVE rule is the canonical row's.)
   Lesson: a proof-boundary WIDENING is itself a rule change that must
   be re-derived per lane — "not row-decidable" was asserted over the
   whole kernel digest axis when only `internal_failure` earns it.
16. **Refine round 11, one finding (the round-10 write-side residue
   ALSO over-claimed — attribution + reason domain) — folded, and the
   whole row-decidable split audited to closure:** round 10 left "the
   GENERAL per-lane attribution keysets" write-side-guaranteed, but P1
   makes most of them row-decidable — `duplicate`/`stale`/`cas_restart`/
   `rejected` are all handle-lanes with the typed envelope in hand, so
   `instanceId`+`opId`+`actorId`+`type` are ALL mandatory (P1 emission
   matrix `:91–94`, lane inventory `:126–131`); and the kernel
   `rejected` reason domain is exactly `{unknown_instance,
   missing_version, no_transition, op_id_collision}` (`:93`), not the
   full 85-name registry — so `{source:"kernel", kind:"duplicate",
   payloadDigest:"d"}` (no attribution) and `{source:"kernel",
   kind:"rejected", reason:"invalid_shape"}` (ingress-only reason) are
   valid-looking yet not P1 projections and would leak out. RESOLVED —
   and, per the round-10 offer, the ENTIRE row-decidable/write-side
   split is now closed in one pass: the gate enforces the kernel
   attribution FLOOR (full envelope on the four handle-kinds;
   `instanceId` on `internal_failure`) and the kernel `rejected` reason
   domain; six new R3 negatives driven (four handle-kinds w/o
   attribution, `internal_failure` w/o `instanceId`, kernel
   `rejected`+`invalid_shape`). The write-side residue is now MINIMAL
   and fully stated: a kernel `internal_failure`'s digest-point AND its
   `opId`/`actorId`/`type` (the `handle`-vs-`startInstance` entry point
   is unencoded), plus ingress best-effort attribution beyond
   `not_plain_object`. (Rounds 9/10 flags stand as dated snapshots per
   the ledger-not-rewritten policy; the LIVE rule is the canonical
   row's.) Lesson: three rounds circled the same axis (payloadDigest,
   then digest-point, then attribution/reason) because each fold closed
   only the slice the finding named — the fix was to derive the FULL
   (source, kind, reason) → row-decidable-fields table ONCE and pin the
   residue to the single genuinely-ambiguous lane (`internal_failure`).
17. **Refine round 12, one finding (the `internal_failure` residue was
   STILL partly row-decidable) + the structural fix that ends the loop
   — folded:** round 11 left ALL of `internal_failure`'s
   `opId`/`actorId`/`type` write-side, but P1 makes two correlations
   row-decidable: the `handle` lanes carry the FULL envelope and the
   `startInstance` lanes carry `instanceId` ALONE (P1 `:95`, `:99`), so
   (i) `opId`/`actorId`/`type` are ALL-present-or-ALL-absent (a partial
   subset is impossible), and (ii) `payloadDigest` present ⇒ all three
   present (a digested `internal_failure` is a handle/post-digest lane,
   `:133`). `{…, kind:"internal_failure", instanceId, opId}` (partial)
   and `{…, kind:"internal_failure", instanceId, payloadDigest:"d"}`
   (digest, no envelope) were valid-looking yet not P1 projections.
   RESOLVED at the ROOT, not by another prose slice: the R3 decision
   logic is EXTRACTED into a Canonical R3 row-decidable shape table
   (row class → required / forbidden / conditional), the fixture set is
   DERIVED from it as one minimum counterexample set, and the three
   former prose lists (reader-inventory R3 row, open-outcome R3 row,
   acceptance) now DEFER to it — one authority a reviewer can CHECK
   against P1 instead of re-reading prose. Two new `internal_failure`
   negatives driven (partial `opId`/`actorId`/`type`; `payloadDigest`
   w/o full envelope). The write-side residue is now truly minimal:
   a kernel `internal_failure`'s exact digest-point, its handle-vs-start
   attribution BEYOND the all-or-none + digest⇒full rules, and ingress
   best-effort attribution beyond `not_plain_object`. (Rounds 9–11
   flags stand as dated snapshots per the ledger-not-rewritten policy.)
   Lesson: when a rule surface keeps sprouting one-slice findings, the
   fix is to change the REPRESENTATION (a decision table with a stated
   residue) so the whole surface is auditable at once, not to append
   the newest slice to the prose.
18. **Refine round 13, one narrow table-row fold — folded:** the R3
   table's ingress "other detail" row said only "attribution
   typed-if-present", but P1 admits attribution as `isNonEmptyString`
   values ONLY (P1 `:137`; live `ingress.ts` `attributionOf` drops
   empty strings), so `{…, detail:"unknown_key", instanceId:""}` was
   valid-looking yet not a P1 projection. RESOLVED by adding a
   non-empty-attribution rule driven by one representative ingress
   fixture (other `detail` + empty attribution string); the reader row
   / matrix row / mirror map / acceptance stay POINTERS (the round-12
   win preserved — the set grows at the table, references do not
   re-scatter). **Round-13 over-reach — corrected at round 14
   (flag 19):** this fold first placed the rule in COMMON-rules and
   claimed it "uniformly also closes the analogous kernel empty-string
   case"; that premise was FALSE (kernel ids are plain-`string`
   aliases, `startInstance` passes `input.instanceId` through ungated),
   so the LIVE rule is INGRESS-ONLY. (This wording was narrowed at
   round 14 at the reviewer's request — a factual error excised, not a
   valid-then snapshot; the ledger-not-rewritten policy protects the
   latter, not the former.)
19. **Refine round 14, one finding (round-13's own over-reach) —
   folded:** round 13 promoted the ingress non-empty-attribution rule
   to a COMMON rule covering KERNEL, justified by "kernel attribution
   is an already-validated non-empty envelope." That justification does
   NOT hold from any existing contract: ch4-P1 identifier types are
   plain `string` aliases with NO branding/non-empty (`:136`, the
   `IdempotencyKey = string` culture), and `startInstance` emits
   `instanceId: input.instanceId` straight from input on failure with
   NO gate (`kernel.ts:240`; P1 `:135` calls it StartInstanceInput
   PROVENANCE, not validation) — so an empty-string kernel `instanceId`
   IS a valid P1 projection and R3 must NOT reject it (the round-13
   common rule would have failed-loud on a VALID row). RESOLVED: the
   non-empty rule is scoped INGRESS-ONLY (the ingress "other detail"
   row's conditional cell, with the ch4-P1 / `kernel.ts` reason
   recorded so the ingress-only scope is itself auditable); the
   Common-rules line no longer carries it; the ingress fixture is
   unchanged; flag 18's over-broad wording narrowed. Lesson (the
   verify-before-generalizing corollary of the #1 rule): a rule proven
   in ONE domain (ingress `isNonEmptyString`) must be RE-DERIVED
   against each OTHER domain's actual contract before promotion —
   round 13 promoted on an UNCHECKED assumption about kernel id types;
   the one-line fix was to READ ch4-P1 `:136` + `kernel.ts:240`, which
   flatly contradicted it.

## Acceptance

- Dimensions 1–9 test-driven, all lanes named above: the open-outcome
  matrix lanes O1–O10 each driven with sink + reader + file-state
  asserts (refuse lanes assert the file INTACT; O3 asserts prior rows
  gone — the WRITABLE wipe lane; O7 both members — garbage bytes AND
  directory path; O8, O9 AND O10 via the `chmod`-staged readonly
  fixture family under the fence-first open order — moved marker
  drives the wipe-`DROP` member, current marker drives the WAL member,
  the empty file drives the init-`CREATE` member); the
  outcome-unchanged product test
  through real kernel + ingress + main store against a corrupt diag DB
  (start, committed submit, rejected submit — Outcomes deep-equal to
  the noop-sink twin run); the healthy-path twin variant additionally
  asserting the diag file holds exactly the expected event sequence;
  frozen-clock `at` stamping (advance between emits, both values
  asserted); ordinal strict monotonicity +
  identical-bodies-are-distinct-rows; the `journal_mode = wal` assert
  on a file-backed store; round-trip keyset fidelity on the three
  representative bodies (dimension 5) incl. the hostile free-text
  message; the projection lanes (extra enumerable keys DROPPED;
  carrier `toJSON` never consulted; type-level allowlist sync
  compile-checked); the full cursor ladder on BOTH reads incl. `-0`
  (`Object.is`) and the RangeError-beats-unavailable precedence lane,
  PLUS the flag-1(b) alignment: the `getTimeline` `-0` guard + its
  `-0` test in the store suite; attribution routing both ways
  (per-instance never serves unattributed; global serves all); the
  separation twin-run asserts (main `sqlite_master` set + all three
  committed read surfaces deep-equal; diag file APPLICATION table set
  = `meta` + `diagnostics`, SQLite internals excluded by name); every
  fallible-site inventory (open-sequence · emit-path · reader) COVERED
  per its table — its driven lanes executed PLUS the open-sequence
  table's stated residues and contested non-lane standing as stated,
  not driven (open-sequence members; hostile-getter body, BigInt-lied
  stringify body, throwing clock, closed-handle write; closed-handle
  read, corrupt-row read — BOTH classes: non-JSON (R2) and the R3
  shape-gate variants — the **Canonical R3 row-decidable shape
  table**'s full minimum counterexample set (common · presence ·
  source/domain · digest-point · attribution · internal_failure ·
  ingress groups), each a per-variant raw-SQL fixture);
  R1/R2/R3/W1/C1; every
  `DiagUnavailableReason` token asserted at least once. Estimated
  ~71 new tests.
- Dimension 9: the full existing suite green (257 baseline); all v3
  bridges green (`v3:typecheck`, `v3:lint`, `v3:test`, `v3:coverage`
  validation with the empty slice, `v3:adr-check`).
- ADR-010 `accepted` (incl. the ADR-006 amendment marker, the
  open-order decision, and the `v3/adr/README.md` index row with the
  full status string — the `check.sh` index-consistency lane);
  integrity check green.
- Standing review rules in force: **REV-DIAG-FAILOPEN** — the
  template §3 registry row LANDS in this commit (born at ch7-P1, plan
  §7.2; the registry is the canonical home, flag 6e), and this
  store-backed sink is the rule's FIRST review subject
  (swallow-own-failures verified across the emit inventory);
  **REV-C-PROJECTIONS-READONLY** — the diag channel never stands in
  for a decision record, and no committed surface reads it;
  **REV-A1-TXN** — n/a by design (no atomicity pairing exists: single
  INSERTs, no CAS — stated, not silently skipped); **REV-B** — the
  unavailable open-state is availability behavior, not data authority
  (considered, cleared); **REV-E** — no adapter branching (the store
  is injected as the port).

## Build record

Built 2026-07-09, after 14 pre-approval refine rounds (the R3
row-decidable surface converged into the canonical shape table at
round 12; rounds 13–14 closed and then correctly re-scoped the
ingress-only non-empty-attribution rung). 257 → 322 tests (+65): the
open-outcome matrix O1–O10 each driven (the O8/O9/O10 readonly lanes
behind a `readonlyEnforced()` self-check that fails loud on a root
runner, per flag 5); R1/R2/C1/W1 + the RangeError-beats-unavailable
precedence lane; the R3 shape gate driven by the canonical table's
minimum counterexample set as a 29-row `it.each` PLUS a positive
`internal_failure` acceptance (the gate rejects malformed rows without
over-rejecting a valid projection); frozen-clock `at`, ordinal
monotonicity + identical-bodies-distinct-rows, `journal_mode = wal`,
round-trip fidelity on the three representative bodies (hostile
free-text message included), the projection lanes (extra keys dropped,
`toJSON` never consulted), the full cursor ladder on both reads incl.
`-0`, attribution routing, the flag-1(b) `getTimeline` `-0` guard + its
test, the separation twin-run, and the fail-open PRODUCT test (real
kernel + ingress + main store against a corrupt diag DB → Outcomes
deep-equal to the noop twin).

The estimate stood (`~71` → 65 actual; the delta is `it.each`
granularity, not coverage). Zero implementation surprises: the
fence-first/WAL-last open order and the R3 table mapped directly to
`fence()` + `validateShape()`; the ONE substrate detail worth recording
is that `JSON.parse("-0")` really does yield `-0` (so the `-0` version
rung is a live R3 lane, caught by `Object.is`), whereas
`JSON.stringify(-0)` normalizes to `"0"` — the read-side raw-SQL fixture
carries the literal. All five v3 bridges green (typecheck, lint, 322
tests, coverage validation on the empty slice, adr-check: 11 ADRs
consistent). Node v26.3.0.

**Aftermath (2026-07-09, post-build review — fixed same day, 323
tests):** `emit` allowlist-projected the body but did NOT gate the
projection before the INSERT, so a NON-throwing type-lie (a
JSON-serializable declared-key lie, e.g. `instanceId: 123` where a
string is declared) was WRITTEN — and then poisoned EVERY later read as
`read_failed`, violating the wide claim that the file holds ONLY
P1-declared projections (dimension 8b). The build had driven only the
THROWING type-lie (BigInt → `JSON.stringify` throws → lost to the
fence); the JSON-serializable lie slipped the same reasoning. Fix: the
emit fence now runs the read-side R3 gate on the projected object
(`validateShape(projected)`) BEFORE the INSERT, so a non-projection is
LOST to the swallow fence rather than written — making dimension 8b
write-side-true and extending dimension 5's "lost to the swallow fence"
to non-throwing lies. Driven RED-first: a `instanceId: 123` body
followed by a valid body, asserting the valid one lands at ordinal 1
(the lie consumed no AUTOINCREMENT ordinal) and the read is clean.
Lesson: "type-lied → lost to the swallow fence" was true only for
STRINGIFY-throwing lies; the write-side claim (file holds only
projections) needed the emit path to enforce it, not just the read
path to defend it — the same emit-gate/read-gate symmetry the R3 table
already assumed.

**Retroactive partial-baseline metrics (2026-07-10, the transition
convention):** the block below follows the template §1 FORM; this
packet stays pre-v2/grandfathered (the v2 marker machine block is
intentionally absent), so the partial baseline records only what is
true — every absent field's reason lives in `baseline_note`.

```json
{
  "packet_metrics": {
    "class": "operability",
    "rounds": { "review": 14, "doc_refinement": 0, "implementation": 2 },
    "stops": [],
    "detector_misses": [
      {
        "found_at": "code-review",
        "what": "emit allowlist-projected the body but did not gate the projection before the INSERT — a non-throwing JSON-serializable type-lie was written and poisoned every later read as read_failed, violating dimension 8b's write-side claim",
        "why_missed": "the pre-approval rounds drove only the THROWING type-lie (BigInt -> stringify throws -> lost to the fence); 'the file holds only P1-declared projections' was proven read-side and assumed write-side — no lens demanded emit-gate/read-gate symmetry"
      }
    ],
    "learned": "a write-side wide claim needs the WRITE path to enforce it, not the read path to defend it (emit-gate/read-gate symmetry)",
    "baseline_note": "PARTIAL BASELINE, recorded retroactively 2026-07-10. rounds.review = 14 OLD-REGIME human-relayed two-arm rounds per the build record, not v2 panel rounds (a mid-flight retro counted 8; the build record is authoritative). prediction ABSENT: pre-registration did not exist at ch7 ratification and is never retro-filled (README section 5.5). provenance ABSENT: no packet_rows manifest exists pre-v2 — rows were never classed. stops empty: the STOP registry postdates this packet's flow. detector_misses increments on late discoveries (README section 5.5). The user's announced post-build code-review findings (2026-07-09) proved NON-RECONSTRUCTIBLE (multi-session origin) and were set aside 2026-07-10 — the increment channel stays open for any future find, but none is pending."
  }
}
```
