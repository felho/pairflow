# ch13 re-derivation P1 — carried-scope record

Findings the round-1 arm produced that are REAL but not P1's to build
against. Recorded here with owners, per the plan's §6 threat-model
rule ("findings outside that sentence are recorded as carried-scope,
never fixed — from round 1") and the user's ratification of option A
on 2026-08-04.

Source verdict: [`arm-round1-out.txt`](arm-round1-out.txt) (pin
gpt-5.6-sol/high, 805s, guards clean). Every number below was
re-measured in this repo at the time of writing; the command is given
so the claim can be re-run rather than believed.

## Why these are carried, in one sentence

The superseded machine lock binds on the MANIFEST channel — the
`packet_rows` refs are the only surface where an anchor exists in the
machine's sense — and none of the surfaces below resolves draft status
for ANY status, not merely for `superseded`. They are therefore the
scope of other, older machinery, not holes in what P1 built.

## The items

### CS-1 — in-row prose closures carry no independent status resolution

A `(anchored: …)` / `(derived: …)` closure citing a superseded draft
goes red, but through the generic prose↔manifest ref-drift message
rather than the dedicated superseded diagnosis.

- **Why carried:** the closure is bound ONE-WAY to the manifest
  (`check_packet.py:299–305`: a cited token missing from the manifest
  refs is red; an anchored closure's token must additionally appear in
  the header union where that surface declares one). Status therefore
  rides the manifest entry; resolving it a second time in prose would
  duplicate the lock, not extend it.
- **Owner:** the existing closure machinery (P10, ch12 boundary).

### CS-2 — the closure scanner does not match nested parentheses

`CLOSURE_RE` (`check_packet.py:305`) excludes inner parentheses, so a
natural prose form such as `(anchored: context (see contract:…))` is
not scanned at all.

- **Why carried:** this is a defect in P10's scanner across every
  contract token and every status — it predates the superseded status
  and is not specific to it. Fixing it inside P1 would import a
  P10-width obligation into a phase whose product is a status flip.
- **Owner:** the existing closure machinery (P10, ch12 boundary).

### CS-3 — grandfathered pre-v2 packets are skipped wholesale

The 16 whitelisted pre-v2 packets are skipped before any ref scan, so
no anchor in them resolves against draft status.

- **Why carried:** this is the ratified grandfathering policy (P1's
  rule in the lint's registry; `task-packet-template.md` §1a), which
  binds v2 obligations "from the ch7-P3 pilot onward, never
  retroactively". Revisiting it is a boundary act.
- **Owner:** the grandfathering policy.
- **Measured 2026-08-04** — the set contains no ch13 reference at all,
  so the flip creates no latent miss there:

  ```
  GRANDFATHERED_PACKETS: 16 entries
  grep -l ch13 <the 16 files>  →  NONE
  ```

### CS-4 — the header union is a mirror, and a named retirement candidate

A packet whose header "anchors" line names a superseded surface while
its manifest does not is fully green.

- **Why carried:** the header union is NOT a form requirement. Neither
  this repo's `task-packet-template.md` nor
  `contract-draft-template.md` mandates such a line; it is a
  reader-convenience MIRROR of manifest data, drift-checked one-way
  where present (closure→header). A mirror carries no independent
  anchor, so there is nothing there for the lock to bind to.
- **Owner:** the packet FORM. Recorded as a **retirement candidate for
  the P4/P5 schema-first packet-form redesign**, where such a summary
  becomes generated or omitted rather than hand-maintained.
- **No churn mid-P1:** the live packets carrying one are left exactly
  as they are.
- **Measured 2026-08-04**, with the measurer named because the count
  depends on which written form is counted — the line exists in two
  shapes and neither is canonical (which is itself part of why it is a
  retirement candidate):

  ```
  cd v3/implementation/packets
  grep -lE '`contract:ch[0-9]+-[a-z0-9-]+` rows C' *.md | wc -l      →  8
  grep -lE "manifest's C-row ref union" *.md | wc -l                 →  12
  both, deduplicated                                                 →  14
  grep -l "contract:ch" *.md | wc -l  (any citation outside the
      machine block, the widest possible reading)                    →  21
  ```

  The general's decision block of 2026-08-04 cited 17 live packets.
  That figure is not reproduced by any pattern measured above and is
  recorded here as unreconciled rather than restated — an unverified
  citation is the citation-shaped form of an unrun "measured"
  (`e7b94ed5`). The operative instruction — touch none of them — does
  not depend on the count.

### CS-5 — markdown-escape citation form (the arm's own carried-scope call)

A source token written `contract:ch9-test\-surface#C1` renders as a
canonical anchor while the scanner does not match it.

- **Why carried:** reaching this requires hand-shaping a token that
  the regex rejects but CommonMark restores — the deliberate-
  concealment class the ratified threat model assigns to human diff
  review and the fresh-context arm. The arm classified it so itself.
- **Owner:** human diff review + the fresh-context arm.
