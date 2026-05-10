import { runBubbleStatusCommand } from "../../../src/cli/commands/bubble/status.js";
import type { BubbleStatusView } from "../../../src/v11/application/status/statusCommandApi.js";
import type { StatusExecutionContextView } from "../../../src/v11/shared/status/statusCommandViewProjection.js";
import type { LaunchBubbleSessionInput } from "../../../src/v11/ports/tmuxSessions.js";
import {
  createFakeExternalAdapters,
  type FakeExternalAdapters,
  type FakeExternalSideEffectsSnapshot
} from "./fakeExternalAdapters.js";
import {
  normalizeSmokeScenario,
  type SmokeConvergenceFinding,
  type SmokeScenario,
  type SmokeScenarioStep
} from "./scenario.js";

export interface SmokeAuthoritySnapshot {
  handoffId: string;
  executionId: string;
  awaitedOutputType: StatusExecutionContextView["awaitedOutputType"];
  activeRole?: "implementer" | "reviewer" | "meta_reviewer";
  round?: number;
  stateFingerprint?: string;
  stateFingerprintGuardMode?: "resolver" | "emit_surface";
}

export interface SmokeAuthorityResolverInput {
  repoPath: string;
  bubbleId: string;
}

export type SmokeAuthorityResolver = (
  input: SmokeAuthorityResolverInput
) => Promise<SmokeAuthoritySnapshot | null>;

export interface SmokeActorEmitInvocation {
  command: "pairflow";
  args: string[];
  input: SmokeScenarioStep;
  authority: SmokeAuthoritySnapshot;
}

export type SmokeActorEmitInvoker = (
  invocation: SmokeActorEmitInvocation
) => Promise<unknown>;

export interface SmokeRunnerOptions {
  repoPath: string;
  bubbleId: string;
  scenario: unknown;
  authorityResolver?: SmokeAuthorityResolver;
  actorEmitInvoker?: SmokeActorEmitInvoker;
  fakeAdapters?: FakeExternalAdapters;
}

export interface SmokeRunnerStartInput {
  start?: (adapters: FakeExternalAdapters) => Promise<unknown>;
}

export interface SmokeAdvanceResult {
  step: SmokeScenarioStep;
  authority: SmokeAuthoritySnapshot;
  command: {
    command: "pairflow";
    args: string[];
  };
  result: unknown;
  sideEffects: FakeExternalSideEffectsSnapshot;
}

export interface SmokeRunnerSnapshot {
  scenario: SmokeScenario;
  launchInput: LaunchBubbleSessionInput | null;
  launchAuthority: SmokeAuthoritySnapshot | null;
  advances: SmokeAdvanceResult[];
  sideEffects: FakeExternalSideEffectsSnapshot;
}

export class SmokeRunnerError extends Error {
  public constructor(reasonCode: string, message: string) {
    super(`${reasonCode}: ${message}`);
    this.name = "SmokeRunnerError";
  }
}

function requireNonEmpty(value: string | undefined, field: string): string {
  if (value === undefined || value.trim().length === 0) {
    throw new SmokeRunnerError(
      "SMOKE_AUTHORITY_MISSING",
      `Current public status is missing ${field}.`
    );
  }
  return value.trim();
}

function requireAwaitedOutputType(
  value: SmokeAuthoritySnapshot["awaitedOutputType"] | undefined
): SmokeAuthoritySnapshot["awaitedOutputType"] {
  if (value !== "pass_result" && value !== "meta_review_result") {
    throw new SmokeRunnerError(
      "SMOKE_AUTHORITY_MISSING",
      "Current public status is missing awaitedOutputType."
    );
  }
  return value;
}

function requireLaunchText(
  value: unknown,
  field: keyof LaunchBubbleSessionInput
): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new SmokeRunnerError(
      "SMOKE_LAUNCH_INCOMPLETE",
      `Fake launch acknowledgement is missing ${String(field)}.`
    );
  }
  return value.trim();
}

function validateLaunchInput(
  input: LaunchBubbleSessionInput,
  expectedBubbleId: string
): LaunchBubbleSessionInput {
  const bubbleId = requireLaunchText(input.bubbleId, "bubbleId");
  if (bubbleId !== expectedBubbleId) {
    throw new SmokeRunnerError(
      "SMOKE_LAUNCH_BUBBLE_MISMATCH",
      `Fake launch acknowledgement belongs to ${bubbleId}, expected ${expectedBubbleId}.`
    );
  }
  return {
    ...input,
    bubbleId,
    workspacePath: requireLaunchText(input.workspacePath, "workspacePath"),
    statusCommand: requireLaunchText(input.statusCommand, "statusCommand"),
    implementerCommand: requireLaunchText(
      input.implementerCommand,
      "implementerCommand"
    ),
    reviewerCommand: requireLaunchText(input.reviewerCommand, "reviewerCommand"),
    ...(input.metaReviewerCommand !== undefined
      ? {
          metaReviewerCommand: requireLaunchText(
            input.metaReviewerCommand,
            "metaReviewerCommand"
          )
        }
      : {})
  };
}

export function authorityFromStatusView(
  status: BubbleStatusView
): SmokeAuthoritySnapshot | null {
  if (status.executionContext === null) {
    return null;
  }
  return {
    handoffId: requireNonEmpty(status.executionContext.handoffId, "handoffId"),
    executionId: requireNonEmpty(status.executionContext.executionId, "executionId"),
    awaitedOutputType: status.executionContext.awaitedOutputType,
    activeRole: status.executionContext.activeRole,
    round: status.executionContext.round,
    stateFingerprintGuardMode: "emit_surface"
  };
}

export function createStatusCommandAuthorityResolver(
  cwd?: string
): SmokeAuthorityResolver {
  return async ({ repoPath, bubbleId }) => {
    const status = await runBubbleStatusCommand(
      {
        id: bubbleId,
        repo: repoPath,
        json: true,
        table: false,
        help: false
      },
      cwd ?? repoPath
    );
    if (status === null) {
      return null;
    }
    return authorityFromStatusView(status);
  };
}

function waitForSpawnClose(
  child: ReturnType<FakeExternalAdapters["processSpawn"]>
): Promise<{ exitCode: number | null }> {
  return new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("close", (exitCode) => {
      if (exitCode !== 0) {
        reject(new SmokeRunnerError(
          "SMOKE_ACTOR_EMIT_FAILED",
          `pairflow agent emit exited with ${exitCode === null ? "no exit code" : exitCode}.`
        ));
        return;
      }
      resolve({ exitCode });
    });
  });
}

function defaultActorEmitInvoker(
  fakeAdapters: FakeExternalAdapters
): SmokeActorEmitInvoker {
  return async ({ command, args }) => {
    const child = fakeAdapters.processSpawn(command, args, {
      stdio: ["ignore", "pipe", "pipe"]
    });
    return waitForSpawnClose(child);
  };
}

function cloneLaunchInput(input: LaunchBubbleSessionInput): LaunchBubbleSessionInput {
  return { ...input };
}

function cloneAuthority(authority: SmokeAuthoritySnapshot): SmokeAuthoritySnapshot {
  return { ...authority };
}

function cloneStep(step: SmokeScenarioStep): SmokeScenarioStep {
  return structuredClone(step);
}

function cloneScenario(scenario: SmokeScenario): SmokeScenario {
  return {
    id: scenario.id,
    steps: scenario.steps.map(cloneStep)
  };
}

function cloneResult(result: unknown): unknown {
  try {
    return structuredClone(result);
  } catch (error) {
    return {
      cloneable: false,
      type: Object.prototype.toString.call(result),
      reason:
        error instanceof Error
          ? `${error.name}: ${error.message}`
          : "structuredClone failed for actor emit result"
    };
  }
}

function cloneAdvance(advance: SmokeAdvanceResult): SmokeAdvanceResult {
  return {
    step: cloneStep(advance.step),
    authority: cloneAuthority(advance.authority),
    command: {
      command: advance.command.command,
      args: [...advance.command.args]
    },
    result: cloneResult(advance.result),
    sideEffects: structuredClone(advance.sideEffects)
  };
}

function encodeFindingRef(ref: string): string {
  return ref.replace(/\\/g, "\\\\").replace(/,/g, "\\,");
}

function formatFinding(finding: {
  severity?: string;
  priority?: string;
  title: string;
  refs?: string[];
}): string {
  const severity = finding.severity ?? finding.priority;
  const refs = finding.refs?.map(encodeFindingRef).join(",");
  return `${severity}:${finding.title}${refs !== undefined && refs.length > 0 ? `|${refs}` : ""}`;
}

function appendCommonStepArgs(
  args: string[],
  step: SmokeScenarioStep
): void {
  for (const ref of step.refs ?? []) {
    args.push("--ref", ref);
  }
  if (step.expectedRole !== undefined) {
    args.push("--expected-role", step.expectedRole);
  }
  if (step.expectedRound !== undefined) {
    args.push("--expected-round", String(step.expectedRound));
  }
  if (step.expectedStateFingerprint !== undefined) {
    args.push("--expected-state-fingerprint", step.expectedStateFingerprint);
  }
}

export function buildSmokeActorEmitArgv(input: {
  repoPath: string;
  bubbleId: string;
  authority: SmokeAuthoritySnapshot;
  step: SmokeScenarioStep;
}): string[] {
  const args = [
    "agent",
    "emit",
    "--kind",
    input.step.kind,
    "--repo",
    input.repoPath,
    "--bubble-id",
    input.bubbleId,
    "--handoff-id",
    input.authority.handoffId,
    "--execution-id",
    input.authority.executionId
  ];
  appendCommonStepArgs(args, input.step);

  if (input.step.kind === "pass") {
    args.push("--summary", input.step.summary);
    if (input.step.intent !== undefined) {
      args.push("--intent", input.step.intent);
    }
    for (const finding of input.step.findings ?? []) {
      args.push("--finding", formatFinding(finding));
    }
    if (input.step.noFindings === true) {
      args.push("--no-findings");
    }
    return args;
  }

  if (input.step.kind === "human_question") {
    args.push("--question", input.step.question);
    return args;
  }

  if (input.step.kind === "convergence") {
    args.push("--summary", input.step.summary);
    for (const finding of input.step.findings ?? []) {
      args.push("--finding", formatFinding(finding));
    }
    return args;
  }

  args.push(
    "--round",
    String(input.step.round),
    "--recommendation",
    input.step.recommendation,
    "--summary",
    input.step.summary,
    "--report-json",
    JSON.stringify(input.step.reportJson)
  );
  if (input.step.reworkTargetMessage != null) {
    args.push("--rework-target-message", input.step.reworkTargetMessage);
  }
  return args;
}

function assertLaunchAuthorityFresh(input: {
  captured: SmokeAuthoritySnapshot;
  current: SmokeAuthoritySnapshot;
}): void {
  if (
    input.captured.handoffId !== input.current.handoffId
    || input.captured.executionId !== input.current.executionId
  ) {
    throw new SmokeRunnerError(
      "SMOKE_STALE_AUTHORITY",
      "Captured launch authority does not match current public status authority."
    );
  }
}

function expectedAwaitedOutputType(
  step: SmokeScenarioStep
): SmokeAuthoritySnapshot["awaitedOutputType"] {
  return step.kind === "meta_review_result" ? "meta_review_result" : "pass_result";
}

function assertAwaitedOutputMatchesStep(input: {
  step: SmokeScenarioStep;
  authority: SmokeAuthoritySnapshot;
}): void {
  const expected = expectedAwaitedOutputType(input.step);
  if (input.authority.awaitedOutputType !== expected) {
    throw new SmokeRunnerError(
      "SMOKE_AWAITED_OUTPUT_MISMATCH",
      `Step kind ${input.step.kind} requires awaitedOutputType ${expected}, got ${input.authority.awaitedOutputType}.`
    );
  }
}

function assertStepGuards(input: {
  step: SmokeScenarioStep;
  authority: SmokeAuthoritySnapshot;
}): void {
  assertAwaitedOutputMatchesStep(input);
  if (
    input.step.expectedRole !== undefined
    && input.authority.activeRole !== input.step.expectedRole
  ) {
    throw new SmokeRunnerError(
      "SMOKE_STALE_AUTHORITY",
      `Expected active role ${input.step.expectedRole}, got ${input.authority.activeRole ?? "missing"}.`
    );
  }
  if (
    input.step.expectedRound !== undefined
    && input.authority.round !== input.step.expectedRound
  ) {
    throw new SmokeRunnerError(
      "SMOKE_STALE_AUTHORITY",
      `Expected round ${input.step.expectedRound}, got ${input.authority.round ?? "missing"}.`
    );
  }
  if (input.step.expectedStateFingerprint !== undefined) {
    if (input.authority.stateFingerprint === undefined) {
      if (input.authority.stateFingerprintGuardMode === "emit_surface") {
        return;
      }
      throw new SmokeRunnerError(
        "SMOKE_AUTHORITY_MISSING",
        "Current resolver authority does not expose stateFingerprint required by the step guard."
      );
    }
    if (input.authority.stateFingerprint !== input.step.expectedStateFingerprint) {
      throw new SmokeRunnerError(
        "SMOKE_STALE_AUTHORITY",
        "Expected state fingerprint does not match current resolver authority."
      );
    }
  }
}

function requireAuthority(
  authority: SmokeAuthoritySnapshot | null
): SmokeAuthoritySnapshot {
  if (authority === null) {
    throw new SmokeRunnerError(
      "SMOKE_AUTHORITY_MISSING",
      "Current public status does not expose executionContext authority."
    );
  }
  requireNonEmpty(authority.handoffId, "handoffId");
  requireNonEmpty(authority.executionId, "executionId");
  requireAwaitedOutputType(authority.awaitedOutputType);
  return authority;
}

export class AlmostE2eSmokeRunner {
  public readonly scenario: SmokeScenario;
  public readonly fakeAdapters: FakeExternalAdapters;
  private readonly repoPath: string;
  private readonly bubbleId: string;
  private readonly authorityResolver: SmokeAuthorityResolver;
  private readonly actorEmitInvoker: SmokeActorEmitInvoker;
  private launchInput: LaunchBubbleSessionInput | null = null;
  private launchAuthority: SmokeAuthoritySnapshot | null = null;
  private nextStepIndex = 0;
  private advanceInFlight = false;
  private readonly advances: SmokeAdvanceResult[] = [];
  private readonly advancedStepIndexes = new Set<number>();

  public constructor(options: SmokeRunnerOptions) {
    this.repoPath = options.repoPath;
    this.bubbleId = options.bubbleId;
    this.scenario = normalizeSmokeScenario(options.scenario);
    this.authorityResolver =
      options.authorityResolver ?? createStatusCommandAuthorityResolver();
    this.fakeAdapters =
      options.fakeAdapters
      ?? createFakeExternalAdapters({
        onLaunchAck: (input) => {
          this.registerLaunch(input);
        }
      });
    this.actorEmitInvoker =
      options.actorEmitInvoker ?? defaultActorEmitInvoker(this.fakeAdapters);
  }

  public registerLaunch(input: LaunchBubbleSessionInput): void {
    this.launchInput = cloneLaunchInput(validateLaunchInput(input, this.bubbleId));
  }

  public async start(input: SmokeRunnerStartInput = {}): Promise<void> {
    const launchAckCountBeforeStart = this.fakeAdapters.snapshot().launchAcks.length;
    await input.start?.(this.fakeAdapters);
    if (this.launchInput === null) {
      const launchAck = this.fakeAdapters
        .snapshot()
        .launchAcks.slice(launchAckCountBeforeStart)
        .at(-1);
      if (launchAck !== undefined) {
        this.registerLaunch(launchAck.input);
      }
    }
    if (this.launchInput === null) {
      throw new SmokeRunnerError(
        "SMOKE_LAUNCH_MISSING",
        "Fake launch acknowledgement did not register launch metadata."
      );
    }
    this.launchAuthority = cloneAuthority(requireAuthority(
      await this.authorityResolver({
        repoPath: this.repoPath,
        bubbleId: this.bubbleId
      })
    ));
  }

  public async advance(label?: string): Promise<SmokeAdvanceResult> {
    if (this.advanceInFlight) {
      throw new SmokeRunnerError(
        "SMOKE_ADVANCE_IN_FLIGHT",
        "Only one smoke scenario advance may run at a time."
      );
    }
    this.advanceInFlight = true;
    try {
      const nextStep = this.resolveNextStep(label);
      const step = nextStep.step;
      const currentAuthority = requireAuthority(
        await this.authorityResolver({
          repoPath: this.repoPath,
          bubbleId: this.bubbleId
        })
      );
      if (this.advances.length === 0) {
        if (this.launchAuthority === null) {
          throw new SmokeRunnerError(
            "SMOKE_AUTHORITY_MISSING",
            "Runner start must capture launch authority before first advance."
          );
        }
        assertLaunchAuthorityFresh({
          captured: this.launchAuthority,
          current: currentAuthority
        });
      }
      assertStepGuards({ step, authority: currentAuthority });

      const args = buildSmokeActorEmitArgv({
        repoPath: this.repoPath,
        bubbleId: this.bubbleId,
        authority: currentAuthority,
        step
      });
      const invocation = {
        command: "pairflow" as const,
        args,
        input: step,
        authority: currentAuthority
      };
      const result = await this.actorEmitInvoker(invocation);
      const advance = {
        step: cloneStep(step),
        authority: cloneAuthority(currentAuthority),
        command: {
          command: invocation.command,
          args: [...invocation.args]
        },
        result: cloneResult(result),
        sideEffects: this.fakeAdapters.snapshot()
      };
      this.advances.push(advance);
      this.advancedStepIndexes.add(nextStep.index);
      this.nextStepIndex = this.resolveNextUnadvancedIndex(nextStep.nextIndex);
      return cloneAdvance(advance);
    } finally {
      this.advanceInFlight = false;
    }
  }

  public snapshot(): SmokeRunnerSnapshot {
    return {
      scenario: cloneScenario(this.scenario),
      launchInput:
        this.launchInput === null ? null : cloneLaunchInput(this.launchInput),
      launchAuthority:
        this.launchAuthority === null ? null : cloneAuthority(this.launchAuthority),
      advances: this.advances.map(cloneAdvance),
      sideEffects: this.fakeAdapters.snapshot()
    };
  }

  private resolveNextStep(label?: string): {
    step: SmokeScenarioStep;
    index: number;
    nextIndex: number;
  } {
    if (label !== undefined) {
      const index = this.scenario.steps.findIndex((step) => step.label === label);
      if (index < 0) {
        throw new SmokeRunnerError(
          "SMOKE_STEP_MISSING",
          `No scenario step has label '${label}'.`
        );
      }
      if (this.advancedStepIndexes.has(index)) {
        throw new SmokeRunnerError(
          "SMOKE_STEP_ALREADY_ADVANCED",
          `Scenario step label '${label}' has already advanced.`
        );
      }
      return {
        step: this.scenario.steps[index] as SmokeScenarioStep,
        index,
        nextIndex: index + 1
      };
    }
    const index = this.resolveNextUnadvancedIndex(this.nextStepIndex);
    const step = this.scenario.steps[index];
    if (step === undefined) {
      throw new SmokeRunnerError(
        "SMOKE_STEP_MISSING",
        "No remaining scenario step is available."
      );
    }
    return {
      step,
      index,
      nextIndex: index + 1
    };
  }

  private resolveNextUnadvancedIndex(startIndex: number): number {
    let index = Math.min(startIndex, this.scenario.steps.length);
    while (
      index > 0
      && this.scenario.steps
        .slice(0, index)
        .some((_, candidateIndex) => !this.advancedStepIndexes.has(candidateIndex))
    ) {
      index -= 1;
    }
    while (this.advancedStepIndexes.has(index)) {
      index += 1;
    }
    return index;
  }
}

export function createAlmostE2eSmokeRunner(
  options: SmokeRunnerOptions
): AlmostE2eSmokeRunner {
  return new AlmostE2eSmokeRunner(options);
}

export type { SmokeConvergenceFinding };
