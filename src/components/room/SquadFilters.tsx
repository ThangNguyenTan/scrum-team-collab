import React from "react";
import { cn } from "@/lib/utils";

interface SquadFiltersProps {
  groups: string[];
  activeGroup: string | null;
  onSelectGroup: (group: string | null) => void;
}

export function SquadFilters({ groups, activeGroup, onSelectGroup }: SquadFiltersProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar no-scrollbar scroll-smooth">
      <button
        onClick={() => onSelectGroup(null)}
        className={cn(
          "px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all shrink-0 whitespace-nowrap border",
          !activeGroup
            ? "bg-zinc-900 text-white dark:bg-white dark:text-black border-zinc-900 dark:border-white shadow-lg"
            : "bg-zinc-100 text-zinc-500 border-zinc-200 hover:bg-zinc-200 dark:bg-white/5 dark:text-zinc-500 dark:border-white/5 dark:hover:bg-white/10"
        )}
      >
        All Squads
      </button>
      {groups.map((g) => (
        <button
          key={g}
          onClick={() => onSelectGroup(g === activeGroup ? null : g)}
          className={cn(
            "px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all shrink-0 whitespace-nowrap border",
            activeGroup === g
              ? "bg-indigo-500 text-white border-indigo-400 shadow-lg shadow-indigo-500/20"
              : "bg-zinc-100 text-zinc-500 border-zinc-200 hover:bg-zinc-200 dark:bg-white/5 dark:text-zinc-500 dark:border-white/5 dark:hover:bg-white/10"
          )}
        >
          {g}
        </button>
      ))}
    </div>
  );
}
