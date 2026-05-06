import { useMemo, useState } from "react";
import Image from "next/image";
import { doc, updateDoc, setDoc, writeBatch, collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Coffee, Zap, RefreshCw, EyeOff, Eye, CheckCircle2, Sparkles, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { RoomData, RoomUser, Ticket } from "@/types";
import { PLANNING_CARDS, ANIMAL_MAPPING } from "@/constants";
import { TicketSidebar } from "./TicketSidebar";

interface PlanningBoardProps {
  room: RoomData;
  roomId: string;
  users: RoomUser[];
  isAdmin: boolean;
  currentUserId: string;
}

export function PlanningBoard({ room, roomId, users, isAdmin, currentUserId }: PlanningBoardProps) {
  const cards = PLANNING_CARDS;
  const myVote = users.find((u) => u.id === currentUserId)?.vote;
  const allVoted = users.length > 0 && users.every((u) => u.vote);
  
  const [activeGroup, setActiveGroup] = useState<string | null>(null);

  const groupColors: Record<string, string> = {
    "FE": "border-blue-500/40 bg-blue-500/5 text-blue-400",
    "BE": "border-emerald-500/40 bg-emerald-500/5 text-emerald-400",
    "QA": "border-rose-500/40 bg-rose-500/5 text-rose-400",
    "BA": "border-amber-500/40 bg-amber-500/5 text-amber-400",
    "PM": "border-purple-500/40 bg-purple-500/5 text-purple-400",
  };

  const getGroupStyles = (group?: string) => {
    if (!group) return "border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-white/5 dark:bg-white/[0.02] dark:text-zinc-500";
    const normalized = group.toUpperCase();
    return groupColors[normalized] || "border-indigo-500/40 bg-indigo-500/5 text-indigo-600 dark:text-indigo-400";
  };

  const groups = useMemo(() => {
    const g = new Set<string>();
    users.forEach(u => { if (u.group) g.add(u.group); });
    return Array.from(g).sort();
  }, [users]);

  const filteredUsers = useMemo(() => {
    const list = !activeGroup ? users : users.filter(u => u.group === activeGroup);
    
    return [...list].sort((a, b) => {
      // Sort by group first (normalized to handle capitalization differences)
      const groupA = (a.group || "").toLowerCase();
      const groupB = (b.group || "").toLowerCase();
      if (groupA !== groupB) return groupA.localeCompare(groupB);
      
      // Then by name
      return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
    });
  }, [users, activeGroup]);

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

  const handleSaveAndNext = async () => {
    if (!isAdmin) return;
    
    const batch = writeBatch(db);

    // Save to active ticket if we have one and a proposal
    if (room.activeTicketId && stats && room.revealed) {
      const votedUsers = users.filter(u => u.vote).length;
      batch.update(doc(db, "rooms", roomId, "tickets", room.activeTicketId!), {
        status: "completed",
        estimate: stats.proposal,
        votesAtCompletion: votedUsers,
        totalUsersAtCompletion: users.length
      });
    }

    // Fetch tickets to find the next one in line
    const ticketsSnap = await getDocs(collection(db, "rooms", roomId, "tickets"));
    const allTickets = ticketsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Ticket));
    
    // Stably sort exactly like the UI to find the precise "next" ticket
    allTickets.sort((a, b) => {
      const aOrder = typeof a.order === 'number' ? a.order : (a.createdAt?.toMillis?.() || 0);
      const bOrder = typeof b.order === 'number' ? b.order : (b.createdAt?.toMillis?.() || 0);
      return bOrder - aOrder;
    });
    
    let nextTicket = null;
    
    if (room.activeTicketId) {
      const currentIndex = allTickets.findIndex(t => t.id === room.activeTicketId);
      if (currentIndex !== -1) {
        // Look ahead for the very next "todo" ticket
        for (let i = currentIndex + 1; i < allTickets.length; i++) {
          if (allTickets[i].status === "todo" || allTickets[i].status === "open" || !allTickets[i].status) {
            nextTicket = allTickets[i];
            break;
          }
        }
      }
    }

    // Fallback: If no strict next ticket was found after the current one, just grab the first available "todo" ticket
    if (!nextTicket) {
      nextTicket = allTickets.find(t => t.status === "todo" || t.status === "open" || !t.status);
    }

    if (nextTicket) {
      // Put next ticket into planning tracking
      batch.update(doc(db, "rooms", roomId, "tickets", nextTicket.id!), { status: "planning" });
      batch.update(doc(db, "rooms", roomId), {
        revealed: false,
        currentTicket: nextTicket.name,
        activeTicketId: nextTicket.id
      });
    } else {
      // Reset board completely if fully done with all tickets
      batch.update(doc(db, "rooms", roomId), { revealed: false, currentTicket: "", activeTicketId: null });
    }

    // Clear all users' votes
    for (const u of users) {
      batch.update(doc(db, "rooms", roomId, "users", u.id), { vote: null });
    }

    await batch.commit();
  }

  const handleClear = async () => {
    if (!isAdmin) return;
    const batch = writeBatch(db);
    batch.update(doc(db, "rooms", roomId), { revealed: false });
    for (const u of users) {
      batch.update(doc(db, "rooms", roomId, "users", u.id), { vote: null });
    }
    await batch.commit();
  }

  const stats = (() => {
    if (!room?.revealed) return null;
    const votes = filteredUsers
      .map((u) => parseFloat(u.vote || ""))
      .filter((v) => !isNaN(v));
      
    if (votes.length === 0) return { avg: "0.0", min: 0, max: 0, proposal: "0" };
    
    const avgVal = votes.reduce((a, b) => a + b, 0) / votes.length;
    const fibSequence = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89];
    const proposal = fibSequence.find(fib => fib >= avgVal) ?? 89;

    return {
      avg: avgVal.toFixed(1),
      min: Math.min(...votes),
      max: Math.max(...votes),
      proposal: proposal.toString()
    };
  })();

  const renderCard = (card: string) => {
    const animal = ANIMAL_MAPPING[card];
    
    return (
      <button
        key={card}
        onClick={() => handleVote(card)}
        disabled={room.revealed}
        className={cn(
          "flex flex-col items-center justify-center h-16 w-12 sm:h-20 sm:w-14 lg:h-24 lg:w-16 xl:h-32 xl:w-24 2xl:h-40 2xl:w-28 rounded-xl lg:rounded-2xl 2xl:rounded-[2rem] transition-all group relative",
          myVote === card 
            ? "bg-indigo-500 border-[3px] border-indigo-400 scale-110 shadow-[0_20px_60px_rgba(99,102,241,0.4)] z-20" 
            : "bg-white dark:bg-black/60 border border-zinc-200 dark:border-white/10 shadow-sm",
          !room.revealed && myVote !== card && "hover:border-zinc-300 dark:hover:border-white/40 hover:bg-zinc-50 dark:hover:bg-white/10 hover:-translate-y-3 active:scale-95",
          room.revealed && myVote !== card && "opacity-20 cursor-not-allowed",
          room.revealed && myVote === card && "cursor-not-allowed"
        )}
      >
        {/* Animal Backdrop Wrapper with Overflow Hidden and Safari Webkit fix */}
        {animal && (
          <div className="absolute inset-x-0 inset-y-0 z-0 overflow-hidden rounded-[inherit] [transform:translateZ(0)] border-[0.5px] border-transparent">
            <Image 
              src={animal.image} 
              alt={animal.name}
              fill
              unoptimized
              className={cn(
                "object-cover transition-all duration-700",
                myVote === card ? "opacity-40 grayscale-0 scale-110" : "opacity-10 grayscale group-hover:opacity-30 group-hover:grayscale-0"
              )}
            />
            <div className={cn(
              "absolute inset-0 bg-gradient-to-t via-transparent to-transparent",
              myVote === card ? "from-black/60" : "from-white/80 dark:from-black/80"
            )}></div>
          </div>
        )}

        {myVote === card && (
          <div className="absolute -top-4 -right-4 h-10 w-10 rounded-full bg-white text-indigo-600 flex items-center justify-center shadow-[0_10px_25px_rgba(0,0,0,0.3)] z-30 animate-in zoom-in duration-300 ring-4 ring-indigo-500/20">
            <CheckCircle2 className="h-6 w-6" />
          </div>
        )}
        
        <div className="relative z-10 flex flex-col items-center">
          <span className={cn(
            "text-lg sm:text-xl lg:text-3xl xl:text-4xl 2xl:text-5xl font-black transition-transform group-hover:scale-125 duration-500 drop-shadow-[0_2px_4px_rgba(0,0,0,0.1)] dark:drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]",
            card === "☕" ? "text-xl sm:text-2xl lg:text-3xl xl:text-4xl" : "",
            myVote === card ? "text-white" : "text-zinc-900 dark:text-white"
          )}>
            {card}
          </span>
          {animal && (
            <span className={cn(
              "text-[6px] md:text-[8px] xl:text-[10px] uppercase font-black tracking-[0.2em] mt-1 transition-all",
              myVote === card ? "text-white opacity-100" : "text-zinc-500 group-hover:text-zinc-700 dark:text-white/40 dark:group-hover:text-white/80"
            )}>
              {animal.name}
            </span>
          )}
          {!animal && card !== "☕" && (
            <span className={cn(
              "text-[8px] md:text-[9px] xl:text-[10px] uppercase font-black tracking-widest mt-1 sm:mt-2 transition-all",
              myVote === card ? "text-white opacity-80" : "text-zinc-500 group-hover:text-zinc-700 dark:text-white/40 dark:opacity-30 dark:group-hover:text-white/80 dark:group-hover:opacity-100"
            )}>
              Points
            </span>
          )}
        </div>
      </button>
    );
  };

  if (!room) return null;

  return (
    <div className="flex h-full w-full overflow-hidden">
      <div className="flex-1 flex flex-col h-full gap-3 md:gap-4 xl:gap-6 p-3 md:p-4 lg:p-6 xl:p-8 overflow-y-auto overflow-x-hidden pb-12 lg:pb-8">
      {/* 1. Header Controls for Planning */}
      <div className="shrink-0 flex flex-col xl:flex-row lg:items-center justify-between gap-4 bg-white/60 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/5 p-3 md:p-4 xl:p-6 rounded-2xl xl:rounded-[2rem] shadow-sm dark:shadow-xl">
        <div className="flex flex-col gap-2 md:gap-1 w-full pb-2 xl:pb-0">
          <div className="flex flex-row flex-wrap items-center gap-2 md:gap-4 shrink-0">
             <h2 className="text-lg md:text-xl xl:text-3xl font-black text-zinc-900 dark:text-white tracking-tight shrink-0 whitespace-nowrap">
               Sprint Planning
             </h2>
             {stats !== null && (
               <div className="flex flex-wrap gap-2 xl:gap-3 items-center ml-0 md:ml-2">
                <span className="flex items-center gap-1 xl:gap-2 text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 lg:px-3 xl:px-4 py-1 xl:py-1.5 rounded-lg xl:rounded-xl text-xs md:text-sm xl:text-lg border border-indigo-200 dark:border-indigo-500/20 shadow-lg shadow-indigo-500/5 dark:shadow-indigo-500/10 shrink-0">
                  Avg: <span className="font-bold text-indigo-900 dark:text-white">{stats.avg}</span>
                </span>
                <span className="flex items-center gap-1 xl:gap-2 text-sky-600 dark:text-sky-400 bg-sky-500/10 px-2 lg:px-3 xl:px-4 py-1 xl:py-1.5 rounded-lg xl:rounded-xl text-xs md:text-sm xl:text-lg border border-sky-200 dark:border-sky-500/20 shadow-lg shadow-sky-500/5 dark:shadow-sky-500/10 shrink-0">
                  Min: <span className="font-bold text-sky-900 dark:text-white">{stats.min}</span>
                </span>
                <span className="flex items-center gap-1 xl:gap-2 text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 lg:px-3 xl:px-4 py-1 xl:py-1.5 rounded-lg xl:rounded-xl text-xs md:text-sm xl:text-lg border border-rose-200 dark:border-rose-500/20 shadow-lg shadow-rose-500/5 dark:shadow-rose-500/10 shrink-0">
                  Max: <span className="font-bold text-rose-900 dark:text-white">{stats.max}</span>
                </span>
                
                <div className="hidden md:block h-4 xl:h-6 w-px bg-zinc-300 dark:bg-white/10 mx-1"></div>
                
                {/* Proposed Final Estimate */}
                <span className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 xl:px-5 py-1 xl:py-1.5 rounded-lg xl:rounded-xl text-sm xl:text-lg border border-emerald-200 dark:border-emerald-500/30 shadow-[0_0_30px_rgba(52,211,153,0.15)] relative overflow-hidden group shrink-0">
                  <div className="absolute inset-x-0 top-0 h-[1px] bg-emerald-400/50"></div>
                  <Sparkles className="h-3.5 w-3.5 relative z-10 animate-pulse" />
                  <span className="relative z-10 tracking-[0.2em] uppercase text-[8px] xl:text-[9px] font-black pt-1 hidden md:inline-block">PROPOSED:</span>
                  <span className="relative z-10 font-black text-emerald-900 dark:text-white text-lg xl:text-2xl tabular-nums">{stats.proposal}</span>
                </span>
              </div>
            )}
          </div>
          
          <div className="mt-2 w-full max-w-sm">
            {room.currentTicket ? (
              <div className="w-full bg-indigo-50 dark:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/50 rounded-lg px-4 py-2 text-sm text-indigo-600 dark:text-indigo-300 font-bold uppercase tracking-widest truncate shadow-sm dark:shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                Selecting: {room.currentTicket}
              </div>
            ) : (
              <div className="w-full bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs text-zinc-500 dark:text-white/50 italic">
                {isAdmin ? "Select a ticket from the sidebar to begin..." : "Waiting for ticket selection..."}
              </div>
            )}
          </div>
          
          {/* Voter Count & Progress */}
          <div className="flex items-center gap-2 mt-1 xl:mt-2">
            <div className="flex items-center gap-1.5 text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-zinc-500 dark:text-white/30 bg-zinc-100 dark:bg-white/5 px-2 py-1 rounded-md border border-zinc-200 dark:border-white/5">
              <Users className="h-3 w-3" />
              Voted: <span className="text-zinc-700 dark:text-white/60 tabular-nums">{users.filter(u => u.vote).length} / {users.length}</span>
            </div>
            
            {allVoted && (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 animate-in zoom-in duration-500">
                <CheckCircle2 className="h-3 w-3 fill-emerald-200 dark:fill-emerald-400/20" />
                <span className="text-[10px] font-black uppercase tracking-widest">Ready</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar no-scrollbar scroll-smooth">
            <button
              onClick={() => setActiveGroup(null)}
              className={cn(
                "px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all shrink-0 whitespace-nowrap border",
                !activeGroup 
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-black border-zinc-900 dark:border-white shadow-lg" 
                  : "bg-zinc-100 text-zinc-500 border-zinc-200 hover:bg-zinc-200 dark:bg-white/5 dark:text-zinc-500 dark:border-white/5 dark:hover:bg-white/10"
              )}
            >
              All Squads
            </button>
            {groups.map(g => (
              <button
                key={g}
                onClick={() => setActiveGroup(g === activeGroup ? null : g)}
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
        </div>
        
        {isAdmin && (
          <div className="flex items-center justify-center sm:justify-start w-full md:w-auto gap-2 sm:gap-3 shrink-0 border-t border-zinc-200 dark:border-white/5 pt-4 md:pt-0 md:border-none mt-2 md:mt-0 flex-wrap">
            <button 
              onClick={handleClear}
              className="px-3 sm:px-6 py-2.5 sm:py-3 rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-100 dark:bg-white/5 text-xs sm:text-sm font-black text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-white/10 hover:text-zinc-900 dark:hover:text-white transition-all active:scale-95 flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Reset
            </button>
            {room.revealed && room.activeTicketId && (
              <button 
                onClick={handleSaveAndNext}
                className="px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-orange-500 text-white text-xs sm:text-sm font-black shadow-[0_15px_40px_rgba(249,115,22,0.2)] transition-all active:scale-95 flex items-center gap-2"
              >
                Save & Next
              </button>
            )}
            <button 
              onClick={handleReveal}
              className={cn(
                "px-4 sm:px-8 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-black transition-all active:scale-95 flex items-center gap-2",
                room.revealed 
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-black shadow-lg dark:shadow-[0_15px_40px_rgba(255,255,255,0.2)]" 
                  : allVoted 
                    ? "bg-emerald-500 text-white shadow-[0_0_40px_rgba(16,185,129,0.4)] animate-pulse" 
                    : "bg-indigo-500 text-white shadow-[0_15px_40px_rgba(99,102,241,0.2)]"
              )}
            >
              {room.revealed ? <EyeOff className="h-3 w-3 sm:h-4 sm:w-4" /> : <Eye className="h-3 w-3 sm:h-4 sm:w-4" />}
              {room.revealed ? "Hide Results" : allVoted ? "Ready to Reveal" : "Reveal Votes"}
            </button>
          </div>
        )}
      </div>

      <div className="flex-grow flex-shrink-0 min-h-[350px] bg-white dark:bg-black/20 rounded-2xl xl:rounded-[3rem] p-1 xl:p-2 border border-zinc-200 dark:border-white/[0.02] flex flex-col shadow-sm dark:shadow-none">
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 sm:p-4 xl:p-6">
          <div className="grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(140px,1fr))] lg:grid-cols-[repeat(auto-fill,minmax(170px,1fr))] xl:grid-cols-[repeat(auto-fill,minmax(210px,1fr))] 2xl:grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-2 sm:gap-3 xl:gap-6 justify-items-start">
            {filteredUsers.map((u) => (
              <div 
                key={u.id}
                className={cn(
                  "flex flex-col items-center justify-center p-2 sm:p-4 xl:p-8 2xl:p-10 rounded-xl xl:rounded-[2.5rem] 2xl:rounded-[3rem] border transition-all duration-700 relative group/member w-full h-full",
                  getGroupStyles(u.group).split(' ')[0], 
                  getGroupStyles(u.group).split(' ')[1],
                  room.revealed && u.vote && "shadow-[0_0_40px_rgba(99,102,241,0.1)] scale-105"
                )}
              >
                  {u.group && (
                    <div className={cn(
                      "absolute top-4 left-4 px-2 py-0.5 rounded-md border text-[8px] font-black uppercase tracking-tighter transition-all group-hover/member:opacity-100",
                      getGroupStyles(u.group)
                    )}>
                      {u.group}
                    </div>
                  )}
                  <div className={cn(
                    "h-20 w-14 sm:h-24 sm:w-16 md:h-28 md:w-20 lg:h-32 lg:w-24 xl:h-36 xl:w-28 2xl:h-44 2xl:w-32 rounded-lg md:rounded-2xl 2xl:rounded-[1.5rem] flex items-center justify-center transition-all duration-1000 perspective-1000 group/card cursor-pointer mb-2 xl:mb-8",
                    room.revealed ? "rotate-0 scale-110" : u.vote ? "rotate-y-180" : "opacity-30 dark:opacity-10 scale-90"
                  )}>
                      {room.revealed ? (
                        <div className={cn(
                          "h-full w-full rounded-lg md:rounded-2xl bg-white text-zinc-900 flex flex-col items-center justify-center shadow-md dark:shadow-[0_25px_50px_rgba(0,0,0,0.5)] relative overflow-hidden ring-2",
                          u.group ? getGroupStyles(u.group).split(' ')[0].replace('border-', 'ring-') : "ring-zinc-200 dark:ring-white/20"
                        )}>
                          {/* Animal Reveal Backdrop */}
                          {u.vote && ANIMAL_MAPPING[u.vote] && (
                            <div className="absolute inset-0 z-0">
                               <Image 
                                 src={ANIMAL_MAPPING[u.vote].image} 
                                 alt={ANIMAL_MAPPING[u.vote].name}
                                 fill
                                 unoptimized
                                 className="object-cover opacity-20 filter sepia-[0.3]"
                               />
                            </div>
                          )}
                          <div className={cn(
                            "absolute inset-0 bg-gradient-to-br from-transparent to-transparent z-10",
                            u.group && getGroupStyles(u.group).split(' ')[1].replace('bg-', 'from-').replace('/5', '/20')
                          )}></div>
                          <div className="absolute top-1 left-1 lg:top-3 lg:left-3 text-[6px] md:text-[8px] opacity-30 font-black tracking-tighter uppercase z-20">ESTM</div>
                          <div className="absolute bottom-1 right-1 lg:bottom-3 lg:right-3 text-[6px] md:text-[8px] opacity-30 font-black tracking-tighter self-end rotate-180 uppercase z-20">ESTM</div>
                          <div className="flex flex-col items-center relative z-20">
                            <span className="text-3xl md:text-5xl xl:text-7xl 2xl:text-8xl font-black tracking-tighter mt-1">{u.vote === "☕" ? <Coffee className="h-6 w-6 lg:h-12 lg:w-12 2xl:h-16 2xl:w-16" /> : (u.vote || "-")}</span>
                            {u.vote && ANIMAL_MAPPING[u.vote] && (
                              <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] text-black/60">{ANIMAL_MAPPING[u.vote].name}</span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className={cn(
                          "h-full w-full rounded-lg md:rounded-2xl flex items-center justify-center shadow-lg border-2 relative overflow-hidden",
                          u.vote 
                            ? "bg-gradient-to-br from-indigo-500 via-indigo-600 to-indigo-700 border-transparent ring-2 ring-indigo-400/20" 
                            : "bg-zinc-50 border-zinc-200 dark:bg-white/5 dark:border-white/5 border-dashed"
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

                  <div className="flex flex-col items-center w-full mt-2 lg:mt-0">
                    <div className="mb-2 h-6 w-6 md:h-8 md:w-8 lg:h-10 lg:w-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xs lg:text-sm font-black text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-white/5 shadow-inner">
                      {u.avatar ? <span className="text-base lg:text-xl">{u.avatar}</span> : u.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-[8px] md:text-[10px] font-black text-zinc-600 dark:text-zinc-500 truncate w-full text-center uppercase tracking-[0.2em]">{u.name}</span>
                  </div>
                </div>
            ))}
          </div>
        </div>
      </div>

      <div className="shrink-0 flex flex-col items-center justify-center p-3 md:p-4 xl:p-8 2xl:p-12 rounded-2xl xl:rounded-[3rem] 2xl:rounded-[4rem] bg-indigo-50 dark:bg-indigo-500/[0.02] border border-indigo-200 dark:border-indigo-500/10 relative overflow-hidden backdrop-blur-3xl mt-auto z-10 group/deck">
         <div className="absolute inset-0 bg-gradient-to-t from-indigo-100 dark:from-indigo-500/5 to-transparent pointer-events-none"></div>
         
         <div 
            className="flex flex-wrap gap-2 sm:gap-3 md:gap-4 mx-auto items-center justify-center py-4 w-full relative z-10"
         >
            {cards.map((card) => (
              <div key={card} className="shrink-0 flex justify-center">
                {renderCard(card)}
              </div>
            ))}
         </div>
      </div>
      </div>
      
      <div className="hidden lg:block h-full">
          <TicketSidebar 
            roomId={roomId} 
            isAdmin={isAdmin} 
            activeTicketId={room.activeTicketId} 
            users={users}
          />
      </div>
    </div>
  );
}
