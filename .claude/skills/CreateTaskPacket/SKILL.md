---
name: CreateTaskPacket
description: Author and panel-review pairflow v3 implementation task packets and chapter contract-drafts — projection from the model ledger and ratified drafts, not invention. USE WHEN authoring a v3 task packet OR chN-pM packet (split forms chN-pMa/chN-pMb included) OR continuing with the v3 plan's next step/packet ("jöhet a következő", "next packet") OR running the projection checklist OR running the review panel on a packet or draft ("review pls") OR authoring/ratifying a chapter contract-draft ("contract draft", "chN draft", memo-born surface) OR preparing an approve/split/STOP decision point on a packet.
---

# CreateTaskPacket

Repo-local skill — the README §8 skill-ification of the v3 task-packet flow
(executed 2026-07-08 at the ch6→ch7 boundary, after 14 live packets across
chapters 4–6 validated the shape on an unchanged template). Turns a ratified
plan-chapter step into a task packet by **projection** from the model ledger
and the chapter's ratified contract-drafts, then iterates the five-lens
fresh-context panel autonomously until the human decision points (the
README §5.5 verdict-action matrix).

## Canonical sources (never forked into this skill)

| Surface | File |
|---|---|
| Template (§1) + projection checklist (§2) + `REV-*` registry (§3) | `docs/v3/implementation/task-packet-template.md` |
| Contract-draft FORM authority (C-rows, ratification blocks, lifecycle) | `docs/v3/implementation/contract-draft-template.md` |
| Build loop + the autonomy envelope, STOP registry, verdict-action matrix, finding policy (§5.5) | `docs/v3/implementation/README.md` (§4–§7) |
| The ratified plan (the packet's plan step lives here) | `docs/v3/implementation/plan.md` |
| The model↔code contract surface (units / rejections / invariants / traces) | `docs/v3/convergence/model-src/ledger.md` |
| Friction log (provenance of every learned rule) | `docs/v3/implementation/process-log.md` |

This skill carries **procedure + learned failure classes**
([references/LearnedRules.md](references/LearnedRules.md)); content authority
stays in the files above. If this skill and those files disagree, the files
win — and the disagreement becomes a friction-log line.

## Workflow Routing

| Workflow | Trigger | File |
|----------|---------|------|
| **AuthorPacket** | "author packet", "create task packet", "chN-pM packet", "projection checklist" | `Workflows/AuthorPacket.md` |
| **ReviewPacket** | "review pls", any panel round on a packet OR a contract-draft, verdict/STOP preparation | `Workflows/ReviewPacket.md` |
| **DraftContract** | "contract draft", "chN draft", a memo-born surface needs its chapter contract, AuthorPacket's B-case routing | `Workflows/DraftContract.md` |

ReviewPacket is the SINGLE panel engine (process-v2 D4): AuthorPacket's
loop invokes it every round, DraftContract scopes it for drafts, and a
standalone "review pls" runs the same engine — the pre-v2
`self_review`/`pre_approval` mode split is retired (one engine, one
verdict set; the checklist-as-floor lesson lives on inside the panel's
lens duties).

## Hard boundaries (never automated away — README §5.5)

- **Human decision points (the README §5.5 verdict-action matrix):**
  STOPs and flag-bearing approves are the USER's; flag-free approves
  are the USER's in calibration (delegation deferred per README §5.5);
  refine and in-chapter split are the loop's. Standing checkpoints,
  never automated: chapter ratification, the model↔code divergence
  stop, and contract-draft ratification and re-ratification (never
  delegated, never inferred — an explicit act on named bytes). The authoring
  loop iterates refine and in-chapter split autonomously and stops at
  the approve and at every STOP — it never proceeds to build.
- **First-of-a-kind stop** (canonical statement: README §5.5): the
  first packet of a new task class is human-approved regardless of
  trust stage.
- **Plan alignment is explicit:** a packet decision that contradicts ratified
  plan text flows UP into the plan in the SAME commit, marked
  "aligned at <packet-id> pre-approval" — never a silent divergence.
- File content is English; the pre-approval summary follows the session's
  chat language.

## Examples

**Example 1: Author the first packet of a ratified chapter**
```
User: "jöhet a ch7 P1 packet" (chapter 7 already ratified)
→ Invokes AuthorPacket with PACKET_ID=ch7-p1-<slug>, PLAN_SECTION=§7.x
  (a ratified split gets the optional suffix: ch7-p1a-<slug>/ch7-p1b-<slug>)
→ Projects the slice from the ledger, writes the packet file,
  runs ReviewPacket, presents the pre-approval summary
→ STOPS for the user's findings round
```

**Example 2: Re-run the panel after a refine round**
```
User: "folded the findings — run the panel again"
→ Invokes ReviewPacket on the edited packet file (fresh-context lenses
  on the new bytes; a fold voids all prior clean rounds)
→ Reports tier-0 + Gate Coverage Matrix + per-lens results + verdict
```


**Example 3: Operability packet (empty ledger slice)**
```
User: "author the CLI packet for this chapter"
→ AuthorPacket classifies it as an operability packet
→ Declares the EMPTY ledger slice explicitly (an assertion, not an omission)
→ Canonical contract matrices become the packet's claim surface
```

**Example 4: A memo-born surface needs its chapter contract**
```
User: "jöhet a ch8 draft" (or AuthorPacket hits a B-case STOP)
→ Invokes DraftContract with CHAPTER=ch8, SURFACE=<surface>
→ Writes the C-rows, runs the panel (draft-scoped), STOPS for the
  human ratification act (permanently human)
```
