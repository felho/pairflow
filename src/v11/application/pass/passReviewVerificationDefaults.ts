import type {
  ResolveReviewVerificationInputFromRefsPort,
  WriteReviewVerificationArtifactAtomicPort
} from "../../shared/ports/reviewVerificationArtifacts.js";

interface ReviewVerificationArtifactDefaultsModule {
  resolveReviewVerificationInputFromRefs:
    ResolveReviewVerificationInputFromRefsPort;
  writeReviewVerificationArtifactAtomic:
    WriteReviewVerificationArtifactAtomicPort;
}

let reviewVerificationArtifactDefaultsModulePromise:
  | Promise<ReviewVerificationArtifactDefaultsModule>
  | undefined;

function getReviewVerificationArtifactDefaultsModulePath(): string {
  return "../../defaults/reviewer/reviewVerificationArtifactDefaults.js";
}

async function loadReviewVerificationArtifactDefaultsModule():
  Promise<ReviewVerificationArtifactDefaultsModule> {
  reviewVerificationArtifactDefaultsModulePromise ??= import(
    getReviewVerificationArtifactDefaultsModulePath()
  ) as Promise<ReviewVerificationArtifactDefaultsModule>;
  return reviewVerificationArtifactDefaultsModulePromise;
}

export const resolveReviewVerificationInputFromRefs:
  ResolveReviewVerificationInputFromRefsPort = async (...args) => {
    const {
      resolveReviewVerificationInputFromRefs:
        resolveReviewVerificationInputFromRefsDefault
    } = await loadReviewVerificationArtifactDefaultsModule();
    return resolveReviewVerificationInputFromRefsDefault(...args);
  };

export const writeReviewVerificationArtifactAtomic:
  WriteReviewVerificationArtifactAtomicPort = async (...args) => {
    const {
      writeReviewVerificationArtifactAtomic:
        writeReviewVerificationArtifactAtomicDefault
    } = await loadReviewVerificationArtifactDefaultsModule();
    return writeReviewVerificationArtifactAtomicDefault(...args);
  };
