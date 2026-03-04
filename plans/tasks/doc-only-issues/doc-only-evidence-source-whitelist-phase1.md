# Task: Evidence Source Whitelist for Command Verification (Phase 1)

## Context

A jelenlegi verifier ref-feldolgozás túl tág: nem csak dedikált evidence logokat olvas, hanem egyéb artifact/prose fájlokból is találhat "egyezést". Ez hamis vagy félrevezető command evidence állapotokat eredményezhet.

## Goal

Command evidence csak explicit, megbízható logforrásból származhasson.

## Scope

In scope:
1. Evidence source whitelist szabály bevezetése.
2. Nem-whitelisted refek kizárása command verificationből.
3. Reason detail javítása, hogy látszódjon a kizárás oka.

Out of scope:
1. Új logformátum tervezése.
2. Általános artifact trust scoring.

## Proposed Behavior

1. Command verification inputként csak olyan ref olvasható, ami megfelel egy explicit allowlist mintának (pl. `.pairflow/evidence/*.log`).
2. `done-package.md`, `reviewer-test-verification.json` és más prose/artifact fájl ne lehessen command evidence source.
3. Kizárt forrásokat diagnosztikában listázni kell.

## Suggested Touchpoints

1. `src/core/reviewer/testEvidence.ts`
2. `tests/core/reviewer/testEvidence.test.ts`
3. Dokumentáció az elvárt `--ref` mintákról

## Acceptance Criteria

1. Non-log ref nem adhat command `verified` státuszt.
2. Canonical evidence logból továbbra is működik a trusted path.
3. A reason detail jelzi, ha ref kizárás történt source policy miatt.
4. Meglévő code-bubble működés nem sérül.

## Test Plan

1. `done-package.md` ref mellett nincs verified command.
2. `reviewer-test-verification.json` ref mellett nincs verified command.
3. `.pairflow/evidence/*.log` ref mellett változatlanul működik a verifier.

