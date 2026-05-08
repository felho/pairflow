export const attachLaunchers = [
  "auto",
  "warp",
  "iterm2",
  "terminal",
  "ghostty",
  "copy"
] as const;

export type AttachLauncher = (typeof attachLaunchers)[number];

export function isAttachLauncher(value: unknown): value is AttachLauncher {
  return (
    typeof value === "string" &&
    (attachLaunchers as readonly string[]).includes(value)
  );
}
