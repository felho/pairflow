# v11 Shared

`shared/**` contains policy-neutral helper modules, common meanings,
normalizers, and concept/pattern contracts that are reused across more than
one v11 lane.

It is not the port layer. Application-facing capability contracts live in
`src/v11/ports/**`.

Use `shared/**` when a module answers:

- what a cross-lane concept means,
- how a shared value is normalized or rendered,
- which adapter-neutral helper shape several lanes use.

Do not use `shared/**` for:

- command-local helper parking,
- runtime adapter selection,
- filesystem/git/tmux/process implementations,
- wrappers whose only purpose is to hide infrastructure ownership.

If application code needs an IO/runtime capability, define or reuse a port in
`src/v11/ports/**`, implement it under `src/v11/infrastructure/**`, and wire it
from a composition root or `src/v11/defaults/**`.
