import { useMemo } from "react";
import { doc, updateDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Coffee, Zap, RefreshCw, EyeOff, Eye, CheckCircle2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { RoomData, RoomUser } from "@/types";
import { PLANNING_CARDS } from "@/constants";

interface PlanningBoardProps {
  room: RoomData;
  roomId: string;
  users: RoomUser[];
  isAdmin: boolean;
  currentUserId: string;
}

export function PlanningBoard({ room, roomId, users, isAdmin, currentUserId }: PlanningBoardProps) {
  if (!room) return null;
  const cards = PLANNING_CARDS;
  const myVote = users.find((u) => u.id === currentUserId)?.vote;
  const allVoted = users.length > 0 && users.every((u) => u.vote);

  const handleVote = async (value: string) => {
    if (!currentUserId || room.revealed) return;
    await setDoc(doc(db, "rooms", roomId, "users", currentUserId), {
      vote: value === myVote ? null : value
    }, { merge: true });
  };

  const handleReveal = async () => {
    if (!isAdmin) return;
    await updateDoc(doc(db, "rooms", roomId), { revealed: !room.revealed });
  }

  const handleClear = async () => {
    if (!isAdmin) return;
    // Clear the room reveal
    await updateDoc(doc(db, "rooms", roomId), { revealed: false });
    // Clear all user votes
    for (const u of users) {
      await updateDoc(doc(db, "rooms", roomId, "users", u.id), { vote: null });
    }
  }

  const stats = useMemo(() => {
    if (!room.revealed) return null;
    const votes = users
      .map((u) => parseFloat(u.vote || ""))
      .filter((v) => !isNaN(v));
      
    if (votes.length === 0) return { avg: "0.0", min: 0, max: 0, proposal: "0" };
    
    const avgVal = votes.reduce((a, b) => a + b, 0) / votes.length;
    const fibSequence = [0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89];
    const proposal = fibSequence.find(fib => fib >= avgVal) ?? 89;

    return {
      avg: avgVal.toFixed(1),
      min: Math.min(...votes),
      max: Math.max(...votes),
      proposal: proposal.toString()
    };
  }, [users, room.revealed]);

  const renderCard = (card: string) => (
    <button
      key={card}
      onClick={() => handleVote(card)}
      disabled={room.revealed}
      className={cn(
        "flex flex-col items-center justify-center h-40 w-28 rounded-3xl border-3 transition-all group relative",
        myVote === card 
          ? "bg-indigo-500 border-indigo-400 scale-110 shadow-[0_20px_60px_rgba(99,102,241,0.4)] z-20" 
          : "bg-black/60 border-white/10",
        !room.revealed && myVote !== card && "hover:border-white/40 hover:bg-white/10 hover:-translate-y-3 active:scale-95",
        room.revealed && myVote !== card && "opacity-20 cursor-not-allowed",
        room.revealed && myVote === card && "cursor-not-allowed"
      )}
    >
      {myVote === card && (
        <div className="absolute -top-3 -right-3 h-8 w-8 rounded-full bg-white text-indigo-600 flex items-center justify-center shadow-xl z-30">
          <CheckCircle2 className="h-5 w-5" />
        </div>
      )}
      <span className={cn(
        "text-4xl font-black transition-transform group-hover:scale-125 duration-500",
        card === "☕" ? "text-3xl" : "",
        "text-white"
      )}>
        {card}
      </span>
      <span className={cn(
        "text-xs uppercase font-black tracking-widest opacity-30 mt-3",
        myVote === card ? "text-white opacity-80" : "text-white/40"
      )}>
        Points
      </span>
    </button>
  );

  return (
    <div className="flex flex-col h-full gap-6 p-8 overflow-hidden">
      {/* 1. Header Controls for Planning */}
      <div className="shrink-0 flex items-center justify-between bg-white/[0.03] border border-white/5 p-6 rounded-[2rem] shadow-xl">
        <div className="flex flex-col gap-1">
          <h2 className="text-3xl font-black flex items-center gap-4 text-white tracking-tight">
            Sprint Planning
            {stats !== null && (
              <div className="flex gap-3 items-center ml-2">
                <span className="flex items-center gap-2 text-indigo-400 bg-indigo-500/10 px-4 py-1.5 rounded-xl text-lg border border-indigo-500/20 shadow-lg shadow-indigo-500/10">
                  Avg: <span className="font-bold text-white">{stats.avg}</span>
                </span>
                <span className="flex items-center gap-2 text-sky-400 bg-sky-500/10 px-4 py-1.5 rounded-xl text-lg border border-sky-500/20 shadow-lg shadow-sky-500/10">
                  Min: <span className="font-bold text-white">{stats.min}</span>
                </span>
                <span className="flex items-center gap-2 text-rose-400 bg-rose-500/10 px-4 py-1.5 rounded-xl text-lg border border-rose-500/20 shadow-lg shadow-rose-500/10">
                  Max: <span className="font-bold text-white">{stats.max}</span>
                </span>
                
                <div className="h-6 w-px bg-white/10 mx-1"></div>
                
                {/* Proposed Final Estimate */}
                  <span className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 px-5 py-1.5 rounded-xl text-lg border border-emerald-500/30 shadow-[0_0_30px_rgba(52,211,153,0.15)] relative overflow-hidden group">
                    <div className="absolute inset-x-0 top-0 h-[1px] bg-emerald-400/50"></div>
                    <Sparkles className="h-3.5 w-3.5 relative z-10 animate-pulse" />
                    <span className="relative z-10 tracking-[0.2em] uppercase text-[9px] font-black pt-1">PROPOSED:</span>
                    <span className="relative z-10 font-black text-white text-2xl tabular-nums">{stats.proposal}</span>
                  </span>
                </div>
              )}
            </h2>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]"></span>
                <p className="text-zinc-500 text-[10px] uppercase tracking-[0.2em] font-black font-mono">
                  {users.filter((u) => u.vote).length} / {users.length} SQUAD READY
                </p>
              </div>
              {allVoted && !room.revealed && (
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 animate-pulse">
                  SCAN COMPLETED
                </span>
              )}
            </div>
          </div>
        
        {isAdmin && (
          <div className="flex items-center gap-3">
            <button 
              onClick={handleClear}
              className="px-6 py-3 rounded-xl border border-white/10 bg-white/5 text-sm font-black text-zinc-400 hover:bg-white/10 hover:text-white transition-all active:scale-95 flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Reset Board
            </button>
            <button 
              onClick={handleReveal}
              className={cn(
                "px-8 py-3 rounded-xl text-sm font-black transition-all active:scale-95 flex items-center gap-2",
                room.revealed 
                  ? "bg-white text-black shadow-[0_15px_40px_rgba(255,255,255,0.2)]" 
                  : allVoted 
                    ? "bg-emerald-500 text-white shadow-[0_0_40px_rgba(16,185,129,0.4)] animate-pulse" 
                    : "bg-indigo-500 text-white shadow-[0_15px_40px_rgba(99,102,241,0.2)]"
              )}
            >
              {room.revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {room.revealed ? "Hide Results" : allVoted ? "Ready to Reveal" : "Reveal Votes"}
            </button>
          </div>
        )}
      </div>

      {/* 2. The Table (Estimation Board / Results) */}
      <div className="flex-grow min-h-0 bg-black/20 rounded-[3rem] p-2 border border-white/[0.02] flex flex-col">
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
              {users.map((u) => (
                <div 
                  key={u.id}
                  className={cn(
                    "flex flex-col items-center justify-center p-8 rounded-[2.5rem] border transition-all duration-700",
                    room.revealed && u.vote 
                      ? "bg-indigo-500/5 border-indigo-500/40 shadow-[0_0_60px_rgba(99,102,241,0.1)] scale-105" 
                      : "bg-white/[0.02] border-white/5"
                  )}
                >
                  <div className={cn(
                    "h-36 w-28 rounded-2xl flex items-center justify-center transition-all duration-1000 perspective-1000 group/card cursor-pointer mb-8",
                    room.revealed ? "rotate-0 scale-110" : u.vote ? "rotate-y-180" : "opacity-10 scale-90"
                  )}>
                      {room.revealed ? (
                        <div className="h-full w-full rounded-2xl bg-white text-black flex flex-col items-center justify-center shadow-[0_25px_50px_rgba(0,0,0,0.5)] relative overflow-hidden ring-1 ring-white/20">
                          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent"></div>
                          <div className="absolute top-3 left-3 text-[10px] opacity-30 font-black tracking-tighter uppercase">ESTM</div>
                          <div className="absolute bottom-3 right-3 text-[10px] opacity-30 font-black tracking-tighter self-end rotate-180 uppercase">ESTM</div>
                          <span className="text-7xl font-black tracking-tighter mt-1">{u.vote === "☕" ? <Coffee className="h-12 w-12" /> : (u.vote || "-")}</span>
                        </div>
                      ) : (
                        <div className={cn(
                          "h-full w-full rounded-2xl flex items-center justify-center shadow-2xl border-2 border-white/5 relative overflow-hidden",
                          u.vote 
                            ? "bg-gradient-to-br from-indigo-500 via-indigo-600 to-indigo-700 ring-2 ring-indigo-400/20" 
                            : "bg-white/5 border-dashed"
                        )}>
                           <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.1),transparent)]"></div>
                           {u.vote && (
                             <div className="flex flex-col items-center gap-2 [transform:rotateY(180deg)]">
                                <div className="h-10 w-10 border border-white/20 rounded-xl bg-white/10 flex items-center justify-center shadow-lg">
                                   <Zap className="h-5 w-5 text-indigo-200" />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/50">Voted</span>
                             </div>
                           )}
                        </div>
                      )}
                  </div>

                  <div className="flex flex-col items-center w-full">
                    <div className="mb-3 h-10 w-10 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-black text-zinc-400 border border-white/5 shadow-inner">
                      {u.avatar ? <span className="text-xl">{u.avatar}</span> : u.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-[10px] font-black text-zinc-500 truncate w-full text-center uppercase tracking-[0.2em]">{u.name}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
      </div>

      {/* 3. The Hand (Selectable Deck) */}
      <div className="shrink-0 flex flex-col items-center justify-center p-8 rounded-[3rem] bg-indigo-500/[0.02] border border-indigo-500/10 relative overflow-hidden backdrop-blur-3xl mt-auto">
         <div className="absolute inset-0 bg-gradient-to-t from-indigo-500/5 to-transparent"></div>
         
         <div className="flex flex-col gap-6 relative z-10 w-full max-w-7xl mx-auto items-center">
            {/* Lower Sequence */}
            <div className="flex flex-wrap justify-center gap-6">
              {cards.slice(0, 7).map(renderCard)}
            </div>
            {/* Higher Sequence & Extras */}
            <div className="flex flex-wrap justify-center gap-6">
              {cards.slice(7).map(renderCard)}
            </div>
         </div>
         <p className="mt-5 text-xs font-black text-zinc-600 uppercase tracking-[0.4em] animate-pulse">Select your estimation card</p>
      </div>
    </div>
  );
}
