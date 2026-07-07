# Task packets

Home of the v3 task packets (template + projection checklist:
[`../task-packet-template.md`](../task-packet-template.md)). The
coverage-accounting script (`tools/v3-plan/check_coverage.py`, root bridge
`pnpm v3:coverage`) parses every `*.md` here except this README: each
packet carries exactly one fenced ```json block with a `ledger_slice`
top-level key.

Empty until chapter 4 by decision (plan §3.7): chapter 3 ran the build
loop directly; the packet convention's first live use is the ch-4 kernel
slices.
