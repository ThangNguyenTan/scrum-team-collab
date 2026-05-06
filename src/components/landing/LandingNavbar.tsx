import { Zap } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

export function LandingNavbar() {
  return (
    <nav className="fixed top-2 sm:top-6 left-2 sm:left-6 right-2 sm:right-6 z-50 flex items-center justify-center pointer-events-none">
      <div className="mx-auto flex h-12 sm:h-14 w-full max-w-7xl items-center justify-between px-4 sm:px-6 pointer-events-auto rounded-[1rem] sm:rounded-[1.25rem] border border-zinc-200/50 bg-white/40 dark:border-white/5 dark:bg-black/40 backdrop-blur-2xl shadow-xl dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-3">
          <div className="flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
            <Zap className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
          </div>
          <span className="text-base sm:text-lg font-black tracking-tighter text-zinc-900 dark:text-white">ScrumCollab</span>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-6">
          <div className="hidden sm:flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 bg-white/5 px-3 py-1.5 rounded-full border border-zinc-200 dark:border-white/5">
             Vibe: <span className="text-emerald-500">Tactical</span>
          </div>
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
