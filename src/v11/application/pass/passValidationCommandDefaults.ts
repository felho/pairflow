import type { BubbleConfig } from "../../../types/bubble.js";
import type {
  ReadDocContractGateArtifactPort,
  ResolveDocContractGateArtifactPathPort,
  WriteDocContractGateArtifactPort
} from "../../shared/ports/docContractGateArtifacts.js";
import type {
  ResolveReviewVerificationInputFromRefsPort,
  WriteReviewVerificationArtifactAtomicPort
} from "../../shared/ports/reviewVerificationArtifacts.js";
import type { ReviewerTestExecutionDirective } from "../../shared/reviewer/testEvidence.js";

export type PassValidationPolicyState =
  | "policy_missing"
  | "policy_explicit_null"
  | "policy_configured";

export interface PassValidationCommandSpec {
  kind: string;
  command: string;
  targetId?: string;
  cwd?: string;
  targetPaths?: string[];
}

export interface PassValidationCommandResult {
  kind: string;
  command: string;
  exitCode: number;
  logPath: string;
  durationMs: number;
  targetId?: string;
  cwd?: string;
  targetPaths?: string[];
}

export interface ResolvedPassValidationPolicy {
  policyState: PassValidationPolicyState;
  commands: PassValidationCommandSpec[];
  requiredCommandSetId: string | null;
  invalidReason?: string;
}

interface PassValidationRunnerExecutionErrorInstance extends Error {
  logPath: string;
  context?: {
    cwd?: string;
  };
}

interface PassValidationRunnerExecutionErrorConstructor {
  new (...args: never[]): PassValidationRunnerExecutionErrorInstance;
  prototype: PassValidationRunnerExecutionErrorInstance;
}

interface RunPassValidationCommandInput {
  kind: string;
  command: string;
  worktreePath: string;
  cwd?: string;
}

interface RunPassValidationCommandResult {
  command: string;
  exitCode: number;
  logPath: string;
  durationMs: number;
  executionCwd: string;
}

interface BuildPassValidationEvidenceArtifactInput {
  bubbleId: string;
  round: number;
  generatedAt: string;
  worktreePath: string;
  policyState: PassValidationPolicyState;
  requiredCommandSetId: string | null;
  trustLevel: "trusted" | "untrusted";
  trustReasonCode: "no_trigger" | "pass_validation_policy_missing";
  commands: Array<PassValidationCommandSpec | PassValidationCommandResult>;
}

type PassValidationEvidenceArtifact = unknown;

interface PassValidationDefaults {
  buildPassValidationEvidenceArtifact: (
    input: BuildPassValidationEvidenceArtifactInput
  ) => Promise<PassValidationEvidenceArtifact>;
  createPassValidationReviewerDirective: (input: {
    policyState: PassValidationPolicyState;
    executedCommands: PassValidationCommandResult[];
  }) => ReviewerTestExecutionDirective;
  readDocContractGateArtifact: ReadDocContractGateArtifactPort;
  resolveDocContractGateArtifactPath: ResolveDocContractGateArtifactPathPort;
  resolveReviewVerificationInputFromRefs:
    ResolveReviewVerificationInputFromRefsPort;
  resolvePassValidationArtifactPath: (artifactsDir: string) => string;
  resolvePassValidationPolicy: (
    bubbleConfig: BubbleConfig
  ) => ResolvedPassValidationPolicy;
  resolvePassValidationReviewerCompatibilityArtifactPath: (
    artifactsDir: string
  ) => string;
  runPassValidationCommand: (
    input: RunPassValidationCommandInput
  ) => Promise<RunPassValidationCommandResult>;
  writePassValidationEvidenceArtifact: (
    artifactPath: string,
    artifact: PassValidationEvidenceArtifact
  ) => Promise<void>;
  writeDocContractGateArtifact: WriteDocContractGateArtifactPort;
  writeReviewVerificationArtifactAtomic: WriteReviewVerificationArtifactAtomicPort;
  writePassValidationReviewerCompatibilityArtifact: (
    artifactPath: string,
    directive: ReviewerTestExecutionDirective
  ) => Promise<void>;
}

interface PassValidationCommandDefaultsModule {
  passValidationDefaults: PassValidationDefaults;
  PassValidationRunnerExecutionError:
    PassValidationRunnerExecutionErrorConstructor;
}

let passValidationCommandDefaultsModulePromise:
  | Promise<PassValidationCommandDefaultsModule>
  | undefined;

function getPassValidationCommandDefaultsModulePath(): string {
  return "../../defaults/pass/passValidationCommandDefaults.js";
}

async function loadPassValidationCommandDefaultsModule():
  Promise<PassValidationCommandDefaultsModule> {
  passValidationCommandDefaultsModulePromise ??= import(
    getPassValidationCommandDefaultsModulePath()
  ) as Promise<PassValidationCommandDefaultsModule>;
  return passValidationCommandDefaultsModulePromise;
}

const passValidationCommandDefaultsModule =
  await loadPassValidationCommandDefaultsModule();

export const passValidationDefaults =
  passValidationCommandDefaultsModule.passValidationDefaults;

export const PassValidationRunnerExecutionError =
  passValidationCommandDefaultsModule.PassValidationRunnerExecutionError;
