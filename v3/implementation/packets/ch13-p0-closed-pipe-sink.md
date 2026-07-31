# Task Packet: ch13-p0-closed-pipe-sink — the CLI output sinks survive a closed pipe

Plan step: plan.md §13.4 ch13-P0 row (realizes §13.1 item 5 — the
chapter's hygiene packet; the item itself is §1.3 carried item (1),
the ch9 boundary's ADOPTED later-chapter EPIPE product verdict).
Autonomy stage: measurement — inherited from the chapter header
(plan §13). Not first-of-a-kind: the operability class (CLI surface,
zero kernel semantics, empty ledger slice) has precedent — ch6-P4a
minted it, ch6-P4b / ch7-P4 / ch9-P4b are later members.
Classification: **invention** — manifest tally: 0 anchored /
3 derived / 9 new-decision (machine-counted from the `packet_rows`
block). The closed-pipe behavior contract is decided HERE: the
chapter ratification placed this decision at the packet
(plan §13 opening disposition 3 — a single-packet decision has no
cross-packet drift to prevent), so the Case-B draft route is DISPOSED
by ratified chapter text, and the new-decision rows ride to the human
approve as `approve-ratified` flags. Prediction and discovery agree
(plan §13.4 predicted `invention (memo-born)`).

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

The EMPTY slice is a declaration, not an omission (R-EMPTY-SLICE):
this packet adds ZERO kernel semantics. No unit changes owner, no
rejection name is minted or moved (the 54-name registry is
byte-untouched), no invariant disposition moves, no chapter trace is
touched. The chapter's own coverage axes (§13.2 — 4 units, 6
invariants, 1 trace) belong to P1/P2 exclusively; the drift lanes are
green before and after.

## Claim

No consumer's departure from a CLI output pipe can make a shipped v3
CLI entrypoint emit a raw stack, an error document it did not mint,
or a byte on a channel the ch6-P4a rule does not permit. A closed
stdout or stderr is not an error class: the process stops writing to
the closed stream and terminates on the exit-code rule E3 states in
full — at its next write attempt where there is one. Every write
failure that is NOT a closed pipe stays as loud as it is today, per
delivery path and per stream. With no stream error at all, output is
byte-identical to today.

Dimensions (enumerated before any test row — R-DIMENSIONS):

1. **Trigger classification** — which write failure IS a closure
   (`code === "EPIPE"`) and which is not; both directions.
2. **Delivery path** — the same trigger reaches the sink as an async
   stream `error` event (the measured POSIX-pipe path) or as a
   synchronous `write()` throw; a `false` return is backpressure, not
   a failure. The path is invisible to the classification and
   decisive for the non-closure outcome.
3. **Stream identity** — stdout and stderr follow one closure rule
   with two distinct consequences (a dropped data document vs a
   dropped error document); they select between the two SENTINEL
   branches of E3's three-branch rule, and they decide the
   non-closure outcome together with the delivery path.
4. **Verb shape** — a single-document verb resolves before any
   closure is KNOWN; the TWO multi-write verbs (`tail`, `dev inject`)
   are where a second write meets a known-closed stream.
5. **Recognition site** — where the sentinel surfaces (unwinding from
   the verb body vs raised inside `dispatch`'s own error-document
   write) decides which exit code applies.
6. **Interaction with the verb's own failure** — a closure can
   PREEMPT a failure the verb had not yet resolved; the packet states
   what happens to that suppressed class.
7. **Exit-code preservation** — across all four ch6-P4a classes
   (0 / 2 / 3 / 1), a closure that does not preempt changes none of
   them.
8. **Channel discipline** — every COMPLETED document already delivered
   stays parseable (the NDJSON rows a streaming verb finished writing);
   the one document the consumer cut mid-write is truncated and gets no
   marker (E9c) — the closure is reported to us only after those bytes
   are gone, so nothing can un-send them. No error document is minted
   for a closure, and a verb's own error document on an OPEN stderr is
   unaffected.
9. **Entrypoint coverage** — both shipped entrypoints behave
   identically off one implementation home.
10. **Repetition/idempotence** — a stream can report `error` more than
    once; the rule absorbs repeat CLOSURE reports without state drift
    and never absorbs a non-closure report.
11. **Non-closure preservation** — any other stream error stays as
    loud as today, and "as loud as today" differs by delivery path and
    by stream (the negative of dimension 1, crossed with dimensions 2
    and 3).
12. **No-effect** — with no stream error at all, every shipped
    entrypoint's bytes, framing, stream routing and exit codes are
    unchanged.

## Canonical contract matrix — the closed-pipe behavior contract

| ID | Rule |
|---|---|
| E1 | **Scope and home — TWO production rules, both HOMED in `src/cli/common.ts`; three production files change.** (i) ONE shared sink factory, bound by BOTH shipped entrypoints — the operator CLI (`src/cli/main.ts`) and the dev CLI (`src/cli/dev/main.ts`) — replacing each entrypoint's inline `{ out, err }` lambda pair. Its two stream parameters take a MINIMAL STRUCTURAL type — a `write(chunk: string): boolean` plus an `on("error", …)` registration — so `process.stdout` / `process.stderr` are assignable in production and a seam lane can pass a recording double or a write-throwing double. (ii) The `dispatch` shell's SENTINEL RECOGNITION at its two sites — the verb-call path (production) and the error-document write (SEAM-only per E3) (E3/E4/E5) — a behavior change in the shared shell that fires for every caller, and is INERT for injected sinks that never raise the sentinel (the unit seam is unchanged: `runCli` / `runDevCli` keep their injected-sink signature, and `CliSinks` gains no member, so no construction site outside the boundary moves). `common.ts` gains EXACTLY TWO new module-public exports — the sink factory and the `OutputClosedError` sentinel class (the seam lanes need both; "internal" in E4 means never RENDERED, not module-private). No other module's export surface moves. The rule has ONE implementation home; the two entrypoint BINDINGS are held unforked by the entrypoint-parity family, not by construction |
| E2 | **Closure trigger and its two delivery paths.** A write failure whose error `code` is `EPIPE` marks that stream CLOSED — reaching the sink EITHER as the stream's asynchronous `error` event (the measured POSIX-pipe path) OR as a synchronous throw from `write()`. The classification is by error CODE and by nothing else: not by delivery path, not by stream state, not by verb. DISPOSITION of the ESTABLISHING failure (the write that DISCOVERS the closure, either path): it is ABSORBED — the stream is marked closed and the sink call returns normally, so both delivery paths have the same observable and only a write ATTEMPTED AFTERWARDS raises the sentinel (E4). REACHABILITY: the synchronous path is production-UNREACHABLE for EPIPE on the measured substrate (50 successive large writes on a known-closed pipe threw nothing — receipt below); Node surfaces stream write faults through the `error` event rather than a synchronous throw, so the same is INFERRED (not separately measured) for other codes. The sync arm is therefore a SEAM-only branch, kept because the classification must not depend on the path, and driven by family 1's write-throwing double. `write()` returning `false` is backpressure and is NOT a closure. RULED OUT as members, each with its reason: `ERR_STREAM_DESTROYED` (measured — after EPIPE the stream is not destroyed, and no shipped entrypoint path destroys its own output stream) and `ERR_STREAM_WRITE_AFTER_END` (no `.end()` call on either stream exists in the tree — sweep in Embedding gates) |
| E3 | **The exit-code rule (canonical; E4 and E5 are its deferring mirrors).** THREE branches, exhaustive over the sentinel's two raise sites — the verb call (production) and `dispatch`'s own error-document write, which is SEAM-only because production writes stderr at most once per process: (1) NO sentinel — the process exits with the code the verb resolved, and the ch6-P4a matrix is untouched: `0` success / `2` usage-config / `3` not-found-kernel-negative / `1` integrity-internal, mapped by `exitCodeFor` (`usage → 2`, `not_found → 3`, `internal → 1`); (2) a sentinel unwinding from the VERB BODY and REACHING `dispatch` unchanged — the closure preempted the verb, and `dispatch` returns `EXIT.ok` (0). PRECEDENCE, decided here: a cleanup that THROWS on the way out REPLACES the sentinel (`Promise.finally` substitutes the new rejection, and `withStore` / `withStoreAndDiag` call a fallible `handle.close()` → `db.close()`), and that error WINS — it takes its normal loud path (E6b), so the run reports the cleanup failure with exit 1 and its error document on an OPEN stderr (a closed stderr follows E5 — the code stands, the document is dropped), never 0. Rationale: a store handle that cannot close is a real failure unrelated to the pipe, and muffling it because a consumer walked away is exactly the general-error swallow E6 forbids; (3) a sentinel raised by `dispatch`'s OWN error-document write — the class code already computed for that error STANDS (E5). Exhaustiveness rests on a MEASURED fact the inventory carries: every verb-side sink call is `sinks.out`, and the tree's only `sinks.err` consumer is `dispatch` itself (`common.ts:223`) — a verb-side `sinks.err` call would route a closed STDERR through branch 2 and contradict E5, so it is a build-close red. A closure mints NO error document and writes NO byte; a verb's own error document on an OPEN stderr is unchanged in shape and content — the canonical document is `{ "error": { "class": "usage" \| "not_found" \| "internal", "name": string, "message": string, "details"?: object } }` (ch6-P4a's keyset-tested schema, pulled in whole because the no-effect and open-stderr obligations assert against it). No lane joins the exit matrix |
| E4 | **Post-closure behavior.** Once a stream is marked closed the sink writes nothing more to it, and the FIRST write ATTEMPTED after closure throws the internal `OutputClosedError` sentinel (its `message` is a fixed constant that matches no message-discriminating catch in the traversal inventory — measured: the prefix test at `main.ts:553`, inside the catch at `main.ts:546`, is the tree's ONLY message discriminator on the path). ORDERING (why the production reach is narrow): a stream is KNOWN closed only AFTER a failed write on it, and the establishing failure is absorbed (E2) — so a single-document verb resolves before the closure is knowable and NEVER reaches the sentinel in production; only the two multi-write verbs do (dimension 4). The sentinel unwinds through the verb's own cleanup, and if a cleanup THROWS, E3's precedence rule governs (the cleanup error wins, loud). The THREE forms REACHABLE from a multi-write verb all run normally — `withStore` (`common.ts:140-142`, plain `tail`), `withStoreAndDiag` (`common.ts:164-167`, `tail --diag` and `dev inject`), and `dev inject`'s inner `finally { processRunner.close(); }` (`dev/main.ts:294-296`). PROOF SPLIT, stated so no obligation is silently unmet: the first two are DRIVEN (their close is observable through the injected deps — family 3); the third is proven STATICALLY — the close sits in a `finally` wrapping the sink write, and a `finally` cannot be skipped by an exception traversing it, so no test asserts it and none is owed. A build that MOVES that close outside its `finally` breaks the static premise without reddening any lane; the build-close cleanup-form sweep is what catches it (a `finally` block whose classification changes is a red). The CLI plane's other cleanup blocks (`withDiagStore` `common.ts:179-181`; `main.ts:360-362`, `741-743`; `runnerVerbs.ts:458-460`, `515-517`, `604-607`, `780-782`; `dev/main.ts:624-627`) sit behind verbs that write at most ONE document — three of them write NONE (the inventory's zero-document verbs) — and are unreachable by this ordering, named so the build-close sweep has a disposition for every block it finds. TRAVERSAL RULE: every per-verb catch between a sink write and `dispatch` must RETHROW the sentinel unchanged — the measured catch-site inventory (Embedding gates) is the current proof, re-run at build close, and a catch that maps unknown errors into a `CliError` between those points is a red. The sentinel is internal: recognized in `dispatch` BEFORE its generic `CliError` wrap, it never reaches a user-visible surface. REPETITION: a stream may report `error` more than once (two writes issued before the first event lands, or a listener firing again on an already-closed stream); every further report CARRYING `EPIPE` is absorbed without state change, and a report carrying any other code takes E6's lane regardless of the stream's closed mark |
| E5 | **stderr symmetry.** A closed stderr follows E2 and E4. `dispatch`'s error-document write sits INSIDE its own `catch` (`common.ts:223`), so anything raised there cannot be caught by that `try`: the recognition needs its own inner guard around that write, which absorbs the SENTINEL and returns the class code already computed (E3 branch 3). The guard is scoped to the sentinel TYPE alone — anything else it sees escapes `dispatch` entirely and surfaces loud (E6c). A closed stderr never converts a failing verb into a successful one |
| E6 | **Non-closure preservation, PER DELIVERY PATH AND PER STREAM (the structure-vs-semantics line, drawn once).** Any stream error whose code is not `EPIPE` keeps today's loud outcome for ITS path and stream: (a) the ASYNC path, either stream — the listener rethrows, so it remains an unhandled error: uncaught exception, exit 1, Node's own stack on stderr, and the stream error itself mints no document; (b) the SYNC path at a VERB-SIDE write (`sinks.out` — the only non-`dispatch` sink call, E3) — the throw is rethrown from the sink unchanged, unwinds the verb, and reaches `dispatch`'s generic branch, which mints ONE error document (`class: "internal"`) and exit 1, exactly as a bare sink does today; (c) the SYNC path at `dispatch`'s OWN error-document write (`common.ts:223`, stderr's only write site) — the throw escapes the type-scoped inner guard AND `dispatch`'s own `try`, so NO document is minted and the process ends on Node's uncaught path with exit 1 — again the bare sink's outcome, and the reason E5 states the guard's scope. The stack's exact frames are NOT part of the contract: the async rethrow drops Node's `Unhandled 'error' event` framing while keeping the class (measured — receipts). The sink is a closure classifier, never a general error swallow: no `catch` this packet adds may broaden beyond the E2 code test, EXCEPT the two sentinel-type recognitions E1(ii) declares, each scoped to the sentinel type alone |
| E7 | **The defect being closed** (DERIVATION: the observed stderr payload is read against the ch6-P4a CHANNEL RULE — "every failure = ONE error document on stderr" — which it breaches; the class assignment is NOT part of this derivation: ch6-P4a's class 1 literally covers "unexpected errors", so today's exit 1 CONFORMS, and reclassifying a closure out of class 1 is E3's new decision, not a breach being repaired). MEASURED: with the bare `process.stdout.write` sink a closed pipe surfaces as an unhandled `error` event → exit 1 plus a raw Node stack on stderr (the byte sizes ride in the probe receipts) (derived: prose:packet ch6-p4a channel + error contract) |
| E8 | **Repro classes — invocation-form dependent** (DERIVATION: the plan's carried item cites one command form; the measurement EXTENDS it into the family below and adds the form dependency the lanes must respect). Two classes: (a) the consumer stops reading before the CLI's document is drained (`… \| head -c 5`, a quitting pager, a `jq` that stops reading); (b) a multi-write verb writes again after the consumer left (`tail … \| head -1` followed by a later committed row). INVOCATION FORM decides class (a)'s reach: through the `pnpm v3:cli` bridge the banner pnpm prints on stdout satisfies `head -1` on its own, so the plan's cited `detail … | head -1` reproduces AT ANY DOCUMENT SIZE (measured on a 586 B document); spawning the entrypoint DIRECTLY (`tsx src/cli/main.ts`), `head -1` over a single-line JSON document drains it to the newline and CANNOT reproduce (measured at 586 B and 121 KB). Test lanes spawn the entrypoint directly (in-context note 2), so both the direct `head -1` form (it drains) and the bridge form (its first stdout bytes are not the CLI's) are stated non-members of the journey family (derived: prose:plan §13.1 item 5, prose:plan §1.3 carried item (1)) |
| E9 | **Declared Absents.** (a) A multi-write verb (`tail`, `dev inject`) parked between writes with no further write does not observe the closure — it keeps waiting exactly as it does today (closure is observable only at a write attempt; the tail engine has no cancellation seam and this packet adds none). (b) No SIGPIPE-style `141` exit and no signal emulation. (c) No truncation marker on any surface — the CLI never reports that its output was cut. (d) Backpressure (`write()` → `false`) stays unhandled, exactly as today. (e) The `attach` verb's `stdio: "inherit"` exec (`cli/runtime.ts:69`) hands the operator's fds to the tmux child; those are the CHILD's writes and lie outside every sink. (f) A sentinel abort skips whatever the verb would have done AFTER its write — including the R2 shutdown drain (`main.ts:358`, `runnerVerbs.ts:456`), which sits outside any `finally`. Production-unreachable by E4's ordering (neither multi-write verb has a drain) and driven by no lane; stated so that a lane author staging a pre-closed sink on a drain-carrying verb has a disposition for the skipped drain rather than a surprise |
| E10 | **Sibling precedent — a NARROWING, not a transfer** (DERIVATION: the cited code is read at source and is BROADER than this rule, so the relation is stated as the delta). `runner/spawn.ts:95` is `child.stdin?.on("error", () => {})` — an UNCONDITIONAL swallow of every error on the CHILD's stdin, because input delivery there is best-effort ("EPIPE" appears only in the rationale comments, `spawn.ts:55,92`). E1–E6 apply the listener idiom to the process's OWN output streams and NARROW it to the E2 code test; a verbatim copy of the GR2 shape onto the sinks would violate E6. The GR2 seam is untouched and outside this packet's boundary (derived: prose:runner/spawn.ts GR2) |
| E11 | **Failure masking — accepted, stated, and NARROWLY triggered.** Masking happens iff a post-closure WRITE ATTEMPT comes BEFORE the verb's pending failure would have surfaced: that attempt raises the sentinel, the work aborts, and E3 branch 2 reports 0 — provided the verb's cleanup completes; a cleanup that throws takes E3's precedence clause instead and the run reports that error with exit 1. Observing the closure is NOT enough — the sink must actually be asked to write again. The walked instance: `tail` writes row N, the consumer has left, the loop asks to write row N+1, the sentinel aborts the loop, and the `TailIntegrityError` (class 1) the next `loadInstance` would have raised is never reached. The counter-instance, equally in contract: a batch yields its LAST row, the closure is marked, and `loadInstance` (`floor/tail.ts:80-87`) returns null before any further write — no sentinel fires, so the integrity failure surfaces normally with its error document and exit 1. Masking is therefore a race the write order decides, not a consequence of the closure. ACCEPTED because the party that closed the pipe is the party that would read the code, and no surface loses a record (the failure, if it recurs, is reported to the next reader). No lane is silently lost: the masking case is a DRIVEN member of the quiet-contract family |
| E12 | **No-effect (the success lane).** With NO stream error at all, both shipped entrypoints are byte-identical to today: one newline-terminated line per data document on stdout, exactly one error document per failure on stderr, the four exit classes unchanged. The factory owns the line framing and the stream routing, which the SINK-INJECTION seam (`runCli` / `runDevCli` with injected sinks) structurally cannot observe — it receives an already-built sink. Both proofs are therefore taken elsewhere: the FACTORY seam (a recording double per stream) asserts the framing and the routing, and the production binding through a subprocess asserts that the shipped entrypoints bind that factory |

**Site × shape × phase grid.** Three closed axes. SITE: {stdout,
stderr}. SHAPE: the six shapes a write's fate takes —
{async `error` EPIPE, sync `write()` throw EPIPE, async `error` other
code, sync `write()` throw other code, `write()` → `false`, no error}
— PLUS the seventh, {a write ATTEMPT issued while the stream is
already marked closed}; the mark state itself is carried by the PHASE
axis, not by the shape set. PHASE: {before closure is known, the
establishing failure, after closure is known}. PHASE APPLICABILITY —
the product is not free, and the split is by MECHANISM, named rather
than counted. FOUR shapes are results the `write()` CALL itself
returns or throws — the two sync throws (EPIPE and other code),
`write()` → `false`, and `no error` — and after closure the sink
raises the sentinel INSTEAD of calling `write()` (E4), so none of
those four can occur in the after-closure phase. BOTH async `error`
REPORT shapes (EPIPE and other code) CAN occur there: a report
arrives from the stream independently of whether we called it (E4's
repetition clause and family 4's post-closure member drive exactly
that). The seventh shape occurs ONLY in the after-closure phase. Every reachable site × shape × phase cell is
driven or ruled out below; the cells this paragraph excludes are
ruled out by construction:

| Site | Failure shape | Phase | Behavior |
|---|---|---|---|
| stdout | async `error`, code EPIPE | the establishing failure | mark closed; no bytes, no document (E2/E3 branch 1) |
| stdout / stderr | async `error`, code EPIPE | after closure is known | absorbed, no state change. Reachability: two writes issued before the first event lands, or a repeat report on a closed stream (E4's repetition clause); on stderr, SEAM-only — production writes it at most once (E3) |
| stdout | sync `write()` throw, code EPIPE | the establishing failure | absorbed; the stream is marked closed and the call returns normally (E2). Reachability: SEAM-only — production-unreachable on the measured substrate |
| stdout / stderr | `write()` returns `false` | before closure is known | not a closure — unchanged (E2, E9d); it can never BE the establishing failure, since only EPIPE marks a stream closed |
| stdout / stderr | async `error`, other code | before or after closure — never the establishing failure (only EPIPE establishes) | rethrown from the listener → uncaught, exit 1 + stack, the stream error mints no document (E6a, E4's repetition qualifier) |
| stdout | sync `write()` throw, other code | before closure is known (never establishing — only EPIPE establishes) | rethrown from the sink → unwinds the verb → `dispatch`'s generic branch → ONE internal error document + exit 1 (E6b). Reachability: SEAM-only, same substrate reason as the EPIPE sync row (inferred for non-EPIPE codes) |
| stderr | sync `write()` throw, other code | before closure is known (never establishing), at `dispatch`'s document write | escapes the type-scoped guard AND `dispatch`'s `try` → no document, Node's uncaught path, exit 1 (E6c, E5) — stderr's only write site is `dispatch`'s own, so the E6b chain cannot arise here |
| stdout | write ATTEMPT while closed | after closure, verb resolved nothing yet | `OutputClosedError` → cleanup → `EXIT.ok`, PROVIDED cleanup completes; a cleanup that throws replaces the sentinel and the run reports THAT error with exit 1 (E3 branch 2's precedence clause, E4) |
| stdout | write ATTEMPT while closed | after closure, a verb failure pending but unresolved | the failure is preempted and never resolves; `EXIT.ok`, under the same cleanup-completes proviso (E11, E3 branch 2) |
| stderr | async `error`, code EPIPE | the establishing failure, after `dispatch`'s document write returned | absorbed by the listener (E2); the class exit code stands and the process does not exit 1 (E3 branch 1/E5) |
| stderr | sync `write()` throw, code EPIPE | the establishing failure, at `dispatch`'s document write | absorbed as the establishing failure (E2); the class exit code stands — no sentinel, no escape from the catch |
| stderr | write ATTEMPT on a stream already closed | after closure, inside `dispatch`'s catch | the inner guard absorbs the sentinel; the class code stands (E3 branch 3, E5). Reachability: production writes stderr at most once per process (the single-`sinks.err`-site fact, E3), so this cell is reached by the SEAM lanes (a pre-closed injected sink); it is the guard's falsifier, not a production path |
| stdout / stderr | no stream error at all | before closure is known | one newline-terminated line per document on the correct stream; bytes and exit codes unchanged (E12) |

**Mirrored Surface Map** (each rule stated ONCE in its canonical row;
every other mention defers). A change to a canonical row updates
every mirror listed for it before the fold is handed back.

| Canonical | Mirrors |
|---|---|
| E1 (scope + home) | dimension 9; the packet title; pre-approval flag 1; the Sizing record's surface-spread paragraph; the Embedding gates' "Entrypoints" bullet; the `mutation_boundary` file list; acceptance family 5; plan §13.1 item 5 and plan §13.4's ch13-P0 row (both aligned blocks). Declared NON-mirror: plan §1.3 carried item (1) — a dated ch9-close verdict record, preserved at its ratified wording (re-measured and CONFIRMED), never realigned forward |
| E2 (closure trigger + delivery paths + establishing disposition) | dimensions 1–2; in-context note 1; E9(d); grid rows 1–6 and 10–11; the Embedding gates' `.end()`/`.destroy()` sweep and its build-close red; the probe receipts (the post-EPIPE-state and sync-reachability entries); acceptance family 1's membership |
| E3 (exit-code rule + document schema + the single-`sinks.err` fact) | the Claim's second sentence; dimensions 3, 5, 7, 8; grid rows 1, 2, 7–13; E4's and E5's own code statements; the Embedding gates' sink-consumer inventory; E11's canonical row; acceptance families 2 and 3 (family 3 restates branch 2's outcome, cleanup proviso included), family 2's cleanup-throw member, family 1's stderr-sync member (branch 1's "the class exit code stands") and family 6 (branch 2's normal-path values); pre-approval flags 3 and 4 (both restate the quiet-exit outcome); the build-close sensitivity probe (2), whose mutation targets branch 2's returned code; the build-close sweep's `sinks.err` red |
| E4 (post-closure + ordering + cleanup forms + traversal + repetition) | dimensions 4, 10; grid rows 2, 5, 8; the Embedding gates' cleanup-form and catch-site inventories; the probe receipts (the post-EPIPE-state entry); the Build-close sweeps bullet; acceptance family 3, and family 4's post-closure member (which carries the repetition clause's non-closure half) |
| E5 (stderr symmetry + inner guard) | dimension 3; grid rows 7, 10–12; acceptance family 2's stderr members; family 4's guard member |
| E6 (non-closure preservation, per path and stream) | the Claim's third sentence; dimensions 1, 2, 3, 11; grid rows 5, 6, 7; the probe receipts (the non-EPIPE preservation entry); acceptance families 1 and 4 |
| E7 (the defect) | the class-(a) probe receipts (the measured byte sizes live there, not in the row) |
| E8 (repro classes + invocation form) | acceptance family 6's membership and its two stated non-members; in-context note 2; the probe receipts; plan §13.1 item 5's repro clause (the bridge form the aligned edit preserves) |
| E9 (Absents) | pre-approval flag 4 (E9a); grid row 4 (E9d); dimension 8's no-marker clause (E9c); E4's ordering clause names (a)'s mechanism; the Embedding gates' writer inventory carries (e); the probe receipts' class-(b) entry carries (a)'s observation; the Acceptance preamble's exemption clause |
| E11 (masking) | dimension 6; grid row 9; pre-approval flag 3; acceptance family 2's preempted PAIR (both sides of the race) |
| E12 (no-effect) | the Claim's last sentence; dimension 12; grid row 13; acceptance family 7 |
| E10 (sibling precedent) | the Embedding gates' writer inventory (the GR2 comment hits) |
| (aggregate) | pre-approval flag 2 restates every new-decision row in nine clauses — a declared AGGREGATE mirror of E1–E6, E9, E11, E12 |

## In-context notes (the scarce budget)

- The listener is the load-bearing mechanism, not a `try`/`catch`:
  on the measured substrate (macOS/Darwin, Node 24) a piped stdout
  delivers EPIPE as an ASYNC `error` event after `write()` has already
  returned, and never as a synchronous throw. A packet that wrapped
  `write()` in `try`/`catch` alone would catch nothing there. The sync
  arm exists because the classification must not depend on the path,
  not because it was observed in production.
- Lanes spawn `tsx src/cli/main.ts` / `tsx src/cli/dev/main.ts`
  DIRECTLY, never `pnpm v3:cli` — the bridge prints its own banner on
  stdout, so a lane through it measures a stream the CLI does not own
  (the existing journey suite already spawns directly). The `head -c N`
  fixture additionally needs a document larger than the OS pipe buffer
  (measured 65536 on the probe substrate), because a smaller one is
  drained before the consumer exits; the fixture stages ≥120 KB.
- Suite-load watch (ch9 boundary): a new subprocess-spawning test file
  adds real-substrate load. If the suite destabilizes, the recorded
  remedy is that watch's promotion (a serial vitest lane for
  real-substrate files) — not a change here.
- The probe receipts are Darwin-only; the v3 suite also runs on
  `ubuntu-latest` in CI, where Node's pipe I/O is documented to differ.
  The PRE-CLOSE Linux check is `pnpm ci:github-local` (the checked-in
  workflow-parity script: `node:24-bookworm`, `linux/amd64`, running
  the release job's command list); it is Docker-gated, and BOTH gate
  outcomes are RECORDED skips with their reason, never a silent pass
  and never a lane finding — exit 127 (the `docker` binary is absent)
  and exit 1 carrying the script's "could not reach the Docker daemon"
  message (installed but not running). Any other nonzero exit IS a
  lane finding. The real CI
  run is triggered by this packet's own commit, so its outcome lands
  in the Build record as an aftermath append (the ch9-P0 form), and a
  Linux-only divergence is a finding against the lanes.

## Embedding gates

- Target files: the mutation boundary below, nothing else. No new
  verb, flag, env var, or bridge; the CLI's argument surface is
  byte-unchanged.
- Entrypoints: `src/cli/main.ts` and `src/cli/dev/main.ts` — the two
  shipped entrypoint blocks only (their sink lambdas) — plus the
  shared `dispatch` shell in `src/cli/common.ts` (E1(ii)).
- READ-ONLY citations the seam file needs (not boundary entries — no
  edit is owed to either): `src/cli/runtime.ts:21-50` defines
  `CliDeps` with TEN required members (`openStore`, `openDiagStore`,
  `time`, `instanceIdSource`, `nonceSource`, `tailWait`, `env`,
  `attemptIdSource`, `workerIdSource`, `runInteractive`) — the seam
  file's own fixture binds all ten, using the testkit's controlled
  clock for `time` and its scripted tail-wait for `tailWait` because
  CHK-D-TESTCLOCK bans real timers in `src/**/*.test.ts` (and the
  scripted seam is also how a multi-write `tail` lane is staged
  in-process), and carrying `PAIRFLOW_V3_TEMPLATES` in `env` for any
  seeded lane.
- Production stdout/stderr writer inventory (MEASURED, untruncated —
  `grep -rn "process\.stdout\|process\.stderr\|EPIPE\|console\.log\|console\.error" v3/src --include='*.ts' --include='*.mjs'`
  filtered to non-test files; the `.mjs` arm covers the tree's one
  non-TS production file, the spawned `runner/attemptWrapper.mjs`, and
  returns zero hits there): exactly TWO write BLOCKS — the sink lambda
  pairs at `cli/main.ts:835-836` and `cli/dev/main.ts:741-742` (four
  `write` calls in two blocks); the only other hits are the
  `runner/spawn.ts:55,92` GR2 comments (E10). Plus the
  `stdio: "inherit"` exec in `cli/runtime.ts:69` (E9e — the child's
  own fds, not a sink). Sweep `\.end\(|\.destroy\(` over the same
  scope: no call on `process.stdout` or `process.stderr` exists
  (`spawn.ts:96` is the CHILD's stdin) — E2's ruled-out members.
  METHOD SCOPE, stated because the claim is an exhaustiveness one: the
  grep above is LEXICAL and would not see a stream obtained another
  way. Two further sweeps close that gap, both re-run at build close.
  (a) NAMES-INDEPENDENT — `grep -rn "\.write\b" v3/src` over non-test
  `*.ts`/`*.mjs`. Its RESULT MOVES WITH THIS BUILD, deliberately:
  BEFORE, exactly the four calls of the two entrypoint blocks; AFTER,
  exactly ONE — the factory's own, since E1 collapses the four into
  it. The invariant across both is what the sweep is for: no writer
  call of any provenance exists ANYWHERE ELSE. The build-close red is
  therefore a writer call OUTSIDE the factory, never the count itself.
  (b) The alias forms that would evade both — `from "node:process"`,
  `writeSync(`, `process["stdout"]`, a destructured `const { out } =
  …`, a sink member captured into a local — sweep to ZERO, before and
  after. A hit in the lexical sweep, an alias hit, or a writer call
  outside the factory is a red.
- Sink-consumer inventory (MEASURED, `grep -rn "sinks\.out\|sinks\.err"
  v3/src --include='*.ts'` minus test files): **18 sites across FOUR
  production files** — 17 `sinks.out` calls in `cli/main.ts` (10),
  `cli/dev/main.ts` (5) and `cli/runnerVerbs.ts` (2), plus EXACTLY ONE
  `sinks.err`, `dispatch`'s own error-document write at
  `cli/common.ts:223` (E5's subject; the fact E3's branch exhaustiveness
  and E6c both rest on). Multi-write verbs (the only production reach
  of the sentinel, E4): `tail` (`main.ts:426`, inside `for await`) and
  `dev inject` (`dev/main.ts:291`, one row per step); `runner run
  --once` and `runner respawn` each emit exactly ONE document
  (`runnerVerbs.ts:448`, `:513`) and the foreground `runner run` emits
  none. Cleanup forms reachable from a multi-write verb: the three E4
  names; the CLI plane's other `finally` blocks are E4's named
  unreachable set (11 blocks total, 3 + 8, none unclassified). SCOPE
  of that sweep: `src/cli/**` PLUS the async-iterator `return()` path
  of the tail generators (`floor/tail.ts` `tailLoop` / `diagTailLoop`),
  which a sentinel abort also resumes — measured: ZERO `finally`
  blocks there today, so the reachable count is three; a `finally`
  appearing in either generator is a build-close red.
- Catch-site inventory between a sink write and `dispatch` (MEASURED —
  E4's traversal rule): `main.ts:428→447` (verbTail's typed ladder,
  terminal `throw error`), `main.ts:546→557`, the five
  `toTemplateInvalid` sites (`main.ts:561/593/626/654/746` — identity
  for non-`TemplateLoadError`), `dev/main.ts:298→299`,
  `dev/main.ts:611→623`, `dev/main.ts:694→701`. Every one rethrows an
  unknown error unchanged today. Catches that run BEFORE any sink
  write, so the rule does not reach them: `common.ts:59`
  (`openStoreOrInternal` → `CliError("internal")`), `common.ts:102`
  and `common.ts:209` (→ `usage`), `runnerVerbs.ts:230` and `:424`
  (construction-time), `dev/main.ts:216` and `:660` (`readFile` →
  `usage`); the bare `catch {}` sites `main.ts:130,215`,
  `runnerVerbs.ts:182,701,719`, `dev/main.ts:224`; and the non-catch
  mapping throw at `dev/main.ts:671`.
- Substrate probe receipts (in-session, Node v24.18.0 — the v3 engine
  floor is `>=24` (`v3/package.json`; the repo root is `>=22`), so
  the probes ran AT the floor. Platform: macOS / Darwin 25.5 — see
  in-context note 4 for the CI-substrate obligation.
  R-INSTRUMENT-PROBE: exact commands, outcomes, and the INVOCATION
  FORM, which decides the outcome. WHAT IS CONTRACT-RELEVANT in each
  receipt: the exit code, whether stderr is empty or non-empty, and
  whether Node's `Unhandled 'error' event` framing is present. The
  stderr BYTE COUNTS below are OBSERVATIONAL only — they move with the
  probe file's path length and the invocation form, and no row, lane
  or family asserts them):
  - bare-sink mirror (`sinks.out` shape copied verbatim), 200 KB
    document `| head -c 5` → node exit **1**, 497 stderr bytes,
    `Error: write EPIPE` + `Unhandled 'error' event`;
  - the same with an `error` listener + a closed-guard, verb code
    `3` → node exit **3**, **0** stderr bytes;
  - post-EPIPE state: the second `write()` returns `false`, throws
    nothing, `destroyed === false`, `writableEnded === false`, and
    re-emits a second `error` event (E2's ruled-out
    `ERR_STREAM_DESTROYED`; E4's repetition clause);
  - sync-throw reachability: 50 successive 100 KB writes on a
    known-closed pipe → **zero** synchronous throws,
    `destroyed === false` (E2's SEAM-only ruling);
  - non-EPIPE preservation (E6a): a `Writable` erroring with
    `code: "EACCES"` — bare → exit **1**, framing present; with the
    rethrowing listener → exit **1**, framing absent (class kept,
    bytes not: ~1049 B vs ~988 B on this probe, and the counts move
    with the probe file's path, so only the exit code and the
    framing presence are contract-relevant);
  - REAL CLI, DIRECT entrypoint, class (a):
    `tsx v3/src/cli/main.ts timeline <id> --db … | head -c 5` on a
    121 KB document → CLI exit **1**, 600 stderr bytes of raw stack;
  - REAL CLI, DIRECT entrypoint, class (b):
    `tail <id> --db … --poll-ms 100 | head -1` then a `submit`
    committing a further row → CLI exit **1**, 600 stderr bytes
    (before the row lands the tail simply waits — E9a's pre-existing
    behavior, observed);
  - REAL CLI, BRIDGE form: `pnpm v3:cli detail <id> --db … | head -1`
    → CLI exit **1**, 1128 stderr bytes, at a 586 B document — the
    pnpm banner on stdout satisfies `head -1` before the CLI writes
    (E8's form dependency);
  - REAL CLI, DIRECT entrypoint, non-repro: `detail <id> | head -1`
    at 586 B and at 121 KB, and `timeline <id> | head -1` at 121 KB →
    exit **0**, 0 stderr bytes (E8's stated non-member);
  - pipe buffer measured at 65536 bytes.

```json
{
  "mutation_boundary": {
    "files": [
      "v3/src/cli/common.ts",
      "v3/src/cli/main.ts",
      "v3/src/cli/dev/main.ts",
      "v3/src/cli/closedPipeSink.test.ts",
      "v3/src/cli/closedPipe.test.ts",
      "v3/vitest.stryker.config.ts",
      "v3/implementation/plan.md",
      "v3/implementation/packets/ch13-p0-closed-pipe-sink.md"
    ]
  }
}
```

File roles: `closedPipeSink.test.ts` is NEW and deliberately NOT
stryker-excluded — the in-process SEAM lanes (families 1–4's seam
members and family 7's factory member), which is where this packet's
new branching logic lives, so the mutation pilot gets real signal
(flag 5). It carries its OWN `CliDeps` fixture per the read-only
citation above: the existing `testDeps()` helpers in `cli.test.ts` /
`dev/dev.test.ts` are non-exported locals and no test file in this
tree imports another, so no fixture module is extracted.
`closedPipe.test.ts` is NEW and JOINS the stryker exclude list —
every SUBPROCESS lane (families 5, 6, 7's binding members, and family
4's process-level member), which exec the repo-root tsx bin that
Stryker's sandbox copy cannot resolve (the ch9-P4b mechanism); that
exclusion is the only edit to `vitest.stryker.config.ts`. The ch6-P4a
last-mile smoke inside `cli.test.ts` stays UNEDITED (family 7's
by-reference member) — no boundary entry is owed for a file the build
does not touch. `plan.md` carries the two aligned edits (flag 1).

## Row manifest

```json
{
  "packet_rows": {
    "rows": [
      { "id": "E1", "class": "new-decision", "refs": [] },
      { "id": "E2", "class": "new-decision", "refs": [] },
      { "id": "E3", "class": "new-decision", "refs": [] },
      { "id": "E4", "class": "new-decision", "refs": [] },
      { "id": "E5", "class": "new-decision", "refs": [] },
      { "id": "E6", "class": "new-decision", "refs": [] },
      { "id": "E7", "class": "derived", "refs": ["prose:packet ch6-p4a channel + error contract"] },
      { "id": "E8", "class": "derived", "refs": ["prose:plan §13.1 item 5", "prose:plan §1.3 carried item (1)"] },
      { "id": "E9", "class": "new-decision", "refs": [] },
      { "id": "E10", "class": "derived", "refs": ["prose:runner/spawn.ts GR2"] },
      { "id": "E11", "class": "new-decision", "refs": [] },
      { "id": "E12", "class": "new-decision", "refs": [] }
    ]
  }
}
```

## Sizing/risk (template §2 step 0 — materialized)

Predicted class (plan §13.4 P0 row): **invention (memo-born — basis:
the ch9 boundary verdict)**. Discovered at authoring: **invention** —
prediction and discovery agree (9 new-decision rows; the behavior
contract is decided here by ratified chapter disposition).

Six axes: **authority movement** — NO. No canonical source of truth
moves: the ch6-P4a exit matrix and channel rule stay the authority
and gain no lane (E3); this packet states how a NON-failure is
handled below them. **Surface spread** — ONE production surface for
one concept (the CLI human-payload plane): a factory plus a
recognition branch homed in `common.ts`, consumed by the two
entrypoint blocks (three production files, one module, one concept).
No kernel, store, floor, ingress, emit, definition, gates, runner, or
providers file moves; the testkit CONTRACT is untouched — no new fake
or fixture module ENTERS the testkit, and the seam file's fixture
CONSUMES two existing testkit bindings (the controlled clock and the
scripted tail-wait) alongside plain recording streams and a
write-throwing double, all local to the new test files.
**Identity/join fragility** — NO (no ids, no cross-seam correlation).
**Foundation + activation coupling** — NO (nothing is built for a
later switch-on; the change is live at commit). **Prerequisite
coupling** — NO: P0 is the chapter's ordering head, anchors no
contract row, and depends on no sibling. **Acceptance multiplicity** —
one proof surface (`pnpm v3:test`: seam lanes and subprocess lanes in
the same suite; full `ci:local` at close, plus the Docker-gated Linux
parity run; the stryker profile edit is test-configuration
bookkeeping, not a second proof surface). Consume-family scan (not
required — no authority movement; recorded for the read): producer
`present` (the sinks), execution consumer `absent`, read/presentation
`present` (the same sinks), validator/gate `absent`,
persistence/replay `absent`, recovery/cleanup `present` (the cleanup
forms, unchanged by E4), external/integration `absent`, testkit
`absent`. R-NUMERIC-LADDER does not fire: no new validator over a
numeric domain and no wire parse enters — the exit codes are
ch6-P4a's existing matrix, and 65536 / ≥120 KB are measurement
constants. No hard stop and no escalation combination trips;
**single-packet allowed: yes** (evidence: one bounded change in one
module closes every touched bucket, one proof surface validates it,
and no per-consumer-family review loop is expected).

## Pre-approval flags

1. **Scope widening beyond the plan's letter — both shipped
   entrypoints, and the `dispatch` shell (E1).** Before this packet's
   aligned edit, plan §13.1 item 5 named "the operator CLI's stdout
   sink". The dev CLI's entrypoint carries the byte-identical bare
   sink and crashes identically, and the sentinel recognition
   necessarily lands in the SHARED `dispatch` shell both entrypoints
   call. This packet fixes both through one home; two aligned plan
   edits (§13.1 item 5 and the §13.4 ch13-P0 row) make the ratified
   text say so. Plan §1.3's carried item is deliberately NOT realigned
   — it is a dated ch9-close verdict record. Alternative if declined:
   operator-only, leaving the two shipped entrypoints forked on a rule
   their shared shell exists to keep unforked. RECOMMENDATION: widen.
   `Route: approve-ratified`
2. **The behavior contract itself (E1–E6, E9, E11, E12) is decided at
   this packet.** Nine new-decision rows: the scope, the EPIPE-only
   classification with its establishing-failure disposition, the
   three-branch exit rule, the sentinel with its ordering and
   traversal rules, the stderr inner guard, the per-path-and-stream
   non-closure preservation line, the six Absents, the accepted
   failure masking, and the no-effect rule. The Case-B draft route is
   disposed by plan §13 opening disposition 3 (ratified 2026-07-25: a
   single-packet decision has no cross-packet drift to prevent), so
   these ride to this human approve instead of a contract-draft round.
   ADDENDUM, surfaced by the pre-build external-arm gate AFTER the
   approve and therefore carried as its own decision point: a CLEANUP
   that throws while the sentinel unwinds (`Promise.finally` replaces
   the sentinel with it, and `handle.close()` → `db.close()` is
   fallible) is resolved so the CLEANUP ERROR WINS and stays loud
   (E3's precedence clause), because the alternative would muffle a
   genuine store failure behind a closed pipe — the one thing E6's
   ratified line forbids. `Route: approve-ratified`
3. **A closure can mask a real failure (E11) — but only when another
   write is attempted first.** If a `tail` whose consumer left is
   asked to write one more row, the sentinel aborts the work and a
   `TailIntegrityError` that would have exited 1 never materializes;
   the run reports 0. If no further write is attempted, the failure
   surfaces normally with its document and exit 1 — so the masking is
   a race decided by the write order, not by the closure itself. The
   packet accepts the masked case: the party that would read the code
   is the party that closed the pipe, and the failure is not erased —
   it surfaces to the next reader. The alternative (remembering a
   preempted failure and reporting it after the sentinel) would make
   the exit code depend on work the run deliberately abandoned. The
   quiet 0 additionally assumes the verb's cleanup COMPLETES; a
   cleanup that throws wins and the run exits 1 with that error (flag
   2's addendum). RECOMMENDATION: accept as stated; both sides of the
   race are driven by the quiet-contract family.
   `Route: approve-ratified`
4. **A multi-write verb against a closed pipe with no further write
   keeps waiting (E9a).** Today it waits and then crashes on the next
   row; after this packet it waits and then exits quietly — on E3's
   precedence proviso, a cleanup that throws on the way out still
   wins and the run exits 1 with that error. The
   residual wait is pre-existing and unchanged — closure is observable
   only at a write attempt, and giving the tail engine a cancellation
   seam is tail-engine work, not sink work. The louder alternative
   (terminating the process from the `error` listener itself) would
   skip every verb's cleanup to fix one verb's wait.
   RECOMMENDATION: keep the Absent as declared. `Route: approve-ratified`
5. **The mutation-pilot dual-run is a `common.ts` DELTA read, and the
   scoping is a declared ELECTION.** Three structural facts drive it:
   (i) `vitest.stryker.config.ts` excludes every subprocess-driving
   CLI test file, and this packet's `closedPipe.test.ts` joins that
   list; (ii) both entrypoints' changed blocks sit behind an
   `import.meta.url` guard that never executes in-process, so mutants
   on those lines are unkillable by construction; (iii) `common.ts`
   itself carries ZERO stryker-profile coverage TODAY — every existing
   test that exercises it is on the exclude list — so an absolute
   score would measure the exclude list, not this packet. The
   election: the seam lanes are homed in a NON-excluded file, and the
   dual-run mutates only `src/cli/common.ts`. The pre-change BASELINE
   is not a number and cannot be: running the command on today's bytes
   MEASURABLY aborts — `stryker run --mutate src/cli/common.ts` exits
   1 with "Vitest failed to find test files related to mutated files /
   No tests were found" (measured by the external arm on the
   approve-candidate basis). That abort IS the baseline evidence, and
   it is recorded verbatim. The post-build run therefore yields an
   ACTIVATION number — the first mutation score this file has ever
   had — not a delta against a prior score. Declared because plan
   §13.5 DoD item (b) reads this yield: it is `common.ts`'s activation
   number under the seam lanes, never a packet-wide score.
   `Route: boundary-review`
6. **Difficulty band, computed and FROZEN at this approve: MEDIUM
   (Σ 4) — not the "Light-band opener" the ratification prose
   predicted.** `model-tier-experiment-2.md` §3's rubric is
   mechanical and its bands are frozen (Light 0–3 / Medium 4–6 /
   Heavy 7–10), computed at the packet's APPROVE point so build
   outcomes cannot leak into it. This packet's vector, from its own
   machine blocks: **A = 0** (`packet_rows` = 12 ≤ 15); **B = 2**
   (derived 3 + new-decision 9 = 12 > 10); **C = 0**
   (`mutation_boundary` = 8 files ≤ 15); **D = 2** (an async `error`
   seam AND an external substrate — the subprocess lanes); **E = 0**
   (extends an existing module's patterns; the header records "not
   first-of-a-kind"). The D and E calls are the checklist half and are
   resolved BY this approve, per §3. Plan §13 opening disposition 2's
   "a Light-band opener" was a ratification-time PREDICTION and stays
   at its dated wording (the §1.3-carried-item treatment) — no aligned
   edit is owed; what binds is that plan §13.5 DoD item (a) pairs the
   Opus arm against ch9's Fable data on SAME-BAND packets, so the
   pairing uses this measured Medium, never the predicted Light. The
   record's carrier is the experiment's own §8 log, appended at this
   approve (§5's letter; orchestrator-authored, the ch9 precedent) —
   the experiment file is not a boundary entry.
   `Route: approve-ratified`

## Acceptance

- Contract tests: no new CT-* ids — this packet realizes no IC item;
  its claim surface is the E-matrix above (the operability-packet
  form, ch6-P4a precedent).
- Test disciplines + family inventories (R-ALTITUDE-LINE form).
  HOMING is per MEMBER, not per family: every in-process seam member
  lives in `closedPipeSink.test.ts`; every member that spawns a
  subprocess lives in `closedPipe.test.ts` (families 5 and 6 entirely,
  family 7's binding members, and family 4's process-level member).
  EVERY subprocess member — families 5–7's and family 4's — is
  event-driven (`once(child, "exit")`, `once(stream, "data")`), never
  timer-paced: no sleep, no fixed delay. E7, E9 and E10 carry no
  family and are exempt by kind — a diagnosis row, declared Absents,
  and an unchanged precedent (E9(d)'s behavior half rides family 1's
  `false` member; E9(a)'s rides the class-(b) probe receipt).
  - **1. Closure-classification family** (E2, E6) — discipline: BOTH
    directions driven; every declared trigger shape marks closure with
    the establishing failure ABSORBED (the call returns normally), and
    every declared non-trigger does not. Membership, PARAMETERIZED
    over shape × stream: the async EPIPE event and the sync EPIPE
    throw, EACH on stdout and on stderr — the stderr sync member runs
    at the `dispatch` level and asserts that the class exit code
    stands (grid row 11's owner); `write()` → `false` on each stream;
    and the non-EPIPE shapes, whose outcomes family 4 owns. The
    membership is ALSO parameterized over the CLASSIFIER'S DOMAIN,
    because "by code and by nothing else" is not falsifiable from one
    code and one carrier shape: at least THREE distinct non-EPIPE
    codes, an error carrying NO code, a non-object throw, and a
    non-EPIPE code carried by a plain object — plus EPIPE carried BOTH
    by an `Error` instance and by a plain object. The membership is a
    FULL CROSS-PRODUCT over the FOUR axes E2's own sentence declares
    irrelevant — delivery path, stream identity, stream STATE, and the
    carrier's shape — against the one axis it declares decisive, the
    error code. Concretely: CARRIER SHAPE × DELIVERY PATH × STREAM ×
    STREAM STATE on the closure side, and CODE DOMAIN × DELIVERY PATH
    × STREAM × STREAM STATE on the non-closure side, with the
    non-closure lanes asserting the thrown value by IDENTITY (a
    wrapper would satisfy a message match). One cell is unreachable BY
    CONSTRUCTION and is named rather than driven: sync × already-closed
    cannot occur, because after closure the sink raises the sentinel
    INSTEAD of calling `write()` (the grid's phase-applicability rule).
    Fixing ANY one axis leaves a classifier that secretly tests it
    alive — four successive build-close gates each found the next
    unfixed axis by executed mutation. Owner: E2; eight blind
    classifiers are mutation-verified dead: `not-EACCES`,
    `instanceof Error`, `instanceof Error` scoped to the sync catch,
    `instanceof Error` scoped to stderr, a closed stream swallowing
    everything, a repeat EPIPE rethrown once closed, and two
    self-hunted corners (EPERM as a closure on the sync path for
    stdout alone; a closed STDERR swallowing everything). The FIFTH
    thing E2's sentence names — the VERB — is covered without a
    dedicated lane: family 2's members drive real verbs through
    `runCli`, so a verb-scoped classifier reds there; verified rather
    than assumed (`ch13p0-a9-verbScoped`, a latch that applies the
    closure rule to `tail` alone — RED).
  - **2. Quiet-contract family** (E3, E5, E11) — discipline: a closure
    adds NO stderr byte attributable to itself (in particular zero
    raw-stack bytes) and never suppresses a verb's own error document
    on an open stderr; the exit code follows E3's three branches,
    asserted as an EXACT value, never "nonzero"/"truthy".
    Membership, PARAMETERIZED per branch: (1) no-sentinel members over
    the exit classes whose lane actually writes to stdout before
    resolving — `0`, the data half of `3` (a rejected `submit`), and
    `1` via `tail` — each with the closure landing AFTER the write
    (class `2` is named excluded: its lane resolves before any stdout
    write); (2) the preempted PAIR (E11, both sides of the race): a
    `tail` ASKED TO WRITE AGAIN after the closure, aborted by the
    sentinel before its integrity failure resolves, its cleanup
    completing → 0, AND the
    counter-member — a `tail` whose closure is marked but which
    attempts no further write before that failure → exit 1 with its
    error document, unmasked; (2b) the cleanup-throw member (E3's
    precedence rule): a sentinel raised on a closed stdout while the
    verb's `finally` close THROWS → the run reports the cleanup
    failure with exit 1, and its error document only on an OPEN
    stderr (a closed stderr follows E5 — the code stands, the document
    is dropped), never 0; (3) the
    closed-stderr members, PARAMETERIZED over the three error classes
    (`2`, `3`, `1`), each asserting the class code with the document
    dropped, PLUS the after-the-write member (the document write
    succeeds, an async EPIPE lands afterwards, the class code still
    stands and the process does not exit 1) (owner: E3, with E5
    owning the stderr sub-family).
  - **3. Post-closure family** (E4) — discipline: no byte reaches a
    closed stream after closure; the first attempted write raises the
    sentinel; a VERB-BODY sentinel reaching `dispatch` unchanged
    yields E3's branch-2 code with NO error document, PROVIDED the
    cleanup completes — a cleanup that throws replaces the sentinel
    and the run reports THAT error with exit 1 (E3's precedence
    clause). The family's `sentinel-in-dispatch` member is NOT a
    branch-2 case: it follows E3 branch 3 and preserves the class code
    already computed (E5), so the branch-2 sentence does not reach it.
    Each REACHABLE cleanup form still runs (driven by
    observing the close, not by inspecting the sink); every catch site
    of the traversal inventory rethrows it unchanged. Membership: the
    combination lane (closure already reported + a further write), the
    repeat-report lane, the sentinel-in-`dispatch` lane, and one lane
    per cleanup form whose close is OBSERVABLE through the injected
    deps — `withStore` via `tail` and `withStoreAndDiag` via
    `tail --diag`. Named non-member with its reason: `dev inject`'s
    `processRunner.close()` — the runner is constructed inside the
    verb body and reaches no injected seam, so its close cannot be
    observed without a `CliDeps` change E1 forbids; E4 proves that
    form STATICALLY instead (a `finally` an exception cannot skip),
    and the build-close cleanup-form sweep is its guard — no lane is
    owed and none is silently missing (owner: E4).
  - **4. Non-closure preservation family** (E6) — discipline: a stream
    error carrying any other code keeps today's loud outcome FOR ITS
    PATH AND STREAM — the async path rethrown from the listener
    (uncaught, exit 1, non-empty stack, the stream error minting no
    document), the verb-side sync path rethrown into `dispatch`'s
    generic branch (ONE internal error document, exit 1), and the
    `dispatch`-side sync path escaping the guard (no document, exit 1);
    the stack TEXT is not asserted. Derived from the claim, never from
    the implemented branch list (R-CLAIM-NEGATIVES). Membership,
    PARAMETERIZED over delivery path × stream with each cell's
    observable named — and the sync × stderr cell IS the guard-scope
    member (stderr's only write site is `dispatch`'s own), so the
    parameterization mints three distinct observables, not four; PLUS
    one process-level subprocess member asserting the async path's
    uncaught-exception half; PLUS the post-closure member (a
    non-EPIPE report on an already-marked-closed stream still takes
    this family's lane — E4's repetition qualifier) (owner: E6, with
    E5 owning the guard member).
  - **5. Entrypoint-parity family** (E1) — discipline: both shipped
    entrypoints exhibit the quiet-contract and post-closure families
    identically; the assertion runs against each entrypoint's own
    binding, so removing the factory call from one of them reds.
    Membership: the two shipped entrypoints, each driven through its
    own multi-write verb — `tail` for the operator CLI, `dev inject`
    for the dev CLI (owner: E1).
  - **6. Journey family** (E8, R-ACTIVATION-JOURNEY) — discipline: ≥1
    subprocess lane per MEASURED repro class, spawning the entrypoint
    DIRECTLY, with production bindings, asserting exit `0` and zero
    CLI stderr bytes for BOTH classes — the values that hold when the
    verb's cleanup completes, which is the normal path these lanes
    stage. A cleanup that throws is NOT this family's business: it
    takes E3's precedence clause and is driven by family 2's
    cleanup-throw member. Membership: class (a) consumer exits
    mid-document (fixture document ≥120 KB, consumer stops before
    draining) and class (b) a multi-write verb writing after the
    consumer left. Stated NON-members with their reasons: a `head -1`
    lane over a single-line document through the direct entrypoint (it
    drains the document and cannot reproduce), and the `pnpm v3:cli`
    bridge form (its first stdout bytes are the bridge's banner, not a
    CLI-owned stream — the same mechanism as class (a), driven
    directly) (owner: E8).
  - **7. No-effect family** (E12) — discipline: with NO stream error,
    the factory emits one newline-terminated line per data document on
    the OUT stream and nothing on the ERR stream (and the converse for
    an error document), and each shipped entrypoint's PRODUCTION
    binding delivers today's bytes and exit codes — a dropped
    separator or a swapped stream reds at either level. Membership:
    (i) the FACTORY member — the factory over two recording doubles,
    asserting framing and routing (in-process, so the mutation profile
    sees it); (ii) per shipped entrypoint, one multi-line (NDJSON
    `tail` / multi-step `dev inject`) lane and one error-document
    lane, through the subprocess; plus the existing ch6-P4a last-mile
    smoke, declared UNEDITED — its continued pass is part of the proof
    (owner: E12).
  - **Build-close sweeps** (owner: the build-close pass, re-run
    untruncated): the writer inventory (a third entrypoint write block
    is a red), the `sinks.out`/`sinks.err` inventory (a verb-side
    `sinks.err` call site is a red — E3's exhaustiveness and E6c), the
    `.end()`/`.destroy()` sweep (a call on either process stream is a
    red — E2's ruled-out member), the cleanup-form inventory over
    `src/cli/**` plus the tail generators (every `finally` block
    classified reachable or not; a `finally` inside `tailLoop` /
    `diagTailLoop` is a red), and the catch-site inventory (a new
    unknown-mapping catch between a sink write and `dispatch` is a
    red).
- Build-close sensitivity (R-DERIVED-PROBES): the probe table derives
  from the families above — ≥1 red-on-break probe per family:
  (1) treat `write()` → `false` as a closure, or raise the sentinel on
  the establishing failure instead of absorbing it → family 1 red;
  (2) two distinct mutations, either reds family 2 — make the
  verb-body sentinel return a nonzero code, OR have the E5 inner guard
  return `EXIT.ok` instead of the computed class code (dropping the
  guard entirely makes the sentinel ESCAPE `dispatch`, which reds the
  same family by a different mechanism); (3) drop the sentinel throw
  so writes continue after closure → family 3 red (and the class-(b)
  journey lane overruns); (4) classify every error code as closure,
  widen the inner guard to a catch-all, or absorb a non-EPIPE report
  on a closed stream → family 4 red; (5) revert one entrypoint to its
  inline lambda → family 5 red; (6) remove the `error` listener →
  family 6 red; (7) drop the `\n` from the factory, or route `out` to
  the err stream → family 7 red (at the factory member, in-process).
  Executed through `tools/v3-plan/probe_runner.py` with receipts,
  materialized in the Build record. Arm gate-2 additionally DUAL-RUNS
  the mutation pilot (the chapter's flow note, plan §13.4 — the
  pilot's second and final data chapter) as
  `stryker run --mutate src/cli/common.ts` from the `v3` directory
  (the ch9-P0 build-record form; the checked-in
  `stryker.config.json` pins the pilot's feasibility file and is NOT
  edited here). Per flag 5 the pre-change side is a MEASURED ABORT,
  not a score, so what is recorded is the post-build ACTIVATION
  number plus the baseline's verbatim abort message.
- Checks: `pnpm v3:typecheck`, `v3:lint`, `v3:test`, `v3:packet-lint`
  during build; FULL `pnpm ci:local` at build close, plus
  `pnpm ci:github-local` for the Linux substrate parity run
  (Docker-gated — in-context note 4 states the gate rule);
  `tools/v3-model/check.sh` untouched (no model-plane edit
  rides this packet — the empty slice).
- Drift tests green (standing, unconditional — PI-3): green BEFORE and
  AFTER; any drift-lane movement is a STOP, never a packet-local fix.
- Standing review rules in force: REV-C-PROJECTIONS-READONLY (the read
  verbs' sinks stay read-only surfaces); REV-DIAG-FAILOPEN (untouched
  — the diagnostic sink is not on this path and gains no coupling);
  REV-A1-TXN / REV-B-LOCAL-NOT-AUTHORITY / REV-E-NO-ADAPTER-BRANCH:
  n/a (no transaction, locking, or adapter surface moves).

## Build record

**Build execution context:** fresh-context-delegated build agent (the
packet as sole spec; approved-basis handoff — sha256
`82c0d98268215a069d154b5b619be977030ba67fea0e96f5d287fb53596c9aef`,
verified before the first read). No build-guidance notes beyond the
packet were needed or used; the approved basis was byte-verified before
any edit and `plan.md`'s two pre-approval aligned edits were left
untouched, exactly as handed over.

**Rounds: ONE.** No fix round was needed — the seam suite passed on its
first run against the first implementation, the subprocess suite on its
first run, and the only mechanical correction in the whole build was a
`ChildProcessWithoutNullStreams` → `ChildProcessByStdio<null, Readable,
Readable>` type swap in the subprocess test file (an
`exactOptionalPropertyTypes` mismatch on the `stdio: ["ignore", "pipe",
"pipe"]` shape, caught by `v3:typecheck`, no contract content). Tests
were written before the implementation they drive, per the repo's
TDD rule.

**Test-count delta: 1750 → 1790 (+40), across 69 → 71 files.** 33
in-process seam tests in `closedPipeSink.test.ts` (families 1–4's seam
members plus family 7's factory member) and 7 subprocess tests in
`closedPipe.test.ts` (families 5 and 6 entirely, family 7's two binding
members, family 4's process-level member). The seam file runs in 87 ms;
the subprocess file in 4.2 s — the suite-load watch's threshold is not
approached.

**Realization shape.** `common.ts` gained EXACTLY the two declared
module-public exports — `createOutputSinks` and `OutputClosedError` —
plus a module-PRIVATE `OutputStream` structural type, the
`OUTPUT_CLOSED_MESSAGE` constant, an `isClosedPipeError` code test, and
a `createLineWriter` per-stream closure. `dispatch` gained its two
sentinel recognitions: an `instanceof OutputClosedError` early return
(`EXIT.ok`) placed BEFORE the generic `CliError` wrap (E3 branch 2), and
a type-scoped inner `try`/`catch` around the error-document write whose
non-sentinel arm rethrows and escapes `dispatch` entirely (E5/E6c). Both
entrypoints bind
`createOutputSinks(process.stdout, process.stderr)` — `process.stdout`
proved structurally assignable to the minimal shape with no cast.
`CliSinks` gained no member and `runCli` / `runDevCli` keep their
injected-sink signature, so no construction site outside the boundary
moved.

**Build-close sweeps, all five re-run untruncated, all green:**

| Sweep | Declared | Measured at build close |
|---|---|---|
| Writer inventory (lexical) | TWO write blocks at the entrypoints; `spawn.ts:55,92` GR2 comments; `runtime.ts:69` inherit exec | the write BLOCK moved into the factory as E1 requires; the two entrypoints now hold the factory CALL with `process.stdout`/`process.stderr` (`main.ts:841`, `dev/main.ts:746`); GR2 comments unchanged; NO third entrypoint write block |
| …names-independent (`\.write\b`) | exactly the four calls of the two blocks | exactly ONE call — `common.ts:83`, the factory's own; no writer call of any other provenance |
| …alias forms (`node:process`, `writeSync(`, `process["stdout"]`, …) | ZERO | ZERO |
| Sink-consumer inventory | 18 sites / 4 files; 17 `sinks.out` (main 10, dev 5, runnerVerbs 2); EXACTLY ONE `sinks.err` | 18 / 4; 17 `sinks.out` (main 10, dev 5, runnerVerbs 2); ONE `sinks.err` — `common.ts:319`, `dispatch`'s own. No verb-side `sinks.err` |
| `.end()` / `.destroy()` on a process stream | none exists (`spawn.ts:96` is the CHILD's stdin) | unchanged — the single `spawn.ts:96` hit |
| Cleanup-form inventory (`src/cli/**` + the tail generators) | 11 `finally` blocks, 3 reachable + 8 unreachable, none unclassified; ZERO in `tailLoop`/`diagTailLoop` | 11 blocks, same 3 + 8 split at shifted line numbers (`common.ts:225`/`249` + `dev/main.ts:295` reachable; `common.ts:264`, `main.ts:361`/`742`, `runnerVerbs.ts:458`/`515`/`604`/`780`, `dev/main.ts:625` unreachable); `floor/tail.ts` still holds ZERO `finally` |
| Catch-site inventory (between a sink write and `dispatch`) | `main.ts` verbTail ladder + the message discriminator + five `toTemplateInvalid` sites; three `dev/main.ts` sites; all rethrow unknown unchanged | the same set at +1 line shift (`main.ts:429`, `:547`, `:562/594/627/655/747`; `dev/main.ts:300`, `:612`, `:695`); every one still rethrows unknown unchanged. NO new unknown-mapping catch was added anywhere on the path |

The two catches this build DID add are the ones E1(ii)/E6 sanction:
`common.ts:84` (the sink's sync arm, scoped to the E2 code test and
rethrowing everything else) and `common.ts:320` (E5's inner guard,
scoped to the sentinel TYPE alone).

**Build-close sensitivity (R-DERIVED-PROBES), all EIGHT executed through
`tools/v3-plan/probe_runner.py`; every one observed RED, every restore
byte-verified; receipts in the session scratchpad
(`/tmp/ch13p0-receipts/ch13p0-<id>.receipt.json`):**

| Probe | Mutation | Lane |
|---|---|---|
| `ch13p0-p1` | treat `write()` → `false` as a closure | family 1 RED |
| `ch13p0-p2a` | the verb-body sentinel returns `EXIT.internal` instead of `EXIT.ok` | family 2 RED |
| `ch13p0-p2b` | the E5 inner guard returns `EXIT.ok` instead of the computed class code | family 2 RED |
| `ch13p0-p3` | drop the sentinel throw — writes continue after closure | family 3 RED |
| `ch13p0-p4` | classify EVERY coded error as a closure | family 4 RED |
| `ch13p0-p5` | revert the operator entrypoint to its inline lambda pair | family 5 RED |
| `ch13p0-p6` | remove the `error` listener registration | family 6 RED |
| `ch13p0-p7` | drop the `\n` from the factory's framing | family 7 RED |

A ninth, non-mutation FAIL-FIRST receipt was taken before the lanes were
written, on a scratch `.mts` entry carrying the OLD bare-sink lambda pair
over the real `runCli`/`runDevCli`: class (a) → exit **1** with **600**
stderr bytes and `Unhandled 'error' event` framing (byte-for-byte the
packet's own class-(a) probe receipt), class (b) → exit **1** / 1108
bytes, `dev inject` → exit **1** / 1121 bytes. The same three lanes
against the built factory give exit **0** and **0** stderr bytes.

**SURPRISE 1 — the lanes did NOT need a shell pipeline, and are better
for it.** The packet's measurement vocabulary is `| head -c 5` /
`| head -1`, which would have forced `pipefail` (absent from dash, the
`node:24-bookworm` `/bin/sh`) or `${PIPESTATUS[0]}` to recover the CLI's
own exit code. Closing the READ END from the parent
(`child.stdout.destroy()` on a `stdio: ["ignore","pipe","pipe"]` spawn)
reproduces both measured classes exactly, keeps the CLI's exit code
first-class, is fully event-driven, and carries no shell-dialect
exposure into the Linux parity run. Both stated E8 non-members remain
non-members under it, for their stated reasons.

**SURPRISE 2 — class (b) needs the further rows committed ONE PROCESS AT
A TIME, and E9(a) is why.** Committing several rows in one `dev inject`
lets the tail write them back-to-back inside a single tick, so the
establishing EPIPE report has not landed yet when the later writes are
issued: they all fail silently, the closure is marked afterwards, and
the tail then parks — E9(a)'s "no further write, no observation"
behavior — with nothing left to make it write again. Separate
row-committing processes put real time between the tail's writes, so the
establishing report lands and the NEXT write raises the sentinel. This is
E4's ordering clause meeting the async delivery path, and it is exactly
the property the `overrun` half of probe 3 depends on. Recorded because a
later lane author staging class (b) will otherwise write the fast fixture
and get a 60-second hang instead of a red.

**SURPRISE 3 — `dev inject` echoes the payload, so the dev entrypoint
reaches post-closure territory cheaply.** Each injected step's outcome
document carries its payload, so 12 steps at a 12 KB payload produce
~148 KB of stdout — past the 65536-byte pipe buffer without any special
fixture. The same property gave family 6's class-(a) fixture a ONE-spawn
staging path (10 big-payload steps → a 124 523-byte `timeline` document,
measured in-lane against the packet's ≥120 KB floor) instead of ten
separate `submit` processes.

**SURPRISE 4 — the packet's own writer-inventory arm (a) reads as
self-contradictory at build close, and was resolved by intent.** Its
letter says the names-independent `\.write\b` sweep "returns EXACTLY the
four calls of the two blocks", and "a hit in ANY of the three at build
close is a red" — but E1 REQUIRES those four calls to become one call
inside the shared factory, so the letter cannot survive the build it
mandates. Read as the exhaustiveness claim it states ("no writer call of
any provenance exists elsewhere"), the sweep is green: exactly one
`.write` call exists in the whole non-test tree, and it is the factory's.
Recorded rather than smoothed over — the row's wording, not the build,
is what wants the fold. FOLDED at build close by the orchestrator: the
arm now states that its result MOVES with this build (four calls
before, one after) and that the red is a writer call OUTSIDE the
factory, never the count.

```json
{
  "packet_metrics": {
    "class": "operability (CLI output-sink hygiene; empty ledger slice)",
    "prediction": { "predicted": "invention", "reasoning": "the plan's ch13-P0 row predicted invention (memo-born, basis: the ch9 boundary verdict) — the closed-pipe behavior contract had no prior ratified source", "discovered": "invention" },
    "provenance": { "anchored": 0, "derived": 3, "new_decision": 9 },
    "rounds": { "review": 7, "doc_refinement": 12, "implementation": 1 },
    "stops": [
      { "type": "4:flagged-approve", "what": "nine new-decision rows rode six pre-approval flags to the human", "resolution": "ratified flag by flag over six exchanges (scope, contract, masking, residual wait, mutation scoping, difficulty band)" },
      { "type": "1:open-choice", "what": "the cleanup-throw precedence on the exit rule's branch 2 — surfaced by arm gate-1 AFTER the approve, so no ratified flag covered it", "resolution": "owner chose the loud path: a cleanup error wins over the sentinel" }
    ],
    "detector_misses": [],
    "learned": "a fold that ADDS a clause to a canonical row must RE-DERIVE that row's mirror list — the Mirrored Surface Map lists the mirrors a row had when it was written, not the ones a later clause acquires; four arm rounds and one prompt demanding a COMPLETE propagation enumeration were what closed the class",
    "main_thread_model": "claude-opus-5[1m]"
  }
}
```

**Checks at build close:** `pnpm v3:typecheck` green, `pnpm v3:lint`
green, `pnpm v3:test` green (71 files / 1790 tests), `pnpm v3:packet-lint`
green (26 v2 packets, 5 drafts, 0 reopened, 0 errors).

**Orchestrator legs at build close.** Full `pnpm ci:local`: PASSED
(dependency lock, shared codegen, quality suite lint/typecheck/test/v3,
fitness gate, almost-e2e smoke). `pnpm ci:github-local` (the Linux
substrate parity run, in-context note 4): **RECORDED SKIP** — exit 1
carrying the script's "could not reach the Docker daemon" message, i.e.
Docker installed but not running, which note 4 disposes as a skip with
its reason and never as a lane finding. The substrate risk the note
names therefore stands UNMEASURED on Linux until the chapter close or a
later run: `process.stdout` to a pipe is asynchronous on macOS and
synchronous on Linux, and the class-(b) subprocess lane is where a
divergence would surface first — its contract assertions (exit 0, zero
CLI stderr bytes) hold under both delivery timings, and the
deterministic sentinel-firing proof lives in the in-process seam lanes,
which are platform-independent. The mutation-pilot dual-run and the
post-build boundary audit follow the commit.

**Mutation-pilot dual-run (recorded at arm gate-2).**
`stryker run --mutate src/cli/common.ts` from `v3/`: **60.49% total /
72.59% covered** — 98 killed, 0 timeout, 37 survived, 27 no-coverage,
0 errors, 3.73 tests per mutant. This is the ACTIVATION number flag 5
declares, not a delta: the pre-change baseline is the measured ABORT
(`No tests were found / No tests were executed`), because every test
file that reached `common.ts` was stryker-profile-excluded. The file
is the whole shared CLI plumbing module, so the survivors and
no-coverage mutants are dominated by its pre-existing helpers, not by
this packet's logic — the boundary's yield read must scope
accordingly.

**AFTERMATH (2026-07-31, arm gate-2 — orchestrator-authored).** Gate-2
returned NO product and NO packet-doc findings, and one P2
test-evidence finding, proven by executed mutation: family 1's built
lanes used a SINGLE non-EPIPE code (`EACCES`) and a SINGLE EPIPE
carrier shape (an `Error` instance), so two blind classifiers survived
the whole suite — one testing `code !== "EACCES"`, one adding an
`instanceof Error` condition. E2's "by error CODE and by nothing else"
was therefore stated but not falsifiable. FIXED: the seam suite's
classifier domain is now parameterized (12 new lanes, 33 → 45 tests in
that file) over three distinct non-EPIPE codes, a code-less error, a
non-object throw, a plain-object non-EPIPE carrier, and BOTH EPIPE
carrier shapes; the double's fault-injection knobs widened from
`Error` to `unknown` for the same reason. Both previously-surviving
classifiers were re-run through the probe runner and are now DEAD:
receipts `ch13p0-a1-notEACCES` and `ch13p0-a2-instanceofError`, each
observed RED with a byte-verified restore. Family 1's membership rule
in this packet was tightened to name the domain, so the inventory and
the built bodies agree.

**AFTERMATH 2 (2026-07-31, arm gate-2 re-check — orchestrator-authored).**
The re-check returned two P2s, and BOTH were about evidence rather
than product; product code stayed untouched through both aftermaths.

(1) *The carrier-shape rule was not crossed with the delivery path.*
The plain-object EPIPE carrier appeared only on the ASYNC report lane,
so a classifier narrowed to `instanceof Error` in the SYNC catch ALONE
survived the entire 1802-test suite — the arm proved it by mutation.
FIXED: the carrier domain is now parameterized over carrier shape ×
delivery path (47 tests in the seam file), and the surviving mutant is
dead — receipt `ch13p0-a3-syncInstanceofError`, observed RED,
byte-verified restore. Family 1's membership names the crossing.

(2) *Every probe receipt of this packet ran on a NON-CANONICAL
toolchain, so none of them proved what it claimed.* The probes invoked
`../node_modules/.bin/vitest` (the ROOT Vitest 3.2.4) instead of
`pnpm exec vitest` (the v3-local 4.1.10). Measured: under the root
runner the UNMUTATED seam suite is already RED (2 failures of 45),
so `suite_red: true` was consistent with any mutation whatsoever —
including one that changes nothing. The probe runner only checks a
nonzero exit, so it could not catch this; the defect is in the test
COMMAND the caller supplies. FIXED: all eleven probes — the builder's
eight, the aftermath-1 pair, and the new carrier probe — were
REGENERATED with `pnpm exec vitest run …` from a baseline-green state.
Every one is now observed RED with a byte-verified restore, and the
mutations were reconstructed from the probe table rather than reused,
so the table and the receipts are independently derived. The
canonical-toolchain requirement is the standing lesson: a red-on-break
receipt taken against a red baseline is not evidence, and nothing in
the runner's contract enforces the baseline.

**AFTERMATH 3 (2026-07-31, arm gate-2 third pass — orchestrator-authored).**
The receipt fold verified sufficient; the carrier fold did not. The
gate found the THIRD axis of the same cross-product: the plain-object
EPIPE carrier was driven on stdout only, so a classifier narrowed to
`instanceof Error` FOR STDERR — on both delivery paths — survived all
1804 tests. Product code untouched again.

The response was not another patch. Family 1's domain lanes were
rewritten as a FULL CROSS-PRODUCT over every axis E2 declares
irrelevant — carrier shape × delivery path × stream on the closure
side, code domain × delivery path × stream on the non-closure side —
with the non-closure lanes asserting the thrown value by IDENTITY
rather than by message match, so a wrapping classifier reds too. The
seam file went 47 → 61 tests.

Verification, all through the probe runner with canonical commands and
byte-verified restores: the gate's surviving mutant is dead
(`ch13p0-a4-stderrShape`, RED), and a SELF-HUNTED corner — EPERM
treated as a closure on the sync path for stdout alone, the most
obscure combination constructible from the three axes — is also dead
(`ch13p0-a5-eperm-sync-stdout`, RED). Thirteen receipts now stand, all
canonical, all RED, all restores byte-verified.

**AFTERMATH 4 (2026-07-31, arm gate-2 fourth pass — orchestrator-authored).**
The gate found the FOURTH axis, and the miss was mine in a specific
way worth recording: aftermath 3 called its lanes a "full
cross-product" while enumerating the axes from the FIXTURE's shape
(carrier, path, stream) rather than from E2's own sentence, which
names delivery path, stream STATE and verb. Stream state was
therefore never crossed: the post-closure report lanes ran on
stdout/async/one-carrier only, so two wrong classifiers survived all
1818 tests — one swallowing every later report on a closed stream,
one rethrowing a REPEAT EPIPE instead of absorbing it.

FIXED by crossing the post-closure lanes over stream × carrier
(closure side) and stream × the whole code domain (non-closure side),
identity-asserted, with the sync × already-closed cell named
unreachable by construction rather than driven. The seam file went
61 → 73 tests, the suite 1818 → 1830. Both gate survivors are dead
(`ch13p0-a6-closedSwallowsAll`, `ch13p0-a7-repeatEpipeRethrown`) and
so is a self-hunted corner of the new axis — a CLOSED STDERR
swallowing everything (`ch13p0-a8-closedStderrSwallows`). Sixteen
receipts now stand, all canonical, all RED, all restores
byte-verified. Product code untouched by all four aftermaths.

The pattern across the four aftermaths is the record's real content:
every gate-2 finding was an axis of ONE cross-product that the fixture
had fixed, and each partial fix bought exactly one more round. The
axis list must be read off the RULE's own words — "not by delivery
path, not by stream state, not by verb" is an enumeration, and any
axis absent from the fixture is a classifier the suite cannot
falsify.

Read that way, E2's sentence names FIVE things: the error code is
decisive, and delivery path, stream identity, stream state and the
verb are not. The fifth was checked rather than assumed — a
verb-scoped classifier (the closure rule applied to `tail` alone) is
RED via family 2's verb-driven members, receipt
`ch13p0-a9-verbScoped`. Seventeen receipts stand. Every axis the
canonical row names is now crossed or receipt-proven covered, and the
one unreachable cell is named with its construction reason.
