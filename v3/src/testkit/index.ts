// Test-only support module (ADR-005, amends ADR-001): production modules
// never import testkit/; testkit imports ports/, domain/, emit/ at most —
// never kernel/ or store/. Lint-enforced (plan §3.3).
export { createControlledClock } from "./controlledClock.js";
export type { ControlledClock } from "./controlledClock.js";
export { createFakeEgress } from "./fakeEgress.js";
export type { FakeEgress, RecordedEgressCall } from "./fakeEgress.js";
export { createScriptedActor } from "./scriptedActor.js";
export type { DeliverFn, ScriptedActor } from "./scriptedActor.js";
export { createScriptedGateRunner, createScriptedProcessRunner } from "./fixtures.js";
export type { ScriptedGateRunner, ScriptedProcessRunner } from "./fixtures.js";
export { fixtureDefinitionStore, fixtureTemplate } from "./templateFixture.js";
export {
  checkEndStateConsistency,
  checkOpUniqueness,
  checkSeqContinuity,
  checkTerminalSink,
  checkVersionArithmetic,
  runAllCheckers,
} from "./storeCheckers.js";
export { replayTrace } from "./traceHarness.js";
export type {
  ExpectedOutcome,
  HarnessStartInput,
  ReplayResult,
  TraceFixture,
  TraceSeams,
  TraceStep,
} from "./traceHarness.js";
