const createBubbleDefaultsPromise = Promise.all([
  import("../../../core/protocol/transcriptStore.js"),
  import("../../../core/workspace/git.js")
]).then(([transcriptStore, git]) => ({
  appendProtocolEnvelope: transcriptStore.appendProtocolEnvelope,
  assertGitRepository: git.assertGitRepository
}));

export const createBubbleDefaults = await createBubbleDefaultsPromise;
