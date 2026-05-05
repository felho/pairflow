import {
  ensureBubbleInstanceIdForMutation as ensureBubbleInstanceIdForMutationDefaults
} from "../../defaults/bubbleIdentity/bubbleIdentityDefaults.js";
import type { EnsureBubbleInstanceIdForMutationPort } from "../ports/bubbleIdentity.js";

export const ensureBubbleInstanceIdForMutation:
  EnsureBubbleInstanceIdForMutationPort =
    async (...args) => ensureBubbleInstanceIdForMutationDefaults(...args);
