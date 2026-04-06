// Legacy shim kept for core/UI consumers while the canonical list read-model
// contract and runtime live under `src/v11/application/list/**`.
export {
  asBubbleListErrorV11 as asBubbleListError,
  BubbleListErrorV11 as BubbleListError,
  listBubblesV11 as listBubbles
} from "../../v11/application/list/emitListV11.js";
export type {
  BubbleListV11Entry as BubbleListEntry,
  BubbleListV11Input as BubbleListInput,
  BubbleListV11StateCounts as BubbleListStateCounts,
  BubbleListV11View as BubbleListView
} from "../../v11/application/list/emitListV11.js";
