import type {
  ApplyMetaReviewGateOnConvergenceDependencies
} from "../../shared/metaReviewGate/index.js";
import type {
  MetaReviewGateNotifyRuntimeCapabilities,
  MetaReviewGatePaneBindingRuntimeCapabilities
} from "../../shared/metaReviewGate/index.js";

export interface MetaReviewGateDependencyDefaults {
  appendProtocolEnvelope:
    NonNullable<ApplyMetaReviewGateOnConvergenceDependencies["appendProtocolEnvelope"]>;
  readFile: NonNullable<ApplyMetaReviewGateOnConvergenceDependencies["readFile"]>;
  readTranscriptEnvelopes:
    NonNullable<ApplyMetaReviewGateOnConvergenceDependencies["readTranscriptEnvelopes"]>;
  readStateSnapshot:
    NonNullable<ApplyMetaReviewGateOnConvergenceDependencies["readStateSnapshot"]>;
  resolveBubbleById:
    NonNullable<ApplyMetaReviewGateOnConvergenceDependencies["resolveBubbleById"]>;
  setMetaReviewerPaneBinding:
    NonNullable<
      ApplyMetaReviewGateOnConvergenceDependencies["setMetaReviewerPaneBinding"]
    >;
  runtime: {
    notify: {
      tmux: {
        runner:
        NonNullable<
          NonNullable<MetaReviewGateNotifyRuntimeCapabilities["tmux"]>["runner"]
        >;
        maybeAcceptTrustPrompt:
        NonNullable<
          NonNullable<
            MetaReviewGateNotifyRuntimeCapabilities["tmux"]
          >["maybeAcceptTrustPrompt"]
        >;
        sendSubmissionRequestMessage:
          NonNullable<
            NonNullable<
              MetaReviewGateNotifyRuntimeCapabilities["tmux"]
            >["sendSubmissionRequestMessage"]
          >;
        submitPaneInput:
          NonNullable<
            NonNullable<
              MetaReviewGateNotifyRuntimeCapabilities["tmux"]
            >["submitPaneInput"]
          >;
      };
    };
    paneBinding: {
      buildAgentCommand:
        NonNullable<MetaReviewGatePaneBindingRuntimeCapabilities["buildAgentCommand"]>;
      tmux: {
        runner:
          NonNullable<
            NonNullable<
              MetaReviewGatePaneBindingRuntimeCapabilities["tmux"]
            >["runner"]
          >;
        respawnPaneCommand:
          NonNullable<
            NonNullable<
              MetaReviewGatePaneBindingRuntimeCapabilities["tmux"]
            >["respawnPaneCommand"]
          >;
      };
    };
  };
  writeStateSnapshot:
    NonNullable<ApplyMetaReviewGateOnConvergenceDependencies["writeStateSnapshot"]>;
}
