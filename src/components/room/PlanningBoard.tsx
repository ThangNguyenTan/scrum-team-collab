import { useMemo, useRef, useState, useEffect } from "react";
import { doc, updateDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Coffee, Zap, RefreshCw, EyeOff, Eye, CheckCircle2, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
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

  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollAnimation = useRef<number | null>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeftPos = useRef(0);
  const dragDelta = useRef(0);
  
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateScrollButtons = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(Math.ceil(scrollLeft) > 0);
    // Be a bit more forgiving with the right threshold for subpixel scrolling
    setCanScrollRight(Math.ceil(scrollLeft) < scrollWidth - clientWidth - 2);
  };

  useEffect(() => {
    updateScrollButtons();
    // Safety sync after layout paint
    const tId = setTimeout(updateScrollButtons, 150);
    const tId2 = setTimeout(updateScrollButtons, 500);
    
    window.addEventListener('resize', updateScrollButtons);
    return () => {
      clearTimeout(tId);
      clearTimeout(tId2);
      window.removeEventListener('resize', updateScrollButtons);
    }
  }, []);

  const handleHoverScroll = (direction: 'left' | 'right') => {
    if (scrollAnimation.current) cancelAnimationFrame(scrollAnimation.current);
    
    const scrollStep = () => {
      if (!scrollRef.current) return;
      
      const el = scrollRef.current;
      const prev = el.scrollLeft;
      el.scrollLeft += direction === 'left' ? -12 : 12;
      
      // Keep going if we actually moved
      if (el.scrollLeft !== prev) {
        scrollAnimation.current = requestAnimationFrame(scrollStep);
      } else {
        // We hit the edge, make sure buttons sync up immediately
        updateScrollButtons();
      }
    };
    
    scrollAnimation.current = requestAnimationFrame(scrollStep);
  };

  const stopHoverScroll = () => {
    if (scrollAnimation.current) {
      cancelAnimationFrame(scrollAnimation.current);
      scrollAnimation.current = null;
    }
  };

  const handleVote = async (value: string) => {
    if (!currentUserId || room.revealed) return;
    // Debounce vote if it was a drag
    if (dragDelta.current > 5) return;
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
        "flex flex-col items-center justify-center h-20 w-14 sm:h-24 sm:w-16 md:h-28 md:w-20 lg:h-32 lg:w-24 xl:h-40 xl:w-28 rounded-2xl lg:rounded-3xl border-3 transition-all group relative",
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
        "text-xl sm:text-2xl md:text-3xl xl:text-4xl font-black transition-transform group-hover:scale-125 duration-500",
        card === "☕" ? "text-lg sm:text-xl md:text-2xl xl:text-3xl" : "",
        "text-white"
      )}>
        {card}
      </span>
      <span className={cn(
        "text-[8px] md:text-[9px] xl:text-[10px] uppercase font-black tracking-widest opacity-30 mt-1 sm:mt-2",
        myVote === card ? "text-white opacity-80" : "text-white/40"
      )}>
        Points
      </span>
    </button>
  );

  return (
    <div className="flex flex-col h-full gap-3 md:gap-4 xl:gap-6 p-3 md:p-4 lg:p-6 xl:p-8 overflow-y-auto overflow-x-hidden pb-12 lg:pb-8">
      {/* 1. Header Controls for Planning */}
      <div className="shrink-0 flex flex-col xl:flex-row lg:items-center justify-between gap-4 bg-white/[0.03] border border-white/5 p-3 md:p-4 xl:p-6 rounded-2xl xl:rounded-[2rem] shadow-xl">
        <div className="flex flex-col gap-2 md:gap-1 overflow-x-auto w-full custom-scrollbar pb-2 xl:pb-0">
          <h2 className="text-lg md:text-xl xl:text-3xl font-black flex items-center gap-2 md:gap-4 text-white tracking-tight shrink-0 whitespace-nowrap">
            Sprint Planning
            {stats !== null && (
              <div className="flex gap-2 -sm md:gap-3 items-center ml-2">
                <span className="flex items-center gap-1 xl:gap-2 text-indigo-400 bg-indigo-500/10 px-2 lg:px-3 xl:px-4 py-1 xl:py-1.5 rounded-lg xl:rounded-xl text-xs md:text-sm xl:text-lg border border-indigo-500/20 shadow-lg shadow-indigo-500/10">
                  Avg: <span className="font-bold text-white">{stats.avg}</span>
                </span>
                <span className="flex items-center gap-1 xl:gap-2 text-sky-400 bg-sky-500/10 px-2 lg:px-3 xl:px-4 py-1 xl:py-1.5 rounded-lg xl:rounded-xl text-xs md:text-sm xl:text-lg border border-sky-500/20 shadow-lg shadow-sky-500/10">
                  Min: <span className="font-bold text-white">{stats.min}</span>
                </span>
                <span className="flex items-center gap-1 xl:gap-2 text-rose-400 bg-rose-500/10 px-2 lg:px-3 xl:px-4 py-1 xl:py-1.5 rounded-lg xl:rounded-xl text-xs md:text-sm xl:text-lg border border-rose-500/20 shadow-lg shadow-rose-500/10">
                  Max: <span className="font-bold text-white">{stats.max}</span>
                </span>
                
                <div className="h-4 xl:h-6 w-px bg-white/10 mx-1"></div>
                
                {/* Proposed Final Estimate */}
                  <span className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 px-3 xl:px-5 py-1 xl:py-1.5 rounded-lg xl:rounded-xl text-sm xl:text-lg border border-emerald-500/30 shadow-[0_0_30px_rgba(52,211,153,0.15)] relative overflow-hidden group">
                    <div className="absolute inset-x-0 top-0 h-[1px] bg-emerald-400/50"></div>
                    <Sparkles className="h-3.5 w-3.5 relative z-10 animate-pulse" />
                    <span className="relative z-10 tracking-[0.2em] uppercase text-[8px] xl:text-[9px] font-black pt-1 hidden md:inline-block">PROPOSED:</span>
                    <span className="relative z-10 font-black text-white text-lg xl:text-2xl tabular-nums">{stats.proposal}</span>
                  </span>
                </div>
              )}
            </h2>
            <div className="flex items-center gap-4 sm:gap-6 mt-2 xl:mt-0">
              <div className="flex items-center gap-2 shrink-0">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]"></span>
                <p className="text-zinc-500 text-[9px] md:text-[10px] uppercase tracking-[0.2em] font-black font-mono">
                  {users.filter((u) => u.vote).length} / {users.length} READY
                </p>
              </div>
              {allVoted && !room.revealed && (
                <span className="text-[8px] md:text-[10px] shrink-0 font-black uppercase tracking-[0.2em] text-emerald-400 bg-emerald-500/10 px-2 md:px-3 py-1 rounded-full border border-emerald-500/20 animate-pulse">
                  SCAN COMPLETED
                </span>
              )}
            </div>
          </div>
        
        {isAdmin && (
          <div className="flex items-center justify-center sm:justify-start w-full md:w-auto gap-2 sm:gap-3 shrink-0 border-t border-white/5 pt-4 md:pt-0 md:border-none mt-2 md:mt-0">
            <button 
              onClick={handleClear}
              className="px-3 sm:px-6 py-2.5 sm:py-3 rounded-xl border border-white/10 bg-white/5 text-xs sm:text-sm font-black text-zinc-400 hover:bg-white/10 hover:text-white transition-all active:scale-95 flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Reset Board
            </button>
            <button 
              onClick={handleReveal}
              className={cn(
                "px-4 sm:px-8 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-black transition-all active:scale-95 flex items-center gap-2",
                room.revealed 
                  ? "bg-white text-black shadow-[0_15px_40px_rgba(255,255,255,0.2)]" 
                  : allVoted 
                    ? "bg-emerald-500 text-white shadow-[0_0_40px_rgba(16,185,129,0.4)] animate-pulse" 
                    : "bg-indigo-500 text-white shadow-[0_15px_40px_rgba(99,102,241,0.2)]"
              )}
            >
              {room.revealed ? <EyeOff className="h-3 w-3 sm:h-4 sm:w-4" /> : <Eye className="h-3 w-3 sm:h-4 sm:w-4" />}
              {room.revealed ? "Hide Results" : allVoted ? "Ready" : "Reveal"}
            </button>
          </div>
        )}
      </div>

      <div className="flex-grow flex-shrink-0 min-h-[350px] bg-black/20 rounded-2xl xl:rounded-[3rem] p-1 xl:p-2 border border-white/[0.02] flex flex-col">
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 sm:p-4 xl:p-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6 gap-2 sm:gap-3 xl:gap-6">
              {users.map((u) => (
                <div 
                  key={u.id}
                  className={cn(
                    "flex flex-col items-center justify-center p-2 sm:p-4 xl:p-8 rounded-xl xl:rounded-[2.5rem] border transition-all duration-700",
                    room.revealed && u.vote 
                      ? "bg-indigo-500/5 border-indigo-500/40 shadow-[0_0_40px_rgba(99,102,241,0.1)] scale-105" 
                      : "bg-white/[0.02] border-white/5"
                  )}
                >
                  <div className={cn(
                    "h-20 w-14 sm:h-24 sm:w-16 md:h-28 md:w-20 lg:h-32 lg:w-24 xl:h-36 xl:w-28 rounded-lg md:rounded-2xl flex items-center justify-center transition-all duration-1000 perspective-1000 group/card cursor-pointer mb-2 xl:mb-8",
                    room.revealed ? "rotate-0 scale-110" : u.vote ? "rotate-y-180" : "opacity-10 scale-90"
                  )}>
                      {room.revealed ? (
                        <div className="h-full w-full rounded-lg md:rounded-2xl bg-white text-black flex flex-col items-center justify-center shadow-[0_25px_50px_rgba(0,0,0,0.5)] relative overflow-hidden ring-1 ring-white/20">
                          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent"></div>
                          <div className="absolute top-1 left-1 lg:top-3 lg:left-3 text-[6px] md:text-[8px] opacity-30 font-black tracking-tighter uppercase">ESTM</div>
                          <div className="absolute bottom-1 right-1 lg:bottom-3 lg:right-3 text-[6px] md:text-[8px] opacity-30 font-black tracking-tighter self-end rotate-180 uppercase">ESTM</div>
                          <span className="text-3xl md:text-5xl xl:text-7xl font-black tracking-tighter mt-1">{u.vote === "☕" ? <Coffee className="h-6 w-6 lg:h-12 lg:w-12" /> : (u.vote || "-")}</span>
                        </div>
                      ) : (
                        <div className={cn(
                          "h-full w-full rounded-lg md:rounded-2xl flex items-center justify-center shadow-2xl border-2 border-white/5 relative overflow-hidden",
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
                    <div className="mb-2 h-6 w-6 md:h-8 md:w-8 lg:h-10 lg:w-10 rounded-full bg-zinc-800 flex items-center justify-center text-xs lg:text-sm font-black text-zinc-400 border border-white/5 shadow-inner">
                      {u.avatar ? <span className="text-base lg:text-xl">{u.avatar}</span> : u.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-[8px] md:text-[10px] font-black text-zinc-500 truncate w-full text-center uppercase tracking-[0.2em]">{u.name}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
      </div>

      <div className="shrink-0 flex flex-col items-center justify-center p-3 md:p-4 xl:p-8 rounded-2xl xl:rounded-[3rem] bg-indigo-500/[0.02] border border-indigo-500/10 relative overflow-hidden backdrop-blur-3xl mt-auto z-10 group/deck">
         <div className="absolute inset-0 bg-gradient-to-t from-indigo-500/5 to-transparent pointer-events-none"></div>
         
         {/* Left Edge Indicator & Hover Zone */}
         <div 
           className={cn(
             "absolute left-0 top-0 bottom-0 w-16 md:w-24 lg:w-32 bg-gradient-to-r from-black/80 via-black/40 to-transparent z-40 transition-opacity duration-300 flex items-center justify-start pl-2 md:pl-4",
             canScrollLeft ? "opacity-100 cursor-w-resize" : "opacity-0 pointer-events-none"
           )}
           onMouseEnter={() => handleHoverScroll('left')}
           onMouseLeave={stopHoverScroll}
         >
           <ChevronLeft className="h-6 w-6 md:h-8 md:w-8 text-white/50 animate-pulse drop-shadow-xl" />
         </div>

         {/* Right Edge Indicator & Hover Zone */}
         <div 
           className={cn(
             "absolute right-0 top-0 bottom-0 w-16 md:w-24 lg:w-32 bg-gradient-to-l from-black/80 via-black/40 to-transparent z-40 transition-opacity duration-300 flex items-center justify-end pr-2 md:pr-4",
             canScrollRight ? "opacity-100 cursor-e-resize" : "opacity-0 pointer-events-none"
           )}
           onMouseEnter={() => handleHoverScroll('right')}
           onMouseLeave={stopHoverScroll}
         >
           <ChevronRight className="h-6 w-6 md:h-8 md:w-8 text-white/50 animate-pulse drop-shadow-xl" />
         </div>

         <div 
            ref={scrollRef}
            onScroll={updateScrollButtons}
            onMouseDown={(e) => {
              if (!scrollRef.current) return;
              isDragging.current = true;
              dragDelta.current = 0;
              startX.current = e.pageX - scrollRef.current.offsetLeft;
              scrollLeftPos.current = scrollRef.current.scrollLeft;
            }}
            onMouseLeave={() => { isDragging.current = false; stopHoverScroll(); }}
            onMouseUp={() => { 
              isDragging.current = false; 
              setTimeout(() => { dragDelta.current = 0; }, 50);
            }}
            onMouseMove={(e) => {
              if (!isDragging.current || !scrollRef.current) return;
              e.preventDefault();
              const x = e.pageX - scrollRef.current.offsetLeft;
              const walk = (x - startX.current) * 1.5;
              dragDelta.current += Math.abs(walk);
              scrollRef.current.scrollLeft = scrollLeftPos.current - walk;
              updateScrollButtons();
            }}
            className="flex overflow-x-auto relative z-10 w-full max-w-full items-center py-8 sm:py-10 md:py-12 px-4 sm:px-8 xl:px-12 custom-scrollbar snap-x snap-mandatory sm:snap-none touch-pan-x cursor-grab active:cursor-grabbing [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
         >
            <div className="flex gap-3 sm:gap-4 md:gap-6 mx-auto items-center">
              {cards.map((card) => (
                <div key={card} className="shrink-0 snap-center flex justify-center">
                  {renderCard(card)}
                </div>
              ))}
            </div>
         </div>
         <p className="mt-5 text-xs font-black text-zinc-600 uppercase tracking-[0.4em] animate-pulse">Select your estimation card</p>
      </div>
    </div>
  );
}
