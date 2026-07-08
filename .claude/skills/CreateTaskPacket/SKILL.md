---
name: CreateTaskPacket
description: Author and self-review pairflow v3 implementation task packets — projection from the model ledger, not invention. USE WHEN authoring a v3 task packet OR chN-pM packet (split forms chN-pMa/chN-pMb included) OR running the projection checklist OR preparing a packet for pre-approval OR self-reviewing a packet draft.
---

# CreateTaskPacket

Repo-local skill — the README §8 skill-ification of the v3 task-packet flow
(executed 2026-07-08 at the ch6→ch7 boundary, after 14 live packets across
chapters 4–6 validated the shape on an unchanged template). Turns a ratified
plan-chapter step into a task packet by **projection** from the model ledger,
then self-reviews the draft against the accumulated failure-class registry
before the human pre-approval round.

## Canonical sources (never forked into this skill)

| Surface | File |
|---|---|
| Template (§1) + projection checklist (§2) + `REV-*` registry (§3) | `docs/v3/implementation/task-packet-template.md` |
| Build loop, constraint discipline, divergence stop, chapter DoD | `docs/v3/implementation/README.md` (§4–§7) |
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
| **ReviewPacket** | "self-review packet" / "pre-approval prep" (→ `self_review` mode); "review pls" / verdict preparation / reviewing someone else's packet (→ `pre_approval` mode) | `Workflows/ReviewPacket.md` |

AuthorPacket runs ReviewPacket (`self_review` mode) as its final step;
ReviewPacket is also invocable standalone. **The two modes are different
jobs** — `self_review` is the authoring-side checklist floor;
`pre_approval` adds the Contract Reality Gate and the finding taxonomy,
and treats the checklist as a floor, never the review's definition (the
ch7-P1 twin-session lesson).

## Hard boundaries (never automated away — README §5.5)

- **Human checkpoints stand:** chapter ratification, the packet pre-approval
  verdict (approve / refine / split), ADR proposed→accepted, and the
  model↔code divergence stop (README §6). AuthorPacket ENDS at "ready for
  pre-approval" — it never proceeds to build.
- **First-of-a-kind stop:** the first packet of a new task class is
  pre-approve regardless of the chapter's ramp stage.
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

**Example 2: Re-check a packet after a refine round**
```
User: "folded the findings — self-review the packet again"
→ Invokes ReviewPacket on the edited packet file
→ Reports content-half + ergonomics-half + failure-class checklist results
```

**Example 3: Operability packet (empty ledger slice)**
```
User: "author the CLI packet for this chapter"
→ AuthorPacket classifies it as an operability packet
→ Declares the EMPTY ledger slice explicitly (an assertion, not an omission)
→ Canonical contract matrices become the packet's claim surface
```
