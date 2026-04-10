import type {
  ResolveReviewerTestExecutionDirectiveFromArtifactPort,
  ResolveReviewerTestExecutionDirectivePort,
  VerifyImplementerTestEvidencePort,
  WriteReviewerTestEvidenceArtifactPort
} from "../../shared/ports/reviewerTestEvidenceArtifacts.js";

let reviewerTestEvidenceModulePromise:
  | Promise<{
      resolveReviewerTestExecutionDirective: ResolveReviewerTestExecutionDirectivePort;
      resolveReviewerTestExecutionDirectiveFromArtifact:
        ResolveReviewerTestExecutionDirectiveFromArtifactPort;
      verifyImplementerTestEvidence: VerifyImplementerTestEvidencePort;
      writeReviewerTestEvidenceArtifact: WriteReviewerTestEvidenceArtifactPort;
    }>
  | undefined;

async function loadReviewerTestEvidenceModule(): Promise<{
  resolveReviewerTestExecutionDirective: ResolveReviewerTestExecutionDirectivePort;
  resolveReviewerTestExecutionDirectiveFromArtifact:
    ResolveReviewerTestExecutionDirectiveFromArtifactPort;
  verifyImplementerTestEvidence: VerifyImplementerTestEvidencePort;
  writeReviewerTestEvidenceArtifact: WriteReviewerTestEvidenceArtifactPort;
}> {
  reviewerTestEvidenceModulePromise ??= import(
    "../../defaults/reviewer/reviewerTestEvidenceDefaults.js"
  );
  return reviewerTestEvidenceModulePromise;
}

export async function resolveReviewerTestExecutionDirective(
  ...args: Parameters<ResolveReviewerTestExecutionDirectivePort>
): Promise<Awaited<ReturnType<ResolveReviewerTestExecutionDirectivePort>>> {
  const { resolveReviewerTestExecutionDirective } =
    await loadReviewerTestEvidenceModule();
  return resolveReviewerTestExecutionDirective(...args);
}

export async function resolveReviewerTestExecutionDirectiveFromArtifact(
  ...args: Parameters<ResolveReviewerTestExecutionDirectiveFromArtifactPort>
): Promise<
  Awaited<ReturnType<ResolveReviewerTestExecutionDirectiveFromArtifactPort>>
> {
  const { resolveReviewerTestExecutionDirectiveFromArtifact } =
    await loadReviewerTestEvidenceModule();
  return resolveReviewerTestExecutionDirectiveFromArtifact(...args);
}

export async function verifyImplementerTestEvidence(
  ...args: Parameters<VerifyImplementerTestEvidencePort>
): Promise<Awaited<ReturnType<VerifyImplementerTestEvidencePort>>> {
  const { verifyImplementerTestEvidence } =
    await loadReviewerTestEvidenceModule();
  return verifyImplementerTestEvidence(...args);
}

export async function writeReviewerTestEvidenceArtifact(
  ...args: Parameters<WriteReviewerTestEvidenceArtifactPort>
): Promise<Awaited<ReturnType<WriteReviewerTestEvidenceArtifactPort>>> {
  const { writeReviewerTestEvidenceArtifact } =
    await loadReviewerTestEvidenceModule();
  return writeReviewerTestEvidenceArtifact(...args);
}
