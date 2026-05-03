# UI Contract Governance

Status: active  
Owner: architecture/ui-runtime  
Scope: browser-safe UI contract ownership under `src/contracts/ui/**`

## Purpose

`src/contracts/ui/**` is the canonical home for browser-safe UI DTO contracts
shared by the backend UI router and the browser client.

## Boundary

UI contract files own structural payload shape only.

Runtime, routing, parser, presenter, event-log, and capability-port modules own
behavior: how payloads are produced, which actions are accepted, how side
effects run, and how events are emitted.

Compatibility files may re-export canonical UI contracts, but they must not
redeclare broad UI DTO mirrors or import UI contract authority from internal
`src/v11/**` runtime paths.

## Enforcement

The durable enforcement surface is code-level tests and fitness checks, not this
document.

Current guards:

- `tests/contracts/uiContractTransitSource.test.ts`
- `tests/contracts/uiContractParity.types.ts`
- `pnpm fitness:check:ci`

If this ownership model changes, update the relevant guards with the code
change. Do not move detailed implementation matrices into this document.
