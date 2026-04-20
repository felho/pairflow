import type { UiBubbleSummary } from "../../lib/types";
import { cn } from "../../lib/utils";

interface RemoteBubbleIndicatorProps {
  remoteExecution?: UiBubbleSummary["remoteExecution"];
  className?: string;
}

function remoteBubbleLabel(
  remoteExecution: NonNullable<UiBubbleSummary["remoteExecution"]>
): string {
  const alias = remoteExecution.alias.trim();
  const host = remoteExecution.host.trim();

  if (alias.length > 0 && host.length > 0) {
    return `Remote bubble on ${alias} (${host})`;
  }
  if (alias.length > 0) {
    return `Remote bubble on ${alias}`;
  }
  if (host.length > 0) {
    return `Remote bubble on ${host}`;
  }
  return "Remote bubble";
}

export function RemoteBubbleIndicator(
  props: RemoteBubbleIndicatorProps
): JSX.Element | null {
  if (props.remoteExecution === undefined) {
    return null;
  }

  const label = remoteBubbleLabel(props.remoteExecution);

  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      data-testid="remote-bubble-indicator"
      className={cn(
        "inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border border-sky-400/35 bg-sky-400/10 text-sky-300",
        props.className
      )}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-3 w-3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="2.75" y="3.75" width="18.5" height="6.5" rx="1.75" />
        <rect x="2.75" y="13.75" width="18.5" height="6.5" rx="1.75" />
        <path d="M7 7h.01" />
        <path d="M7 17h.01" />
        <path d="M12 7h5" />
        <path d="M12 17h5" />
      </svg>
    </span>
  );
}
