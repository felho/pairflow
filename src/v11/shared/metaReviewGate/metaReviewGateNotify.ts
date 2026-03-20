import { maybeAcceptClaudeTrustPrompt, sendAndSubmitTmuxPaneMessage } from "../../../core/runtime/tmuxInput.js";
import { runTmux } from "../../../core/runtime/tmuxManager.js";
import type {
  NotifyMetaReviewerSubmissionRequestDependencies,
  NotifyMetaReviewerSubmissionRequestInput
} from "./metaReviewGateTypes.js";

export async function notifyMetaReviewerSubmissionRequest(
  input: NotifyMetaReviewerSubmissionRequestInput,
  dependencies: NotifyMetaReviewerSubmissionRequestDependencies = {}
): Promise<void> {
  const runner = dependencies.runTmux ?? runTmux;
  const message = [
    `# [pairflow] bubble=${input.bubbleId} meta-review request round=${input.round}.`,
    "Perform autonomous meta-review now, then submit through structured Pairflow CLI (no pane markers).",
    `Required command: pairflow bubble meta-review submit --id ${input.bubbleId} --round ${input.round} --recommendation <approve|rework|inconclusive> --summary "<summary>" --report-markdown "<markdown>" [--rework-target-message "<message>"] [--report-json '{"findings_claim_state":"clean|open_findings|unknown","findings_claim_source":"meta_review_artifact","findings_count":<int>,"findings_artifact_ref":"artifacts/...","meta_review_run_id":"<run-id>","findings_digest_sha256":"<sha256>","findings_artifact_status":"available"}'].`
  ].join(" ");

  await maybeAcceptClaudeTrustPrompt(runner, input.targetPane).catch(() => undefined);
  await sendAndSubmitTmuxPaneMessage(runner, input.targetPane, message);
}
