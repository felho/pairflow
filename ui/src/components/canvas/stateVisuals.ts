import type { BubbleLifecycleState } from "../../lib/types";

export interface StateVisual {
  led: string;
  border: string;
  cardTone: string;
  stateText: string;
}

export const stateVisuals: Record<BubbleLifecycleState, StateVisual> = {
  CREATED: {
    led: "bg-sky-300/80 shadow-[0_0_6px_rgba(148,163,184,0.4)]",
    border: "border-[#333]",
    cardTone: "",
    stateText: "text-sky-200"
  },
  PREPARING_WORKSPACE: {
    led: "bg-cyan-400 shadow-[0_0_6px_#06b6d4] animate-soft-pulse",
    border: "border-[#333]",
    cardTone: "",
    stateText: "text-cyan-200"
  },
  RUNNING: {
    led: "bg-blue-400 shadow-[0_0_6px_#3b82f6] animate-soft-pulse",
    border: "border-[#333]",
    cardTone: "",
    stateText: "text-blue-200"
  },
  WAITING_HUMAN: {
    led: "bg-amber-400 shadow-[0_0_6px_#f59e0b] animate-attention-pulse",
    border: "border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.15)]",
    cardTone: "",
    stateText: "text-amber-200"
  },
  READY_FOR_APPROVAL: {
    led: "bg-emerald-400 shadow-[0_0_6px_#22c55e]",
    border: "border-emerald-500 shadow-[0_0_20px_rgba(34,197,94,0.15)]",
    cardTone: "",
    stateText: "text-emerald-200"
  },
  APPROVED_FOR_COMMIT: {
    led: "bg-emerald-400 shadow-[0_0_6px_#22c55e]",
    border: "border-[#333]",
    cardTone: "",
    stateText: "text-emerald-200"
  },
  COMMITTED: {
    led: "bg-teal-300 shadow-[0_0_6px_#14b8a6] animate-soft-pulse",
    border: "border-[#333]",
    cardTone: "",
    stateText: "text-teal-200"
  },
  DONE: {
    led: "bg-slate-500",
    border: "border-[#333]",
    cardTone: "opacity-40",
    stateText: "text-slate-300"
  },
  FAILED: {
    led: "bg-rose-400 shadow-[0_0_6px_#ef4444]",
    border: "border-rose-500 shadow-[0_0_20px_rgba(239,68,68,0.12)]",
    cardTone: "",
    stateText: "text-rose-200"
  },
  CANCELLED: {
    led: "bg-slate-400 shadow-[0_0_6px_rgba(100,116,139,0.45)]",
    border: "border-slate-500 border-dashed",
    cardTone: "opacity-70",
    stateText: "text-slate-300"
  }
};
