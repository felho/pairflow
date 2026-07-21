# v3 — one root for the whole v3 effort

Re-cut by ROLE (plane), not by phase (ADR-015). Four planes plus the
code:

| Plane | What it IS | Authority |
|---|---|---|
| `model/` | The ratified model corpus — source of truth AND build input (`core-model.html` + its addressable sources; machine face `model/ledger.md`). | Written only through the model-plane process (`design/design-method-playbook.md` §6/§8); the implementation consumes it, never edits it. Golden test: `tools/v3-model/check.sh`. |
| `design/` | Ratified thinking + history, read-mostly: the essays (`approach.md`, `design-method-playbook.md`, `implementation-contract.md`), the external-system studies (`design/research/`), the topic memos (`design/topics/`). | Standing authority where cited (playbook, implementation contract); archive otherwise. New topic memos still land in `design/topics/`. |
| `implementation/` | The factory: process README, `plan.md`, task packets (`implementation/packets/`), chapter contract-drafts (`implementation/contracts/`), templates, logs. | `implementation/README.md` (build loop §4, execution model §5, chapter DoD §6, friction log §7). |
| `adr/` · `src/` · `templates/` | The code plane. | ADR-001 (package topology); `adr/README.md` is the ADR index. |

Package files (`package.json`, `tsconfig.json`, `vitest.config.ts`, …)
sit at this root; verification bridges run from the REPO root
(`pnpm v3:typecheck`, `v3:lint`, `v3:test`, `v3:coverage`,
`v3:packet-lint`, `v3:adr-check`).

The model↔code coupling is machine-locked: the drift suite
(`src/drift/`) reads `model/` at test time, and `model/ledger.md` is
the model↔code contract surface every packet anchors to.

History: this root was consolidated from two earlier trees by ADR-015
(2026-07-21) — the migration report
(`implementation/adr-015-migration-report.md`) carries the full
reference census, and pre-migration file history is reachable with
`git log --follow`.
