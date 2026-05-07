import type {
  ProtocolEnvelopePayload,
  ProtocolMessageType
} from "../../../../types/protocol.js";
import type {
  UiTimelineBadge,
  UiTimelineDisplayRole,
  UiTimelineProgress,
  UiTimelineRowKind,
  UiTimelineSummarySource,
  UiTimelineSyntheticApproval,
  UiTimelineTone,
  UiTimelineValidationFailure
} from "../../../../contracts/ui/uiReadModel.js";

type TimelineFindingPriority = "P0" | "P1" | "P2" | "P3";

export interface TimelineEntryDisplay {
  title: string;
  summaryText: string;
  summarySource: UiTimelineSummarySource;
  senderLabel: string;
  role: UiTimelineDisplayRole;
  rowKind: UiTimelineRowKind;
  tone: UiTimelineTone;
  badges: UiTimelineBadge[];
  progress: UiTimelineProgress | null;
  validationFailure: UiTimelineValidationFailure | null;
  syntheticApproval: UiTimelineSyntheticApproval | null;
}

export interface TimelineEntryPayload {
  summary?: string;
  question?: string;
  message?: string;
  decision?: "approve" | "rework";
  pass_intent?: "task" | "review" | "fix_request";
  findings_claim_state?: "clean" | "open_findings" | "unknown";
  findings_claim_source?:
    | "payload_flags"
    | "payload_findings_count"
    | "legacy_summary_parser"
    | "meta_review_artifact";
  findings?: TimelineFinding[];
}

interface TimelineFindingBase {
  title: string;
  timing?: "required-now" | "later-hardening";
  layer?: "L0" | "L1" | "L2";
  evidence?: string | string[];
  detail?: string;
  code?: string;
  refs?: string[];
}

export type TimelineFinding = TimelineFindingBase & (
  | {
      priority: TimelineFindingPriority;
      severity?: TimelineFindingPriority;
      effective_priority?: TimelineFindingPriority;
    }
  | {
      priority?: TimelineFindingPriority;
      severity: TimelineFindingPriority;
      effective_priority?: TimelineFindingPriority;
    }
  | {
      priority?: TimelineFindingPriority;
      severity?: TimelineFindingPriority;
      effective_priority: TimelineFindingPriority;
    }
);

export interface TimelineEntryWithoutDisplay {
  id: string;
  ts: string;
  round: number;
  type: ProtocolMessageType;
  sender: string;
  recipient: string;
  payload: ProtocolEnvelopePayload;
  refs: string[];
}

export type TimelineEntryWithDisplay =
  TimelineEntryWithoutDisplay & { display: TimelineEntryDisplay };

export interface PresentedTimelineEntry {
  id: string;
  ts: string;
  round: number;
  type: ProtocolMessageType;
  sender: string;
  recipient: string;
  display: TimelineEntryDisplay;
  payload: TimelineEntryPayload;
  refs: string[];
}
