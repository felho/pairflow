import type { UiEvent } from "../../../contracts/ui/uiEvents.js";

export interface UiEventFilter {
  repos?: Set<string> | undefined;
  bubbleId?: string | undefined;
}

export function createFilter(
  input: { repos?: string[] | undefined; bubbleId?: string | undefined } = {}
): UiEventFilter {
  return {
    ...(input.repos !== undefined ? { repos: new Set(input.repos) } : {}),
    ...(input.bubbleId !== undefined ? { bubbleId: input.bubbleId } : {})
  };
}

export function eventMatchesFilter(event: UiEvent, filter: UiEventFilter): boolean {
  if (event.type === "snapshot") {
    if (
      filter.repos !== undefined &&
      !event.repos.some((repo) => filter.repos?.has(repo.repoPath) ?? false)
    ) {
      return false;
    }
    if (
      filter.bubbleId !== undefined &&
      !event.bubbles.some((bubble) => bubble.bubbleId === filter.bubbleId)
    ) {
      return false;
    }
    return true;
  }

  if (filter.repos !== undefined && !filter.repos.has(event.repoPath)) {
    return false;
  }

  if (filter.bubbleId !== undefined) {
    if (event.type === "bubble.updated" || event.type === "bubble.removed") {
      return event.bubbleId === filter.bubbleId;
    }
    return false;
  }

  return true;
}
