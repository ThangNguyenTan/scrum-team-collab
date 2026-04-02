"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  onAuthStateChanged, 
  signInAnonymously,
  User 
} from "firebase/auth";
import { 
  doc, 
  onSnapshot, 
  updateDoc, 
  setDoc, 
  collection, 
  query, 
  orderBy, 
  serverTimestamp,
  addDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  getDocs,
  where
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { 
  Users, 
  Layout, 
  Copy, 
  Share2, 
  RefreshCw, 
  Eye, 
  EyeOff, 
  Plus, 
  ThumbsUp, 
  Trash2, 
  Download, 
  ChevronRight,
  Coffee,
  MoreVertical,
  CheckCircle2,
  X,
  Settings,
  Zap,
  BarChart2,
  Sparkles,
  Image as ImageIcon,
  UploadCloud,
  Search,
  Pencil,
  Save,
  Crown
} from "lucide-react";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";
import { toPng } from "html-to-image";
import GifPicker from "./GifPicker";

// --- Types ---
interface RoomData {
  creatorId: string;
  creatorName: string;
  status: "planning" | "retro";
  revealed: boolean;
  createdAt: any;
}

interface RoomUser {
  id: string;
  name: string;
  vote: string | null;
  lastSeen: any;
  joinedAt: any;
}

interface RetroColumn {
  id: string;
  title: string;
  order: number;
}

interface RetroCard {
  id: string;
  columnId: string;
  text: string;
  imageUrl?: string;
  upvotes: string[];
  authorName: string;
  authorId: string;
  createdAt: any;
}

// --- Main Page Component ---
export default function RoomPage() {
  const { id: roomId } = useParams() as { id: string };
  const router = useRouter();
  
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState<string>("");
  const [showJoinModal, setShowJoinModal] = useState(false);
  
  const [activeTab, setActiveTab] = useState<"planning" | "retro">("planning");
  const [room, setRoom] = useState<RoomData | null>(null);
  const [users, setUsers] = useState<RoomUser[]>([]);
  const [columns, setColumns] = useState<RetroColumn[]>([]);
  const [cards, setCards] = useState<RetroCard[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [idCopyFeedback, setIdCopyFeedback] = useState(false);
  const [inviteFeedback, setInviteFeedback] = useState(false);

  const isAdmin = useMemo(() => user?.uid === room?.creatorId, [user, room]);

  // --- Auth & Session ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      
      // Check local storage for preference
      const savedName = localStorage.getItem(`scrum_name_${roomId}`);
      if (savedName && !displayName) setDisplayName(savedName);

      if (!u) {
        if (savedName) {
          // If returning guest, log in silently and skip modal
          await signInAnonymously(auth);
        } else {
          setShowJoinModal(true);
        }
      } else {
        // User exists (Google or Anon)
        if (u.isAnonymous && !savedName) {
          setShowJoinModal(true);
        } else {
          // Returning guest or Google user
          const finalName = u.displayName || savedName || "Guest";
          if (finalName && !displayName) setDisplayName(finalName);

          await setDoc(doc(db, "rooms", roomId, "users", u.uid), {
            name: finalName,
            lastSeen: serverTimestamp(),
            joinedAt: serverTimestamp(),
          }, { merge: true });
          
          setShowJoinModal(false);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [roomId, router, db]);

  // Track the current room for auto-redirect next time
  useEffect(() => {
    if (roomId) {
      localStorage.setItem("scrum_last_room", roomId);
    }

    const lastTab = localStorage.getItem(`scrum_tab_${roomId}`) as "planning" | "retro";
    if (lastTab) setActiveTab(lastTab);
  }, [roomId]);

  // --- Heartbeat & Cleanup ---
  useEffect(() => {
    if (!user || !roomId) return;

    // 1. Heartbeat Interval
    const heartbeat = setInterval(async () => {
      await updateDoc(doc(db, "rooms", roomId, "users", user.uid), {
        lastSeen: serverTimestamp()
      }).catch(() => {}); // Ignore errors if room deleted
    }, 30000); // Every 30 seconds

    // 2. Unload Cleanup (Best Effort)
    const handleUnload = () => {
      if (user?.uid && roomId) {
        // This is a "best effort" attempt as the browser may close before completion
        deleteDoc(doc(db, "rooms", roomId, "users", user.uid));
      }
    };

    window.addEventListener("beforeunload", handleUnload);
    return () => {
      clearInterval(heartbeat);
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, [user, roomId, db]);

  // Sync creator name if empty
  useEffect(() => {
    if (room && isAdmin && !displayName && room.creatorName) {
      setDisplayName(room.creatorName);
    }
  }, [room, isAdmin, displayName]);

  // --- Data Listeners ---
  useEffect(() => {
    if (!roomId) return;

    // 1. Room Meta Listener
    const roomSub = onSnapshot(doc(db, "rooms", roomId), (snap) => {
      if (snap.exists()) {
        setRoom(snap.data() as RoomData);
      } else {
        // Room doesn't exist
        router.push("/");
      }
    });

    // 2. Users Listener
    const usersSub = onSnapshot(collection(db, "rooms", roomId, "users"), (snap) => {
      const now = Date.now() / 1000;
      const uList = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as RoomUser))
        .filter(u => {
          // Filter users who haven't been seen in the last 10 minutes
          // Modern browsers heavily throttle setInterval in background tabs (min 1 min, up to 10+ mins on battery saver)!
          if (!u.lastSeen?.seconds) return true; 
          return now - u.lastSeen.seconds < 600;
        });
      setUsers(uList.sort((a,b) => a.joinedAt?.seconds - b.joinedAt?.seconds));
    });

    // 3. Retro Columns Listener
    const colsSub = onSnapshot(
      query(collection(db, "rooms", roomId, "columns"), orderBy("order")), 
      (snap) => {
        const cList = snap.docs.map(d => ({ id: d.id, ...d.data() } as RetroColumn));
        setColumns(cList);
      }
    );

    // 4. Retro Cards Listener
    const cardsSub = onSnapshot(
      query(collection(db, "rooms", roomId, "cards"), orderBy("createdAt")), 
      (snap) => {
        const dList = snap.docs.map(d => ({ id: d.id, ...d.data() } as RetroCard));
        setCards(dList);
      }
    );

    return () => {
      roomSub();
      usersSub();
      colsSub();
      cardsSub();
    };
  }, [roomId, router]);

  // --- Actions ---


  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      if (a.id === room?.creatorId) return -1;
      if (b.id === room?.creatorId) return 1;
      return (a.joinedAt?.seconds || 0) - (b.joinedAt?.seconds || 0);
    });
  }, [users, room]);

  const handleJoin = async (name: string) => {
    if (!name.trim()) return;
    
    setDisplayName(name);
    localStorage.setItem(`scrum_name_${roomId}`, name);
    setShowJoinModal(false);

    // Register user in the room session
    // If not logged in with Google, we just use a random ID or anonymous auth
    let uid = user?.uid;
    if (!uid) {
      // We could use an anonymous login here for actual Firebase Auth session
      const anon = await signInAnonymously(auth);
      uid = anon.user.uid;
    }

    await setDoc(doc(db, "rooms", roomId, "users", uid), {
      name,
      vote: null,
      joinedAt: serverTimestamp(),
    });

    // Initialize default columns if this is the first guest/user and they are admin
    // Or normally room creator does it.
  };

  const handleTabSwitch = async (tab: "planning" | "retro") => {
    setActiveTab(tab);
    localStorage.setItem(`scrum_tab_${roomId}`, tab);
    
    // Auto-create default columns if switching to retro and none exist (Idempotent)
    if (tab === "retro" && roomId) {
      const colSnap = await getDocs(collection(db, "rooms", roomId, "columns"));
      if (colSnap.empty) {
        const defaults = ["What went well", "What could be improved", "Action Items"];
        for (let i = 0; i < defaults.length; i++) {
          await addDoc(collection(db, "rooms", roomId, "columns"), {
            title: defaults[i],
            order: i
          });
        }
      }
    }
  };

  const copyToClipboard = async (text: string, setFeedback: (v: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
    }
    setFeedback(true);
    setTimeout(() => setFeedback(false), 2000);
  };

  const createNewRoom = async () => {
    if (!user) return;
    try {
      const roomRef = await addDoc(collection(db, "rooms"), {
        creatorId: user.uid,
        creatorName: user.displayName,
        status: "planning",
        revealed: false,
        createdAt: serverTimestamp(),
      });
      router.push(`/room/${roomRef.id}`);
    } catch (error) {
      console.error("Failed to create room:", error);
    }
  };

  if (loading || (!room && !showJoinModal)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0b]" suppressHydrationWarning>
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" suppressHydrationWarning></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0b] text-white overflow-hidden relative" suppressHydrationWarning>
      {/* Dynamic Background */}
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(67,56,202,0.08),transparent_50%)] pointer-events-none"></div>
      
      {/* Room Header */}
      <header className="h-16 flex items-center justify-between px-6 border-b border-white/5 bg-black/40 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push("/")}>
            <Zap className="h-5 w-5 text-indigo-500" />
            <span className="font-bold tracking-tight">ScrumCollab</span>
          </div>
          <div className="h-4 w-[1px] bg-white/10 hidden sm:block"></div>
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 group">
            <span className="text-base font-medium text-zinc-400 group-hover:text-white transition-colors">{roomId}</span>
            <button onClick={() => copyToClipboard(roomId, setIdCopyFeedback)} className="text-zinc-500 hover:text-indigo-400 transition-colors">
              {idCopyFeedback ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
          {user && !user.isAnonymous && (
            <button 
              onClick={createNewRoom}
              className="hidden lg:flex items-center gap-2 text-xs font-black uppercase tracking-widest text-indigo-400 hover:text-indigo-300 transition-colors bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-500/20"
            >
              <Plus className="h-3 w-3" />
              New Room
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex p-1 rounded-xl bg-white/5 border border-white/10 mr-4">
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
          
          <div className="flex items-center gap-2 text-base text-zinc-400 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
             <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
             {users.length} Team Members
          </div>
          
          <button 
            onClick={() => copyToClipboard(window.location.href, setInviteFeedback)}
            className={cn(
              "flex items-center gap-2 rounded-xl border px-4 py-2 text-base font-semibold transition-all active:scale-95",
              inviteFeedback 
                ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400" 
                : "bg-white/5 border-white/10 hover:bg-white/10 text-white"
            )}
          >
            {inviteFeedback ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Copied!
              </>
            ) : (
              <>
                <Share2 className="h-4 w-4" />
                Invite
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* User Sidebar */}
        <aside className="w-80 border-r border-white/5 bg-black/40 flex flex-col hidden lg:flex shrink-0">
          <div className="p-4 border-b border-white/5 flex items-center gap-2 text-zinc-400 shrink-0">
            <Users className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-widest">Connected Team</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
            {sortedUsers.map(u => (
              <div key={u.id} className="flex items-center justify-between group/u p-2 rounded-xl hover:bg-white/[0.02] border border-transparent hover:border-white/5 transition-all">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "h-7 w-7 rounded-full border flex items-center justify-center font-bold text-xs",
                    u.id === room?.creatorId 
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-500" 
                      : "bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
                  )}>
                    {u.id === room?.creatorId ? <Crown className="h-3 w-3" /> : u.name.charAt(0)}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className={cn("text-sm font-medium truncate", u.id === user?.uid ? "text-white" : "text-zinc-500")}>
                      {u.name} {u.id === user?.uid && "(You)"}
                    </span>
                    {u.id === room?.creatorId && (
                      <span className="text-[8px] font-black uppercase tracking-widest text-amber-500/70">Host</span>
                    )}
                  </div>
                </div>
                {u.vote && room?.status === "planning" && (
                   <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                )}
              </div>
            ))}
          </div>
        </aside>

        {/* Main Board */}
        <main className="flex-1 bg-black/40 overflow-hidden relative">
          {activeTab === "planning" ? (
             <PlanningBoard 
               room={room as RoomData} 
               roomId={roomId} 
               users={users} 
               isAdmin={isAdmin} 
               currentUserId={user?.uid || ""} 
             />
          ) : (
            <RetroBoard 
              room={room}
              roomId={roomId}
              users={users}
              columns={columns}
              cards={cards}
              isAdmin={isAdmin}
              currentUserId={user?.uid || ""}
              displayName={displayName}
            />
          )}
        </main>
      </div>

      {/* Join Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-6">
          <div className="w-full max-w-sm rounded-[2rem] border border-white/10 bg-[#161618] p-8 shadow-2xl">
            <h2 className="text-3xl font-bold text-white mb-2">Joining Scrum Room</h2>
            <p className="text-zinc-400 text-base mb-6">Enter a display name to get started. No account needed.</p>
            <form onSubmit={(e) => {
              e.preventDefault();
              const name = (e.currentTarget.elements.namedItem("name") as HTMLInputElement).value;
              handleJoin(name);
            }} className="space-y-4">
              <input 
                name="name" 
                type="text" 
                required 
                autoFocus 
                placeholder="Ex: Sapphire Dev"
                className="w-full h-12 rounded-xl bg-white/5 border border-white/10 px-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
              />
              <button 
                type="submit" 
                className="w-full h-12 rounded-xl bg-white text-black font-bold text-xl hover:bg-zinc-200 transition-all active:scale-[0.98]"
              >
                Join Now
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// --- FEATURE A: Planning Poker Board ---
function PlanningBoard({ room, roomId, users, isAdmin, currentUserId }: any) {
  const cards = ["0", "1", "2", "3", "5", "8", "13", "21", "34", "55", "89", "?", "☕"];
  const myVote = users.find((u: any) => u.id === currentUserId)?.vote;
  const allVoted = users.length > 0 && users.every((u: any) => u.vote);

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
    // Clear all user votes in a batch (or individual calls for simplicity here)
    for (const u of users) {
      await updateDoc(doc(db, "rooms", roomId, "users", u.id), { vote: null });
    }
  }

  const stats = useMemo(() => {
    if (!room.revealed) return null;
    const votes = users
      .map((u: any) => parseFloat(u.vote))
      .filter((v: any) => !isNaN(v));
      
    if (votes.length === 0) return { avg: "0.0", min: 0, max: 0, proposal: "0" };
    
    const avgVal = votes.reduce((a: number, b: number) => a + b, 0) / votes.length;
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
        "text-5xl font-black transition-transform group-hover:scale-125 duration-500",
        card === "☕" ? "text-4xl" : "",
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
          <h2 className="text-4xl font-black flex items-center gap-4 text-white tracking-tight">
            Sprint Planning
            {stats !== null && (
              <div className="flex gap-3 items-center ml-2">
                <span className="flex items-center gap-2 text-indigo-400 bg-indigo-500/10 px-4 py-1.5 rounded-xl text-xl border border-indigo-500/20 shadow-lg shadow-indigo-500/10">
                  Avg: <span className="font-bold text-white">{stats.avg}</span>
                </span>
                <span className="flex items-center gap-2 text-sky-400 bg-sky-500/10 px-4 py-1.5 rounded-xl text-xl border border-sky-500/20 shadow-lg shadow-sky-500/10">
                  Min: <span className="font-bold text-white">{stats.min}</span>
                </span>
                <span className="flex items-center gap-2 text-rose-400 bg-rose-500/10 px-4 py-1.5 rounded-xl text-xl border border-rose-500/20 shadow-lg shadow-rose-500/10">
                  Max: <span className="font-bold text-white">{stats.max}</span>
                </span>
                
                <div className="h-6 w-px bg-white/10 mx-1"></div>
                
                {/* Proposed Final Estimate */}
                <span className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 px-5 py-1.5 rounded-xl text-xl border border-emerald-500/30 shadow-[0_0_30px_rgba(52,211,153,0.15)] relative overflow-hidden group">
                  <div className="absolute inset-0 bg-emerald-400/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <Sparkles className="h-4 w-4 relative z-10 animate-pulse" />
                  <span className="relative z-10 tracking-widest uppercase text-sm font-black pt-1">Proposed: </span>
                  <span className="relative z-10 font-black text-white text-2xl">{stats.proposal}</span>
                </span>
              </div>
            )}
          </h2>
          <div className="flex items-center gap-4">
            <p className="text-zinc-500 text-xs uppercase tracking-[0.3em] font-black font-mono">
              {users.filter((u: any) => u.vote).length} / {users.length} Team Members Voted
            </p>
            {allVoted && !room.revealed && (
              <span className="text-xs font-black uppercase tracking-[0.2em] text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20 animate-pulse">
                Ready!
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
              {users.map((u: any) => (
                <div 
                  key={u.id}
                  className={cn(
                    "flex flex-col items-center justify-center p-8 rounded-[2.5rem] border transition-all duration-700",
                    room.revealed && u.vote 
                      ? "bg-indigo-500/5 border-indigo-500/40 shadow-[0_0_60px_rgba(99,102,241,0.1)] scale-105" 
                      : "bg-white/[0.02] border-white/5"
                  )}
                >
                  <div className="mb-4 h-12 w-12 rounded-full bg-zinc-800 flex items-center justify-center text-xl font-black text-zinc-400 border border-white/5 shadow-inner">
                    {u.name.charAt(0)}
                  </div>
                  <span className="text-xs font-black text-zinc-500 mb-6 truncate w-full text-center uppercase tracking-widest">{u.name}</span>
                  
                  <div className={cn(
                    "h-32 w-24 rounded-2xl flex items-center justify-center transition-all duration-700 perspective-1000",
                    room.revealed ? "rotate-0" : u.vote ? "rotate-y-180" : "opacity-10 scale-90"
                  )}>
                      {room.revealed ? (
                        <div className="h-full w-full rounded-2xl bg-white text-black flex items-center justify-center text-5xl font-black shadow-2xl relative">
                          <div className="absolute top-2 left-2 text-[8px] opacity-20 font-black">SCRUM</div>
                          <div className="absolute bottom-2 right-2 text-[8px] opacity-20 font-black rotate-180">SCRUM</div>
                          {u.vote === "☕" ? <Coffee className="h-10 w-10" /> : u.vote || "-"}
                        </div>
                      ) : (
                        <div className={cn(
                          "h-full w-full rounded-2xl flex items-center justify-center shadow-2xl border-2 border-white/10",
                          u.vote ? "bg-gradient-to-br from-indigo-500 via-indigo-600 to-indigo-700" : "bg-white/5 border-dashed"
                        )}>
                            {u.vote ? (
                              <div className="relative">
                                <Zap className="h-8 w-8 text-white animate-pulse opacity-40" />
                                <div className="absolute inset-0 blur-xl bg-white/20"></div>
                              </div>
                            ) : <Plus className="h-8 w-8 text-white/5" />}
                        </div>
                      )}
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

// --- FEATURE B: Retrospective Board ---
function RetroBoard({ room, roomId, users, columns, cards, isAdmin, currentUserId, displayName }: any) {
  const [newCardText, setNewCardText] = useState("");
  const [newCardImage, setNewCardImage] = useState("");
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [editingImage, setEditingImage] = useState("");
  const [activeGifSearch, setActiveGifSearch] = useState<string | null>(null);
  const [activeColumnId, setActiveColumnId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Limit to 5MB
    if (file.size > 5 * 1024 * 1024) {
      alert("Image size must be below 5MB");
      return;
    }

    const setter = isEdit ? setEditingImage : setNewCardImage;
    const reader = new FileReader();
    
    // For GIFs, we cannot compress with canvas without losing animation
    if (file.type === "image/gif") {
      reader.onload = (ev) => setter(ev.target?.result as string);
      reader.readAsDataURL(file);
      return;
    }

    // For other images, compress client-side to save Firestore space
    reader.onload = (ev) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 600;
        let scaleSize = 1;
        if (img.width > MAX_WIDTH) {
          scaleSize = MAX_WIDTH / img.width;
        }
        canvas.width = img.width * scaleSize;
        canvas.height = img.height * scaleSize;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
        setter(dataUrl);
      };
      if (typeof ev.target?.result === "string") {
        img.src = ev.target.result;
      }
    };
    reader.readAsDataURL(file);
  };

  const addCard = async (colId: string) => {
    if (!newCardText.trim() && !newCardImage.trim()) return;
    await addDoc(collection(db, "rooms", roomId, "cards"), {
      columnId: colId,
      text: newCardText.trim(),
      imageUrl: newCardImage.trim() || null,
      upvotes: [],
      authorName: displayName || (isAdmin ? room?.creatorName : "") || "Team Member",
      authorId: currentUserId,
      createdAt: serverTimestamp()
    });
    setNewCardText("");
    setNewCardImage("");
    setActiveGifSearch(null);
    setActiveColumnId(null);
  };

  const startEditing = (card: RetroCard) => {
    setEditingCardId(card.id);
    setEditingText(card.text);
    setEditingImage(card.imageUrl || "");
  };

  const updateCard = async (cardId: string) => {
    if (!editingText.trim() && !editingImage.trim()) return;
    await updateDoc(doc(db, "rooms", roomId, "cards", cardId), {
      text: editingText.trim(),
      imageUrl: editingImage.trim() || null
    });
    setEditingCardId(null);
    setActiveGifSearch(null);
    setEditingText("");
    setEditingImage("");
  };

  const toggleUpvote = async (card: RetroCard) => {
    if (card.authorId === currentUserId || (card.authorName === displayName && displayName !== "")) return;
    
    const ref = doc(db, "rooms", roomId, "cards", card.id);
    if (card.upvotes.includes(currentUserId)) {
      await updateDoc(ref, { upvotes: arrayRemove(currentUserId) });
    } else {
      await updateDoc(ref, { upvotes: arrayUnion(currentUserId) });
    }
  };

  const deleteCard = async (cardId: string) => {
    if(!window.confirm("Delete this card?")) return;
    await deleteDoc(doc(db, "rooms", roomId, "cards", cardId));
  };

  const addColumn = async () => {
    if (!isAdmin) return;
    const title = window.prompt("Column Title:");
    if (!title) return;
    await addDoc(collection(db, "rooms", roomId, "columns"), {
      title,
      order: columns.length
    });
  };

  const renameColumn = async (col: RetroColumn) => {
    if (!isAdmin) return;
    const newTitle = window.prompt("New Column Title:", col.title);
    if (!newTitle) return;
    await updateDoc(doc(db, "rooms", roomId, "columns", col.id), { title: newTitle });
  };

  const deleteColumn = async (colId: string) => {
    if (!isAdmin) return;
    if (!window.confirm("Deleting a column will hide its cards. Continue?")) return;
    await deleteDoc(doc(db, "rooms", roomId, "columns", colId));
  };

  // --- Export Utilities ---
  const exportToCSV = () => {
    const rows = [["Column", "Card Text", "Upvotes", "Author"]];
    columns.forEach((col: RetroColumn) => {
      cards.filter((c: RetroCard) => c.columnId === col.id).forEach((card: RetroCard) => {
        rows.push([col.title, card.text, card.upvotes.length.toString(), card.authorName]);
      });
    });
    
    const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Retro_${roomId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = async () => {
    if (!boardRef.current) return;
    setIsExporting(true);
    try {
      // html-to-image handles modern CSS (lab/oklch) much better than html2canvas
      const dataUrl = await toPng(boardRef.current, {
        backgroundColor: "#0a0a0b",
        pixelRatio: 2, // Equivalent to scale in html2canvas
        skipFonts: true, // Speeds up capture significantly
      });
      
      const pdf = new jsPDF("l", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (boardRef.current.offsetHeight * pdfWidth) / boardRef.current.offsetWidth;
      pdf.addImage(dataUrl, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Retro_${roomId}.pdf`);
    } catch (error) {
      console.error("PDF export failed:", error);
    }
    setIsExporting(false);
  };

  return (
    <div className="flex flex-col gap-8 h-full p-8 overflow-hidden">
      {/* Retro Header */}
      <div className="shrink-0 flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-4xl font-bold flex items-center gap-3">
            Sprint Retrospective
            <span className="text-purple-400 bg-purple-500/10 px-3 py-1 rounded-lg text-base border border-purple-500/20">
              {cards.length} Insights
            </span>
          </h2>
          <p className="text-zinc-500 text-base">Reflect, prioritize, and improve together as a team.</p>
        </div>
        
        <div className="flex items-center gap-3">
          {isAdmin && (
             <button 
              onClick={addColumn}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 py-2.5 px-5 text-base font-bold text-zinc-400 hover:bg-white/10 hover:text-white transition-all"
             >
               <Plus className="h-4 w-4" />
               Add Column
             </button>
          )}
          
          <div className="flex items-center p-1 bg-white/5 rounded-xl border border-white/10">
            <button 
              onClick={exportToCSV}
              className="p-2 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-all active:scale-95 tooltip"
              title="Export CSV"
            >
              <Download className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Retro Board Content */}
      <div 
        ref={boardRef}
        className="flex-1 flex gap-12 overflow-x-auto p-12 pb-24 custom-scrollbar"
      >
        {columns.map((col: RetroColumn) => (
          <div 
            key={col.id} 
            className="flex flex-col min-w-[500px] w-[500px] shrink-0 group/col"
          >
             <div className="flex items-center justify-between mb-6 px-4">
                <div className="flex items-center gap-3">
                  <h4 className="text-xl font-bold text-indigo-100">{col.title}</h4>
                  <span className="bg-white/5 text-zinc-500 text-xs px-2 py-0.5 rounded-full border border-white/5 font-mono">
                    {cards.filter((c: RetroCard) => c.columnId === col.id).length}
                  </span>
                </div>
                {isAdmin && (
                  <div className="flex items-center opacity-0 group-hover/col:opacity-100 transition-opacity">
                    <button onClick={() => renameColumn(col)} className="p-1 hover:text-white text-zinc-600"><Settings className="h-3 w-3" /></button>
                    <button onClick={() => deleteColumn(col.id)} className="p-1 hover:text-red-500 text-zinc-600"><X className="h-3 w-3" /></button>
                  </div>
                )}
             </div>

             <div className="flex flex-col gap-8 custom-scrollbar">
                {cards.filter((c: RetroCard) => c.columnId === col.id).map((card: RetroCard) => (
                  <div 
                    key={card.id} 
                    className="group relative flex flex-col gap-4 rounded-3xl bg-white/[0.03] border border-white/5 p-6 hover:bg-white/[0.05] hover:border-indigo-500/30 transition-all hover:scale-[1.02] shadow-xl"
                  >
                    {editingCardId === card.id ? (
                      <div className="flex flex-col gap-3">
                        <textarea 
                          autoFocus
                          className="w-full bg-transparent border-none text-white text-base focus:outline-none resize-none min-h-[80px] custom-scrollbar"
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                        />
                        {editingImage && (
                          <div className="relative w-full rounded-xl overflow-hidden my-1 bg-black/40 border border-indigo-500/20">
                            <img 
                              key={editingImage}
                              src={editingImage} 
                              alt="Preview" 
                              className="w-full h-auto max-h-60 object-contain opacity-90 transition-opacity" 
                            />
                            <button 
                              onClick={() => setEditingImage("")}
                              className="absolute top-1 right-1 bg-black/60 p-1 rounded-full text-white hover:bg-black"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                        {activeGifSearch === card.id && (
                          <div className="mt-1">
                            <GifPicker 
                              onSelect={(url) => {
                                setEditingImage(url);
                                setActiveGifSearch(null);
                              }} 
                              onClose={() => setActiveGifSearch(null)} 
                            />
                          </div>
                        )}

                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                          <div className="flex items-center gap-2">
                            <label className="h-10 px-4 rounded-xl transition-all flex items-center justify-center gap-2 bg-white/5 text-zinc-500 hover:text-white hover:bg-white/10 cursor-pointer active:scale-90 border border-white/5">
                              <UploadCloud className="h-4 w-4" />
                              <span className="text-[11px] font-black uppercase tracking-wider">Image</span>
                              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, true)} />
                            </label>
                            <button 
                              onClick={() => {
                                setActiveGifSearch(activeGifSearch === card.id ? null : card.id);
                              }}
                              className={cn(
                                "h-10 px-4 rounded-xl transition-all flex items-center justify-center active:scale-90 border border-transparent",
                                activeGifSearch === card.id ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "bg-white/5 text-zinc-500 hover:text-white hover:bg-white/10 border-white/5"
                              )}
                            >
                              <span className="text-[11px] font-black uppercase tracking-wider">GIF</span>
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => setEditingCardId(null)} className="text-sm font-bold text-zinc-500 hover:text-white px-2">Cancel</button>
                            <button 
                              onClick={() => updateCard(card.id)}
                              className="flex items-center gap-1.5 bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-sm font-black hover:bg-indigo-600 transition-all active:scale-95"
                            >
                              <Save className="h-3.5 w-3.5" />
                              Save
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        {card.imageUrl && (
                          <div className="w-full rounded-xl overflow-hidden mt-1 mb-1 bg-black/40 border border-white/5">
                            <img 
                              src={card.imageUrl} 
                              alt="Retro attachment" 
                              className="w-full h-auto max-h-72 object-cover"
                              loading="lazy"
                              onError={(e) => e.currentTarget.style.display = 'none'}
                            />
                          </div>
                        )}
                        {card.text && <p className="text-base text-zinc-200 leading-relaxed break-words">{card.text}</p>}
                        
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-black text-indigo-300 border border-indigo-500/30">
                              {(card.authorName || "M").charAt(0).toUpperCase()}
                            </div>
                            <span className="text-[11px] font-black text-zinc-300 uppercase tracking-wider truncate max-w-[120px]">
                              {card.authorName || "Team Member"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {(isAdmin || card.authorName === displayName) && (
                              <div className="flex items-center opacity-0 group-hover:opacity-100 transition-all">
                                <button onClick={() => startEditing(card)} className="p-1.5 text-zinc-600 hover:text-indigo-400 transition-colors">
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button onClick={() => deleteCard(card.id)} className="p-1.5 text-zinc-600 hover:text-red-500 transition-colors">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            )}
                            <button 
                              disabled={card.authorId === currentUserId || (card.authorName === displayName && displayName !== "")}
                              onClick={() => toggleUpvote(card)}
                              title={ (card.authorId === currentUserId || (card.authorName === displayName && displayName !== "")) ? "You cannot upvote your own insight" : "" }
                              className={cn(
                                "flex items-center gap-1.5 px-2 py-1 rounded-full text-sm font-bold transition-all",
                                (card.authorId === currentUserId || (card.authorName === displayName && displayName !== "")) 
                                  ? "opacity-50 grayscale cursor-not-allowed" 
                                  : "cursor-pointer",
                                card.upvotes.includes(currentUserId) 
                                  ? "bg-indigo-500 text-white" 
                                  : "bg-white/5 text-zinc-500 hover:bg-white/10"
                              )}
                            >
                              <ThumbsUp className={cn("h-3 w-3", card.upvotes.includes(currentUserId) ? "fill-white" : "")} />
                              {card.upvotes.length || 0}
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))}
                
                {/* Add Card Dialog */}
                {activeColumnId === col.id ? (
                  <div className="flex flex-col gap-4 rounded-3xl bg-white/[0.02] border border-white/10 p-6 shadow-2xl relative overflow-hidden transition-all duration-300">
                    <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500/50"></div>
                    <textarea 
                      autoFocus
                      placeholder="Type your thought..."
                      className="w-full bg-transparent border-none text-white text-base focus:outline-none resize-none min-h-[100px] custom-scrollbar placeholder-zinc-700"
                      value={newCardText}
                      onChange={(e) => setNewCardText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          addCard(col.id);
                        }
                      }}
                    />
                    
                    {/* Render uploaded or pasted image preview */}
                    {newCardImage && (
                      <div className="relative w-full rounded-xl overflow-hidden my-2 bg-black/40 border border-indigo-500/20">
                        <img 
                          key={newCardImage}
                          src={newCardImage} 
                          alt="Preview" 
                          className="w-full h-auto max-h-80 object-contain opacity-90 transition-opacity" 
                        />
                        <button 
                          onClick={() => setNewCardImage("")}
                          className="absolute top-1 right-1 bg-black/60 p-1 rounded-full text-white hover:bg-black"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                    
                    {activeGifSearch === 'new' && (
                      <div className="mt-2">
                        <GifPicker 
                          onSelect={(url) => {
                            setNewCardImage(url);
                            setActiveGifSearch(null);
                          }} 
                          onClose={() => setActiveGifSearch(null)} 
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center gap-2">
                        <label 
                          title="Upload Image"
                          className="h-10 px-4 rounded-xl transition-all flex items-center justify-center gap-2 bg-white/5 text-zinc-500 hover:text-white hover:bg-white/10 cursor-pointer active:scale-90 border border-white/5"
                        >
                          <UploadCloud className="h-4 w-4" />
                          <span className="text-[11px] font-black uppercase tracking-wider">Image</span>
                          <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                        </label>
                        <button 
                          title="Add GIF"
                          onClick={() => {
                            setActiveGifSearch(activeGifSearch === 'new' ? null : 'new');
                          }}
                          className={cn(
                            "h-10 px-4 rounded-xl transition-all flex items-center justify-center active:scale-90 border border-transparent",
                            activeGifSearch === 'new' ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "bg-white/5 text-zinc-500 hover:text-white hover:bg-white/10 border-white/5"
                          )}
                        >
                          <span className="text-[11px] font-black uppercase tracking-wider">GIF</span>
                        </button>
                      </div>
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => {
                            setActiveColumnId(null);
                            setNewCardText("");
                            setNewCardImage("");
                            setActiveGifSearch(null);
                          }}
                          className="px-4 py-2 text-sm font-bold text-zinc-500 hover:text-white transition-all"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={() => addCard(col.id)} 
                          className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-sm font-black hover:bg-indigo-500 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-indigo-500/20"
                        >
                          Post Insight
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={() => {
                      setActiveColumnId(col.id);
                      setNewCardText("");
                    }}
                    className="flex h-16 items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-white/10 bg-white/[0.02] text-zinc-400 hover:border-indigo-500/50 hover:bg-indigo-500/5 hover:text-indigo-400 transition-all group active:scale-95"
                  >
                    <Plus className="h-5 w-5 transition-transform group-hover:scale-125" />
                    <span className="font-bold text-sm uppercase tracking-widest">Add a card</span>
                  </button>
                )}
             </div>
          </div>
        ))}
      </div>
    </div>
  );
}
