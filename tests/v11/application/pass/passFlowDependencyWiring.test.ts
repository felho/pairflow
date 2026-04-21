import { afterEach, describe, expect, it, vi } from "vitest";

const buildAutoConvergeFlowDependencies = vi.fn();
const buildNormalPassFlowDependencies = vi.fn();

vi.mock(
  "../../../../src/v11/application/pass/autoConvergeFlowInvocationBuilders.js",
  () => ({
    buildAutoConvergeFlowDependencies
  })
);

vi.mock(
  "../../../../src/v11/application/pass/normalPassFlowInvocationBuilders.js",
  () => ({
    buildNormalPassFlowDependencies
  })
);

describe("passFlowDependencyWiring", () => {
  afterEach(() => {
    buildAutoConvergeFlowDependencies.mockReset();
    buildNormalPassFlowDependencies.mockReset();
    vi.resetModules();
  });

  it("forwards canonical delivery override into normal pass flow wiring", async () => {
    buildNormalPassFlowDependencies.mockReturnValue({ kind: "normal-deps" });

    const { createNormalPassFlowDependencies } = await import(
      "../../../../src/v11/application/pass/passFlowDependencyWiring.js"
    );

    const emitDeliveryNotificationAck = (() => undefined) as never;
    const result = createNormalPassFlowDependencies({
      emitDeliveryNotificationAck
    });

    expect(result).toEqual({ kind: "normal-deps" });
    expect(buildNormalPassFlowDependencies).toHaveBeenCalledTimes(1);
    expect(buildNormalPassFlowDependencies.mock.calls[0]?.[0]).toMatchObject({
      emitDeliveryNotificationAck
    });
  });

  it("forwards canonical delivery override into auto-converge flow wiring", async () => {
    buildAutoConvergeFlowDependencies.mockReturnValue({ kind: "auto-deps" });

    const { createAutoConvergeFlowDependencies } = await import(
      "../../../../src/v11/application/pass/passFlowDependencyWiring.js"
    );

    const emitDeliveryNotificationAck = (() => undefined) as never;
    const result = createAutoConvergeFlowDependencies({
      emitDeliveryNotificationAck
    });

    expect(result).toEqual({ kind: "auto-deps" });
    expect(buildAutoConvergeFlowDependencies).toHaveBeenCalledTimes(1);
    expect(buildAutoConvergeFlowDependencies.mock.calls[0]?.[0]).toMatchObject({
      emitDeliveryNotificationAck
    });
  });

  it("keeps the legacy delivery override wired as a compatibility alias", async () => {
    buildNormalPassFlowDependencies.mockReturnValue({ kind: "normal-deps" });

    const { createNormalPassFlowDependencies } = await import(
      "../../../../src/v11/application/pass/passFlowDependencyWiring.js"
    );

    const emitTmuxDeliveryNotification = (() => undefined) as never;
    createNormalPassFlowDependencies({
      emitTmuxDeliveryNotification
    });

    expect(buildNormalPassFlowDependencies.mock.calls[0]?.[0]).toMatchObject({
      emitDeliveryNotificationAck: emitTmuxDeliveryNotification
    });
    expect(buildNormalPassFlowDependencies.mock.calls[0]?.[0]).not.toHaveProperty(
      "emitTmuxDeliveryNotification"
    );
  });

  it("prefers the canonical delivery override when both pass wiring keys are provided", async () => {
    buildAutoConvergeFlowDependencies.mockReturnValue({ kind: "auto-deps" });

    const { createAutoConvergeFlowDependencies } = await import(
      "../../../../src/v11/application/pass/passFlowDependencyWiring.js"
    );

    const emitDeliveryNotificationAck = (() => undefined) as never;
    const emitTmuxDeliveryNotification = (() => undefined) as never;

    createAutoConvergeFlowDependencies({
      emitDeliveryNotificationAck,
      emitTmuxDeliveryNotification
    });

    expect(buildAutoConvergeFlowDependencies.mock.calls[0]?.[0]).toMatchObject({
      emitDeliveryNotificationAck
    });
    expect(buildAutoConvergeFlowDependencies.mock.calls[0]?.[0]).not.toHaveProperty(
      "emitTmuxDeliveryNotification"
    );
  });
});
