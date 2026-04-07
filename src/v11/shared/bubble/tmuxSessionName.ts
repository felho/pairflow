import { createHash } from "node:crypto";

function normalizeSessionComponent(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/gu, "-").replace(/-+/gu, "-");
}

export function buildBubbleTmuxSessionName(bubbleId: string): string {
  const maxSessionNameLength = 32;
  const sessionPrefix = "pf-";
  const normalized = normalizeSessionComponent(bubbleId.trim());
  if (normalized.length === 0) {
    throw new Error("Bubble id cannot be empty for tmux session naming.");
  }

  const directName = `${sessionPrefix}${normalized}`;
  if (directName.length <= maxSessionNameLength) {
    return directName;
  }

  const hashSuffix = createHash("sha1")
    .update(normalized)
    .digest("hex")
    .slice(0, 8);
  const headMaxLength = maxSessionNameLength - sessionPrefix.length - 1 - hashSuffix.length;
  const head = normalized.slice(0, Math.max(1, headMaxLength)).replace(/-+$/gu, "");
  return `${sessionPrefix}${head}-${hashSuffix}`;
}
