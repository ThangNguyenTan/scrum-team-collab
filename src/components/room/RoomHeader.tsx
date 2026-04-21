import { Zap, Copy, CheckCircle2, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { RoomUser } from "@/types";

interface RoomHeaderProps {
  roomId: string;
  activeTab: "planning" | "retro";
  handleTabSwitch: (tab: "planning" | "retro") => void;
  users: RoomUser[];
  copyToClipboard: (text: string, setFeedback: (v: boolean) => void) => void;
  idCopyFeedback: boolean;
  setIdCopyFeedback: (v: boolean) => void;
  inviteFeedback: boolean;
  setInviteFeedback: (v: boolean) => void;
  onLogoClick: () => void;
}

export function RoomHeader({
  roomId,
  activeTab,
  handleTabSwitch,
  users,
  copyToClipboard,
  idCopyFeedback,
  setIdCopyFeedback,
  inviteFeedback,
  setInviteFeedback,
  onLogoClick
}: RoomHeaderProps) {
  return (
    <header className="h-16 flex items-center justify-between px-3 sm:px-6 border-b border-white/5 bg-black/60 backdrop-blur-xl shrink-0 z-50">
      <div className="flex items-center gap-2 sm:gap-6">
        <div className="flex items-center gap-2 sm:gap-3 cursor-pointer group" onClick={onLogoClick}>
          <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.2)] transition-transform group-hover:scale-110">
             <Zap className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
          </div>
          <span className="font-black tracking-tighter text-sm sm:text-lg hidden md:block">SCRUM_COLLAB</span>
        </div>
        
        <div className="h-6 w-[1px] bg-white/10 hidden md:block"></div>
        
        <div className="hidden md:flex items-center gap-2 group">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Session ID:</span>
          <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-white/5 border border-white/5 transition-colors group-hover:border-white/10">
            <span className="text-xs font-mono text-zinc-400 group-hover:text-indigo-400 transition-colors uppercase">{roomId}</span>
            <button onClick={() => copyToClipboard(roomId, setIdCopyFeedback)} className="text-zinc-600 hover:text-white transition-colors">
              {idCopyFeedback ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <div className="flex p-0.5 sm:p-1 rounded-xl bg-white/5 border border-white/10 mr-1 sm:mr-4">
          <button 
            onClick={() => handleTabSwitch("planning")}
            className={cn(
              "px-4 py-1.5 rounded-lg text-sm font-bold transition-all",
              activeTab === "planning" ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            Planning
          </button>
          <button 
            onClick={() => handleTabSwitch("retro")}
            className={cn(
              "px-4 py-1.5 rounded-lg text-sm font-bold transition-all",
              activeTab === "retro" ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            Retro
          </button>
        </div>
        
        <div className="hidden sm:flex items-center gap-2 text-xs sm:text-base text-zinc-400 bg-white/5 px-2 sm:px-3 py-1.5 rounded-lg border border-white/5">
           <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
           {`${users.length} ${users.length <= 1 ? "Member" : "Members"}`}
        </div>
        
        <button 
          onClick={() => copyToClipboard(window.location.href, setInviteFeedback)}
          className={cn(
            "flex items-center gap-2 rounded-xl border px-3 sm:px-4 py-2 text-xs sm:text-base font-semibold transition-all active:scale-95",
            inviteFeedback 
              ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400" 
              : "bg-white/5 border-white/10 hover:bg-white/10 text-white"
          )}
        >
          {inviteFeedback ? (
            <>
              <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Copied!</span>
            </>
          ) : (
            <>
              <Share2 className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Invite</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
}
