const createBubbleDefaultsPromise = Promise.all([
  import("../../infrastructure/artifact/transcript/transcriptStore.js"),
  import("../../infrastructure/workspace/git.js")
]).then(([transcriptStore, git]) => ({
  appendProtocolEnvelope: transcriptStore.appendProtocolEnvelope,
  assertGitRepository: git.assertGitRepository
}));

export const createBubbleDefaults = await createBubbleDefaultsPromise;
