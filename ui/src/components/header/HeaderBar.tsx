import type { ConnectionStatus, UiStateCounts } from "../../lib/types";
import { cn } from "../../lib/utils";

const primaryStates: Array<keyof UiStateCounts> = [
  "RUNNING",
  "WAITING_HUMAN",
  "READY_FOR_APPROVAL",
  "APPROVED_FOR_COMMIT",
  "FAILED",
  "DONE"
];

function statusLabel(status: ConnectionStatus): string {
  switch (status) {
    case "connected":
      return "SSE connected";
    case "connecting":
      return "Reconnecting...";
    case "fallback":
      return "Polling fallback";
    case "idle":
      return "Idle";
    default:
      return "Unknown";
  }
}

function statusTone(status: ConnectionStatus): string {
  switch (status) {
    case "connected":
      return "bg-emerald-500";
    case "connecting":
      return "bg-amber-400";
    case "fallback":
      return "bg-orange-500";
    case "idle":
      return "bg-slate-500";
    default:
      return "bg-slate-500";
  }
}

export interface HeaderBarProps {
  counts: UiStateCounts;
  repos: string[];
  selectedRepos: string[];
  connectionStatus: ConnectionStatus;
  onToggleRepo(repoPath: string): void;
}

function repoLabel(repoPath: string): string {
  const parts = repoPath.split(/[\\/]/u).filter((part) => part.length > 0);
  return parts[parts.length - 1] ?? repoPath;
}

export function HeaderBar(props: HeaderBarProps): JSX.Element {
  const total = Object.values(props.counts).reduce(
    (sum, value) => sum + value,
    0
  );

  return (
    <header className="sticky top-0 z-40 border-b border-slate-700/80 bg-slate-950/85 px-4 pb-4 pt-3 backdrop-blur">
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-slate-300">
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/90 px-3 py-1">
          <span className={cn("h-2.5 w-2.5 rounded-full", statusTone(props.connectionStatus))} />
          <span>{statusLabel(props.connectionStatus)}</span>
        </div>
        <div className="rounded-full border border-slate-700 bg-slate-900/90 px-3 py-1 font-medium text-slate-100">
          Total bubbles: {total}
        </div>
        {primaryStates.map((state) => (
          <div
            key={state}
            className="rounded-full border border-slate-700 bg-slate-900/90 px-3 py-1"
          >
            {state.replaceAll("_", " ")}: {props.counts[state]}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {props.repos.map((repoPath) => {
          const selected = props.selectedRepos.includes(repoPath);
          return (
            <button
              key={repoPath}
              type="button"
              aria-pressed={selected}
              onClick={() => {
                props.onToggleRepo(repoPath);
              }}
              className={cn(
                "rounded-full border px-3 py-1 text-xs transition",
                selected
                  ? "border-cyan-300 bg-cyan-300/20 text-cyan-100"
                  : "border-slate-700 bg-slate-900/60 text-slate-300 hover:border-slate-500 hover:text-slate-100"
              )}
              title={repoPath}
            >
              {repoLabel(repoPath)}
            </button>
          );
        })}
      </div>
    </header>
  );
}
