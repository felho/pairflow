import type { ConnectionStatus } from "../../lib/types";
import { cn } from "../../lib/utils";

function statusLabel(status: ConnectionStatus): string {
  switch (status) {
    case "connected":
      return "SSE connected";
    case "connecting":
      return "Reconnecting...";
    case "stale":
      return "Connection stale";
    case "fallback":
      return "Polling fallback";
    case "idle":
      return "Idle";
    default:
      return "Unknown";
  }
}

function statusDotClass(status: ConnectionStatus): string {
  switch (status) {
    case "connected":
      return "bg-emerald-500 shadow-[0_0_6px_#22c55e]";
    case "connecting":
      return "bg-amber-400";
    case "stale":
      return "bg-amber-400 animate-pulse";
    case "fallback":
      return "bg-orange-500";
    case "idle":
      return "bg-slate-500";
    default:
      return "bg-slate-500";
  }
}

export interface HeaderBarProps {
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
  return (
    <header className="sticky top-0 z-40 flex h-12 items-center justify-between border-b border-[#333] bg-gradient-to-b from-[#1a1a1a] to-[#0f0f0f] px-5">
      <div className="flex items-center gap-3">
        <span className="text-[15px] font-bold tracking-wide">
          <span className="text-blue-500">⬡</span> Pairflow
        </span>
        <span className="flex items-center gap-1.5 rounded-[10px] border border-[#2c2c2c] bg-[#131313] px-2 py-1 text-[10px] text-[#8f8f8f]">
          <span className={cn("inline-block h-1.5 w-1.5 rounded-full", statusDotClass(props.connectionStatus))} />
          {statusLabel(props.connectionStatus)}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex gap-1.5">
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
                  "rounded-[10px] border px-2 py-0.5 text-[10px] transition",
                  selected
                    ? "border-blue-500 bg-blue-500/10 text-blue-500"
                    : "border-[#333] bg-[#1a1a1a] text-[#aaa] hover:border-[#555] hover:text-white"
                )}
                title={repoPath}
              >
                {repoLabel(repoPath)}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
