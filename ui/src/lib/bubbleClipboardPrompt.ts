import type { BubbleCardModel } from "./types";

const codeBubbleClosePrompt =
  "approve and close the bubble and then delete it if the merge was successful";

const documentBubbleClosePrompt =
  `${codeBubbleClosePrompt}, and then start the implementation bubble for the task subject of this doc refinement bubble`;

export function buildBubbleClipboardPrompt(
  bubble: Pick<BubbleCardModel, "bubbleId" | "reviewArtifactType">
): string {
  const instruction =
    bubble.reviewArtifactType === "document"
      ? documentBubbleClosePrompt
      : codeBubbleClosePrompt;
  return `${bubble.bubbleId}: ${instruction}`;
}
