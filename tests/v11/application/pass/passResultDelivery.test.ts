import { describe, expect, it } from "vitest";

import { mapPassResultDelivery } from "../../../../src/v11/application/pass/internal/normalPass/passResultDelivery.js";

describe("mapPassResultDelivery", () => {
  it("returns undefined when delivery result is absent", () => {
    expect(
      mapPassResultDelivery({
        deliveryResult: undefined,
        deliveryRetried: false
      })
    ).toBeUndefined();
  });

  it("maps delivery result without reason", () => {
    expect(
      mapPassResultDelivery({
        deliveryResult: {
          status: "accepted",
          message: "ok",
          sessionName: "pf_bubble",
          targetPaneIndex: 1
        },
        deliveryRetried: false
      })
    ).toEqual({
      status: "accepted",
      retried: false
    });
  });

  it("maps delivery result with reason and retry marker", () => {
    expect(
      mapPassResultDelivery({
        deliveryResult: {
          status: "rejected",
          reason: "delivery_unconfirmed",
          reason_code: "DELIVERY_ACK_REJECTED",
          message: "not confirmed"
        },
        deliveryRetried: true
      })
    ).toEqual({
      status: "rejected",
      reason: "delivery_unconfirmed",
      reason_code: "DELIVERY_ACK_REJECTED",
      retried: true
    });
  });
});
