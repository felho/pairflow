export async function copyToClipboard(text: string): Promise<void> {
  if (typeof navigator === "undefined" || navigator.clipboard === undefined) {
    throw new Error("Clipboard API is not available in this environment.");
  }
  await navigator.clipboard.writeText(text);
}
