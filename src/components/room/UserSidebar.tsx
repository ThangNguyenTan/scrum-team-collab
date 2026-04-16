import { Users, Crown, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { RoomData, RoomUser } from "@/types";

interface UserSidebarProps {
  sortedUsers: RoomUser[];
  room: RoomData | null;
  user: any; // User | null
}

export function UserSidebar({ sortedUsers, room, user }: UserSidebarProps) {
  return (
    <aside className="w-80 border-r border-white/5 bg-[#050505]/40 flex flex-col hidden lg:flex shrink-0">
      <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0 bg-white/[0.01]">
        <div className="flex items-center gap-2">
          <Users className="h-3.5 w-3.5 text-zinc-500" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Live Squad</span>
        </div>
        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-1.5 custom-scrollbar">
        {sortedUsers.map(u => (
          <div key={u.id} className="flex items-center justify-between group/u p-3 rounded-2xl hover:bg-white/[0.03] border border-transparent hover:border-white/5 transition-all duration-300">
            <div className="flex items-center gap-3">
              <div className={cn(
                "h-9 w-9 rounded-xl border flex items-center justify-center font-black text-xs relative overflow-hidden transition-transform group-hover/u:scale-105",
                u.id === room?.creatorId 
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-500" 
                  : "bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
              )}>
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/u:opacity-100 transition-opacity"></div>
                {u.id === room?.creatorId ? <Crown className="h-4 w-4" /> : (
                  u.avatar ? <span className="text-xl">{u.avatar}</span> : u.name.charAt(0).toUpperCase()
                )}
              </div>
              <div className="flex flex-col min-w-0">
                <span className={cn("text-sm font-bold truncate tracking-tight transition-colors", u.id === user?.uid ? "text-white" : "text-zinc-400 group-hover/u:text-zinc-200")}>
                  {u.name} {u.id === user?.uid && "(YOU)"}
                </span>
                <div className="flex items-center gap-2">
                   <span className="text-[9px] font-mono text-zinc-600">ID:{u.id.slice(0, 4)}</span>
                   {u.id === room?.creatorId && (
                     <span className="text-[8px] font-black uppercase tracking-widest text-amber-500 opacity-60">Host</span>
                   )}
                </div>
              </div>
            </div>
            {u.vote && room?.status === "planning" ? (
               <div className="h-6 w-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
               </div>
            ) : (
              <div className="h-1.2 w-1.2 rounded-full bg-white/5 group-hover/u:bg-white/20 transition-colors"></div>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
}
