import { describe, expect, it } from "vitest";

import { mapPassResultDelivery } from "../../../../src/v11/application/pass/passResultDelivery.js";

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
          delivered: true,
          message: "ok"
        },
        deliveryRetried: false
      })
    ).toEqual({
      delivered: true,
      retried: false
    });
  });

  it("maps delivery result with reason and retry marker", () => {
    expect(
      mapPassResultDelivery({
        deliveryResult: {
          delivered: false,
          reason: "delivery_unconfirmed",
          message: "not confirmed"
        },
        deliveryRetried: true
      })
    ).toEqual({
      delivered: false,
      reason: "delivery_unconfirmed",
      retried: true
    });
  });
});
