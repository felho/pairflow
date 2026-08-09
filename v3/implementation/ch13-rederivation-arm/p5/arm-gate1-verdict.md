# ch13-p1a — arm gate 1 verdict

## Provenance (recorded by the orchestrator, not by the arm)

- **Target:** `v3/implementation/packets/ch13-p1a-context-definition.md`,
  sha256 `767f7ec4e554e9c8511401d64b2e237a3be915a46429a970d858b60375029cfc`,
  71 719 bytes, at HEAD `3a6bb5c7` (the packet itself untracked).
- **Byte guard:** target hash, HEAD and porcelain measured BEFORE and
  AFTER the run — all three identical. The verdict is valid on its
  stated basis.
- **Transport:** the `gptsol` agent (llmp), model `codex/gpt-5.6-sol` —
  the chapter pin's model. **This is a transport the arm-pin table does
  not yet name**, taken by the user's ruling after the `arm_run.sh`
  path returned an infra failure (timeout at the uniform 1200 s cap,
  process group killed, guards clean; the run was ACTIVELY WORKING at
  the kill — 66 exec turns, no verdict produced — making it the fourth
  recorded kill of a non-hung review, the pattern the ch9 boundary
  acted on one tier down). Under ReviewPacket §6 item 8 this was the
  ONE retry the ladder allows.
- **Effort:** the pin specifies `high`. This transport exposes no
  effort control, so effort is recorded as a NOTE and not as a pin
  match. A pin-table row deciding whether that is conformant is owed
  at the boundary.
- **Charter:** the ORIGINAL, unnarrowed gate-1 charter — falsification
  first, six lanes, neutral QA vocabulary, hash self-check first, and
  no prior clean/approve narrative (the anchoring rule). Prompt and
  output lived outside the repository during the run.
- **Boundary candidate, on this run's evidence:** *the gptsol agent as
  the PRIMARY arm transport, `arm_run.sh` as the fallback.* One
  successful full-scope run against one timeout is not a decision — it
  is the first data point, and it is recorded as a candidate only.
- **Orchestrator verification:** every BLOCKER below was independently
  re-checked against the cited source before this file was written.
  All four hold. Findings 5 and 6 were likewise confirmed; finding 6
  had already been found independently and is not new.

---

## The arm's verdict, verbatim

BASIS: 767f7ec4e554e9c8511401d64b2e237a3be915a46429a970d858b60375029cfc
TRANSPORT: gptsol agent (llmp)
MODEL: codex/gpt-5.6-sol
EFFORT: the chapter pin specifies high; this transport exposes no effort control — recorded as a note, not a claim

FINDING 1 — BLOCKER — The failed-tag mechanism does not implement C9's template-wide stand-down
  WHERE: D7 — "the stand-down reads D5's failed-tag surface"; "the dead-config route being part (c)'s business instead"
  CLAIM: The failed-tag set, supplemented by reading the raw authored document, is sufficient to implement C9's rule that the hygiene audit stands down whenever any lane makes a ref list unreachable.
  COUNTEREXAMPLE OR TRUTH: C9 requires template-wide stand-down for "any lane that makes a ref list UNREACHABLE" (`v3/implementation/contracts/ch13-context-block-v2-contract.md:159`). A dead gate-config key is such a lane: after `keysSubsetOf` emits its finding, `evalMapOpen` executes `continue`, so the binding and its ref list are never evaluated (`v3/src/definition/schema/engine.ts:1253-1276`). The enclosing `d-gates` evaluation still returns `ok: true` (`v3/src/definition/schema/engine.ts:1293`), and only false tag results enter `tagFailedAnywhere` (`v3/src/definition/schema/engine.ts:711-717`, `v3/src/definition/schema/engine.ts:1022-1030`). The committed probe confirms this route yields no failed tag (`v3/implementation/ch13-rederivation-arm/p5/m1-trigger-tag-probe-out.txt:35`). Concrete counterexample: declare two catalog entries `alpha` and `beta`; put the only `alpha` ref inside a gate key absent from that step's transitions; mention `beta` nowhere. C9 requires zero hygiene findings because the unreachable list triggers template-wide stand-down. The packet's design sees no failed tag, counts raw `alpha` as referenced, and wrongly accuses `beta`.
  CONSEQUENCE: A builder following D7 will implement behavior that directly contradicts ratified C9 and will emit a false unreferenced-entry finding on an input the contract requires to stand down.

FINDING 2 — BLOCKER — D3 explicitly replaces mandatory citation closure with unauthorized comment exemptions
  WHERE: D3 — "after this build FOUR new tags … will be rowed to C13 while no C-row can cite them back"; "records those four as C19-forward-scoped exemptions IN THE DECLARATION ITSELF, as sibling comments"
  CLAIM: Declaration comments and the Build record may exempt the new C13-rowed tags from the authority's bidirectional citation-closure rule at zero process cost.
  COUNTEREXAMPLE OR TRUTH: ADR-019 requires, at minimum, that "every node ROWED TO that contract is cited by it" (`v3/adr/ADR-019-declared-schema-for-structural-definition-rules.md:166-175`). The contract repeats that every ch13v2-rowed node must be cited (`v3/implementation/contracts/ch13-context-block-v2-contract.md:23-25`), and the declaration header states the same rule with no exemption mechanism (`v3/src/definition/schema/templateFormat.ts:10-16`). D3 knowingly adds two field nodes rowed to C13 while acknowledging that C13 cannot cite their tags. Its proposed comments are not contract citations and no authority admits "forward-scoped exemptions." D6's follow-up merely appends a new ratification block; it does not amend C13 (`v3/implementation/packets/ch13-p1a-context-definition.md:181`).
  CONSEQUENCE: The build would re-lock a declaration known to violate the ratified one-authority closure invariant, making the new schema bytes look ratified while their contract pointers are incomplete.

FINDING 3 — BLOCKER — Flag 2 offers an invalid zero-amendment "NODE" alternative
  WHERE: Pre-approval flag 2 — "ADR-019 D7's NODE reading builds the SAME hook kind … It costs NO ADR-019 amendment"
  CLAIM: The human may classify the new hook kind as ordinary node growth, build the same new hook kind, and omit the ADR-019 amendment.
  COUNTEREXAMPLE OR TRUTH: ADR-019 D7 defines node growth as a new declaration use such as "a key, a grammar, a default," while a construct that changes what the engine can express is vocabulary growth requiring an ADR amendment (`v3/adr/ADR-019-declared-schema-for-structural-definition-rules.md:224-239`). The hook vocabulary is a closed `NormalizerHookDecl` union (`v3/src/definition/schema/vocabulary.ts:405-435`); adding another discriminator arm changes the engine's expressiveness and is not a `NodeDecl` addition. The packet's own D4 correctly applies that discriminating test and concludes CONSTRUCT. Calling the same union growth NODE does not make it conformant, and a packet approval cannot silently reinterpret the accepted ADR.
  CONSEQUENCE: The flag presents a false price: selecting its purported lighter option would still require an ADR amendment. A human accepting the option as written would authorize an unratified vocabulary change.

FINDING 4 — BLOCKER — Flag 4's lighter form conflicts with the canonical metrics authority
  WHERE: Pre-approval flag 4 — "the human may still take the lighter form"; "the lighter form edits the contract's own metrics line and not the form authority"
  CLAIM: A second ratification block may be recorded as zero post-ratification reopenings through a contract-local parenthetical, without amending the form authority.
  COUNTEREXAMPLE OR TRUTH: The canonical form authority wins over conflicting practice (`v3/implementation/contract-draft-template.md:9-16`) and currently defines post-ratification reopenings mechanically as "ratification blocks beyond the first" (`v3/implementation/contract-draft-template.md:308-314`). Under that definition, a second block is 1. The ch9 contract's parenthetical recording 0 (`v3/implementation/contracts/ch9-runner-contract.md:158-161`) is therefore an existing exception to the authority, not a legal alternative that can be copied. The flag's lighter route neither amends the definition nor records the authority-required value.
  CONSEQUENCE: The approval gate offers a nonconformant option as though it saved the prerequisite act. Choosing it would knowingly ship a contract metric that contradicts the canonical form.

FINDING 5 — MAJOR — Acceptance family 2 cannot falsify the missing C9 stand-down route
  WHERE: Acceptance family 2 — "stand-down member is additionally PARAMETERIZED over →[hygiene-trigger]'s derived trigger set"; "for each floor member … a MARKING malformation"
  CLAIM: Parameterizing the stand-down test over failed-tag-producing malformations is sensitive to the full C9 stand-down obligation.
  COUNTEREXAMPLE OR TRUTH: The dead-config counterexample in Finding 1 makes a ref list unreachable but produces no failed tag (`v3/src/definition/schema/engine.ts:1253-1276`; `v3/implementation/ch13-rederivation-arm/p5/m1-trigger-tag-probe-out.txt:35`). Family 2 only requires members whose malformation marks a floor tag (`v3/implementation/packets/ch13-p1a-context-definition.md:661-670`). An implementation that stands down for all eleven marked-tag fixtures but wrongly audits the two-entry dead-config document will pass every required member.
  CONSEQUENCE: The named acceptance family can remain green while the ratified template-wide stand-down is broken; the family needs a non-marking unreachable-route member that distinguishes stand-down from raw-reference counting.

FINDING 6 — MAJOR — The two cited executed floors are not independently rerunnable from the committed artifacts
  WHERE: D7 and D14 — "script and output committed beside it"; review record M1/M3 — "ARTIFACT COMMITTED"
  CLAIM: The committed scripts and outputs are sufficient receipts for third parties to re-run the eleven-tag and eight-assertion measurements.
  COUNTEREXAMPLE OR TRUTH: EVIDENCE GAP. M1 requires a patched `engine.ts` exposing `failedTags` at both returns (`v3/implementation/ch13-rederivation-arm/p5/review-record.md:273-279`), but the committed artifact contains only the probe test and no exact patch or command that installs it; against the committed engine, `EngineRun` has no such field (`v3/src/definition/schema/engine.ts:54-68`), and the probe deliberately throws when it is absent (`v3/implementation/ch13-rederivation-arm/p5/m1-trigger-tag-probe.ts.txt:34-41`). M3 is a narrated command outline: its essential declaration and normalizer mutations are comments rather than executable patch commands, and its symlink target is the placeholder `<repo>` (`v3/implementation/ch13-rederivation-arm/p5/m3-value-repin-floor.sh.txt:13-28`). An executable script applying exact pinned patches, running the probes, asserting the expected sets, and cleaning its temporary trees would have made both claims independently checkable.
  CONSEQUENCE: The outputs are historical assertions rather than reproducible receipts. The packet gives the measured floors more confidence than the committed evidence supports.

VERDICT: FAIL — basis 767f7ec4e554e9c8511401d64b2e237a3be915a46429a970d858b60375029cfc — 4 BLOCKER, 2 MAJOR, 0 MINOR
