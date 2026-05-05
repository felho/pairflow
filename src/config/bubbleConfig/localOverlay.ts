import {
  DEFAULT_LOCAL_OVERLAY_ENABLED,
  DEFAULT_LOCAL_OVERLAY_ENTRIES,
  DEFAULT_LOCAL_OVERLAY_MODE
} from "../defaults.js";
import type { BubbleConfig } from "../../types/bubble.js";
import { isLocalOverlayMode } from "../../types/bubble.js";
import type { ValidationError } from "../../v11/shared/validation/primitives.js";
import { readBoolean, readStringArray } from "./readers.js";

function isSafeLocalOverlayEntry(value: string): boolean {
  const normalized = value.replaceAll("\\", "/");
  if (normalized.startsWith("/") || normalized.includes("//")) {
    return false;
  }
  const segments = normalized.split("/");
  return segments.every((segment) => segment.length > 0 && segment !== ".." && segment !== ".");
}

export function validateBubbleLocalOverlay(
  localOverlay: Record<string, unknown> | undefined,
  errors: ValidationError[]
): NonNullable<BubbleConfig["local_overlay"]> {
  const localOverlayEnabled = localOverlay
    ? (readBoolean(
        localOverlay,
        "enabled",
        "local_overlay.enabled",
        errors,
        false
      ) ?? DEFAULT_LOCAL_OVERLAY_ENABLED)
    : DEFAULT_LOCAL_OVERLAY_ENABLED;
  const localOverlayModeCandidate =
    localOverlay?.mode ?? DEFAULT_LOCAL_OVERLAY_MODE;
  if (!isLocalOverlayMode(localOverlayModeCandidate)) {
    errors.push({
      path: "local_overlay.mode",
      message: "Must be one of: symlink, copy"
    });
  }
  const localOverlayMode = isLocalOverlayMode(localOverlayModeCandidate)
    ? localOverlayModeCandidate
    : DEFAULT_LOCAL_OVERLAY_MODE;

  const localOverlayEntriesInput = localOverlay
    ? readStringArray(
        localOverlay,
        "entries",
        "local_overlay.entries",
        errors,
        false
      )
    : undefined;
  const localOverlayEntries =
    localOverlayEntriesInput === undefined
      ? [...DEFAULT_LOCAL_OVERLAY_ENTRIES]
      : localOverlayEntriesInput;
  for (const entry of localOverlayEntries) {
    if (!isSafeLocalOverlayEntry(entry)) {
      errors.push({
        path: "local_overlay.entries",
        message:
          "Entries must be normalized relative paths without '.'/'..' segments"
      });
    }
  }

  return {
    enabled: localOverlayEnabled,
    mode: localOverlayMode,
    entries: localOverlayEntries
  };
}
