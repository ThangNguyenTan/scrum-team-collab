import React from "react";

interface RoomLayoutProps {
  reactionOverlaySlot: React.ReactNode;
  headerSlot: React.ReactNode;
  sidebarSlot: React.ReactNode;
  contentSlot: React.ReactNode;
  joinModalSlot: React.ReactNode;
  reactionsPanelSlot: React.ReactNode;
  exportModalSlot: React.ReactNode;
  dialogSlot: React.ReactNode;
}

export function RoomLayout({
  reactionOverlaySlot,
  headerSlot,
  sidebarSlot,
  contentSlot,
  joinModalSlot,
  reactionsPanelSlot,
  exportModalSlot,
  dialogSlot,
}: RoomLayoutProps) {
  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden relative" suppressHydrationWarning>
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(67,56,202,0.08),transparent_50%)] pointer-events-none"></div>
      
      {/* Floating live reaction overlay */}
      {reactionOverlaySlot}
      
      {headerSlot}

      <div className="flex flex-1 overflow-hidden">
        {sidebarSlot}

        <main className="flex-1 bg-zinc-50/50 dark:bg-black/40 overflow-hidden relative">
          {contentSlot}
        </main>
      </div>

      {joinModalSlot}

      {/* Floating control dock for reactions & sounds */}
      {reactionsPanelSlot}

      {exportModalSlot}
      {dialogSlot}
    </div>
  );
}
