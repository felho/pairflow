# Pairflow Evidence Pattern (Reference)

This is a minimal reference pattern for trusted validation evidence in a project that uses Pairflow.

## Why

Reviewer-side skip decisions are only safe when implementer evidence is both:

1. command-specific (what was run),
2. outcome-specific (explicit pass/fail + exit),
3. provenance-backed (attached as log refs, not only summary text).

## Minimal Pattern

1. Keep existing validation commands (`lint`, `typecheck`, `test`) as the main interface.
2. Route those commands through a small wrapper that:
   - writes logs under `.pairflow/evidence/`,
   - records timestamp + commit + command,
   - records explicit command result and exit code.
3. Attach evidence logs on implementer handoff:

```bash
pairflow pass --summary "Validation complete: lint/typecheck/test" \
  --ref .pairflow/evidence/lint.log \
  --ref .pairflow/evidence/typecheck.log \
  --ref .pairflow/evidence/test.log
```

## Notes

- Evidence logs are runtime artifacts; they can stay local/ignored.
- Start small: one script wrapper and one handoff convention is enough for v1.
- Expand only if reliability gaps appear (rotation, schema hardening, etc.).

