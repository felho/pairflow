import { commitBubble } from "../bubble/commitBubble.js";
import { deleteBubble } from "../bubble/deleteBubble.js";
import { emitApprove, emitRequestRework } from "../human/approval.js";
import { emitHumanReply } from "../human/reply.js";
import { listBubbles } from "../bubble/listBubbles.js";
import { getBubbleStatus } from "../bubble/statusBubble.js";
import { mergeBubble } from "../bubble/mergeBubble.js";
import { openBubble } from "../bubble/openBubble.js";
import { restartBubble } from "../bubble/restartBubble.js";
import { resumeBubble } from "../bubble/resumeBubble.js";
import { startBubble } from "../bubble/startBubble.js";
import { stopBubble } from "../bubble/stopBubble.js";
import type { UiRouterDependencies } from "../../v11/shared/ports/uiRouter.js";

export const uiRouterDependencyDefaults = {
  commitBubble,
  deleteBubble,
  emitApprove,
  emitHumanReply,
  emitRequestRework,
  getBubbleStatus,
  listBubbles,
  mergeBubble,
  openBubble,
  restartBubble,
  resumeBubble,
  startBubble,
  stopBubble
} satisfies Pick<
  UiRouterDependencies,
  | "commitBubble"
  | "deleteBubble"
  | "emitApprove"
  | "emitHumanReply"
  | "emitRequestRework"
  | "getBubbleStatus"
  | "listBubbles"
  | "mergeBubble"
  | "openBubble"
  | "restartBubble"
  | "resumeBubble"
  | "startBubble"
  | "stopBubble"
>;
