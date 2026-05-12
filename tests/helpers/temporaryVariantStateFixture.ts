// Step 4b-γ/4 transitional test-only fixture bridge.
//
// The canonical parser flip in Step 4b-γ/4 made BubbleStateSnapshot the
// variant union type that ports and helpers accept. Many existing test
// fixtures construct persisted-shape state objects (no `kind` field) or
// spread the loaded variant state and override fields in ways that lose
// the discriminator. Migrating each fixture to a proper variant builder
// is out of scope for the atomic source-flip commit; Step 4b-γ/5
// performs that fixture sweep.
//
// This helper provides a single, explicitly-temporary cast site so the
// test fixtures can keep their persisted-shape shape while satisfying
// the variant-typed port signatures. It is grep-able as
// `asTemporaryVariantStateFixture` so Step 4b-γ/5 can locate and remove
// every caller.
//
// Guardrails:
//   - Test-only. Production source MUST NOT import this helper.
//   - Required cleanup target for Step 4b-γ/5: every call site is
//     replaced with a proper variant builder fixture.

import type { BubbleStateSnapshot } from "../../src/v11/domain/state/snapshot/bubbleStateSnapshot.js";

export function asTemporaryVariantStateFixture<T>(state: T): BubbleStateSnapshot {
  return state as unknown as BubbleStateSnapshot;
}
