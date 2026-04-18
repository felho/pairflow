import { describe, expect, it } from "vitest";

import { normalizeDeliveryAck } from "../../../../src/v11/shared/delivery/deliveryAckNormalization.js";

describe("normalizeDeliveryAck", () => {
  it("passes through canonical accepted acknowledgements", () => {
    expect(
      normalizeDeliveryAck({
        status: "accepted",
        message: "ok",
        sessionName: "pf_bubble",
        targetPaneIndex: 2
      })
    ).toEqual({
      status: "accepted",
      message: "ok",
      sessionName: "pf_bubble",
      targetPaneIndex: 2
    });
  });

  it("maps legacy delivered=true compat results to accepted", () => {
    expect(
      normalizeDeliveryAck({
        delivered: true,
        message: "legacy-ok",
        sessionName: "pf_bubble",
        targetPaneIndex: 3,
        deliveryTargetReasonCode: "DELIVERY_TARGET_ROLE_UNMAPPED"
      })
    ).toEqual({
      status: "accepted",
      message: "legacy-ok",
      sessionName: "pf_bubble",
      targetPaneIndex: 3,
      deliveryTargetReasonCode: "DELIVERY_TARGET_ROLE_UNMAPPED"
    });
  });

  it("fails closed when accepted compat results omit canonical target metadata", () => {
    expect(
      normalizeDeliveryAck({
        delivered: true,
        message: "legacy-ok-without-target"
      })
    ).toEqual({
      status: "rejected",
      message: "legacy-ok-without-target",
      reason: "tmux_send_failed",
      reason_code: "DELIVERY_ACK_REJECTED"
    });
  });

  it("fills canonical rejection defaults for legacy compat failures", () => {
    expect(
      normalizeDeliveryAck({
        delivered: false,
        message: "legacy-fail"
      })
    ).toEqual({
      status: "rejected",
      message: "legacy-fail",
      reason: "tmux_send_failed",
      reason_code: "DELIVERY_ACK_REJECTED"
    });
  });

  it("reconstructs canonical reason_code for compat runtime-session failures", () => {
    expect(
      normalizeDeliveryAck({
        delivered: false,
        message: "runtime-missing",
        reason: "no_runtime_session"
      })
    ).toEqual({
      status: "rejected",
      message: "runtime-missing",
      reason: "no_runtime_session",
      reason_code: "DELIVERY_ACK_RUNTIME_SESSION_UNAVAILABLE"
    });
  });

  it("reconstructs canonical reason_code for compat unsupported-target failures", () => {
    expect(
      normalizeDeliveryAck({
        status: "rejected",
        delivered: false,
        message: "unsupported",
        reason: "unsupported_recipient"
      })
    ).toEqual({
      status: "rejected",
      message: "unsupported",
      reason: "unsupported_recipient",
      reason_code: "DELIVERY_ACK_TARGET_UNSUPPORTED"
    });
  });

  it("defaults rejected status-first inputs without reason to tmux_send_failed", () => {
    expect(
      normalizeDeliveryAck({
        status: "rejected",
        delivered: false,
        message: "status-only-fail"
      })
    ).toEqual({
      status: "rejected",
      message: "status-only-fail",
      reason: "tmux_send_failed",
      reason_code: "DELIVERY_ACK_REJECTED"
    });
  });

  it("preserves explicit rejection metadata from compat-shaped inputs", () => {
    expect(
      normalizeDeliveryAck({
        status: "rejected",
        delivered: false,
        message: "compat-fail",
        reason: "delivery_unconfirmed",
        reason_code: "DELIVERY_ACK_REJECTED",
        sessionName: "pf_bubble",
        targetPaneIndex: 1
      })
    ).toEqual({
      status: "rejected",
      message: "compat-fail",
      reason: "delivery_unconfirmed",
      reason_code: "DELIVERY_ACK_REJECTED",
      sessionName: "pf_bubble",
      targetPaneIndex: 1
    });
  });
});
