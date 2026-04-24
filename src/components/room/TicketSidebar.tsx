import { useState, useEffect } from "react";
import { collection, query, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, writeBatch, getDocs, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Ticket, RoomUser } from "@/types";
import { CheckCircle2, Eye, ExternalLink, Activity, Plus, Trash2, ChevronDown, ListTodo, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface TicketSidebarProps {
  roomId: string;
  isAdmin: boolean;
  activeTicketId?: string | null;
  users: RoomUser[];
}

export function TicketSidebar({ roomId, isAdmin, activeTicketId, users }: TicketSidebarProps) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [newTicketName, setNewTicketName] = useState("");
  const [newTicketLink, setNewTicketLink] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  useEffect(() => {
    if (!roomId) return;
    const q = query(collection(db, "rooms", roomId, "tickets"));
    const unsub = onSnapshot(q, (snap) => {
      const fetched = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Ticket));
      fetched.sort((a, b) => {
        const aOrder = typeof a.order === 'number' ? a.order : (a.createdAt?.toMillis?.() || 0);
        const bOrder = typeof b.order === 'number' ? b.order : (b.createdAt?.toMillis?.() || 0);
        return bOrder - aOrder;
      });
      setTickets(fetched);
    });
    return () => unsub();
  }, [roomId]);

  const handleAddTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicketName.trim() || !isAdmin) return;

    await addDoc(collection(db, "rooms", roomId, "tickets"), {
      name: newTicketName.trim(),
      link: newTicketLink.trim(),
      status: "todo",
      order: Date.now(),
      createdAt: serverTimestamp(),
    });
    setNewTicketName("");
    setNewTicketLink("");
    setShowAddForm(false);
  };

  const handleStatusChange = async (ticket: Ticket, newStatus: string) => {
    if (!isAdmin || !ticket.id) return;
    
    const batch = writeBatch(db);
    
    if (newStatus === "planning") {
      // Revert existing planning tickets
      const currentPlanning = tickets.filter(t => t.status === "planning" && t.id !== ticket.id);
      currentPlanning.forEach(t => {
        if (t.id) batch.update(doc(db, "rooms", roomId, "tickets", t.id), { status: "todo" });
      });
      
      // Update room state
      batch.update(doc(db, "rooms", roomId), {
        activeTicketId: ticket.id,
        currentTicket: ticket.name,
        revealed: false
      });
      
      // Clear user votes using the users prop we already have
      if (users && users.length > 0) {
        users.forEach(u => batch.update(doc(db, "rooms", roomId, "users", u.id), { vote: null }));
      }
    } else if (ticket.status === "planning" && newStatus !== "planning") {
      batch.update(doc(db, "rooms", roomId), {
        activeTicketId: null,
        currentTicket: "",
        revealed: false
      });
    }

    batch.update(doc(db, "rooms", roomId, "tickets", ticket.id), { status: newStatus });
    await batch.commit();
  };

  const handleEstimateChange = async (ticket: Ticket, estimate: string) => {
    if (!isAdmin || !ticket.id) return;
    await updateDoc(doc(db, "rooms", roomId, "tickets", ticket.id), { estimate });
  };

  const handleDeleteTicket = async (ticket: Ticket) => {
    if (!isAdmin || !ticket.id) return;
    if (confirm(`Are you sure you want to delete ${ticket.name}?`)) {
      await deleteDoc(doc(db, "rooms", roomId, "tickets", ticket.id));
      if (activeTicketId === ticket.id) {
        await updateDoc(doc(db, "rooms", roomId), {
          activeTicketId: null,
          currentTicket: "",
          revealed: false
        });
      }
    }
  };

  const handleDrop = async (e: React.DragEvent, targetTicket: Ticket) => {
    e.preventDefault();
    setDropTargetId(null);
    if (!isAdmin || !draggedId || draggedId === targetTicket.id || !targetTicket.id) return;

    const sourceIdx = tickets.findIndex(t => t.id === draggedId);
    const targetIdx = tickets.findIndex(t => t.id === targetTicket.id);

    if (sourceIdx === -1 || targetIdx === -1) return;

    let newOrder = 0;
    if (sourceIdx < targetIdx) {
      // Moving down
      const afterTarget = tickets[targetIdx + 1];
      const targetOrder = typeof targetTicket.order === 'number' ? targetTicket.order : (targetTicket.createdAt?.toMillis?.() || 0);
      const afterOrder = afterTarget ? (typeof afterTarget.order === 'number' ? afterTarget.order : (afterTarget.createdAt?.toMillis?.() || 0)) : targetOrder - 1000;
      newOrder = (targetOrder + afterOrder) / 2;
    } else {
      // Moving up
      const beforeTarget = tickets[targetIdx - 1];
      const targetOrder = typeof targetTicket.order === 'number' ? targetTicket.order : (targetTicket.createdAt?.toMillis?.() || 0);
      const beforeOrder = beforeTarget ? (typeof beforeTarget.order === 'number' ? beforeTarget.order : (beforeTarget.createdAt?.toMillis?.() || 0)) : targetOrder + 1000;
      newOrder = (targetOrder + beforeOrder) / 2;
    }

    await updateDoc(doc(db, "rooms", roomId, "tickets", draggedId), { order: newOrder });
    setDraggedId(null);
  };

  const filteredTickets = tickets.filter(t => 
    (t.name || "").toLowerCase().includes((searchQuery || "").toLowerCase())
  );

  return (
    <div className={cn(
      "flex flex-col h-full bg-black/40 border-l border-white/5 shrink-0 transition-all duration-300 z-20 overflow-hidden",
      isExpanded ? "w-full xl:w-80 2xl:w-96" : "w-16"
    )}>
      {!isExpanded ? (
        <div className="flex flex-col items-center py-4 w-full h-full gap-4">
          <button 
            onClick={() => setIsExpanded(true)} 
            className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl hover:bg-indigo-500/20 hover:scale-105 transition-all shadow-lg"
            title="Tickets"
          >
            <ListTodo className="h-5 w-5" />
          </button>
        </div>
      ) : (
        <>
          <div className="p-4 border-b border-white/5 flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-white flex items-center gap-2 tracking-tight">
                <ListTodo className="h-4 w-4 text-indigo-400" />
                Tickets
              </h3>
              <button 
                onClick={() => setIsExpanded(false)}
                className="text-zinc-500 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-md"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Search tickets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50"
              />
              {isAdmin && (
                <button 
                  onClick={() => setShowAddForm(!showAddForm)}
                  className={cn(
                    "flex-shrink-0 w-10 h-10 flex items-center justify-center border rounded-lg transition-colors",
                    showAddForm ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/50" : "bg-black/60 border-white/10 text-zinc-400 hover:text-white"
                  )}
                >
                  <Plus className="h-4 w-4" />
                </button>
              )}
            </div>

            {showAddForm && isAdmin && (
              <form onSubmit={handleAddTicket} className="flex flex-col gap-2 p-3 bg-white/5 border border-white/10 rounded-xl mt-1">
                <input
                  type="text"
                  placeholder="Ticket ID (max 20 chars)"
                  maxLength={20}
                  value={newTicketName}
                  onChange={(e) => setNewTicketName(e.target.value)}
                  className="w-full bg-black/40 border border-white/5 rounded-md px-3 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500/30"
                  required
                />
                <input
                  type="url"
                  placeholder="Link URL (optional)"
                  value={newTicketLink}
                  onChange={(e) => setNewTicketLink(e.target.value)}
                  className="w-full bg-black/40 border border-white/5 rounded-md px-3 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500/30"
                />
                <div className="flex justify-end mt-1">
                  <button 
                    type="submit"
                    className="px-4 py-1.5 bg-indigo-500 text-white text-xs font-bold rounded-lg hover:bg-indigo-600 transition-colors"
                    disabled={!newTicketName.trim()}
                  >
                    Add Ticket
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
            {filteredTickets.map((t) => (
              <div
                key={t.id}
                draggable={isAdmin && t.status !== "completed"}
                onDragStart={(e) => {
                  if (!isAdmin || t.status === "completed") return;
                  setDraggedId(t.id!);
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragOver={(e) => {
                  e.preventDefault(); // Must prevent default to allow drop
                  if (!isAdmin || draggedId === t.id) return;
                  setDropTargetId(t.id!);
                }}
                onDragLeave={() => setDropTargetId(null)}
                onDrop={(e) => handleDrop(e, t)}
                onDragEnd={() => {
                  setDraggedId(null);
                  setDropTargetId(null);
                }}
                onClick={() => {
                  if (!isAdmin) return;
                  if (t.status === "todo" || t.status === "open") {
                    handleStatusChange(t, "planning");
                  } else if (t.status === "planning") {
                    handleStatusChange(t, "completed");
                  }
                }}
                className={cn(
                  "w-full flex flex-col gap-3 p-3 rounded-xl border transition-all text-left",
                  isAdmin && t.status !== "completed" ? "cursor-grab active:cursor-grabbing hover:bg-white/10" : "",
                  t.status === "planning"
                    ? "bg-indigo-500/5 border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.05)]"
                    : "bg-white/[0.02] border-white/5",
                  t.status === "completed" && "opacity-60",
                  draggedId === t.id && "opacity-30 border-dashed border-indigo-500/50",
                  dropTargetId === t.id && (tickets.findIndex(x => x.id === draggedId) < tickets.findIndex(x => x.id === t.id) ? "border-b-4 border-b-indigo-500" : "border-t-4 border-t-indigo-500")
                )}
              >
                <div className="flex items-center justify-between w-full pointer-events-none">
                  <div className="flex items-center gap-2 overflow-hidden w-full pr-2 pointer-events-auto">
                    {isAdmin ? (
                      <div className="relative shrink-0">
                        <select
                          onClick={(e) => e.stopPropagation()}
                          value={t.status === "open" ? "todo" : t.status}
                          onChange={(e) => handleStatusChange(t, e.target.value)}
                          className={cn(
                            "appearance-none text-[10px] md:text-xs font-black uppercase tracking-wider pl-3 pr-7 py-1.5 rounded-lg bg-black/40 border cursor-pointer focus:border-indigo-500/50 focus:outline-none transition-colors",
                            t.status === "completed" ? "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10" :
                            t.status === "planning" ? "border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10" :
                            "border-white/10 text-zinc-300 hover:bg-white/5"
                          )}
                        >
                          <option className="bg-zinc-900 text-zinc-300 font-bold" value="todo">Todo</option>
                          <option className="bg-zinc-900 text-indigo-400 font-bold" value="planning">Planning</option>
                          <option className="bg-zinc-900 text-emerald-400 font-bold" value="completed">Completed</option>
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 pointer-events-none opacity-50" />
                      </div>
                    ) : (
                      <span className={cn(
                        "flex shrink-0 items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider",
                        t.status === "completed" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                        t.status === "planning" ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" :
                        "bg-white/5 text-zinc-400 border border-white/5"
                      )}>
                        {t.status === "completed" && <CheckCircle2 className="h-3 w-3" />}
                        {t.status === "planning" && <Activity className="h-3 w-3 animate-pulse" />}
                        {(t.status === "todo" || t.status === "open") && <Eye className="h-3 w-3" />}
                        {t.status === "open" ? "TODO" : t.status}
                      </span>
                    )}
                    
                    {t.link ? (
                      <a href={t.link} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="flex items-center gap-1.5 text-[11px] md:text-xs font-mono font-bold text-indigo-300 border border-white/5 hover:border-indigo-500/30 hover:bg-indigo-500/10 hover:text-indigo-200 px-2 py-1.5 rounded-lg bg-black/40 transition-colors truncate">
                        <ExternalLink className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                        <span className="truncate">{t.name.length > 20 ? t.name.slice(0, 20) + "..." : t.name}</span>
                      </a>
                    ) : (
                      <span className="flex items-center gap-1.5 text-[11px] md:text-xs font-mono font-bold text-zinc-300 border border-white/5 px-2 py-1.5 rounded-lg bg-black/40 truncate">
                        <span className="truncate">{t.name.length > 20 ? t.name.slice(0, 20) + "..." : t.name}</span>
                      </span>
                    )}
                  </div>

                  {isAdmin && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteTicket(t); }}
                      className="flex-shrink-0 text-white/20 hover:text-rose-400 transition-colors p-1 hover:bg-rose-500/10 rounded pointer-events-auto"
                      title="Delete ticket"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>

                <div className="flex justify-between items-center w-full mt-1">
                  <div className="text-[10px] text-zinc-500 font-medium">
                    {t.votesAtCompletion !== undefined && t.totalUsersAtCompletion !== undefined && (
                      <span>{t.votesAtCompletion}/{t.totalUsersAtCompletion} <span className="opacity-70">users</span></span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] uppercase tracking-widest font-black text-zinc-600">EST:</span>
                    {isAdmin ? (
                      <input
                        type="text"
                        onClick={(e) => e.stopPropagation()}
                        value={t.estimate || ""}
                        onChange={(e) => handleEstimateChange(t, e.target.value)}
                        placeholder="-"
                        className={cn(
                          "w-12 md:w-16 text-center font-black tabular-nums border rounded-md px-1 py-0.5 focus:outline-none transition-colors",
                          t.status === "completed" 
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 focus:border-emerald-500" 
                            : "bg-black/40 text-white/50 border-white/10 focus:border-indigo-500 focus:text-white"
                        )}
                      />
                    ) : (
                      <span className={cn(
                        "text-lg font-black tabular-nums px-3 py-0.5 rounded-lg border",
                        t.status === "completed" 
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" 
                          : "bg-white/5 text-white/20 border-white/5"
                      )}>
                        {t.estimate || "-"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {filteredTickets.length === 0 && (
              <div className="text-center py-8 text-zinc-500 text-sm">
                {searchQuery ? "No tickets match your search." : isAdmin ? "Click + to add your first ticket." : "No tickets available."}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
