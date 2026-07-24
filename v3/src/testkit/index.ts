// Test-only support module (ADR-005, amends ADR-001): production modules
// never import testkit/; testkit imports ports/, domain/, emit/ at most —
// never kernel/ or store/. Lint-enforced (plan §3.3).
export { createControlledClock } from "./controlledClock.js";
export type { ControlledClock } from "./controlledClock.js";
export { createFakeEgress } from "./fakeEgress.js";
export type { FakeEgress, RecordedEgressCall } from "./fakeEgress.js";
export { createScriptedActor } from "./scriptedActor.js";
export type { DeliverFn, ScriptedActor } from "./scriptedActor.js";
export { createScriptedAttemptExecutor } from "./scriptedAttemptExecutor.js";
export type {
  RecordedAttemptCall,
  ScriptedAttemptExecutor,
  ScriptedAttemptExecutorOptions,
  ScriptedAttemptStep,
} from "./scriptedAttemptExecutor.js";
export {
  createScriptedProcessGateRunner,
  SCRIPTED_GIT_STATUS_HASH,
  SCRIPTED_HEAD_SHA,
} from "./scriptedProcessGateRunner.js";
export type {
  RecordedRunnerCall,
  ScriptedProcessGateRunner,
} from "./scriptedProcessGateRunner.js";
export { createScriptedRuntimeContextProvider } from "./scriptedRuntimeContextProvider.js";
export type {
  ProvisionCall,
  ScriptedProvisionBehavior,
  ScriptedRuntimeContextProvider,
  ScriptedRuntimeContextProviderOptions,
} from "./scriptedRuntimeContextProvider.js";
export { createScriptedTailWait } from "./tailWait.js";
export type { ScriptedTailWait } from "./tailWait.js";
export { devPassthroughRedactionPolicy } from "./redaction.js";
export { createRecordingDiagnosticsSink } from "./diagnostics.js";
export type { RecordingDiagnostics } from "./diagnostics.js";
export { fixtureDefinitionStore, fixtureTemplate } from "./templateFixture.js";
export {
  checkEndStateConsistency,
  checkEvidenceResolution,
  checkOpUniqueness,
  checkSeqContinuity,
  checkTerminalSink,
  checkVersionArithmetic,
  runAllCheckers,
} from "./storeCheckers.js";
export type { EvidenceResolveSeam } from "./storeCheckers.js";
export { replayTrace, TraceMismatchError } from "./traceHarness.js";
export type {
  ExpectedOutcome,
  HarnessCreateInput,
  HarnessStartOpInput,
  ReplayResult,
  TraceFixture,
  TraceSeams,
  TraceStep,
} from "./traceHarness.js";
