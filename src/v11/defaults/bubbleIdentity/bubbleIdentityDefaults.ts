import { ensureBubbleInstanceIdForMutation as ensureBubbleInstanceIdForMutationCanonical } from "../../infrastructure/artifact/bubble/bubbleInstanceId.js";
import type { EnsureBubbleInstanceIdForMutationPort } from "../../ports/bubbleIdentity.js";

export const ensureBubbleInstanceIdForMutation: EnsureBubbleInstanceIdForMutationPort =
  async (...args) => ensureBubbleInstanceIdForMutationCanonical(...args);
