import { Zap } from "lucide-react";

export function LandingNavbar() {
  return (
    <nav className="fixed top-6 left-6 right-6 z-50 flex items-center justify-center pointer-events-none">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-6 pointer-events-auto rounded-[1.25rem] border border-white/5 bg-black/40 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-black tracking-tighter text-white">ScrumCollab</span>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="hidden sm:flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
             Vibe: <span className="text-emerald-500">Tactical</span>
          </div>
        </div>
      </div>
    </nav>
  );
}
