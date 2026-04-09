import { commitBubble } from "../bubble/commitBubble.js";
import { deleteBubble } from "../../v11/application/delete/deleteBubble.js";
import {
  emitApproveV11 as emitApprove,
  emitRequestReworkV11 as emitRequestRework
} from "../../v11/application/approval/emitApprovalV11.js";
import { emitHumanReplyV11 as emitHumanReply } from "../../v11/application/reply/emitReplyV11.js";
import { listBubbles } from "../bubble/listBubbles.js";
import { getBubbleStatusV11 as getBubbleStatus } from "../../v11/application/status/emitStatusV11.js";
import { mergeBubbleV11 as mergeBubble } from "../../v11/application/merge/emitMergeV11.js";
import { openBubble } from "../../v11/application/open/emitOpenV11.js";
import { restartBubble } from "../../v11/application/restart/restartCommandApi.js";
import { resumeBubbleV11 as resumeBubble } from "../../v11/application/resume/emitResumeV11.js";
import { startBubbleV11 as startBubble } from "../../v11/application/start/emitStartV11.js";
import { stopBubbleV11 as stopBubble } from "../../v11/application/stop/emitStopV11.js";
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
