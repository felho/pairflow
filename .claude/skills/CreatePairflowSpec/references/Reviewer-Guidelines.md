# Reviewer Guidelines

1. Tag each finding with:
   - `priority`: `P0|P1|P2|P3`
   - `timing`: `required-now|later-hardening`
   - `layer`: `L1|L2`
   - `evidence`: repro/failing-output/code-path
2. Blockers are only `P0/P1 + required-now + L1`.
3. `P2/P3` and `L2` default to `later-hardening`.
4. Max 2 L1 hardening rounds.
5. After round 2, new `required-now` only for evidence-backed `P0/P1`.
