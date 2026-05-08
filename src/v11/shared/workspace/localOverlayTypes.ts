export const localOverlayModes = ["symlink", "copy"] as const;

export type LocalOverlayMode = (typeof localOverlayModes)[number];

export interface BubbleLocalOverlayConfig {
  enabled: boolean;
  mode: LocalOverlayMode;
  entries: string[];
}

export function isLocalOverlayMode(value: unknown): value is LocalOverlayMode {
  return (
    typeof value === "string" &&
    (localOverlayModes as readonly string[]).includes(value)
  );
}
