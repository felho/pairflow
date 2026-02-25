# Review Loop Optimization Ideas

**Date:** 2026-02-25
**Status:** Draft — ideas collection
**Context:** Analysis of `repo-registry-prd` bubble (13 rounds, 14 P1 + 25 P2 + 4 P3 findings)

## Problem Statement

The reviewer produces high-quality findings (real bugs, race conditions, event ordering issues), but the review loop generates unnecessary rounds due to:

1. **P2 inflation** — cosmetic/comment findings rated P2, triggering full fix+review cycles for near-zero value
2. **Incremental P1 discovery** — the same underlying issue (e.g., shutdown race) found across 4 rounds, one aspect at a time
3. **Out-of-scope findings** — reviewer flags issues unrelated to the PRD (e.g., unrelated UI regression, accessibility)
4. **No "good enough" exit** — no mechanism to approve with minor notes; every finding requires a fix round

## Proposed Optimizations

### 1. Severity Guidelines in Reviewer Prompt

Provide explicit severity definitions to reduce misclassification:

| Severity | Definition | Examples |
|----------|-----------|----------|
| **P1** | Data loss, crash, security vulnerability, race condition affecting production | Concurrent calls produce duplicate events; close() doesn't drain in-flight work |
| **P2** | Logical error, broken API contract, missing test for **functional** gap | Dead code path that misleads readers; no test for failure path that has specific handling |
| **P3** | Cosmetic, comment, naming, style, minor inconsistency | "Add clarifying comment"; type not re-exported; naming asymmetry |

**Scope rule:** Only review changes within the PRD scope. Flag out-of-scope observations as informational notes, never as findings that require fixes.

**Expected impact:** Eliminates rounds like R9 (4 findings, 3 were "add comment" → full round for cosmetics).

### 2. "Good Enough" Threshold — Approve with Notes

When a review round finds **only P2/P3 issues and no P1**, the reviewer can issue `APPROVE_WITH_NOTES` instead of `fix_request`:

- P2/P3 findings go into a `suggestions.md` artifact
- Implementer can optionally address them
- The bubble can proceed toward completion

**Alternative:** After N consecutive rounds without P1 (e.g., N=2), auto-approve. This prevents infinite P2-refinement spirals.

**Expected impact:** Could have shortened the repo-registry bubble by 2-3 rounds (R7 onward had mostly P2s).

### 3. Parallel Review Agents

Run 3 reviewer agents in parallel with the same prompt. Different agents find different things — this improves coverage per round.

**Aggregation options:**

- **Option A: Orchestrator agent** — A 4th agent receives all 3 outputs, deduplicates findings, assigns unified severity using the severity guidelines. More expensive per round but produces clean, consistent output.
- **Option B: Union + voting** — Findings appearing in 2/3 agents get higher confidence. Single-agent findings get lower confidence. Cheaper but doesn't resolve severity inconsistencies.

**Recommendation:** Option A (orchestrator), because it also enforces severity guidelines and scope rules.

**Expected impact:** Better coverage per round → fewer total rounds needed. Also catches the asymmetric severity problem (e.g., addRepo concurrency guard P2 vs removeRepo concurrency guard P1).

### 4. Deep Exploration for P1 Findings

When a P1 is discovered, the reviewer launches a **dedicated exploration** before writing the finding:

```
P1 detected: race condition in close()
  → Exploration: trace ALL related code paths
    - sync promise lifecycle
    - queued re-entry
    - recursive calls
    - concurrent callers
    - shutdown sequence
  → Write ONE comprehensive finding covering all aspects
  → Include concrete fix suggestion covering the full surface
```

**Why this matters:** In the repo-registry bubble, the shutdown race was found in R8 but kept resurfacing in R10, R11, R12 as the reviewer discovered new aspects each round. A single deep exploration in R8 could have surfaced all 4 aspects at once.

**Expected impact:** 3 rounds saved on the shutdown race alone. Generalizes to any complex P1 that has multiple interacting code paths.

### 5. Combined Flow

The optimized review flow per round:

```
1. PARALLEL SCAN
   3 reviewer agents scan independently (same prompt + severity guidelines)

2. ORCHESTRATE
   Orchestrator agent:
   - Deduplicates findings across 3 agents
   - Applies severity guidelines
   - Enforces scope rules (drops out-of-scope findings)
   - Filters: P3s go to suggestions.md, not to fix_request

3. DEEP EXPLORE (conditional)
   For each P1 finding:
   - Dedicated exploration agent traces all related code paths
   - Expands the finding to cover full surface area
   - Adds concrete fix suggestion

4. DECISION
   If P1 findings exist → PASS with fix_request (P1s + P2s)
   If only P2 findings → APPROVE_WITH_NOTES (P2s in suggestions.md)
   If only P3 or clean → APPROVE
```

### Trade-offs

| Aspect | Current | Optimized |
|--------|---------|-----------|
| Cost per review round | 1 agent | 3 agents + orchestrator + exploration agents |
| Rounds needed | More (13 in example) | Fewer (estimated 8-9 for same bubble) |
| Total cost | Higher (many cheap rounds) | Likely lower (fewer expensive rounds) |
| Finding quality | Good but inconsistent severity | Better — unified severity, deeper P1 analysis |
| Time to completion | Longer | Shorter (fewer round-trips) |

## Evidence from repo-registry-prd Bubble

Rounds that could have been avoided or shortened with these optimizations:

| Round | What happened | Optimization that helps |
|-------|--------------|----------------------|
| R9 | 4 findings, 3 are "add comment" (P2) | Severity guidelines → P3, approve with notes |
| R10-R12 | Shutdown race rediscovered from new angles | Deep exploration in R8 finds all aspects |
| R11 | Out-of-scope BubbleTimeline.tsx flagged as P2 | Scope rule drops it |
| R7 | addRepo concurrency guard rated P2, later removeRepo rated P1 | Parallel agents + orchestrator catches asymmetry |

### 6. Skip Redundant Test Runs in Reviewer

The reviewer re-runs the full test suite every round ("All 406 tests pass") even though the implementer already reports test results in their PASS message ("pnpm typecheck pass; pnpm test pass (80 files/406 tests)").

This is pure redundancy — it doesn't improve quality, only adds latency and cost per round.

**Fix:** The orchestrator should verify test results from the implementer's output (e.g., exit code validation, parsing test runner output). If tests are confirmed passing, the reviewer prompt should explicitly say: "Tests have been verified by the orchestrator. Do not re-run tests. Focus your time on code review."

**Edge case:** If the reviewer suspects a test gap (e.g., "this code path has no test"), they should request a **new test** in their findings, not re-run existing tests.

**Expected impact:** Saves ~30-60 seconds per review round (test execution time), and frees up reviewer context for actual code analysis.

## Session Archaeology — How to Find Bubble Sessions

To analyze a bubble's full review history, you need to locate both the implementer (Codex) and reviewer (Claude Code) sessions.

### Directory Mapping

Pairflow bubbles run in worktrees at:
```
/Users/felho/dev/.pairflow-worktrees/{repo-name}/{bubble-id}/
```

Agent sessions are stored based on this worktree path:

| Agent | Storage Location | Pattern |
|-------|-----------------|---------|
| Claude Code (reviewer) | `~/.claude/projects/-Users-felho-dev--pairflow-worktrees-{repo}-{bubble-id}/` | One `.jsonl` per round (fresh context mode) |
| Codex (implementer) | `~/.codex/sessions/YYYY/MM/DD/` | Single session for entire bubble (persistent) |

### Finding Reviewer Sessions (Claude Code)

```bash
# All reviewer sessions for a bubble:
ls ~/.claude/projects/-Users-felho-dev--pairflow-worktrees-pairflow-{bubble-id}/*.jsonl

# With timestamps, sorted chronologically:
for f in ~/.claude/projects/-Users-felho-dev--pairflow-worktrees-pairflow-{bubble-id}/*.jsonl; do
  ts=$(head -1 "$f" | python3 -c "import sys,json; print(json.loads(sys.stdin.readline()).get('timestamp','?'))")
  echo "$ts  $(basename $f .jsonl)"
done | sort
```

Each session = one review round. The number of sessions should roughly match the number of rounds in `state.json`.

### Finding Implementer Sessions (Codex)

```bash
# Filter codex sessions by worktree path:
for f in ~/.codex/sessions/YYYY/MM/DD/*.jsonl; do
  cwd=$(head -5 "$f" | python3 -c "
import sys,json
for line in sys.stdin:
  try:
    d=json.loads(line)
    if d.get('type')=='session_meta':
      print(d.get('payload',{}).get('cwd','?')); break
  except: pass")
  [[ "$cwd" == *"{bubble-id}"* ]] && echo "$(basename $f)  $cwd"
done
```

Codex keeps a **single persistent session** for the entire bubble (it doesn't restart between rounds).

### Key Observation: Session Count Asymmetry

For the `repo-registry-prd` bubble (13 rounds):
- **15 Claude Code sessions** (reviewer) — ~1 per round + extras from watchdog/resume
- **1 Codex session** (implementer) — single continuous session

This asymmetry means:
- Reviewer analysis: examine each session individually (they're independent, fresh context)
- Implementer analysis: parse the single session chronologically, correlating with round boundaries from `state.json`

### Correlating Sessions with Rounds

The `transcript.ndjson` has timestamps for each PASS message. Match these with session start times to map sessions to rounds:

```
Round 1 reviewer: PASS at 19:27:04 → session starting at ~19:23:28
Round 2 reviewer: PASS at 19:34:34 → session starting at ~19:30:57
...
```

## Bubbles Available for Deep Analysis

### 1. `repo-registry-prd` (13 rounds, active)

- **Transcript:** `.pairflow/bubbles/repo-registry-prd/transcript.ndjson` (33 KB)
- **Reviewer sessions (15):** `~/.claude/projects/-Users-felho-dev--pairflow-worktrees-pairflow-repo-registry-prd/*.jsonl`
- **Implementer session (1):** `~/.codex/sessions/2026/02/25/rollout-2026-02-25T20-04-27-019c9630-3293-7053-b5e7-276ceed35a53.jsonl`
- **Time span:** 19:04 – 21:20 (~2.5 hours)
- **Status:** Transcript intact, all sessions available

### 2. `delete-bubble` (36 rounds, completed & deleted)

- **Transcript:** DELETED (bubble was deleted via `pairflow bubble delete`, which removes the bubble directory including transcript)
- **Reviewer sessions (36):** `~/.claude/projects/-Users-felho-dev--pairflow-worktrees-pairflow-delete-bubble/*.jsonl` (33 MB total)
- **Implementer session (1):** `~/.codex/sessions/2026/02/25/rollout-2026-02-25T09-21-18-019c93e3-61be-7fb0-b135-11596fb7c3ef.jsonl` (9.7 MB)
- **Time span:** 08:41 – 12:36 (~4 hours, 36 rounds)
- **Status:** No transcript, but all session files preserved. Findings can be reconstructed from reviewer session content (each session contains the full review including `pairflow pass` commands with findings).

#### Reconstructing delete-bubble transcript

Since the transcript is gone, the review history must be reconstructed from:
1. **Reviewer sessions** — each one contains the `pairflow pass` CLI invocation with `--finding` flags showing what the reviewer found
2. **Implementer session** — single Codex session with the full implementation history, including what was fixed each round

To extract findings from reviewer sessions:
```bash
# Extract pairflow pass commands with findings from each reviewer session
for f in ~/.claude/projects/-Users-felho-dev--pairflow-worktrees-pairflow-delete-bubble/*.jsonl; do
  echo "=== $(basename $f .jsonl) ==="
  grep -o '"pairflow pass[^"]*"' "$f" | head -3
done
```

### Note on data preservation

The `deleteBubble` function does `rm -rf` on the bubble directory, destroying the transcript, state, and config. Agent session files are NOT affected — they live in `~/.claude/projects/` and `~/.codex/sessions/` respectively, outside pairflow's control.

What's lost on bubble delete:
- `transcript.ndjson` — structured protocol log (the convenient single-file view)
- `state.json`, `bubble.toml`, `inbox.ndjson`, `artifacts/`

What survives:
- All reviewer sessions (Claude Code) — full review content including findings
- Implementer session (Codex) — full implementation history
- These are richer than the transcript but harder to correlate without it

**Future improvement:** archive transcript before deletion (e.g., to `~/.pairflow/archived_transcripts/`).

## Open Questions

- Should the parallel agent count be configurable per bubble (e.g., quality_mode: strict → 3 agents, normal → 1)?
- How to handle the orchestrator disagreeing with all 3 agents on severity?
- Should deep exploration have a token/time budget to prevent runaway analysis?
- Is there value in the reviewer seeing its own prior findings (breaking fresh context mode) to prevent rediscovery?
