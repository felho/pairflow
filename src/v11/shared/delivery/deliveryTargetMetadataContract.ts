export const deliveryTargetRoles = [
  "implementer",
  "reviewer",
  "meta_reviewer",
  "status"
] as const;

export type DeliveryTargetRole = (typeof deliveryTargetRoles)[number];

export const deliveryTargetRoleMetadataKey = "delivery_target_role" as const;

export type DeliveryTargetRoleMetadataParseResult =
  | {
      status: "absent";
    }
  | {
      status: "invalid";
      value: unknown;
    }
  | {
      status: "valid";
      role: DeliveryTargetRole;
    };

export function isDeliveryTargetRole(value: unknown): value is DeliveryTargetRole {
  return (
    typeof value === "string" &&
    (deliveryTargetRoles as readonly string[]).includes(value)
  );
}

export function parseDeliveryTargetRoleMetadata(
  metadata: unknown
): DeliveryTargetRoleMetadataParseResult {
  if (typeof metadata !== "object" || metadata === null) {
    return { status: "absent" };
  }
  const value =
    (metadata as Record<string, unknown>)[deliveryTargetRoleMetadataKey];
  if (value === undefined) {
    return { status: "absent" };
  }
  if (isDeliveryTargetRole(value)) {
    return {
      status: "valid",
      role: value
    };
  }
  return {
    status: "invalid",
    value
  };
}
