// The runtime consumes the same policy from src so build output can include it.
// This tools entrypoint remains the mechanical validator API used by hooks/tests.
export {
  classifyCommitMessage,
  type CommitMessagePolicyAcceptedClass,
  type CommitMessagePolicyAcceptedResult,
  type CommitMessagePolicyClass,
  type CommitMessagePolicyReasonCode,
  type CommitMessagePolicyRejectedClass,
  type CommitMessagePolicyRejectedResult,
  type CommitMessagePolicyResult
} from "../../src/v11/shared/commitPolicy/commitMessagePolicy.js";
