import React from "react";

interface LandingLayoutProps {
  navbarSlot: React.ReactNode;
  formSlot: React.ReactNode;
  featureGridSlot: React.ReactNode;
}

export function LandingLayout({
  navbarSlot,
  formSlot,
  featureGridSlot,
}: LandingLayoutProps) {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground selection:bg-indigo-500/30">
      {navbarSlot}

      {/* Hero Section */}
      <main className="relative flex-grow flex flex-col items-center justify-center overflow-hidden pt-24 sm:pt-32 pb-12">
        {/* Engineering Mesh Gradients */}
        <div className="absolute top-[-10%] left-[-10%] -z-10 h-[60%] w-[60%] rounded-full bg-indigo-500/10 blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] -z-10 h-[50%] w-[50%] rounded-full bg-purple-600/10 blur-[120px]"></div>
        <div className="absolute top-[20%] right-[10%] -z-10 h-[30%] w-[30%] rounded-full bg-emerald-500/5 blur-[100px]"></div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 text-center z-10 w-full">
          <div className="flex flex-col items-center gap-10 sm:gap-16 animate-in fade-in slide-in-from-bottom-8 duration-1000 w-full">
            <div className="flex flex-col items-center gap-4 sm:gap-6 w-full">
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/5 px-3 sm:px-4 py-1.5 sm:py-2 backdrop-blur-md">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                </span>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300">Fast-Track Agile v2.0</span>
              </div>
              
              <h1 className="text-4xl font-black tracking-tighter text-foreground sm:text-6xl lg:text-8xl leading-[0.95] sm:leading-[0.85] w-full px-2">
                Agile speed <br />
                <span className="bg-gradient-to-r from-indigo-500 via-emerald-500 to-indigo-500 dark:from-indigo-400 dark:via-emerald-400 dark:to-indigo-400 bg-clip-text text-transparent">redefined.</span>
              </h1>
              
              <p className="max-w-xl text-lg font-medium leading-relaxed text-zinc-500 dark:text-zinc-400 opacity-80">
                Eliminate friction. No signups, no seat limits. 
                Just pure collaborative engineering for elite teams.
              </p>
            </div>

            <div className="w-full max-w-lg relative z-50 glass p-2 rounded-[2.5rem] shadow-2xl">
              {formSlot}
            </div>

            <div id="feature-grid" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 w-full mt-16 sm:mt-24 px-2 sm:px-0">
              {featureGridSlot}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 dark:border-white/5 py-12">
        <div className="mx-auto max-w-7xl px-6 text-center text-sm text-zinc-500">
          © {new Date().getFullYear()} ScrumCollab. Built for high-performance agile teams.
        </div>
      </footer>
    </div>
  );
}
