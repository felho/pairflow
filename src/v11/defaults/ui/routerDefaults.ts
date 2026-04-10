import {
  emitApproveV11 as emitApprove,
  emitRequestReworkV11 as emitRequestRework
} from "../../application/approval/emitApprovalV11.js";
import { commitBubbleDependencyDefaults } from "../../application/commit/commitCommandDefaults.js";
import { commitBubbleV11 } from "../../application/commit/emitCommitV11.js";
import { deleteBubble } from "../../application/delete/deleteBubble.js";
import { mergeBubbleV11 as mergeBubble } from "../../application/merge/emitMergeV11.js";
import { openBubble } from "../../application/open/emitOpenV11.js";
import { restartBubble } from "../../application/restart/restartCommandApi.js";
import { emitHumanReplyV11 as emitHumanReply } from "../../application/reply/emitReplyV11.js";
import { resumeBubbleV11 as resumeBubble } from "../../application/resume/emitResumeV11.js";
import { startBubbleV11 as startBubble } from "../../application/start/emitStartV11.js";
import { getBubbleStatusV11 as getBubbleStatus } from "../../application/status/emitStatusV11.js";
import { stopBubbleV11 as stopBubble } from "../../application/stop/emitStopV11.js";
import { listBubbles } from "../../shared/list/listCommandApi.js";
import type { UiRouterDependencies } from "../../shared/ports/uiRouter.js";

export const uiRouterDependencyDefaults = {
  async commitBubble(input) {
    return commitBubbleV11(input, commitBubbleDependencyDefaults);
  },
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
