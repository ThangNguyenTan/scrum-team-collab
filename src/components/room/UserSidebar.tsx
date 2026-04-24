import { useState } from "react";
import { Users, Crown, CheckCircle2, ChevronLeft, ChevronRight, Settings, UserMinus, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { RoomData, RoomUser } from "@/types";
import { User } from "firebase/auth";

interface UserSidebarProps {
  sortedUsers: RoomUser[];
  room: RoomData | null;
  user: User | null;
  setShowJoinModal: (show: boolean) => void;
  isAdmin: boolean;
  onKickUser: (userId: string) => void;
  onTransferHost: (targetUser: RoomUser) => void;
}

export function UserSidebar({ 
  sortedUsers, 
  room, 
  user, 
  setShowJoinModal, 
  isAdmin, 
  onKickUser, 
  onTransferHost 
}: UserSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);

  return (
    <aside className={cn(
      "border-r border-white/5 bg-[#050505]/40 flex flex-col hidden lg:flex shrink-0 transition-all duration-300 relative",
      isCollapsed ? "w-20" : "w-64 xl:w-72"
    )}>
      {/* Toggle Button */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3.5 top-6 bg-zinc-900 border-white/10 border text-zinc-400 p-1.5 rounded-full z-20 hover:text-white hover:bg-zinc-800 transition-colors shadow-lg"
      >
        {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>

      <div className={cn(
        "p-6 border-b border-white/5 flex items-center shrink-0 bg-white/[0.01] overflow-hidden transition-all",
        isCollapsed ? "justify-center px-0" : "justify-between"
      )}>
        <div className="flex items-center gap-2">
          <Users className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
          {!isCollapsed && <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 whitespace-nowrap">Live Squad</span>}
        </div>
        {!isCollapsed && <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)] shrink-0"></div>}
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-1.5 custom-scrollbar overflow-x-hidden">
        {sortedUsers.map(u => (
          <div key={u.id} className={cn(
            "flex items-center group/u rounded-2xl hover:bg-white/[0.03] border border-transparent hover:border-white/5 transition-all duration-300 relative",
            isCollapsed ? "justify-center p-2 mb-2" : "justify-between p-3"
          )}>
            <div className={cn("flex items-center gap-3", isCollapsed && "justify-center")}>
              <div 
                title={isCollapsed ? u.name : undefined}
                className={cn(
                "h-9 w-9 rounded-xl border flex items-center justify-center font-black text-xs relative overflow-hidden transition-transform group-hover/u:scale-105 shrink-0",
                u.id === room?.creatorId 
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-500" 
                  : "bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
              )}>
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/u:opacity-100 transition-opacity"></div>
                {u.id === room?.creatorId && !u.avatar ? <Crown className="h-4 w-4" /> : (
                  u.avatar ? <span className="text-xl">{u.avatar}</span> : u.name.charAt(0).toUpperCase()
                )}
                
                {/* Minimized view indicator for Host */}
                {isCollapsed && u.id === room?.creatorId && (
                  <div className="absolute -bottom-1 -right-1 bg-[#050505] rounded-full p-0.5">
                    <Crown className="h-2 w-2 text-amber-500" />
                  </div>
                )}
              </div>
              
              {!isCollapsed && (
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={cn("text-sm font-bold truncate tracking-tight transition-colors", u.id === user?.uid ? "text-white" : "text-zinc-400 group-hover/u:text-zinc-200")}>
                      {u.name} {u.id === user?.uid && "(YOU)"}
                    </span>
                    {u.id === user?.uid && (
                      <button 
                        onClick={() => setShowJoinModal(true)}
                        className="opacity-0 group-hover/u:opacity-100 p-1 rounded-md hover:bg-white/10 text-zinc-500 hover:text-white transition-all"
                        title="Edit Name/Emoji"
                      >
                        <Settings className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono text-zinc-600">ID:{u.id.slice(0, 4)}</span>
                    {u.group && (
                      <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-white/5 border border-white/5 text-zinc-500 uppercase tracking-tighter">
                        {u.group}
                      </span>
                    )}
                    {u.id === room?.creatorId && (
                      <span className="text-[8px] font-black uppercase tracking-widest text-amber-500 opacity-60 flex items-center gap-0.5">
                        <Crown className="h-2 w-2" />
                        Host
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {!isCollapsed && (
              <div className="flex items-center gap-1">
                {isAdmin && u.id !== user?.uid && (
                  <div className="flex items-center gap-1 opacity-0 group-hover/u:opacity-100 transition-opacity">
                    <button
                      onClick={() => onTransferHost(u)}
                      className="p-1.5 rounded-lg hover:bg-amber-500/10 text-zinc-500 hover:text-amber-500 transition-all"
                      title="Transfer Host"
                    >
                      <ShieldCheck className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => onKickUser(u.id)}
                      className="p-1.5 rounded-lg hover:bg-rose-500/10 text-zinc-500 hover:text-rose-400 transition-all"
                      title="Remove User"
                    >
                      <UserMinus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
                {u.vote && room?.status === "planning" ? (
                   <div className="h-6 w-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                   </div>
                ) : (
                  <div className="h-1.2 w-1.2 rounded-full bg-white/5 group-hover/u:bg-white/20 transition-colors shrink-0"></div>
                )}
              </div>
            )}

            {isCollapsed && u.vote && room?.status === "planning" && (
                <div className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-[#050505] shadow-[0_0_8px_rgba(16,185,129,0.8)] z-10"></div>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
}
