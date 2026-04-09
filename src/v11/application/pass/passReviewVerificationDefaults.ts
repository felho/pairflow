import type {
  ResolveReviewVerificationInputFromRefsPort,
  WriteReviewVerificationArtifactAtomicPort
} from "../../shared/ports/reviewVerificationArtifacts.js";

let reviewVerificationArtifactsModulePromise:
  | Promise<{
      resolveReviewVerificationInputFromRefs: ResolveReviewVerificationInputFromRefsPort;
      writeReviewVerificationArtifactAtomic: WriteReviewVerificationArtifactAtomicPort;
    }>
  | undefined;

async function loadReviewVerificationArtifactsModule(): Promise<{
  resolveReviewVerificationInputFromRefs: ResolveReviewVerificationInputFromRefsPort;
  writeReviewVerificationArtifactAtomic: WriteReviewVerificationArtifactAtomicPort;
}> {
  reviewVerificationArtifactsModulePromise ??= import(
    "../../../core/reviewer/reviewVerificationArtifacts.js"
  );
  return reviewVerificationArtifactsModulePromise;
}

export async function resolveReviewVerificationInputFromRefs(
  ...args: Parameters<ResolveReviewVerificationInputFromRefsPort>
): Promise<Awaited<ReturnType<ResolveReviewVerificationInputFromRefsPort>>> {
  const { resolveReviewVerificationInputFromRefs } =
    await loadReviewVerificationArtifactsModule();
  return resolveReviewVerificationInputFromRefs(...args);
}

export async function writeReviewVerificationArtifactAtomic(
  ...args: Parameters<WriteReviewVerificationArtifactAtomicPort>
): Promise<Awaited<ReturnType<WriteReviewVerificationArtifactAtomicPort>>> {
  const { writeReviewVerificationArtifactAtomic } =
    await loadReviewVerificationArtifactsModule();
  return writeReviewVerificationArtifactAtomic(...args);
}
