# L1 Contract Boundaries

Use this to decide what belongs in L1 (required) vs L2 (optional).

Rule:
1. If it affects other files/systems/developer expectations -> L1.
2. If it is internal implementation detail inside one code unit -> L2.

L1 categories:
1. Data and type contract
2. Public interfaces and call-sites
3. Side effects and state mutation boundaries
4. Error/fallback behavior
5. Dependency constraints
6. Test matrix

Any item not crossing these boundaries should default to `later-hardening`.
